/**
 * PTAs DEMO POR ESTADO
 * 
 * PTAs de prueba para cada estado del flujo de aprobación.
 * Todos están marcados con `esDemo: true` y se mostrarán con borde rojo
 * para facilitar las pruebas de funcionalidades y flujos.
 * 
 * Estados disponibles:
 * 1. borrador
 * 2. en_revision
 * 3. ajustes_solicitados
 * 4. aprobado
 * 5. ejecutado
 */

import { PlanTrabajoAcademico } from '../mock-data/profesoral-mock-completo';

export const ptaDemoBorrador: PlanTrabajoAcademico & { esDemo: true } = {
  id: 'pta-demo-borrador',
  codigo: 'PTA-DEMO-BOR-001',
  periodo_id: 'per-2025-i',
  periodo_nombre: '2025-I',
  docente_id: 'doc-demo-001',
  docente_nombre: '🔴 DEMO: Ana María Torres (Borrador)',
  territorial: 'Bogotá',
  departamento: 'Administración Pública',
  
  tipo_vinculacion: 'Tiempo Completo',
  dedicacion_horas: 40,
  
  componente_ensenanza: {
    horas: 20,
    porcentaje: 50,
    actividades: [
      {
        id: 'act-bor-001',
        tipo: 'Docencia Directa',
        descripcion: 'Gestión Pública - Pregrado',
        horas: 12,
        productos_esperados: ['Syllabus', 'Evaluaciones']
      },
      {
        id: 'act-bor-002',
        tipo: 'Preparación de clases',
        descripcion: 'Actualización de contenidos',
        horas: 8,
        productos_esperados: ['Presentaciones']
      }
    ]
  },
  
  componente_investigacion: {
    horas: 10,
    porcentaje: 25,
    actividades: [
      {
        id: 'act-bor-003',
        tipo: 'Investigación',
        descripcion: 'Proyecto: Modernización del Estado',
        horas: 10,
        productos_esperados: ['Artículo científico']
      }
    ]
  },
  
  componente_extension: {
    horas: 6,
    porcentaje: 15,
    actividades: [
      {
        id: 'act-bor-004',
        tipo: 'Extensión',
        descripcion: 'Diplomado para funcionarios públicos',
        horas: 6,
        productos_esperados: ['Certificados de asistencia']
      }
    ]
  },
  
  componente_apoyo_institucional: {
    horas: 4,
    porcentaje: 10,
    actividades: [
      {
        id: 'act-bor-005',
        tipo: 'Apoyo Institucional',
        descripcion: 'Comité curricular',
        horas: 4,
        productos_esperados: ['Actas de reunión']
      }
    ]
  },
  
  estado: 'borrador',
  distribucion_valida: true,
  
  created_at: '2024-12-01T10:00:00Z',
  
  esDemo: true
};

export const ptaDemoEnRevision: PlanTrabajoAcademico & { esDemo: true } = {
  id: 'pta-demo-revision',
  codigo: 'PTA-DEMO-REV-001',
  periodo_id: 'per-2025-i',
  periodo_nombre: '2025-I',
  docente_id: 'doc-demo-002',
  docente_nombre: '🔴 DEMO: Carlos Eduardo Mendoza (En Revisión)',
  territorial: 'Medellín',
  departamento: 'Ciencias Políticas',
  
  tipo_vinculacion: 'Tiempo Completo',
  dedicacion_horas: 40,
  
  componente_ensenanza: {
    horas: 22,
    porcentaje: 55,
    actividades: [
      {
        id: 'act-rev-001',
        tipo: 'Docencia Directa',
        descripcion: 'Teoría Política - Pregrado',
        horas: 14,
        productos_esperados: ['Syllabus', 'Evaluaciones', 'Materiales']
      },
      {
        id: 'act-rev-002',
        tipo: 'Preparación de clases',
        descripcion: 'Preparación semanal',
        horas: 8,
        productos_esperados: ['Presentaciones', 'Lecturas']
      }
    ]
  },
  
  componente_investigacion: {
    horas: 12,
    porcentaje: 30,
    actividades: [
      {
        id: 'act-rev-003',
        tipo: 'Investigación',
        descripcion: 'Proyecto: Participación Ciudadana',
        horas: 12,
        productos_esperados: ['Artículo Q2', 'Ponencia']
      }
    ]
  },
  
  componente_extension: {
    horas: 4,
    porcentaje: 10,
    actividades: [
      {
        id: 'act-rev-004',
        tipo: 'Extensión',
        descripcion: 'Asesoría a entidades territoriales',
        horas: 4,
        productos_esperados: ['Informe de asesoría']
      }
    ]
  },
  
  componente_apoyo_institucional: {
    horas: 2,
    porcentaje: 5,
    actividades: [
      {
        id: 'act-rev-005',
        tipo: 'Apoyo Institucional',
        descripcion: 'Comité de investigación',
        horas: 2,
        productos_esperados: ['Actas']
      }
    ]
  },
  
  estado: 'en_revision',
  distribucion_valida: true,
  
  created_at: '2024-11-28T08:00:00Z',
  fecha_envio: '2024-12-05T14:30:00Z',
  
  esDemo: true
};

export const ptaDemoAprobado: PlanTrabajoAcademico & { esDemo: true } = {
  id: 'pta-demo-aprobado',
  codigo: 'PTA-DEMO-APR-001',
  periodo_id: 'per-2025-i',
  periodo_nombre: '2025-I',
  docente_id: 'doc-demo-004',
  docente_nombre: '🔴 DEMO: María Fernanda Rojas (Aprobado)',
  territorial: 'Cali',
  departamento: 'Economía Pública',
  
  tipo_vinculacion: 'Tiempo Completo',
  dedicacion_horas: 40,
  
  componente_ensenanza: {
    horas: 24,
    porcentaje: 60,
    actividades: [
      {
        id: 'act-apr-001',
        tipo: 'Docencia Directa',
        descripcion: 'Economía del Sector Público - Pregrado',
        horas: 16,
        productos_esperados: ['Syllabus', 'Evaluaciones', 'Casos prácticos']
      },
      {
        id: 'act-apr-002',
        tipo: 'Preparación de clases',
        descripcion: 'Preparación semanal',
        horas: 8,
        productos_esperados: ['Presentaciones', 'Ejercicios']
      }
    ]
  },
  
  componente_investigacion: {
    horas: 10,
    porcentaje: 25,
    actividades: [
      {
        id: 'act-apr-003',
        tipo: 'Investigación',
        descripcion: 'Proyecto: Política Fiscal Local',
        horas: 10,
        productos_esperados: ['Artículo Q1', 'Libro']
      }
    ]
  },
  
  componente_extension: {
    horas: 4,
    porcentaje: 10,
    actividades: [
      {
        id: 'act-apr-004',
        tipo: 'Extensión',
        descripcion: 'Consultoría económica',
        horas: 4,
        productos_esperados: ['Informe técnico']
      }
    ]
  },
  
  componente_apoyo_institucional: {
    horas: 2,
    porcentaje: 5,
    actividades: [
      {
        id: 'act-apr-005',
        tipo: 'Apoyo Institucional',
        descripcion: 'Consejo de facultad',
        horas: 2,
        productos_esperados: ['Actas']
      }
    ]
  },
  
  estado: 'aprobado',
  distribucion_valida: true,
  
  created_at: '2024-11-20T09:00:00Z',
  fecha_envio: '2024-11-25T10:00:00Z',
  fecha_aprobacion: '2024-12-10T16:00:00Z',
  
  cumplimiento_global: 0,
  
  esDemo: true
};

export const ptaDemoEjecutado: PlanTrabajoAcademico & { esDemo: true } = {
  id: 'pta-demo-ejecutado',
  codigo: 'PTA-DEMO-EJE-001',
  periodo_id: 'per-2025-i',
  periodo_nombre: '2025-I',
  docente_id: 'doc-demo-005',
  docente_nombre: '🔴 DEMO: Roberto Sánchez Vargas (Ejecutado)',
  territorial: 'Barranquilla',
  departamento: 'Gestión del Desarrollo',
  
  tipo_vinculacion: 'Tiempo Completo',
  dedicacion_horas: 40,
  
  componente_ensenanza: {
    horas: 26,
    porcentaje: 65,
    actividades: [
      {
        id: 'act-eje-001',
        tipo: 'Docencia Directa',
        descripcion: 'Desarrollo Regional - Pregrado',
        horas: 12,
        productos_esperados: ['Syllabus', 'Evaluaciones']
      },
      {
        id: 'act-eje-002',
        tipo: 'Docencia Directa',
        descripcion: 'Planificación Territorial - Maestría',
        horas: 8,
        productos_esperados: ['Syllabus', 'Proyectos']
      },
      {
        id: 'act-eje-003',
        tipo: 'Preparación de clases',
        descripcion: 'Preparación semanal',
        horas: 6,
        productos_esperados: ['Presentaciones']
      }
    ]
  },
  
  componente_investigacion: {
    horas: 8,
    porcentaje: 20,
    actividades: [
      {
        id: 'act-eje-004',
        tipo: 'Investigación',
        descripcion: 'Proyecto: Desarrollo Sostenible Caribe',
        horas: 8,
        productos_esperados: ['Artículo', 'Informe final']
      }
    ]
  },
  
  componente_extension: {
    horas: 4,
    porcentaje: 10,
    actividades: [
      {
        id: 'act-eje-005',
        tipo: 'Extensión',
        descripcion: 'Programa de capacitación alcaldías',
        horas: 4,
        productos_esperados: ['Certificados', 'Memorias']
      }
    ]
  },
  
  componente_apoyo_institucional: {
    horas: 2,
    porcentaje: 5,
    actividades: [
      {
        id: 'act-eje-006',
        tipo: 'Apoyo Institucional',
        descripcion: 'Comité de autoevaluación',
        horas: 2,
        productos_esperados: ['Informe de autoevaluación']
      }
    ]
  },
  
  estado: 'ejecutado',
  distribucion_valida: true,
  
  created_at: '2024-11-15T08:00:00Z',
  fecha_envio: '2024-11-20T09:00:00Z',
  fecha_aprobacion: '2024-12-01T15:00:00Z',
  
  cumplimiento_global: 87.5,
  
  esDemo: true
};

// Array con todos los PTAs demo
export const ptasDemoPorEstado = [
  ptaDemoBorrador,
  ptaDemoEnRevision,
  ptaDemoAprobado,
  ptaDemoEjecutado
];

// Función helper para identificar si un PTA es demo
export function esPTADemo(pta: any): boolean {
  return pta.esDemo === true;
}

// Función helper para obtener el estilo de borde para PTAs demo
export function getEstiloBordeDemo(): string {
  return 'border-2 border-red-500 shadow-lg shadow-red-200';
}
