import { RundSyncService } from './rund-sync.service';
import { ServiceUnavailableException } from '@nestjs/common';

const COLUMNAS = [{ column_name: 'id' }, { column_name: 'personaId' }, { column_name: 'periodoCarga' }, { column_name: 'horasAsignables' }];
const fila = (id: string, extra: Record<string, unknown> = {}) => ({ id, personaId: 'p1', periodoCarga: '2026-2', horasAsignables: 40, ...extra });

const armar = (opciones: { query?: jest.Mock; rund?: any } = {}) => {
  const query = opciones.query ?? jest.fn().mockImplementation(async (sql: string) => (sql.includes('information_schema') ? COLUMNAS : []));
  const rund = opciones.rund ?? { paginaParaSincronizar: jest.fn(), resolver: jest.fn() };
  return { servicio: new RundSyncService({ query } as any, rund), query, rund };
};
const upserts = (query: jest.Mock) => query.mock.calls.filter(([sql]) => String(sql).includes('INSERT INTO'));

describe('RundSyncService: la tabla de docentes de PTA es una copia de RUND', () => {
  it.each([undefined, 'false', 'true'])('solo programa el worker con habilitación explícita (%s)', (enabled) => {
    const original = { ...process.env };
    jest.useFakeTimers();
    const { servicio, query, rund } = armar();
    try {
      process.env.NODE_ENV = 'development';
      if (enabled === undefined) delete process.env.RUND_SYNC_ENABLED;
      else process.env.RUND_SYNC_ENABLED = enabled;
      servicio.onModuleInit();
      expect(jest.getTimerCount()).toBe(enabled === 'true' ? 2 : 0);
      expect(query).not.toHaveBeenCalled();
      expect(rund.paginaParaSincronizar).not.toHaveBeenCalled();
      servicio.onModuleDestroy();
      expect(jest.getTimerCount()).toBe(0);
    } finally { servicio.onModuleDestroy(); process.env = original; jest.useRealTimers(); }
  });

  it('recorre todas las páginas y copia cada docente con un upsert por id', async () => {
    const rund = {
      paginaParaSincronizar: jest.fn()
        .mockResolvedValueOnce({ items: [fila('a'), fila('b')], nextCursor: 'b' })
        .mockResolvedValueOnce({ items: [fila('c')], nextCursor: null }),
      resolver: jest.fn(),
    };
    const { servicio, query } = armar({ rund });
    await expect(servicio.sincronizarTodo()).resolves.toEqual({ procesados: 3, errores: 0 });
    expect(rund.paginaParaSincronizar.mock.calls.map((c) => c[0])).toEqual([null, 'b']);
    const sql = String(upserts(query)[0][0]);
    expect(sql).toContain('academic_work_plan."Docente"');
    expect(sql).toContain('ON CONFLICT (id) DO UPDATE');
    expect(sql).toContain('"horasAsignables" = EXCLUDED."horasAsignables"');
    expect(sql).not.toContain('"id" = EXCLUDED."id"');
    expect(JSON.parse(upserts(query)[0][1][0])).toEqual(fila('a'));
  });

  it('un docente que falla no detiene a los demás y se cuenta como error', async () => {
    const query = jest.fn().mockImplementation(async (sql: string, params?: any[]) => {
      if (sql.includes('information_schema')) return COLUMNAS;
      if (JSON.parse(params![0]).id === 'malo') throw Object.assign(new Error('fk'), { code: '23503' });
      return [];
    });
    const rund = { paginaParaSincronizar: jest.fn().mockResolvedValue({ items: [fila('a'), fila('malo'), fila('c')], nextCursor: null }), resolver: jest.fn() };
    await expect(armar({ query, rund }).servicio.sincronizarTodo()).resolves.toEqual({ procesados: 2, errores: 1 });
  });

  it('no corre dos recorridos a la vez', async () => {
    let liberar!: () => void;
    const rund = {
      paginaParaSincronizar: jest.fn().mockImplementation(() => new Promise((r) => { liberar = () => r({ items: [], nextCursor: null }); })),
      resolver: jest.fn(),
    };
    const { servicio } = armar({ rund });
    const primero = servicio.sincronizarTodo();
    await expect(servicio.sincronizarTodo()).resolves.toEqual({ procesados: 0, errores: 0 });
    liberar();
    await primero;
    expect(rund.paginaParaSincronizar).toHaveBeenCalledTimes(1);
  });

  it('propaga la caída de rund-service en el recorrido y libera el bloqueo', async () => {
    const rund = { paginaParaSincronizar: jest.fn().mockRejectedValueOnce(new Error('caído')).mockResolvedValue({ items: [], nextCursor: null }), resolver: jest.fn() };
    const { servicio } = armar({ rund });
    await expect(servicio.sincronizarTodo()).rejects.toThrow('caído');
    await expect(servicio.sincronizarTodo()).resolves.toEqual({ procesados: 0, errores: 0 });
  });

  it('sincronizarDocente devuelve el id local, o null si RUND no lo tiene', async () => {
    const rund = { paginaParaSincronizar: jest.fn(), resolver: jest.fn().mockResolvedValueOnce(fila('d1')).mockResolvedValueOnce(null) };
    const { servicio } = armar({ rund });
    await expect(servicio.sincronizarDocente('p1', '2026-2')).resolves.toBe('d1');
    expect(rund.resolver).toHaveBeenCalledWith('p1', '2026-2');
    await expect(servicio.sincronizarDocente('nadie')).resolves.toBeNull();
  });

  it('si ya hay una fila local de esa persona y período con otro id, la actualiza conservando su id', async () => {
    const query = jest.fn().mockImplementation(async (sql: string) => {
      if (sql.includes('information_schema')) return COLUMNAS;
      if (sql.includes('INSERT INTO')) throw Object.assign(new Error('duplicada'), { code: '23505', constraint: 'Docente_personaId_periodoCarga_key' });
      if (sql.trimStart().startsWith('UPDATE')) return [{ id: 'id-local-existente' }];
      return [];
    });
    const rund = { paginaParaSincronizar: jest.fn(), resolver: jest.fn().mockResolvedValue(fila('id-de-rund')) };
    const { servicio } = armar({ query, rund });
    await expect(servicio.sincronizarDocente('p1')).resolves.toBe('id-local-existente');
    const update = query.mock.calls.find(([sql]) => String(sql).trimStart().startsWith('UPDATE'))![0] as string;
    expect(update).toContain("COALESCE(t.\"periodoCarga\", '') = COALESCE(r.\"periodoCarga\", '')");
    expect(update).not.toContain('"id" = r."id"');
  });

  it('otros errores de base no se disfrazan de conflicto', async () => {
    const query = jest.fn().mockImplementation(async (sql: string) => {
      if (sql.includes('information_schema')) return COLUMNAS;
      throw Object.assign(new Error('otra restricción'), { code: '23505', constraint: 'otra_key' });
    });
    const rund = { paginaParaSincronizar: jest.fn(), resolver: jest.fn().mockResolvedValue(fila('x')) };
    await expect(armar({ query, rund }).servicio.sincronizarDocente('x')).rejects.toThrow('otra restricción');
  });

  it('no programa temporizadores bajo test ni cuando está desactivada', () => {
    const { servicio } = armar();
    servicio.onModuleInit();
    expect((servicio as any).temporizadores).toHaveLength(0);
    const entorno = { ...process.env };
    process.env.NODE_ENV = 'development';
    process.env.RUND_SYNC_ENABLED = 'false';
    servicio.onModuleInit();
    expect((servicio as any).temporizadores).toHaveLength(0);
    process.env = entorno;
  });

  it('no sobrescribe una copia cuando la respuesta omite una columna local', async () => {
    const rund = { resolver: jest.fn().mockResolvedValue({ id: 'd1', personaId: 'p1', periodoCarga: '2026-2' }) };
    const { servicio, query } = armar({ rund });
    await expect(servicio.sincronizarDocente('p1')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(upserts(query)).toHaveLength(0);
    expect(query.mock.calls).toHaveLength(1);
  });

  it('distingue una columna nula explícita de una columna ausente y conserva el valor recibido', async () => {
    const rund = { resolver: jest.fn().mockResolvedValue(fila('d1', { periodoCarga: null })) };
    const { servicio, query } = armar({ rund });
    await expect(servicio.sincronizarDocente('p1')).resolves.toBe('d1');
    expect(JSON.parse(upserts(query)[0][1][0]).periodoCarga).toBeNull();
  });

  it('detiene un ciclo de cursores y libera el bloqueo sin volver a copiar sus filas', async () => {
    const rund = { paginaParaSincronizar: jest.fn()
      .mockResolvedValueOnce({ items: [fila('a')], nextCursor: 'a' })
      .mockResolvedValueOnce({ items: [fila('b')], nextCursor: 'b' })
      .mockResolvedValueOnce({ items: [fila('a')], nextCursor: 'a' })
      .mockResolvedValue({ items: [], nextCursor: null }) };
    const { servicio, query } = armar({ rund });
    await expect(servicio.sincronizarTodo()).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(upserts(query)).toHaveLength(2);
    await expect(servicio.sincronizarTodo()).resolves.toEqual({ procesados: 0, errores: 0 });
  });
});
