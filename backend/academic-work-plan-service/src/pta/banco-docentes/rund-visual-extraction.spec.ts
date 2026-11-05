import { extractVisualTitles } from './rund-visual-extraction';
import * as ocr from './rund-ocr-client';
import * as http from './rund-local-http';

describe('Respaldo visual local de títulos académicos',()=>{
  const content=Buffer.from('%PDF-1.7 ficticio');
  const title={campo:'doctorado',valor:'Doctor en Ciencias Económicas',evidencia:'Doctor en Ciencias Económicas',confianza:0.95,legible:true};
  const response=(items:any[])=>({message:{content:JSON.stringify(items.length===1?{titulo:items[0].valor,evidencia:items[0].evidencia,confianza:items[0].confianza,legible:items[0].legible}:{titulo:'',evidencia:'',confianza:0,legible:false})}});
  beforeEach(()=>{
    jest.spyOn(ocr,'renderRundPdf').mockResolvedValue([{pagina:1,imagen:'full-image',detalle:'detail-image'}]);
    jest.spyOn(http,'postLocalJson').mockResolvedValue(response([title]));
  });
  afterEach(()=>{jest.restoreAllMocks();delete process.env.RUND_VISUAL_FALLBACK;});
  const run=(fields=['doctorado'],model='gemma4:e4b')=>extractVisualTitles(content,'http://ocr','http://model',model,fields);

  it('recupera un título de letra ornamental solo si coincide en ambas vistas independientes',async()=>{
    const result=await run();
    expect(result.estado).toBe('LECTURAS_VISUALES_COINCIDENTES');
    expect(result.candidates).toEqual([expect.objectContaining({campo:'doctorado',valor:title.valor,baja_confianza:true})]);
    const calls=jest.mocked(http.postLocalJson).mock.calls;
    expect(calls).toHaveLength(2);
    expect((calls[0][1] as any).messages[1].images).toEqual(['full-image']);
    expect((calls[1][1] as any).messages[1].images).toEqual(['detail-image']);
    expect(JSON.stringify(calls[1][1])).not.toContain(title.valor);
    expect(JSON.stringify(calls[1][1])).not.toContain('valor_previo');
  });
  it.each([
    [{...title,valor:'Doctor en Derecho',evidencia:'Doctor en Derecho'}],
    [{...title,legible:false}],
    [{...title,confianza:0.4}],
    [{...title,valor:'AENTACIONHDEIUAHTUNT',evidencia:'Título de: AENTACIONHDEIUAHTUNT'}],
    [{...title,valor:'Magíster en Ciencias Económicas',evidencia:'Magíster en Ciencias Económicas'}],
    [],
  ].map(items=>[items]))('se abstiene cuando el detalle no corrobora el dato: %j',async items=>{
    jest.mocked(http.postLocalJson).mockResolvedValueOnce(response([title])).mockResolvedValueOnce(response(items as any));
    expect((await run()).candidates).toEqual([]);
  });
  it('no escoge arbitrariamente entre dos títulos distintos del mismo campo',async()=>{
    jest.mocked(http.postLocalJson).mockResolvedValue(response([title,{...title,valor:'Doctor en Derecho',evidencia:'Doctor en Derecho'}]));
    expect((await run()).candidates).toEqual([]);
  });
  it('separa un área explícita del título sin inventar una equivalencia entre títulos diferentes',async()=>{
    const master={...title,campo:'maestria',valor:'Magíster en Ciencias Económicas',evidencia:'Magíster en Ciencias Económicas'};
    jest.mocked(http.postLocalJson).mockResolvedValueOnce(response([master])).mockResolvedValueOnce(response([{
      ...master,valor:master.valor+' Área de Profundización: Teoría y Política Económica',
      evidencia:master.valor+' Área de Profundización: Teoría y Política Económica',
    }]));
    expect((await run(['maestria'])).candidates).toEqual([expect.objectContaining({valor:master.valor,evidencia:master.valor,confianza:0.9})]);
  });
  it('no escoge un título cuando páginas distintas acreditan valores contradictorios',async()=>{
    jest.mocked(ocr.renderRundPdf).mockResolvedValue([{pagina:1,imagen:'a',detalle:'b'},{pagina:2,imagen:'c',detalle:'d'}]);
    const other={...title,valor:'Doctor en Derecho',evidencia:'Doctor en Derecho'};
    jest.mocked(http.postLocalJson).mockResolvedValueOnce(response([title])).mockResolvedValueOnce(response([title]))
      .mockResolvedValueOnce(response([other])).mockResolvedValueOnce(response([other]));
    expect((await run()).candidates).toEqual([]);
  });
  it('recupera un dato de la vista ampliada solo si otra ampliación independiente lo confirma',async()=>{
    jest.mocked(ocr.renderRundPdf).mockResolvedValue([{pagina:1,imagen:'full',detalle:'detail',enfoque:'focus'}]);
    jest.mocked(http.postLocalJson).mockResolvedValueOnce(response([])).mockResolvedValueOnce(response([title])).mockResolvedValueOnce(response([title]));
    expect((await run()).candidates).toEqual([expect.objectContaining({valor:title.valor})]);
    expect(http.postLocalJson).toHaveBeenCalledTimes(3);
  });
  it('no usa una tercera vista para ignorar lecturas válidas contradictorias',async()=>{
    jest.mocked(ocr.renderRundPdf).mockResolvedValue([{pagina:1,imagen:'full',detalle:'detail',enfoque:'focus'}]);
    jest.mocked(http.postLocalJson).mockResolvedValueOnce(response([title])).mockResolvedValueOnce(response([{...title,valor:'Doctor en Derecho',evidencia:'Doctor en Derecho'}]));
    expect((await run()).candidates).toEqual([]);
    expect(http.postLocalJson).toHaveBeenCalledTimes(2);
  });
  it('el respaldo averiado se informa sin convertirlo en sugerencias o cambios del perfil',async()=>{
    jest.mocked(ocr.renderRundPdf).mockRejectedValue(new Error('404'));
    expect(await run()).toEqual({candidates:[],estado:'LECTURA_VISUAL_NO_DISPONIBLE'});
    expect(http.postLocalJson).not.toHaveBeenCalled();
  });
  it('conserva el flujo de identidad, modelos sin respaldo habilitado y apagado explícito',async()=>{
    expect((await run(['nombreCompleto'])).estado).toBe('NO_APLICA');
    expect((await run(['doctorado'],'qwen3.5:4b')).estado).toBe('NO_APLICA');
    process.env.RUND_VISUAL_FALLBACK='false';
    expect((await run()).estado).toBe('NO_APLICA');
    expect(ocr.renderRundPdf).not.toHaveBeenCalled();
  });
});
