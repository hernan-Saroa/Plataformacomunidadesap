/**
 * ============================================
 * CONSTANTES OFICIALES - DECRETO 648/2017
 * ============================================
 * 
 * 5 Roles obligatorios y 22 Actividades fijas
 * Basado en: Decreto 648/2017 - ESAP (CORREGIDO 31-Ene-2026)
 * 
 * FUENTE: Decreto 648 de 2017 - ESAP
 * RESPONSABLE: Mario Oswaldo Bernal (Jefe OCI)
 * 
 * CORRECCIÓN APLICADA (26-Feb-2026):
 * - ROL 3: Actividades 15, 16, 17 (Evaluación de la Gestión del Riesgo - 48)
 * - ROL 4: Actividades 18, 19, 20 (Evaluación y Seguimiento - 60)
 * - ROL 5: Actividades 21, 22, 23, 24 (Relación con Entes Externos de Control)
 */

export interface ActividadOficial {
  id: number;
  nombre: string;
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
  responsable: string;
  control: string;
  evaluacion: string;
  seguimiento: {
    descripcion: string;
    fechas: string;
    evaluacionParcial?: string;
  }[];
}

export interface RolOficial {
  numero: number;
  nombre: string;
  icono: string;
  color: string;
  responsable: string;
  actividades: ActividadOficial[];
}

/**
 * ============================================
 * ROL 1: LIDERAZGO ESTRATÉGICO
 * ============================================
 */
export const ROL_1_LIDERAZGO_ESTRATEGICO: RolOficial = {
  numero: 1,
  nombre: 'Liderazgo Estratégico',
  icono: '👔',
  color: '#003DA5',
  responsable: 'Mario Oswaldo Bernal',
  actividades: [
    {
      id: 1,
      nombre: 'Establecer canales de comunicación directa con el Director Nacional de la ESAP',
      descripcion: 'Mantener comunicación fluida y directa con la Alta Dirección para garantizar alineación estratégica',
      fechaInicio: '2026-01-01',
      fechaFin: '2026-12-31',
      responsable: 'Mario Oswaldo Bernal',
      control: 'Se hace seguimiento semestral',
      evaluacion: '50% de avance',
      seguimiento: [
        {
          descripcion: 'Publicar todos los informes de gestión en la página web institucional y allegar al correo del Director',
          fechas: '2025-06-30'
        },
        {
          descripcion: 'Enviar comunicaciones internas hechas a los procesos de la ESAP al Señor Director',
          fechas: '2025-12-31',
          evaluacionParcial: '50%'
        }
      ]
    },
    {
      id: 2,
      nombre: 'Verificar a través del Plan anual de auditorías, el cumplimiento de metas, indicadores, procesos estratégicos de la entidad y riesgos asociados a estos',
      descripcion: 'Asegurar que el PAI cubra los procesos estratégicos y evalúe el cumplimiento de metas institucionales',
      fechaInicio: '2026-01-01',
      fechaFin: '2026-12-31',
      responsable: 'Mario Oswaldo Bernal',
      control: 'Se hace seguimiento cuatrimestral',
      evaluacion: '50% de avance',
      seguimiento: [
        {
          descripcion: 'Socializar resultados en el Comité Institucional de Gestión y Desempeño',
          fechas: '30/04/2025, 31/08/2025, 31/12/2025'
        }
      ]
    },
    {
      id: 3,
      nombre: 'Establecer en el Comité de Gestión y Desempeño la periodicidad y alcance de rendición de informes estratégicos',
      descripcion: 'Definir formalmente la estrategia de rendición de informes ante el Comité',
      fechaInicio: '2026-01-01',
      fechaFin: '2026-12-31',
      responsable: 'Mario Oswaldo Bernal',
      control: 'Se hace seguimiento anual',
      evaluacion: '10% de avance',
      seguimiento: [
        {
          descripcion: 'Socializar Plan Anual de Auditoría en el Comité Institucional de Gestión y Desempeño',
          fechas: '2025-02-28'
        }
      ]
    },
    {
      id: 4,
      nombre: 'Presentar ante el Comité Institucional de Coordinación de Control Interno los resultados de la evaluación de la operación de la primera y segunda línea de defensa',
      descripcion: 'Analizar las variaciones del ambiente organizacional y del entorno, identificando procesos críticos, controles y servicios que tengan un impacto significativo en el cumplimiento de los objetivos institucionales',
      fechaInicio: '2026-01-01',
      fechaFin: '2026-12-31',
      responsable: 'Mario Oswaldo Bernal',
      control: 'Se hace seguimiento semestral',
      evaluacion: '60% de avance',
      seguimiento: [
        {
          descripcion: 'Hacer informe de los resultados de la evaluación independiente del Estado del Sistema de Control Interno, a través de sus cinco (5) componentes y publicar en la página web',
          fechas: '10/07/2025, 31/12/2025'
        }
      ]
    },
    {
      id: 5,
      nombre: 'Informar al jefe de la entidad sobre las alertas de riesgo fiscal identificadas y en general los resultados de los ejercicios de auditoría',
      descripcion: 'Plantear recomendaciones estratégicas para el fortalecimiento y la prevención',
      fechaInicio: '2026-01-01',
      fechaFin: '2026-12-31',
      responsable: 'Mario Oswaldo Bernal',
      control: 'Se hace informe cuatrimestral',
      evaluacion: '60% de avance',
      seguimiento: [
        {
          descripcion: 'Hacer informe, publicar en la página web, diligenciar el seguimiento como tercera línea en ISOLUCION',
          fechas: '30/04/2025, 31/08/2025, 31/12/2025'
        }
      ]
    },
    {
      id: 6,
      nombre: 'Participación frente a los procesos de empalme cuando se dan cambios de administración',
      descripcion: 'Garantizar continuidad y transferencia de conocimiento en cambios de dirección',
      fechaInicio: 'N/A',
      fechaFin: 'N/A',
      responsable: 'N/A',
      control: 'N/A',
      evaluacion: '0% de avance',
      seguimiento: [
        {
          descripcion: 'Se hace seguimiento el último año',
          fechas: 'Según cambio de administración'
        }
      ]
    }
  ]
};

/**
 * ============================================
 * ROL 2: ENFOQUE PREVENCIÓN
 * ============================================
 */
export const ROL_2_ENFOQUE_PREVENCION: RolOficial = {
  numero: 2,
  nombre: 'Enfoque a la prevención',
  icono: '🛡️',
  color: '#2962FF',
  responsable: 'Mario Oswaldo Bernal',
  actividades: [
    {
      id: 7,
      nombre: 'Programar en los comités institucionales más estratégicos sesiones que sensibilicen sobre la articulación del sistema de control interno y el control externo',
      descripcion: 'Comité de gestión y desempeño institucional, de coordinación de control interno, de gerencia u otro',
      fechaInicio: '2026-01-01',
      fechaFin: '2026-12-31',
      responsable: 'Mario Oswaldo Bernal',
      control: 'Se hace seguimiento semestral',
      evaluacion: '60% de avance',
      seguimiento: [
        {
          descripcion: 'Socializar articulación del sistema de control interno y el control externo (Guía de auditoría)',
          fechas: '10/07/2025, 31/12/2025'
        }
      ]
    },
    {
      id: 8,
      nombre: 'Acompañar a los procesos en la formulación de planes de mejoramiento',
      descripcion: 'Asesorar y brindar herramientas para la construcción efectiva de planes de mejoramiento',
      fechaInicio: '2026-01-01',
      fechaFin: '2026-12-31',
      responsable: 'Mario Oswaldo Bernal',
      control: 'Se hace seguimiento trimestral',
      evaluacion: '60% de avance',
      seguimiento: [
        {
          descripcion: 'Asesorar y suministrar herramientas como el diagrama causa efecto',
          fechas: '30/04/2025, 31/08/2025, 31/12/2025'
        }
      ]
    },
    {
      id: 9,
      nombre: 'Adoptar formalmente un procedimiento para el seguimiento al Plan de Mejoramiento, con esquema de semaforización',
      descripcion: 'Generar informe de alertas a los responsables internos. Hacer mesas de trabajo con los responsables de las acciones que se encuentren en alguna de las alertas',
      fechaInicio: '2026-01-01',
      fechaFin: '2026-12-31',
      responsable: 'Mario Oswaldo Bernal',
      control: 'Se hace seguimiento anual',
      evaluacion: '60% de avance',
      seguimiento: [
        {
          descripcion: 'Documentar procedimiento y formato para hacer seguimiento al cumplimiento y efectividad de las acciones de mejora',
          fechas: '2026-12-31'
        }
      ]
    },
    {
      id: 10,
      nombre: 'Elaborar y presentar informe en relación con el avance del plan de mejoramiento en el Comité Institucional de Coordinación de Control Interno',
      descripcion: 'Seguimiento periódico al cumplimiento de las acciones de mejora',
      fechaInicio: '2026-01-01',
      fechaFin: '2026-12-31',
      responsable: 'Mario Oswaldo Bernal',
      control: 'Se hace seguimiento trimestral',
      evaluacion: '60% de avance',
      seguimiento: [
        {
          descripcion: 'Socializar resultados en el Comité Institucional de Coordinación de Control Interno',
          fechas: '30/04/2025, 31/08/2025, 31/12/2025'
        }
      ]
    },
    {
      id: 11,
      nombre: 'Hacer seguimiento a decisiones en firme de órganos de control e investigación sobre procesos penales, fiscales y disciplinarios',
      descripcion: 'Derivados de hallazgos o denuncias relacionadas con la entidad',
      fechaInicio: '2026-01-01',
      fechaFin: '2026-12-31',
      responsable: 'Mario Oswaldo Bernal',
      control: 'Se hace seguimiento semestral',
      evaluacion: '60% de avance',
      seguimiento: [
        {
          descripcion: 'Socializar resultados en el Comité Institucional de Coordinación de Control Interno',
          fechas: '10/07/2025, 31/12/2025'
        }
      ]
    },
    {
      id: 12,
      nombre: 'Desarrollar diagnósticos para la mejora en la gestión del riesgo en todos sus ámbitos',
      descripcion: 'Evaluación integral de la gestión de riesgos institucional',
      fechaInicio: '2026-01-01',
      fechaFin: '2026-12-31',
      responsable: 'Mario Oswaldo Bernal',
      control: 'Se hace seguimiento semestral',
      evaluacion: '60% de avance',
      seguimiento: [
        {
          descripcion: 'Establecer a través de la auditoría interna la efectividad de los controles para evitar la materialización de riesgos y socializar en el Comité Institucional de Coordinación de Control Interno',
          fechas: '10/07/2025, 31/12/2025'
        }
      ]
    },
    {
      id: 13,
      nombre: 'Asesorar a la alta dirección para la articulación del esquema de líneas de defensa',
      descripcion: 'Fortalecer el modelo de tres líneas de defensa en el Sistema de Control Interno',
      fechaInicio: '2026-01-01',
      fechaFin: '2026-12-31',
      responsable: 'Mario Oswaldo Bernal',
      control: 'Se hace seguimiento semestral',
      evaluacion: '60% de avance',
      seguimiento: [
        {
          descripcion: 'Realizar capacitaciones del esquema de tres líneas de defensa del Sistema de Control Interno',
          fechas: '10/07/2025, 31/12/2025'
        }
      ]
    },
    {
      id: 14,
      nombre: 'Establecer una estrategia de acompañamiento de la batería de indicadores y diseño de tableros de control',
      descripcion: 'Fortalecer la medición del desempeño institucional',
      fechaInicio: '2026-01-01',
      fechaFin: '2026-12-31',
      responsable: 'Mario Oswaldo Bernal',
      control: 'Se hace seguimiento semestral',
      evaluacion: '60% de avance',
      seguimiento: [
        {
          descripcion: 'Realizar capacitaciones',
          fechas: '10/07/2025, 31/12/2025'
        }
      ]
    }
  ]
};

/**
 * ============================================
 * ROL 3: EVALUACIÓN DE LA GESTIÓN DEL RIESGO (48) - CORREGIDO
 * ============================================
 */
export const ROL_3_EVALUACION_RIESGOS: RolOficial = {
  numero: 3,
  nombre: 'Evaluación de la gestión del riesgo',
  icono: '⚠️',
  color: '#FF6D00',
  responsable: 'Mario Oswaldo Bernal',
  actividades: [
    {
      id: 15,
      nombre: 'Revisar la adecuación y/o actualización de la política de administración del riesgo y si se evalúa periódicamente su implementación',
      descripcion: 'Verificar que esté formalizada a través de acto administrativo o actuación administrativa y que contenga (objetivo, alcance, niveles de aceptación del riesgo, niveles para calificar el impacto, tratamiento del riesgo)',
      fechaInicio: '2026-01-01',
      fechaFin: '2026-12-31',
      responsable: 'Mario Oswaldo Bernal',
      control: 'Se hace seguimiento semestral',
      evaluacion: '48% de avance',
      seguimiento: [
        {
          descripcion: 'Revisar que está formalizada y que contenga (objetivo, alcance, niveles de aceptación del riesgo, niveles para calificar el impacto, tratamiento del riesgo) de conformidad con la Guía para la Administración del Riesgo',
          fechas: '10/07/2025, 31/12/2025'
        }
      ]
    },
    {
      id: 16,
      nombre: 'Promover escenarios para que la dirección comprenda el valor de la gestión de riesgos como paso previo para promover el proceso en toda la organización. Proporcionar la información de riesgos para que la alta dirección la utilice en la toma de decisiones',
      descripcion: 'Generar escenarios para que la dirección comprenda la importancia de la gestión de riesgos',
      fechaInicio: '2026-01-01',
      fechaFin: '2026-12-31',
      responsable: 'Mario Oswaldo Bernal',
      control: 'Se hace seguimiento semestral',
      evaluacion: '48% de avance',
      seguimiento: [
        {
          descripcion: 'Socializar resultados en el Comité Institucional de Coordinación de Control Interno',
          fechas: '10/07/2025, 31/12/2025'
        }
      ]
    },
    {
      id: 17,
      nombre: 'Evaluar prácticas actuales de gestión del riesgo para migrar a esquemas más efectivos. Articular ejercicios de seguimiento y monitoreo en el marco del Esquema de las líneas de defensa',
      descripcion: 'Migrar a esquemas más efectivos y articular ejercicios de seguimiento y monitoreo',
      fechaInicio: '2026-01-01',
      fechaFin: '2026-12-31',
      responsable: 'Mario Oswaldo Bernal',
      control: 'Se hace seguimiento cuatrimestral',
      evaluacion: '48% de avance',
      seguimiento: [
        {
          descripcion: 'Socializar resultados en el Comité Institucional de Coordinación de Control Interno',
          fechas: '30/04/2025, 31/08/2025, 31/12/2025'
        }
      ]
    }
  ]
};

/**
 * ============================================
 * ROL 4: EVALUACIÓN Y SEGUIMIENTO (60) - CORREGIDO
 * ============================================
 */
export const ROL_4_EVALUACION_SEGUIMIENTO: RolOficial = {
  numero: 4,
  nombre: 'Evaluación y seguimiento',
  icono: '✓',
  color: '#AA00FF',
  responsable: 'Mario Oswaldo Bernal',
  actividades: [
    {
      id: 18,
      nombre: 'Efectuar auditorías internas con enfoque preventivo y las especiales acorde al programa de auditoría',
      descripcion: 'Ejecución del Plan Anual de Auditoría según cronograma establecido',
      fechaInicio: '2026-01-01',
      fechaFin: '2026-12-31',
      responsable: 'Mario Oswaldo Bernal',
      control: 'Se hace seguimiento mensual',
      evaluacion: '60% de avance',
      seguimiento: [
        {
          descripcion: 'Realizar seguimiento al cumplimiento de ejecución de las auditorías establecidas en el Programa de Auditoría',
          fechas: 'Mensual'
        }
      ]
    },
    {
      id: 19,
      nombre: 'Seguimiento a planes de mejoramiento internos y externos',
      descripcion: 'Monitorear el cumplimiento y efectividad de las acciones de mejora',
      fechaInicio: '2026-01-01',
      fechaFin: '2026-12-31',
      responsable: 'Mario Oswaldo Bernal',
      control: 'Se hace seguimiento trimestral',
      evaluacion: '60% de avance',
      seguimiento: [
        {
          descripcion: 'Asesorar y suministrar herramientas como el diagrama causa efecto',
          fechas: '30/04/2025, 31/08/2025, 31/12/2025'
        }
      ]
    },
    {
      id: 20,
      nombre: 'Establecer una estrategia de acompañamiento de la batería de indicadores y diseño de tableros de control',
      descripcion: 'Fortalecer la medición del desempeño institucional a través del seguimiento de indicadores',
      fechaInicio: '2026-01-01',
      fechaFin: '2026-12-31',
      responsable: 'Mario Oswaldo Bernal',
      control: 'Se hace seguimiento semestral',
      evaluacion: '60% de avance',
      seguimiento: [
        {
          descripcion: 'Realizar capacitaciones y acompañamiento en el diseño de tableros de control',
          fechas: '10/07/2025, 31/12/2025'
        }
      ]
    },
    {
      id: 21,
      nombre: 'Adelantar de una manera armónica procesos de auditoría que lleve a cabo el organismo de control',
      descripcion: 'Coordinación efectiva con entes de control externo durante sus visitas',
      fechaInicio: 'N/A',
      fechaFin: 'N/A',
      responsable: 'N/A',
      control: 'N/A',
      evaluacion: '60% de avance',
      seguimiento: [
        {
          descripcion: 'Dar asesoría y acompañamiento puntuales a los procesos y sus líderes',
          fechas: 'Según visita de entes de control'
        }
      ]
    },
    {
      id: 22,
      nombre: 'Presentar informes y seguimientos de ley',
      descripcion: 'Cumplimiento de todos los informes obligatorios establecidos en el cronograma anual',
      fechaInicio: '2026-01-01',
      fechaFin: '2026-12-31',
      responsable: 'Mario Oswaldo Bernal',
      control: 'Se hace seguimiento mensual',
      evaluacion: '60% de avance',
      seguimiento: [
        {
          descripcion: 'Realizar seguimiento al cumplimiento de ejecución de los informes establecidos en el cronograma de informes',
          fechas: 'Mensual'
        }
      ]
    }
  ]
};

/**
 * ============================================
 * ROL 5: RELACIÓN CON ENTES EXTERNOS DE CONTROL - CORREGIDO
 * ============================================
 */
export const ROL_5_RELACION_ENTES_CONTROL: RolOficial = {
  numero: 5,
  nombre: 'Relación con entes externos de control',
  icono: '⚖️',
  color: '#C62828',
  responsable: 'Mario Oswaldo Bernal',
  actividades: [
    {
      id: 23,
      nombre: 'Brindar asesoría y generar alertas oportunas a los líderes de los procesos o responsables del suministro de información, para evitar la entrega no acorde o inconsistente con las solicitudes del organismo de control',
      descripcion: 'Alertar sobre información requerida por organismos de control',
      fechaInicio: '2026-01-01',
      fechaFin: '2026-12-31',
      responsable: 'Mario Oswaldo Bernal',
      control: 'Se hace seguimiento mensual',
      evaluacion: '59% de avance',
      seguimiento: [
        {
          descripcion: 'Publicar todos los informes de gestión en la página web institucional y allegar al correo del proceso respectivo',
          fechas: 'Mensual'
        }
      ]
    },
    {
      id: 24,
      nombre: 'Alertar a la primera línea de defensa, y en general, a los responsables del aporte de información requerida por órganos de control sobre estos efectos (Conductas generadoras de sanciones)',
      descripcion: 'Alertar sobre conductas generadoras de sanciones ante órganos de control',
      fechaInicio: '2026-01-01',
      fechaFin: '2026-12-31',
      responsable: 'Mario Oswaldo Bernal',
      control: 'Se hace seguimiento mensual',
      evaluacion: '59% de avance',
      seguimiento: [
        {
          descripcion: 'Comunicar oportunamente a los líderes de procesos sobre posibles sanciones',
          fechas: 'Mensual'
        }
      ]
    }
  ]
};

/**
 * ============================================
 * ARRAY COMPLETO DE LOS 5 ROLES OFICIALES
 * ============================================
 */
export const ROLES_DECRETO_648_OFICIALES: RolOficial[] = [
  ROL_1_LIDERAZGO_ESTRATEGICO,
  ROL_2_ENFOQUE_PREVENCION,
  ROL_3_EVALUACION_RIESGOS,
  ROL_4_EVALUACION_SEGUIMIENTO,
  ROL_5_RELACION_ENTES_CONTROL
];

/**
 * ============================================
 * VALIDACIONES
 * ============================================
 */
export function validarRolesCompletos(rolesActuales: number[]): boolean {
  return rolesActuales.length === 5 && 
         rolesActuales.every(num => num >= 1 && num <= 5);
}

export function obtenerRolPorNumero(numero: number): RolOficial | undefined {
  return ROLES_DECRETO_648_OFICIALES.find(r => r.numero === numero);
}

export function obtenerActividadPorId(id: number): ActividadOficial | undefined {
  for (const rol of ROLES_DECRETO_648_OFICIALES) {
    const actividad = rol.actividades.find(a => a.id === id);
    if (actividad) return actividad;
  }
  return undefined;
}

/**
 * ============================================
 * ESTADÍSTICAS
 * ============================================
 */
export function obtenerEstadisticasRolesOficiales() {
  return {
    totalRoles: ROLES_DECRETO_648_OFICIALES.length,
    totalActividades: ROLES_DECRETO_648_OFICIALES.reduce((sum, rol) => sum + rol.actividades.length, 0),
    actividadesPorRol: ROLES_DECRETO_648_OFICIALES.map(rol => ({
      rol: rol.nombre,
      cantidad: rol.actividades.length
    }))
  };
}