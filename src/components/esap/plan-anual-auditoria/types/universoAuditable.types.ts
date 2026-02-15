/**
 * ============================================
 * TYPES - UNIVERSO AUDITABLE
 * ============================================
 * 
 * Definición de las unidades auditables de ESAP
 * Clasificación y priorización según riesgos
 * 
 * ÚLTIMA ACTUALIZACIÓN: 31 Enero 2026
 */

/**
 * ============================================
 * CLASIFICACIÓN DE UNIDADES AUDITABLES
 * ============================================
 */
export type TipoUnidadAuditable =
  | 'Proceso Estratégico'
  | 'Proceso Misional'
  | 'Proceso de Apoyo'
  | 'Proceso de Evaluación'
  | 'Unidad Administrativa'
  | 'Territorial'
  | 'Proyecto'
  | 'Sistema'
  | 'Programa';

export type CategoriaRiesgo =
  | 'Crítico'
  | 'Alto'
  | 'Medio'
  | 'Bajo';

/**
 * ============================================
 * UNIDAD AUDITABLE
 * ============================================
 */
export interface UnidadAuditable {
  // Identificación
  id: string;
  codigo: string;                       // UA-001, UA-002, etc.
  nombre: string;
  descripcion: string;
  tipo: TipoUnidadAuditable;

  // Responsable
  responsable: ResponsableUnidad;
  procesoAsociado?: string;             // Nombre del proceso en mapa de procesos

  // Ubicación organizacional
  dependencia: string;                  // Ej: "Vicerrectoría Académica"
  area: string;                         // Ej: "Gestión Curricular"
  sede?: string;                        // Ej: "Bogotá", "Territorial"

  // Recursos
  presupuestoAnual: number;             // En pesos colombianos
  numeroEmpleados: number;
  activos: ActivosUnidad;

  // Características operacionales
  objetivos: string[];
  funciones: string[];
  servicios: string[];
  parteInteresadas: string[];

  // Ciclo de auditoría
  ultimaAuditoria?: AuditoriaHistorico;
  frecuenciaAuditoriaRecomendada: FrecuenciaAuditoria;
  prioridadAuditoria: number;           // 1-10 (calculado con DAFP)

  // Estado
  activa: boolean;
  observaciones: string;
}

/**
 * ============================================
 * RESPONSABLE DE UNIDAD
 * ============================================
 */
export interface ResponsableUnidad {
  nombre: string;
  cargo: string;
  email: string;
  telefono?: string;
  fechaAsignacion: string;
}

/**
 * ============================================
 * ACTIVOS DE LA UNIDAD
 * ============================================
 */
export interface ActivosUnidad {
  // Tecnológicos
  sistemasInformaticos: string[];       // Ej: ["SIGIA", "MOODLE"]
  infraestructuraTI: string;            // Descripción general

  // Físicos
  inmuebles: string[];
  vehiculos: number;
  equipos: string;                      // Descripción general

  // Financieros
  cuentasBancarias: number;
  fondosPropios: number;

  // Documentales
  archivos: string;                     // Descripción de archivos críticos
  baseDatos: string[];                  // Bases de datos manejadas
}

/**
 * ============================================
 * AUDITORÍA HISTÓRICA
 * ============================================
 */
export interface AuditoriaHistorico {
  fecha: string;
  tipo: TipoAuditoria;
  responsable: string;
  resultado: ResultadoAuditoria;
  hallazgosSignificativos: number;
  hallazgosCriticos: number;
  planMejoramiento: boolean;
  estadoPlanMejoramiento?: EstadoPlanMejoramiento;
}

export type TipoAuditoria =
  | 'Auditoría Interna'
  | 'Auditoría Externa'
  | 'Auditoría Especial'
  | 'Auditoría de Cumplimiento'
  | 'Auditoría de Desempeño'
  | 'Revisión de Control';

export type ResultadoAuditoria =
  | 'Favorable'
  | 'Favorable con Observaciones'
  | 'Con Hallazgos'
  | 'Desfavorable';

export type EstadoPlanMejoramiento =
  | 'No Aplica'
  | 'En Construcción'
  | 'En Ejecución'
  | 'Cerrado'
  | 'Vencido';

/**
 * ============================================
 * FRECUENCIA DE AUDITORÍA
 * ============================================
 */
export type FrecuenciaAuditoria =
  | 'Anual'
  | 'Bianual'
  | 'Trienal'
  | 'Según Riesgo'
  | 'Especial';

/**
 * ============================================
 * UNIVERSO AUDITABLE COMPLETO
 * ============================================
 */
export interface UniversoAuditable {
  id: string;
  vigencia: number;
  fechaActualizacion: string;
  actualizadoPor: string;

  // Unidades
  unidades: UnidadAuditable[];
  totalUnidades: number;

  // Clasificación
  unidadesPorTipo: ClasificacionUnidades;
  unidadesPorRiesgo: ClasificacionRiesgo;

  // Cobertura
  coberturaAuditoriaPlanificada: number;    // Porcentaje 0-100
  unidadesIncluidas: string[];              // IDs unidades en PAI
  unidadesExcluidas: string[];              // IDs unidades no incluidas
  justificacionExclusiones: { [unidadId: string]: string };

  // Estadísticas
  estadisticas: EstadisticasUniverso;
}

export interface ClasificacionUnidades {
  'Proceso Estratégico': number;
  'Proceso Misional': number;
  'Proceso de Apoyo': number;
  'Proceso de Evaluación': number;
  'Unidad Administrativa': number;
  'Territorial': number;
  'Proyecto': number;
  'Sistema': number;
  'Programa': number;
}

export interface ClasificacionRiesgo {
  'Crítico': number;
  'Alto': number;
  'Medio': number;
  'Bajo': number;
}

export interface EstadisticasUniverso {
  presupuestoTotal: number;
  empleadosTotal: number;
  unidadesActivas: number;
  unidadesInactivas: number;
  unidadesAuditadasUltimoAño: number;
  unidadesSinAuditar: number;
  promedioFrecuenciaAuditoria: number;  // En años
}

/**
 * ============================================
 * MATRIZ DE COBERTURA
 * ============================================
 */
export interface MatrizCobertura {
  vigencia: number;
  unidadesAuditables: number;
  unidadesProgramadas: number;
  porcentajeCobertura: number;

  // Detalle por categoría de riesgo
  coberturaPorRiesgo: {
    categoria: CategoriaRiesgo;
    total: number;
    programadas: number;
    porcentaje: number;
  }[];

  // Detalle por tipo
  coberturaPorTipo: {
    tipo: TipoUnidadAuditable;
    total: number;
    programadas: number;
    porcentaje: number;
  }[];
}

/**
 * ============================================
 * HELPERS DE CREACIÓN
 * ============================================
 */
export interface CrearUnidadAuditableInput {
  nombre: string;
  descripcion: string;
  tipo: TipoUnidadAuditable;
  responsable: ResponsableUnidad;
  dependencia: string;
  area: string;
  presupuestoAnual: number;
  numeroEmpleados: number;
  objetivos: string[];
  funciones: string[];
}

export interface ActualizarUnidadAuditableInput {
  id: string;
  nombre?: string;
  descripcion?: string;
  responsable?: ResponsableUnidad;
  presupuestoAnual?: number;
  numeroEmpleados?: number;
  activa?: boolean;
  observaciones?: string;
}

/**
 * ============================================
 * FILTROS Y BÚSQUEDA
 * ============================================
 */
export interface FiltrosUnidadAuditable {
  tipos?: TipoUnidadAuditable[];
  riesgos?: CategoriaRiesgo[];
  dependencias?: string[];
  sedes?: string[];
  activas?: boolean;
  conAuditoriaReciente?: boolean;
  busqueda?: string;
}

/**
 * ============================================
 * ANÁLISIS Y REPORTES
 * ============================================
 */
export interface AnalisisUniversoAuditable {
  fecha: string;
  analista: string;

  // Hallazgos
  unidadesSinAuditarPorMasDe2Anos: UnidadAuditable[];
  unidadesRiesgoCriticoSinCobertura: UnidadAuditable[];
  unidadesConPresupuestoSignificativo: UnidadAuditable[];

  // Recomendaciones
  recomendacionesCobertura: string[];
  recomendacionesPriorización: string[];

  // Brechas
  brechaCoberturaActual: number;        // Porcentaje faltante
  unidadesRecomendadasProximaVigencia: string[];
}

/**
 * ============================================
 * GUARDS (Type Guards)
 * ============================================
 */
export function esUnidadCritica(unidad: UnidadAuditable): boolean {
  return unidad.presupuestoAnual > 1000000000 || // > 1.000M
    unidad.tipo === 'Proceso Estratégico' ||
    unidad.tipo === 'Proceso Misional';
}

export function requiereAuditoriaPronto(unidad: UnidadAuditable): boolean {
  if (!unidad.ultimaAuditoria) return true;

  const fechaUltima = new Date(unidad.ultimaAuditoria.fecha);
  const hoy = new Date();
  const diasTranscurridos = Math.floor((hoy.getTime() - fechaUltima.getTime()) / (1000 * 60 * 60 * 24));

  // Más de 2 años sin auditar
  return diasTranscurridos > 730;
}

export function tieneHallazgosPendientes(unidad: UnidadAuditable): boolean {
  return unidad.ultimaAuditoria?.planMejoramiento === true &&
    unidad.ultimaAuditoria?.estadoPlanMejoramiento === 'En Ejecución';
}
