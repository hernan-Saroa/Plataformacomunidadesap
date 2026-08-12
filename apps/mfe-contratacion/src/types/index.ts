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

/** Funcionario de auth.personas, para los campos que nombran a alguien. */
export interface Persona {
  id: string;
  nombre: string;
  email?: string;
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

/** Plazo de publicidad configurado para una modalidad (EFDS-1387). */
export interface PlazoModalidad {
  diasHabiles: number;
  /** De dónde sale la cifra: norma o acta que la respalda. */
  fundamento: string | null;
  /** False mientras la Dirección de Contratación no valide el número. */
  confirmado: boolean;
  actualizadoEn: string;
}

export interface ModalidadConPlazo {
  modalidad: string;
  nombre: string;
  orden: number;
  /** False cuando la modalidad no lleva proyecto de pliego que publicar. */
  aplicaPublicacion: boolean;
  motivoExclusion: string | null;
  /** Null cuando la modalidad todavía no tiene plazo configurado. */
  plazo: PlazoModalidad | null;
}

export interface PlazosPublicacion {
  /** Lo decide el backend según los roles del token, no el cliente. */
  puedeEditar: boolean;
  modalidades: ModalidadConPlazo[];
}

/** Observación de un interesado al proyecto de pliego publicado (EFDS-1151). */
export interface ObservacionPliego {
  id: string;
  presentadoPor: string;
  /** Opcional: una observación anónima igual hay que responderla. */
  identificacion: string | null;
  /** Fecha en que se presentó, no la del registro. */
  fechaPresentacion: string;
  asunto: string;
  contenido: string;
  /** Congelado al registrar: llegó después de vencido el plazo de publicidad. */
  fueraDeTermino: boolean;
  documentoId: string | null;
  registradoPor: string | null;
  respuesta: string | null;
  respondidaPor: string | null;
  respondidaAt: string | null;
  /** Si la observación llevó a modificar el pliego. Null mientras no se responda. */
  modificoPliego: boolean | null;
}

export interface EstadoObservaciones {
  /** False en las modalidades sin etapa de observaciones al proyecto de pliego. */
  aplica: boolean;
  /** Sin pliego publicado no hay sobre qué observar. */
  publicado: boolean;
  observaciones: ObservacionPliego[];
  resumen: { total: number; pendientes: number; fueraDeTermino: number };
  plazoVencido: boolean;
  /** La actividad 5.3 ya está dada por cumplida. */
  cumplida: boolean;
  /** Solo con el plazo vencido y sin ninguna observación recibida. */
  puedeCerrarse: boolean;
  /** Lo resuelve el backend con los roles del token, no el cliente. */
  puedeGestionar: boolean;
}

/** Manifestación de interés de una MIPYME en participar (EFDS-1151). */
export interface ManifestacionMipyme {
  id: string;
  nombre: string;
  identificacion: string;
  fechaPresentacion: string;
  documentoId: string | null;
  registradoPor: string | null;
}

/**
 * Una de las dos condiciones que habilitan la limitación.
 *
 * `cumple: null` es "no se pudo evaluar", que no es lo mismo que "no cumple":
 * no saber cuánto vale el proceso y saber que excede el tope llevan a
 * decisiones distintas.
 */
export interface CondicionMipyme {
  cumple: boolean | null;
  detalle: string;
}

export interface CondicionesMipyme {
  valor: CondicionMipyme;
  manifestaciones: CondicionMipyme;
  /** Solo true si ambas se pudieron evaluar y ambas se cumplen. */
  cumplidas: boolean;
  topeEnPesos: number | null;
}

/** Lo que la entidad resolvió, con las condiciones del día congeladas. */
export interface DecisionMipyme {
  id: string;
  limitado: boolean;
  condicionesCumplidas: boolean;
  manifestacionesContadas: number;
  valorProceso: number | null;
  topeValorAplicado: number | null;
  unidadTopeAplicada: string | null;
  /**
   * Salario con el que se convirtió el tope a pesos. Null si el tope se aplicó
   * en pesos, o si la decisión es anterior a que se empezara a guardar.
   */
  smmlvAplicado: number | null;
  minimoManifestaciones: number | null;
  /** Obligatorio cuando la decisión se aparta del cálculo. */
  motivo: string | null;
  documentoId: string | null;
  decididoPor: string | null;
  decididoAt: string;
}

/** Una de las dos condiciones configuradas de la limitación (EFDS-1393). */
export interface ParametroMipyme {
  clave: 'TOPE_VALOR' | 'MINIMO_MANIFESTACIONES';
  valor: number;
  /** Null en el mínimo de manifestaciones, que es un conteo sin unidad. */
  unidad: 'SMMLV' | 'PESOS' | null;
  descripcion: string;
  /** De dónde sale la cifra: norma o acta que la respalda. */
  fundamento: string | null;
  /** False mientras la Dirección de Contratación no valide el número. */
  confirmado: boolean;
  actualizadoEn: string;
}

export interface CondicionesMipymeConfig {
  /** Lo decide el backend según los roles del token, no el cliente. */
  puedeEditar: boolean;
  /** Tope primero, mínimo después: el orden lo fija el backend. */
  parametros: ParametroMipyme[];
  smmlvAplicado: { anio: number; valor: number; confirmado: boolean } | null;
  /** El tope llevado a pesos; null si está en SMMLV y falta el salario. */
  topeEnPesos: number | null;
  advertencia: string | null;
}

export interface EstadoMipyme {
  /** False en las modalidades que no admiten limitar la convocatoria. */
  aplica: boolean;
  manifestaciones: ManifestacionMipyme[];
  /** Null cuando la modalidad no aplica: no hay nada que evaluar. */
  condiciones: CondicionesMipyme | null;
  decision: DecisionMipyme | null;
  /** Por qué el cálculo mostrado puede no ser de fiar. */
  advertencia: string | null;
  /** Lo resuelve el backend con los roles del token, no el cliente. */
  puedeGestionar: boolean;
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

/** Uno de los documentos que la actividad 5.1 exige (EFDS-1149). */
export interface DocumentoRequerido {
  codigo: string;
  nombre: string;
  descripcion: string | null;
  obligatorio: boolean;
  /** Null mientras no se haya cargado. */
  cargado: {
    id: string;
    nombre: string;
    archivoUrl: string;
    cargadoPor: string | null;
    cargadoAt: string;
  } | null;
}

/** Uno de los documentos que quedaron en el expediente con la apertura. */
export interface ArchivoApertura {
  nombre: string;
  url: string;
}

/** Apertura formal registrada del proceso (actividad 5.7, EFDS-1152). */
export interface AperturaRegistrada {
  resolucionNumero: string;
  resolucionFecha: string;
  secopUrl: string | null;
  abiertoPor: string | null;
  abiertoAt: string;
  resolucion: ArchivoApertura | null;
  pliegoDefinitivo: ArchivoApertura | null;
  /** Prueba de que el pliego definitivo se publicó (EFDS-1399). */
  evidencia: ArchivoApertura | null;
}

/** Estado de la apertura del proceso y de lo que falta para poder abrirlo. */
export interface EstadoApertura {
  /** False en las modalidades sin apertura formal: directa y régimen 092. */
  aplica: boolean;
  motivoNoAplica: string | null;
  modalidad: string | null;
  modalidadNombre: string | null;
  abierta: boolean;
  apertura: AperturaRegistrada | null;
  requisitos: {
    /** El CDP expedido bloquea la apertura si falta (RF-EST-05). */
    cdp: { cumplido: boolean; motivo: string | null };
    /** Informativo: la elaboración de documentos no bloquea. */
    documentos: { cumplido: boolean };
    /** Bloquea donde la audiencia es obligatoria (RF-PUB-04, EFDS-1153). */
    audienciaRiesgos: { cumplido: boolean; motivo: string | null };
  };
  puedeAbrir: boolean;
}

/** Estado de la elaboración de documentos del proceso (actividad 5.1). */
export interface EstadoDocumentos {
  /** False en las modalidades que no elaboran los documentos ordinarios. */
  aplica: boolean;
  motivoNoAplica: string | null;
  modalidad: string | null;
  modalidadNombre: string | null;
  iniciada: boolean;
  estado: string;
  /** Los que pide esta modalidad: aviso y pliego, o acto de justificación. */
  documentos: DocumentoRequerido[];
  /** Todos los obligatorios están cargados. */
  completa: boolean;
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
