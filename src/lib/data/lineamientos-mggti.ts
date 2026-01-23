/**
 * LINEAMIENTOS MGGTI (Modelo de Gestión y Gobierno TI)
 * Datos de ejemplo para demostración de Arquitectura Empresarial
 */

export interface DominioMGGTI {
  id: string;
  nombre: string;
  descripcion: string;
  componentes: any[];
}

export const LINEAMIENTOS_MGGTI: DominioMGGTI[] = [
  {
    id: 'MGGTI-D1',
    nombre: 'Estrategia TI',
    descripcion: 'Lineamientos para la definición y alineación de la estrategia de TI con los objetivos institucionales',
    componentes: [
      {
        id: 'MGGTI-D1-L1',
        codigo: 'L1.1',
        nombre: 'Plan Estratégico de Tecnologías de la Información - PETI',
        descripcion: 'Definir y mantener actualizado el PETI alineado con el plan estratégico institucional',
        estado: 'en-progreso',
        progreso: 65,
        obligatorio: true,
        prioridad: 'alta'
      },
      {
        id: 'MGGTI-D1-L2',
        codigo: 'L1.2',
        nombre: 'Comité Estratégico de TI',
        descripcion: 'Conformar y operar el comité estratégico de TI para la toma de decisiones',
        estado: 'completo',
        progreso: 100,
        obligatorio: true,
        prioridad: 'alta'
      }
    ]
  },
  {
    id: 'MGGTI-D2',
    nombre: 'Gobierno TI',
    descripcion: 'Lineamientos para el gobierno y la gestión de las TI en la entidad',
    componentes: [
      {
        id: 'MGGTI-D2-L1',
        codigo: 'L2.1',
        nombre: 'Políticas y estándares de TI',
        descripcion: 'Establecer y mantener políticas y estándares para la gestión de TI',
        estado: 'en-progreso',
        progreso: 75,
        obligatorio: true,
        prioridad: 'alta'
      },
      {
        id: 'MGGTI-D2-L2',
        codigo: 'L2.2',
        nombre: 'Gestión de proyectos de TI',
        descripcion: 'Implementar marco de gestión de proyectos de TI',
        estado: 'pendiente',
        progreso: 25,
        obligatorio: true,
        prioridad: 'media'
      }
    ]
  },
  {
    id: 'MGGTI-D3',
    nombre: 'Seguridad y Privacidad',
    descripcion: 'Lineamientos para la gestión de seguridad de la información y privacidad de datos',
    componentes: [
      {
        id: 'MGGTI-D3-L1',
        codigo: 'L3.1',
        nombre: 'Política de Seguridad de la Información',
        descripcion: 'Definir e implementar política de seguridad de la información',
        estado: 'completo',
        progreso: 100,
        obligatorio: true,
        prioridad: 'critica'
      },
      {
        id: 'MGGTI-D3-L2',
        codigo: 'L3.2',
        nombre: 'Tratamiento de datos personales',
        descripcion: 'Implementar lineamientos de protección de datos personales según Ley 1581',
        estado: 'en-progreso',
        progreso: 80,
        obligatorio: true,
        prioridad: 'critica'
      }
    ]
  }
];

export function getEstadisticasMGGTI() {
  const todosLosComponentes = LINEAMIENTOS_MGGTI.flatMap(d => d.componentes);
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

export function getAllLineamientosMGGTI() {
  return LINEAMIENTOS_MGGTI.flatMap(d => d.componentes);
}
