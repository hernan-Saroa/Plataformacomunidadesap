import { getApiGatewayBaseUrl } from '../../config/environment';
import {
  ActividadProceso,
  CamposFaltantesError,
  Cdp,
  CondicionesMipymeConfig,
  ConflictoError,
  EstadoDocumentos,
  EstadoMipyme,
  EstadoObservaciones,
  EstadoPublicacion,
  EstadoRespaldo,
  EstudioPrevio,
  Expediente,
  Modalidad,
  Persona,
  PlazosPublicacion,
  ProcesoResumen,
  RevisionEstudioPrevio,
  SmmlvAnual,
  SugerenciaModalidad,
  UmbralesVigentes,
  UmbralVigente,
  UnidadUmbral,
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

  /** Personas para los selectores; el termino filtra por nombre. */
  personas: (q = '') => pedir<Persona[]>(`/personas?q=${encodeURIComponent(q)}`),

  /**
   * Modalidad que corresponde a una cuantía. Se consulta mientras se digita el
   * valor, antes de que el proceso exista.
   */
  sugerenciaModalidad: (valorEstimado: number, signal?: AbortSignal) =>
    pedir<SugerenciaModalidad>(`/umbrales/sugerencia?valorEstimado=${valorEstimado}`, { signal }),

  // ------------------------------------------------------ etapa 4 · CDP ----

  /** Actividades de una etapa con su estado; alimenta el riel. */
  actividades: (procesoId: string, etapa?: number) =>
    pedir<ActividadProceso[]>(
      `/procesos/${procesoId}/actividades${etapa ? `?etapa=${etapa}` : ''}`,
    ),

  respaldoCdp: (procesoId: string) => pedir<EstadoRespaldo>(`/procesos/${procesoId}/cdp`),

  solicitarCdp: (
    procesoId: string,
    datos: { rubro: string; valor: number; vigenciaFiscal?: number; observaciones?: string },
  ) => pedir<Cdp>(`/procesos/${procesoId}/cdp`, { method: 'POST', body: JSON.stringify(datos) }),

  verificarCdp: (procesoId: string) =>
    pedir<Cdp>(`/procesos/${procesoId}/cdp/verificar`, { method: 'POST' }),

  expedirCdp: (
    procesoId: string,
    datos: { numero: string; valor: number; fechaExpedicion: string; vigenciaFiscal?: number },
  ) =>
    pedir<Cdp>(`/procesos/${procesoId}/cdp/expedir`, {
      method: 'POST',
      body: JSON.stringify(datos),
    }),

  rechazarCdp: (procesoId: string, observaciones: string) =>
    pedir<Cdp>(`/procesos/${procesoId}/cdp/rechazar`, {
      method: 'POST',
      body: JSON.stringify({ observaciones }),
    }),

  adjuntarCdp: (procesoId: string, archivo: File) => {
    const cuerpo = new FormData();
    cuerpo.append('file', archivo);
    return pedir<Cdp>(`/procesos/${procesoId}/cdp/documento`, { method: 'POST', body: cuerpo });
  },

  abrirProceso: (procesoId: string) =>
    pedir<{ id: string; radicado: string; etapa: number }>(`/procesos/${procesoId}/abrir`, {
      method: 'POST',
    }),

  // ------------------------- etapa 5 · documentos del proceso (5.1) ---------

  /** Qué documentos exige la modalidad y cuáles ya están cargados. */
  documentosProceso: (procesoId: string) =>
    pedir<EstadoDocumentos>(`/procesos/${procesoId}/documentos`),

  /**
   * Carga uno de los documentos que la actividad exige.
   *
   * El código viaja en el cuerpo junto al archivo: la petición ya es multipart,
   * y ponerlo en la ruta chocaría con `/documentos/iniciar`.
   */
  cargarDocumentoProceso: (procesoId: string, codigo: string, archivo: File) => {
    const cuerpo = new FormData();
    cuerpo.append('file', archivo);
    cuerpo.append('codigo', codigo);

    return pedir<EstadoDocumentos>(`/procesos/${procesoId}/documentos`, {
      method: 'POST',
      body: cuerpo,
    });
  },

  /** Deja sin efecto un documento cargado para sustituirlo por otro. */
  anularDocumentoProceso: (procesoId: string, documentoId: string) =>
    pedir<EstadoDocumentos>(`/procesos/${procesoId}/documentos/${documentoId}/anular`, {
      method: 'POST',
      body: '{}',
    }),

  // ---------------------------- etapa 5 · publicación del proyecto de pliego -

  /** Publicación vigente y estado del plazo de publicidad. */
  publicacionPliego: (procesoId: string) =>
    pedir<EstadoPublicacion>(`/procesos/${procesoId}/publicacion-pliego`),

  /**
   * Registra la publicación con su evidencia en una sola petición.
   *
   * La evidencia va aquí y no en un paso posterior porque sin ella no hay
   * registro: es lo único que prueba que la publicación existió, y el registro
   * arranca un plazo legal. Admite imágenes además de documentos, que la prueba
   * suele ser una captura de SECOP II.
   *
   * La fecha es la de la publicación real, no la del registro: es la que
   * arranca el plazo, y el backend calcula el vencimiento con ella.
   */
  registrarPublicacion: (
    procesoId: string,
    datos: { fechaPublicacion: string; secopNumero?: string; secopUrl?: string },
    evidencia: File,
  ) => {
    const cuerpo = new FormData();
    cuerpo.append('file', evidencia);
    cuerpo.append('fechaPublicacion', datos.fechaPublicacion);
    if (datos.secopNumero) cuerpo.append('secopNumero', datos.secopNumero);
    if (datos.secopUrl) cuerpo.append('secopUrl', datos.secopUrl);

    return pedir<EstadoPublicacion>(`/procesos/${procesoId}/publicacion-pliego`, {
      method: 'POST',
      body: cuerpo,
    });
  },

  /** Deja sin efecto la publicación registrada para poder corregirla. */
  anularPublicacion: (procesoId: string, motivo: string) =>
    pedir<EstadoPublicacion>(`/procesos/${procesoId}/publicacion-pliego/anular`, {
      method: 'POST',
      body: JSON.stringify({ motivo }),
    }),

  // ------------------------------- etapa 5 · observaciones al pliego (5.3) ---

  /** Observaciones del proceso con el resumen que decide si la actividad cumple. */
  observaciones: (procesoId: string) =>
    pedir<EstadoObservaciones>(`/procesos/${procesoId}/observaciones`),

  /**
   * Registra una observación recibida, con su soporte si lo hubo.
   *
   * El soporte es opcional, a diferencia de la evidencia de la publicación: una
   * observación pudo llegar por un canal que no deja documento, y exigirlo
   * obligaría a inventarse un archivo o a no registrarla.
   *
   * La fecha es la de presentación, no la del registro: es la que decide si
   * llegó dentro del plazo de publicidad.
   */
  registrarObservacion: (
    procesoId: string,
    datos: {
      presentadoPor: string;
      identificacion?: string;
      fechaPresentacion: string;
      asunto: string;
      contenido: string;
    },
    soporte: File | null,
  ) => {
    const cuerpo = new FormData();
    if (soporte) cuerpo.append('file', soporte);
    cuerpo.append('presentadoPor', datos.presentadoPor);
    if (datos.identificacion) cuerpo.append('identificacion', datos.identificacion);
    cuerpo.append('fechaPresentacion', datos.fechaPresentacion);
    cuerpo.append('asunto', datos.asunto);
    cuerpo.append('contenido', datos.contenido);

    return pedir<EstadoObservaciones>(`/procesos/${procesoId}/observaciones`, {
      method: 'POST',
      body: cuerpo,
    });
  },

  /** La respuesta cierra la observación; no se reescribe después. */
  responderObservacion: (
    procesoId: string,
    observacionId: string,
    datos: { respuesta: string; modificoPliego: boolean },
  ) =>
    pedir<EstadoObservaciones>(
      `/procesos/${procesoId}/observaciones/${observacionId}/responder`,
      { method: 'POST', body: JSON.stringify(datos) },
    ),

  /** Da por cumplida la actividad cuando venció el plazo y no llegó ninguna. */
  cerrarSinObservaciones: (procesoId: string) =>
    pedir<EstadoObservaciones>(`/procesos/${procesoId}/observaciones/cerrar`, {
      method: 'POST',
      body: '{}',
    }),

  // ---------------------------------- etapa 5 · limitación a MIPYME (5.4) ---

  /** Manifestaciones, condiciones evaluadas y decisión, si ya se tomó. */
  mipyme: (procesoId: string) => pedir<EstadoMipyme>(`/procesos/${procesoId}/mipyme`),

  /** Una MIPYME manifestó interés. De cuántas lo hagan depende la decisión. */
  registrarManifestacionMipyme: (
    procesoId: string,
    datos: { nombre: string; identificacion: string; fechaPresentacion: string },
    soporte: File | null,
  ) => {
    const cuerpo = new FormData();
    if (soporte) cuerpo.append('file', soporte);
    cuerpo.append('nombre', datos.nombre);
    cuerpo.append('identificacion', datos.identificacion);
    cuerpo.append('fechaPresentacion', datos.fechaPresentacion);

    return pedir<EstadoMipyme>(`/procesos/${procesoId}/mipyme/manifestaciones`, {
      method: 'POST',
      body: cuerpo,
    });
  },

  /**
   * Registra la decisión sobre la limitación.
   *
   * El motivo lo exige el backend cuando la decisión se aparta del cálculo, y
   * el acto administrativo cuando se limita: limitar restringe quién puede
   * presentarse a un proceso público.
   */
  decidirMipyme: (
    procesoId: string,
    datos: { limitado: boolean; motivo?: string },
    acto: File | null,
  ) => {
    const cuerpo = new FormData();
    if (acto) cuerpo.append('file', acto);
    cuerpo.append('limitado', String(datos.limitado));
    if (datos.motivo) cuerpo.append('motivo', datos.motivo);

    return pedir<EstadoMipyme>(`/procesos/${procesoId}/mipyme/decision`, {
      method: 'POST',
      body: cuerpo,
    });
  },

  // ------------------------ administración de las condiciones de MIPYME -----

  /** Tope de valor y mínimo de manifestaciones, con su marca de confirmado. */
  condicionesMipyme: () => pedir<CondicionesMipymeConfig>('/condiciones-mipyme'),

  /**
   * Cambia una de las dos condiciones.
   *
   * No afecta a las decisiones ya tomadas: cada una congeló los parámetros con
   * los que se evaluó.
   */
  guardarCondicionMipyme: (
    clave: string,
    datos: {
      valor: number;
      unidad?: 'SMMLV' | 'PESOS';
      fundamento?: string;
      confirmado?: boolean;
    },
  ) =>
    pedir<CondicionesMipymeConfig>(`/condiciones-mipyme/${clave}`, {
      method: 'PUT',
      body: JSON.stringify(datos),
    }),

  // -------------------------------- administración de plazos de publicidad ---

  /** Las once modalidades con su plazo, tengan fila o no. */
  plazosPublicacion: () => pedir<PlazosPublicacion>('/plazos-publicacion'),

  /**
   * Fija el plazo de una modalidad, creándolo si no lo tenía.
   *
   * No afecta a lo ya publicado: cada publicación congeló el plazo que le
   * aplicó el día de su registro.
   */
  guardarPlazoPublicacion: (
    modalidad: string,
    datos: { diasHabiles: number; fundamento?: string; confirmado?: boolean },
  ) =>
    pedir<PlazosPublicacion>(`/plazos-publicacion/${modalidad}`, {
      method: 'PUT',
      body: JSON.stringify(datos),
    }),

  // ------------------------------------------- administración de umbrales ---

  umbrales: () => pedir<UmbralesVigentes>('/umbrales'),

  smmlv: () => pedir<SmmlvAnual[]>('/umbrales/smmlv'),

  guardarSmmlv: (anio: number, valor: number) =>
    pedir<SmmlvAnual>('/umbrales/smmlv', {
      method: 'PUT',
      body: JSON.stringify({ anio, valor }),
    }),

  /** Cierra el umbral vigente de la modalidad y abre el nuevo. */
  guardarUmbral: (
    modalidad: string,
    cambio: {
      limiteInferior: number | null;
      limiteSuperior: number | null;
      unidad: UnidadUmbral;
      vigenciaDesde?: string;
    },
  ) =>
    pedir<UmbralVigente>(`/umbrales/${modalidad}`, {
      method: 'PUT',
      body: JSON.stringify(cambio),
    }),

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
