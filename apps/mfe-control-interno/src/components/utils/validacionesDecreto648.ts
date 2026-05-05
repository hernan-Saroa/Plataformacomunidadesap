/**
 * ============================================
 * VALIDACIONES DECRETO 648/2017
 * ============================================
 * 
 * Validaciones obligatorias para el Plan Anual de Auditoría
 * según el Decreto 648 de 2017 (Control Interno)
 * 
 * REGLAS CRÍTICAS:
 * 1. El Plan DEBE tener EXACTAMENTE 5 roles
 * 2. Cada rol DEBE tener AL MENOS 1 actividad
 * 3. Los roles están predefinidos (no se pueden agregar/eliminar)
 * 4. Todas las actividades deben tener responsable y fechas
 */

export interface Actividad {
  id: string;
  nombre: string;
  descripcion: string;
  responsableId: string;
  responsableNombre: string;
  fechaInicio: string;
  fechaFin: string;
  porcentaje: number;
  estado: 'Pendiente' | 'En Ejecución' | 'Completada' | 'Retrasada';
  // Campos de seguimiento y evaluación
  control?: string;
  evaluacion?: string;
  seguimiento?: string;
  // Observaciones del director
  observacionesDirector?: string;
}

export interface RolDecreto {
  id: number;
  nombre: string;
  descripcion: string;
  icono: string;
  color: string;
  actividades: Actividad[];
  obligatorio: boolean;
}

export interface PlanAnual {
  id: string;
  año: number;
  estado: 'Borrador' | 'En Revisión' | 'Aprobado' | 'Vigente' | 'Cerrado';
  jefeOCI: {
    id: string;
    nombre: string;
    cargo: string;
  };
  roles: RolDecreto[];
  fechaCreacion: string;
  fechaAprobacion?: string;
  version: number;
}

export interface ResultadoValidacion {
  valido: boolean;
  errores: string[];
  advertencias: string[];
}

/**
 * Validación Principal - Decreto 648/2017
 * 
 * Verifica que el Plan Anual cumpla con TODOS los requisitos del decreto
 */
export function validarDecreto648(plan: PlanAnual): ResultadoValidacion {
  const errores: string[] = [];
  const advertencias: string[] = [];

  // ============================================
  // VALIDACIÓN 1: EXACTAMENTE 5 ROLES
  // ============================================
  if (plan.roles.length !== 5) {
    errores.push(
      `El Plan Anual debe tener EXACTAMENTE 5 roles según Decreto 648/2017. ` +
      `Actualmente tiene ${plan.roles.length} rol${plan.roles.length !== 1 ? 'es' : ''}.`
    );
  }

  // ============================================
  // VALIDACIÓN 2: VERIFICAR ROLES OBLIGATORIOS
  // ============================================
  const rolesEsperados = [
    'Liderazgo Estratégico',
    'Enfoque Prevención',
    'Relación Entes Control',
    'Evaluación Gestión Riesgos',
    'Evaluación y Seguimiento'
  ];

  const rolesPresentes = plan.roles.map(r => r.nombre);
  const rolesFaltantes = rolesEsperados.filter(r => !rolesPresentes.includes(r));

  if (rolesFaltantes.length > 0) {
    errores.push(
      `Faltan roles obligatorios del Decreto 648/2017: ${rolesFaltantes.join(', ')}`
    );
  }

  // ============================================
  // VALIDACIÓN 3: CADA ROL CON AL MENOS 1 ACTIVIDAD
  // ============================================
  const rolesSinActividades = plan.roles.filter(rol => rol.actividades.length === 0);
  
  if (rolesSinActividades.length > 0) {
    rolesSinActividades.forEach(rol => {
      errores.push(
        `El rol "${rol.nombre}" NO tiene actividades asignadas. ` +
        `Debe tener al menos 1 actividad.`
      );
    });
  }

  // ============================================
  // VALIDACIÓN 4: ACTIVIDADES CON DATOS COMPLETOS
  // ============================================
  plan.roles.forEach(rol => {
    rol.actividades.forEach((act, idx) => {
      // Validar nombre
      if (!act.nombre || act.nombre.trim() === '') {
        errores.push(
          `La actividad #${idx + 1} del rol "${rol.nombre}" no tiene nombre`
        );
      }

      // Validar responsable
      if (!act.responsableId || !act.responsableNombre) {
        errores.push(
          `La actividad "${act.nombre}" del rol "${rol.nombre}" no tiene responsable asignado`
        );
      }

      // Validar fechas
      if (!act.fechaInicio || !act.fechaFin) {
        errores.push(
          `La actividad "${act.nombre}" del rol "${rol.nombre}" no tiene fechas completas`
        );
      }

      // Validar que fecha fin sea posterior a fecha inicio
      if (act.fechaInicio && act.fechaFin) {
        const inicio = new Date(act.fechaInicio);
        const fin = new Date(act.fechaFin);
        
        if (fin < inicio) {
          errores.push(
            `La actividad "${act.nombre}" tiene fecha de fin anterior a fecha de inicio`
          );
        }
      }

      // Validar que las fechas estén dentro del año fiscal del plan
      if (act.fechaInicio) {
        const añoActividad = new Date(act.fechaInicio).getFullYear();
        if (añoActividad !== plan.año) {
          advertencias.push(
            `La actividad "${act.nombre}" tiene fechas fuera del año fiscal ${plan.año}`
          );
        }
      }
    });
  });

  // ============================================
  // VALIDACIÓN 5: AÑO FISCAL VÁLIDO
  // ============================================
  const añoActual = new Date().getFullYear();
  if (plan.año < añoActual - 1) {
    advertencias.push(
      `El Plan es para el año ${plan.año}, que ya pasó. ` +
      `Considere crear un plan para ${añoActual} o ${añoActual + 1}.`
    );
  }

  if (plan.año > añoActual + 2) {
    advertencias.push(
      `El Plan es para el año ${plan.año}, que está muy lejano. ` +
      `Usualmente se planifica con máximo 1 año de anticipación.`
    );
  }

  // ============================================
  // VALIDACIÓN 6: JEFE OCI ASIGNADO
  // ============================================
  if (!plan.jefeOCI || !plan.jefeOCI.id) {
    errores.push('El Plan Anual debe tener un Jefe de OCI asignado');
  }

  return {
    valido: errores.length === 0,
    errores,
    advertencias
  };
}

/**
 * Validación Rápida - Solo verifica lo crítico
 */
export function validacionRapida(plan: PlanAnual): boolean {
  return (
    plan.roles.length === 5 &&
    plan.roles.every(rol => rol.actividades.length > 0) &&
    plan.jefeOCI?.id
  );
}

/**
 * Contar actividades totales del plan
 */
export function contarActividadesTotales(plan: PlanAnual): number {
  return plan.roles.reduce((total, rol) => total + rol.actividades.length, 0);
}

/**
 * Calcular progreso general del plan
 */
export function calcularProgresoGeneral(plan: PlanAnual): number {
  const totalActividades = contarActividadesTotales(plan);
  
  if (totalActividades === 0) return 0;

  const sumaProgreso = plan.roles.reduce((total, rol) => {
    return total + rol.actividades.reduce((sum, act) => sum + act.porcentaje, 0);
  }, 0);

  return Math.round(sumaProgreso / totalActividades);
}

/**
 * Obtener roles sin actividades
 */
export function obtenerRolesSinActividades(plan: PlanAnual): RolDecreto[] {
  return plan.roles.filter(rol => rol.actividades.length === 0);
}

/**
 * Obtener estadísticas del plan
 */
export function obtenerEstadisticasPlan(plan: PlanAnual) {
  const totalActividades = contarActividadesTotales(plan);
  const rolesConActividades = plan.roles.filter(r => r.actividades.length > 0).length;
  const rolesSinActividades = 5 - rolesConActividades;
  
  const actividadesPorEstado = {
    Pendiente: 0,
    'En Ejecución': 0,
    Completada: 0,
    Retrasada: 0
  };

  plan.roles.forEach(rol => {
    rol.actividades.forEach(act => {
      actividadesPorEstado[act.estado]++;
    });
  });

  const progresoGeneral = calcularProgresoGeneral(plan);

  return {
    totalActividades,
    rolesConActividades,
    rolesSinActividades,
    actividadesPorEstado,
    progresoGeneral,
    cumpleDecreto648: validacionRapida(plan)
  };
}

/**
 * Validar antes de aprobar
 * 
 * Requisitos para aprobar:
 * 1. Cumplir con Decreto 648
 * 2. Todas las actividades con datos completos
 * 3. No estar ya aprobado
 */
export function validarAntesDeAprobar(plan: PlanAnual): ResultadoValidacion {
  const resultado = validarDecreto648(plan);

  // Validación adicional: No aprobar un plan ya aprobado
  if (plan.estado === 'Aprobado' || plan.estado === 'Vigente') {
    resultado.errores.push(
      `El plan ya está en estado "${plan.estado}". No se puede aprobar nuevamente.`
    );
    resultado.valido = false;
  }

  // Validación: Plan debe estar en revisión o borrador
  if (plan.estado === 'Cerrado') {
    resultado.errores.push(
      'El plan está cerrado. No se puede aprobar un plan cerrado.'
    );
    resultado.valido = false;
  }

  return resultado;
}

/**
 * Generar mensaje de error amigable
 */
export function generarMensajeError(resultado: ResultadoValidacion): string {
  if (resultado.valido) return '';

  let mensaje = '⚠️ El Plan Anual NO cumple con el Decreto 648/2017:\n\n';
  
  resultado.errores.forEach((error, idx) => {
    mensaje += `${idx + 1}. ${error}\n`;
  });

  if (resultado.advertencias.length > 0) {
    mensaje += '\n⚡ Advertencias:\n';
    resultado.advertencias.forEach((adv, idx) => {
      mensaje += `• ${adv}\n`;
    });
  }

  return mensaje;
}

/**
 * Generar mensaje de validación para toast
 */
export function generarMensajeToast(resultado: ResultadoValidacion): {
  titulo: string;
  descripcion: string;
  tipo: 'success' | 'error' | 'warning';
} {
  if (resultado.valido) {
    return {
      titulo: '✅ Plan Anual Válido',
      descripcion: 'Cumple con todos los requisitos del Decreto 648/2017',
      tipo: 'success'
    };
  }

  if (resultado.errores.length > 0) {
    return {
      titulo: '❌ Plan Anual Inválido',
      descripcion: `${resultado.errores.length} error${resultado.errores.length !== 1 ? 'es' : ''} encontrado${resultado.errores.length !== 1 ? 's' : ''}. Revise el plan.`,
      tipo: 'error'
    };
  }

  return {
    titulo: '⚠️ Advertencias',
    descripcion: `${resultado.advertencias.length} advertencia${resultado.advertencias.length !== 1 ? 's' : ''}`,
    tipo: 'warning'
  };
}
