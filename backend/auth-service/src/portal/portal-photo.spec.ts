import { HttpException } from '@nestjs/common';
import { PortalController } from './portal.controller';

describe('Compatibilidad de la carga de foto del portal',()=>{
  const controller=new PortalController({} as any,{} as any);
  const file={buffer:Buffer.from('synthetic'),originalname:'synthetic.png',mimetype:'image/png'};
  const req={headers:{cookie:'esap_access_token=synthetic-cookie',authorization:'Bearer synthetic-token'},body:{personaId:'ANOTHER_PERSON',estado:'APROBADA'}} as any;
  afterEach(()=>jest.restoreAllMocks());
  it('delega a la identidad autenticada y no reenvía persona ni estado del body',async()=>{
    const fetchMock=jest.spyOn(globalThis,'fetch').mockResolvedValue({ok:true,status:201,json:async()=>({solicitud:{estado:'PENDIENTE'}})} as any);
    expect(await controller.uploadFotoPerfil(req,file)).toMatchObject({success:true,data:{solicitud:{estado:'PENDIENTE'}}});
    const [url,options]=fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/pta\/fotos-perfil\/mia$/);
    const body=options?.body as FormData;
    expect(body.has('personaId')).toBe(false);expect(body.has('estado')).toBe(false);
    expect(options?.headers).toMatchObject({cookie:req.headers.cookie,authorization:req.headers.authorization});
  });
  it.each([401,403,400,413])('conserva el rechazo HTTP %s del flujo central',async status=>{
    jest.spyOn(globalThis,'fetch').mockResolvedValue({ok:false,status,json:async()=>({message:'Rechazado'})} as any);
    try { await controller.uploadFotoPerfil(req,file); throw new Error('Expected HTTP rejection'); }
    catch(error) { expect(error).toBeInstanceOf(HttpException);expect((error as HttpException).getStatus()).toBe(status); }
  });
  it('un fallo de conexión produce 503 y nunca confirma una carga inexistente',async()=>{
    jest.spyOn(globalThis,'fetch').mockRejectedValue(new Error('offline'));
    await expect(controller.uploadFotoPerfil(req,file)).rejects.toMatchObject({status:503});
  });
  it('una respuesta no JSON produce 503 con una indicación para consultar el estado',async()=>{
    jest.spyOn(globalThis,'fetch').mockResolvedValue({ok:false,status:502,json:async()=>{throw new SyntaxError('HTML gateway response');}} as any);
    await expect(controller.uploadFotoPerfil(req,file)).rejects.toMatchObject({status:503,message:expect.stringContaining('Consulte su solicitud')});
  });
});
