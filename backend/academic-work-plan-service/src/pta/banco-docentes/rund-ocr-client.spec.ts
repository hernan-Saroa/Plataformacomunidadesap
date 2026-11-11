import { extractRundPdf, normalizeRundOcrResult, rundOcrProvider, renderRundPdf } from './rund-ocr-client';

describe('Compatibilidad del OCR local y el OCR del grupo RUND', () => {
  const originalFetch = global.fetch;
  const originalProvider = process.env.RUND_OCR_PROVIDER;
  const originalToken = process.env.RUND_OCR_TOKEN;
  const native = { motor: 'PaddleOCR local', paginas: [{ pagina: 1, texto: 'Diploma ficticio', confianza: 0.95 }] };
  const rund = { success: true, pages_processed: 2, details: [
    { page: 1, text: 'Primera página', confidence: 0.96 },
    { page: 2, text: 'Segunda página', confidence: 0.7 },
  ] };

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalProvider === undefined) delete process.env.RUND_OCR_PROVIDER;
    else process.env.RUND_OCR_PROVIDER = originalProvider;
    if (originalToken === undefined) delete process.env.RUND_OCR_TOKEN;
    else process.env.RUND_OCR_TOKEN = originalToken;
  });

  it('conserva la autenticación y la ruta de la instalación LOCAL', async () => {
    delete process.env.RUND_OCR_PROVIDER;
    process.env.RUND_OCR_TOKEN = 'token-local-de-prueba-de-32-caracteres';
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify(native)));
    await expect(extractRundPdf(Buffer.from('%PDF-prueba'), 'http://localhost:8091')).resolves.toEqual(native);
    expect(global.fetch).toHaveBeenCalledWith('http://localhost:8091/extract', expect.objectContaining({
      headers: { Authorization: `Bearer ${process.env.RUND_OCR_TOKEN}` }, redirect: 'error',
    }));
  });

  it('renderiza vistas acotadas conservando autenticación y prohibiendo redirecciones',async()=>{
    process.env.RUND_OCR_PROVIDER='LOCAL';process.env.RUND_OCR_TOKEN='token-local-de-prueba-de-32-caracteres';
    const image='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j3ioAAAAASUVORK5CYII=';
    const result={total_paginas:1,paginas:[{pagina:1,imagen:image,detalle:image}]};
    global.fetch=jest.fn().mockResolvedValue(new Response(JSON.stringify(result)));
    expect(await renderRundPdf(Buffer.from('%PDF-prueba'),'http://localhost:8091')).toEqual(result.paginas);
    expect(global.fetch).toHaveBeenCalledWith('http://localhost:8091/render-pages',expect.objectContaining({redirect:'error',headers:{Authorization:`Bearer ${process.env.RUND_OCR_TOKEN}`}}));
  });
  it.each([
    {total_paginas:1,paginas:[{pagina:1,imagen:'https://public.example/image.png',detalle:'data:image/png;base64,AAAA'}]},
    {total_paginas:26,paginas:[]}, {total_paginas:1,paginas:[]},
  ])('rechaza vistas incompletas o enlaces remotos %j',async result=>{
    process.env.RUND_OCR_PROVIDER='RUND';
    global.fetch=jest.fn().mockResolvedValue(new Response(JSON.stringify(result)));
    await expect(renderRundPdf(Buffer.from('%PDF-prueba'),'http://localhost:8000')).rejects.toThrow('VISTAS_INVALIDAS');
  });
  it('valida también los recortes regionales y solo devuelve imágenes locales permitidas',async()=>{
    process.env.RUND_OCR_PROVIDER='RUND';
    const image='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j3ioAAAAASUVORK5CYII=';
    const view={imagen:image,detalle:image};
    const page={pagina:1,...view,zonas:[{...view,metadata:'ignorar'}]};
    global.fetch=jest.fn().mockResolvedValue(new Response(JSON.stringify({total_paginas:1,paginas:[page]})));
    expect(await renderRundPdf(Buffer.from('%PDF-prueba'),'http://localhost:8000')).toEqual([{pagina:1,...view,zonas:[view]}]);
    for(const zonas of [[],[view,view,view],[{...view,detalle:'https://externo.invalid/imagen.png'}]]){
      global.fetch=jest.fn().mockResolvedValue(new Response(JSON.stringify({total_paginas:1,paginas:[{...page,zonas}]})));
      await expect(renderRundPdf(Buffer.from('%PDF-prueba'),'http://localhost:8000')).rejects.toThrow('VISTAS_INVALIDAS');
    }
  });

  it('usa extract-text en RUND y conserva las páginas y la confianza sin enviar el token de otro motor', async () => {
    process.env.RUND_OCR_PROVIDER = 'RUND';
    process.env.RUND_OCR_TOKEN = 'no-enviar-este-token-a-otro-motor';
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify(rund)));
    await expect(extractRundPdf(Buffer.from('%PDF-prueba'), 'http://localhost:8000')).resolves.toEqual({
      motor: 'RUND / PaddleOCR', paginas: [
        { pagina: 1, texto: 'Primera página', confianza: 0.96 },
        { pagina: 2, texto: 'Segunda página', confianza: 0.7 },
      ],
    });
    expect(global.fetch).toHaveBeenCalledWith('http://localhost:8000/extract-text', expect.objectContaining({ headers: {} }));
  });

  it('rechaza proveedores desconocidos y exige token para LOCAL antes de enviar el PDF', async () => {
    expect(() => rundOcrProvider('otro')).toThrow('PROVEEDOR_OCR_INVALIDO');
    process.env.RUND_OCR_PROVIDER = 'LOCAL';
    delete process.env.RUND_OCR_TOKEN;
    global.fetch = jest.fn();
    await expect(extractRundPdf(Buffer.from('%PDF-prueba'), 'http://localhost:8091')).rejects.toThrow('TOKEN_OCR_REQUERIDO');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it.each([
    { ...rund, success: false }, { ...rund, pages_processed: 3 },
    { ...rund, details: [{ page: 2, text: 'Página incompleta' }] },
    { success: true, pages_processed: 0, details: [] },
    { success: true, pages_processed: 1, details: [{ page: 1, text: 'x'.repeat(50001) }] },
  ])('rechaza respuestas truncadas o incompatibles: %#', result => {
    expect(() => normalizeRundOcrResult(result, 'RUND')).toThrow('OCR_INVALIDO');
  });

  it('no atribuye confianza alta a un motor que devuelve confianza inválida', () => {
    expect(normalizeRundOcrResult({ paginas: [{ pagina: 1, texto: 'Prueba', confianza: 2 }] }, 'LOCAL').paginas[0].confianza).toBe(0);
  });
  it('conserva la confianza de cada línea y rechaza metadatos que no corresponden al texto leído', () => {
    const lineas=[{texto:'Título:',confianza:0.99},{texto:'Economista',confianza:0.4}];
    const page={pagina:1,texto:'Título:\nEconomista',confianza:0.99,lineas};
    expect(normalizeRundOcrResult({paginas:[page]},'LOCAL').paginas[0].lineas).toEqual(lineas);
    expect(normalizeRundOcrResult({success:true,pages_processed:1,details:[{page:1,text:page.texto,confidence:0.99,lineas}]},'RUND').paginas[0].lineas).toEqual(lineas);
    expect(()=>normalizeRundOcrResult({paginas:[{...page,lineas:[{texto:'Otro título',confianza:0.99}]}]},'LOCAL')).toThrow('OCR_INVALIDO');
    expect(()=>normalizeRundOcrResult({paginas:[{...page,lineas:[{texto:page.texto,confianza:NaN}]}]},'LOCAL')).toThrow('OCR_INVALIDO');
  });

  it('identifica el fallo de conexión sin propagar mensajes ni rutas del motor', async () => {
    process.env.RUND_OCR_PROVIDER = 'RUND';
    global.fetch = jest.fn().mockRejectedValue(new Error('Mensaje privado del servicio'));
    await expect(extractRundPdf(Buffer.from('%PDF-prueba'), 'http://localhost:8000')).rejects.toThrow('OCR_CONEXION_FALLIDA');
  });

  it.each([false, true])('identifica el plazo vencido antes de cabeceras o durante el cuerpo: %s', async bodyStarted => {
    process.env.RUND_OCR_PROVIDER = 'RUND';
    const controller = new AbortController();
    const timeout = jest.spyOn(AbortSignal, 'timeout').mockReturnValue(controller.signal);
    const fail = async () => { controller.abort(); throw new Error('detalle privado'); };
    global.fetch = jest.fn(bodyStarted ? async () => ({ ok: true, json: fail }) as any : fail);
    try {
      await expect(extractRundPdf(Buffer.from('%PDF-prueba'), 'http://localhost:8000')).rejects.toThrow('OCR_TIMEOUT');
    } finally { timeout.mockRestore(); }
  });
});
