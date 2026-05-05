/**
 * MOTOR DE REGLAS DE NEGOCIO - PTA
 * Basado en: Sistema_Gestion_Profesoral_5_Componentes_V7_Expandido.md
 * Implementa todas las reglas críticas del sistema
 */

export interface ReglaNegocioResult {
  valida: boolean;
  tipo: 'DURO' | 'ADVERTENCIA' | 'INFO';
  mensaje: string;
  codigo: string;
}

export interface PTAData {
  horasBase: number;
  totalDocencia: number;
  totalInvestigacion: number;
  totalExtension: number;
  totalComplementarias: number;
  asignaturas: Array<{ creditos: number; nombre: string }>;
  tieneProyectoFormal: boolean;
  tieneActividadesServicio: boolean;
}

/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  REGLA 1: DOCENCIA ES SAGRADA - NUNCA SE PRORRATEA                        ║
 * ║  ─────────────────────────────────────────────────────────────────────────║
 * ║  Las horas de docencia son INALTERABLES. Si el total del PTA excede       ║
 * ║  las horas base, el prorrateo SOLO afecta Investigación, Extensión        ║
 * ║  y Complementarias. DOCENCIA NUNCA se reduce.                             ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */
export function validarDocenciaIntocable(pta: PTAData): ReglaNegocioResult {
  const totalGeneral = pta.totalDocencia + pta.totalInvestigacion + pta.totalExtension + pta.totalComplementarias;
  
  if (totalGeneral > pta.horasBase && pta.totalDocencia > 0) {
    return {
      valida: true,
      tipo: 'INFO',
      mensaje: `DOCENCIA es SAGRADA: ${pta.totalDocencia}h se mantienen intactas. Otros componentes se prorratearán.`,
      codigo: 'RN-PTA-001'
    };
  }

  return {
    valida: true,
    tipo: 'INFO',
    mensaje: 'Regla de Docencia Intocable: Verificada',
    codigo: 'RN-PTA-001'
  };
}

/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  REGLA 2: PRE-REQUISITO DE 3 CRÉDITOS                                     ║
 * ║  ─────────────────────────────────────────────────────────────────────────║
 * ║  El docente NO puede registrar actividades de Investigación, Extensión    ║
 * ║  o Complementarias hasta que tenga registrada AL MENOS UNA asignatura     ║
 * ║  de mínimo 3 CRÉDITOS en el módulo de Docencia.                          ║
 * ║                                                                            ║
 * ║  BLOQUEO: Tabs de Inv/Ext/Comp deshabilitados hasta cumplir requisito    ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */
export function validarPreRequisitoDocencia(pta: PTAData): ReglaNegocioResult {
  const tieneAsignatura3Creditos = pta.asignaturas.some(a => a.creditos >= 3);
  
  if (!tieneAsignatura3Creditos) {
    const tieneOtrosComponentes = pta.totalInvestigacion > 0 || 
                                  pta.totalExtension > 0 || 
                                  pta.totalComplementarias > 0;
    
    if (tieneOtrosComponentes) {
      return {
        valida: false,
        tipo: 'DURO',
        mensaje: 'Debe registrar al menos UNA asignatura de mínimo 3 créditos en Docencia antes de agregar Investigación, Extensión o Complementarias.',
        codigo: 'RN-PTA-002'
      };
    }
    
    return {
      valida: true,
      tipo: 'ADVERTENCIA',
      mensaje: 'Registre primero una asignatura de mínimo 3 créditos en Docencia para desbloquear los otros componentes.',
      codigo: 'RN-PTA-002'
    };
  }

  return {
    valida: true,
    tipo: 'INFO',
    mensaje: 'Pre-requisito de Docencia: Cumplido (asignatura ≥3 créditos registrada)',
    codigo: 'RN-PTA-002'
  };
}

/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  EXCLUSIÓN MUTUA EN INVESTIGACIÓN                                          ║
 * ║  ─────────────────────────────────────────────────────────────────────────║
 * ║                                                                            ║
 * ║  SI tiene registrado un PROYECTO FORMAL (Sección A)                        ║
 * ║     → NO puede registrar actividades de NECESIDAD DEL SERVICIO (Sección B) ║
 * ║                                                                            ║
 * ║  La Sección B se BLOQUEA automáticamente si Sección A tiene datos         ║
 * ║                                                                            ║
 * ║  TOPE MÁXIMO: 50% del PTA (400 horas en PTA de 800h)                      ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */
export function validarExclusionMutuaInvestigacion(pta: PTAData): ReglaNegocioResult {
  if (pta.tieneProyectoFormal && pta.tieneActividadesServicio) {
    return {
      valida: false,
      tipo: 'DURO',
      mensaje: 'EXCLUSIÓN MUTUA: No puede tener simultáneamente un Proyecto Formal Y actividades de Necesidad del Servicio. Debe elegir solo UNO.',
      codigo: 'RN-INV-001'
    };
  }

  return {
    valida: true,
    tipo: 'INFO',
    mensaje: 'Exclusión Mutua en Investigación: Verificada',
    codigo: 'RN-INV-001'
  };
}

/**
 * TOPE MÁXIMO INVESTIGACIÓN: 50% del PTA
 */
export function validarTopeInvestigacion(pta: PTAData): ReglaNegocioResult {
  const topeMaximo = pta.horasBase * 0.50; // 50%
  
  if (pta.totalInvestigacion > topeMaximo) {
    return {
      valida: false,
      tipo: 'DURO',
      mensaje: `Investigación excede el tope máximo del 50% (${topeMaximo}h). Actual: ${pta.totalInvestigacion}h`,
      codigo: 'RN-INV-002'
    };
  }

  const porcentaje = ((pta.totalInvestigacion / pta.horasBase) * 100).toFixed(1);
  
  if (pta.totalInvestigacion > topeMaximo * 0.9) {
    return {
      valida: true,
      tipo: 'ADVERTENCIA',
      mensaje: `Investigación cercana al tope máximo: ${porcentaje}% de 50%`,
      codigo: 'RN-INV-002'
    };
  }

  return {
    valida: true,
    tipo: 'INFO',
    mensaje: `Investigación: ${porcentaje}% del PTA (tope 50%)`,
    codigo: 'RN-INV-002'
  };
}

/**
 * TOPE MÁXIMO EXTENSIÓN: 25% del PTA
 */
export function validarTopeExtension(pta: PTAData): ReglaNegocioResult {
  const topeMaximo = pta.horasBase * 0.25; // 25%
  
  if (pta.totalExtension > topeMaximo) {
    return {
      valida: false,
      tipo: 'DURO',
      mensaje: `Extensión excede el tope máximo del 25% (${topeMaximo}h). Actual: ${pta.totalExtension}h`,
      codigo: 'RN-EXT-001'
    };
  }

  const porcentaje = ((pta.totalExtension / pta.horasBase) * 100).toFixed(1);
  
  if (pta.totalExtension > topeMaximo * 0.9) {
    return {
      valida: true,
      tipo: 'ADVERTENCIA',
      mensaje: `Extensión cercana al tope máximo: ${porcentaje}% de 25%`,
      codigo: 'RN-EXT-001'
    };
  }

  return {
    valida: true,
    tipo: 'INFO',
    mensaje: `Extensión: ${porcentaje}% del PTA (tope 25%)`,
    codigo: 'RN-EXT-001'
  };
}

/**
 * TOPE MÁXIMO COMPLEMENTARIAS: 25% del PTA
 */
export function validarTopeComplementarias(pta: PTAData): ReglaNegocioResult {
  const topeMaximo = pta.horasBase * 0.25; // 25%
  
  if (pta.totalComplementarias > topeMaximo) {
    return {
      valida: false,
      tipo: 'DURO',
      mensaje: `Complementarias excede el tope máximo del 25% (${topeMaximo}h). Actual: ${pta.totalComplementarias}h`,
      codigo: 'RN-COMP-001'
    };
  }

  const porcentaje = ((pta.totalComplementarias / pta.horasBase) * 100).toFixed(1);
  
  if (pta.totalComplementarias > topeMaximo * 0.9) {
    return {
      valida: true,
      tipo: 'ADVERTENCIA',
      mensaje: `Complementarias cercana al tope máximo: ${porcentaje}% de 25%`,
      codigo: 'RN-COMP-001'
    };
  }

  return {
    valida: true,
    tipo: 'INFO',
    mensaje: `Complementarias: ${porcentaje}% del PTA (tope 25%)`,
    codigo: 'RN-COMP-001'
  };
}

/**
 * Validar total del PTA
 */
export function validarTotalPTA(pta: PTAData): ReglaNegocioResult {
  const totalGeneral = pta.totalDocencia + pta.totalInvestigacion + pta.totalExtension + pta.totalComplementarias;
  
  if (totalGeneral === 0) {
    return {
      valida: false,
      tipo: 'ADVERTENCIA',
      mensaje: 'El PTA está vacío. Debe registrar al menos actividades de Docencia.',
      codigo: 'RN-PTA-003'
    };
  }

  const diferencia = totalGeneral - pta.horasBase;
  const porcentajeUso = ((totalGeneral / pta.horasBase) * 100).toFixed(1);

  if (totalGeneral > pta.horasBase) {
    return {
      valida: true,
      tipo: 'ADVERTENCIA',
      mensaje: `PTA excede horas base en ${diferencia}h (${porcentajeUso}% de uso). Se aplicará prorrateo automático (DOCENCIA se mantiene intacta).`,
      codigo: 'RN-PTA-003'
    };
  }

  if (totalGeneral < pta.horasBase * 0.8) {
    return {
      valida: true,
      tipo: 'ADVERTENCIA',
      mensaje: `PTA usa solo ${porcentajeUso}% de las horas base. Considere agregar más actividades.`,
      codigo: 'RN-PTA-003'
    };
  }

  return {
    valida: true,
    tipo: 'INFO',
    mensaje: `PTA: ${totalGeneral}h de ${pta.horasBase}h (${porcentajeUso}% de uso)`,
    codigo: 'RN-PTA-003'
  };
}

/**
 * Ejecutar todas las validaciones
 */
export function validarPTACompleto(pta: PTAData): ReglaNegocioResult[] {
  const resultados: ReglaNegocioResult[] = [];

  // Validaciones críticas en orden de importancia
  resultados.push(validarPreRequisitoDocencia(pta));
  resultados.push(validarDocenciaIntocable(pta));
  resultados.push(validarExclusionMutuaInvestigacion(pta));
  resultados.push(validarTopeInvestigacion(pta));
  resultados.push(validarTopeExtension(pta));
  resultados.push(validarTopeComplementarias(pta));
  resultados.push(validarTotalPTA(pta));

  return resultados;
}

/**
 * Verificar si el PTA puede ser enviado a aprobación
 */
export function puedeEnviarseAAprobacion(pta: PTAData): { puede: boolean; errores: string[] } {
  const validaciones = validarPTACompleto(pta);
  const erroresDuros = validaciones
    .filter(v => !v.valida && v.tipo === 'DURO')
    .map(v => v.mensaje);

  return {
    puede: erroresDuros.length === 0,
    errores: erroresDuros
  };
}

/**
 * Obtener tabs que deben estar bloqueados
 */
export function obtenerTabsBloqueados(pta: PTAData): {
  investigacion: boolean;
  extension: boolean;
  complementarias: boolean;
} {
  const preRequisito = validarPreRequisitoDocencia(pta);
  const bloqueado = !preRequisito.valida && preRequisito.tipo === 'ADVERTENCIA';

  return {
    investigacion: bloqueado,
    extension: bloqueado,
    complementarias: bloqueado
  };
}
