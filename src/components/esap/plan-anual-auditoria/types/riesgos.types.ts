/**
 * ============================================
 * TYPES - EVALUACIÓN DE RIESGOS DAFP
 * ============================================
 * 
 * Metodología oficial DAFP para priorización
 * de auditorías basada en riesgos
 * 
 * Fórmula Oficial DAFP:
 * Score = (Materialidad × 0.30) + (Impacto × 0.35) + 
 *         (Vulnerabilidad × 0.25) + (Reincidencia × 0.10)
 * 
 * ÚLTIMA ACTUALIZACIÓN: 31 Enero 2026
 */

/**
 * ============================================
 * CRITERIOS DAFP (4 CRITERIOS OFICIALES)
 * ============================================
 */

// Escala 1-5 para cada criterio
export type EscalaDAFP = 1 | 2 | 3 | 4 | 5;

/**
 * CRITERIO 1: MATERIALIDAD
 * Importancia económica o presupuestal
 */
export interface MaterialidadDAFP {
  valor: EscalaDAFP;
  justificacion: string;
  
  // Detalles
  presupuestoAsignado: number;
  porcentajePresupuestoTotal: number;
  recursosCriticos: string[];
  activosSignificativos: string[];
}

/**
 * CRITERIO 2: IMPACTO
 * Efecto en objetivos estratégicos y misionales
 */
export interface ImpactoDAFP {
  valor: EscalaDAFP;
  justificacion: string;
  
  // Detalles
  objetivosAfectados: string[];
  procesosImpactados: string[];
  serviciosAfectados: string[];
  partesInteresadasImpactadas: string[];
  nivelImpactoReputacional: 'Bajo' | 'Medio' | 'Alto' | 'Crítico';
}

/**
 * CRITERIO 3: VULNERABILIDAD
 * Debilidad de controles internos existentes
 */
export interface VulnerabilidadDAFP {
  valor: EscalaDAFP;
  justificacion: string;
  
  // Detalles
  controlesExistentes: ControlInterno[];
  brechasIdentificadas: string[];
  incidentesPrevios: IncidentePrevio[];
  evaluacionControles: EvaluacionControles;
}

export interface ControlInterno {
  nombre: string;
  tipo: 'Preventivo' | 'Detectivo' | 'Correctivo';
  efectividad: 'Efectivo' | 'Parcial' | 'Inefectivo' | 'No Existe';
  frecuencia: 'Continuo' | 'Diario' | 'Semanal' | 'Mensual' | 'Trimestral' | 'Anual';
  responsable: string;
}

export interface IncidentePrevio {
  fecha: string;
  descripcion: string;
  impacto: 'Bajo' | 'Medio' | 'Alto' | 'Crítico';
  resuelto: boolean;
}

export interface EvaluacionControles {
  disenoAdecuado: boolean;
  implementacionEfectiva: boolean;
  documentacionCompleta: boolean;
  monitoreoRegular: boolean;
  puntajeGeneral: number;              // 0-100
}

/**
 * CRITERIO 4: REINCIDENCIA
 * Historial de hallazgos de auditorías anteriores
 */
export interface ReincidenciaDAFP {
  valor: EscalaDAFP;
  justificacion: string;
  
  // Detalles
  auditoriasPrevias: number;
  hallazgosAnteriores: HallazgoAnterior[];
  hallazgosRecurrentes: number;
  hallazgosCriticos: number;
  planesMejoramientoAbiertos: number;
  cumplimientoPlanesMejora: number;     // Porcentaje 0-100
}

export interface HallazgoAnterior {
  fecha: string;
  tipo: TipoHallazgo;
  descripcion: string;
  severidad: SeveridadHallazgo;
  resuelto: boolean;
  accionesTomadas: string[];
  recurrente: boolean;
}

export type TipoHallazgo = 
  | 'Administrativo'
  | 'Financiero'
  | 'Operacional'
  | 'Cumplimiento'
  | 'Tecnológico'
  | 'Documental'
  | 'Ético';

export type SeveridadHallazgo = 
  | 'Baja'
  | 'Media'
  | 'Alta'
  | 'Crítica';

/**
 * ============================================
 * EVALUACIÓN DE RIESGOS COMPLETA
 * ============================================
 */
export interface EvaluacionRiesgoDAFP {
  id: string;
  unidadAuditableId: string;
  unidadAuditableNombre: string;
  vigencia: number;
  fecha: string;
  evaluador: string;
  
  // 4 Criterios DAFP
  materialidad: MaterialidadDAFP;
  impacto: ImpactoDAFP;
  vulnerabilidad: VulnerabilidadDAFP;
  reincidencia: ReincidenciaDAFP;
  
  // Cálculo oficial
  puntajeTotal: number;                 // 0-5 (con decimales)
  categoriaRiesgo: CategoriaRiesgoDAFP;
  prioridad: number;                    // 1-N (ranking relativo)
  
  // Recomendaciones
  recomendacionAuditoria: RecomendacionAuditoria;
  justificacionRecomendacion: string;
  
  // Análisis adicional
  riesgosIdentificados: RiesgoIdentificado[];
  estrategiaMitigacion: string;
  
  // Metadata
  validadoPor?: string;
  fechaValidacion?: string;
  observaciones: string;
}

/**
 * ============================================
 * PONDERACIONES OFICIALES DAFP
 * ============================================
 */
export const PONDERACIONES_DAFP = {
  MATERIALIDAD: 0.30,      // 30%
  IMPACTO: 0.35,           // 35%
  VULNERABILIDAD: 0.25,    // 25%
  REINCIDENCIA: 0.10       // 10%
} as const;

/**
 * ============================================
 * CATEGORÍAS DE RIESGO DAFP
 * ============================================
 */
export type CategoriaRiesgoDAFP = 
  | 'Crítico'              // >= 4.0
  | 'Alto'                 // >= 3.0 y < 4.0
  | 'Medio'                // >= 2.0 y < 3.0
  | 'Bajo';                // < 2.0

/**
 * ============================================
 * RECOMENDACIÓN DE AUDITORÍA
 * ============================================
 */
export type RecomendacionAuditoria = 
  | 'Auditoría Urgente'              // Crítico - Inmediato
  | 'Auditoría Prioritaria'          // Alto - Dentro de 3 meses
  | 'Auditoría Programada'           // Medio - Dentro de 6 meses
  | 'Auditoría No Prioritaria'       // Bajo - Según disponibilidad
  | 'Monitoreo Continuo';            // Bajo - Solo seguimiento

/**
 * ============================================
 * RIESGO IDENTIFICADO
 * ============================================
 */
export interface RiesgoIdentificado {
  id: string;
  descripcion: string;
  categoria: CategoriaRiesgo;
  probabilidad: 'Baja' | 'Media' | 'Alta' | 'Muy Alta';
  impacto: 'Bajo' | 'Medio' | 'Alto' | 'Crítico';
  nivelRiesgo: 'Bajo' | 'Moderado' | 'Alto' | 'Extremo';
  
  // Controles
  controlesExistentes: string[];
  controlesRecomendados: string[];
  
  // Tratamiento
  tratamiento: TratamientoRiesgo;
  responsable: string;
  fechaLimite?: string;
}

export type TratamientoRiesgo = 
  | 'Aceptar'
  | 'Mitigar'
  | 'Transferir'
  | 'Evitar';

export type CategoriaRiesgo = 
  | 'Estratégico'
  | 'Operacional'
  | 'Financiero'
  | 'Cumplimiento'
  | 'Tecnológico'
  | 'Reputacional'
  | 'Corrupción'
  | 'Seguridad';

/**
 * ============================================
 * MATRIZ DE RIESGOS
 * ============================================
 */
export interface MatrizRiesgos {
  vigencia: number;
  fechaActualizacion: string;
  
  // Evaluaciones
  evaluaciones: EvaluacionRiesgoDAFP[];
  totalUnidadesEvaluadas: number;
  
  // Distribución
  distribucionPorCategoria: {
    categoria: CategoriaRiesgoDAFP;
    cantidad: number;
    porcentaje: number;
  }[];
  
  // Ranking
  top10RiesgosCriticos: EvaluacionRiesgoDAFP[];
  
  // Cobertura recomendada
  coberturaRecomendada: CoberturaRecomendada;
}

export interface CoberturaRecomendada {
  unidadesCriticas: string[];          // Auditar 100%
  unidadesAltas: string[];             // Auditar 70%
  unidadesMedias: string[];            // Auditar 30%
  unidadesBajas: string[];             // Monitoreo 10%
  
  totalRecomendado: number;
  porcentajeCoberturaTotal: number;
}

/**
 * ============================================
 * HELPERS DE CÁLCULO
 * ============================================
 */

/**
 * Calcular puntaje total según fórmula DAFP
 */
export function calcularPuntajeDAFP(evaluacion: {
  materialidad: EscalaDAFP;
  impacto: EscalaDAFP;
  vulnerabilidad: EscalaDAFP;
  reincidencia: EscalaDAFP;
}): number {
  return (
    evaluacion.materialidad * PONDERACIONES_DAFP.MATERIALIDAD +
    evaluacion.impacto * PONDERACIONES_DAFP.IMPACTO +
    evaluacion.vulnerabilidad * PONDERACIONES_DAFP.VULNERABILIDAD +
    evaluacion.reincidencia * PONDERACIONES_DAFP.REINCIDENCIA
  );
}

/**
 * Determinar categoría de riesgo según puntaje
 */
export function determinarCategoriaRiesgo(puntaje: number): CategoriaRiesgoDAFP {
  if (puntaje >= 4.0) return 'Crítico';
  if (puntaje >= 3.0) return 'Alto';
  if (puntaje >= 2.0) return 'Medio';
  return 'Bajo';
}

/**
 * Generar recomendación de auditoría
 */
export function generarRecomendacionAuditoria(
  categoria: CategoriaRiesgoDAFP
): RecomendacionAuditoria {
  switch (categoria) {
    case 'Crítico':
      return 'Auditoría Urgente';
    case 'Alto':
      return 'Auditoría Prioritaria';
    case 'Medio':
      return 'Auditoría Programada';
    case 'Bajo':
      return 'Auditoría No Prioritaria';
  }
}

/**
 * Validar consistencia de evaluación
 */
export function validarEvaluacionDAFP(
  evaluacion: EvaluacionRiesgoDAFP
): { valida: boolean; errores: string[] } {
  const errores: string[] = [];
  
  // Validar rangos
  if (evaluacion.materialidad.valor < 1 || evaluacion.materialidad.valor > 5) {
    errores.push('Materialidad fuera de rango (1-5)');
  }
  
  if (evaluacion.impacto.valor < 1 || evaluacion.impacto.valor > 5) {
    errores.push('Impacto fuera de rango (1-5)');
  }
  
  if (evaluacion.vulnerabilidad.valor < 1 || evaluacion.vulnerabilidad.valor > 5) {
    errores.push('Vulnerabilidad fuera de rango (1-5)');
  }
  
  if (evaluacion.reincidencia.valor < 1 || evaluacion.reincidencia.valor > 5) {
    errores.push('Reincidencia fuera de rango (1-5)');
  }
  
  // Validar justificaciones
  if (!evaluacion.materialidad.justificacion) {
    errores.push('Falta justificación de Materialidad');
  }
  
  if (!evaluacion.impacto.justificacion) {
    errores.push('Falta justificación de Impacto');
  }
  
  if (!evaluacion.vulnerabilidad.justificacion) {
    errores.push('Falta justificación de Vulnerabilidad');
  }
  
  if (!evaluacion.reincidencia.justificacion) {
    errores.push('Falta justificación de Reincidencia');
  }
  
  // Validar cálculo
  const puntajeCalculado = calcularPuntajeDAFP({
    materialidad: evaluacion.materialidad.valor,
    impacto: evaluacion.impacto.valor,
    vulnerabilidad: evaluacion.vulnerabilidad.valor,
    reincidencia: evaluacion.reincidencia.valor
  });
  
  if (Math.abs(puntajeCalculado - evaluacion.puntajeTotal) > 0.01) {
    errores.push('Puntaje total no coincide con cálculo DAFP');
  }
  
  return {
    valida: errores.length === 0,
    errores
  };
}

/**
 * ============================================
 * INPUTS PARA CREACIÓN
 * ============================================
 */
export interface CrearEvaluacionRiesgoInput {
  unidadAuditableId: string;
  vigencia: number;
  
  materialidad: {
    valor: EscalaDAFP;
    justificacion: string;
    presupuestoAsignado: number;
  };
  
  impacto: {
    valor: EscalaDAFP;
    justificacion: string;
    objetivosAfectados: string[];
  };
  
  vulnerabilidad: {
    valor: EscalaDAFP;
    justificacion: string;
    controlesExistentes: ControlInterno[];
  };
  
  reincidencia: {
    valor: EscalaDAFP;
    justificacion: string;
    hallazgosAnteriores: HallazgoAnterior[];
  };
  
  observaciones?: string;
}

/**
 * ============================================
 * REPORTES Y ANÁLISIS
 * ============================================
 */
export interface ReporteEvaluacionRiesgos {
  vigencia: number;
  fechaGeneracion: string;
  
  resumenGeneral: {
    totalEvaluaciones: number;
    criticos: number;
    altos: number;
    medios: number;
    bajos: number;
  };
  
  top10RiesgosMasAltos: EvaluacionRiesgoDAFP[];
  distribucionPorDependencia: { dependencia: string; promedio: number }[];
  evolucionRiesgos: { vigencia: number; promedio: number }[];
  
  recomendaciones: string[];
}
