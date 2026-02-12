/**
 * ============================================
 * VALIDACIONES NORMATIVAS CRÍTICAS - OCIG
 * ============================================
 * 
 * Este archivo centraliza TODAS las validaciones obligatorias según:
 * - Decreto 648/2017 (Control Interno - 5 Roles)
 * - EM-PT-004 (Procedimiento Auditorías Internas)
 * - EM-FO-002 (Plan de Mejoramiento)
 * - Guía DAFP (Auditoría Interna v6)
 * 
 * ⚠️ CRÍTICO: Estas validaciones son OBLIGATORIAS por normatividad
 * 
 * FECHA: 30 Enero 2025
 * VERSIÓN: 1.0
 */

// ============================================
// TIPOS
// ============================================

export interface Rol {
  id?: string;
  numero: number;
  nombre: string;
  descripcion?: string;
  articulo?: string;
  actividades?: Actividad[];
}

export interface Actividad {
  id?: string;
  nombre: string;
  descripcion?: string;
  responsableId: string;
  fechaInicio: Date;
  fechaFin: Date;
}

export interface Auditoria {
  id?: string;
  codigo: string;
  esTerritorial: boolean;
  estado?: string;
  equipoAuditor?: any[];
  planTrabajoAprobado?: boolean;
  hallazgos?: any[];
  informeFinal?: any;
  planMejora?: any;
}

export interface CronogramaAuditoria {
  planeacion: { duracionDias: number };
  ejecucion: { duracionDias: number };
  comunicacion: { duracionDias: number };
}

// ============================================
// ERRORES PERSONALIZADOS
// ============================================

export class ValidationError extends Error {
  constructor(message: string, public code?: string, public norma?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NormativaError extends ValidationError {
  constructor(message: string, norma: string) {
    super(message, 'NORMATIVA_ERROR', norma);
    this.name = 'NormativaError';
  }
}

// ============================================
// DECRETO 648/2017 - CONTROL INTERNO
// ============================================

/**
 * Constantes del Decreto 648/2017
 * Define los 5 roles OBLIGATORIOS de Control Interno
 */
export const DECRETO_648_ROLES = [
  {
    numero: 1,
    nombre: 'Liderazgo Estratégico',
    descripcion: 'Dirección Nacional + Jefe OCI',
    articulo: 'Art. 2'
  },
  {
    numero: 2,
    nombre: 'Enfoque hacia la Prevención',
    descripcion: 'Diseño + implantación de controles',
    articulo: 'Art. 3'
  },
  {
    numero: 3,
    nombre: 'Relación con Entes de Control',
    descripcion: 'Coordinación con CGR, MECI',
    articulo: 'Art. 4'
  },
  {
    numero: 4,
    nombre: 'Evaluación de la Gestión del Riesgo',
    descripcion: 'Identificación + evaluación de riesgos',
    articulo: 'Art. 5'
  },
  {
    numero: 5,
    nombre: 'Evaluación y Seguimiento',
    descripcion: 'Monitoreo + efectividad de controles',
    articulo: 'Art. 6'
  }
] as const;

export const VALIDACIONES_DECRETO_648 = {
  /**
   * ⚠️ CRÍTICO: Validar que existan EXACTAMENTE 5 roles
   * Decreto 648/2017 - Obligatorio sin excepciones
   */
  validarCincoRoles(roles: Rol[]): void {
    if (roles.length !== 5) {
      throw new NormativaError(
        `Decreto 648/2017: El Plan Anual DEBE contener EXACTAMENTE 5 roles. Recibidos: ${roles.length}`,
        'Decreto 648/2017 Art. 2-6'
      );
    }
  },

  /**
   * ⚠️ CRÍTICO: Validar que sean los 5 roles correctos
   */
  validarNombresRoles(roles: Rol[]): void {
    const nombresEsperados = DECRETO_648_ROLES.map(r => r.nombre);
    const nombresRecibidos = roles.map(r => r.nombre);
    
    const faltantes = nombresEsperados.filter(n => !nombresRecibidos.includes(n));
    const adicionales = nombresRecibidos.filter(n => !nombresEsperados.includes(n));
    
    if (faltantes.length > 0 || adicionales.length > 0) {
      const mensaje = [];
      if (faltantes.length > 0) {
        mensaje.push(`Roles faltantes: ${faltantes.join(', ')}`);
      }
      if (adicionales.length > 0) {
        mensaje.push(`Roles no permitidos: ${adicionales.join(', ')}`);
      }
      
      throw new NormativaError(
        `Decreto 648/2017: ${mensaje.join('. ')}`,
        'Decreto 648/2017 Art. 2-6'
      );
    }
  },

  /**
   * ⚠️ CRÍTICO: Cada rol debe tener al menos 1 actividad
   */
  validarActividadesPorRol(roles: Rol[]): void {
    const rolesVacios = roles.filter(r => !r.actividades || r.actividades.length === 0);
    
    if (rolesVacios.length > 0) {
      throw new NormativaError(
        `Decreto 648/2017: Los siguientes roles NO tienen actividades asignadas: ${rolesVacios.map(r => r.nombre).join(', ')}. Cada rol debe tener al menos 1 actividad.`,
        'Decreto 648/2017 Art. 2-6'
      );
    }
  },

  /**
   * Validación completa del Decreto 648
   */
  validarPlanAnual(roles: Rol[]): void {
    this.validarCincoRoles(roles);
    this.validarNombresRoles(roles);
    this.validarActividadesPorRol(roles);
  }
};

// ============================================
// EM-PT-004 - AUDITORÍAS INTERNAS
// ============================================

/**
 * Duraciones según procedimiento EM-PT-004
 */
export const DURACIONES_AUDITORIA = {
  SEDE_CENTRAL: {
    planeacion: { min: 5, max: 10, unidad: 'días' },
    ejecucion: { min: 10, max: 30, unidad: 'días' },
    comunicacion: { min: 10, max: 15, unidad: 'días' }
  },
  TERRITORIAL: {
    planeacion: { dias: 3, fijo: true },
    ejecucion: { dias: 4, fijo: true },  // ⚠️ SIEMPRE 4 DÍAS
    comunicacion: { dias: 2, fijo: true }
  }
} as const;

export const VALIDACIONES_TERRITORIAL = {
  /**
   * ⚠️ CRÍTICO: Auditorías territoriales SIEMPRE 4 días en ejecución
   * EM-PT-004 - Sin excepciones
   */
  validarDuracionEjecucion(esTerritorial: boolean, diasEjecucion: number): void {
    if (esTerritorial && diasEjecucion !== 4) {
      throw new NormativaError(
        `EM-PT-004: Las auditorías TERRITORIALES DEBEN tener EXACTAMENTE 4 días de ejecución. Recibidos: ${diasEjecucion} días`,
        'EM-PT-004 - Procedimiento Auditorías Internas v3'
      );
    }
  },

  /**
   * Validar duración de planeación territorial
   */
  validarDuracionPlaneacion(esTerritorial: boolean, diasPlaneacion: number): void {
    if (esTerritorial && diasPlaneacion !== 3) {
      throw new NormativaError(
        `EM-PT-004: Las auditorías territoriales deben tener exactamente 3 días de planeación. Recibidos: ${diasPlaneacion} días`,
        'EM-PT-004'
      );
    }
  },

  /**
   * Validar duración de comunicación territorial
   */
  validarDuracionComunicacion(esTerritorial: boolean, diasComunicacion: number): void {
    if (esTerritorial && diasComunicacion !== 2) {
      throw new NormativaError(
        `EM-PT-004: Las auditorías territoriales deben tener exactamente 2 días de comunicación. Recibidos: ${diasComunicacion} días`,
        'EM-PT-004'
      );
    }
  },

  /**
   * Validar cronograma completo territorial
   */
  validarCronogramaTerritorial(cronograma: CronogramaAuditoria): void {
    this.validarDuracionPlaneacion(true, cronograma.planeacion.duracionDias);
    this.validarDuracionEjecucion(true, cronograma.ejecucion.duracionDias);
    this.validarDuracionComunicacion(true, cronograma.comunicacion.duracionDias);
  },

  /**
   * Validar duración sede central dentro de rangos
   */
  validarDuracionSedeCentral(
    fase: 'planeacion' | 'ejecucion' | 'comunicacion',
    dias: number
  ): void {
    const rangos = DURACIONES_AUDITORIA.SEDE_CENTRAL[fase];
    
    if (dias < rangos.min || dias > rangos.max) {
      throw new ValidationError(
        `EM-PT-004: La fase de ${fase} en auditoría de SEDE CENTRAL debe estar entre ${rangos.min} y ${rangos.max} días. Recibidos: ${dias} días`,
        'DURACION_INVALIDA',
        'EM-PT-004'
      );
    }
  }
};

// ============================================
// TRANSICIONES DE ESTADO KANBAN
// ============================================

export const TRANSICIONES_VALIDAS = {
  BACKLOG: ['PLANEACION'],
  PLANEACION: ['EJECUCION', 'BACKLOG'],
  EJECUCION: ['COMUNICACION', 'PLANEACION'],
  COMUNICACION: ['CERRADO', 'EJECUCION'],
  CERRADO: []
} as const;

export const VALIDACIONES_KANBAN = {
  /**
   * Validar que la transición de estado sea permitida
   */
  validarTransicionEstado(
    estadoActual: string,
    estadoNuevo: string,
    auditoria: Auditoria
  ): void {
    const transicionesPermitidas = TRANSICIONES_VALIDAS[estadoActual as keyof typeof TRANSICIONES_VALIDAS];
    
    if (!transicionesPermitidas || !transicionesPermitidas.includes(estadoNuevo as any)) {
      throw new ValidationError(
        `No se puede cambiar el estado de ${estadoActual} a ${estadoNuevo}. Transiciones permitidas: ${transicionesPermitidas?.join(', ') || 'ninguna'}`,
        'TRANSICION_INVALIDA'
      );
    }

    // Validaciones específicas por transición
    if (estadoActual === 'BACKLOG' && estadoNuevo === 'PLANEACION') {
      if (!auditoria.equipoAuditor || auditoria.equipoAuditor.length === 0) {
        throw new ValidationError(
          'Debe asignar un equipo auditor antes de iniciar la planeación',
          'EQUIPO_REQUERIDO'
        );
      }
    }

    if (estadoActual === 'PLANEACION' && estadoNuevo === 'EJECUCION') {
      if (!auditoria.planTrabajoAprobado) {
        throw new ValidationError(
          'Debe aprobar el Plan de Trabajo Individual (EM-FO-003) antes de iniciar la ejecución',
          'PLAN_TRABAJO_REQUERIDO'
        );
      }
    }

    if (estadoActual === 'EJECUCION' && estadoNuevo === 'COMUNICACION') {
      if (!auditoria.hallazgos || auditoria.hallazgos.length === 0) {
        throw new ValidationError(
          'Debe registrar al menos un hallazgo, observación o recomendación antes de pasar a comunicación',
          'HALLAZGOS_REQUERIDOS'
        );
      }
    }

    if (estadoActual === 'COMUNICACION' && estadoNuevo === 'CERRADO') {
      if (!auditoria.informeFinal) {
        throw new ValidationError(
          'Debe generar el Informe Final de Auditoría antes de cerrar',
          'INFORME_FINAL_REQUERIDO'
        );
      }
      if (!auditoria.planMejora) {
        throw new ValidationError(
          'Debe crear el Plan de Mejoramiento (EM-FO-002) antes de cerrar la auditoría',
          'PLAN_MEJORA_REQUERIDO'
        );
      }
    }
  }
};

// ============================================
// VALIDACIONES FLUJO PLAN MEJORAMIENTO → SEGUIMIENTO
// ============================================

/**
 * Estados del plan de mejoramiento que permiten acceso a seguimientos.
 * Regla de negocio: Solo se puede registrar seguimiento cuando el plan está aprobado.
 */
export const ESTADOS_PLAN_PERMITEN_SEGUIMIENTO = [
  'APROBADO',
  'EN_EJECUCION',
  'COMPLETADO'
] as const;

/**
 * Etapas de auditoría que permiten acceso a seguimientos de planes de mejoramiento.
 * Regla de negocio: Seguimientos solo desde Comunicación en adelante.
 */
export const ETAPAS_AUDITORIA_PERMITEN_SEGUIMIENTO = [
  'COMUNICACION',
  'SEGUIMIENTO', 
  'FINALIZADA'
] as const;

/**
 * Valida si un plan de mejoramiento permite acceso a seguimientos
 * @param estadoPlan Estado actual del plan de mejoramiento
 * @param etapaAuditoria Etapa actual de la auditoría (opcional)
 * @returns Objeto con resultado de validación y mensaje de error si aplica
 */
export function validarAccesoSeguimiento(
  estadoPlan: string,
  etapaAuditoria?: string
): { permitido: boolean; mensaje?: string } {
  // Validar estado del plan
  if (!ESTADOS_PLAN_PERMITEN_SEGUIMIENTO.includes(estadoPlan as any)) {
    return {
      permitido: false,
      mensaje: `El Plan de Mejoramiento debe estar APROBADO para registrar seguimientos. ` +
        `Estado actual: "${estadoPlan}". Flujo: Comunicación → Formulación → Revisión → APROBACIÓN → Seguimiento.`
    };
  }

  // Validar etapa de auditoría si está definida
  if (etapaAuditoria && !ETAPAS_AUDITORIA_PERMITEN_SEGUIMIENTO.includes(etapaAuditoria as any)) {
    return {
      permitido: false,
      mensaje: `La auditoría debe estar en etapa de Comunicación, Seguimiento o Finalizada. ` +
        `Etapa actual: "${etapaAuditoria}".`
    };
  }

  return { permitido: true };
}

// ============================================
// EM-FO-002 - FÓRMULAS DE CUMPLIMIENTO
// ============================================

/**
 * Configuración de seguimiento trimestral
 */
export const SEGUIMIENTO_PERIODICIDAD = [
  { numero: 1, mes: 'JULIO', corte: '07-31', entrega: '08-07' },
  { numero: 2, mes: 'OCTUBRE', corte: '10-31', entrega: '11-07' },
  { numero: 3, mes: 'ENERO', corte: '01-31', entrega: '02-07' },
  { numero: 4, mes: 'ABRIL', corte: '04-30', entrega: '05-07' }
] as const;

/**
 * Configuración de alertas
 */
export const ALERTAS_CONFIG = {
  RECORDATORIO_PREVIO: 7,   // días antes
  ALERTA_VENCIMIENTO: 0,    // día del vencimiento
  ESCALAMIENTO: 3           // días después sin acción
} as const;

export const FORMULAS_EMFO002 = {
  /**
   * ⚠️ FÓRMULA OFICIAL EMFO002 columna L
   * Original Excel: =IF(K>=F,2,IF(K>=1,1,0))
   * 
   * @param cantImpl - Cantidad implementada (columna K)
   * @param cantProg - Cantidad programada (columna F)
   * @returns 2 = Completo (100%), 1 = Parcial (1-99%), 0 = Pendiente (0%)
   */
  calcularCumplimiento(cantImpl: number, cantProg: number): 0 | 1 | 2 {
    if (cantImpl >= cantProg) return 2; // Completo
    if (cantImpl >= 1) return 1;         // Parcial
    return 0;                             // Pendiente
  },

  /**
   * Fórmula de Efectividad
   * 
   * @param controlesAplicados - ¿Se aplicaron controles? (SI/NO)
   * @param situacionNoRepitio - ¿La situación no se repitió? (SI/NO)
   * @returns 2 = Efectiva, 1 = Parcialmente efectiva, 0 = Inefectiva
   */
  calcularEfectividad(controlesAplicados: boolean, situacionNoRepitio: boolean): 0 | 1 | 2 {
    if (controlesAplicados && situacionNoRepitio) return 2;  // Efectiva
    if (controlesAplicados || situacionNoRepitio) return 1;  // Parcial
    return 0;                                                 // Inefectiva
  },

  /**
   * Semáforo visual según porcentaje
   * 
   * @param porcentaje - Porcentaje de cumplimiento (0-100)
   * @returns Color del semáforo
   */
  getSemaforo(porcentaje: number): 'VERDE' | 'AMARILLO' | 'ROJO' {
    if (porcentaje >= 80) return 'VERDE';    // 80-100%
    if (porcentaje >= 50) return 'AMARILLO'; // 50-79%
    return 'ROJO';                            // 0-49%
  },

  /**
   * Calcular porcentaje de cumplimiento
   */
  calcularPorcentaje(cantImpl: number, cantProg: number): number {
    if (cantProg === 0) return 0;
    return Math.min(Math.round((cantImpl / cantProg) * 100), 100);
  }
};

// ============================================
// GUÍA DAFP - PRIORIZACIÓN DE RIESGOS
// ============================================

export const DAFP_CRITICIDAD = {
  ALTO: 5,
  MEDIO: 3,
  BAJO: 1
} as const;

export const DAFP_EXPOSICION = {
  MAS_100: 5,
  ENTRE_50_100: 3,
  MENOS_50: 1
} as const;

export const FORMULAS_DAFP = {
  /**
   * Fórmula de riesgo DAFP
   * Resultado: Alto (>10), Medio (5-10), Bajo (<5)
   */
  calcularRiesgoDafp(
    criticidad: number,
    exposicion: number,
    mitigantes: number
  ): number {
    return (criticidad * exposicion) / Math.max(mitigantes, 1);
  },

  /**
   * Clasificar nivel de riesgo
   */
  clasificarRiesgo(valorRiesgo: number): 'EXTREMO' | 'ALTO' | 'MODERADO' | 'BAJO' {
    if (valorRiesgo > 15) return 'EXTREMO';
    if (valorRiesgo > 10) return 'ALTO';
    if (valorRiesgo >= 5) return 'MODERADO';
    return 'BAJO';
  },

  /**
   * Calcular frecuencia de auditoría según nivel de riesgo
   */
  calcularFrecuenciaAuditoria(
    nivelRiesgo: 'EXTREMO' | 'ALTO' | 'MODERADO' | 'BAJO',
    resultadoAnterior: 'ADECUADO' | 'INADECUADO'
  ): number {
    const base = {
      EXTREMO: 1,
      ALTO: resultadoAnterior === 'INADECUADO' ? 1 : 2,
      MODERADO: resultadoAnterior === 'INADECUADO' ? 2 : 3,
      BAJO: resultadoAnterior === 'INADECUADO' ? 3 : 4
    };
    return base[nivelRiesgo];
  }
};

// ============================================
// VALIDACIONES GENERALES
// ============================================

export const VALIDACIONES_GENERALES = {
  /**
   * Validar que las fechas estén dentro del año fiscal
   */
  validarFechasAñoFiscal(
    fechaInicio: Date,
    fechaFin: Date,
    añoFiscal: number
  ): void {
    const añoInicio = fechaInicio.getFullYear();
    const añoFin = fechaFin.getFullYear();

    if (añoInicio !== añoFiscal || añoFin !== añoFiscal) {
      throw new ValidationError(
        `Las fechas deben estar dentro del año fiscal ${añoFiscal}. Recibido: inicio ${añoInicio}, fin ${añoFin}`,
        'FECHA_FUERA_RANGO'
      );
    }

    if (fechaFin <= fechaInicio) {
      throw new ValidationError(
        'La fecha de fin debe ser posterior a la fecha de inicio',
        'FECHA_INVALIDA'
      );
    }
  },

  /**
   * Validar formato de código de auditoría
   */
  validarCodigoAuditoria(codigo: string, año: number): void {
    const patron = new RegExp(`^AUD-${año}-\\d{3}$`);
    if (!patron.test(codigo)) {
      throw new ValidationError(
        `El código de auditoría debe seguir el formato AUD-${año}-XXX (ejemplo: AUD-${año}-001)`,
        'CODIGO_INVALIDO'
      );
    }
  },

  /**
   * Validar responsable no vacío
   */
  validarResponsable(responsableId: string | null | undefined): void {
    if (!responsableId || responsableId.trim() === '') {
      throw new ValidationError(
        'Debe asignar un responsable',
        'RESPONSABLE_REQUERIDO'
      );
    }
  }
};

// ============================================
// EXPORTACIÓN PRINCIPAL
// ============================================

/**
 * Validador principal que agrupa todas las validaciones
 */
export const ValidadorNormativoOCIG = {
  decreto648: VALIDACIONES_DECRETO_648,
  territorial: VALIDACIONES_TERRITORIAL,
  kanban: VALIDACIONES_KANBAN,
  formulas: FORMULAS_EMFO002,
  dafp: FORMULAS_DAFP,
  general: VALIDACIONES_GENERALES
};

export default ValidadorNormativoOCIG;
