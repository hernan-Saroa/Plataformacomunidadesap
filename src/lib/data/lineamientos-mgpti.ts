/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * LINEAMIENTOS COMPLETOS DEL MGPTI
 * Modelo de Gestión de Proyectos de TI - MRAE v3.0 MinTIC
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * FUENTE: Documento oficial MRAE v3.0 - Mayo 2023
 * Tablas 20-23 (páginas 111-116)
 * 
 * TOTAL: 14 LINEAMIENTOS OFICIALES
 * - Contexto Estratégico: 6 lineamientos
 * - Planeación: 2 lineamientos
 * - Ejecución y Control: 4 lineamientos
 * - Cierre: 2 lineamientos
 */

export interface LineamientoMGPTI {
  codigo: string;
  nombre: string;
  descripcion: string;
  evidencias: string[];
  estado: 'Completo' | 'En Progreso' | 'Pendiente' | 'No Aplica';
  progreso: number;
  responsable: string;
  fechaActualizacion: string;
  prioridad: 'Crítica' | 'Alta' | 'Media' | 'Baja';
  obligatorio: boolean;
}

export type DominioMGPTI =
  | 'contexto-estrategico'
  | 'planeacion'
  | 'ejecucion-control'
  | 'cierre';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DOMINIO 1: CONTEXTO ESTRATÉGICO (Tabla 20 - Página 111-113)
// 6 lineamientos oficiales
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const LINEAMIENTOS_CONTEXTO_ESTRATEGICO: LineamientoMGPTI[] = [
  {
    codigo: 'MGPTI.LI.CES.01',
    nombre: 'Cumplimiento normativo',
    descripcion: 'Las entidades de la administración pública deben estructurar, gestionar y ejecutar proyectos de TI de tal forma que cumplan cabalmente con la ley, directrices, estándares y normas emitidas por los diferentes órganos del Estado y que apliquen en el ejercicio de su actividad.',
    evidencias: ['Identificación de normativa aplicable al proyecto'],
    estado: 'En Progreso',
    progreso: 85,
    responsable: 'Director de Proyecto',
    fechaActualizacion: '2025-12-06',
    prioridad: 'Crítica',
    obligatorio: true
  },
  {
    codigo: 'MGPTI.LI.CES.02',
    nombre: 'Banco de proyectos',
    descripcion: 'Las entidades de la administración pública deben consolidar la información de los proyectos de TI generados desde cualquier ejercicio estratégico, de gestión o transformación digital. Adicionalmente, todos los documentos generados en el desarrollo de los proyectos deben almacenarse en un Repositorio Institucional de Proyectos.',
    evidencias: ['Banco de proyectos registrado en el Repositorio de Proyectos'],
    estado: 'En Progreso',
    progreso: 75,
    responsable: 'PMO',
    fechaActualizacion: '2025-12-05',
    prioridad: 'Alta',
    obligatorio: true
  },
  {
    codigo: 'MGPTI.LI.CES.03',
    nombre: 'Generación de valor público',
    descripcion: 'Las entidades de la administración pública deben viabilizar los proyectos de TI que generen resultados relevantes para la sociedad directa o indirectamente, esta generación de valor debe ser estimada y medida.',
    evidencias: ['Documento de inicio del proyecto con ítem de valor generado diligenciado'],
    estado: 'En Progreso',
    progreso: 70,
    responsable: 'Sponsor del Proyecto',
    fechaActualizacion: '2025-12-04',
    prioridad: 'Crítica',
    obligatorio: true
  },
  {
    codigo: 'MGPTI.LI.CES.04',
    nombre: 'Grupo de gestión de proyectos de TI',
    descripcion: 'Las entidades de la administración pública deben establecer un equipo o grupo de trabajo que coordine y articule esfuerzos para gestionar el portafolio de programas y proyectos de TI; este grupo de trabajo tiene entre otras tareas estandarizar y optimizar los procesos de la gestión de proyectos. En el contexto de PMBok, esto corresponde a la conformación de una Oficina de Gestión de Proyectos de TI.',
    evidencias: ['Documentación de la Oficina de Proyectos de TI en el Repositorio de Proyectos de la entidad'],
    estado: 'Completo',
    progreso: 100,
    responsable: 'Director PMO',
    fechaActualizacion: '2025-09-01',
    prioridad: 'Crítica',
    obligatorio: true
  },
  {
    codigo: 'MGPTI.LI.CES.05',
    nombre: 'Selección de metodología',
    descripcion: 'Las entidades de la administración pública deben seleccionar la metodología (tradicional o ágil) más adecuada para gestionar cada proyecto de TI, de acuerdo con las características de este y de los lineamientos que dé la Oficina de Proyectos Institucional (en caso de que exista).',
    evidencias: ['Documentación que muestre la utilización de una metodología de proyectos autorizada por la Oficina de Proyectos Institucional'],
    estado: 'Completo',
    progreso: 100,
    responsable: 'PMO',
    fechaActualizacion: '2025-08-15',
    prioridad: 'Alta',
    obligatorio: true
  },
  {
    codigo: 'MGPTI.LI.CES.06',
    nombre: 'Liderazgo de Proyectos de TI',
    descripcion: 'La Dirección de Tecnología de Información o quien haga sus veces, debe liderar la gestión y supervisión de los proyectos de TI o con componentes de TI de la Entidad.',
    evidencias: ['Documentación del proyecto que muestre que el gerente o líder del proyecto de TI pertenece a la Oficina de TI o quien haga sus veces'],
    estado: 'En Progreso',
    progreso: 88,
    responsable: 'Director de TI',
    fechaActualizacion: '2025-12-07',
    prioridad: 'Alta',
    obligatorio: true
  }
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DOMINIO 2: PLANEACIÓN (Tabla 21 - Página 113-114)
// 2 lineamientos oficiales
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const LINEAMIENTOS_PLANEACION: LineamientoMGPTI[] = [
  {
    codigo: 'MGPTI.LI.PLA.01',
    nombre: 'Plan de Gestión del Proyecto',
    descripcion: 'Las entidades de la administración pública deben documentar un plan que defina la forma como se gestionarán los proyectos, independientemente de la metodología utilizada.',
    evidencias: ['Plan de Gestión del Proyecto por cada proyecto de TI que adelante la Entidad', 'Portafolio de proyectos de TI'],
    estado: 'En Progreso',
    progreso: 78,
    responsable: 'Gerente de Proyecto',
    fechaActualizacion: '2025-12-06',
    prioridad: 'Crítica',
    obligatorio: true
  },
  {
    codigo: 'MGPTI.LI.PLA.02',
    nombre: 'Definición de requerimientos',
    descripcion: 'Las entidades de la administración pública deben definir y consolidar los requerimientos y los criterios de aceptación del proyecto de TI.',
    evidencias: ['Requerimientos y criterios de aceptación del proyecto de TI incorporado en el Plan de Gestión del Proyecto', 'Caracterización de requerimientos siguiendo directrices de la(s) metodología(s) de gestión de proyectos que use la entidad'],
    estado: 'En Progreso',
    progreso: 80,
    responsable: 'Analista de Requerimientos',
    fechaActualizacion: '2025-12-07',
    prioridad: 'Crítica',
    obligatorio: true
  }
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DOMINIO 3: EJECUCIÓN Y CONTROL (Tabla 22 - Página 114-115)
// 4 lineamientos oficiales
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const LINEAMIENTOS_EJECUCION_CONTROL: LineamientoMGPTI[] = [
  {
    codigo: 'MGPTI.LI.EJC.01',
    nombre: 'Repositorio de proyectos de TI',
    descripcion: 'Las entidades de la administración pública deben establecer un repositorio para el almacenamiento de los entregables generados durante la ejecución de proyectos de TI, internos o a través de terceros.',
    evidencias: ['Estructura de repositorio establecido para la gestión de proyectos de TI', 'Repositorio implementado con documentación de proyectos actualizada'],
    estado: 'En Progreso',
    progreso: 72,
    responsable: 'PMO',
    fechaActualizacion: '2025-12-05',
    prioridad: 'Alta',
    obligatorio: true
  },
  {
    codigo: 'MGPTI.LI.EJC.02',
    nombre: 'Medición del desempeño',
    descripcion: 'Las entidades de la administración pública deben evaluar periódicamente el desempeño del proyecto de TI y tomar acciones que garanticen que los entregables se desarrollen satisfaciendo los objetivos, requerimientos y atributos de calidad y cumpliendo los tiempos definidos con el alcance y presupuesto acordado en los proyectos de TI.',
    evidencias: ['Indicadores de gestión del proyecto y producto(s), medido periódicamente'],
    estado: 'En Progreso',
    progreso: 85,
    responsable: 'Gerente de Proyecto',
    fechaActualizacion: '2025-12-07',
    prioridad: 'Crítica',
    obligatorio: true
  },
  {
    codigo: 'MGPTI.LI.EJC.03',
    nombre: 'Gestión de riesgos',
    descripcion: 'Las entidades de la administración pública durante el ciclo de vida del proyecto deben identificar, analizar, evaluar continuamente la exposición y dar respuesta a los riesgos, de acuerdo con el apetito de riesgo y los procesos que para tal fin defina la entidad.',
    evidencias: ['Evidencia de la identificación, seguimiento y control de los riesgos del proyecto de TI', 'Documentación de respuesta a los riesgos materializados en el proyecto TI'],
    estado: 'En Progreso',
    progreso: 75,
    responsable: 'Gerente de Proyecto',
    fechaActualizacion: '2025-12-06',
    prioridad: 'Crítica',
    obligatorio: true
  },
  {
    codigo: 'MGPTI.LI.EJC.04',
    nombre: 'Involucramiento de interesados',
    descripcion: 'Las entidades de la administración pública deben involucrar de manera temprana y proactiva a los interesados, definir en el plan de gestión del proyecto cómo gestionarlos, mantener activa comunicación con ellos y gestionar sus preocupaciones e intereses para que contribuyan al éxito del proyecto.',
    evidencias: ['Matriz de Comunicaciones del Proyecto', 'Matriz de Interesados', 'Registro de cambios con resultado de la solicitud'],
    estado: 'En Progreso',
    progreso: 80,
    responsable: 'Gerente de Proyecto',
    fechaActualizacion: '2025-12-07',
    prioridad: 'Alta',
    obligatorio: true
  }
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DOMINIO 4: CIERRE (Tabla 23 - Página 116)
// 2 lineamientos oficiales
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const LINEAMIENTOS_CIERRE: LineamientoMGPTI[] = [
  {
    codigo: 'MGPTI.LI.CIO.01',
    nombre: 'Lecciones Aprendidas',
    descripcion: 'Las entidades de la administración pública deben registrar como parte de la documentación del proyecto de TI las lecciones aprendidas en el Repositorio de Entregables Proyectos y socializarlas.',
    evidencias: ['Registro de lecciones aprendidas en el repositorio del proyecto de TI'],
    estado: 'En Progreso',
    progreso: 68,
    responsable: 'Gerente de Proyecto',
    fechaActualizacion: '2025-12-04',
    prioridad: 'Media',
    obligatorio: true
  },
  {
    codigo: 'MGPTI.LI.CIO.02',
    nombre: 'Cierre de proyectos',
    descripcion: 'Las entidades de la administración pública deben realizar los cierres de los proyectos de TI internos o ejecutados por terceros.',
    evidencias: ['Evidencias de los cierres de los proyectos de TI almacenados en el repositorio del proyecto de TI'],
    estado: 'En Progreso',
    progreso: 70,
    responsable: 'Gerente de Proyecto',
    fechaActualizacion: '2025-12-05',
    prioridad: 'Alta',
    obligatorio: true
  }
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXPORTACIÓN CONSOLIDADA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const LINEAMIENTOS_MGPTI: Record<DominioMGPTI, LineamientoMGPTI[]> = {
  'contexto-estrategico': LINEAMIENTOS_CONTEXTO_ESTRATEGICO,
  'planeacion': LINEAMIENTOS_PLANEACION,
  'ejecucion-control': LINEAMIENTOS_EJECUCION_CONTROL,
  'cierre': LINEAMIENTOS_CIERRE
};

// Función helper para obtener todos los lineamientos
export const getAllLineamientosMGPTI = (): LineamientoMGPTI[] => {
  return Object.values(LINEAMIENTOS_MGPTI).flat();
};

// Función helper para obtener estadísticas
export const getEstadisticasMGPTI = () => {
  const todos = getAllLineamientosMGPTI();
  const completos = todos.filter(l => l.estado === 'Completo').length;
  const enProgreso = todos.filter(l => l.estado === 'En Progreso').length;
  const pendientes = todos.filter(l => l.estado === 'Pendiente').length;
  const obligatorios = todos.filter(l => l.obligatorio).length;
  const obligatoriosCompletos = todos.filter(l => l.obligatorio && l.estado === 'Completo').length;
  
  const progresoPromedio = todos.reduce((sum, l) => sum + l.progreso, 0) / todos.length;
  const complianceObligatorios = obligatorios > 0 ? (obligatoriosCompletos / obligatorios) * 100 : 0;

  return {
    total: todos.length,
    completos,
    enProgreso,
    pendientes,
    obligatorios,
    obligatoriosCompletos,
    progresoPromedio: Number(progresoPromedio.toFixed(1)),
    complianceObligatorios: Math.round(complianceObligatorios)
  };
};
