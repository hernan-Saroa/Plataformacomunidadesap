import { EVIDENCE_TYPES } from './rund-evidence-workflow';
import { resolveRundActorNames, rundActorName } from './rund-actor-names';
import { RundDocumentosService } from './rund-documentos.service';
import { BancoDocentesService } from './banco-docentes.service';

const author = '770e8400-e29b-41d4-a716-446655440001';
const reviewer = '770e8400-e29b-41d4-a716-446655440002';

describe('Nombres de actores documentales RUND', () => {
  it('resuelve autores y revisores en una consulta sin cambiar sus identificadores', async () => {
    const db = { query: jest.fn().mockResolvedValue([
      { actor_id: author, nombre: 'Gestor Documental' }, { actor_id: reviewer, nombre: 'Revisora Académica' },
      { actor_id: 'AUTOGESTION:invitacion', nombre: 'Docente de Prueba' },
    ]) };
    const actors = [author, reviewer, author, 'SISTEMA', 'AUTOGESTION:invitacion'];
    const original = [...actors];
    const names = await resolveRundActorNames(db as any, actors);
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(db.query.mock.calls[0][1]).toEqual([[author, reviewer, 'AUTOGESTION:invitacion']]);
    expect(rundActorName(names, author)).toBe('Gestor Documental');
    expect(rundActorName(names, reviewer)).toBe('Revisora Académica');
    expect(rundActorName(names, 'AUTOGESTION:invitacion')).toBe('Docente de Prueba');
    expect(rundActorName(names, 'SISTEMA')).toBe('Sistema');
    expect(actors).toEqual(original);
  });

  it('no consulta identidades para acciones automáticas ni respuestas vacías', async () => {
    const db = { query: jest.fn() };
    expect((await resolveRundActorNames(db as any, [])).size).toBe(0);
    const names = await resolveRundActorNames(db as any, ['SYSTEM', 'SISTEMA', null]);
    expect(rundActorName(names, 'SYSTEM')).toBe('Sistema');
    expect(db.query).not.toHaveBeenCalled();
  });

  it('no presenta UUID, correos ni referencias de invitación como si fueran nombres', async () => {
    const db = { query: jest.fn().mockResolvedValue([{ actor_id: author, nombre: author }]) };
    const names = await resolveRundActorNames(db as any, [author, 'antiguo@example.test', 'AUTOGESTION:invitacion', 'Ana Pérez']);
    expect(rundActorName(names, author)).toBe('Usuario no disponible');
    expect(rundActorName(names, 'antiguo@example.test')).toBe('Usuario no disponible');
    expect(rundActorName(names, 'AUTOGESTION:invitacion')).toBe('Docente (autogestión)');
    expect(rundActorName(names, 'Ana Pérez')).toBe('Ana Pérez');
    expect(rundActorName(names, null)).toBe('Usuario no disponible');
  });

  it('mantiene consultable el historial si el directorio no responde', async () => {
    const names = await resolveRundActorNames({ query: jest.fn().mockRejectedValue(new Error('offline')) } as any, [author]);
    expect(rundActorName(names, author)).toBe('Usuario no disponible');
  });

  it('incluye nombres del cargador, revisor y eliminador en los documentos y conserva las referencias', async () => {
    const db = { query: jest.fn().mockResolvedValueOnce([{ id: 'docente' }]).mockResolvedValueOnce([
      { id: 'archivo', docente_id: 'docente', creado_por: author, revisado_por: reviewer, eliminado_por: author },
    ]).mockResolvedValueOnce([{ actor_id: author, nombre: 'Gestor Documental' }, { actor_id: reviewer, nombre: 'Revisora Académica' }]) };
    const [document] = await new RundDocumentosService(db as any, {} as any).list('docente', undefined, true);
    expect(document).toMatchObject({ creadoPor: author, creadoPorNombre: 'Gestor Documental',
      revisadoPor: reviewer, revisadoPorNombre: 'Revisora Académica', eliminadoPor: author, eliminadoPorNombre: 'Gestor Documental' });
  });

  it('resuelve nombres en bloques, soportes y decisiones por fila sin afectar la separación de actores', async () => {
    const service = Object.create(BancoDocentesService.prototype) as any;
    service.resolveDocenteId = jest.fn().mockResolvedValue('docente');
    const blocks = Object.keys(EVIDENCE_TYPES).map(bloque => ({ bloque, cargado_por: author, revisado_por: reviewer }));
    service.dataSource = { query: jest.fn().mockResolvedValueOnce(blocks).mockResolvedValueOnce([
      { bloque: 'IDENTIDAD', cargado_por: author, revisiones_campos: { NOMBRE_COMPLETO: { revisadoPor: reviewer } } },
    ]).mockResolvedValueOnce([{ actor_id: author, nombre: 'Gestor Documental' }, { actor_id: reviewer, nombre: 'Revisora Académica' }]) };
    const result = await service.getBloques('docente');
    expect(result[0]).toMatchObject({ cargado_por: author, cargadoPorNombre: 'Gestor Documental',
      revisado_por: reviewer, revisadoPorNombre: 'Revisora Académica' });
    expect(result[0].soportes[0]).toMatchObject({ cargado_por: author, cargadoPorNombre: 'Gestor Documental',
      revisiones_campos: { NOMBRE_COMPLETO: { revisadoPor: reviewer, revisadoPorNombre: 'Revisora Académica' } } });
    // Bloques, soportes y nombres, más una sola consulta para la configuración de carpetas del docente (sin consultas por fila).
    expect(service.dataSource.query).toHaveBeenCalledTimes(4);
  });

  const row = (over: Record<string, any>) => ({
    id: 'log', docente_id: 'docente', bloque: 'GENERAL', accion: 'CARGAR_DOCUMENTO', actor_id: author, canal_origen: null,
    campo_afectado: null, dato_previo: null, dato_nuevo: null, observacion: null, soporte_id: null, ip: null,
    metadata: null, created_at_real: new Date('2026-11-19T19:07:48Z'), ...over,
  });
  /** dataSource falso: las consultas a RundAprobacionLog devuelven las filas indicadas y el resto resuelve nombres. */
  function auditService(actions: any[], consultations: any[] = [], docente: any = { id: 'docente' }) {
    const service = Object.create(BancoDocentesService.prototype) as any;
    service.resolveDocenteId = jest.fn().mockResolvedValue('docente');
    service.docenteRepo = { findOne: jest.fn().mockResolvedValue(docente) };
    service.dataSource = {
      query: jest.fn(async (sql: string) => {
        if (!String(sql).includes('RundAprobacionLog')) return [{ actor_id: author, nombre: 'Gestor Documental' }];
        return String(sql).includes('accion = $2') ? consultations : actions;
      }),
    };
    return service;
  }
  const auditCalls = (service: any) => service.dataSource.query.mock.calls.filter(([sql]: any[]) => String(sql).includes('RundAprobacionLog'));

  it('agrega el nombre a la trazabilidad sin reescribir registros históricos', async () => {
    const service = auditService([row({})]);
    const [entry] = await service.getAuditoria('docente');
    expect(entry).toMatchObject({ id: 'log', docenteId: 'docente', accion: 'CARGAR_DOCUMENTO', actorId: author,
      actorNombre: 'Gestor Documental', cambios: [], metadata: {} });
  });

  it('un docente inexistente responde 404 en lugar de un historial vacío', async () => {
    const service = auditService([], [], null);
    await expect(service.getAuditoria('no-existe')).rejects.toThrow('no encontrado');
    expect(auditCalls(service)).toHaveLength(0);
  });

  it('mantiene visibles las ediciones aunque haya muchas consultas sensibles más recientes', async () => {
    const service = auditService(
      [row({ id: 'e', accion: 'EDITAR', created_at_real: new Date('2026-11-10T10:00:00Z') })],
      [row({ id: 'c', accion: 'CONSULTAR_DATOS_SENSIBLES', created_at_real: new Date('2026-11-10T11:00:00Z') })],
    );
    const rows = await service.getAuditoria('docente');
    expect(rows.map((r: any) => r.id)).toEqual(['c', 'e']);
    const params = auditCalls(service).map(([, p]: any[]) => p);
    expect(params).toEqual(expect.arrayContaining([['docente', 'CONSULTAR_DATOS_SENSIBLES', 50], ['docente', 'CONSULTAR_DATOS_SENSIBLES', 20]]));
  });

  it('lee la hora como instante real en la zona de la base, sin depender de la zona del proceso (hora 5 h antes en QA)', async () => {
    const service = auditService([row({ accion: 'EDITAR' })]);
    await service.getAuditoria('docente');
    expect(auditCalls(service)).toHaveLength(2);
    for (const [sql] of auditCalls(service)) {
      expect(sql).toContain(`"createdAt" AT TIME ZONE current_setting('TIMEZONE')`);
      // Se ordena por la columna original para seguir usando el índice (docente_id, createdAt).
      expect(sql).toContain('ORDER BY "createdAt" DESC');
    }
  });

  it('entrega la fecha con el instante exacto que devolvió la base', async () => {
    const instant = new Date('2026-11-19T19:07:48.000Z'); // 14:07:48 en Bogotá
    const service = auditService([row({ created_at_real: instant })]);
    const [entry] = await service.getAuditoria('docente');
    expect(entry.createdAt).toBe(instant);
    expect(new Date(entry.createdAt).toISOString()).toBe('2026-11-19T19:07:48.000Z');
  });

  it('ordena de más reciente a más antigua mezclando acciones y consultas', async () => {
    const service = auditService(
      [row({ id: 'a2', created_at_real: new Date('2026-11-19T19:00:00Z') }), row({ id: 'a1', created_at_real: new Date('2026-11-19T17:00:00Z') })],
      [row({ id: 'c1', accion: 'CONSULTAR_DATOS_SENSIBLES', created_at_real: new Date('2026-11-19T18:00:00Z') })],
    );
    expect((await service.getAuditoria('docente')).map((r: any) => r.id)).toEqual(['a2', 'c1', 'a1']);
  });

  it('respeta el límite pedido para las acciones y conserva los cambios por campo', async () => {
    const service = auditService([row({ accion: 'EDITAR', campo_afectado: 'dedicacion', dato_previo: 'TC', dato_nuevo: 'HC',
      metadata: { cambios: { dedicacion: { anterior: 'TC', nuevo: 'HC' } } } })]);
    const [entry] = await service.getAuditoria('docente', 10);
    expect(auditCalls(service).map(([, p]: any[]) => p[2]).sort((a: number, b: number) => a - b)).toEqual([10, 20]);
    expect(entry.cambios).toEqual([{ campo: 'dedicacion', anterior: 'TC', nuevo: 'HC' }]);
    expect(entry).toMatchObject({ datoPrevio: 'TC', datoNuevo: 'HC', campoAfectado: 'dedicacion' });
  });
});
