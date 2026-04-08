/**
 * ═══════════════════════════════════════════════════════════════════════
 * TIPOS DE DOCUMENTOS - CONTROL INTERNO DISCIPLINARIO
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Interfaces y tipos unificados para todos los documentos del módulo
 * con soporte para nomenclatura única
 */

import { TipoDocumento, DocumentoNomenclatura } from './nomenclaturaDocumentos';

// ==================== INTERFACES BASE ====================
export interface DocumentoBase {
  id: string;
  nomenclatura: string; // ✅ NUEVO: Nomenclatura única (AUT-001-2025, OF-001-2025, etc)
  tipo: TipoDocumento;
  titulo: string;
  fechaCreacion: string;
  fechaModificacion?: string;
  usuarioCreador: string;
  procesoId: string;
  numeroProceso: string;
  estado: 'borrador' | 'revision' | 'aprobado' | 'notificado' | 'ejecutoriado' | 'rechazado';
  version: number;
  observaciones?: string;
  archivoUrl?: string;
  nombreArchivo?: string;
  tamañoArchivo?: string;
  metadata?: Record<string, any>;
}

// ==================== AUTO ====================
export interface Auto extends DocumentoBase {
  tipo: 'AUTO';
  tipoAuto: TipoAuto;
  etapaAsociada: EtapaProceso;
  contenido: string;
  firmadoPor?: string;
  fechaFirma?: string;
  fechaNotificacion?: string;
  notificadoA?: string[];
  ejecutoriado: boolean;
  fechaEjecutoria?: string;
  plantillaUtilizada?: string;
}

export type TipoAuto = 
  | 'Apertura de Investigación'
  | 'Indagación Preliminar'
  | 'Formulación de Cargos'
  | 'Archivo Definitivo'
  | 'Archivo Temporal'
  | 'Inhibitorio'
  | 'Apertura de Pruebas'
  | 'Cierre de Instrucción'
  | 'Fallo con Sanción'
  | 'Fallo Absolutorio'
  | 'Otro';

// ==================== OFICIO ====================
export interface Oficio extends DocumentoBase {
  tipo: 'OFICIO';
  tipoOficio: TipoOficio;
  destinatario: Destinatario;
  asunto: string;
  contenido: string;
  adjuntos?: Adjunto[];
  radicadoSalida?: string;
  fechaRadicado?: string;
  medioEnvio: 'Correo Electrónico' | 'Físico' | 'Correo Certificado' | 'Notificación Personal';
  fechaEnvio?: string;
  acuseRecibo?: string;
  fechaRecibo?: string;
  respuestaRequerida: boolean;
  fechaLimiteRespuesta?: string;
}

export type TipoOficio = 
  | 'Solicitud de Información'
  | 'Comunicación de Decisión'
  | 'Notificación'
  | 'Traslado de Competencia'
  | 'Remisión de Documentos'
  | 'Citación'
  | 'Respuesta a Solicitud'
  | 'Otro';

export interface Destinatario {
  nombre: string;
  cargo?: string;
  entidad?: string;
  correo?: string;
  direccion?: string;
  telefono?: string;
}

// ==================== EVIDENCIA ====================
export interface Evidencia extends DocumentoBase {
  tipo: 'EVIDENCIA';
  tipoEvidencia: TipoEvidencia;
  descripcion: string;
  origenEvidencia: OrigenEvidencia;
  cadenasCustodia: CadenaCustodia[];
  etapaRecoleccion: EtapaProceso;
  relevanciaParaCargos: 'Alta' | 'Media' | 'Baja';
  tags?: string[];
  esReservada: boolean;
  motivoReserva?: string;
}

export type TipoEvidencia = 
  | 'Documento Físico'
  | 'Documento Digital'
  | 'Fotografía'
  | 'Video'
  | 'Audio'
  | 'Correo Electrónico'
  | 'Declaración'
  | 'Informe Técnico'
  | 'Testimonio'
  | 'Otro';

export type OrigenEvidencia = 
  | 'Denuncia Inicial'
  | 'Recolección en Campo'
  | 'Solicitud a Terceros'
  | 'Aportada por Investigado'
  | 'Aportada por Testigo'
  | 'Pericia'
  | 'Otro';

export interface CadenaCustodia {
  id: string;
  fechaHora: string;
  accion: 'Recolección' | 'Entrega' | 'Análisis' | 'Archivo' | 'Consulta';
  responsable: string;
  cargo: string;
  observaciones?: string;
}

// ==================== ACTA ====================
export interface Acta extends DocumentoBase {
  tipo: 'ACTA';
  tipoActa: TipoActa;
  fechaReunion: string;
  horaInicio: string;
  horaFin: string;
  lugar: string;
  asistentes: Asistente[];
  temasPrincipales: string[];
  desarrolloReunion: string;
  decisiones: Decision[];
  compromisos?: Compromiso[];
  proximaReunion?: string;
}

export type TipoActa = 
  | 'Diligencia de Descargos'
  | 'Recepción de Pruebas'
  | 'Versión Libre'
  | 'Audiencia Pública'
  | 'Reunión de Comité'
  | 'Notificación Personal'
  | 'Otra';

export interface Asistente {
  id: string;
  nombre: string;
  cargo: string;
  rol: 'Investigado' | 'Apoderado' | 'Testigo' | 'Funcionario OCID' | 'Secretario' | 'Otro';
  firmo: boolean;
  observaciones?: string;
}

export interface Decision {
  id: string;
  descripcion: string;
  responsable?: string;
  fechaLimite?: string;
  cumplida?: boolean;
}

export interface Compromiso {
  id: string;
  descripcion: string;
  responsable: string;
  fechaLimite: string;
  estado: 'Pendiente' | 'En Progreso' | 'Cumplido' | 'Vencido';
}

// ==================== ADJUNTO ====================
export interface Adjunto {
  id: string;
  nombre: string;
  tipo: string;
  tamaño: string;
  url?: string;
  fechaCarga: string;
}

// ==================== ENUMS Y CONSTANTES ====================
export type EtapaProceso = 
  | 'Recepción'
  | 'Valoración'
  | 'Indagación'
  | 'Investigación'
  | 'Cargos'
  | 'Descargos'
  | 'Pruebas'
  | 'Juzgamiento'
  | 'Fallo'
  | 'Segunda Instancia'
  | 'Archivo';

// ==================== HELPER TYPES ====================
/**
 * Colección unificada de todos los tipos de documentos
 */
export type DocumentoDisciplinario = Auto | Oficio | Evidencia | Acta;

/**
 * Filtros para búsqueda de documentos
 */
export interface FiltrosDocumentos {
  tipo?: TipoDocumento[];
  estado?: DocumentoBase['estado'][];
  fechaDesde?: string;
  fechaHasta?: string;
  procesoId?: string;
  etapa?: EtapaProceso[];
  busqueda?: string;
}

/**
 * Resultado de búsqueda con metadata
 */
export interface ResultadoBusqueda {
  documentos: DocumentoDisciplinario[];
  total: number;
  pagina: number;
  porPagina: number;
  totalPaginas: number;
}

/**
 * Estadísticas de documentos por tipo
 */
export interface EstadisticasDocumentos {
  totalAutos: number;
  totalOficios: number;
  totalEvidencias: number;
  totalActas: number;
  porEstado: Record<DocumentoBase['estado'], number>;
  porEtapa: Record<EtapaProceso, number>;
}

/**
 * Historial de cambios de un documento
 */
export interface HistorialDocumento {
  id: string;
  documentoId: string;
  fechaHora: string;
  usuario: string;
  accion: 'Creación' | 'Modificación' | 'Aprobación' | 'Rechazo' | 'Notificación' | 'Eliminación';
  camposModificados?: string[];
  descripcion: string;
  versionAnterior?: any;
  versionNueva?: any;
}
