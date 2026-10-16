import { ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { AuthIdentityOperationClient } from './auth-identity-operation.client';
import { identityWriteFingerprint } from './auth-identity-command';

describe('Cliente preparatorio de intenciones Auth', () => {
  const id = 'abcdef00-1111-4111-8111-111111111111', hash = 'a'.repeat(64);
  const op = { operacionId: id, version: 1, huellaComando: hash, estado: 'REGISTRADA', registradaEn: '2026-10-15T00:00:00.000Z', canceladaEn: null, identidadAplicada: false };
  const keys = ['AUTH_SERVICE_URL', 'AUTH_INTERNAL_SERVICE_TOKEN', 'INTERNAL_SERVICE_TOKEN', 'PTA_INTERNAL_SERVICE_TOKEN', 'JWT_SECRET'];
  let saved: Array<string | undefined>, original: typeof fetch, send: jest.Mock;
  const response = (data: any, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => ({ success: true, data }) });
  beforeEach(() => { saved = keys.map(key => process.env[key]); original = global.fetch;
    process.env.AUTH_SERVICE_URL = 'http://auth.test/base/'; process.env.AUTH_INTERNAL_SERVICE_TOKEN = ' interno ';
    delete process.env.INTERNAL_SERVICE_TOKEN; process.env.PTA_INTERNAL_SERVICE_TOKEN = 'no-pta'; process.env.JWT_SECRET = 'no-jwt';
    send = jest.fn().mockResolvedValue(response({ operacion: op })); global.fetch = send;
  });
  afterEach(() => { global.fetch = original; keys.forEach((key, i) => { if (saved[i] === undefined) delete process.env[key]; else process.env[key] = saved[i]; }); });
  const command = { version:1 as const,actorId:id,payload:{documentNumber:'FICTICIO',documentType:'CC',primer_nombre:'ANA',primer_apellido:'PRUEBA',
    segundo_apellido:null,genero:'F',fechaNacimiento:'2000-02-29'},options:{relaxValidation:false,preserveTerritorial:true},
    territorial:null,emailFinal:'ficticio@example.test',phoneFinal:null,finalFullName:'ANA PRUEBA' };
  const applied = () => ({...op,huellaComando:identityWriteFingerprint(command),estado:'APLICADA',identidadAplicada:true,aplicadaEn:op.registradaEn,
    resultado:{personaId:id,usuarioId:id,usuarioCreado:true,camposModificados:[],cambios:{}} });
  it('envia el comando canonico con su huella y recupera el resultado aplicado desde otro cliente',async()=>{
    const receipt=applied(); send.mockResolvedValueOnce(response({operacion:receipt}));
    expect(await new AuthIdentityOperationClient().aplicar(id,command)).toEqual(receipt);
    expect(JSON.parse(send.mock.calls[0][1].body)).toEqual({comando:command,huellaComando:receipt.huellaComando});
    expect(send.mock.calls[0][0]).toBe('http://auth.test/base/internal/rund/v1/personas/escritura/operaciones/'+id+'/aplicar');
    send.mockResolvedValue(response({consulta:{operacionId:id},encontrada:true,operacion:receipt}));
    expect(await new AuthIdentityOperationClient().consultar(id)).toEqual(receipt);
  });
  it.each(['sin-resultado','sin-fecha','clave-secreta','campo-desconocido','cambio-incompleto'])('no confirma resultado aplicado incompatible %s',async kind=>{
    const receipt:any=applied();
    if(kind==='sin-resultado') delete receipt.resultado;
    if(kind==='sin-fecha') delete receipt.aplicadaEn;
    if(kind==='clave-secreta') receipt.resultado.password_hash='inadmisible';
    if(kind==='campo-desconocido') {receipt.resultado.camposModificados=['password_hash'];receipt.resultado.cambios={password_hash:{anterior:null,nuevo:'inadmisible'}};}
    if(kind==='cambio-incompleto') receipt.resultado.camposModificados=['nom_largo'];
    send.mockResolvedValue(response({operacion:receipt}));
    await expect(new AuthIdentityOperationClient().aplicar(id,command)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it('respuesta perdida al aplicar no provoca reintento; un comando invalido ni siquiera usa red',async()=>{
    send.mockRejectedValue(new Error('respuesta perdida'));
    await expect(new AuthIdentityOperationClient().aplicar(id,command)).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(send).toHaveBeenCalledTimes(1);send.mockClear();
    await expect(new AuthIdentityOperationClient().aplicar(id,{...command,emailFinal:'INVALIDO'})).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(send).not.toHaveBeenCalled();
  });
  it('registra una sola vez con ID estable, solo token interno y sin redirects/JWT/cookies', async () => {
    expect(await new AuthIdentityOperationClient().registrar(id.toUpperCase(), hash)).toEqual(op);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith('http://auth.test/base/internal/rund/v1/personas/escritura/operaciones', {
      method: 'POST', redirect: 'error', signal: expect.anything(), headers: { 'x-internal-service-token': 'interno', Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: 1, operacionId: id, huellaComando: hash }),
    });
  });
  it('consulta requiere echo y ausencia explícita; 404 de contrato no es una operación inexistente', async () => {
    send.mockResolvedValue(response({ consulta: { operacionId: id }, encontrada: false, operacion: null }));
    expect(await new AuthIdentityOperationClient().consultar(id)).toBeNull();
    send.mockResolvedValue(response({}, 404)); await expect(new AuthIdentityOperationClient().consultar(id)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it('recupera recibo consultado y acepta que un registro repetido ya esté cancelado', async () => {
    send.mockResolvedValueOnce(response({ consulta: { operacionId: id }, encontrada: true, operacion: op }));
    expect(await new AuthIdentityOperationClient().consultar(id)).toEqual(op);
    const cancelled = { ...op, estado: 'CANCELADA', canceladaEn: op.registradaEn }; send.mockResolvedValue(response({ operacion: cancelled }));
    expect(await new AuthIdentityOperationClient().registrar(id, hash)).toEqual(cancelled);
    expect(await new AuthIdentityOperationClient().cancelar(id, hash)).toEqual(cancelled);
  });
  it('conflicto 409 se conserva y no se reintenta con un ID nuevo', async () => {
    send.mockResolvedValue(response({}, 409)); await expect(new AuthIdentityOperationClient().registrar(id, hash)).rejects.toBeInstanceOf(ConflictException); expect(send).toHaveBeenCalledTimes(1);
  });
  it('timeout de registro no produce éxito ni reintento automático; la consulta posterior puede recuperar el recibo', async () => {
    const client = new AuthIdentityOperationClient(); send.mockRejectedValueOnce(new Error('respuesta perdida'));
    await expect(client.registrar(id, hash)).rejects.toBeInstanceOf(ServiceUnavailableException); expect(send).toHaveBeenCalledTimes(1);
    send.mockResolvedValue(response({ consulta: { operacionId: id }, encontrada: true, operacion: op })); expect(await client.consultar(id)).toEqual(op);
  });
  it.each(['no-id', '', null])('rechaza ID incompatible %s sin red', async value => {
    await expect(new AuthIdentityOperationClient().consultar(value as any)).rejects.toBeInstanceOf(ServiceUnavailableException); expect(send).not.toHaveBeenCalled();
  });
  it.each(['a', 'A'.repeat(64), null])('rechaza hash incompatible %s sin red', async value => {
    await expect(new AuthIdentityOperationClient().registrar(id, value as any)).rejects.toBeInstanceOf(ServiceUnavailableException); expect(send).not.toHaveBeenCalled();
  });
  it.each([{}, { operacion: { ...op, operacionId: '22222222-2222-4222-8222-222222222222' } },
    { operacion: { ...op, huellaComando: 'b'.repeat(64) } }, { operacion: { ...op, estado: 'APLICADA' } },
    { operacion: { ...op, identidadAplicada: true } }, { operacion: { ...op, registradaEn: 'ayer' } },
    { operacion: { ...op, canceladaEn: op.registradaEn } }, { operacion: { ...op, estado: 'CANCELADA' } },
    { operacion: { ...op, password: 'no-admitido' } }])('rechaza recibo ajeno, parcial o que afirme una aplicación %s', async data => {
    send.mockResolvedValue(response(data)); await expect(new AuthIdentityOperationClient().registrar(id, hash)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it('cancelar exige estado final cancelado y consulta no admite falso vacío sin echo', async () => {
    await expect(new AuthIdentityOperationClient().cancelar(id, hash)).rejects.toBeInstanceOf(ServiceUnavailableException);
    send.mockResolvedValue(response({ encontrada: false, operacion: null })); await expect(new AuthIdentityOperationClient().consultar(id)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it.each([400, 401, 403, 404, 500, 503])('HTTP %s no confirma un registro', async status => {
    send.mockResolvedValue(response({}, status)); await expect(new AuthIdentityOperationClient().registrar(id, hash)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it('JSON inválido falla sin sustitución de SQL o caché', async () => {
    send.mockResolvedValue({ ok: true, json: async () => { throw new Error('JSON inválido'); } });
    await expect(new AuthIdentityOperationClient().consultar(id)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it('no sustituye credenciales por PTA/JWT; admite credencial común', async () => {
    delete process.env.AUTH_INTERNAL_SERVICE_TOKEN;
    await expect(new AuthIdentityOperationClient().registrar(id, hash)).rejects.toBeInstanceOf(ServiceUnavailableException); expect(send).not.toHaveBeenCalled();
    process.env.INTERNAL_SERVICE_TOKEN = 'comun'; await new AuthIdentityOperationClient().registrar(id, hash);
    expect(send.mock.calls[0][1].headers['x-internal-service-token']).toBe('comun');
  });
  it.each(['file:///auth', 'http://usuario:secreto@auth.test', 'http://auth.test?token=secreto', 'http://auth.test#secreto'])('rechaza URL incompatible %s', async base => {
    process.env.AUTH_SERVICE_URL = base; await expect(new AuthIdentityOperationClient().registrar(id, hash)).rejects.toBeInstanceOf(ServiceUnavailableException); expect(send).not.toHaveBeenCalled();
  });
});
