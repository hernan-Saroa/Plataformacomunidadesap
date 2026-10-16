import { BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { AuthIdentityMailService } from './auth-identity-mail.service';
import { nativeBusinessContext, nativeBusinessFingerprint } from '../modules/banco-docentes/rund-native-business-context';

describe('Consumidor durable de correo de identidad RUND', () => {
  const id = 'abcdef00-1111-4111-8111-111111111111';
  function setup(estado = 'PENDIENTE') {
    const command = { version: 1, actorId: id, payload: { documentNumber: '12345', documentType: 'CC', primer_nombre: 'DOCENTE',
      primer_apellido: 'FICTICIO', segundo_apellido: null, genero: null, fechaNacimiento: null },
      options: { relaxValidation: false, preserveTerritorial: false }, territorial: null,
      emailFinal: 'ficticio@example.test', phoneFinal: null, finalFullName: 'DOCENTE FICTICIO' };
    const context = nativeBusinessContext(command, { payload: { documentNumber: '12345', periodoCarga: '2095-2' }, rawPayload: {},
      options: { audit: { actorId: id, canalOrigen: 'MODAL' } }, territorial: null,
      emailFinal: command.emailFinal, phoneFinal: null, finalFullName: command.finalFullName } as any);
    const row: any = { intencion_id: id, estado, contexto: context, elegible: true, huella_contexto: nativeBusinessFingerprint(context),
      resultado_nativo: { email: command.emailFinal, authUserCreated: true }, intento_id: null };
    let inTransaction = false;
    const query = jest.fn(async (sql: string, params: any[]) => {
      if (sql.startsWith('SET LOCAL')) return [];
      if (sql.includes('SELECT m.*')) return [JSON.parse(JSON.stringify(row))];
      if (sql.includes("SET estado='ENVIANDO'")) { row.estado = 'ENVIANDO'; row.intento_id = params[1]; return [JSON.parse(JSON.stringify(row))]; }
      if (sql.includes('SET estado=$3')) { row.estado = params[2]; return [JSON.parse(JSON.stringify(row))]; }
      return [JSON.parse(JSON.stringify(row))];
    });
    const transaction = jest.fn(async fn => { inTransaction = true; try { return await fn({ query }); } finally { inTransaction = false; } });
    const client = { enviar: jest.fn(async () => { expect(inTransaction).toBe(false); return true; }) };
    return { row, query, transaction, client, service: new AuthIdentityMailService({ query, transaction } as any, client as any) };
  }
  it('ID inválido no consulta, reserva o envía', async () => {
    const s = setup(); await expect(s.service.enviarPendiente('NO')).rejects.toBeInstanceOf(BadRequestException);
    expect(s.query).not.toHaveBeenCalled(); expect(s.client.enviar).not.toHaveBeenCalled();
  });
  it('confirma reserva antes de HTTP, deriva mensaje del contexto servidor y conserva recibo mínimo', async () => {
    const s = setup(); expect(await s.service.enviarPendiente(id)).toEqual({ intencionId: id, estado: 'ENVIADO', requiereRevision: false });
    expect(s.client.enviar).toHaveBeenCalledWith({ to: 'ficticio@example.test', username: 'ficticio@example.test', temporaryPassword: '12345', fullName: 'DOCENTE FICTICIO' });
    const recorded = s.query.mock.calls.filter(([sql]) => /UPDATE rund\.identidad_correo\b/.test(sql));
    expect(recorded).toHaveLength(2);
    expect(JSON.stringify(recorded)).not.toContain('12345'); expect(JSON.stringify(recorded)).not.toContain('ficticio@example.test');
    await s.service.enviarPendiente(id); expect(s.client.enviar).toHaveBeenCalledTimes(1);
  });
  it.each(['ENVIANDO', 'ENVIADO', 'INCIERTO'])('estado %s se consulta sin volver a intentar envío', async estado => {
    const s = setup(estado); expect((await s.service.enviarPendiente(id)).estado).toBe(estado); expect(s.client.enviar).not.toHaveBeenCalled();
  });
  it.each(['elegible', 'huella', 'correo', 'cuenta'])('contexto %s incompatible bloquea intento antes de HTTP', async field => {
    const s = setup();
    if (field === 'elegible') s.row.elegible = false;
    if (field === 'huella') s.row.huella_contexto = '0'.repeat(64);
    if (field === 'correo') s.row.resultado_nativo.email = 'otra@example.test';
    if (field === 'cuenta') s.row.resultado_nativo.authUserCreated = false;
    await expect(s.service.enviarPendiente(id)).rejects.toBeInstanceOf(ServiceUnavailableException); expect(s.client.enviar).not.toHaveBeenCalled();
  });
  it('fallo del adaptador registra INCIERTO sin reintentar ni devolver error privado', async () => {
    const s = setup(); s.client.enviar.mockRejectedValueOnce(new Error('RESPUESTA PRIVADA'));
    expect(await s.service.enviarPendiente(id)).toEqual({ intencionId: id, estado: 'INCIERTO', requiereRevision: true });
    await s.service.enviarPendiente(id); expect(s.client.enviar).toHaveBeenCalledTimes(1);
  });
  it('respuesta negativa del propietario queda incierta, no pendiente para reenviar', async () => {
    const s = setup(); s.client.enviar.mockResolvedValueOnce(false); expect((await s.service.enviarPendiente(id)).estado).toBe('INCIERTO');
  });
  it('pérdida del recibo SQL tras HTTP conserva ENVIANDO; otro intento solo recupera su estado', async () => {
    const s = setup(), original = s.query.getMockImplementation()!;
    s.query.mockImplementation(async (sql, params) => { if (sql.includes('SET estado=$3')) throw new Error('SQL PRIVADO'); return original(sql, params); });
    await expect(s.service.enviarPendiente(id)).rejects.toThrow('requiere conciliacion'); expect(s.row.estado).toBe('ENVIANDO');
    expect((await s.service.enviarPendiente(id)).estado).toBe('ENVIANDO'); expect(s.client.enviar).toHaveBeenCalledTimes(1);
  });
  it('ausencia y errores SQL no exponen parámetros del contexto en consulta o reserva', async () => {
    const s = setup(); s.query.mockResolvedValueOnce([]);
    await expect(s.service.consultar(id)).rejects.toBeInstanceOf(NotFoundException);
    s.query.mockRejectedValueOnce(new Error('PARAMETROS PRIVADOS')); await expect(s.service.consultar(id)).rejects.toThrow('RUND no confirma');
    s.transaction.mockRejectedValueOnce(new Error('PARAMETROS PRIVADOS')); await expect(s.service.enviarPendiente(id)).rejects.toThrow('No fue posible reservar');
  });
});
