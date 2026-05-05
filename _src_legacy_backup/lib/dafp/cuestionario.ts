// ==========================================
// DEFINICIÓN DEL CUESTIONARIO DAFP
// Estructura del formulario de evaluación de riesgo
// ==========================================

/**
 * Estructura de una pregunta del cuestionario
 */
export interface PreguntaCuestionario {
  id: string;
  campo: string; // Campo del modelo de datos
  texto: string;
  ayuda: string;
  tipo: 'numero' | 'booleano' | 'fecha' | 'seleccion';
  requerido: boolean;
  placeholder?: string;
  opciones?: { valor: string; etiqueta: string }[];
  min?: number;
  max?: number;
}

/**
 * Estructura de una sección del cuestionario
 */
export interface SeccionCuestionario {
  id: string;
  titulo: string;
  descripcion: string;
  icono: string;
  preguntas: PreguntaCuestionario[];
}

/**
 * CUESTIONARIO COMPLETO DAFP
 * Dividido en 3 secciones (pasos del wizard)
 */
export const CUESTIONARIO_DAFP: SeccionCuestionario[] = [
  // ================================================================
  // PASO 1: CONTEO DE RIESGOS POR NIVEL
  // ================================================================
  {
    id: 'seccion_riesgos',
    titulo: 'Conteo de Riesgos por Nivel',
    descripcion: 'Registre el número de riesgos inherentes identificados en el proceso/unidad auditable según su calificación de impacto y probabilidad.',
    icono: 'AlertTriangle',
    preguntas: [
      {
        id: 'q_riesgos_extremos',
        campo: 'riesgosExtremos',
        texto: 'Riesgos con calificación EXTREMO',
        ayuda: 'Riesgos cuya materialización puede generar impacto catastrófico en la entidad (alto impacto + alta probabilidad).',
        tipo: 'numero',
        requerido: true,
        placeholder: 'Ej: 3',
        min: 0
      },
      {
        id: 'q_riesgos_altos',
        campo: 'riesgosAltos',
        texto: 'Riesgos con calificación ALTO',
        ayuda: 'Riesgos cuya materialización puede generar impacto significativo en la entidad.',
        tipo: 'numero',
        requerido: true,
        placeholder: 'Ej: 8',
        min: 0
      },
      {
        id: 'q_riesgos_moderados',
        campo: 'riesgosModerados',
        texto: 'Riesgos con calificación MODERADO',
        ayuda: 'Riesgos cuya materialización puede generar impacto moderado en la entidad.',
        tipo: 'numero',
        requerido: true,
        placeholder: 'Ej: 12',
        min: 0
      },
      {
        id: 'q_riesgos_bajos',
        campo: 'riesgosBajos',
        texto: 'Riesgos con calificación BAJO',
        ayuda: 'Riesgos cuya materialización puede generar impacto menor en la entidad.',
        tipo: 'numero',
        requerido: true,
        placeholder: 'Ej: 5',
        min: 0
      }
    ]
  },
  
  // ================================================================
  // PASO 2: FACTORES ESPECIALES Y ÚLTIMA AUDITORÍA
  // ================================================================
  {
    id: 'seccion_factores',
    titulo: 'Factores Especiales y Última Auditoría',
    descripcion: 'Indique si existen requerimientos especiales que determinen la inclusión automática y la información de la última auditoría realizada.',
    icono: 'Shield',
    preguntas: [
      {
        id: 'q_req_comite',
        campo: 'requerimientoComite',
        texto: '¿Existe requerimiento del Comité de Auditoría o la Dirección?',
        ayuda: 'Si la respuesta es SÍ, automáticamente e independientemente del resultado de la ponderación, el proceso debe ser incluido en el Plan Anual de Auditoría.',
        tipo: 'booleano',
        requerido: true
      },
      {
        id: 'q_req_entes_reg',
        campo: 'requerimientoEntesReguladores',
        texto: '¿Existe requerimiento de Entes Reguladores?',
        ayuda: 'Si la respuesta es SÍ (por ejemplo: Contraloría, Procuraduría, Ministerios), automáticamente el proceso debe ser incluido en el Plan Anual de Auditoría.',
        tipo: 'booleano',
        requerido: true
      },
      {
        id: 'q_fecha_ultima_auditoria',
        campo: 'fechaUltimaAuditoria',
        texto: 'Fecha de última auditoría',
        ayuda: 'Ingrese la fecha en que se realizó la última auditoría a este proceso. Deje vacío si nunca se ha auditado.',
        tipo: 'fecha',
        requerido: false,
        placeholder: 'dd/mm/aaaa'
      },
      {
        id: 'q_resultado_ultima_auditoria',
        campo: 'resultadoUltimaAuditoria',
        texto: 'Resultado de la última auditoría',
        ayuda: 'Seleccione el resultado general de la última auditoría realizada.',
        tipo: 'seleccion',
        requerido: true,
        opciones: [
          { valor: 'SIN_AUDITORIA', etiqueta: 'Sin auditoría previa' },
          { valor: 'ADECUADO', etiqueta: 'Adecuado' },
          { valor: 'INADECUADO', etiqueta: 'Inadecuado' }
        ]
      }
    ]
  },
  
  // ================================================================
  // PASO 3: OBSERVACIONES (OPCIONAL)
  // ================================================================
  {
    id: 'seccion_observaciones',
    titulo: 'Observaciones y Confirmación',
    descripcion: 'Revise los resultados calculados automáticamente y agregue observaciones si es necesario.',
    icono: 'FileText',
    preguntas: []
  }
];

/**
 * Mensajes de ayuda contextual para el usuario
 */
export const MENSAJES_AYUDA = {
  conteoRiesgos: {
    titulo: '¿Cómo contar los riesgos?',
    contenido: [
      'Revise la matriz de riesgos del proceso/unidad auditable',
      'Cuente cuántos riesgos tienen calificación EXTREMO (20% o más)',
      'Cuente cuántos tienen calificación ALTO, MODERADO y BAJO',
      'El sistema calculará automáticamente la ponderación según los umbrales DAFP'
    ]
  },
  requerimientoComite: {
    titulo: '¿Qué significa "Requerimiento del Comité"?',
    contenido: [
      'Si el Comité de Auditoría o la Dirección ha solicitado explícitamente auditar este proceso',
      'Este es un criterio de INCLUSIÓN AUTOMÁTICA',
      'No depende de la ponderación de riesgo calculada'
    ]
  },
  requerimientoEntesReg: {
    titulo: '¿Qué son Entes Reguladores?',
    contenido: [
      'Contraloría General de la República',
      'Procuraduría General de la Nación',
      'Ministerios del sector',
      'Otros entes de control externos',
      'Si cualquiera de estos ha solicitado auditar el proceso, active esta opción'
    ]
  },
  ultimaAuditoria: {
    titulo: '¿Cómo afecta la última auditoría?',
    contenido: [
      'Si el resultado fue INADECUADO, el período de rotación se reduce',
      'Si fue ADECUADO, el período de rotación puede ser mayor',
      'El sistema compara los días transcurridos con el período de rotación para decidir inclusión'
    ]
  },
  matrizRotacion: {
    titulo: 'Matriz de Rotación DAFP',
    contenido: [
      'EXTREMO: 1 año (siempre)',
      'ALTO: 1-2 años (según resultado)',
      'MODERADO: 2-3 años (según resultado)',
      'BAJO: 3-4 años (según resultado)',
      'MUY BAJO: 4-5 años (según resultado)'
    ]
  }
};

/**
 * Tooltips para los iconos de ayuda
 */
export const TOOLTIPS = {
  riesgosExtremos: 'Impacto catastrófico + Alta probabilidad = Riesgo EXTREMO',
  riesgosAltos: 'Impacto significativo + Probabilidad media-alta = Riesgo ALTO',
  riesgosModerados: 'Impacto moderado + Probabilidad media = Riesgo MODERADO',
  riesgosBajos: 'Impacto menor + Baja probabilidad = Riesgo BAJO',
  totalRiesgos: 'Suma automática de todos los riesgos registrados',
  ponderacion: 'Calculado según porcentajes de riesgos extremos, altos, moderados y bajos',
  planRotacion: 'Período recomendado entre auditorías según ponderación y resultado anterior',
  decisionFinal: 'Decisión automática basada en las reglas DAFP'
};
