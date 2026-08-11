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

/**
 * SOLICITADO → VERIFICADO → EXPEDIDO
 *           ↘ RECHAZADO
 */
export type EstadoCdp = 'SOLICITADO' | 'VERIFICADO' | 'EXPEDIDO' | 'RECHAZADO' | 'ANULADO';

export interface Cdp {
  id: string;
  numero: string | null;
  valor: number | null;
  rubro: string | null;
  fechaExpedicion: string | null;
  vigenciaFiscal: number | null;
  estado: EstadoCdp;
  observaciones: string | null;
  documentoId: string | null;
  solicitadoPor: string | null;
  expedidoPor: string | null;
  /** Avisa si el CDP no alcanza a cubrir el valor estimado del proceso. */
  advertencia?: string | null;
  cubreValorEstimado?: boolean;
}

export interface EstadoRespaldo {
  /** False en las modalidades que no comprometen gasto. */
  aplica: boolean;
  cdp: Cdp | null;
  /** Existe el certificado: la partida quedó apartada para el proceso. */
  expedido: boolean;
  soporteAdjunto: boolean;
  /** Lo que de verdad decide si el proceso avanza. */
  puedeAbrirse: boolean;
  motivo: string | null;
  /** Lo resuelve el backend con los roles del token, no el cliente. */
  puedeSolicitar: boolean;
  puedeGestionar: boolean;
}

/**
 * Estado del plazo de publicidad del proyecto de pliego (EFDS-1150).
 *
 * SIN_PLAZO no es "todo bien": es que la modalidad no tiene plazo parametrizado
 * o que aún no se ha registrado la publicación. Decirlo es distinto de decir
 * que el término está vigente.
 */
export type EstadoPlazo = 'VIGENTE' | 'POR_VENCER' | 'VENCIDO' | 'SIN_PLAZO';

export interface PublicacionPliego {
  id: string;
  /** Fecha real de publicación en SECOP II. Arranca el conteo del plazo. */
  fechaPublicacion: string;
  /** Plazo vigente el día del registro, congelado. */
  plazoDiasHabiles: number | null;
  fechaVencimiento: string | null;
  secopNumero: string | null;
  secopUrl: string | null;
  /** La evidencia es obligatoria: no hay publicación registrada sin soporte. */
  documentoId: string;
  publicadoPor: string | null;
}

export interface EstadoPublicacion {
  /** False en las modalidades que no tienen pliego que publicar. */
  aplica: boolean;
  publicacion: PublicacionPliego | null;
  /** Plazo configurado para la modalidad, aunque aún no se haya publicado. */
  plazo: { diasHabiles: number; confirmado: boolean; fundamento: string | null } | null;
  /** Positivo: quedan. Cero: vence hoy. Negativo: venció hace esos días. */
  diasHabilesRestantes: number | null;
  estadoPlazo: EstadoPlazo;
  /** Por qué el plazo mostrado puede no ser de fiar. */
  advertencia: string | null;
  /** Lo resuelve el backend con los roles del token, no el cliente. */
  puedeRegistrar: boolean;
}

/** Actividad de la matriz, con el estado que lleva en este proceso. */
export interface ActividadProceso {
  numeral: string;
  nombre: string;
  descripcion: string | null;
  etapa: number;
  /** False cuando la matriz la marca NO para la modalidad del proceso. */
  aplica: boolean;
  estado: EstadoActividad | null;
  actualizadoEn: string | null;
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
