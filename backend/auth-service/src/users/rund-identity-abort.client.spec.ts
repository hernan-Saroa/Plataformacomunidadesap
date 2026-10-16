import { ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { RundIdentityAbortClient } from './rund-identity-abort.client';

describe('Auth verifica el aborto consultando al propietario RUND',()=>{
  const id='abcdef00-1111-4111-8111-111111111111',op='abcdef00-2222-4222-8222-222222222222',hash='a'.repeat(64);
  const proof=()=>({version:1,intencionId:id,operacionAuthId:op,huellaComando:hash,huellaContexto:'b'.repeat(64),
    decisionNativa:'ABORTADA',estadoNativo:'PREPARADA',abortadaEn:'2026-10-15T10:01:00.000Z',motivoAborto:'FALLO_NEGOCIO'});
  const response=(body:any,status=200)=>({ok:status>=200&&status<300,status,json:async()=>body});
  let original:typeof fetch,send:jest.Mock,config:Record<string,string>;
  beforeEach(()=>{original=global.fetch;send=jest.fn(async()=>response({pruebaAborto:proof()}));global.fetch=send;
    config={INTERNAL_SERVICE_TOKEN:' interno ',RUND_SERVICE_URL:'http://rund.test/base/'};});
  afterEach(()=>{global.fetch=original;});
  const client=()=>new RundIdentityAbortClient({get:(key:string)=>config[key]} as any);
  it('solo envia token de servicio, sin JWT/cookies o prueba del solicitante; impide redirects',async()=>{
    expect(await client().consultar(id.toUpperCase(),op.toUpperCase(),hash)).toEqual(proof());
    expect(send.mock.calls[0][0]).toBe('http://rund.test/base/internal/rund/v1/identidad/intenciones/'+id+'/aborto');
    expect(send.mock.calls[0][1]).toMatchObject({method:'GET',redirect:'error',headers:{'x-internal-service-token':'interno',Accept:'application/json'}});
    expect(Object.keys(send.mock.calls[0][1].headers)).toHaveLength(2);expect(send.mock.calls[0][1].body).toBeUndefined();
  });
  it('admite la envoltura success/data del servicio sin cambiar la prueba',async()=>{
    send.mockResolvedValue(response({success:true,data:{pruebaAborto:proof()}}));expect(await client().consultar(id,op,hash)).toEqual(proof());
  });
  it.each([404,401,403,500,503])('HTTP %s no significa aborto o ausencia seguros',async status=>{
    send.mockResolvedValue(response({},status));await expect(client().consultar(id,op,hash)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it('propaga conflicto si RUND tiene una ejecucion abierta o confirmada',async()=>{
    send.mockResolvedValue(response({},409));await expect(client().consultar(id,op,hash)).rejects.toBeInstanceOf(ConflictException);
  });
  it.each([
    {},{success:false,data:{pruebaAborto:proof()}},{pruebaAborto:null},{pruebaAborto:{...proof(),version:2}},
    {pruebaAborto:{...proof(),intencionId:op}},{pruebaAborto:{...proof(),operacionAuthId:id}},
    {pruebaAborto:{...proof(),huellaComando:'c'.repeat(64)}},{pruebaAborto:{...proof(),huellaContexto:'x'}},
    {pruebaAborto:{...proof(),decisionNativa:'EN_CURSO'}},{pruebaAborto:{...proof(),estadoNativo:'CONFIRMADA'}},
    {pruebaAborto:{...proof(),abortadaEn:null}},{pruebaAborto:{...proof(),abortadaEn:'fecha'}},
    {pruebaAborto:{...proof(),motivoAborto:'TEXTO LIBRE'}},{pruebaAborto:{...proof(),motivoAborto:['FALLO_NEGOCIO']}},{pruebaAborto:{...proof(),comandoAuth:{}}},
  ])('rechaza prueba incompatible %j',async body=>{
    send.mockResolvedValue(response(body));await expect(client().consultar(id,op,hash)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it.each(['file:///datos','http://usuario:clave@rund.test','http://rund.test/?token=x','http://rund.test/#x',''])('rechaza URL %s antes de HTTP',async url=>{
    config.RUND_SERVICE_URL=url;await expect(client().consultar(id,op,hash)).rejects.toBeInstanceOf(ServiceUnavailableException);expect(send).not.toHaveBeenCalled();
  });
  it('sin token o con ID/huella invalidos no consulta; una caida no se reintenta',async()=>{
    config.INTERNAL_SERVICE_TOKEN='';await expect(client().consultar(id,op,hash)).rejects.toBeInstanceOf(ServiceUnavailableException);
    config.INTERNAL_SERVICE_TOKEN='interno';await expect(client().consultar('cedula',op,hash)).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(client().consultar(id,op,'otra')).rejects.toBeInstanceOf(ServiceUnavailableException);expect(send).not.toHaveBeenCalled();
    send.mockRejectedValue(new Error('timeout'));await expect(client().consultar(id,op,hash)).rejects.toBeInstanceOf(ServiceUnavailableException);expect(send).toHaveBeenCalledTimes(1);
  });
});
