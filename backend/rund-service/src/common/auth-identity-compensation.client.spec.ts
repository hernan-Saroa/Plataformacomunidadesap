import { ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { AuthIdentityCompensationClient, identityReviewReasons } from './auth-identity-compensation.client';

describe('Cliente RUND de resolucion propietaria Auth',()=>{
  const op='abcdef00-1111-4111-8111-111111111111',id='abcdef00-2222-4222-8222-222222222222',hash='a'.repeat(64);
  const receipt=()=>({version:1,operacionId:op,intencionId:id,huellaComando:hash,estado:'COMPENSADA',motivo:null,resueltaEn:'2026-10-15T10:00:00.000Z',identidadRevertida:true});
  const response=(data:any,status=200)=>({status,ok:status>=200&&status<300,json:async()=>({success:true,data})});
  const get=(res:any)=>({consulta:{operacionId:op},encontrada:true,resolucion:res});
  const keys=['AUTH_SERVICE_URL','AUTH_INTERNAL_SERVICE_TOKEN','INTERNAL_SERVICE_TOKEN','PTA_INTERNAL_SERVICE_TOKEN','JWT_SECRET'];
  let saved:(string|undefined)[],original:typeof fetch,send:jest.Mock;
  beforeEach(()=>{saved=keys.map(k=>process.env[k]);original=global.fetch;process.env.AUTH_SERVICE_URL='http://auth.test/base/';
    process.env.AUTH_INTERNAL_SERVICE_TOKEN=' interno ';process.env.INTERNAL_SERVICE_TOKEN='no-reenviar';process.env.JWT_SECRET='no-jwt';
    send=jest.fn().mockResolvedValue(response(get(receipt())));global.fetch=send;});
  afterEach(()=>{global.fetch=original;keys.forEach((k,i)=>{if(saved[i]===undefined)delete process.env[k];else process.env[k]=saved[i];});});
  it('consulta el recibo estricto con IDs canonicos y token interno sin JWT/cookies',async()=>{
    expect(await new AuthIdentityCompensationClient().consultar(op.toUpperCase(),id.toUpperCase(),hash)).toEqual(receipt());
    expect(send.mock.calls[0][0]).toBe('http://auth.test/base/internal/rund/v1/personas/escritura/operaciones/'+op+'/compensacion');
    expect(send.mock.calls[0][1]).toMatchObject({method:'GET',redirect:'error',headers:{'x-internal-service-token':'interno',Accept:'application/json'}});
    expect(Object.keys(send.mock.calls[0][1].headers)).toHaveLength(2);expect(send.mock.calls[0][1].body).toBeUndefined();
  });
  it('POST contiene solo intencion y huella, con el mismo UUID de operacion',async()=>{
    send.mockResolvedValue(response({resolucion:receipt()}));expect(await new AuthIdentityCompensationClient().compensar(op,id,hash)).toEqual(receipt());
    expect(JSON.parse(send.mock.calls[0][1].body)).toEqual({intencionId:id,huellaComando:hash});
    expect(send.mock.calls[0][0]).toBe('http://auth.test/base/internal/rund/v1/personas/escritura/operaciones/'+op+'/compensar');
  });
  it.each(identityReviewReasons)('revision %s no se presenta como identidad revertida',async motivo=>{
    const review={...receipt(),estado:'REVISION_REQUERIDA',motivo,identidadRevertida:false};send.mockResolvedValue(response(get(review)));
    expect(await new AuthIdentityCompensationClient().consultar(op,id,hash)).toEqual(review);
  });
  it('solo encontrada=false y resolucion=null con consulta exacta acredita ausencia',async()=>{
    send.mockResolvedValue(response({consulta:{operacionId:op},encontrada:false,resolucion:null}));expect(await new AuthIdentityCompensationClient().consultar(op,id,hash)).toBeNull();
  });
  it.each([{}, {consulta:{operacionId:id},encontrada:false,resolucion:null}, {consulta:{operacionId:op},encontrada:false,resolucion:{}},
    {consulta:{operacionId:op},encontrada:true,resolucion:null},{consulta:{operacionId:op},encontrada:false},
    {consulta:{operacionId:op},encontrada:false,resolucion:null,preimagen:{}}, {consulta:{operacionId:op,otro:true},encontrada:false,resolucion:null}])('ausencia parcial/ajena %j no es segura',async data=>{
    send.mockResolvedValue(response(data));await expect(new AuthIdentityCompensationClient().consultar(op,id,hash)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it.each([
    {version:2},{operacionId:id},{intencionId:op},{huellaComando:'b'.repeat(64)},{estado:'APLICADA'},
    {identidadRevertida:false},{motivo:'CAMBIOS_POSTERIORES'},{resueltaEn:null},{resueltaEn:'2026-02-30T10:00:00.000Z'},
    {estado:'REVISION_REQUERIDA',motivo:null,identidadRevertida:false},
    {estado:'REVISION_REQUERIDA',motivo:['ALTA_IDENTIDAD'],identidadRevertida:false},
    {estado:'REVISION_REQUERIDA',motivo:'OTRO',identidadRevertida:false},{password_hash:'prohibido'},{preimagen:{}},
  ])('rechaza recibo incompatible %j',async change=>{
    send.mockResolvedValue(response(get({...receipt(),...change})));await expect(new AuthIdentityCompensationClient().consultar(op,id,hash)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it.each([404,401,403,500,503])('HTTP %s no fabrica ausencia y no reintenta',async status=>{
    send.mockResolvedValue(response({},status));await expect(new AuthIdentityCompensationClient().consultar(op,id,hash)).rejects.toBeInstanceOf(ServiceUnavailableException);expect(send).toHaveBeenCalledTimes(1);
  });
  it('409 POST conserva conflicto, sin convertirlo en compensacion o revision',async()=>{
    send.mockResolvedValue(response({},409));await expect(new AuthIdentityCompensationClient().compensar(op,id,hash)).rejects.toBeInstanceOf(ConflictException);
  });
  it('admite respuesta directa, pero no success=false o una envoltura incompleta',async()=>{
    send.mockResolvedValue({ok:true,status:200,json:async()=>get(receipt())});expect(await new AuthIdentityCompensationClient().consultar(op,id,hash)).toEqual(receipt());
    send.mockResolvedValue({ok:true,status:200,json:async()=>({success:false,data:get(receipt())})});await expect(new AuthIdentityCompensationClient().consultar(op,id,hash)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it.each(['file:///datos','http://user:pass@auth.test','http://auth.test/?token=x','http://auth.test/#x'])('URL %s no se usa',async url=>{
    process.env.AUTH_SERVICE_URL=url;await expect(new AuthIdentityCompensationClient().consultar(op,id,hash)).rejects.toBeInstanceOf(ServiceUnavailableException);expect(send).not.toHaveBeenCalled();
  });
  it('IDs, huella o token ausentes no envian HTTP; nunca usa JWT como credencial',async()=>{
    const client=new AuthIdentityCompensationClient();await expect(client.consultar('cedula',id,hash)).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(client.consultar(op,id,'otra')).rejects.toBeInstanceOf(ServiceUnavailableException);delete process.env.AUTH_INTERNAL_SERVICE_TOKEN;delete process.env.INTERNAL_SERVICE_TOKEN;
    await expect(client.consultar(op,id,hash)).rejects.toBeInstanceOf(ServiceUnavailableException);expect(send).not.toHaveBeenCalled();
  });
});
