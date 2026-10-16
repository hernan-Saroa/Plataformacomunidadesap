/**
 * Visor de documentos con OnlyOffice (EFDS-1080).
 *
 * La plataforma ya tiene desplegado OnlyOffice Document Server (lo usa Control
 * Interno Disciplinario), y previsualiza cualquier formato de ofimática, así que
 * se usa aquí en lugar de convertir los archivos en el navegador.
 */

import { getServiceUrl, API_MODE, getDefaultHeaders, ONLYOFFICE_URL } from '../../../../config/environment';

const BASE_URL = getServiceUrl('control-institucional');
const API_BASE_URL = API_MODE === 'gateway'
  ? `${BASE_URL}/control-institucional/api/v1`
  : BASE_URL;

// 'vista-previa': documentos generados en pantalla que aún no se guardan (EFDS-2320)
export type OrigenArchivo = 'evidencias' | 'documentos' | 'vista-previa';

/** Formatos que OnlyOffice abre; las imágenes se muestran sin él. */
export function onlyOfficePuedeAbrir(nombreArchivo: string): boolean {
  const ext = (nombreArchivo.split('.').pop() || '').toLowerCase();
  return [
    'doc', 'docx', 'docm', 'dot', 'dotx', 'odt', 'rtf', 'txt',
    'xls', 'xlsx', 'xlsm', 'csv', 'ods',
    'ppt', 'pptx', 'odp',
    'pdf',
  ].includes(ext);
}

/** Pide al backend la configuración del visor para ese archivo. */
export async function obtenerConfigOnlyOffice(origen: OrigenArchivo, id: string): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/${origen}/${id}/onlyoffice-config`, {
    credentials: 'include',
    headers: getDefaultHeaders(),
  });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new Error('No tiene permisos para ver este archivo');
    if (res.status === 400 || res.status === 404) throw new Error('El archivo ya no está disponible en el servidor');
    throw new Error(`No se pudo abrir la vista previa (error ${res.status})`);
  }
  const datos = await res.json();
  return datos?.data || datos;
}

/**
 * Sube un documento generado en el navegador (Plan Anual en PDF, Programa Anual
 * en Excel) para verlo en OnlyOffice antes de descargarlo o firmarlo (EFDS-2320).
 * Devuelve el id que se le pasa a `VisorOnlyOffice` con origen 'vista-previa'.
 */
export async function subirVistaPrevia(archivo: Blob, nombreArchivo: string): Promise<string> {
  const formulario = new FormData();
  formulario.append('file', archivo, nombreArchivo);
  // Sin Content-Type: el navegador pone el del formulario con su separador
  const { 'Content-Type': _tipo, ...cabeceras } = getDefaultHeaders() as Record<string, string>;
  const res = await fetch(`${API_BASE_URL}/vista-previa`, {
    method: 'POST',
    credentials: 'include',
    headers: cabeceras,
    body: formulario,
  });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new Error('No tiene permisos para ver este documento');
    throw new Error(`No se pudo preparar la vista previa (error ${res.status})`);
  }
  const datos = await res.json();
  const id = (datos?.data || datos)?.id;
  if (!id) throw new Error('No se pudo preparar la vista previa');
  return id;
}

let promesaScript: Promise<void> | null = null;

/** Carga una sola vez el api.js de OnlyOffice. */
export function cargarApiOnlyOffice(): Promise<void> {
  if ((window as any).DocsAPI) return Promise.resolve();
  if (promesaScript) return promesaScript;

  promesaScript = new Promise<void>((resolver, rechazar) => {
    const script = document.createElement('script');
    script.src = `${ONLYOFFICE_URL}/web-apps/apps/api/documents/api.js`;
    script.async = true;
    const tiempoLimite = setTimeout(() => {
      promesaScript = null;
      rechazar(new Error('El visor de documentos no respondió'));
    }, 20000);
    script.onload = () => {
      clearTimeout(tiempoLimite);
      resolver();
    };
    script.onerror = () => {
      clearTimeout(tiempoLimite);
      promesaScript = null;
      rechazar(new Error('No se pudo cargar el visor de documentos'));
    };
    document.body.appendChild(script);
  });

  return promesaScript;
}
