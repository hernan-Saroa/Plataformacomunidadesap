export type RundOcrProvider = 'LOCAL' | 'RUND';
export type RundOcrPage = { pagina: number; texto: string; confianza: number; lineas?: { texto: string; confianza: number }[] };

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
    ? result.details.map((page: any) => ({ pagina: page?.page, texto: page?.text, confianza: page?.confidence, ...(page?.lineas !== undefined ? { lineas: page.lineas } : {}) }))
    : result?.paginas;
  if (!Array.isArray(pages) || !pages.length || pages.length > 25
    || pages.some((page, index) => !page || page.pagina !== index + 1 || typeof page.texto !== 'string')
    || pages.reduce((sum, page) => sum + page.texto.length, 0) > 50000) throw new Error('OCR_INVALIDO');
  for (const page of pages) {
    if (page.lineas !== undefined && (!Array.isArray(page.lineas) || page.lineas.length > 50000
      || page.lineas.some((line: any) => typeof line?.texto !== 'string' || !line.texto.trim()
        || typeof line.confianza !== 'number' || !Number.isFinite(line.confianza) || line.confianza < 0 || line.confianza > 1)
      || page.lineas.map((line: any) => line.texto).join('\n') !== page.texto)) throw new Error('OCR_INVALIDO');
  }
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
  const signal = AbortSignal.timeout(180000);
  try {
    response = await fetch(`${baseUrl}${provider === 'RUND' ? '/extract-text' : '/extract'}`, {
      method: 'POST', headers, body: form, signal, redirect: 'error',
    });
  } catch {
    if (signal.aborted) throw new Error('OCR_TIMEOUT');
    throw new Error('OCR_CONEXION_FALLIDA');
  }
  if (!response.ok) throw new Error('OCR_NO_DISPONIBLE');
  let result: unknown;
  try { result = await response.json(); }
  catch { throw new Error(signal.aborted ? 'OCR_TIMEOUT' : 'OCR_INVALIDO'); }
  return normalizeRundOcrResult(result, provider);
}

export type RundVisualView = { imagen: string; detalle: string; enfoque?:string };
export type RundVisualPage = RundVisualView & { pagina: number; zonas?:RundVisualView[] };

/** Bounded image transport, compatible with both local OCR adapters. */
export async function renderRundPdf(content: Buffer, baseUrl: string): Promise<RundVisualPage[]> {
  const headers: Record<string,string> = {};
  if (rundOcrProvider() === 'LOCAL') {
    const token=process.env.RUND_OCR_TOKEN;
    if (!token || token.length<32) throw new Error('TOKEN_OCR_REQUERIDO');
    headers.Authorization=`Bearer ${token}`;
  }
  const form=new FormData();
  form.append('file',new Blob([new Uint8Array(content)],{type:'application/pdf'}),'documento.pdf');
  const response=await fetch(`${baseUrl}/render-pages`,{method:'POST',headers,body:form,signal:AbortSignal.timeout(60000),redirect:'error'});
  if (!response.ok || !response.body) throw new Error('VISTAS_NO_DISPONIBLES');
  const reader=response.body.getReader(),chunks:Uint8Array[]=[];
  let size=0;
  try {
    for (;;) {
      const {done,value}=await reader.read();if(done)break;
      size+=value.length;
      if(size>90*1024*1024) { await reader.cancel();throw new Error('VISTAS_INVALIDAS'); }
      chunks.push(value);
    }
  }finally{reader.releaseLock();}
  const result=JSON.parse(Buffer.concat(chunks).toString('utf8'));
  const validImage=(value:unknown)=>{
    if(typeof value!=='string'||value.length>7*1024*1024||!/^iVBORw0KGgo[A-Za-z0-9+/]*={0,2}$/.test(value))return false;
    const image=Buffer.from(value,'base64');
    return image.length>=24&&image.toString('base64')===value&&image.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'))
      && image.readUInt32BE(16)>0&&image.readUInt32BE(16)<=1800&&image.readUInt32BE(20)>0&&image.readUInt32BE(20)<=1800;
  };
  const validView=(view:any)=>validImage(view?.imagen)&&validImage(view?.detalle)&&(view.enfoque===undefined||validImage(view.enfoque));
  if(!Number.isInteger(result.total_paginas)||result.total_paginas<1||result.total_paginas>25||!Array.isArray(result.paginas)
    || result.paginas.length!==Math.min(result.total_paginas,3)
    || result.paginas.some((page:any,index:number)=>page?.pagina!==index+1||!validView(page)||(page.zonas!==undefined&&(!Array.isArray(page.zonas)
      ||page.zonas.length<1||page.zonas.length>2||page.zonas.some((view:any)=>!validView(view))))))throw new Error('VISTAS_INVALIDAS');
  return result.paginas.map(({pagina,imagen,detalle,enfoque,zonas}:RundVisualPage)=>({pagina,imagen,detalle,...(enfoque?{enfoque}:{}),
    ...(zonas?{zonas:zonas.map(({imagen,detalle})=>({imagen,detalle}))}:{})}));
}
