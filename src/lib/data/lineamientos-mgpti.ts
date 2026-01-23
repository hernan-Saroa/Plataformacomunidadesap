/**
 * LINEAMIENTOS MGPTI (Modelo de Gestión de Proyectos TI)
 * Datos de ejemplo para demostración de Arquitectura Empresarial
 */

export interface DominioMGPTI {
  id: string;
  nombre: string;
  descripcion: string;
  componentes: any[];
}

export const LINEAMIENTOS_MGPTI: DominioMGPTI[] = [
  {
    id: 'MGPTI-D1',
    nombre: 'Gestión de Portafolio',
    descripcion: 'Lineamientos para la gestión del portafolio de proyectos de TI',
    componentes: [
      {
        id: 'MGPTI-D1-L1',
        codigo: 'P1.1',
        nombre: 'Portafolio de proyectos de TI',
        descripcion: 'Mantener inventario actualizado de proyectos de TI priorizados',
        estado: 'en-progreso',
        progreso: 70,
        obligatorio: true,
        prioridad: 'alta'
      },
      {
        id: 'MGPTI-D1-L2',
        codigo: 'P1.2',
        nombre: 'Criterios de priorización',
        descripcion: 'Establecer criterios claros para priorización de proyectos de TI',
        estado: 'completo',
        progreso: 100,
        obligatorio: true,
        prioridad: 'alta'
      }
    ]
  },
  {
    id: 'MGPTI-D2',
    nombre: 'Gestión de Proyectos',
    descripcion: 'Lineamientos para la gestión individual de proyectos de TI',
    componentes: [
      {
        id: 'MGPTI-D2-L1',
        codigo: 'P2.1',
        nombre: 'Metodología de gestión de proyectos',
        descripcion: 'Implementar metodología estándar para gestión de proyectos (PMI, SCRUM, etc.)',
        estado: 'en-progreso',
        progreso: 60,
        obligatorio: true,
        prioridad: 'alta'
      },
      {
        id: 'MGPTI-D2-L2',
        codigo: 'P2.2',
        nombre: 'Seguimiento y control de proyectos',
        descripcion: 'Establecer mecanismos de seguimiento y control de avance de proyectos',
        estado: 'en-progreso',
        progreso: 55,
        obligatorio: true,
        prioridad: 'media'
      }
    ]
  },
  {
    id: 'MGPTI-D3',
    nombre: 'Gestión de Cambios',
    descripcion: 'Lineamientos para la gestión de cambios en proyectos de TI',
    componentes: [
      {
        id: 'MGPTI-D3-L1',
        codigo: 'P3.1',
        nombre: 'Proceso de gestión de cambios',
        descripcion: 'Definir e implementar proceso formal de gestión de cambios',
        estado: 'pendiente',
        progreso: 30,
        obligatorio: true,
        prioridad: 'media'
      },
      {
        id: 'MGPTI-D3-L2',
        codigo: 'P3.2',
        nombre: 'Comité de cambios',
        descripcion: 'Conformar comité de cambios para aprobación de modificaciones',
        estado: 'completo',
        progreso: 100,
        obligatorio: true,
        prioridad: 'alta'
      }
    ]
  }
];

export function getEstadisticasMGPTI() {
  const todosLosComponentes = LINEAMIENTOS_MGPTI.flatMap(d => d.componentes);
  const cumplidos = todosLosComponentes.filter(c => c.estado === 'completo').length;
  const enProgreso = todosLosComponentes.filter(c => c.estado === 'en-progreso').length;
  const noCumplidos = todosLosComponentes.filter(c => c.estado === 'pendiente').length;
  
  return {
    totalLineamientos: todosLosComponentes.length,
    cumplidos,
    enProgreso,
    noCumplidos,
    porcentajeCumplimiento: Math.round((cumplidos / todosLosComponentes.length) * 100)
  };
}

export function getAllLineamientosMGPTI() {
  return LINEAMIENTOS_MGPTI.flatMap(d => d.componentes);
}
