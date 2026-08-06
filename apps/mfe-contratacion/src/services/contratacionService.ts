import { getApiGatewayBaseUrl } from '../../config/environment';
import {
  CamposFaltantesError,
  ConflictoError,
  EstudioPrevio,
  Expediente,
  Modalidad,
  ProcesoResumen,
  RevisionEstudioPrevio,
} from '../types';

const SERVICE_PREFIX = '/hiring/api/v1';

/**
 * Cliente propio en vez del apiClient genérico: el criterio 2 del HU depende
 * de leer el cuerpo del 422 (camposFaltantes), que un `throw new Error(status)`
 * descartaría.
 */
async function pedir<T>(ruta: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getApiGatewayBaseUrl()}${SERVICE_PREFIX}${ruta}`, {
    credentials: 'include',
    headers: init?.body instanceof FormData ? undefined : { 'Content-Type': 'application/json' },
    ...init,
  });

  if (res.ok) {
    const texto = await res.text();
    return (texto ? JSON.parse(texto) : {}) as T;
  }

  let cuerpo: any = {};
  try {
    cuerpo = await res.json();
  } catch {
    /* respuesta sin cuerpo JSON */
  }

  if (res.status === 422 && Array.isArray(cuerpo?.camposFaltantes)) {
    throw new CamposFaltantesError(
      cuerpo.camposFaltantes,
      cuerpo.documentoFaltante === true,
      cuerpo.message,
    );
  }
  if (res.status === 409) {
    throw new ConflictoError(cuerpo?.message ?? 'El estudio previo cambió en otra sesión');
  }
  if (res.status === 401) {
    throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.');
  }
  if (res.status === 403) {
    throw new Error(cuerpo?.message ?? 'No tienes permisos para realizar esta acción');
  }

  throw new Error(cuerpo?.message ?? `Error ${res.status}`);
}

export const contratacionService = {
  listarProcesos: () => pedir<ProcesoResumen[]>('/procesos'),

  /** Catálogo para el selector; se consulta antes de crear el proceso. */
  modalidades: () => pedir<Modalidad[]>('/modalidades'),

  crearProceso: (objeto: string, modalidad: string, valorEstimado: number) =>
    pedir<ProcesoResumen>('/procesos', {
      method: 'POST',
      body: JSON.stringify({ objeto, modalidad, valorEstimado }),
    }),

  obtenerEstudioPrevio: (procesoId: string) =>
    pedir<EstudioPrevio>(`/procesos/${procesoId}/estudio-previo`),

  guardarBorrador: (procesoId: string, datos: Record<string, any>, version: number) =>
    pedir<{ estado: string; version: number; datos: Record<string, any> }>(
      `/procesos/${procesoId}/estudio-previo`,
      { method: 'PUT', body: JSON.stringify({ datos, version }) },
    ),

  /**
   * Lanza CamposFaltantesError (422) cuando falta algo obligatorio.
   * El cuerpo `{}` es necesario: el gateway descarta la respuesta de un POST
   * sin cuerpo y la convierte en un 400 vacío, perdiendo camposFaltantes.
   */
  enviarARevision: (procesoId: string) =>
    pedir<{ estado: string; enviadoPor: string; enviadoAt: string }>(
      `/procesos/${procesoId}/estudio-previo/enviar`,
      { method: 'POST', body: '{}' },
    ),

  /** Numeral 3.4: aprueba el estudio previo enviado a revisión. */
  aprobar: (procesoId: string, observaciones?: string) =>
    pedir<{ estado: string; decision: string; revisadoPor: string }>(
      `/procesos/${procesoId}/estudio-previo/aprobar`,
      { method: 'POST', body: JSON.stringify({ observaciones }) },
    ),

  /** Numeral 3.4: devuelve al gestor con observaciones (obligatorias). */
  devolver: (procesoId: string, observaciones: string) =>
    pedir<{ estado: string; decision: string; revisadoPor: string }>(
      `/procesos/${procesoId}/estudio-previo/devolver`,
      { method: 'POST', body: JSON.stringify({ observaciones }) },
    ),

  revisiones: (procesoId: string) =>
    pedir<RevisionEstudioPrevio[]>(`/procesos/${procesoId}/estudio-previo/revisiones`),

  obtenerExpediente: (procesoId: string) =>
    pedir<Expediente>(`/procesos/${procesoId}/expediente`),

  adjuntarDocumento: (procesoId: string, archivo: File) => {
    const form = new FormData();
    form.append('file', archivo);
    return pedir<{ id: string; nombre: string }>(
      `/procesos/${procesoId}/estudio-previo/documentos`,
      { method: 'POST', body: form },
    );
  },

  urlDescarga: (descargaUrl: string) => `${getApiGatewayBaseUrl()}${SERVICE_PREFIX}${descargaUrl}`,
};
