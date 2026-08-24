/** Tipos del módulo de Contratación — HU EFDS-1146 (estudio previo, numeral 3.1). */

/**
 * Cómo se diligencia un campo.
 *
 * Los cinco primeros vienen del estudio previo. Los cuatro últimos los agrega
 * la configuración de etapas: son las formas en que se cierran las actividades
 * del resto del proceso —se adjunta algo, se fecha, se confirma, o alguien da
 * su visto bueno—. `responsable` declara que hace falta una aprobación; a quién
 * se le pide lo elige el gestor al diligenciar, porque cambia en cada proceso.
 */
export type TipoCampo =
  | 'texto'
  | 'texto_largo'
  | 'numero'
  | 'moneda'
  | 'seleccion'
  | 'archivo'
  | 'fecha'
  | 'casilla'
  | 'responsable';

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

/** Una adenda del proceso (actividad 5.6, EFDS-1154). */
export interface Adenda {
  id: string;
  /** Consecutivo dentro del proceso: las adendas se citan por su número. */
  numero: number;
  tipo: 'FONDO' | 'CRONOGRAMA';
  objeto: string;
  estado: 'EMITIDA' | 'PUBLICADA' | 'ANULADA';
  emitidaPor: string | null;
  emitidaAt: string;
  fechaPublicacion: string | null;
  publicadaPor: string | null;
  /** Solo en las de cronograma publicadas: de qué fecha a qué fecha se movió. */
  vencimientoAnterior: string | null;
  vencimientoNuevo: string | null;
  motivoAnulacion: string | null;
  documento: ArchivoApertura | null;
  evidencia: ArchivoApertura | null;
}

/** Estado de las adendas del proceso. */
export interface EstadoAdendas {
  /** False donde la modalidad no publica pliego que modificar. */
  aplica: boolean;
  motivoNoAplica: string | null;
  modalidad: string | null;
  modalidadNombre: string | null;
  /** Sin pliego publicado no hay nada que adendar. */
  publicado: boolean;
  /** Con el proceso abierto rige el pliego definitivo. */
  abierto: boolean;
  puedeEmitir: boolean;
  /** Vencimiento del plazo hoy; es lo que mueve una adenda de cronograma. */
  vencimientoVigente: string | null;
  adendas: Adenda[];
}

/** Audiencia de asignación de riesgos celebrada (actividad 5.5, EFDS-1153). */
export interface AudienciaRiesgos {
  id: string;
  fechaCelebracion: string;
  observaciones: string | null;
  registradoPor: string | null;
  registradoAt: string;
  acta: ArchivoApertura | null;
  matriz: ArchivoApertura | null;
}

/** Estado de la audiencia de riesgos del proceso. */
export interface EstadoAudienciaRiesgos {
  /** False donde la modalidad no adelanta audiencia. */
  aplica: boolean;
  motivoNoAplica: string | null;
  /** Sin ella el proceso no puede abrirse; distinto de que simplemente aplique. */
  obligatoria: boolean;
  fundamento: string | null;
  /** False mientras Contratación no ratifique la regla de obligatoriedad. */
  confirmado: boolean;
  modalidad: string | null;
  modalidadNombre: string | null;
  celebrada: boolean;
  audiencia: AudienciaRiesgos | null;
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

// ------------------- etapa 6 · recepción de ofertas (6.1, EFDS-1155) --------

/** Una oferta recibida dentro del plazo, con su soporte. */
export interface Oferente {
  id: string;
  /** Consecutivo por orden de llegada dentro del proceso. */
  numero: number;
  nombre: string;
  identificacion: string;
  /** Instante ISO: la hora de radicación importa tanto como el día. */
  fechaRadicacion: string;
  /** Base de la evaluación económica; nulo en las ofertas anteriores a EFDS-1157. */
  valorOfertado: number | null;
  registradoPor: string | null;
  soporte: ArchivoApertura | null;
}

/** El plazo de ofertas del proceso y su cierre. */
export interface RecepcionOfertas {
  id: string;
  estado: 'ABIERTA' | 'CERRADA';
  /** Instante ISO hasta el que se reciben ofertas. */
  vencimiento: string;
  /** El mismo vencimiento como día en Bogotá, para mostrarlo sin recalcularlo. */
  vencimientoDia: string;
  /** Nulo cuando el vencimiento se fijó a mano en vez de calcularse. */
  plazoDiasHabiles: number | null;
  vencido: boolean;
  diasHabilesRestantes: number;
  estadoPlazo: 'VIGENTE' | 'POR_VENCER' | 'VENCIDO' | 'SIN_PLAZO';
  cerradaAt: string | null;
  cerradaPor: string | null;
}

/** Estado de la recepción de ofertas del proceso. */
export interface EstadoOfertas {
  /** False donde la modalidad no adelanta recepción de ofertas. */
  aplica: boolean;
  motivoNoAplica: string | null;
  modalidad: string | null;
  modalidadNombre: string | null;
  etapa: number;
  /** Sin resolución de apertura no hay convocatoria a la que presentarse. */
  abierto: boolean;
  /** False cuando la modalidad no tiene plazo de ofertas parametrizado. */
  plazoParametrizado: boolean;
  /** Los plazos entraron como supuesto del equipo, sin ratificar. */
  plazoConfirmado: boolean;
  recepcion: RecepcionOfertas | null;
  puedeRegistrar: boolean;
  puedeCerrar: boolean;
  /** Lo que vuelve pública la lista es el cierre. */
  listaPublicada: boolean;
  oferentes: Oferente[];
}

// -------------------- etapa 6 · comité evaluador (6.2, EFDS-1156) -----------

/** Las tres dimensiones de la evaluación (RF-SIS-02). */
export type RolEvaluador = 'JURIDICO' | 'FINANCIERO' | 'TECNICO';

/** Un integrante del comité, con la dimensión que evalúa. */
export interface MiembroComite {
  id: string;
  /** `id_person` del directorio; es lo que enlaza al evaluador con su cuenta. */
  personaId: string;
  nombre: string;
  rol: RolEvaluador;
}

/** La designación vigente, con el memorando que la soporta. */
export interface ComiteDesignado {
  id: string;
  fechaDesignacion: string;
  designadoPor: string | null;
  designadoAt: string;
  memorando: ArchivoApertura | null;
}

/** Estado del comité evaluador del proceso. */
export interface EstadoComite {
  /** False donde la modalidad no evalúa por comité. */
  aplica: boolean;
  motivoNoAplica: string | null;
  modalidad: string | null;
  modalidadNombre: string | null;
  /** Si quien consulta evalúa en este proceso, y en qué dimensiones. */
  soyEvaluador: boolean;
  misDimensiones: RolEvaluador[];
  /** Las dos condiciones para designar, por separado, para poder decir cuál falta. */
  recepcionCerrada: boolean;
  totalOferentes: number;
  designado: boolean;
  puedeDesignar: boolean;
  comite: ComiteDesignado | null;
  miembros: MiembroComite[];
}

/** Un miembro todavía sin designar, mientras se arma la lista en pantalla. */
export interface MiembroPropuesto {
  personaId: string;
  nombre: string;
  rol: RolEvaluador;
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

// ------------------------------------ Configuración de etapas (EFDS-1187) --

/** Una de las 63 actividades de la matriz de flujo. */
/**
 * Formato institucional del Sistema Integrado de Gestión.
 *
 * Los documentos del proceso no se redactan en el sistema: la ESAP tiene
 * formatos aprobados que se diligencian en Word y se firman. Aquí se registra
 * cuál corresponde a cada actividad y modalidad.
 */
export interface PlantillaFormato {
  id: string;
  /** Código del SIG, p. ej. BS-FO-047. */
  codigo: string;
  nombre: string;
  numeral: string;
  version: string;
  fechaAprobacion?: string | null;
  /** Modalidades a las que aplica; vacío = todas. */
  modalidades: string[];
  /** Ruta de descarga; null mientras no se haya subido el archivo. */
  archivoUrl?: string | null;
  activo: boolean;
}

export interface ActividadCatalogo {
  numeral: string;
  etapa: number;
  nombre: string;
  descripcion?: string | null;
  orden: number;
  activa: boolean;
  /** Días hábiles previstos para completarla. Nulo = sin plazo definido. */
  plazoDias?: number | null;
  /** Cargo que responde por ella, no la persona que hoy lo ocupa. */
  responsableCargo?: string | null;
  /** Cuántos días antes del vencimiento avisar. Nulo = sin aviso. */
  alertaDiasAntes?: number | null;
}

/** La misma actividad, ya resuelta contra una modalidad. */
export interface ActividadAplicable extends ActividadCatalogo {
  aplica: boolean;
  /** Por qué la actividad no aplica a esta modalidad. */
  motivo?: string | null;
  /** La actividad aplica, pero la matriz le pone una condición ("si*"). */
  salvedad?: string | null;
  /** Lo que la matriz escribió en la celda: "TVEC", "Comunicación de aceptación". */
  variante?: string | null;
  /** Reglas vigentes que le aplican a esta modalidad. */
  reglas?: number;
  /** De esas, cuantas son propias de la modalidad. */
  reglasPropias?: number;
  /** Campos del formulario; 0 = la actividad no tiene formulario todavia. */
  campos?: number;
}

export interface EtapaConActividades {
  etapa: number;
  actividades: ActividadCatalogo[];
}

export type TipoRegla =
  | 'CAMPO_OBLIGATORIO'
  | 'DOCUMENTO_REQUERIDO'
  | 'RANGO_VALOR'
  | 'PLAZO_MINIMO'
  | 'BLOQUEA_AVANCE'
  | 'REGLA_DERIVADA';

/** Condición que debe cumplirse para dar por terminada una actividad. */
export interface ReglaActividad {
  id: string;
  numeral: string;
  /** null = aplica a todas las modalidades. */
  modalidad: string | null;
  tipo: TipoRegla;
  config: Record<string, any>;
  mensaje?: string | null;
  orden: number;
  vigenteDesde: string;
  vigenteHasta?: string | null;
  condiciones?: Condicion[];
  acciones?: Accion[];
  conector?: 'AND' | 'OR';
  /** Frase legible que arma el backend. */
  descripcion?: string;
}

/** Lo que se envia al crear o reemplazar una regla. */
export interface GuardarRegla {
  /** Vacio = aplica a todas las modalidades. */
  modalidad?: string | null;
  tipo: TipoRegla;
  config: Record<string, any>;
  mensaje?: string;
  orden?: number;
  condiciones?: Condicion[];
  acciones?: Accion[];
  conector?: 'AND' | 'OR';
}

/** Estado de una celda de la matriz de cobertura. */
export type EstadoCelda = 'GLOBAL' | 'ESPECIFICA' | 'SIN_REGLA' | 'NO_APLICA';

export interface CeldaCobertura {
  modalidad: string;
  estado: EstadoCelda;
  reglaId?: string;
}

export interface FilaCobertura {
  clave: string;
  tipo: TipoRegla;
  /** El campo, el documento o el tipo: lo que identifica la condicion. */
  etiqueta: string;
  /** Codigo interno, solo como referencia. */
  codigo?: string;
  alcance: 'GLOBAL' | 'ESPECIFICA';
  reglaGlobalId: string | null;
  mensaje: string | null;
  celdas: CeldaCobertura[];
}

export interface Cobertura {
  numeral: string;
  nombre: string;
  modalidades: { codigo: string; nombre: string; aplica: boolean; motivo: string | null }[];
  filas: FilaCobertura[];
}

/**
 * Estado de una celda de la matriz general.
 *
 * Distingue lo que la matriz del Excel distingue y la pantalla no distinguía:
 * `CON_SALVEDAD` son las celdas que decían "si*" o traían texto propio.
 */
export type EstadoMatriz =
  | 'APLICA'
  | 'CON_EXCEPCION'
  | 'CON_SALVEDAD'
  | 'SIN_REGLAS'
  | 'SIN_FORMULARIO'
  | 'NO_APLICA';

export interface CeldaMatriz {
  modalidad: string;
  estado: EstadoMatriz;
  /** Por qué no aplica, o la condición que la matriz marca sin redactar. */
  motivo: string | null;
  /** El texto de la celda cuando la matriz no dice SI a secas. */
  variante: string | null;
  reglas: number;
  reglasPropias: number;
}

export interface FilaMatriz {
  numeral: string;
  etapa: number;
  nombre: string;
  descripcion: string | null;
  campos: number;
  celdas: CeldaMatriz[];
}

export interface Matriz {
  modalidades: Modalidad[];
  filas: FilaMatriz[];
}

export interface ActividadDeFlujo {
  numeral: string;
  nombre: string;
  descripcion: string | null;
  aplica: boolean;
  motivo: string | null;
  campos: number;
  reglas: number;
  reglasPropias: number;
  salvedad: string | null;
  variante: string | null;
}

export interface EtapaDeFlujo {
  etapa: number;
  /** Ninguna de sus actividades aplica: el proceso pasa de largo. */
  seSalta: boolean;
  total: number;
  aplican: number;
  actividades: ActividadDeFlujo[];
}

export interface FlujoModalidad {
  modalidad: string;
  etapas: EtapaDeFlujo[];
}

export interface CampoConfigurable {
  id: string;
  numeral: string;
  codigo: string;
  etiqueta: string;
  ayuda?: string | null;
  tipo: string;
  obligatorio: boolean;
  grupo?: string | null;
  orden: number;
  activo: boolean;
  soloLectura: boolean;
}

export type Operador = 'ES' | 'NO_ES' | 'MAYOR_QUE' | 'MENOR_QUE' | 'ESTA_VACIO' | 'TIENE_VALOR';

export type TipoAccion =
  | 'EXIGIR_CAMPO'
  | 'MOSTRAR_CAMPO'
  | 'OCULTAR_CAMPO'
  | 'EXIGIR_DOCUMENTO'
  | 'BLOQUEAR_AVANCE';

export interface Condicion {
  /** Codigo del campo, o `modalidad` para condicionar por la del proceso. */
  campo: string;
  operador: Operador;
  valor?: any;
}

export interface Accion {
  accion: TipoAccion;
  objetivo: string;
  valor?: any;
}

/** Un campo tal como queda tras aplicar las reglas. */
export interface CampoSimulado {
  codigo: string;
  etiqueta: string;
  tipo: string;
  ayuda?: string | null;
  visible: boolean;
  obligatorio: boolean;
  /** Que reglas lo dejaron asi. */
  porque: string[];
}

export interface SimulacionFormulario {
  numeral: string;
  modalidad: string;
  campos: CampoSimulado[];
  reglasEvaluadas: number;
}

// ------------------------------------------- evaluación de ofertas (6.3) ---

/**
 * La evaluación se hace por fuera (EFDS-1157).
 *
 * El comité califica con sus propios formatos y su cuadro comparativo, y elige
 * la ganadora; la plataforma recibe la decisión ya tomada con el informe que la
 * sustenta. Por eso aquí no hay criterios, ni puntajes por dimensión, ni
 * consolidación: nada de eso se calcula en la aplicación.
 */

/** Vigente hasta que se rectifique: corregir no borra el resultado anterior. */
export type EstadoResultado = 'VIGENTE' | 'RECTIFICADO';

/** Una oferta de la lista publicada, como se ve al elegir la ganadora. */
export interface OfertaEvaluable {
  id: string;
  numero: number;
  nombre: string;
  identificacion: string;
  valorOfertado: number | null;
}

/** Un documento con que el comité sustenta lo que decidió. */
export interface EvidenciaEvaluacion {
  id: string;
  descripcion: string;
  cargadaPor: string | null;
  cargadaAt: string;
  archivoUrl: string | null;
}

export interface ResultadoEvaluacion {
  id: string;
  estado: EstadoResultado;
  ganadora: OfertaEvaluable | null;
  /** Nulos donde la modalidad no puntúa; cuando vienen, vienen los dos. */
  puntajeObtenido: number | null;
  puntajeMaximo: number | null;
  /** Puede no ser el valor ofertado: el comité corrige aritmética. */
  valorEvaluado: number | null;
  justificacion: string;
  informe: { id: string; nombre: string; archivoUrl: string } | null;
  registradoPor: string | null;
  registradoAt: string;
  rectificadoPor: string | null;
  rectificadoAt: string | null;
  motivoRectificacion: string | null;
  evidencias: EvidenciaEvaluacion[];
}

export interface EstadoEvaluacion {
  aplica: boolean;
  motivoNoAplica: string | null;
  modalidad: string | null;
  modalidadNombre: string | null;
  recepcionCerrada: boolean;
  comiteDesignado: boolean;
  /** En qué dimensiones integra el comité quien consulta. Vacío: solo mira. */
  misDimensiones: RolEvaluador[];
  esMiembroDelComite: boolean;
  puedeRegistrar: boolean;
  ofertas: OfertaEvaluable[];
  resultado: ResultadoEvaluacion | null;
  /** Los rectificados se muestran: explican que haya dos informes. */
  rectificados: ResultadoEvaluacion[];
}

/** Lo que el comité reporta. Los puntajes son opcionales y van en pareja. */
export interface RegistrarResultado {
  oferenteId: string;
  puntajeObtenido?: number;
  puntajeMaximo?: number;
  valorEvaluado?: number;
  justificacion: string;
}

/* ---------------------------------------------------------------------------
 * Traslado del informe de evaluación y subsanaciones — actividades 6.4 a 6.6
 * (EFDS-1158).
 *
 * Evaluadas las ofertas, la entidad publica el informe preliminar, lo traslada
 * y abre el término para que los oferentes subsanen y observen. Es el debido
 * proceso previo a la adjudicación.
 * ------------------------------------------------------------------------- */

/**
 * Borrador es el informe generado y no publicado; trasladado, el que ya se
 * notificó y tiene término corriendo; cerrado, el que lo agotó. Anulado no se
 * borra: explica por qué hubo que rehacerlo.
 */
export type EstadoInforme = 'BORRADOR' | 'TRASLADADO' | 'CERRADO' | 'ANULADO';

/** Una oferta recibida, como quedó congelada en el informe. */
export interface OfertaEnInforme {
  oferenteId: string;
  numero: number;
  nombre: string;
  identificacion: string | null;
  valorOfertado: number | null;
  ganadora: boolean;
}

/**
 * El resultado del comité tal como estaba el día del traslado.
 *
 * Copia y no referencia: si el comité rectifica después, el informe que recibió
 * el oferente tiene que seguir leyéndose igual.
 */
export interface ResultadoCongelado {
  modalidad: string | null;
  resultadoId: string;
  ganadora: { oferenteId: string; nombre: string; identificacion: string | null };
  puntajeObtenido: number | null;
  puntajeMaximo: number | null;
  valorEvaluado: number | null;
  justificacion: string;
  informeDocumentoId: string;
  evidencias: { documentoId: string; descripcion: string }[];
  ofertas: OfertaEnInforme[];
}

export interface InformeEvaluacion {
  id: string;
  numero: number;
  estado: EstadoInforme;
  resultadoId: string;
  resultado: ResultadoCongelado;
  /** Recibidas, no habilitadas: quién queda habilitado lo decide el comité. */
  ofertasRecibidas: number;
  observacionEntidad: string | null;
  informe: { id: string; nombre: string; archivoUrl: string } | null;
  evidencia: { id: string; nombre: string; archivoUrl: string } | null;
  generadoPor: string | null;
  generadoAt: string;
  trasladadoPor: string | null;
  trasladadoAt: string | null;
  plazoDiasHabiles: number | null;
  venceEl: string | null;
  diasRestantes: number | null;
  estadoPlazo: EstadoPlazo;
  cerradoPor: string | null;
  cerradoAt: string | null;
  anuladoAt: string | null;
  motivoAnulacion: string | null;
}

export interface EstadoTraslado {
  aplica: boolean;
  motivoNoAplica: string | null;
  modalidad: string | null;
  modalidadNombre: string | null;
  /** Sin fila no se inventa un término: la pantalla lo dice y bloquea. */
  plazo: { diasHabiles: number; fundamento: string | null; confirmado: boolean } | null;
  hayResultado: boolean;
  puedeGenerar: boolean;
  puedeTrasladar: boolean;
  informe: InformeEvaluacion | null;
  anulados: InformeEvaluacion[];
}

/** Aporta lo que faltaba, o cuestiona la evaluación. No se responden igual. */
export type TipoSubsanacion = 'SUBSANACION' | 'OBSERVACION';

export interface Subsanacion {
  id: string;
  tipo: TipoSubsanacion;
  oferta: { id: string; numero: number; nombre: string } | null;
  presentadoPor: string;
  identificacion: string | null;
  fechaPresentacion: string;
  /** Extemporáneo no es rechazado: quien decide si lo acepta es la entidad. */
  extemporanea: boolean;
  asunto: string;
  contenido: string;
  soporte: { id: string; nombre: string; archivoUrl: string } | null;
  respuesta: string | null;
  respuestaDocumento: { id: string; nombre: string; archivoUrl: string } | null;
  aceptada: boolean | null;
  respondidaPor: string | null;
  respondidaAt: string | null;
  registradoPor: string | null;
  registradoAt: string;
}

export interface EstadoSubsanaciones {
  aplica: boolean;
  motivoNoAplica: string | null;
  trasladado: boolean;
  informeId?: string;
  venceEl: string | null;
  enTermino: boolean;
  puedeRegistrar: boolean;
  pendientesDeRespuesta?: number;
  terminoVencido?: boolean;
  puedeCerrar?: boolean;
  /** Una subsanación aceptada puede obligar al comité a rectificar (6.3). */
  requiereRectificacion?: boolean;
  subsanaciones: Subsanacion[];
}

/** Lo que el gestor transcribe de lo que presentó un oferente. */
export interface RegistrarSubsanacion {
  oferenteId: string;
  tipo: TipoSubsanacion;
  presentadoPor: string;
  identificacion?: string;
  fechaPresentacion: string;
  asunto: string;
  contenido: string;
}
