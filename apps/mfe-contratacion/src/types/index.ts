/** Tipos del módulo de Contratación — HU EFDS-1146 (estudio previo, numeral 3.1). */

export type TipoCampo = 'texto' | 'texto_largo' | 'numero' | 'moneda' | 'seleccion';

/**
 * BORRADOR → EN_REVISION → APROBADO
 *                        ↘ DEVUELTO → BORRADOR (el gestor corrige y reenvía)
 */
export type EstadoActividad = 'BORRADOR' | 'EN_REVISION' | 'APROBADO' | 'DEVUELTO';

export interface RevisionEstudioPrevio {
  id: string;
  decision: 'APROBADO' | 'DEVUELTO';
  observaciones?: string;
  versionRevisada: number;
  revisadoPor: string;
  createdAt: string;
}

/** Definición de un campo del formulario; llega del backend, no está en código. */
export interface CampoFormulario {
  id: string;
  numeral: string;
  codigo: string;
  etiqueta: string;
  ayuda?: string;
  tipo: TipoCampo;
  obligatorio: boolean;
  grupo?: string;
  orden: number;
  opciones?: string[];
  /** Se muestra pero no se edita: su valor vive en el proceso, no en el formulario. */
  soloLectura?: boolean;
}

/**
 * Modalidad de selección: es la columna de la matriz de flujo, así que
 * determina qué actividades aplican al proceso. Se elige al crearlo.
 */
export interface Modalidad {
  codigo: string;
  nombre: string;
  orden: number;
}

/**
 * Modalidad que corresponde a una cuantía, según los umbrales vigentes.
 *
 * `modalidadesBloqueadas` la calcula el backend a propósito: si el formulario
 * dedujera por su cuenta cuáles vetar, habría dos versiones de la misma regla.
 */
export interface SugerenciaModalidad {
  valorEstimado: number | null;
  modalidad: string | null;
  nombre: string | null;
  /** Solo la licitación pública ata; el resto orienta. */
  forzosa: boolean;
  umbral: { desde: number | null; hasta: number | null } | null;
  modalidadesBloqueadas: string[];
  motivo: string | null;
  advertencia: string | null;
}

export type UnidadUmbral = 'SMMLV' | 'PESOS';

/** Umbral vigente de una modalidad, con su equivalente en pesos ya resuelto. */
export interface UmbralVigente {
  id: string;
  modalidad: string;
  limiteInferior: number | null;
  limiteSuperior: number | null;
  unidad: UnidadUmbral;
  enPesos: { inferior: number | null; superior: number | null } | null;
  smmlvAplicado: { anio: number; valor: number; confirmado: boolean } | null;
  vigenciaDesde: string;
  vigenciaHasta: string | null;
  vigente: boolean;
  /** False mientras la Dirección de Contratación no confirme la cifra. */
  confirmado: boolean;
  advertencia: string | null;
}

export interface ModalidadConUmbral {
  modalidad: string;
  nombre: string;
  orden: number;
  /** False cuando se elige por causal: ningún monto la sugiere ni la descarta. */
  determinadaPorCuantia: boolean;
  umbral: UmbralVigente | null;
}

export interface UmbralesVigentes {
  /** Lo decide el backend según los roles del token, no el cliente. */
  puedeEditar: boolean;
  modalidades: ModalidadConUmbral[];
}

export interface SmmlvAnual {
  anio: number;
  valor: number;
  confirmado: boolean;
}

export interface ProcesoResumen {
  id: string;
  radicado: string;
  objeto: string;
  modalidad?: string | null;
  /** Nombre legible; el código crudo no se muestra nunca. */
  modalidadNombre?: string | null;
  /** Cuantía del proceso, en pesos. Es dato del proceso, no del estudio previo. */
  valorEstimado?: number | null;
  etapa: number;
  fechaRadicacion: string;
  expediente?: { numeroExpediente: string };
  /** Avance del numeral 3.1; null si el proceso aún no lo tiene instanciado. */
  estudioPrevio?: {
    estado: EstadoActividad;
    version: number;
    camposFaltantes: number;
    camposObligatorios: number;
    actualizadoEn: string;
  } | null;
  actividades?: { numeral: string; estado: EstadoActividad }[];
}

export interface EstudioPrevio {
  proceso: {
    id: string;
    radicado: string;
    objeto: string;
    modalidad?: string | null;
    modalidadNombre?: string | null;
    /** Se elige al crear el proceso; el formulario lo muestra en solo lectura. */
    valorEstimado?: number | null;
    etapa: number;
    expediente?: string;
  };
  estado: EstadoActividad;
  version: number;
  datos: Record<string, any>;
  definicionCampos: CampoFormulario[];
  editable: boolean;
}

/** Campo obligatorio sin diligenciar (criterio 2 del HU). */
export interface CampoFaltante {
  codigo: string;
  etiqueta: string;
  grupo?: string;
}

export interface DocumentoExpediente {
  id: string;
  tipo: 'ADJUNTO' | 'SNAPSHOT_FORMULARIO';
  nombre: string;
  numeral?: string;
  mimeType?: string;
  tamano?: number | null;
  hashSha256: string;
  version: number;
  subidoPor?: string;
  createdAt: string;
  contenido?: Record<string, any>;
  descargaUrl?: string;
}

export interface Expediente {
  numeroExpediente: string;
  estado: string;
  fechaApertura: string;
  documentos: DocumentoExpediente[];
}

/** Error 422 del envío: trae la lista de campos que faltan. */
export class CamposFaltantesError extends Error {
  constructor(
    public readonly camposFaltantes: CampoFaltante[],
    /** El estudio previo firmado no se ha adjuntado. */
    public readonly documentoFaltante = false,
    mensaje = 'Faltan datos obligatorios',
  ) {
    super(mensaje);
    this.name = 'CamposFaltantesError';
  }
}

/** Error 409: otra sesión guardó cambios, o la actividad ya fue enviada. */
export class ConflictoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictoError';
  }
}
