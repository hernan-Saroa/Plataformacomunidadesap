/**
 * TIPOS TYPESCRIPT COMPLETOS - SISTEMA DE GESTIÓN PROFESORAL
 * Basado en: Sistema_Gestion_Profesoral_5_Componentes_V7_Expandido.md
 * Arquitectura_Tecnica_5_Componentes.md
 * 
 * Mapeo 1:1 con esquemas SQL PostgreSQL
 */

// ============================================================================
// COMPONENTE 1: PLANIFICACIÓN ACADÉMICA
// ============================================================================

export type EstadoPeriodo = 'PLANIFICACION' | 'ACTIVO' | 'CERRADO';

export interface PeriodoAcademico {
  id: number;
  codigo: string; // "2025-1", "2025-2"
  nombre: string; // "Primer Semestre 2025"
  anio: number;
  semestre: 1 | 2;
  fecha_inicio: string; // ISO date
  fecha_fin: string;
  fecha_inicio_matriculas?: string;
  fecha_fin_matriculas?: string;
  fecha_inicio_pta?: string;
  fecha_fin_pta?: string;
  estado: EstadoPeriodo;
  created_at: string;
  updated_at: string;
}

export type TipoPrograma = 
  | 'AP'                  // Administración Pública (pregrado)
  | 'ECONOMIA_PUB'        // Economía Pública
  | 'Maestría'            // Maestría
  | 'APT'                 // Administración Pública Territorial (Tecnología)
  | 'ESP'                 // Especialización
  | 'DOCTORADO';          // Doctorado

export interface CatalogoAsignaturas {
  id: number;
  codigo: string;
  nombre: string;
  programa_id: number;
  tipo_programa: TipoPrograma;
  creditos: number;
  horas_clase: number; // GENERATED column
  horas_totales: number; // GENERATED column
  activo: boolean;
  created_at: string;
}

export interface Territorial {
  id: number;
  codigo: string;
  nombre: string;
  ciudad_sede: string;
  director_nombre: string;
  director_email: string;
  activo: boolean;
}

// Cambio de nomenclatura: CETAP → Sede
export interface Sede {
  id: number;
  codigo: string;
  nombre: string;
  territorial_id: number;
  municipio: string;
  direccion: string;
  activo: boolean;
}

// Mantener CETAP como alias para compatibilidad con código existente
export type CETAP = Sede;

export type TipoDocente = 'PTA' | 'CATEDRA';
export type EstadoGrupo = 'PROGRAMADO' | 'ACTIVO' | 'CERRADO' | 'CANCELADO';
export type ModalidadGrupo = 'PRESENCIAL' | 'VIRTUAL' | 'HIBRIDO';

export interface GrupoProgramado {
  id: number;
  periodo_id: number;
  asignatura_id: number;
  territorial_id: number;
  cetap_id: number;
  numero_grupo: number;
  cupo_maximo: number;
  inscritos: number;
  horario: string;
  modalidad: ModalidadGrupo;
  docente_asignado_id?: number;
  tipo_docente?: TipoDocente;
  estado: EstadoGrupo;
  created_at: string;
}

// ============================================================================
// COMPONENTE 2: CONVOCATORIA Y VINCULACIÓN
// ============================================================================

export type TipoConvocatoria = 
  | 'CARRERA_ADMINISTRATIVA'
  | 'OCASIONAL'
  | 'HORA_CATEDRA'
  | 'VISITANTE';

export type EstadoConvocatoria = 
  | 'BORRADOR'
  | 'PUBLICADA'
  | 'ABIERTA'
  | 'EN_EVALUACION'
  | 'CERRADA'
  | 'CANCELADA';

export interface Convocatoria {
  id: number;
  codigo: string;
  nombre: string;
  tipo: TipoConvocatoria;
  fecha_publicacion: string;
  fecha_cierre: string;
  fecha_evaluacion?: string;
  territorial_id?: number;
  perfiles_json: Record<string, any>;
  requisitos_minimos: string;
  estado: EstadoConvocatoria;
  created_at: string;
}

export type EstadoHojaVida = 
  | 'BORRADOR'
  | 'ENVIADA'
  | 'EN_REVISION'
  | 'APROBADA'
  | 'RECHAZADA'
  | 'ELEGIBLE'
  | 'VINCULADO';

export interface HojaVida {
  id: number;
  numero_documento: string;
  tipo_documento: string;
  nombres: string;
  apellidos: string;
  email: string;
  telefono: string;
  direccion: string;
  ciudad: string;
  fecha_nacimiento?: string;
  genero: string;
  estado: EstadoHojaVida;
  puntaje_total?: number;
  fecha_ultima_actualizacion: string;
  created_at: string;
}

export type NivelFormacion = 
  | 'PREGRADO'
  | 'ESPECIALIZACION'
  | 'MAESTRIA'
  | 'DOCTORADO';

export interface FormacionAcademica {
  id: number;
  hoja_vida_id: number;
  nivel: NivelFormacion;
  titulo: string;
  institucion: string;
  fecha_grado?: string;
  numero_tarjeta_profesional?: string;
  pais: string;
  validado: boolean;
  soporte_documento_id?: number;
}

export interface ExperienciaDocente {
  id: number;
  hoja_vida_id: number;
  institucion: string;
  cargo: string;
  fecha_inicio: string;
  fecha_fin?: string;
  horas_totales?: number;
  nivel_educativo: string;
  asignaturas: string;
  validado: boolean;
}

export type TipoVinculacion = 
  | 'CARRERA'           // Carrera Nivel 1 o 2
  | 'OCASIONAL'         // Hasta 1 año
  | 'PERIODO_PRUEBA'    // 6 meses
  | 'HORA_CATEDRA'      // Por periodo
  | 'VISITANTE';        // Específica

export type Dedicacion = 'TC' | 'MT';  // Tiempo Completo / Medio Tiempo

export type EstadoResolucion = 'VIGENTE' | 'VENCIDA' | 'ANULADA';

export interface ResolucionVinculacion {
  id: number;
  numero_resolucion: string;
  fecha_resolucion: string;
  docente_id: number;
  tipo_vinculacion: TipoVinculacion;
  dedicacion: Dedicacion;
  fecha_inicio: string;
  fecha_fin?: string;
  horas_base: number;
  salario_base: number;
  territorial_id: number;
  estado: EstadoResolucion;
  requiere_pta: boolean; // GENERATED column
  observaciones?: string;
  created_at: string;
}

export type EstadoDocente = 'ACTIVO' | 'INACTIVO' | 'SUSPENDIDO' | 'RETIRADO';

export interface Docente {
  id: number;
  hoja_vida_id: number;
  codigo_docente: string;
  numero_documento: string;
  nombres: string;
  apellidos: string;
  email_institucional: string;
  tipo_vinculacion_actual: TipoVinculacion;
  estado: EstadoDocente;
  fecha_primera_vinculacion: string;
  created_at: string;
}

// ============================================================================
// COMPONENTE 3: PLAN DE TRABAJO ACADÉMICO (PTA)
// ============================================================================

export type EstadoPTA = 
  | 'EN_CONSTRUCCION'
  | 'EN_APROBACION'
  | 'DEVUELTO_AJUSTES'
  | 'APROBADO'
  | 'EN_FIRME';

export interface PlanTrabajoAcademico {
  id: number;
  codigo: string;
  docente_id: number;
  periodo_academico_id: number;
  resolucion_id: number;
  
  // Snapshot del docente
  tipo_vinculacion: TipoVinculacion;
  dedicacion: Dedicacion;
  horas_base: number;
  territorial_id: number;
  facultad_id: number;
  programa_id: number;
  jefe_inmediato_id: number;
  
  // Totales calculados ANTES de prorrateo
  total_docencia: number;
  total_investigacion: number;
  total_extension: number;
  total_complementarias: number;
  total_general: number;
  
  // Totales DESPUÉS de prorrateo
  docencia_final: number;
  investigacion_final: number;
  extension_final: number;
  complementarias_final: number;
  
  // Estado y flujo
  estado: EstadoPTA;
  fecha_envio?: string;
  fecha_aprobacion?: string;
  fecha_firma?: string;
  
  // Aprobaciones por componente
  docencia_aprobada: boolean;
  docencia_aprobada_por?: number;
  docencia_aprobada_fecha?: string;
  
  investigacion_aprobada: boolean;
  investigacion_aprobada_por?: number;
  investigacion_aprobada_fecha?: string;
  
  extension_aprobada: boolean;
  extension_aprobada_por?: number;
  extension_aprobada_fecha?: string;
  
  complementarias_aprobada: boolean;
  complementarias_aprobada_por?: number;
  complementarias_aprobada_fecha?: string;
  
  observaciones?: string;
  created_at: string;
  updated_at: string;
}

export interface PTADocencia {
  id: number;
  pta_id: number;
  orden: number;
  
  territorial_id: number;
  cetap_id?: number;
  asignatura_id: number;
  periodo: string;
  
  // Datos calculados
  programa: string;
  creditos: number;
  numero_grupos: number;
  horas_clase: number;
  horas_totales: number;
  
  fecha_inicio?: string;
  fecha_fin?: string;
  horario?: string;
  observaciones?: string;
  created_at: string;
}

export type TipoInvestigacionPTA = 'PROYECTO_FORMAL' | 'NECESIDAD_SERVICIO';
export type RolInvestigacion = 'LIDER' | 'COINVESTIGADOR' | 'ASISTENTE';

export interface PTAInvestigacion {
  id: number;
  pta_id: number;
  tipo: TipoInvestigacionPTA;
  
  // Para Proyecto Formal
  nombre_proyecto?: string;
  codigo_siiu?: string;
  rol?: RolInvestigacion;
  porcentaje_dedicacion?: number;
  
  // Para Necesidad del Servicio
  actividad_id?: number;
  descripcion_actividad?: string;
  cantidad?: number;
  
  // Común
  horas_asignadas: number;
  fecha_inicio?: string;
  fecha_fin?: string;
  observaciones?: string;
  created_at: string;
}

export type SeccionExtension = 1 | 2 | 3 | 4 | 5;

export interface PTAExtension {
  id: number;
  pta_id: number;
  seccion: SeccionExtension;
  
  actividad_id?: number;
  nombre_actividad: string;
  entidad_beneficiaria?: string;
  cantidad: number;
  horas_unitarias: number;
  horas_totales: number;
  
  fecha_inicio?: string;
  fecha_fin?: string;
  observaciones?: string;
  created_at: string;
}

export interface PTAComplementarias {
  id: number;
  pta_id: number;
  
  actividad_id: number;
  descripcion?: string;
  cantidad: number;
  horas_unitarias: number;
  horas_totales: number;
  
  fecha_inicio?: string;
  fecha_fin?: string;
  observaciones?: string;
  created_at: string;
}

export interface ActividadComplementaria {
  id: number;
  codigo: string;
  nombre: string;
  horas_base: number;
  criterio: string;
  es_doctorado: boolean;
  activo: boolean;
  circular_referencia?: string;
}

export interface PTAHistorialEstado {
  id: number;
  pta_id: number;
  estado_anterior?: EstadoPTA;
  estado_nuevo: EstadoPTA;
  usuario_id: number;
  observaciones?: string;
  created_at: string;
}

// ============================================================================
// COMPONENTE 4: GESTIÓN DOCENTES HORA CÁTEDRA
// ============================================================================

export interface ResolucionCatedra {
  id: number;
  numero_resolucion: string;
  fecha_resolucion: string;
  docente_id: number;
  periodo_academico_id: number;
  territorial_id: number;
  
  fecha_inicio: string;
  fecha_fin: string;
  
  total_horas: number;
  valor_hora: number;
  valor_total: number; // GENERATED column
  
  estado: EstadoResolucion;
  observaciones?: string;
  created_at: string;
}

export type EstadoAsignacion = 'ACTIVA' | 'COMPLETADA' | 'CANCELADA';

export interface AsignacionCatedra {
  id: number;
  resolucion_catedra_id: number;
  grupo_id: number;
  asignatura_id: number;
  
  horas_contratadas: number;
  horario: string;
  modalidad: ModalidadGrupo;
  
  // Control
  horas_dictadas: number;
  horas_canceladas: number;
  porcentaje_cumplimiento: number;
  
  estado: EstadoAsignacion;
  created_at: string;
}

export type EstadoRegistroHoras = 'PROGRAMADA' | 'DICTADA' | 'CANCELADA';

export interface RegistroHorasCatedra {
  id: number;
  asignacion_id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  horas_efectivas: number;
  
  tipo: ModalidadGrupo;
  estado: EstadoRegistroHoras;
  tema_clase?: string;
  observaciones?: string;
  
  validado_por?: number;
  fecha_validacion?: string;
  created_at: string;
}

export type EstadoLiquidacion = 'PENDIENTE' | 'APROBADA' | 'PAGADA' | 'RECHAZADA';

export interface LiquidacionCatedra {
  id: number;
  resolucion_catedra_id: number;
  mes: number;
  anio: number;
  
  horas_programadas: number;
  horas_dictadas: number;
  horas_canceladas: number;
  horas_a_pagar: number;
  
  valor_hora: number;
  valor_total: number;
  
  estado: EstadoLiquidacion;
  aprobado_por?: number;
  fecha_aprobacion?: string;
  
  created_at: string;
}

// ============================================================================
// COMPONENTE 5: EVALUACIÓN DOCENTE
// ============================================================================

export type TipoEvaluacion = 'PTA' | 'CATEDRA';
export type EstadoEvaluacion = 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADA' | 'CERRADA';

export interface EvaluacionDocente {
  id: number;
  periodo_evaluacion_id: number;
  docente_id: number;
  tipo_evaluacion: TipoEvaluacion;
  
  // Relaciones condicionales
  pta_id?: number; // Si tipo = PTA
  resolucion_catedra_id?: number; // Si tipo = CATEDRA
  
  // Puntajes (0-5)
  puntaje_estudiantes?: number;
  puntaje_autoevaluacion?: number;
  puntaje_jefe_inmediato?: number;
  puntaje_cumplimiento_pta?: number; // Solo PTA
  puntaje_cumplimiento_horas?: number; // Solo CATEDRA
  
  calificacion_final: number;
  porcentaje_cumplimiento?: number;
  
  estado: EstadoEvaluacion;
  fecha_inicio?: string;
  fecha_fin?: string;
  observaciones?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// HELPERS Y UTILIDADES
// ============================================================================

export interface ComponentesPTA {
  docencia: number;
  investigacion: number;
  extension: number;
  complementarias: number;
}

export interface PTACompleto extends PlanTrabajoAcademico {
  docente: Docente;
  periodo: PeriodoAcademico;
  docencias: PTADocencia[];
  investigaciones: PTAInvestigacion[];
  extensiones: PTAExtension[];
  complementarias: PTAComplementarias[];
}

export interface DocenteCompleto extends Docente {
  hoja_vida: HojaVida;
  formacion_academica: FormacionAcademica[];
  experiencia_docente: ExperienciaDocente[];
  resoluciones: ResolucionVinculacion[];
}

// Estadísticas
export interface EstadisticasPTA {
  total_docentes_pta: number;
  ptas_en_construccion: number;
  ptas_en_aprobacion: number;
  ptas_aprobados: number;
  ptas_en_firme: number;
}

export interface EstadisticasCatedra {
  total_docentes_catedra: number;
  horas_contratadas_mes: number;
  horas_dictadas_mes: number;
  porcentaje_cumplimiento: number;
  valor_pendiente_pago: number;
}