import { BadRequestException, ConflictException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { AuthIdentityCoordinationService } from './auth-identity-coordination.service';
import { identityWriteFingerprint } from './auth-identity-command';

describe('Registro durable y reconciliacion de identidad RUND', () => {
  const id='abcdef00-1111-4111-8111-111111111111', authId='abcdef00-2222-4222-8222-222222222222';
  const command={version:1 as const,actorId:id,payload:{documentNumber:'FICTICIO',documentType:'CC',primer_nombre:'ANA',primer_apellido:'PRUEBA',
    segundo_apellido:null,genero:'F',fechaNacimiento:null},options:{relaxValidation:false,preserveTerritorial:true},
    territorial:null,emailFinal:'ficticio@example.test',phoneFinal:null,finalFullName:'ANA PRUEBA'};
  const hash=identityWriteFingerprint(command), date='2026-10-15T00:00:00.000Z';
  const row=(estado='PREPARADA',recibo_auth:any=null)=>({intencion_id:id,operacion_auth_id:authId,version:1,huella_comando:hash,estado,preparada_en:date,recibo_auth});
  const receipt=(estado='REGISTRADA')=>({operacionId:authId,version:1 as const,huellaComando:hash,estado,registradaEn:date,canceladaEn:estado==='CANCELADA'?date:null,identidadAplicada:estado==='APLICADA',
    ...(estado==='APLICADA'?{aplicadaEn:date,resultado:{personaId:id,usuarioId:id,usuarioCreado:true,camposModificados:[],cambios:{}}}:{})});
  const setup=()=>{
    const query=jest.fn(),txQuery=jest.fn().mockResolvedValue([]),transaction=jest.fn(fn=>fn({query:txQuery}));
    const auth={consultar:jest.fn(),registrar:jest.fn()};
    return {query,txQuery,transaction,auth,service:new AuthIdentityCoordinationService({query,transaction} as any,auth as any)};
  };
  it.each(['no-id','',null])('ID incompatible %s no inicia SQL ni HTTP',async value=>{
    const s=setup();await expect(s.service.preparar(value as any,command)).rejects.toBeInstanceOf(BadRequestException);
    expect(s.query).not.toHaveBeenCalled();expect(s.auth.registrar).not.toHaveBeenCalled();
  });
  it('comando invalido se rechaza antes de SQL, incluso si ya hay una intencion',async()=>{
    const s=setup();await expect(s.service.preparar(id,{})).rejects.toBeInstanceOf(BadRequestException);expect(s.query).not.toHaveBeenCalled();
  });
  it('preparar solo persiste UUID Auth del servidor y huella; no envia el comando ni llama al propietario',async()=>{
    const s=setup();s.query.mockResolvedValue([row()]);const result=await s.service.preparar(id.toUpperCase(),command);
    expect(result.estado).toBe('PREPARADA');expect(s.query.mock.calls[0][1]).toEqual([id,expect.stringMatching(/^[a-f0-9-]{36}$/),hash]);
    expect(s.auth.registrar).not.toHaveBeenCalled();expect(s.transaction).not.toHaveBeenCalled();
  });
  it('reintento usa el UUID ya persistido y otro comando para igual intencion da conflicto sin HTTP',async()=>{
    const s=setup();s.query.mockResolvedValueOnce([]).mockResolvedValueOnce([row()]);
    expect((await s.service.preparar(id,command)).operacionAuthId).toBe(authId);
    s.query.mockResolvedValueOnce([]).mockResolvedValueOnce([row()]);
    await expect(s.service.preparar(id,{...command,phoneFinal:'3001'})).rejects.toBeInstanceOf(ConflictException);
    expect(s.auth.registrar).not.toHaveBeenCalled();
  });
  it('intencion local ausente no consulta ni crea nada en Auth',async()=>{
    const s=setup();s.query.mockResolvedValue([]);
    await expect(s.service.registrarEnAuth(id)).rejects.toBeInstanceOf(NotFoundException);
    await expect(s.service.reconciliar(id)).rejects.toBeInstanceOf(NotFoundException);
    expect(s.auth.consultar).not.toHaveBeenCalled();expect(s.auth.registrar).not.toHaveBeenCalled();
  });
  it('fallo de red no abre transaccion local ni supone ausencia o cancelacion',async()=>{
    const s=setup();s.query.mockResolvedValue([row()]);s.auth.consultar.mockRejectedValue(new ServiceUnavailableException());
    await expect(s.service.reconciliar(id)).rejects.toBeInstanceOf(ServiceUnavailableException);expect(s.transaction).not.toHaveBeenCalled();
  });
  it('ausencia confirmada conserva PREPARADA y nunca registra automaticamente en Auth',async()=>{
    const s=setup();s.query.mockResolvedValue([row()]);s.auth.consultar.mockResolvedValue(null);
    expect((await s.service.reconciliar(id)).consultaAuth).toBe('NO_ENCONTRADA');
    expect(s.auth.registrar).not.toHaveBeenCalled();expect(s.transaction).not.toHaveBeenCalled();
  });
  it.each(['AUTH_REGISTRADA','AUTH_APLICADA','CANCELADA'])('ausencia posterior a %s es inconsistencia, no cancelacion',async state=>{
    const s=setup();s.query.mockResolvedValue([row(state)]);s.auth.consultar.mockResolvedValue(null);
    await expect(s.service.reconciliar(id)).rejects.toBeInstanceOf(ServiceUnavailableException);expect(s.transaction).not.toHaveBeenCalled();
  });
  it('una consulta de ausencia que compite con avance local no devuelve PREPARADA obsoleta',async()=>{
    const s=setup();s.query.mockResolvedValueOnce([row()]).mockResolvedValueOnce([row('AUTH_APLICADA')]);s.auth.consultar.mockResolvedValue(null);
    await expect(s.service.reconciliar(id)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it.each(['AUTH_APLICADA','CANCELADA'])('respuesta REGISTRADA tardia no hace retroceder %s',async state=>{
    const s=setup();s.query.mockResolvedValue([row(state)]);s.auth.consultar.mockResolvedValue(receipt());
    s.txQuery.mockResolvedValueOnce([]).mockResolvedValueOnce([row(state)]);
    expect((await s.service.reconciliar(id)).coordinacion.estado).toBe(state);expect(s.txQuery).toHaveBeenCalledTimes(2);
  });
  it('recibo aplicado contradictorio conserva el original y falla sin UPDATE',async()=>{
    const s=setup();s.query.mockResolvedValue([row('AUTH_APLICADA')]);s.auth.consultar.mockResolvedValue(receipt('APLICADA'));
    s.txQuery.mockResolvedValueOnce([]).mockResolvedValueOnce([{...row('AUTH_APLICADA'),recibo_igual:false}]);
    await expect(s.service.reconciliar(id)).rejects.toBeInstanceOf(ServiceUnavailableException);expect(s.txQuery).toHaveBeenCalledTimes(2);
  });
  it('una transicion valida de estado no admite cambiar los metadatos originales de Auth',async()=>{
    const s=setup();s.query.mockResolvedValue([row('AUTH_REGISTRADA',receipt())]);
    s.auth.consultar.mockResolvedValue({...receipt('APLICADA'),registradaEn:'2026-10-16T00:00:00.000Z'});
    s.txQuery.mockResolvedValueOnce([]).mockResolvedValueOnce([row('AUTH_REGISTRADA',receipt())]);
    await expect(s.service.reconciliar(id)).rejects.toBeInstanceOf(ServiceUnavailableException);expect(s.txQuery).toHaveBeenCalledTimes(2);
  });
  it('recibo de otro hash no se vincula a la intencion local',async()=>{
    const s=setup();s.query.mockResolvedValue([row()]);s.auth.registrar.mockResolvedValue({...receipt(),huellaComando:'b'.repeat(64)});
    s.txQuery.mockResolvedValueOnce([]).mockResolvedValueOnce([row()]);
    await expect(s.service.registrarEnAuth(id)).rejects.toBeInstanceOf(ConflictException);expect(s.txQuery).toHaveBeenCalledTimes(2);
  });
  it('reconciliar un recibo igual no actualiza fechas ni reescribe el resultado',async()=>{
    const s=setup();s.query.mockResolvedValue([row('AUTH_REGISTRADA')]);s.auth.consultar.mockResolvedValue(receipt());
    s.txQuery.mockResolvedValueOnce([]).mockResolvedValueOnce([{...row('AUTH_REGISTRADA',receipt()),recibo_igual:true}]);
    expect((await s.service.reconciliar(id)).coordinacion.reciboAuth).toEqual(receipt());expect(s.txQuery).toHaveBeenCalledTimes(2);
  });
});
