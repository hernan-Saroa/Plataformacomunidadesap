/**
 * ═══════════════════════════════════════════════════════════════════════════
 * UTILIDADES PARA CÁLCULOS DAFP
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type NivelRiesgo = 'EXTREMO' | 'ALTO' | 'MODERADO' | 'BAJO' | 'MUY BAJO';
export type ResultadoAuditoria = 'Adecuado' | 'Inadecuado' | 'Sin auditoría previa';
export type DecisionRotacion = 'Incluir' | 'No Incluir';
export type DecisionFinal = 'INCLUIR_PLAN_ANUAL' | 'INCLUIR_AUDITORIA_POSTERIOR';

// ════════════════════════════════════════════════════════════════════════════
// MATRIZ DE ROTACIÓN DAFP
// ════════════════════════════════════════════════════════════════════════════

export const MATRIZ_ROTACION: Record<string, { plan: string; dias: number }> = {
  'EXTREMO_Adecuado': { plan: '1 año', dias: 360 },
  'EXTREMO_Inadecuado': { plan: '1 año', dias: 360 },
  'ALTO_Adecuado': { plan: '2 años', dias: 720 },
  'ALTO_Inadecuado': { plan: '1 año', dias: 360 },
  'MODERADO_Adecuado': { plan: '3 años', dias: 1080 },
  'MODERADO_Inadecuado': { plan: '2 años', dias: 720 },
  'BAJO_Adecuado': { plan: '4 años', dias: 1440 },
  'BAJO_Inadecuado': { plan: '3 años', dias: 1080 },
  'MUY BAJO_Adecuado': { plan: '5 años', dias: 1800 },
  'MUY BAJO_Inadecuado': { plan: '4 años', dias: 1440 },
  'EXTREMO_Sin auditoría previa': { plan: '1 año', dias: 360 },
  'ALTO_Sin auditoría previa': { plan: '2 años', dias: 720 },
  'MODERADO_Sin auditoría previa': { plan: '3 años', dias: 1080 },
  'BAJO_Sin auditoría previa': { plan: '4 años', dias: 1440 },
  'MUY BAJO_Sin auditoría previa': { plan: '5 años', dias: 1800 },
};

// ════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE CÁLCULO
// ════════════════════════════════════════════════════════════════════════════

/**
 * Calcula ponderación de riesgo según metodología DAFP (porcentajes ACUMULADOS).
 * Reglas: ≥20% extremos → EXTREMO | ≥30% (ext+altos) → ALTO | ≥40% (ext+altos+mod) → MODERADO
 * | ≥50% todos → BAJO | else → MUY BAJO
 * NOTA: porcTodos es siempre 100% cuando hay riesgos; la regla BAJO aplica como mínimo.
 */
export function calcularPonderacionRiesgo(
  extremos: number,
  altos: number,
  moderados: number,
  bajos: number,
  total: number
): NivelRiesgo {
  if (total === 0) return 'MUY BAJO';

  const porcExtremos = (extremos / total) * 100;
  const porcExtremosAltos = ((extremos + altos) / total) * 100;
  const porcExtremosAltosMod = ((extremos + altos + moderados) / total) * 100;
  // porcTodos = 100% siempre que total > 0; la regla BAJO es el piso cuando hay riesgos

  if (porcExtremos >= 20) return 'EXTREMO';
  if (porcExtremosAltos >= 30) return 'ALTO';
  if (porcExtremosAltosMod >= 40) return 'MODERADO';
  return 'BAJO'; // Cualquier otra distribución con riesgos → mínimo BAJO
}

export function calcularDiasTranscurridos(fechaUltima: string | null, fechaCorte: string): number | null {
  if (!fechaUltima) return null;

  const fecha1 = new Date(fechaUltima);
  const fecha2 = new Date(fechaCorte);
  const diferencia = fecha2.getTime() - fecha1.getTime();
  const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));

  return dias;
}

export function obtenerPlanRotacion(ponderacion: NivelRiesgo, resultado: ResultadoAuditoria): { plan: string; dias: number } {
  const clave = `${ponderacion}_${resultado}`;
  return MATRIZ_ROTACION[clave] || { plan: '1 año', dias: 360 };
}

export function calcularDecisionRotacion(diasTranscurridos: number | null, diasRotacion: number): DecisionRotacion {
  if (diasTranscurridos === null) return 'Incluir';
  return diasTranscurridos > diasRotacion ? 'Incluir' : 'No Incluir';
}

export function calcularDecisionFinal(
  requerimientoComite: boolean,
  ponderacion: NivelRiesgo,
  requerimientoEntesReg: boolean,
  decisionRotacion: DecisionRotacion
): { decision: DecisionFinal; motivo: string; prioridad: number } {
  // REGLA 1: Requerimiento de Comité (J = TRUE) → Prioridad 1
  if (requerimientoComite) {
    return {
      decision: 'INCLUIR_PLAN_ANUAL',
      motivo: 'Requerimiento de Comité (Prioridad 1)',
      prioridad: 1
    };
  }

  // REGLA 2: Ponderación EXTREMO o ALTO (I12) → Prioridad 2
  if (ponderacion === 'EXTREMO' || ponderacion === 'ALTO') {
    return {
      decision: 'INCLUIR_PLAN_ANUAL',
      motivo: `Ponderación de Riesgo: ${ponderacion} (Prioridad 2)`,
      prioridad: 2
    };
  }

  // REGLA 3: Requerimiento de Entes Reguladores (K = TRUE) → Prioridad 3
  if (requerimientoEntesReg) {
    return {
      decision: 'INCLUIR_PLAN_ANUAL',
      motivo: 'Requerimiento de Entes Reguladores (Prioridad 3)',
      prioridad: 3
    };
  }

  // REGLA 4: Decisión por Rotación (Q12 = "Incluir") → Prioridad 4
  if (decisionRotacion === 'Incluir') {
    return {
      decision: 'INCLUIR_PLAN_ANUAL',
      motivo: 'Cumple criterio de rotación (Prioridad 4)',
      prioridad: 4
    };
  }

  // REGLA 5: Por defecto → Prioridad 5
  return {
    decision: 'AUDITORÍA POSTERIOR',
    motivo: 'No cumple criterios de inclusión (Prioridad 5)',
    prioridad: 5
  };
}

export function getColorRiesgo(nivel: NivelRiesgo): string {
  const colores: Record<NivelRiesgo, string> = {
    'EXTREMO': 'bg-red-100 text-red-700 border-red-300',
    'ALTO': 'bg-orange-100 text-orange-700 border-orange-300',
    'MODERADO': 'bg-yellow-100 text-yellow-700 border-yellow-300',
    'BAJO': 'bg-green-100 text-green-700 border-green-300',
    'MUY BAJO': 'bg-blue-100 text-blue-700 border-blue-300',
  };
  return colores[nivel];
}

export function getEmojiRiesgo(nivel: NivelRiesgo): string {
  const emojis: Record<NivelRiesgo, string> = {
    'EXTREMO': '🔴',
    'ALTO': '🟠',
    'MODERADO': '🟡',
    'BAJO': '🟢',
    'MUY BAJO': '🔵',
  };
  return emojis[nivel];
}
