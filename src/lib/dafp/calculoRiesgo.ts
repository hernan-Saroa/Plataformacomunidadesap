// ==========================================
// MOTOR DE CÁLCULO DEL MODELO DAFP
// Implementa las fórmulas oficiales de la Guía DAFP v4
// ==========================================

import {
  NIVELES_RIESGO,
  UMBRALES_PONDERACION,
  MATRIZ_ROTACION,
  DECISIONES_PLAN,
  type NivelRiesgoDafp,
  type ResultadoAuditoria,
  type DecisionPlan
} from './constants';

/**
 * Datos de entrada para el cálculo de riesgo DAFP
 */
export interface DatosEvaluacionRiesgo {
  // Conteo de riesgos por nivel
  riesgosExtremos: number;
  riesgosAltos: number;
  riesgosModerados: number;
  riesgosBajos: number;
  
  // Factores adicionales (cuestionario)
  requerimientoComite: boolean;
  requerimientoEntesReguladores: boolean;
  
  // Datos de última auditoría
  fechaUltimaAuditoria: Date | null;
  resultadoUltimaAuditoria: ResultadoAuditoria;
  
  // Fecha de corte para cálculo
  fechaCorte: Date;
}

/**
 * Resultado del cálculo de riesgo DAFP
 */
export interface ResultadoCalculoRiesgo {
  // Datos calculados
  totalRiesgos: number;
  ponderacionRiesgo: NivelRiesgoDafp | null;
  diasDesdeUltimaAuditoria: number | null;
  planRotacion: string | null;
  planRotacionDias: number | null;
  decisionRotacion: 'INCLUIR' | 'NO_INCLUIR' | null;
  decisionFinal: DecisionPlan;
  
  // Justificación automática
  motivoInclusion: string;
  
  // Detalle de cálculos para trazabilidad
  detalleCalculo: {
    porcentajeExtremos: number;
    porcentajeExtremosAltos: number;
    porcentajeExtremosAltosModerados: number;
    porcentajeTodos: number;
  };
  
  // Banderas de inclusión automática
  inclusionAutomatica: {
    porComite: boolean;
    porRiesgoExtremo: boolean;
    porEntesReguladores: boolean;
    porRotacion: boolean;
  };
}

/**
 * FUNCIÓN PRINCIPAL: Calcula todos los indicadores de riesgo DAFP
 * 
 * Implementa las fórmulas del modelo DAFP:
 * 1. Ponderación de Riesgo
 * 2. Plan de Rotación
 * 3. Decisión de Inclusión en Plan Anual
 * 
 * @param datos - Datos de entrada de la evaluación
 * @returns Resultado completo del cálculo
 */
export function calcularRiesgoDafp(datos: DatosEvaluacionRiesgo): ResultadoCalculoRiesgo {
  // 1. Calcular total de riesgos
  const totalRiesgos = datos.riesgosExtremos + datos.riesgosAltos + 
                       datos.riesgosModerados + datos.riesgosBajos;
  
  // 2. Calcular ponderación de riesgo
  const { ponderacion, detalleCalculo } = calcularPonderacionRiesgo(
    datos.riesgosExtremos,
    datos.riesgosAltos,
    datos.riesgosModerados,
    datos.riesgosBajos,
    totalRiesgos
  );
  
  // 3. Calcular días desde última auditoría
  const diasDesdeUltimaAuditoria = datos.fechaUltimaAuditoria
    ? calcularDiasTranscurridos(datos.fechaUltimaAuditoria, datos.fechaCorte)
    : null;
  
  // 4. Obtener plan de rotación
  const rotacion = ponderacion
    ? obtenerPlanRotacion(ponderacion, datos.resultadoUltimaAuditoria)
    : null;
  
  // 5. Calcular decisión de rotación
  const decisionRotacion = calcularDecisionRotacion(
    diasDesdeUltimaAuditoria,
    rotacion?.dias ?? null
  );
  
  // 6. Calcular decisión final con reglas de negocio
  const { decision, motivo, banderas } = calcularDecisionFinal(
    datos.requerimientoComite,
    ponderacion,
    datos.requerimientoEntesReguladores,
    decisionRotacion
  );
  
  return {
    totalRiesgos,
    ponderacionRiesgo: ponderacion,
    diasDesdeUltimaAuditoria,
    planRotacion: rotacion?.periodo ?? null,
    planRotacionDias: rotacion?.dias ?? null,
    decisionRotacion,
    decisionFinal: decision,
    motivoInclusion: motivo,
    detalleCalculo,
    inclusionAutomatica: banderas
  };
}

/**
 * FÓRMULA 1: Ponderación de Riesgo del Proceso
 * 
 * Implementa la fórmula DAFP:
 * =IF((Extremos/Total)>=0.2, "Extremo",
 *   IF(((Extremos+Altos)/Total)>=0.3, "Alto",
 *     IF(((Extremos+Altos+Moderados)/Total)>=0.4, "Moderado",
 *       IF((Extremos+Altos+Moderados+Bajos)/Total>=0.5, "Bajo", "Muy Bajo"))))
 * 
 * @param extremos - Cantidad de riesgos extremos
 * @param altos - Cantidad de riesgos altos
 * @param moderados - Cantidad de riesgos moderados
 * @param bajos - Cantidad de riesgos bajos
 * @param total - Total de riesgos
 * @returns Ponderación calculada y detalle de porcentajes
 */
function calcularPonderacionRiesgo(
  extremos: number,
  altos: number,
  moderados: number,
  bajos: number,
  total: number
): { ponderacion: NivelRiesgoDafp | null; detalleCalculo: any } {
  
  // Si no hay riesgos, no se puede calcular
  if (total === 0) {
    return {
      ponderacion: null,
      detalleCalculo: {
        porcentajeExtremos: 0,
        porcentajeExtremosAltos: 0,
        porcentajeExtremosAltosModerados: 0,
        porcentajeTodos: 0
      }
    };
  }
  
  // Calcular porcentajes acumulados
  const porcentajeExtremos = extremos / total;
  const porcentajeExtremosAltos = (extremos + altos) / total;
  const porcentajeExtremosAltosModerados = (extremos + altos + moderados) / total;
  const porcentajeTodos = (extremos + altos + moderados + bajos) / total;
  
  const detalleCalculo = {
    porcentajeExtremos: Math.round(porcentajeExtremos * 100),
    porcentajeExtremosAltos: Math.round(porcentajeExtremosAltos * 100),
    porcentajeExtremosAltosModerados: Math.round(porcentajeExtremosAltosModerados * 100),
    porcentajeTodos: Math.round(porcentajeTodos * 100)
  };
  
  // Aplicar reglas de ponderación en orden jerárquico
  let ponderacion: NivelRiesgoDafp;
  
  if (porcentajeExtremos >= UMBRALES_PONDERACION.EXTREMO.porcentajeExtremos) {
    ponderacion = NIVELES_RIESGO.EXTREMO;
  } else if (porcentajeExtremosAltos >= UMBRALES_PONDERACION.ALTO.porcentajeExtremosAltos) {
    ponderacion = NIVELES_RIESGO.ALTO;
  } else if (porcentajeExtremosAltosModerados >= UMBRALES_PONDERACION.MODERADO.porcentajeExtremosAltosModerados) {
    ponderacion = NIVELES_RIESGO.MODERADO;
  } else if (porcentajeTodos >= UMBRALES_PONDERACION.BAJO.porcentajeTodos) {
    ponderacion = NIVELES_RIESGO.BAJO;
  } else {
    ponderacion = NIVELES_RIESGO.MUY_BAJO;
  }
  
  return { ponderacion, detalleCalculo };
}

/**
 * FÓRMULA 2: Plan de Rotación
 * 
 * Implementa el VLOOKUP de la matriz de rotación:
 * =VLOOKUP(CONCATENATE(Ponderacion, Resultado), MatrizRotacion, 2, 0)
 * 
 * @param ponderacion - Ponderación de riesgo calculada
 * @param resultado - Resultado de la última auditoría
 * @returns Plan de rotación con periodo y días
 */
function obtenerPlanRotacion(
  ponderacion: NivelRiesgoDafp,
  resultado: ResultadoAuditoria
): { periodo: string; dias: number } {
  const matrizNivel = MATRIZ_ROTACION[ponderacion];
  return matrizNivel[resultado] || matrizNivel['SIN_AUDITORIA'];
}

/**
 * Calcula días transcurridos desde última auditoría hasta fecha de corte
 * 
 * @param fechaUltima - Fecha de última auditoría
 * @param fechaCorte - Fecha de corte para el cálculo
 * @returns Número de días transcurridos
 */
function calcularDiasTranscurridos(fechaUltima: Date, fechaCorte: Date): number {
  const diferencia = fechaCorte.getTime() - fechaUltima.getTime();
  return Math.floor(diferencia / (1000 * 60 * 60 * 24));
}

/**
 * FÓRMULA 3: Decisión según Plan de Rotación
 * 
 * Implementa:
 * =IF(DiasTranscurridos > DiasPlanRotacion, "Incluir", "No Incluir")
 * 
 * @param diasTranscurridos - Días desde última auditoría
 * @param diasRotacion - Días del plan de rotación
 * @returns Decisión de inclusión según rotación
 */
function calcularDecisionRotacion(
  diasTranscurridos: number | null,
  diasRotacion: number | null
): 'INCLUIR' | 'NO_INCLUIR' | null {
  if (diasTranscurridos === null || diasRotacion === null) {
    return null;
  }
  return diasTranscurridos > diasRotacion ? 'INCLUIR' : 'NO_INCLUIR';
}

/**
 * FÓRMULA 4: Decisión Final del Plan Anual
 * 
 * Implementa la lógica de decisión jerárquica:
 * =IF(ReqComite="Si", "Incluir en plan anual",
 *   IF(Ponderacion="Extremo", "Incluir en plan anual",
 *     IF(ReqEntesReg="Si", "Incluir en plan anual",
 *       IF(DecisionRotacion="Incluir", "Incluir en plan anual",
 *         "Incluir en auditoría posterior"))))
 * 
 * @param requerimientoComite - Requerimiento del Comité de Auditoría o Dirección
 * @param ponderacion - Ponderación de riesgo calculada
 * @param requerimientoEntesReg - Requerimiento de Entes Reguladores
 * @param decisionRotacion - Decisión según plan de rotación
 * @returns Decisión final, motivo y banderas de inclusión automática
 */
function calcularDecisionFinal(
  requerimientoComite: boolean,
  ponderacion: NivelRiesgoDafp | null,
  requerimientoEntesReg: boolean,
  decisionRotacion: 'INCLUIR' | 'NO_INCLUIR' | null
): { 
  decision: DecisionPlan; 
  motivo: string;
  banderas: {
    porComite: boolean;
    porRiesgoExtremo: boolean;
    porEntesReguladores: boolean;
    porRotacion: boolean;
  };
} {
  
  const banderas = {
    porComite: false,
    porRiesgoExtremo: false,
    porEntesReguladores: false,
    porRotacion: false
  };
  
  // Regla 1: Requerimiento del Comité de Auditoría o Dirección
  if (requerimientoComite) {
    banderas.porComite = true;
    return {
      decision: DECISIONES_PLAN.INCLUIR_PLAN_ANUAL,
      motivo: 'Requerimiento del Comité de Auditoría o Dirección',
      banderas
    };
  }
  
  // Regla 2: Ponderación de riesgo EXTREMO
  if (ponderacion === NIVELES_RIESGO.EXTREMO) {
    banderas.porRiesgoExtremo = true;
    return {
      decision: DECISIONES_PLAN.INCLUIR_PLAN_ANUAL,
      motivo: 'Ponderación de riesgo EXTREMO',
      banderas
    };
  }
  
  // Regla 3: Requerimiento de Entes Reguladores
  if (requerimientoEntesReg) {
    banderas.porEntesReguladores = true;
    return {
      decision: DECISIONES_PLAN.INCLUIR_PLAN_ANUAL,
      motivo: 'Requerimiento de Entes Reguladores',
      banderas
    };
  }
  
  // Regla 4: Según plan de rotación
  if (decisionRotacion === 'INCLUIR') {
    banderas.porRotacion = true;
    return {
      decision: DECISIONES_PLAN.INCLUIR_PLAN_ANUAL,
      motivo: 'Supera período de rotación establecido',
      banderas
    };
  }
  
  // Por defecto: Incluir en auditoría posterior
  return {
    decision: DECISIONES_PLAN.INCLUIR_AUDITORIA_POSTERIOR,
    motivo: 'No cumple criterios de inclusión en Plan Anual vigente',
    banderas
  };
}

/**
 * Valida los datos de entrada antes del cálculo
 * 
 * @param datos - Datos de entrada a validar
 * @returns Objeto con validez y lista de errores
 */
export function validarDatosEvaluacion(datos: DatosEvaluacionRiesgo): {
  valido: boolean;
  errores: string[];
} {
  const errores: string[] = [];
  
  // Validar que los conteos no sean negativos
  if (datos.riesgosExtremos < 0) errores.push('Riesgos extremos no puede ser negativo');
  if (datos.riesgosAltos < 0) errores.push('Riesgos altos no puede ser negativo');
  if (datos.riesgosModerados < 0) errores.push('Riesgos moderados no puede ser negativo');
  if (datos.riesgosBajos < 0) errores.push('Riesgos bajos no puede ser negativo');
  
  // Validar fecha de corte
  if (!datos.fechaCorte || isNaN(datos.fechaCorte.getTime())) {
    errores.push('Fecha de corte es requerida y debe ser válida');
  }
  
  // Validar que fecha última auditoría no sea futura
  if (datos.fechaUltimaAuditoria && datos.fechaCorte) {
    if (datos.fechaUltimaAuditoria > datos.fechaCorte) {
      errores.push('Fecha de última auditoría no puede ser posterior a la fecha de corte');
    }
  }
  
  // Validar que haya al menos un riesgo registrado
  const total = datos.riesgosExtremos + datos.riesgosAltos + 
                datos.riesgosModerados + datos.riesgosBajos;
  if (total === 0) {
    errores.push('Debe registrar al menos un riesgo para calcular la ponderación');
  }
  
  return {
    valido: errores.length === 0,
    errores
  };
}

/**
 * Formatea días a texto legible (años, meses, días)
 * 
 * @param dias - Número de días
 * @returns Texto formateado
 */
export function formatearDiasTranscurridos(dias: number): string {
  const años = Math.floor(dias / 360);
  const mesesRestantes = Math.floor((dias % 360) / 30);
  const diasRestantes = dias % 30;
  
  const partes: string[] = [];
  if (años > 0) partes.push(`${años} ${años === 1 ? 'año' : 'años'}`);
  if (mesesRestantes > 0) partes.push(`${mesesRestantes} ${mesesRestantes === 1 ? 'mes' : 'meses'}`);
  if (diasRestantes > 0) partes.push(`${diasRestantes} ${diasRestantes === 1 ? 'día' : 'días'}`);
  
  return partes.length > 0 ? partes.join(', ') : '0 días';
}
