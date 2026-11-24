import { leerAuditoriaRund, RUND_CONSULTA_SENSIBLE } from './rund-auditoria-lectura';

describe('leerAuditoriaRund', () => {
  const db = (rows: any[] = []) => ({ query: jest.fn().mockResolvedValue(rows) });

  it('pide acciones distintas de la consulta sensible con el límite recibido', async () => {
    const conn = db();
    await leerAuditoriaRund(conn as any, 'doc-1', { consultasSensibles: false, limit: 50 });
    const [sql, params] = conn.query.mock.calls[0];
    expect(sql).toContain('accion <> $2');
    expect(params).toEqual(['doc-1', RUND_CONSULTA_SENSIBLE, 50]);
  });

  it('pide solo las consultas sensibles cuando se indica', async () => {
    const conn = db();
    await leerAuditoriaRund(conn as any, 'doc-1', { consultasSensibles: true, limit: 20 });
    const [sql, params] = conn.query.mock.calls[0];
    expect(sql).toContain('accion = $2');
    expect(params[2]).toBe(20);
  });

  it('convierte la fecha en la base y conserva el índice por docente y fecha', async () => {
    const conn = db();
    await leerAuditoriaRund(conn as any, 'doc-1', { consultasSensibles: false, limit: 5 });
    const sql: string = conn.query.mock.calls[0][0];
    expect(sql).toContain(`"createdAt" AT TIME ZONE current_setting('TIMEZONE') AS created_at_real`);
    expect(sql).toMatch(/WHERE docente_id = \$1::uuid/);
    expect(sql).toMatch(/ORDER BY "createdAt" DESC, id DESC/);
    expect(sql).not.toMatch(/ORDER BY created_at_real/);
  });

  it('mapea las columnas al formato del historial y reemplaza metadata nula por un objeto', async () => {
    const at = new Date('2026-11-19T19:07:48Z');
    const [entry] = await leerAuditoriaRund(db([{
      id: 'x', docente_id: 'd', bloque: 'GENERAL', accion: 'EDITAR', actor_id: 'u', canal_origen: 'MODAL',
      campo_afectado: 'observaciones', dato_previo: null, dato_nuevo: 'n', observacion: 'obs', soporte_id: 's', ip: '::1',
      metadata: null, created_at_real: at,
    }]) as any, 'd', { consultasSensibles: false, limit: 1 });
    expect(entry).toEqual({
      id: 'x', docenteId: 'd', bloque: 'GENERAL', accion: 'EDITAR', actorId: 'u', canalOrigen: 'MODAL',
      campoAfectado: 'observaciones', datoPrevio: null, datoNuevo: 'n', observacion: 'obs', soporteId: 's', ip: '::1',
      metadata: {}, createdAt: at,
    });
  });

  it('sin filas devuelve una lista vacía', async () => {
    expect(await leerAuditoriaRund(db([]) as any, 'd', { consultasSensibles: true, limit: 20 })).toEqual([]);
  });
});
