/**
 * Evidencias de un hallazgo: vista previa y descarga (EFDS-1089).
 *
 * El backend guarda `rutaArchivo` como ruta del disco del servidor
 * (uploads/evidencias/hallazgos/...), así que el navegador no la puede abrir:
 * el archivo se pide por los endpoints /evidencias/:id/preview y
 * /evidencias/:id/download.
 *
 * El endpoint de preview solo entrega imágenes y PDF, por eso Word y Excel se
 * bajan y se convierten en el navegador, igual que el visor del Plan Anual.
 */

import { getServiceUrl, API_MODE, getDefaultHeaders } from '../../../../config/environment';

const BASE_URL = getServiceUrl('control-institucional');
const API_BASE_URL = API_MODE === 'gateway'
  ? `${BASE_URL}/control-institucional/api/v1`
  : BASE_URL;

export type TipoPreviewEvidencia = 'pdf' | 'imagen' | 'docx' | 'xlsx' | 'otro';

export interface EvidenciaHallazgo {
  id?: string;
  nombre?: string;
  nombreArchivoOriginal?: string;
  tipoMime?: string;
  tipo?: string;
  rutaArchivo?: string;
  url?: string;
}

export interface ContenidoPreviewEvidenciaHallazgo {
  tipo: TipoPreviewEvidencia;
  blobUrl?: string;
  docxHtml?: string;
  xlsxHtml?: string;
}

export function nombreEvidenciaHallazgo(ev: EvidenciaHallazgo): string {
  return ev?.nombre || ev?.nombreArchivoOriginal || 'evidencia';
}

export function tipoPreviewEvidenciaHallazgo(ev: EvidenciaHallazgo): TipoPreviewEvidencia {
  const nombre = nombreEvidenciaHallazgo(ev);
  const mime = (ev?.tipoMime || ev?.tipo || '').toLowerCase();
  const ext = (nombre.split('.').pop() || '').toLowerCase();

  if (ext === 'pdf' || mime.includes('pdf')) return 'pdf';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext) || mime.startsWith('image/')) return 'imagen';
  if (ext === 'docx' || mime.includes('wordprocessingml')) return 'docx';
  if (ext === 'xlsx' || ext === 'xls' || mime.includes('spreadsheetml') || mime.includes('ms-excel')) return 'xlsx';
  return 'otro';
}

/** URL del endpoint que sirve el archivo. Sin id no hay forma de pedirlo. */
export function urlEvidenciaHallazgo(
  ev: EvidenciaHallazgo,
  accion: 'preview' | 'download' = 'download',
): string | null {
  if (ev?.id) return `${API_BASE_URL}/evidencias/${ev.id}/${accion}`;

  const url = (ev?.url || '').trim();
  if (!url) return null;
  if (url.startsWith('blob:')) return url;
  if (/^https?:\/\//i.test(url)) return url.replace(/\/(preview|download)$/, `/${accion}`);
  if (url.startsWith('/services/')) {
    const origen = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origen}${url}`.replace(/\/(preview|download)$/, `/${accion}`);
  }
  return null;
}

async function descargarBinario(ev: EvidenciaHallazgo): Promise<Blob> {
  const url = urlEvidenciaHallazgo(ev, 'download');
  if (!url) throw new Error('La evidencia no tiene archivo disponible en el servidor');

  const res = await fetch(url, { credentials: 'include', headers: getDefaultHeaders() });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new Error('No tiene permisos para ver esta evidencia');
    if (res.status === 400 || res.status === 404) throw new Error('El archivo ya no está disponible en el servidor');
    throw new Error(`No se pudo obtener el archivo (error ${res.status})`);
  }
  return res.blob();
}

/** Carga el contenido para el visor: PDF/imagen por preview, Word/Excel convertidos. */
export async function cargarPreviewEvidenciaHallazgo(
  ev: EvidenciaHallazgo,
): Promise<ContenidoPreviewEvidenciaHallazgo> {
  const tipo = tipoPreviewEvidenciaHallazgo(ev);

  if (tipo === 'docx') {
    const mammoth = await import('mammoth');
    const buffer = await (await descargarBinario(ev)).arrayBuffer();
    const resultado = await mammoth.convertToHtml({ arrayBuffer: buffer });
    return { tipo, docxHtml: resultado.value || '<p>(documento vacío)</p>' };
  }

  if (tipo === 'xlsx') {
    const XLSX = await import('xlsx');
    const buffer = await (await descargarBinario(ev)).arrayBuffer();
    const libro = XLSX.read(buffer, { type: 'array' });
    const hoja = libro.SheetNames[0];
    if (!hoja) return { tipo, xlsxHtml: '<p>Hoja de cálculo vacía</p>' };
    return { tipo, xlsxHtml: XLSX.utils.sheet_to_html(libro.Sheets[hoja]) };
  }

  if (tipo === 'otro') {
    throw new Error('PREVIEW_NO_SOPORTADO');
  }

  const url = urlEvidenciaHallazgo(ev, 'preview');
  if (!url) throw new Error('La evidencia no tiene archivo disponible en el servidor');

  const res = await fetch(url, { credentials: 'include', headers: getDefaultHeaders() });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new Error('No tiene permisos para ver esta evidencia');
    if (res.status === 400 || res.status === 404) throw new Error('El archivo ya no está disponible en el servidor');
    throw new Error(`No se pudo abrir la vista previa (error ${res.status})`);
  }
  return { tipo, blobUrl: URL.createObjectURL(await res.blob()) };
}

/** Descarga la evidencia con la sesión del usuario y el nombre original. */
export async function descargarEvidenciaHallazgo(ev: EvidenciaHallazgo): Promise<void> {
  const nombre = nombreEvidenciaHallazgo(ev);
  const blob = await descargarBinario(ev);
  const blobUrl = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = blobUrl;
  enlace.download = nombre;
  enlace.rel = 'noopener noreferrer';
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
}
