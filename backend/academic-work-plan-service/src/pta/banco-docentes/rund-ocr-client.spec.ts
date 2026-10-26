import { extractRundPdf, normalizeRundOcrResult, rundOcrProvider } from './rund-ocr-client';

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

  it('identifica el fallo de conexión sin propagar mensajes ni rutas del motor', async () => {
    process.env.RUND_OCR_PROVIDER = 'RUND';
    global.fetch = jest.fn().mockRejectedValue(new Error('Mensaje privado del servicio'));
    await expect(extractRundPdf(Buffer.from('%PDF-prueba'), 'http://localhost:8000')).rejects.toThrow('OCR_CONEXION_FALLIDA');
  });
});
