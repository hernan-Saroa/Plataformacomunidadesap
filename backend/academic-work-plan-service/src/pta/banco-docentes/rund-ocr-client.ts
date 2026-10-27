export type RundOcrProvider = 'LOCAL' | 'RUND';
export type RundOcrPage = { pagina: number; texto: string; confianza: number };

export function rundOcrProvider(value = process.env.RUND_OCR_PROVIDER || 'LOCAL'): RundOcrProvider {
  const provider = value.trim().toUpperCase();
  if (provider !== 'LOCAL' && provider !== 'RUND') throw new Error('PROVEEDOR_OCR_INVALIDO');
  return provider;
}

/** Ambos motores conservan el número de página y la confianza del OCR original. */
export function normalizeRundOcrResult(result: any, provider: RundOcrProvider): { motor: string; paginas: RundOcrPage[] } {
  if (provider === 'RUND' && (result?.success !== true || !Array.isArray(result.details)
    || result.pages_processed !== result.details.length)) throw new Error('OCR_INVALIDO');
  const pages = provider === 'RUND'
    ? result.details.map((page: any) => ({ pagina: page?.page, texto: page?.text, confianza: page?.confidence }))
    : result?.paginas;
  if (!Array.isArray(pages) || !pages.length || pages.length > 25
    || pages.some((page, index) => !page || page.pagina !== index + 1 || typeof page.texto !== 'string')
    || pages.reduce((sum, page) => sum + page.texto.length, 0) > 50000) throw new Error('OCR_INVALIDO');
  return {
    motor: provider === 'RUND' ? 'RUND / PaddleOCR' : String(result.motor || 'PaddleOCR'),
    paginas: pages.map(page => ({ ...page, confianza: typeof page.confianza === 'number'
      && Number.isFinite(page.confianza) && page.confianza >= 0 && page.confianza <= 1 ? page.confianza : 0 })),
  };
}

/** El destino debe pasar localExtractionUrl antes de invocar este cliente. */
export async function extractRundPdf(content: Buffer, baseUrl: string) {
  const provider = rundOcrProvider();
  const headers: Record<string, string> = {};
  if (provider === 'LOCAL') {
    const token = process.env.RUND_OCR_TOKEN;
    if (!token || token.length < 32) throw new Error('TOKEN_OCR_REQUERIDO');
    headers.Authorization = `Bearer ${token}`;
  }
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(content)], { type: 'application/pdf' }), 'documento.pdf');
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${provider === 'RUND' ? '/extract-text' : '/extract'}`, {
      method: 'POST', headers, body: form, signal: AbortSignal.timeout(180000), redirect: 'error',
    });
  } catch {
    throw new Error('OCR_CONEXION_FALLIDA');
  }
  if (!response.ok) throw new Error('OCR_NO_DISPONIBLE');
  let result: unknown;
  try { result = await response.json(); }
  catch { throw new Error('OCR_INVALIDO'); }
  return normalizeRundOcrResult(result, provider);
}
