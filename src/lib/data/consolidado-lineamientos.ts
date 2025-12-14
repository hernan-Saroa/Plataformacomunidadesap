/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * CONSOLIDADO COMPLETO DE LINEAMIENTOS MRAE v3.0
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * TOTAL: 106 LINEAMIENTOS OFICIALES MINTIC
 * - MAE: 29 lineamientos (7 dominios)
 * - MGGTI: 63 lineamientos (7 dominios)
 * - MGPTI: 14 lineamientos (4 dominios)
 */

import { getAllLineamientosMGGTI, getEstadisticasMGGTI } from './lineamientos-mggti';
import { getAllLineamientosMGPTI, getEstadisticasMGPTI } from './lineamientos-mgpti';

export interface LineamientoConsolidado {
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
  modelo: 'MAE' | 'MGGTI' | 'MGPTI';
  dominio: string;
  dominioNombre: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LINEAMIENTOS MAE (29 lineamientos en 7 dominios)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const LINEAMIENTOS_MAE: LineamientoConsolidado[] = [
  // DOMINIO 1: Proceso de AE (8 lineamientos)
  {
    codigo: 'MAE.LI.PA.01',
    nombre: 'Evaluación del nivel de madurez',
    descripcion: 'Las entidades deben realizar la evaluación del nivel de madurez de las capacidades actuales con las que cuenta la entidad para realizar los ejercicios de Arquitectura Empresarial.',
    evidencias: ['Resultado de la evaluación del nivel de madurez de AE en la entidad'],
    estado: 'En Progreso',
    progreso: 70,
    responsable: 'Arquitectura Empresarial',
    fechaActualizacion: '2025-12-05',
    prioridad: 'Alta',
    obligatorio: true,
    modelo: 'MAE',
    dominio: 'proceso-ae',
    dominioNombre: 'Proceso de AE'
  },
  {
    codigo: 'MAE.LI.PA.02',
    nombre: 'Planeación de los ejercicios de AE',
    descripcion: 'Las entidades deben realizar la planeación de la Arquitectura Empresarial mediante la definición de ejercicios de arquitectura.',
    evidencias: ['Plan de desarrollo de los ejercicios de AE', 'Descripción de cada ejercicio', 'Principios de la AE'],
    estado: 'En Progreso',
    progreso: 85,
    responsable: 'Director de AE',
    fechaActualizacion: '2025-12-07',
    prioridad: 'Crítica',
    obligatorio: true,
    modelo: 'MAE',
    dominio: 'proceso-ae',
    dominioNombre: 'Proceso de AE'
  },
  {
    codigo: 'MAE.LI.PA.03',
    nombre: 'Gobierno y capacidad de Arquitectura Empresarial',
    descripcion: 'Las entidades deben instaurar la capacidad para planear, desarrollar, mantener y evolucionar la Arquitectura Empresarial.',
    evidencias: ['Proceso de AE formalizado', 'Evidencia de responsables de AE', 'Creación del comité de AE'],
    estado: 'Completo',
    progreso: 100,
    responsable: 'Dirección de TI',
    fechaActualizacion: '2025-11-20',
    prioridad: 'Crítica',
    obligatorio: true,
    modelo: 'MAE',
    dominio: 'proceso-ae',
    dominioNombre: 'Proceso de AE'
  },
  {
    codigo: 'MAE.LI.PA.04',
    nombre: 'Visión de la arquitectura',
    descripcion: 'Las entidades deben construir la visión de la arquitectura de cada ejercicio de Arquitectura Empresarial.',
    evidencias: ['Visión de la arquitectura'],
    estado: 'En Progreso',
    progreso: 75,
    responsable: 'Arquitectura Empresarial',
    fechaActualizacion: '2025-12-03',
    prioridad: 'Alta',
    obligatorio: true,
    modelo: 'MAE',
    dominio: 'proceso-ae',
    dominioNombre: 'Proceso de AE'
  },
  {
    codigo: 'MAE.LI.PA.05',
    nombre: 'Definición de la Arquitectura Empresarial',
    descripcion: 'Las entidades deben definir la Arquitectura Empresarial mediante la ejecución de los ejercicios de AE.',
    evidencias: ['Ejercicios de AE', 'Descripción de arquitectura por dominio', 'Hoja de Ruta de AE'],
    estado: 'En Progreso',
    progreso: 68,
    responsable: 'Equipo de AE',
    fechaActualizacion: '2025-12-06',
    prioridad: 'Crítica',
    obligatorio: true,
    modelo: 'MAE',
    dominio: 'proceso-ae',
    dominioNombre: 'Proceso de AE'
  },
  {
    codigo: 'MAE.LI.PA.06',
    nombre: 'Matriz de interesados de la AE',
    descripcion: 'Las entidades deben contar con una matriz de caracterización de interesados.',
    evidencias: ['Matriz de interesados actualizada'],
    estado: 'Completo',
    progreso: 100,
    responsable: 'Gestión de Proyectos',
    fechaActualizacion: '2025-11-15',
    prioridad: 'Alta',
    obligatorio: true,
    modelo: 'MAE',
    dominio: 'proceso-ae',
    dominioNombre: 'Proceso de AE'
  },
  {
    codigo: 'MAE.LI.PA.07',
    nombre: 'Hoja de ruta de la Arquitectura Empresarial',
    descripcion: 'Las entidades deben consolidar el resultado de cada ejercicio de arquitectura empresarial en una hoja de ruta.',
    evidencias: ['Hoja de ruta de la AE'],
    estado: 'En Progreso',
    progreso: 80,
    responsable: 'Arquitectura Empresarial',
    fechaActualizacion: '2025-12-07',
    prioridad: 'Crítica',
    obligatorio: true,
    modelo: 'MAE',
    dominio: 'proceso-ae',
    dominioNombre: 'Proceso de AE'
  },
  {
    codigo: 'MAE.LI.PA.08',
    nombre: 'Repositorio AE',
    descripcion: 'Las entidades deben contar con un repositorio de Arquitectura Empresarial.',
    evidencias: ['Herramienta de AE implementada', 'Repositorio con estructura de carpetas'],
    estado: 'En Progreso',
    progreso: 60,
    responsable: 'Infraestructura TI',
    fechaActualizacion: '2025-11-30',
    prioridad: 'Media',
    obligatorio: true,
    modelo: 'MAE',
    dominio: 'proceso-ae',
    dominioNombre: 'Proceso de AE'
  },

  // DOMINIO 2: Arquitectura Institucional (4 lineamientos)
  {
    codigo: 'MAE.LI.AIN.01',
    nombre: 'Estimación financiera y modelo de planeación Institucional',
    descripcion: 'Las entidades deben realizar la estimación financiera y armonizarla con el modelo financiero institucional.',
    evidencias: ['Estimación financiera de costos de implementación de hoja de ruta'],
    estado: 'En Progreso',
    progreso: 55,
    responsable: 'Planeación Financiera',
    fechaActualizacion: '2025-12-02',
    prioridad: 'Alta',
    obligatorio: true,
    modelo: 'MAE',
    dominio: 'arquitectura-institucional',
    dominioNombre: 'Arquitectura Institucional'
  },
  {
    codigo: 'MAE.LI.AIN.02',
    nombre: 'Modelo capacidades institucionales',
    descripcion: 'Las entidades deben identificar las capacidades institucionales y mantener actualizado el mapa de capacidades.',
    evidencias: ['Mapa de capacidades institucionales'],
    estado: 'En Progreso',
    progreso: 72,
    responsable: 'Gestión Estratégica',
    fechaActualizacion: '2025-12-05',
    prioridad: 'Crítica',
    obligatorio: true,
    modelo: 'MAE',
    dominio: 'arquitectura-institucional',
    dominioNombre: 'Arquitectura Institucional'
  },
  {
    codigo: 'MAE.LI.AIN.03',
    nombre: 'Modelo operativo institucional',
    descripcion: 'Las entidades deben realizar el entendimiento preciso del Modelo operativo de la entidad.',
    evidencias: ['Modelo operativo actualizado'],
    estado: 'Completo',
    progreso: 100,
    responsable: 'Procesos',
    fechaActualizacion: '2025-10-15',
    prioridad: 'Crítica',
    obligatorio: true,
    modelo: 'MAE',
    dominio: 'arquitectura-institucional',
    dominioNombre: 'Arquitectura Institucional'
  },
  {
    codigo: 'MAE.LI.AIN.04',
    nombre: 'Modelo de servicios institucionales',
    descripcion: 'Las entidades deben identificar la situación actual de los servicios impactados por el ejercicio de AE.',
    evidencias: ['Catálogo de servicios institucionales actualizado'],
    estado: 'En Progreso',
    progreso: 78,
    responsable: 'Gestión de Servicios',
    fechaActualizacion: '2025-12-06',
    prioridad: 'Alta',
    obligatorio: true,
    modelo: 'MAE',
    dominio: 'arquitectura-institucional',
    dominioNombre: 'Arquitectura Institucional'
  },

  // DOMINIO 3: Arquitectura de Información (4 lineamientos)
  {
    codigo: 'MAE.LI.AI.01',
    nombre: 'Flujos de información',
    descripcion: 'Las entidades deben definir y mantener actualizado el catálogo de flujos de información.',
    evidencias: ['Catálogo de Flujos de Información', 'Diagramas de flujos'],
    estado: 'En Progreso',
    progreso: 65,
    responsable: 'Arquitectura de Datos',
    fechaActualizacion: '2025-12-04',
    prioridad: 'Alta',
    obligatorio: true,
    modelo: 'MAE',
    dominio: 'arquitectura-informacion',
    dominioNombre: 'Arquitectura de Información'
  },
  {
    codigo: 'MAE.LI.AI.02',
    nombre: 'Arquitectura de Información',
    descripcion: 'Las entidades deben modelar, describir y mantener actualizada la arquitectura de información.',
    evidencias: ['Documento de arquitectura de información', 'Diagrama de componentes', 'Servicios de intercambio', 'Datos abiertos'],
    estado: 'En Progreso',
    progreso: 70,
    responsable: 'Gestión de Información',
    fechaActualizacion: '2025-12-05',
    prioridad: 'Crítica',
    obligatorio: true,
    modelo: 'MAE',
    dominio: 'arquitectura-informacion',
    dominioNombre: 'Arquitectura de Información'
  },
  {
    codigo: 'MAE.LI.AI.03',
    nombre: 'Intercambio de Información entre entidades',
    descripcion: 'Las entidades deben identificar la información a compartir y diseñar la arquitectura de intercambio.',
    evidencias: ['Necesidades de intercambio documentadas', 'Servicios de información caracterizados'],
    estado: 'En Progreso',
    progreso: 58,
    responsable: 'Interoperabilidad',
    fechaActualizacion: '2025-11-28',
    prioridad: 'Alta',
    obligatorio: true,
    modelo: 'MAE',
    dominio: 'arquitectura-informacion',
    dominioNombre: 'Arquitectura de Información'
  },
  {
    codigo: 'MAE.LI.AI.04',
    nombre: 'Modelo de Información Institucional',
    descripcion: 'Las entidades deben contar con un Modelo de Información Institucional.',
    evidencias: ['Modelo de Información Institucional', 'Diagrama de integración de datos'],
    estado: 'En Progreso',
    progreso: 75,
    responsable: 'Arquitectura de Datos',
    fechaActualizacion: '2025-12-06',
    prioridad: 'Crítica',
    obligatorio: true,
    modelo: 'MAE',
    dominio: 'arquitectura-informacion',
    dominioNombre: 'Arquitectura de Información'
  },

  // DOMINIO 4: Arquitectura de Sistemas de Información (3 lineamientos)
  {
    codigo: 'MAE.LI.ASI.01',
    nombre: 'Arquitecturas de referencia para soluciones',
    descripcion: 'Las entidades deben definir, evolucionar y aplicar las arquitecturas de referencia.',
    evidencias: ['Documento de Arquitectura de Referencia', 'Modelo de alto nivel de SI'],
    estado: 'En Progreso',
    progreso: 68,
    responsable: 'Arquitectura de Software',
    fechaActualizacion: '2025-12-05',
    prioridad: 'Alta',
    obligatorio: true,
    modelo: 'MAE',
    dominio: 'arquitectura-sistemas',
    dominioNombre: 'Arquitectura de Sistemas'
  },
  {
    codigo: 'MAE.LI.ASI.02',
    nombre: 'Arquitecturas de solución de sistemas de información',
    descripcion: 'Las entidades deben garantizar la definición y documentación de las arquitecturas de solución.',
    evidencias: ['Arquitecturas de Solución de proyectos de SI'],
    estado: 'En Progreso',
    progreso: 72,
    responsable: 'Desarrollo',
    fechaActualizacion: '2025-12-06',
    prioridad: 'Alta',
    obligatorio: true,
    modelo: 'MAE',
    dominio: 'arquitectura-sistemas',
    dominioNombre: 'Arquitectura de Sistemas'
  },
  {
    codigo: 'MAE.LI.ASI.03',
    nombre: 'Caracterización de los sistemas de información',
    descripcion: 'Las entidades deben realizar la caracterización de cada uno de sus sistemas de información.',
    evidencias: ['Caracterización de SI', 'Catálogos y matrices actualizados'],
    estado: 'En Progreso',
    progreso: 85,
    responsable: 'Gestión de Aplicaciones',
    fechaActualizacion: '2025-12-07',
    prioridad: 'Crítica',
    obligatorio: true,
    modelo: 'MAE',
    dominio: 'arquitectura-sistemas',
    dominioNombre: 'Arquitectura de Sistemas'
  },

  // DOMINIO 5: Arquitectura de Tecnología (4 lineamientos)
  {
    codigo: 'MAE.LI.AT.01',
    nombre: 'Catálogo de elementos de infraestructura',
    descripcion: 'Las entidades deben contar con un catálogo actualizado de sus elementos de infraestructura tecnológica.',
    evidencias: ['Catálogo de Elementos de Infraestructura actualizado'],
    estado: 'En Progreso',
    progreso: 78,
    responsable: 'Infraestructura TI',
    fechaActualizacion: '2025-12-06',
    prioridad: 'Alta',
    obligatorio: true,
    modelo: 'MAE',
    dominio: 'arquitectura-tecnologia',
    dominioNombre: 'Arquitectura de Tecnología'
  },
  {
    codigo: 'MAE.LI.AT.02',
    nombre: 'Plataforma de interoperabilidad del Estado',
    descripcion: 'Las entidades deben incluir elementos necesarios para realizar el intercambio de información.',
    evidencias: ['Artefactos con elementos de plataforma de interoperabilidad'],
    estado: 'En Progreso',
    progreso: 60,
    responsable: 'Interoperabilidad',
    fechaActualizacion: '2025-12-03',
    prioridad: 'Media',
    obligatorio: true,
    modelo: 'MAE',
    dominio: 'arquitectura-tecnologia',
    dominioNombre: 'Arquitectura de Tecnología'
  },
  {
    codigo: 'MAE.LI.AT.03',
    nombre: 'Continuidad y disponibilidad de infraestructura',
    descripcion: 'Las entidades deben identificar requerimientos de continuidad y disponibilidad.',
    evidencias: ['Diagrama de despliegue', 'Plan de continuidad actualizado', 'Mapa de capacidades de atención'],
    estado: 'En Progreso',
    progreso: 65,
    responsable: 'Continuidad del Negocio',
    fechaActualizacion: '2025-12-04',
    prioridad: 'Crítica',
    obligatorio: true,
    modelo: 'MAE',
    dominio: 'arquitectura-tecnologia',
    dominioNombre: 'Arquitectura de Tecnología'
  },
  {
    codigo: 'MAE.LI.AT.04',
    nombre: 'Arquitecturas de referencia tecnológica',
    descripcion: 'Las entidades deben definir, evolucionar o aplicar arquitecturas de referencia tecnológica.',
    evidencias: ['Arquitectura de referencia con artefactos completos'],
    estado: 'En Progreso',
    progreso: 62,
    responsable: 'Arquitectura Infraestructura',
    fechaActualizacion: '2025-12-02',
    prioridad: 'Alta',
    obligatorio: true,
    modelo: 'MAE',
    dominio: 'arquitectura-tecnologia',
    dominioNombre: 'Arquitectura de Tecnología'
  },

  // DOMINIO 6: Arquitectura de Seguridad (4 lineamientos)
  {
    codigo: 'MAE.LI.AS.01',
    nombre: 'Catálogo de servicios de seguridad',
    descripcion: 'Las entidades deben contar con un catálogo de servicios de seguridad.',
    evidencias: ['Catálogo de servicios de seguridad actualizado'],
    estado: 'En Progreso',
    progreso: 75,
    responsable: 'CISO',
    fechaActualizacion: '2025-12-05',
    prioridad: 'Crítica',
    obligatorio: true,
    modelo: 'MAE',
    dominio: 'arquitectura-seguridad',
    dominioNombre: 'Arquitectura de Seguridad'
  },
  {
    codigo: 'MAE.LI.AS.02',
    nombre: 'Análisis de impacto del negocio',
    descripcion: 'Las entidades deben realizar el análisis de impacto de negocio.',
    evidencias: ['Informe de análisis de impacto de negocio'],
    estado: 'En Progreso',
    progreso: 68,
    responsable: 'Continuidad del Negocio',
    fechaActualizacion: '2025-12-03',
    prioridad: 'Alta',
    obligatorio: true,
    modelo: 'MAE',
    dominio: 'arquitectura-seguridad',
    dominioNombre: 'Arquitectura de Seguridad'
  },
  {
    codigo: 'MAE.LI.AS.03',
    nombre: 'Arquitectura de Seguridad',
    descripcion: 'Las entidades deben definir, evolucionar y aplicar una arquitectura de seguridad.',
    evidencias: ['Arquitectura de seguridad con artefactos completos'],
    estado: 'En Progreso',
    progreso: 80,
    responsable: 'Seguridad de la Información',
    fechaActualizacion: '2025-12-06',
    prioridad: 'Crítica',
    obligatorio: true,
    modelo: 'MAE',
    dominio: 'arquitectura-seguridad',
    dominioNombre: 'Arquitectura de Seguridad'
  },
  {
    codigo: 'MAE.LI.AS.04',
    nombre: 'Ciberseguridad',
    descripcion: 'Las entidades deben diseñar los controles de seguridad informática.',
    evidencias: ['Controles de seguridad identificados e implementados'],
    estado: 'En Progreso',
    progreso: 85,
    responsable: 'SOC',
    fechaActualizacion: '2025-12-07',
    prioridad: 'Crítica',
    obligatorio: true,
    modelo: 'MAE',
    dominio: 'arquitectura-seguridad',
    dominioNombre: 'Arquitectura de Seguridad'
  },

  // DOMINIO 7: Uso y Apropiación de AE (2 lineamientos)
  {
    codigo: 'MAE.LI.UA.01',
    nombre: 'Estrategia de Uso y apropiación',
    descripcion: 'Las entidades deben definir una estrategia que promueva el involucramiento de todas las partes interesadas.',
    evidencias: ['Estrategia de gestión de cambio', 'Plan de comunicaciones', 'Plan de capacitación', 'Esquema de seguimiento'],
    estado: 'En Progreso',
    progreso: 70,
    responsable: 'Gestión del Cambio',
    fechaActualizacion: '2025-12-05',
    prioridad: 'Alta',
    obligatorio: true,
    modelo: 'MAE',
    dominio: 'uso-apropiacion-ae',
    dominioNombre: 'Uso y Apropiación de AE'
  },
  {
    codigo: 'MAE.LI.UA.02',
    nombre: 'Implementación de Estrategia de Uso y Apropiación',
    descripcion: 'Las entidades deben implementar, monitorear, evaluar y mejorar la Estrategia de Uso y Apropiación.',
    evidencias: ['Evidencias de ejecución de actividades', 'Medición de indicadores', 'Análisis y propuestas de mejora'],
    estado: 'En Progreso',
    progreso: 65,
    responsable: 'Gestión del Cambio',
    fechaActualizacion: '2025-12-04',
    prioridad: 'Alta',
    obligatorio: true,
    modelo: 'MAE',
    dominio: 'uso-apropiacion-ae',
    dominioNombre: 'Uso y Apropiación de AE'
  }
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FUNCIONES DE CONSOLIDACIÓN Y ESTADÍSTICAS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function getAllLineamientosConsolidados(): LineamientoConsolidado[] {
  const mggti = getAllLineamientosMGGTI().map(l => ({
    ...l,
    modelo: 'MGGTI' as const,
    dominioNombre: l.dominio || 'MGGTI'
  }));

  const mgpti = getAllLineamientosMGPTI().map(l => ({
    ...l,
    modelo: 'MGPTI' as const,
    dominioNombre: l.dominio || 'MGPTI'
  }));

  return [...LINEAMIENTOS_MAE, ...mggti, ...mgpti];
}

export function getEstadisticasGlobales() {
  const todos = getAllLineamientosConsolidados();
  
  const mae = todos.filter(l => l.modelo === 'MAE');
  const mggti = todos.filter(l => l.modelo === 'MGGTI');
  const mgpti = todos.filter(l => l.modelo === 'MGPTI');
  
  const porEstado = {
    completo: todos.filter(l => l.estado === 'Completo').length,
    enProgreso: todos.filter(l => l.estado === 'En Progreso').length,
    pendiente: todos.filter(l => l.estado === 'Pendiente').length,
    noAplica: todos.filter(l => l.estado === 'No Aplica').length
  };
  
  const porPrioridad = {
    critica: todos.filter(l => l.prioridad === 'Crítica').length,
    alta: todos.filter(l => l.prioridad === 'Alta').length,
    media: todos.filter(l => l.prioridad === 'Media').length,
    baja: todos.filter(l => l.prioridad === 'Baja').length
  };
  
  const obligatorios = todos.filter(l => l.obligatorio);
  const obligatoriosCompletos = obligatorios.filter(l => l.estado === 'Completo');
  
  const progresoPromedio = todos.reduce((sum, l) => sum + l.progreso, 0) / todos.length;
  const complianceObligatorios = obligatorios.length > 0 
    ? (obligatoriosCompletos.length / obligatorios.length) * 100 
    : 0;

  const progresoMAE = mae.reduce((sum, l) => sum + l.progreso, 0) / mae.length;
  const progresoMGGTI = mggti.reduce((sum, l) => sum + l.progreso, 0) / mggti.length;
  const progresoMGPTI = mgpti.reduce((sum, l) => sum + l.progreso, 0) / mgpti.length;
  
  return {
    total: todos.length,
    porModelo: {
      MAE: mae.length,
      MGGTI: mggti.length,
      MGPTI: mgpti.length
    },
    porEstado,
    porPrioridad,
    obligatorios: obligatorios.length,
    obligatoriosCompletos: obligatoriosCompletos.length,
    progresoPromedio: Number(progresoPromedio.toFixed(1)),
    complianceObligatorios: Math.round(complianceObligatorios),
    progresoMAE: Number(progresoMAE.toFixed(1)),
    progresoMGGTI: Number(progresoMGGTI.toFixed(1)),
    progresoMGPTI: Number(progresoMGPTI.toFixed(1))
  };
}

export function getLineamientosPorModelo(modelo: 'MAE' | 'MGGTI' | 'MGPTI') {
  return getAllLineamientosConsolidados().filter(l => l.modelo === modelo);
}

export function getLineamientosPorEstado(estado: string) {
  return getAllLineamientosConsolidados().filter(l => l.estado === estado);
}

export function buscarLineamientos(query: string) {
  const q = query.toLowerCase();
  return getAllLineamientosConsolidados().filter(l => 
    l.codigo.toLowerCase().includes(q) ||
    l.nombre.toLowerCase().includes(q) ||
    l.descripcion.toLowerCase().includes(q) ||
    l.responsable.toLowerCase().includes(q) ||
    l.dominioNombre.toLowerCase().includes(q)
  );
}
