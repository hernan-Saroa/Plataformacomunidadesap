/**
 * DATOS MOCK - SEGUIMIENTO Y CONTROL DE PTA
 * 
 * Datos de ejemplo para el sistema de seguimiento y control
 * - Registros de progreso mensuales
 * - Evidencias de actividades
 * - Alertas de desviación
 * 
 * Fecha: 22 de diciembre de 2024
 */

import { RegistroProgreso, EvidenciaProgreso } from '../components/gestion-profesoral/SeguimientoControlPTA';
import { pta4 } from './ptasMockData'; // Luis Fernando Pérez - Aprobado

// ============================================================================
// EVIDENCIAS DE EJEMPLO
// ============================================================================

const evidenciasMes1: EvidenciaProgreso[] = [
  {
    id: 'EVID-001',
    tipo: 'listado-asistencia',
    nombre: 'Listado de asistencia - Clase 1 a 4',
    descripcion: 'Listas de asistencia firmadas por los estudiantes',
    url: 'https://drive.google.com/file/asistencia-mes1.pdf',
    fechaCarga: '2024-08-05T10:00:00Z',
    tamano: 245000
  },
  {
    id: 'EVID-002',
    tipo: 'plan-clase',
    nombre: 'Planes de clase semana 1-4',
    descripcion: 'Planeación detallada de las 16 sesiones del mes',
    url: 'https://drive.google.com/file/planes-clase-mes1.pdf',
    fechaCarga: '2024-08-05T10:15:00Z',
    tamano: 1200000
  },
  {
    id: 'EVID-003',
    tipo: 'documento',
    nombre: 'Evaluaciones y trabajos corregidos',
    descripcion: 'Primer parcial y trabajos corregidos con retroalimentación',
    url: 'https://drive.google.com/file/evaluaciones-mes1.pdf',
    fechaCarga: '2024-08-05T11:00:00Z'
  }
];

const evidenciasMes2: EvidenciaProgreso[] = [
  {
    id: 'EVID-004',
    tipo: 'listado-asistencia',
    nombre: 'Listado de asistencia - Clase 5 a 8',
    descripcion: 'Listas de asistencia mes 2',
    url: 'https://drive.google.com/file/asistencia-mes2.pdf',
    fechaCarga: '2024-09-03T09:30:00Z'
  },
  {
    id: 'EVID-005',
    tipo: 'foto',
    nombre: 'Fotografías de talleres prácticos',
    descripcion: 'Evidencia fotográfica de talleres realizados en clase',
    url: 'https://drive.google.com/folder/fotos-talleres-mes2',
    fechaCarga: '2024-09-03T10:00:00Z'
  }
];

const evidenciasInvestigacion: EvidenciaProgreso[] = [
  {
    id: 'EVID-006',
    tipo: 'publicacion',
    nombre: 'Capítulo de libro publicado',
    descripcion: 'Capítulo "Reforma del Estado en Colombia" - Editorial Universidad Nacional',
    url: 'https://editorial.unal.edu.co/libro/reforma-estado-colombia',
    fechaCarga: '2024-09-15T14:00:00Z'
  },
  {
    id: 'EVID-007',
    tipo: 'documento',
    nombre: 'Informe de avance proyecto investigación',
    descripcion: 'Informe trimestral proyecto MinCiencias',
    url: 'https://drive.google.com/file/informe-investigacion-q3.pdf',
    fechaCarga: '2024-09-20T16:30:00Z'
  },
  {
    id: 'EVID-008',
    tipo: 'certificado',
    nombre: 'Certificado ponencia congreso',
    descripcion: 'Ponencia "Modernización del Estado" - Congreso Internacional',
    url: 'https://drive.google.com/file/certificado-ponencia.pdf',
    fechaCarga: '2024-10-05T11:00:00Z'
  }
];

const evidenciasExtension: EvidenciaProgreso[] = [
  {
    id: 'EVID-009',
    tipo: 'acta',
    nombre: 'Acta de reunión con Alcaldía',
    descripcion: 'Reunión de seguimiento convenio Alcaldía - Fortalecimiento Institucional',
    url: 'https://drive.google.com/file/acta-reunion-alcaldia.pdf',
    fechaCarga: '2024-08-25T15:00:00Z'
  },
  {
    id: 'EVID-010',
    tipo: 'informe',
    nombre: 'Informe de avance convenio',
    descripcion: 'Informe mensual de actividades del convenio',
    url: 'https://drive.google.com/file/informe-convenio-mes1.pdf',
    fechaCarga: '2024-08-30T17:00:00Z'
  }
];

const evidenciasAdministrativas: EvidenciaProgreso[] = [
  {
    id: 'EVID-011',
    tipo: 'acta',
    nombre: 'Acta de Comité Curricular',
    descripcion: 'Acta sesión ordinaria Comité Curricular Especialización',
    url: 'https://drive.google.com/file/acta-comite-curricular.pdf',
    fechaCarga: '2024-08-20T13:00:00Z'
  },
  {
    id: 'EVID-012',
    tipo: 'documento',
    nombre: 'Propuesta actualización curricular',
    descripcion: 'Documento de propuesta de actualización del programa',
    url: 'https://drive.google.com/file/propuesta-curricular.pdf',
    fechaCarga: '2024-09-10T10:00:00Z'
  }
];

// ============================================================================
// REGISTROS DE PROGRESO - PTA 4 (Luis Fernando Pérez)
// ============================================================================

/**
 * MES 1 - Agosto 2024
 */
export const registrosMes1: RegistroProgreso[] = [
  // Docencia directa - 100h de 400h totales (25% mensual)
  {
    id: 'REG-2024-001',
    actividadId: 'act-014',
    actividadCodigo: 'DOC-001',
    actividadNombre: 'Docencia directa - Derecho Administrativo',
    ptaId: 'PTA-2025-004',
    periodo: '2025-1',
    mes: 1,
    horasProgramadas: 66.67, // 400h / 6 meses
    horasEjecutadas: 70,
    horasAcumuladasProgramadas: 66.67,
    horasAcumuladasEjecutadas: 70,
    descripcionActividades: `Durante el mes de agosto realicé las siguientes actividades docentes:
    
1. Docencia Presencial (16 sesiones):
   - Impartí 16 sesiones de clase de 2 horas c/u para el curso "Derecho Administrativo I"
   - Total de 32 horas presenciales con 45 estudiantes
   - Temas: Introducción al Derecho Administrativo, Fuentes, Acto Administrativo

2. Preparación de Clases (16 horas):
   - Elaboración de presentaciones y materiales didácticos
   - Diseño de casos prácticos para análisis en clase
   - Actualización bibliográfica

3. Evaluación (12 horas):
   - Diseño y aplicación del primer examen parcial
   - Calificación de 45 exámenes y 3 trabajos grupales
   - Retroalimentación individual a estudiantes con bajo rendimiento

4. Atención a estudiantes (10 horas):
   - 15 asesorías personalizadas
   - Resolución de dudas por correo electrónico
   - Acompañamiento a estudiantes con dificultades de aprendizaje`,
    evidencias: evidenciasMes1,
    registradoPor: 'docente-004',
    registradoNombre: 'Luis Fernando Pérez Vargas',
    fechaRegistro: '2024-08-30T18:00:00Z',
    aprobadoPor: 'director-001',
    fechaAprobacion: '2024-09-02T10:30:00Z',
    estado: 'aprobado',
    observaciones: 'Excelente registro. Se evidencia cumplimiento total de las actividades docentes programadas con calidad. Las evidencias son completas y detalladas.'
  },
  
  // Dirección de trabajos de grado - 13.33h
  {
    id: 'REG-2024-002',
    actividadId: 'act-015',
    actividadCodigo: 'DOC-007',
    actividadNombre: 'Dirección de trabajos de grado',
    ptaId: 'PTA-2025-004',
    periodo: '2025-1',
    mes: 1,
    horasProgramadas: 13.33, // 80h / 6 meses
    horasEjecutadas: 15,
    horasAcumuladasProgramadas: 13.33,
    horasAcumuladasEjecutadas: 15,
    descripcionActividades: `Dirección de 3 trabajos de grado:

1. "Análisis de la Ley 1437 de 2011" - Estudiante: María Rodríguez
   - 2 sesiones de asesoría (4 horas)
   - Revisión de capítulos 1 y 2
   - Orientación metodológica

2. "Control de legalidad en contratación estatal" - Estudiante: Carlos Gómez
   - 2 sesiones de asesoría (4 horas)
   - Revisión de marco teórico
   - Correcciones y ajustes

3. "Responsabilidad patrimonial del Estado" - Estudiante: Ana Martínez
   - 2 sesiones de asesoría (4 horas)
   - Definición del problema de investigación
   - Revisión de fuentes bibliográficas

Tiempo adicional dedicado: 3 horas de revisión de avances por correo`,
    evidencias: [
      {
        id: 'EVID-TG-001',
        tipo: 'documento',
        nombre: 'Actas de asesoría trabajos de grado',
        descripcion: 'Actas firmadas de las 6 sesiones de asesoría',
        url: 'https://drive.google.com/file/actas-asesoria-mes1.pdf',
        fechaCarga: '2024-08-30T19:00:00Z'
      }
    ],
    registradoPor: 'docente-004',
    registradoNombre: 'Luis Fernando Pérez Vargas',
    fechaRegistro: '2024-08-30T19:00:00Z',
    aprobadoPor: 'director-001',
    fechaAprobacion: '2024-09-02T10:35:00Z',
    estado: 'aprobado'
  },
  
  // Investigación - Publicación de libro
  {
    id: 'REG-2024-003',
    actividadId: 'act-016',
    actividadCodigo: 'INV-003',
    actividadNombre: 'Publicación de libro académico',
    ptaId: 'PTA-2025-004',
    periodo: '2025-1',
    mes: 1,
    horasProgramadas: 26.67, // 160h / 6 meses
    horasEjecutadas: 30,
    horasAcumuladasProgramadas: 26.67,
    horasAcumuladasEjecutadas: 30,
    descripcionActividades: `Avances en la publicación del libro "Reforma del Estado en Colombia":

1. Correcciones editoriales (12 horas):
   - Revisión de correcciones de estilo
   - Ajustes solicitados por pares evaluadores
   - Actualización de referencias bibliográficas

2. Diseño y maquetación (8 horas):
   - Reuniones con equipo editorial
   - Revisión de diseño de portada
   - Aprobación de diagramación

3. Promoción y difusión (10 horas):
   - Redacción de resumen ejecutivo
   - Preparación de presentación del libro
   - Coordinación de lanzamiento`,
    evidencias: evidenciasInvestigacion,
    registradoPor: 'docente-004',
    registradoNombre: 'Luis Fernando Pérez Vargas',
    fechaRegistro: '2024-08-30T20:00:00Z',
    aprobadoPor: 'subdirector-investigacion-001',
    fechaAprobacion: '2024-09-03T15:00:00Z',
    estado: 'aprobado',
    observaciones: 'Excelente trabajo de investigación. La publicación del libro es un aporte significativo al campo del Derecho Administrativo.'
  },
  
  // Extensión - Convenio Alcaldía
  {
    id: 'REG-2024-004',
    actividadId: 'act-017',
    actividadCodigo: 'EXT-002',
    actividadNombre: 'Ejecución convenio Alcaldía',
    ptaId: 'PTA-2025-004',
    periodo: '2025-1',
    mes: 1,
    horasProgramadas: 13.33, // 80h / 6 meses
    horasEjecutadas: 12,
    horasAcumuladasProgramadas: 13.33,
    horasAcumuladasEjecutadas: 12,
    descripcionActividades: `Actividades del convenio de Fortalecimiento Institucional Municipal:

1. Diagnóstico institucional (6 horas):
   - Reunión con equipo directivo de la Alcaldía
   - Análisis de estructura organizacional
   - Identificación de necesidades de fortalecimiento

2. Diseño de plan de trabajo (4 horas):
   - Elaboración de cronograma de actividades
   - Definición de productos esperados
   - Asignación de responsabilidades

3. Sesión de capacitación (2 horas):
   - Taller "Modernización Administrativa"
   - 25 funcionarios de la Alcaldía`,
    evidencias: evidenciasExtension,
    registradoPor: 'docente-004',
    registradoNombre: 'Luis Fernando Pérez Vargas',
    fechaRegistro: '2024-08-30T20:30:00Z',
    aprobadoPor: 'subdirector-extension-001',
    fechaAprobacion: '2024-09-04T11:00:00Z',
    estado: 'aprobado'
  },
  
  // Académico-Administrativo - Coordinación
  {
    id: 'REG-2024-005',
    actividadId: 'act-018',
    actividadCodigo: 'ADM-007',
    actividadNombre: 'Coordinación programa académico',
    ptaId: 'PTA-2025-004',
    periodo: '2025-1',
    mes: 1,
    horasProgramadas: 13.33, // 80h / 6 meses
    horasEjecutadas: 13,
    horasAcumuladasProgramadas: 13.33,
    horasAcumuladasEjecutadas: 13,
    descripcionActividades: `Actividades como Coordinador de la Especialización en Derecho Administrativo:

1. Reuniones de comité (6 horas):
   - Sesión ordinaria Comité Curricular
   - Comité de Autoevaluación

2. Gestión administrativa (4 horas):
   - Revisión de solicitudes de estudiantes
   - Aprobación de homologaciones
   - Coordinación con secretaría académica

3. Planeación académica (3 horas):
   - Revisión de oferta de electivas
   - Asignación de docentes
   - Actualización de programa`,
    evidencias: evidenciasAdministrativas,
    registradoPor: 'docente-004',
    registradoNombre: 'Luis Fernando Pérez Vargas',
    fechaRegistro: '2024-08-30T21:00:00Z',
    aprobadoPor: 'director-001',
    fechaAprobacion: '2024-09-02T11:00:00Z',
    estado: 'aprobado'
  }
];

/**
 * MES 2 - Septiembre 2024
 */
export const registrosMes2: RegistroProgreso[] = [
  // Docencia directa
  {
    id: 'REG-2024-006',
    actividadId: 'act-014',
    actividadCodigo: 'DOC-001',
    actividadNombre: 'Docencia directa - Derecho Administrativo',
    ptaId: 'PTA-2025-004',
    periodo: '2025-1',
    mes: 2,
    horasProgramadas: 66.67,
    horasEjecutadas: 68,
    horasAcumuladasProgramadas: 133.34,
    horasAcumuladasEjecutadas: 138,
    descripcionActividades: `Actividades docentes mes de septiembre:

1. Docencia Presencial (16 sesiones):
   - 32 horas presenciales
   - Temas: Procedimiento Administrativo, Recursos, Silencio Administrativo

2. Preparación y evaluación (20 horas):
   - Diseño de segundo parcial
   - Calificación de exámenes
   - Talleres prácticos de casos

3. Atención a estudiantes (16 horas):
   - Asesorías individuales
   - Seguimiento a estudiantes en riesgo académico`,
    evidencias: evidenciasMes2,
    registradoPor: 'docente-004',
    registradoNombre: 'Luis Fernando Pérez Vargas',
    fechaRegistro: '2024-09-30T18:00:00Z',
    aprobadoPor: 'director-001',
    fechaAprobacion: '2024-10-02T09:00:00Z',
    estado: 'aprobado',
    observaciones: 'Continúa el excelente desempeño docente.'
  },
  
  // Más registros para mes 2...
  // (Similares a mes 1, ajustando fechas y actividades)
];

/**
 * MES 3 - Octubre 2024 (Actual)
 */
export const registrosMes3: RegistroProgreso[] = [
  // Registros parciales del mes en curso
  {
    id: 'REG-2024-011',
    actividadId: 'act-014',
    actividadCodigo: 'DOC-001',
    actividadNombre: 'Docencia directa - Derecho Administrativo',
    ptaId: 'PTA-2025-004',
    periodo: '2025-1',
    mes: 3,
    horasProgramadas: 66.67,
    horasEjecutadas: 50, // Mes aún en curso
    horasAcumuladasProgramadas: 200.01,
    horasAcumuladasEjecutadas: 188,
    descripcionActividades: `Actividades parciales mes de octubre (en curso):

1. Docencia Presencial (12 sesiones completadas):
   - 24 horas presenciales
   - Temas: Contratación Estatal, Ley 80 de 1993

2. Preparación de clases (14 horas):
   - Diseño de casos prácticos
   - Actualización de materiales

3. Atención a estudiantes (12 horas):
   - Asesorías sobre tercer parcial`,
    evidencias: [],
    registradoPor: 'docente-004',
    registradoNombre: 'Luis Fernando Pérez Vargas',
    fechaRegistro: '2024-10-20T15:00:00Z',
    estado: 'pendiente-aprobacion'
  }
];

// ============================================================================
// CONSOLIDADO DE TODOS LOS REGISTROS
// ============================================================================

export const todosLosRegistros: RegistroProgreso[] = [
  ...registrosMes1,
  ...registrosMes2,
  ...registrosMes3
];

/**
 * Obtener registros por PTA
 */
export function obtenerRegistrosPorPTA(ptaId: string): RegistroProgreso[] {
  return todosLosRegistros.filter(r => r.ptaId === ptaId);
}

/**
 * Obtener registros por mes
 */
export function obtenerRegistrosPorMes(ptaId: string, mes: number): RegistroProgreso[] {
  return todosLosRegistros.filter(r => r.ptaId === ptaId && r.mes === mes);
}

/**
 * Obtener registros pendientes de aprobación
 */
export function obtenerRegistrosPendientes(usuarioCargo: string): RegistroProgreso[] {
  // En producción, filtrar por rol del aprobador
  return todosLosRegistros.filter(r => r.estado === 'pendiente-aprobacion');
}
