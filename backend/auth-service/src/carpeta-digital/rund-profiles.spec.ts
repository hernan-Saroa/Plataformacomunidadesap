import {randomUUID} from 'crypto';
import {RundCarpetaClient} from './rund-carpeta.client';
import {CarpetaDigitalService} from './carpeta-digital.service';

describe('Perfiles documentales de solo lectura',()=>{
 const person=randomUUID(),id=randomUUID(),saved={...process.env};let spy:jest.SpyInstance;
 const response=()=>({propietario:'rund',persona_id:person,complete:true,perfiles:[{id,persona_id:person,periodo_carga:'2026-2',estado:'ACTIVO'}]});
 beforeEach(()=>{process.env.RUND_CARPETA_ENABLED='true';process.env.RUND_CARPETA_INTERNAL_TOKEN='interno';spy=jest.spyOn(global,'fetch');});
 afterEach(()=>{spy.mockRestore();process.env={...saved};});
 it('consulta solamente el endpoint interno de perfiles, con sesión en cuerpo',async()=>{
  spy.mockResolvedValue(new Response(JSON.stringify({success:true,data:response()})));
  expect(await new RundCarpetaClient().profiles(person,'sesion')).toHaveLength(1);
  expect(spy.mock.calls[0][0]).toContain(`/personas/${person}/perfiles`);
  expect(JSON.parse(spy.mock.calls[0][1].body)).toEqual({userToken:'sesion'});
 });
 it.each([{complete:false},{persona_id:randomUUID()},{propietario:'pta'},{perfiles:null},{perfiles:[{id,persona_id:randomUUID()}]},{success:false}])('rechaza el catálogo incompleto o ajeno: %j',async changes=>{
  spy.mockResolvedValue(new Response(JSON.stringify({...response(),...changes})));
  await expect(new RundCarpetaClient().profiles(person)).rejects.toThrow('confirmar');expect(spy).toHaveBeenCalledTimes(1);
 });
 it('apagado no llama a RUND',async()=>{process.env.RUND_CARPETA_ENABLED='false';expect(await new RundCarpetaClient().profiles(person)).toEqual([]);expect(spy).not.toHaveBeenCalled();});
 it('un fallo del propietario no elige el histórico como sustituto',async()=>{
  const service=Object.create(CarpetaDigitalService.prototype) as any;
  const db={query:jest.fn().mockResolvedValue([{id,persona_id:person,periodo_carga:null,estado:'ACTIVO'}])};
  Object.assign(service,{ensureCarpetaForPersona:jest.fn().mockResolvedValue({personaId:person}),dataSource:db,
   rundCarpetaClient:{enabled:true,profiles:jest.fn().mockRejectedValue(new Error('RUND no disponible'))}});
  await expect(service.getRundProfiles(person)).rejects.toThrow('RUND no disponible');
  expect(db.query.mock.calls[0][0]).toContain('SELECT id');expect(db.query).toHaveBeenCalledTimes(1);
 });
});
