import { BadRequestException, ConflictException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { AuthIdentityMailReconciliationService } from './auth-identity-mail-reconciliation.service';

describe('Conciliación local de resultados observados de correo RUND', () => {
  const id = 'abcdef00-1111-4111-8111-111111111111', attempt = 'abcdef00-2222-4222-8222-222222222222';
  function setup(state = 'ENVIANDO') {
    const row: any = { intencion_id: id, intento_id: state === 'PENDIENTE' ? null : attempt, estado: state };
    const data: { event: any } = { event: null };
    const query = jest.fn(async (sql: string, params?: any[]) => {
      if (sql.startsWith('SET LOCAL')) return [];
      if (sql.startsWith('SELECT has_table_privilege')) return [{ disponible: true }];
      if (sql.startsWith('SELECT * FROM rund.identidad_correo')) return JSON.parse(JSON.stringify([row]));
      if (sql.startsWith('SELECT intencion_id,intento_id,resultado')) return data.event ? JSON.parse(JSON.stringify([data.event])) : [];
      if (sql.startsWith('INSERT')) { data.event = { intencion_id: params![0], intento_id: params![1], resultado: params![2] }; return [data.event]; }
      if (sql.includes('SET estado=$3')) { row.estado = params![2]; return JSON.parse(JSON.stringify([row])); }
      throw new Error('SQL inesperado');
    });
    const transaction = jest.fn(async fn => fn({ query }));
    return { row, data, query, transaction, service: new AuthIdentityMailReconciliationService({ query, transaction } as any) };
  }
  it('IDs y resultados inválidos no abren SQL o transacciones', async () => {
    const s = setup();
    await expect(s.service.conciliar('no')).rejects.toBeInstanceOf(BadRequestException);
    await expect(s.service.registrarResultado(id, 'no', 'ACEPTADO')).rejects.toBeInstanceOf(BadRequestException);
    await expect(s.service.registrarResultado(id, attempt, 'ENVIADO' as any)).rejects.toBeInstanceOf(BadRequestException);
    expect(s.query).not.toHaveBeenCalled(); expect(s.transaction).not.toHaveBeenCalled();
  });
  it.each([false, null, undefined])('falta de permisos o tabla disponible %s bloquea antes de SMTP', async disponible => {
    const s = setup(); s.query.mockResolvedValueOnce([{ disponible }] as any);
    await expect(s.service.verificarDisponible()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it('verifica permisos sin mutaciones y oculta errores de instalación', async () => {
    const s = setup(); await s.service.verificarDisponible(); expect(s.transaction).not.toHaveBeenCalled();
    s.query.mockRejectedValueOnce(new Error('SQL PRIVADO')); await expect(s.service.verificarDisponible()).rejects.toThrow('RUND no confirma');
  });
  it('registra solo intención, intento y resultado; repetir conserva el registro', async () => {
    const s = setup(); await s.service.registrarResultado(id.toUpperCase(), attempt.toUpperCase(), 'ACEPTADO');
    expect(s.data.event).toEqual({ intencion_id: id, intento_id: attempt, resultado: 'ACEPTADO' });
    await s.service.registrarResultado(id, attempt, 'ACEPTADO');
    expect(s.query.mock.calls.filter(([sql]) => sql.startsWith('INSERT'))).toHaveLength(1);
    expect(s.row.estado).toBe('ENVIANDO');
  });
  it.each(['PENDIENTE','ENVIADO','INCIERTO'])('estado %s sin evento no permite fabricar uno retrospectivo', async state => {
    const s = setup(state); await expect(s.service.registrarResultado(id, attempt, 'ACEPTADO')).rejects.toBeInstanceOf(ConflictException);
    expect(s.data.event).toBeNull();
  });
  it('otro intento u otro resultado no sustituyen evidencia anterior', async () => {
    const s = setup(); await s.service.registrarResultado(id, attempt, 'ACEPTADO');
    await expect(s.service.registrarResultado(id, id, 'ACEPTADO')).rejects.toBeInstanceOf(ConflictException);
    await expect(s.service.registrarResultado(id, attempt, 'INCIERTO')).rejects.toBeInstanceOf(ConflictException);
    expect(s.data.event.resultado).toBe('ACEPTADO');
  });
  it.each(['PENDIENTE','ENVIANDO','ENVIADO','INCIERTO'])('sin evidencia conserva %s sin inventar aceptación, fallo o permiso de reenvío', async state => {
    const s = setup(state); const result = await s.service.conciliar(id);
    expect(result).toEqual({ version: 1, intencionId: id, estado: state, resultadoRegistrado: false,
      requiereRevision: ['ENVIANDO','INCIERTO'].includes(state) });
    expect(s.query.mock.calls.some(([sql]) => /\bINSERT INTO\b|\bUPDATE rund\.|\bDELETE FROM\b/.test(sql))).toBe(false);
  });
  it.each([['ACEPTADO','ENVIADO'],['INCIERTO','INCIERTO']])('proyecta %s como %s una sola vez sin volver a enviar', async (result, state) => {
    const s = setup(); await s.service.registrarResultado(id, attempt, result as any);
    expect(await s.service.conciliar(id)).toEqual({ version: 1, intencionId: id, estado: state,
      resultadoRegistrado: true, requiereRevision: state === 'INCIERTO' });
    await s.service.conciliar(id);
    expect(s.query.mock.calls.filter(([sql]) => sql.includes('SET estado=$3'))).toHaveLength(1);
  });
  it('una proyección fallida conserva el hecho ya registrado para recuperación explícita', async () => {
    const s = setup(); await s.service.registrarResultado(id, attempt, 'ACEPTADO');
    const original = s.query.getMockImplementation()!;
    s.query.mockImplementation(async (sql, args) => { if (sql.includes('SET estado=$3')) throw new Error('SQL PRIVADO'); return original(sql, args); });
    await expect(s.service.conciliar(id)).rejects.toThrow('No fue posible conciliar');
    expect(s.row.estado).toBe('ENVIANDO'); expect(s.data.event.resultado).toBe('ACEPTADO');
    s.query.mockImplementation(original); expect((await s.service.conciliar(id)).estado).toBe('ENVIADO');
  });
  it.each(['intencion','intento','resultado','terminal'])('evidencia incoherente %s no cambia el aviso', async field => {
    const s = setup(); s.data.event = { intencion_id: id, intento_id: attempt, resultado: 'ACEPTADO' };
    if (field === 'intencion') s.data.event.intencion_id = attempt;
    if (field === 'intento') s.data.event.intento_id = id;
    if (field === 'resultado') s.data.event.resultado = 'DESCONOCIDO';
    if (field === 'terminal') s.row.estado = 'INCIERTO';
    await expect(s.service.conciliar(id)).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(s.query.mock.calls.some(([sql]) => sql.includes('SET estado=$3'))).toBe(false);
  });
  it('ausencia y errores SQL no se confunden con pendiente o exponen parámetros', async () => {
    const s = setup(); s.query.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    await expect(s.service.conciliar(id)).rejects.toBeInstanceOf(NotFoundException);
    s.query.mockRejectedValueOnce(new Error('PARAMETROS PRIVADOS'));
    await expect(s.service.registrarResultado(id, attempt, 'ACEPTADO')).rejects.toThrow('requiere conciliacion');
  });
});
