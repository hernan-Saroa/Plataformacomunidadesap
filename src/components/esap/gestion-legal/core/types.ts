/**
 * SIGL v5.0 - TypeScript Types
 * Interfaces y tipos centralizados para todo el sistema
 */

// ============================================================================
// TIPOS GENERALES
// ============================================================================

export type ModuloSIGL =
  | 'dashboard'
  | 'defensa-judicial'
  | 'juzgamiento-disciplinario'
  | 'asesoria-juridica'
  | 'buzon-notificaciones'
  | 'terminos-informes'
  | 'organos-control'
  | 'procesos-coactivos'
  | 'buzon-oficina-juridica'
  | 'plan-accion'
  | 'riesgos'
  | 'planes-mejoramiento';

export type EstadoGeneral = 'ACTIVO' | 'ARCHIVADO' | 'CERRADO';

// ============================================================================
// MOD-01: DEFENSA JUDICIAL
// ============================================================================

export type EtapaDefensaJudicial =
  | 'NOTIFICADA'
  | 'CONTESTACIÓN'
  | 'PROBATORIA'
  | 'ALEGATOS'
  | 'SENTENCIA'
  | 'APELACIÓN'
  | 'CUMPLIMIENTO';

export type Jurisdiccion =
  | 'Contencioso Administrativo'
  | 'Ordinaria Civil'
  | 'Laboral'
  | 'Constitucional';

export type MedioControl =
  | 'NRD Art.138'
  | 'Reparación Directa'
  | 'Controversias Contractuales'
  | 'Electoral'
  | 'Tutela'
  | 'Acción Popular'
  | 'Cumplimiento';

export interface ExpedienteJudicial {
  id: string; // "PJ-2025-001"
  tipo: string; // "Nulidad y Restablecimiento del Derecho"
  medioControl: MedioControl;
  jurisdiccion: Jurisdiccion;
  etapa: EtapaDefensaJudicial;
  
  // Partes procesales
  demandante: string;
  apoderado: string;
  juzgado: string;
  radicado: string;
  
  // Financiero
  cuantia: number;
  
  // Términos
  fechaNotificacion: Date;
  diasTotales: number;
  diasRestantes: number;
  
  // Responsable
  abogadoAsignado: string;
  
  // Información adicional
  hechos: string;
  pretensiones: string;
  
  // Documentos y actuaciones
  documentos: Documento[];
  actuaciones: Actuacion[];
  
  // Auditoría
  timeline: EventoTimeline[];
  fechaCreacion: Date;
  fechaActualizacion: Date;
  estado: EstadoGeneral;
}

// ============================================================================
// MOD-02: JUZGAMIENTO DISCIPLINARIO
// ============================================================================

export type EtapaJuzgamientoDisciplinario =
  | 'E1_AVOCAMIENTO'
  | 'E2_DESCARGOS'
  | 'E3_PRUEBAS'
  | 'E4_ALEGATOS'
  | 'E5_FALLO_1I'
  | 'E6_APELACIÓN'
  | 'E7_FALLO_2I';

export type LeyDisciplinaria = 'Ley 734/2002' | 'Ley 1952/2019';

export interface ProcesoDisciplinario {
  id: string; // "PD-2025-001"
  etapa: EtapaJuzgamientoDisciplinario;
  
  // ⚠️ CRÍTICO: Fecha que determina ley aplicable
  fechaHechos: Date;
  leyAplicable: LeyDisciplinaria; // Calculado automáticamente
  
  // Investigado
  investigado: string;
  cargo: string;
  dependencia: string;
  
  // Hechos
  hechos: string;
  faltasCatalogadas: string[];
  
  // Términos (10 días TAXATIVO para descargos)
  fechaInicio: Date;
  diasDescargos: number; // Siempre 10
  diasRestantes: number;
  
  // Responsable
  abogadoAsignado: string;
  
  // Documentos y actuaciones
  documentos: Documento[];
  actuaciones: Actuacion[];
  
  // Auditoría
  timeline: EventoTimeline[];
  fechaCreacion: Date;
  fechaActualizacion: Date;
  estado: EstadoGeneral;
}

// ============================================================================
// MOD-03: ASESORÍA JURÍDICA
// ============================================================================

export type EtapaAsesoriaJuridica = 'RADICADA' | 'ANÁLISIS' | 'RESPUESTA' | 'ENVIADA';

export type TemaJuridico = 
  | 'Contractual' 
  | 'Laboral' 
  | 'Disciplinario' 
  | 'Presupuestal' 
  | 'Administrativo' 
  | 'Otros';

export type PrioridadConsulta = 'URGENTE' | 'ALTA' | 'MEDIA' | 'BAJA';

export interface ConsultaJuridica {
  id: string; // "CJ-2025-001"
  etapa: EtapaAsesoriaJuridica;
  
  // Tema
  temaJuridico: TemaJuridico;
  tema?: string; // Descripción breve del tema
  
  // Solicitante
  solicitante: string;
  funcionarioSolicitante: string;
  
  // Consulta
  consulta: string; // Pregunta o solicitud
  
  // Términos (30 días - Decreto 019/2012)
  fechaRadicacion: Date;
  diasTotales: number; // Generalmente 30
  diasRestantes: number;
  
  // Asignación
  abogadoAsignado: string;
  prioridad: PrioridadConsulta;
  
  // Normativa
  normativaAplicable: string[];
  
  // Respuesta
  respuesta?: string;
  fechaRespuesta?: Date;
  
  // Documentos
  documentosAdjuntos: Documento[];
  
  // Auditoría
  timeline: EventoTimeline[];
  fechaCreacion?: Date;
  fechaActualizacion?: Date;
  estado?: EstadoGeneral;
}

export interface SolicitudAsesoria {
  id: string; // "SA-2025-001"
  etapa: EtapaAsesoriaJuridica;
  
  // Solicitante
  entidadSolicitante: string;
  personaSolicitante: string;
  cargo: string;
  
  // Solicitud
  temaJuridico: string;
  descripcion: string;
  
  // Términos (30 días - Decreto 019/2012)
  fechaRadicacion: Date;
  diasTotales: 30; // Siempre 30
  diasRestantes: number;
  
  // Respuesta
  respuesta?: string;
  abogadoAsignado: string;
  
  // Documentos
  documentos: Documento[];
  
  // Auditoría
  timeline: EventoTimeline[];
  fechaCreacion: Date;
  fechaActualizacion: Date;
  estado: EstadoGeneral;
}

// ============================================================================
// MOD-04: BUZÓN DE NOTIFICACIONES
// ============================================================================

export type EtapaBuzonNotificaciones =
  | 'PENDIENTE_VERIFICACIÓN'
  | 'CLASIFICADA'
  | 'DISTRIBUIDA'
  | 'ARCHIVADA';

export type TipoNotificacion = 'Oficio' | 'Citación' | 'Auto' | 'Sentencia';

export type NivelUrgencia = 'URGENTE' | 'IMPORTANTE' | 'NORMAL';

export interface Notificacion {
  id: string; // "NOT-2025-001"
  tipo: TipoNotificacion;
  etapa: EtapaBuzonNotificaciones;
  
  // Origen
  juzgadoOrigen: string;
  radicadoJuzgado: string;
  
  // Recepción
  fechaRecepcion: Date;
  horaRecepcion: string;
  
  // Urgencia (calculada automáticamente)
  urgencia: NivelUrgencia;
  
  // Asociación
  expedienteRelacionado?: string; // ID del expediente
  moduloDestino?: ModuloSIGL;
  
  // Contenido
  asunto: string;
  observaciones: string;
  
  // Documentos
  documentos: Documento[];
  
  // Auditoría
  timeline: EventoTimeline[];
  fechaCreacion: Date;
  fechaActualizacion: Date;
  estado: EstadoGeneral;
}

// ============================================================================
// MOD-05: TÉRMINOS PARA INFORMES
// ============================================================================

export type EnteControl =
  | 'CONTRALORIA'
  | 'PROCURADURIA'
  | 'ARCHIVO_GENERAL'
  | 'MIN_EDUCACION'
  | 'CONGRESO'
  | 'OTRO';

export type EstadoTermino =
  | 'PENDIENTE'
  | 'EN_PROCESO'
  | 'ENVIADO'
  | 'VENCIDO';

export type PeriodicidadTermino =
  | 'MENSUAL'
  | 'TRIMESTRAL'
  | 'SEMESTRAL'
  | 'ANUAL'
  | 'EVENTUAL';

export interface TerminoInforme {
  id: string;
  codigo: string;
  tipoInforme: string;
  enteControl: EnteControl;
  descripcion: string;
  periodicidad: PeriodicidadTermino;
  baseNormativa: string;
  fechaVencimiento: Date;
  diasRestantes: number;
  estado: EstadoTermino;
  responsable?: string;
  areaResponsable?: string;
  observaciones?: string;
  documentos?: Documento[];
  timeline?: EventoTimeline[];
}

export type EtapaSolicitudInforme = 
  | 'RECIBIDA'
  | 'EN_ELABORACIÓN'
  | 'REVISIÓN'
  | 'ENVIADO';

export interface SolicitudInforme {
  id: string;
  etapa: EtapaSolicitudInforme;
  tipoInforme: string;
  enteSolicitante: string;
  radicadoExterno: string;
  asunto: string;
  descripcion?: string;
  responsable: string;
  fechaSolicitud: Date;
  fechaVencimiento: Date;
  diasTotales: number;
  diasRestantes: number;
  datosRequeridos?: string[];
  documentos?: Documento[];
  timeline?: EventoTimeline[];
}

export type TipoInforme =
  | 'Informe Pormenorizado'
  | 'Informe Ejecución Presupuestal'
  | 'Informe Gestión Contractual'
  | 'Informe Servicio al Ciudadano'
  | 'Informe PQRS'
  | 'Informe Seguimiento PAC'
  | 'Informe de Empalme'
  | 'Respuesta Derecho de Petición'
  | 'Concepto Jurídico';

// ============================================================================
// TIPOS COMPARTIDOS
// ============================================================================

export interface Documento {
  id: string;
  nombre: string;
  tipo: string; // "PDF", "DOCX", "XLSX", etc.
  tamano: number; // En bytes
  url?: string;
  fechaCarga: Date;
  usuarioCarga: string;
  descripcion?: string;
}

export interface Actuacion {
  id: string;
  tipo: string; // "Presentación Memorial", "Solicitud", "Alegatos", etc.
  descripcion: string;
  fecha: Date;
  usuario: string;
  documentosAdjuntos?: string[]; // IDs de documentos
  observaciones?: string;
}

export type TipoEventoTimeline =
  | 'CREACIÓN'
  | 'CAMBIO_ETAPA'
  | 'CARGA_DOCUMENTO'
  | 'ACTUACIÓN'
  | 'ASIGNACIÓN'
  | 'MODIFICACIÓN'
  | 'COMENTARIO';

export interface EventoTimeline {
  id: string;
  tipo: TipoEventoTimeline;
  descripcion: string;
  fecha: Date;
  usuario: string;
  icono?: string; // Nombre del ícono de Lucide
  color?: string;
  metadata?: Record<string, any>; // Datos adicionales
}

// ============================================================================
// SEMÁFORO
// ============================================================================

export interface SemaforoEstado {
  color: string;
  label: string;
  diasRestantes: number;
  animate: boolean;
}

// ============================================================================
// DASHBOARD
// ============================================================================

export interface MetricaSIGL {
  titulo: string;
  valor: number | string;
  icono?: React.ReactNode;
  color?: string;
  variacion?: {
    valor: number;
    tipo: 'aumento' | 'disminucion';
  };
}

export interface ExpedienteUrgente {
  id: string;
  modulo: ModuloSIGL;
  titulo: string;
  diasRestantes: number;
  responsable: string;
}

// ============================================================================
// FILTROS Y BÚSQUEDA
// ============================================================================

export interface FiltrosSIGL {
  modulo?: ModuloSIGL;
  etapa?: string;
  responsable?: string;
  jurisdiccion?: Jurisdiccion;
  urgencia?: NivelUrgencia;
  fechaDesde?: Date;
  fechaHasta?: Date;
  busqueda?: string;
}

// ============================================================================
// MOD-06: ÓRGANOS DE CONTROL
// ============================================================================

export type OrganismoControl =
  | 'CGR'
  | 'PGN'
  | 'DEFENSORIA'
  | 'PERSONERIA'
  | 'CONTRALORIA_TERRITORIAL'
  | 'OTRO';

export type TipoRequerimientoOrgControl =
  | 'AUDITORIA_CUMPLIMIENTO'
  | 'AUDITORIA_FINANCIERA'
  | 'SOLICITUD_INFORMACION'
  | 'TRASLADO_HALLAZGO'
  | 'FUNCION_PREVENTIVA'
  | 'FUNCION_ADVERTENCIA';

export type EtapaOrgControl =
  | 'RADICADO'
  | 'CLASIFICADO'
  | 'ASIGNADO'
  | 'EN_RESPUESTA'
  | 'CONSOLIDADO'
  | 'REVISION_OJ'
  | 'ENVIADO'
  | 'CERRADO';

export interface RequerimientoOrgControl {
  id: string; // "OC-2025-001"
  etapa: EtapaOrgControl;
  organismo: OrganismoControl;
  tipo: TipoRequerimientoOrgControl;
  radicadoOrganismo: string;
  radicadoESAP: string;
  asunto: string;
  fechaRadicacion: Date;
  diasTotales: number;
  diasRestantes: number;
  dependenciasRequeridas: string[];
  responsable: string;
  documentos: Documento[];
  timeline: EventoTimeline[];
  fechaCreacion: Date;
  fechaActualizacion: Date;
  estado: EstadoGeneral;
}

// ============================================================================
// MOD-07: PROCESOS COACTIVOS
// ============================================================================

export type EtapaProcesoCoactivo =
  | 'IDENTIFICADO'
  | 'PERSUASIVO'
  | 'PREJURIDICO'
  | 'MANDAMIENTO'
  | 'EXCEPCIONES'
  | 'CAUTELARES'
  | 'LIQUIDACION'
  | 'REMATE'
  | 'RECAUDADO';

export type ConceptoCoactivo =
  | 'MATRICULA'
  | 'SANCION'
  | 'MULTA'
  | 'RECUPERACION_RECURSOS'
  | 'OTRO';

export interface ProcesoCoactivo {
  id: string; // "PC-2025-001"
  etapa: EtapaProcesoCoactivo;
  concepto: ConceptoCoactivo;
  deudor: string;
  identificacion: string;
  montoCapital: number;
  montoIntereses: number;
  montoTotal: number;
  fechaObligacion: Date;
  fechaPrescripcion: Date;
  diasPrescripcion: number;
  responsable: string;
  acuerdoPago?: {
    cuotas: number;
    montoCuota: number;
    cuotasPagadas: number;
    estado: 'ACTIVO' | 'INCUMPLIDO' | 'CUMPLIDO';
  };
  documentos: Documento[];
  timeline: EventoTimeline[];
  fechaCreacion: Date;
  fechaActualizacion: Date;
  estado: EstadoGeneral;
}

// ============================================================================
// MOD-08: BUZÓN OFICINA JURÍDICA
// ============================================================================

export type TipoCorreoOJ =
  | 'CONSULTA_INTERNA'
  | 'PQRS_EXTERNO'
  | 'TRASLADO'
  | 'ORG_CONTROL'
  | 'NOT_JUDICIAL'
  | 'OTRO';

export type EtapaBuzonOJ =
  | 'NO_LEIDO'
  | 'CLASIFICADO'
  | 'ASIGNADO'
  | 'EN_PROCESO'
  | 'RESPONDIDO'
  | 'ARCHIVADO';

export type PrioridadCorreo = 'ALTA' | 'MEDIA' | 'BAJA';

export interface CorreoOJ {
  id: string; // "BOJ-2025-001"
  etapa: EtapaBuzonOJ;
  tipo: TipoCorreoOJ;
  de: string;
  asunto: string;
  fechaRecepcion: Date;
  prioridad: PrioridadCorreo;
  diasRestantes: number;
  responsable?: string;
  moduloDestino?: ModuloSIGL;
  expedienteVinculado?: string;
  adjuntos: number;
  contenido: string;
  documentos: Documento[];
  timeline: EventoTimeline[];
  fechaCreacion: Date;
  fechaActualizacion: Date;
  estado: EstadoGeneral;
}

// ============================================================================
// MOD-09: PLAN DE ACCIÓN
// ============================================================================

export type EtapaPlanAccion =
  | 'FORMULACION'
  | 'APROBADO'
  | 'EN_EJECUCION'
  | 'SEGUIMIENTO'
  | 'CERRADO';

export type PeriodicidadIndicador =
  | 'MENSUAL'
  | 'TRIMESTRAL'
  | 'SEMESTRAL'
  | 'ANUAL';

export interface IndicadorPlanAccion {
  id: string; // "IND-2025-001"
  codigo: string;
  nombre: string;
  objetivoPEI: string;
  formula: string;
  meta: number;
  lineaBase: number;
  ejecutado: number;
  cumplimiento: number;
  periodicidad: PeriodicidadIndicador;
  responsable: string;
  etapa: EtapaPlanAccion;
  avances: {
    periodo: string;
    valorEjecutado: number;
    valorProgramado: number;
    cumplimiento: number;
    observaciones: string;
  }[];
  documentos: Documento[];
  timeline: EventoTimeline[];
  fechaCreacion: Date;
  fechaActualizacion: Date;
  estado: EstadoGeneral;
}

// ============================================================================
// MOD-10: RIESGOS
// ============================================================================

export type TipoRiesgo =
  | 'GESTION'
  | 'CORRUPCION'
  | 'SEGURIDAD_DIGITAL'
  | 'FISCAL';

export type ZonaRiesgo =
  | 'EXTREMO'
  | 'ALTO'
  | 'MODERADO'
  | 'BAJO';

export type EtapaRiesgo =
  | 'IDENTIFICADO'
  | 'ANALIZADO'
  | 'VALORADO'
  | 'TRATAMIENTO'
  | 'MONITOREO'
  | 'CERRADO'
  | 'MATERIALIZADO';

export interface Riesgo {
  id: string; // "R-2025-001"
  codigo: string;
  etapa: EtapaRiesgo;
  proceso: string;
  tipo: TipoRiesgo;
  nombre: string;
  descripcion: string;
  causas: string[];
  consecuencias: string[];
  probabilidadInherente: number; // 1-5
  impactoInherente: number; // 1-5
  zonaInherente: ZonaRiesgo;
  probabilidadResidual: number;
  impactoResidual: number;
  zonaResidual: ZonaRiesgo;
  controlesExistentes: {
    id: string;
    descripcion: string;
    efectividad: number;
  }[];
  planTratamiento: {
    accion: string;
    responsable: string;
    fechaLimite: Date;
    estado: 'PENDIENTE' | 'EN_CURSO' | 'COMPLETADA';
    avance: number;
  }[];
  responsable: string;
  documentos: Documento[];
  timeline: EventoTimeline[];
  fechaCreacion: Date;
  fechaActualizacion: Date;
  estado: EstadoGeneral;
}

// ============================================================================
// MOD-11: PLANES DE MEJORAMIENTO
// ============================================================================

export type FuenteHallazgo =
  | 'AUDITORIA_INTERNA'
  | 'CGR'
  | 'AUTOEVALUACION'
  | 'RIESGO_MATERIALIZADO'
  | 'NO_CONFORMIDAD';

export type TipoHallazgo =
  | 'FISCAL'
  | 'ADMINISTRATIVO'
  | 'DISCIPLINARIO'
  | 'OBSERVACION';

export type EtapaPlanMejoramiento =
  | 'IDENTIFICADO'
  | 'FORMULACION'
  | 'APROBADO'
  | 'EN_EJECUCION'
  | 'EVIDENCIAS'
  | 'VERIFICACION'
  | 'CERRADO';

export interface AccionMejora {
  id: string;
  descripcion: string;
  tipo: 'CORRECTIVA' | 'PREVENTIVA' | 'MEJORA_CONTINUA';
  responsable: string;
  fechaInicio: Date;
  fechaFin: Date;
  estado: 'PENDIENTE' | 'EN_CURSO' | 'CERRADA' | 'VENCIDA';
  avance: number;
  evidencias: Documento[];
}

export interface PlanMejoramiento {
  id: string; // "PM-2025-001"
  codigoHallazgo: string;
  etapa: EtapaPlanMejoramiento;
  fuente: FuenteHallazgo;
  tipo: TipoHallazgo;
  auditoriaOrigen: string;
  descripcionHallazgo: string;
  causaRaiz: string;
  fechaHallazgo: Date;
  fechaLimite: Date;
  diasRestantes: number;
  acciones: AccionMejora[];
  avanceGlobal: number;
  responsable: string;
  cuantia?: number;
  documentos: Documento[];
  timeline: EventoTimeline[];
  fechaCreacion: Date;
  fechaActualizacion: Date;
  estado: EstadoGeneral;
}