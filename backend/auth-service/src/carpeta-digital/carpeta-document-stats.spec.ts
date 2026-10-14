import { randomUUID } from 'crypto';
import { RundCarpetaClient } from './rund-carpeta.client';
import { CarpetaDigitalService } from './carpeta-digital.service';

describe('Contadores del propietario RUND', () => {
  const saved = { ...process.env };
  const person = randomUUID(), zero = (persona_id = person) => ({ persona_id,total_documentos:0,documentos_completos:0,
    documentos_pendientes:0,documentos_rechazados:0,documentos_vencidos:0 });
  let fetchMock: jest.SpyInstance;
  beforeEach(() => { process.env.RUND_CARPETA_ENABLED='true'; process.env.RUND_CARPETA_INTERNAL_TOKEN='interno-ficticio';
    fetchMock=jest.spyOn(global,'fetch').mockResolvedValue(new Response(JSON.stringify({success:true,data:{propietario:'rund',complete:true,personas:[zero()]}}))); });
  afterEach(() => {fetchMock.mockRestore();process.env={...saved};});
  it('acepta un vacío completo explícito y envía la sesión solo en el cuerpo', async () => {
    expect((await new RundCarpetaClient().stats([person],'sesion-ficticia')).get(person)).toEqual(zero());
    const [url,options]=fetchMock.mock.calls[0]; expect(url).not.toContain('sesion-ficticia');
    expect(JSON.parse(options.body)).toEqual({personaIds:[person],userToken:'sesion-ficticia'});
    expect(options.headers.Authorization).toBeUndefined(); expect(options.redirect).toBe('error');
  });
  it.each([
    {complete:false}, {propietario:'pta'}, {personas:[]}, {personas:[zero(randomUUID())]},
    {personas:[{...zero(),total_documentos:1}]}, {personas:[{...zero(),documentos_pendientes:-1}]},
    {personas:[{...zero(),total_documentos:'0'}]}, {personas:[zero(),zero()]}, {success:false},
  ])('rechaza un subtotal o contrato inválido: %j', async changes => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({propietario:'rund',complete:true,personas:[zero()],...changes})));
    // Un success:false tampoco constituye una confirmación, incluso fuera del sobre.
    await expect(new RundCarpetaClient().stats([person])).rejects.toThrow();
  });
  it('un segundo lote fallido no devuelve el primer lote como éxito', async () => {
    const persons=Array.from({length:201},()=>randomUUID());
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({propietario:'rund',complete:true,personas:persons.slice(0,200).map(zero)})))
      .mockResolvedValueOnce(new Response('{}',{status:503}));
    await expect(new RundCarpetaClient().stats(persons)).rejects.toThrow(); expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it('apagado no consulta RUND; resolver identidad de una subida tampoco consulta otros propietarios', async () => {
    process.env.RUND_CARPETA_ENABLED='false'; expect((await new RundCarpetaClient().stats([person])).size).toBe(0); expect(fetchMock).not.toHaveBeenCalled();
    const service=Object.create(CarpetaDigitalService.prototype) as any;
    Object.assign(service,{ensureCarpetaForPersona:jest.fn().mockResolvedValue({id:'folder',personaId:person}),
      carpetaRepo:{findOne:jest.fn().mockResolvedValue(null)},documentoRepo:{find:jest.fn().mockResolvedValue([])},
      rundCarpetaClient:{enabled:true,stats:jest.fn()}});
    expect(await service.getCarpetaByPersona(person)).toMatchObject({total_documentos:0,alcance_conteo:'auth'});
    expect(service.rundCarpetaClient.stats).not.toHaveBeenCalled();
  });
});
