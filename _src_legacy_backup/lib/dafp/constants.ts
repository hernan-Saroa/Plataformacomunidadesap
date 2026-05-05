// ==========================================
// CONSTANTES DEL MODELO DAFP DE RIESGO
// Guía de Auditoría Basada en Riesgos - DAFP Versión 4 (Julio 2020)
// Resolución SC 670 del 26 de mayo de 2023 - ESAP
// ==========================================

/**
 * Niveles de riesgo según DAFP
 */
export const NIVELES_RIESGO = {
  EXTREMO: 'EXTREMO',
  ALTO: 'ALTO',
  MODERADO: 'MODERADO',
  BAJO: 'BAJO',
  MUY_BAJO: 'MUY_BAJO'
} as const;

export type NivelRiesgoDafp = typeof NIVELES_RIESGO[keyof typeof NIVELES_RIESGO];

/**
 * Resultados posibles de auditoría anterior
 */
export const RESULTADOS_AUDITORIA = {
  ADECUADO: 'ADECUADO',
  INADECUADO: 'INADECUADO',
  SIN_AUDITORIA: 'SIN_AUDITORIA'
} as const;

export type ResultadoAuditoria = typeof RESULTADOS_AUDITORIA[keyof typeof RESULTADOS_AUDITORIA];

/**
 * Decisiones del Plan Anual de Auditoría
 */
export const DECISIONES_PLAN = {
  INCLUIR_PLAN_ANUAL: 'INCLUIR_PLAN_ANUAL',
  INCLUIR_AUDITORIA_POSTERIOR: 'INCLUIR_AUDITORIA_POSTERIOR'
} as const;

export type DecisionPlan = typeof DECISIONES_PLAN[keyof typeof DECISIONES_PLAN];

/**
 * Estados de evaluación de riesgo
 */
export const ESTADOS_EVALUACION = {
  BORRADOR: 'BORRADOR',
  EN_REVISION: 'EN_REVISION',
  APROBADO: 'APROBADO',
  VIGENTE: 'VIGENTE'
} as const;

export type EstadoEvaluacion = typeof ESTADOS_EVALUACION[keyof typeof ESTADOS_EVALUACION];

/**
 * Umbrales para cálculo de ponderación de riesgo
 * Basado en la Guía DAFP versión 4
 */
export const UMBRALES_PONDERACION = {
  // Si riesgos extremos >= 20% del total → EXTREMO
  EXTREMO: {
    porcentajeExtremos: 0.20
  },
  // Si (extremos + altos) >= 30% del total → ALTO
  ALTO: {
    porcentajeExtremosAltos: 0.30
  },
  // Si (extremos + altos + moderados) >= 40% del total → MODERADO
  MODERADO: {
    porcentajeExtremosAltosModerados: 0.40
  },
  // Si (extremos + altos + moderados + bajos) >= 50% del total → BAJO
  BAJO: {
    porcentajeTodos: 0.50
  }
  // Si ninguno de los anteriores → MUY_BAJO (implícito)
} as const;

/**
 * Matriz de Plan de Rotación DAFP
 * Cruza: Ponderación de Riesgo x Resultado Última Auditoría
 */
export const MATRIZ_ROTACION: Record<NivelRiesgoDafp, Record<string, { periodo: string; dias: number }>> = {
  EXTREMO: {
    ADECUADO: { periodo: '1 año', dias: 360 },
    INADECUADO: { periodo: '1 año', dias: 360 },
    SIN_AUDITORIA: { periodo: '1 año', dias: 360 }
  },
  ALTO: {
    ADECUADO: { periodo: '2 años', dias: 720 },
    INADECUADO: { periodo: '1 año', dias: 360 },
    SIN_AUDITORIA: { periodo: '1 año', dias: 360 }
  },
  MODERADO: {
    ADECUADO: { periodo: '3 años', dias: 1080 },
    INADECUADO: { periodo: '2 años', dias: 720 },
    SIN_AUDITORIA: { periodo: '2 años', dias: 720 }
  },
  BAJO: {
    ADECUADO: { periodo: '4 años', dias: 1440 },
    INADECUADO: { periodo: '3 años', dias: 1080 },
    SIN_AUDITORIA: { periodo: '3 años', dias: 1080 }
  },
  MUY_BAJO: {
    ADECUADO: { periodo: '5 años', dias: 1800 },
    INADECUADO: { periodo: '4 años', dias: 1440 },
    SIN_AUDITORIA: { periodo: '4 años', dias: 1440 }
  }
};

/**
 * Etiquetas para UI con colores corporativos ESAP
 */
export const ETIQUETAS_RIESGO: Record<NivelRiesgoDafp, { 
  label: string; 
  color: string; 
  bgColor: string;
  bgGradient: string;
}> = {
  EXTREMO: { 
    label: 'Extremo', 
    color: '#FFFFFF', 
    bgColor: '#DC2626',
    bgGradient: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)'
  },
  ALTO: { 
    label: 'Alto', 
    color: '#FFFFFF', 
    bgColor: '#F57C00',
    bgGradient: 'linear-gradient(135deg, #F57C00 0%, #E65100 100%)'
  },
  MODERADO: { 
    label: 'Moderado', 
    color: '#1F2937', 
    bgColor: '#FBBF24',
    bgGradient: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)'
  },
  BAJO: { 
    label: 'Bajo', 
    color: '#FFFFFF', 
    bgColor: '#22C55E',
    bgGradient: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)'
  },
  MUY_BAJO: { 
    label: 'Muy Bajo', 
    color: '#FFFFFF', 
    bgColor: '#2962FF',
    bgGradient: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)'
  }
};

/**
 * Etiquetas para resultados de auditoría
 */
export const ETIQUETAS_RESULTADO: Record<string, { label: string; color: string; bgColor: string }> = {
  ADECUADO: { 
    label: 'Adecuado', 
    color: '#FFFFFF',
    bgColor: '#22C55E'
  },
  INADECUADO: { 
    label: 'Inadecuado', 
    color: '#FFFFFF',
    bgColor: '#DC2626'
  },
  SIN_AUDITORIA: { 
    label: 'Sin auditoría previa', 
    color: '#1F2937',
    bgColor: '#9CA3AF'
  }
};

/**
 * Etiquetas para estados de evaluación
 */
export const ETIQUETAS_ESTADO: Record<EstadoEvaluacion, { 
  label: string; 
  color: string; 
  bgColor: string;
}> = {
  BORRADOR: {
    label: 'Borrador',
    color: '#1F2937',
    bgColor: '#E5E7EB'
  },
  EN_REVISION: {
    label: 'En Revisión',
    color: '#1F2937',
    bgColor: '#FEF3C7'
  },
  APROBADO: {
    label: 'Aprobado',
    color: '#FFFFFF',
    bgColor: '#2962FF'
  },
  VIGENTE: {
    label: 'Vigente',
    color: '#FFFFFF',
    bgColor: '#22C55E'
  }
};

/**
 * Reglas de inclusión automática
 */
export const REGLAS_INCLUSION_AUTOMATICA = {
  // Si requerimiento del Comité = SÍ → Incluir automáticamente
  REQUERIMIENTO_COMITE: true,
  // Si ponderación = EXTREMO → Incluir automáticamente
  RIESGO_EXTREMO: true,
  // Si requerimiento Entes Reguladores = SÍ → Incluir automáticamente
  REQUERIMIENTO_ENTES_REGULADORES: true
} as const;

/**
 * Orientaciones generales según DAFP para UI educativa
 */
export const ORIENTACIONES_PONDERACION = [
  {
    regla: 1,
    condicion: 'Si los riesgos EXTREMOS representan el 20% o más del total',
    resultado: 'La ponderación del proceso es EXTREMO',
    ejemplo: 'Ejemplo: 6 extremos de 30 total = 20% → EXTREMO'
  },
  {
    regla: 2,
    condicion: 'Si los riesgos EXTREMOS y ALTOS representan el 30% o más del total',
    resultado: 'La ponderación del proceso es ALTO',
    ejemplo: 'Ejemplo: 3 extremos + 6 altos de 30 total = 30% → ALTO'
  },
  {
    regla: 3,
    condicion: 'Si los riesgos EXTREMOS, ALTOS y MODERADOS representan el 40% o más del total',
    resultado: 'La ponderación del proceso es MODERADO',
    ejemplo: 'Ejemplo: 2 extremos + 4 altos + 6 moderados de 30 total = 40% → MODERADO'
  },
  {
    regla: 4,
    condicion: 'Si los riesgos EXTREMOS, ALTOS, MODERADOS y BAJOS representan el 50% o más del total',
    resultado: 'La ponderación del proceso es BAJO',
    ejemplo: 'Ejemplo: 1 extremo + 2 altos + 4 moderados + 8 bajos de 30 total = 50% → BAJO'
  },
  {
    regla: 5,
    condicion: 'Si no se cumple ninguna de las condiciones anteriores',
    resultado: 'La ponderación del proceso es MUY BAJO',
    ejemplo: 'Ejemplo: 1 extremo + 1 alto + 2 moderados + 3 bajos de 30 total = 23% → MUY BAJO'
  }
];

/**
 * Descripción de la matriz de rotación para referencia del usuario
 */
export const MATRIZ_ROTACION_TABLA = [
  { ponderacion: 'EXTREMO', adecuado: '1 año', inadecuado: '1 año', sinAuditoria: '1 año' },
  { ponderacion: 'ALTO', adecuado: '2 años', inadecuado: '1 año', sinAuditoria: '1 año' },
  { ponderacion: 'MODERADO', adecuado: '3 años', inadecuado: '2 años', sinAuditoria: '2 años' },
  { ponderacion: 'BAJO', adecuado: '4 años', inadecuado: '3 años', sinAuditoria: '3 años' },
  { ponderacion: 'MUY BAJO', adecuado: '5 años', inadecuado: '4 años', sinAuditoria: '4 años' }
];
