/**
 * Previsualización de documentos de Office DENTRO del navegador.
 *
 * Antes se delegaba en el visor embebido de Microsoft
 * (view.officeapps.live.com), que descarga el archivo desde SUS servidores: en
 * un despliegue interno (por IP, sin salida pública o sin HTTPS) nunca puede
 * alcanzar el adjunto y el usuario solo veía un error o la descarga. Aquí el
 * archivo se descarga con la sesión del propio usuario y se convierte en el
 * cliente, así que funciona igual en local, en la IP interna y en producción,
 * y el documento nunca sale hacia un tercero.
 *
 * Alcance real de cada formato:
 *   .docx        → mammoth (HTML)
 *   .xlsx / .xls → SheetJS, que sí lee el binario antiguo de Excel
 *   .doc         → NO hay conversor cliente para el binario de Word 97-2003.
 *                  Se reporta como no soportado para que la vista ofrezca la
 *                  descarga en vez de fingir una previsualización.
 */

export type TipoPreviewOffice = 'docx' | 'xlsx' | 'no_soportado';

export interface ContenidoPreviewOffice {
  tipo: 'docx' | 'xlsx';
  html: string;
}

/** Extensión normalizada de un nombre de archivo o de un tipo declarado. */
function extensionDe(nombreOTipo: string): string {
  const valor = String(nombreOTipo || '').trim().toLowerCase();
  if (!valor) return '';
  if (valor.includes('.')) return valor.split('.').pop() || '';
  return valor.replace(/^\./, '');
}

/** ¿Este archivo se puede convertir en el navegador? */
export function tipoPreviewOffice(nombreOTipo: string): TipoPreviewOffice {
  const ext = extensionDe(nombreOTipo);
  if (ext === 'docx') return 'docx';
  if (ext === 'xlsx' || ext === 'xls') return 'xlsx';
  return 'no_soportado';
}

/** Formatos de Office que esta utilidad sabe renderizar. */
export function puedePrevisualizarOffice(nombreOTipo: string): boolean {
  return tipoPreviewOffice(nombreOTipo) !== 'no_soportado';
}

/**
 * Descarga el adjunto con la sesión del usuario. `credentials: 'include'`
 * porque los adjuntos del PTA se sirven tras el gateway autenticado; sin él la
 * petición vuelve 401 y la previsualización fallaría solo para algunos roles.
 */
async function descargarArrayBuffer(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    throw new Error(res.status === 401
      ? 'No autorizado para leer este documento.'
      : `No se pudo descargar el documento (error ${res.status}).`);
  }
  return res.arrayBuffer();
}

/**
 * Convierte el documento a HTML listo para inyectar. Las librerías se importan
 * de forma diferida para no cargarlas en el bundle inicial del módulo (solo
 * pesan cuando alguien abre un adjunto de Office).
 */
export async function cargarPreviewOffice(url: string, nombreOTipo: string): Promise<ContenidoPreviewOffice> {
  const tipo = tipoPreviewOffice(nombreOTipo);

  if (tipo === 'docx') {
    const [{ default: mammothDefault, ...mammothNamed }, buffer] = await Promise.all([
      import('mammoth') as any,
      descargarArrayBuffer(url),
    ]);
    const mammoth = mammothDefault || mammothNamed;
    const resultado = await mammoth.convertToHtml({ arrayBuffer: buffer });
    return { tipo, html: resultado.value || '<p>(documento vacío)</p>' };
  }

  if (tipo === 'xlsx') {
    const [XLSX, buffer] = await Promise.all([
      import('xlsx') as any,
      descargarArrayBuffer(url),
    ]);
    const workbook = XLSX.read(buffer, { type: 'array' });
    const hojas: string[] = workbook.SheetNames || [];
    if (hojas.length === 0) return { tipo, html: '<p>Hoja de cálculo vacía</p>' };
    // Se muestran todas las hojas, cada una con su nombre: quedarse con la
    // primera escondía información sin avisar.
    const html = hojas
      .map(nombre => {
        const tabla = XLSX.utils.sheet_to_html(workbook.Sheets[nombre]);
        return hojas.length > 1
          ? `<h3 class="pta-office-hoja">${nombre}</h3>${tabla}`
          : tabla;
      })
      .join('');
    return { tipo, html };
  }

  throw new Error('PREVIEW_NO_SOPORTADO');
}

/** Estilos mínimos para que el HTML convertido se lea como documento. */
export const ESTILOS_PREVIEW_OFFICE = `
  .pta-office-preview { color: #111827; font-size: 14px; line-height: 1.6; }
  .pta-office-preview p { margin-bottom: 0.7em; }
  .pta-office-preview h1 { font-size: 1.6em; margin: 0.8em 0 0.4em; font-weight: 700; }
  .pta-office-preview h2 { font-size: 1.3em; margin: 0.7em 0 0.35em; font-weight: 600; }
  .pta-office-preview h3 { font-size: 1.1em; margin: 0.6em 0 0.3em; font-weight: 600; }
  .pta-office-preview ul, .pta-office-preview ol { margin-left: 1.5em; margin-bottom: 0.7em; }
  .pta-office-preview table { border-collapse: collapse; width: 100%; margin: 0.8em 0; font-size: 12px; }
  .pta-office-preview td, .pta-office-preview th { border: 1px solid #E5E7EB; padding: 6px 10px; text-align: left; }
  .pta-office-preview th { background: #F3F4F6; font-weight: 600; }
  .pta-office-preview tr:nth-child(even) { background: #FAFAFA; }
  .pta-office-preview img { max-width: 100%; height: auto; display: block; margin: 0.5em 0; }
  .pta-office-preview strong, .pta-office-preview b { font-weight: 700; }
  .pta-office-preview em, .pta-office-preview i { font-style: italic; }
  .pta-office-preview .pta-office-hoja { margin-top: 1.2em; color: #003DA5; }
`;
