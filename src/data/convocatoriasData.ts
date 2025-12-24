/**
 * DATOS DE CONVOCATORIAS Y CANDIDATOS
 * 
 * Fuente centralizada de datos de convocatorias docentes ESAP
 * Incluye: Convocatorias, Candidatos/Aspirantes, Seleccionados y No Seleccionados
 * 
 * Usado por:
 * - Módulo 2: Convocatorias (Gestión Profesoral)
 * - Directorio Docente (para aspirantes, seleccionados, no seleccionados)
 * 
 * Fecha: 23 de diciembre de 2024
 */

export type EstadoConvocatoria = 'Abierta' | 'En Evaluación' | 'Cerrada' | 'Cancelada';
export type EstadoCandidato = 'pendiente' | 'en-evaluacion' | 'seleccionado' | 'no-seleccionado' | 'retirado';

export interface Convocatoria {
  id: string;
  codigo: string;
  titulo: string;
  territorial: {
    id: string;
    nombre: string;
    codigo: string;
  };
  programa: string;
  vacantes: number;
  postulados: number;
  fechaInicio: string;
  fechaCierre: string;
  estado: EstadoConvocatoria;
  perfilRequerido: string;
  año: number;
}

export interface CandidatoConvocatoria {
  id: string;
  personId: string;
  convocatoriaId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  documentType: string;
  documentNumber: string;
  formacion: string; // Doctorado, Maestría, Especialización, Pregrado
  experienciaDocente?: number; // años
  puntajeTotal?: number;
  estado: EstadoCandidato;
  fechaPostulacion: string;
  avatar?: string;
  observaciones?: string;
}

// ============================================================================
// CONVOCATORIAS ACTIVAS Y CERRADAS
// ============================================================================

export const CONVOCATORIAS_ESAP: Convocatoria[] = [
  {
    id: 'conv-2025-001',
    codigo: 'CONV-2025-001',
    titulo: 'Docente de Carrera - Administración Pública',
    territorial: {
      id: 'ter-bogota',
      nombre: 'Territorial Bogotá',
      codigo: 'ESAP-BOG'
    },
    programa: 'Administración Pública',
    vacantes: 3,
    postulados: 45,
    fechaInicio: '2025-01-10',
    fechaCierre: '2025-02-10',
    estado: 'Abierta',
    perfilRequerido: 'Maestría en Administración Pública o afines',
    año: 2025
  },
  {
    id: 'conv-2025-002',
    codigo: 'CONV-2025-002',
    titulo: 'Docente Ocasional - Derecho Administrativo',
    territorial: {
      id: 'ter-antioquia',
      nombre: 'Territorial Antioquia',
      codigo: 'ESAP-ANT'
    },
    programa: 'Derecho Público',
    vacantes: 2,
    postulados: 28,
    fechaInicio: '2025-01-15',
    fechaCierre: '2025-02-15',
    estado: 'Abierta',
    perfilRequerido: 'Maestría en Derecho Administrativo',
    año: 2025
  },
  {
    id: 'conv-2024-089',
    codigo: 'CONV-2024-089',
    titulo: 'Docente de Carrera - Economía Pública',
    territorial: {
      id: 'ter-bogota',
      nombre: 'Territorial Bogotá',
      codigo: 'ESAP-BOG'
    },
    programa: 'Economía Pública',
    vacantes: 1,
    postulados: 67,
    fechaInicio: '2024-11-01',
    fechaCierre: '2024-12-31',
    estado: 'En Evaluación',
    perfilRequerido: 'Doctorado en Economía',
    año: 2024
  },
  {
    id: 'conv-2024-088',
    codigo: 'CONV-2024-088',
    titulo: 'Docente Ocasional - Gestión Pública',
    territorial: {
      id: 'ter-valle',
      nombre: 'Territorial Valle del Cauca',
      codigo: 'ESAP-VAL'
    },
    programa: 'Gestión Pública',
    vacantes: 2,
    postulados: 34,
    fechaInicio: '2024-10-15',
    fechaCierre: '2024-11-30',
    estado: 'Cerrada',
    perfilRequerido: 'Maestría en Gestión Pública',
    año: 2024
  },
  {
    id: 'conv-2024-075',
    codigo: 'CONV-2024-075',
    titulo: 'Docente Hora Cátedra - Ciencia Política',
    territorial: {
      id: 'ter-atlantico',
      nombre: 'Territorial Atlántico',
      codigo: 'ESAP-ATL'
    },
    programa: 'Ciencia Política',
    vacantes: 1,
    postulados: 22,
    fechaInicio: '2024-09-01',
    fechaCierre: '2024-10-15',
    estado: 'Cerrada',
    perfilRequerido: 'Maestría en Ciencia Política',
    año: 2024
  }
];

// ============================================================================
// CANDIDATOS/ASPIRANTES - ESTADO: PENDIENTE
// ============================================================================

export const CANDIDATOS_PENDIENTES: CandidatoConvocatoria[] = [
  {
    id: 'cand-001',
    personId: 'person-cand-001',
    convocatoriaId: 'conv-2025-001',
    firstName: 'Laura María',
    lastName: 'Ramírez González',
    email: 'laura.ramirez@email.com',
    phone: '+57 320 456 7890',
    documentType: 'CC',
    documentNumber: '1015678901',
    formacion: 'Maestría',
    experienciaDocente: 5,
    estado: 'pendiente',
    fechaPostulacion: '2025-01-12',
    avatar: undefined
  },
  {
    id: 'cand-002',
    personId: 'person-cand-002',
    convocatoriaId: 'conv-2025-002',
    firstName: 'Carlos Andrés',
    lastName: 'Martínez López',
    email: 'carlos.martinez@email.com',
    phone: '+57 315 234 5678',
    documentType: 'CC',
    documentNumber: '1098234567',
    formacion: 'Doctorado',
    experienciaDocente: 8,
    estado: 'pendiente',
    fechaPostulacion: '2025-01-16',
    avatar: undefined
  },
  {
    id: 'cand-003',
    personId: 'person-cand-003',
    convocatoriaId: 'conv-2025-001',
    firstName: 'Ana Sofía',
    lastName: 'Torres Ruiz',
    email: 'ana.torres@email.com',
    phone: '+57 318 765 4321',
    documentType: 'CC',
    documentNumber: '52987654',
    formacion: 'Maestría',
    experienciaDocente: 3,
    estado: 'pendiente',
    fechaPostulacion: '2025-01-14',
    avatar: undefined
  },
  {
    id: 'cand-004',
    personId: 'person-cand-004',
    convocatoriaId: 'conv-2024-089',
    firstName: 'Jorge Luis',
    lastName: 'Hernández Castro',
    email: 'jorge.hernandez@email.com',
    phone: '+57 312 890 1234',
    documentType: 'CC',
    documentNumber: '79543210',
    formacion: 'Doctorado',
    experienciaDocente: 10,
    estado: 'en-evaluacion',
    fechaPostulacion: '2024-11-05',
    puntajeTotal: 87.5,
    avatar: undefined
  },
  {
    id: 'cand-005',
    personId: 'person-cand-005',
    convocatoriaId: 'conv-2024-089',
    firstName: 'María Fernanda',
    lastName: 'Gómez Vargas',
    email: 'maria.gomez@email.com',
    phone: '+57 310 234 5678',
    documentType: 'CC',
    documentNumber: '1012345678',
    formacion: 'Doctorado',
    experienciaDocente: 12,
    estado: 'en-evaluacion',
    fechaPostulacion: '2024-11-08',
    puntajeTotal: 91.2,
    avatar: undefined
  }
];

// ============================================================================
// SELECCIONADOS EN CONVOCATORIAS
// ============================================================================

export const CANDIDATOS_SELECCIONADOS: CandidatoConvocatoria[] = [
  {
    id: 'sel-001',
    personId: 'person-sel-001',
    convocatoriaId: 'conv-2024-088',
    firstName: 'Diana Patricia',
    lastName: 'Rodríguez Sánchez',
    email: 'diana.rodriguez@esap.edu.co', // Ya tiene email ESAP porque fue seleccionada
    phone: '+57 310 987 6543',
    documentType: 'CC',
    documentNumber: '52789012',
    formacion: 'Maestría',
    experienciaDocente: 6,
    puntajeTotal: 94.3,
    estado: 'seleccionado',
    fechaPostulacion: '2024-10-18',
    avatar: undefined,
    observaciones: 'Vinculada como Docente Ocasional desde 2024-12-01'
  },
  {
    id: 'sel-002',
    personId: 'person-sel-002',
    convocatoriaId: 'conv-2024-075',
    firstName: 'Roberto Carlos',
    lastName: 'Silva Mendoza',
    email: 'roberto.silva@esap.edu.co',
    phone: '+57 315 876 5432',
    documentType: 'CC',
    documentNumber: '80345678',
    formacion: 'Maestría',
    experienciaDocente: 7,
    puntajeTotal: 89.7,
    estado: 'seleccionado',
    fechaPostulacion: '2024-09-05',
    avatar: undefined,
    observaciones: 'Vinculado como Hora Cátedra desde 2024-10-20'
  }
];

// ============================================================================
// NO SELECCIONADOS EN CONVOCATORIAS
// ============================================================================

export const CANDIDATOS_NO_SELECCIONADOS: CandidatoConvocatoria[] = [
  {
    id: 'nosel-001',
    personId: 'person-nosel-001',
    convocatoriaId: 'conv-2024-088',
    firstName: 'Ricardo Alfonso',
    lastName: 'García Torres',
    email: 'ricardo.garcia@email.com',
    phone: '+57 318 765 4321',
    documentType: 'CC',
    documentNumber: '80123456',
    formacion: 'Especialización',
    experienciaDocente: 4,
    puntajeTotal: 68.5,
    estado: 'no-seleccionado',
    fechaPostulacion: '2024-10-20',
    avatar: undefined,
    observaciones: 'No cumplió puntaje mínimo de 70 puntos'
  },
  {
    id: 'nosel-002',
    personId: 'person-nosel-002',
    convocatoriaId: 'conv-2024-075',
    firstName: 'Sandra Milena',
    lastName: 'López Pérez',
    email: 'sandra.lopez@email.com',
    phone: '+57 312 345 6789',
    documentType: 'CC',
    documentNumber: '52456789',
    formacion: 'Maestría',
    experienciaDocente: 2,
    puntajeTotal: 72.3,
    estado: 'no-seleccionado',
    fechaPostulacion: '2024-09-08',
    avatar: undefined,
    observaciones: 'Puntaje suficiente pero quedó por fuera del cupo (2do lugar)'
  },
  {
    id: 'nosel-003',
    personId: 'person-nosel-003',
    convocatoriaId: 'conv-2024-089',
    firstName: 'Andrés Felipe',
    lastName: 'Morales Díaz',
    email: 'andres.morales@email.com',
    phone: '+57 320 987 6543',
    documentType: 'CC',
    documentNumber: '1023456789',
    formacion: 'Maestría',
    experienciaDocente: 5,
    puntajeTotal: 65.8,
    estado: 'no-seleccionado',
    fechaPostulacion: '2024-11-10',
    avatar: undefined,
    observaciones: 'No presentó entrevista'
  }
];

// ============================================================================
// TODOS LOS CANDIDATOS (UNIFICADO)
// ============================================================================

export const TODOS_LOS_CANDIDATOS = [
  ...CANDIDATOS_PENDIENTES,
  ...CANDIDATOS_SELECCIONADOS,
  ...CANDIDATOS_NO_SELECCIONADOS
];

// ============================================================================
// FUNCIONES HELPER
// ============================================================================

/**
 * Obtiene una convocatoria por ID
 */
export function getConvocatoriaById(id: string): Convocatoria | undefined {
  return CONVOCATORIAS_ESAP.find(conv => conv.id === id);
}

/**
 * Obtiene todos los candidatos de una convocatoria
 */
export function getCandidatosByConvocatoria(convocatoriaId: string): CandidatoConvocatoria[] {
  return TODOS_LOS_CANDIDATOS.filter(cand => cand.convocatoriaId === convocatoriaId);
}

/**
 * Obtiene candidatos por estado
 */
export function getCandidatosByEstado(estado: EstadoCandidato): CandidatoConvocatoria[] {
  return TODOS_LOS_CANDIDATOS.filter(cand => cand.estado === estado);
}

/**
 * Obtiene estadísticas generales de convocatorias
 */
export function getEstadisticasConvocatorias() {
  return {
    totalConvocatorias: CONVOCATORIAS_ESAP.length,
    convocatoriasAbiertas: CONVOCATORIAS_ESAP.filter(c => c.estado === 'Abierta').length,
    convocatoriasEnEvaluacion: CONVOCATORIAS_ESAP.filter(c => c.estado === 'En Evaluación').length,
    convocatoriasCerradas: CONVOCATORIAS_ESAP.filter(c => c.estado === 'Cerrada').length,
    totalPostulados: CONVOCATORIAS_ESAP.reduce((sum, c) => sum + c.postulados, 0),
    totalVacantes: CONVOCATORIAS_ESAP.reduce((sum, c) => sum + c.vacantes, 0),
    candidatosPendientes: CANDIDATOS_PENDIENTES.length,
    candidatosEnEvaluacion: TODOS_LOS_CANDIDATOS.filter(c => c.estado === 'en-evaluacion').length,
    candidatosSeleccionados: CANDIDATOS_SELECCIONADOS.length,
    candidatosNoSeleccionados: CANDIDATOS_NO_SELECCIONADOS.length,
    bancoElegibles: CANDIDATOS_SELECCIONADOS.length + TODOS_LOS_CANDIDATOS.filter(c => c.estado === 'en-evaluacion' && (c.puntajeTotal || 0) >= 70).length
  };
}
