import { BadRequestException, ConflictException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { RundIdentityApplyService } from './rund-identity-apply.controller';
import { identityWriteCommand, identityWriteFingerprint } from './rund-identity-command';
import { upsertRundAuthIdentityWithManager } from './rund-identity-write.adapter';
import { identityBefore, identityImage } from './rund-identity-effects';
jest.mock('./rund-identity-write.adapter', () => ({ upsertRundAuthIdentityWithManager: jest.fn() }));
jest.mock('./rund-identity-effects',()=>({identityBefore:jest.fn(),identityImage:jest.fn(),lockIdentityEffects:jest.fn()}));

describe('Aplicacion transaccional de identidad en Auth', () => {
  const id = 'abcdef00-1111-4111-8111-111111111111';
  const command = { version: 1 as const, actorId: id, payload: { documentNumber: 'FICTICIO', documentType: 'CC', primer_nombre: 'ANA',
    primer_apellido: 'PRUEBA', segundo_apellido: null, genero: 'F', fechaNacimiento: '2000-02-29' },
    options: { relaxValidation: false, preserveTerritorial: true }, territorial: null, emailFinal: 'ficticio@example.test', phoneFinal: null, finalFullName: 'ANA PRUEBA' };
  const body = () => ({ comando: command, huellaComando: identityWriteFingerprint(command) });
  const row = () => ({ operacion_id: id, version: 1, huella_comando: body().huellaComando, estado: 'REGISTRADA', registrada_en: new Date(), cancelada_en: null });
  const setup = (enabled: unknown = true) => {
    const query = jest.fn().mockResolvedValue([]), manager = { query };
    const transaction = jest.fn(fn => fn(manager));
    return { query, manager, transaction, service: new RundIdentityApplyService({ transaction } as any, { get: () => enabled } as any) };
  };
  beforeEach(() => {
    jest.clearAllMocks();
    (identityBefore as jest.Mock).mockResolvedValue({version:1,persona:null,usuarios:[],roles:[]});
    (identityImage as jest.Mock).mockResolvedValue({version:1,persona:{id},usuarios:[{id}],roles:[]});
  });
  it.each([undefined, false, 'false', '', '1'])('no habilita escrituras por defecto o por valores ambiguos %s', async value => {
    const s = setup(value === undefined ? null : value);
    await expect(s.service.aplicar(id, body())).rejects.toBeInstanceOf(ServiceUnavailableException); expect(s.transaction).not.toHaveBeenCalled();
  });
  it('la huella es independiente del orden JSON y cambia con cada campo relevante', () => {
    expect(identityWriteFingerprint({ ...command, payload: Object.fromEntries(Object.entries(command.payload).reverse()) })).toBe(body().huellaComando);
    for (const changed of [{ ...command, actorId: 'otro' }, { ...command, phoneFinal: '3001' }, { ...command, territorial: { id: '1' } },
      { ...command, options: { ...command.options, relaxValidation: true } }, { ...command, payload: { ...command.payload, fechaNacimiento: null } }])
      expect(identityWriteFingerprint(changed)).not.toBe(body().huellaComando);
  });
  it.each([{}, { ...command, extra: true }, { ...command, emailFinal: ' UPPER@example.test' },
    { ...command, payload: { ...command.payload, fechaNacimiento: '2001-02-29' } },
    { ...command, territorial: { id: '9223372036854775808' } }, { ...command, actorId: '\0' }])('rechaza comandos incompatibles %s', raw => {
    expect(() => identityWriteCommand(raw)).toThrow();
  });
  it('hash incorrecto, body extra y comando invalido no abren transaccion', async () => {
    const s = setup();
    await expect(s.service.aplicar(id, { ...body(), huellaComando: 'a'.repeat(64) })).rejects.toBeInstanceOf(ConflictException);
    await expect(s.service.aplicar(id, { ...body(), activar: true })).rejects.toBeInstanceOf(BadRequestException);
    await expect(s.service.aplicar(id, { comando: {}, huellaComando: body().huellaComando })).rejects.toBeInstanceOf(BadRequestException);
    expect(s.transaction).not.toHaveBeenCalled();
  });
  it.each(['ausente', 'CANCELADA', 'otra-huella'])('no escribe identidades para %s', async state => {
    const s = setup(), op = row();
    if (state === 'CANCELADA') op.estado = state;
    if (state === 'otra-huella') op.huella_comando = 'b'.repeat(64);
    s.query.mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce(state === 'ausente' ? [] : [op]);
    await expect(s.service.aplicar(id, body())).rejects.toBeInstanceOf(state === 'ausente' ? NotFoundException : ConflictException);
    expect(upsertRundAuthIdentityWithManager).not.toHaveBeenCalled();
  });
  it('recupera el resultado persistido sin ejecutar otra vez el adaptador', async () => {
    const s = setup(), result = { personaId: id, usuarioId: id, usuarioCreado: true, camposModificados: [], cambios: {} };
    s.query.mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([{ ...row(), estado: 'APLICADA', aplicada_en: new Date(), resultado: result }]);
    expect((await s.service.aplicar(id, body())).operacion.resultado).toEqual(result);
    expect(upsertRundAuthIdentityWithManager).not.toHaveBeenCalled(); expect(s.query).toHaveBeenCalledTimes(4);
  });
  it('identidad y recibo usan el mismo manager; un fallo de persistencia se propaga a la transaccion', async () => {
    const s = setup(), error = new Error('fallo recibo');
    s.query.mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([row()]).mockResolvedValueOnce([]).mockRejectedValueOnce(error);
    (upsertRundAuthIdentityWithManager as jest.Mock).mockResolvedValue({ authPersonId: id, authUser: { id_user: id }, authUserCreated: true, personaChangedFields: [], profileChanges: {} });
    await expect(s.service.aplicar(id, body())).rejects.toBe(error);
    expect((upsertRundAuthIdentityWithManager as jest.Mock).mock.calls[0][0]).toBe(s.manager);
    expect((upsertRundAuthIdentityWithManager as jest.Mock).mock.calls[0][1].payload.fechaNacimiento).toEqual(new Date('2000-02-29T00:00:00.000Z'));
  });
  it('una operacion compensada no devuelve un exito aplicado ni ejecuta el adaptador',async()=>{
    const s=setup();s.query.mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([row()]).mockResolvedValueOnce([{estado:'COMPENSADA'}]);
    await expect(s.service.aplicar(id,body())).rejects.toBeInstanceOf(ConflictException);expect(upsertRundAuthIdentityWithManager).not.toHaveBeenCalled();
  });
  it('un fallo al guardar la preimagen no permite devolver un recibo aplicado',async()=>{
    const s=setup(),error=new Error('fallo efecto');
    (upsertRundAuthIdentityWithManager as jest.Mock).mockResolvedValue({authPersonId:id,authUser:{id_user:id},authUserCreated:true,personaChangedFields:[],profileChanges:{}});
    s.query.mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([row()]).mockResolvedValueOnce([])
      .mockResolvedValueOnce([{...row(),estado:'APLICADA',aplicada_en:new Date(),resultado:{}}]).mockRejectedValueOnce(error);
    await expect(s.service.aplicar(id,body())).rejects.toBe(error);expect(s.query.mock.calls[5][0]).toContain('INSERT INTO auth.rund_identidad_efecto');
  });
  it('una imagen que no corresponde a la identidad aplicada aborta antes de confirmar recibo',async()=>{
    const s=setup();s.query.mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([row()]);
    (upsertRundAuthIdentityWithManager as jest.Mock).mockResolvedValue({authPersonId:id,authUser:{id_user:id},authUserCreated:false,personaChangedFields:[],profileChanges:{}});
    (identityImage as jest.Mock).mockResolvedValueOnce({persona:null,usuarios:[]});
    await expect(s.service.aplicar(id,body())).rejects.toThrow('imagen no corresponde');expect(s.query).toHaveBeenCalledTimes(4);
  });
});
