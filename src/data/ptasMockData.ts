/**
 * DATOS MOCK - PTAs con Flujo de Aprobación
 * 
 * PTAs de ejemplo con el sistema completo de flujo de aprobación,
 * firmas digitales y notificaciones.
 */

import {
  PTAConAprobacion,
  NotificacionPTA,
  NivelAprobacion,
  TipoAccionAprobacion,
  crearPTAConAprobacion
} from '../components/gestion-profesoral/FlujoAprobacionPTA';
import { ActividadPTA } from '../components/gestion-profesoral/MotorReglasPTA';

// Importar PTA Demo con ajustes
import { ptaDemoAjustesSolicitados } from './ptaDemoAjustesSolicitados';

// ============================================================================
// PTAs DE EJEMPLO
// ============================================================================

/**
 * PTA 1: María Elena Rodríguez - En construcción
 */
export const pta1: PTAConAprobacion = {
  ...crearPTAConAprobacion(
    'docente-001',
    'María Elena Rodríguez',
    '2025-1'
  ),
  id: 'PTA-2025-001',
  tipoVinculacion: 'carrera',
  tipoDedicacion: 'tiempo-completo',
  actividades: [
    {
      id: 'act-001',
      codigo: 'DOC-001',
      nombre: 'Docencia directa - Administración Pública I',
      descripcion: 'Curso de pregrado, 4 créditos, modalidad presencial',
      componente: 'docencia',
      horasAsignadas: 320,
      horasPorSemana: 16,
      esObligatoria: true,
      requiereEvidencia: true,
      evidencias: []
    },
    {
      id: 'act-002',
      codigo: 'DOC-005',
      nombre: 'Preparación de clases y materiales',
      descripcion: 'Planificación, diseño de materiales didácticos',
      componente: 'docencia',
      horasAsignadas: 80,
      horasPorSemana: 4,
      esObligatoria: true,
      requiereEvidencia: false
    },
    {
      id: 'act-003',
      codigo: 'INV-001',
      nombre: 'Proyecto de investigación: Gobernanza Pública',
      descripcion: 'Investigador principal, proyecto financiado MinCiencias',
      componente: 'investigacion',
      horasAsignadas: 200,
      horasPorSemana: 10,
      esObligatoria: false,
      requiereEvidencia: true,
      evidencias: []
    },
    {
      id: 'act-004',
      codigo: 'EXT-004',
      nombre: 'Diplomado en Gestión Pública Municipal',
      descripcion: 'Coordinación y docencia en diplomado de extensión',
      componente: 'extension',
      horasAsignadas: 120,
      horasPorSemana: 6,
      esObligatoria: false,
      requiereEvidencia: true
    },
    {
      id: 'act-005',
      codigo: 'ADM-006',
      nombre: 'Comité Curricular de Pregrado',
      descripcion: 'Participación como miembro del comité',
      componente: 'academico-administrativo',
      horasAsignadas: 80,
      horasPorSemana: 4,
      esObligatoria: false,
      requiereEvidencia: true
    }
  ],
  horasTotalesAsignadas: 800,
  estado: 'construccion'
};

/**
 * PTA 2: Carlos Martínez - En aprobación Nivel 1
 */
export const pta2: PTAConAprobacion = {
  ...crearPTAConAprobacion(
    'docente-002',
    'Carlos Martínez Gómez',
    '2025-1'
  ),
  id: 'PTA-2025-002',
  tipoVinculacion: 'carrera',
  tipoDedicacion: 'tiempo-completo',
  actividades: [
    {
      id: 'act-006',
      codigo: 'DOC-001',
      nombre: 'Docencia directa - Políticas Públicas II',
      descripcion: 'Curso de pregrado, 3 créditos',
      componente: 'docencia',
      horasAsignadas: 400,
      horasPorSemana: 20,
      esObligatoria: true,
      requiereEvidencia: true
    },
    {
      id: 'act-007',
      codigo: 'INV-002',
      nombre: 'Publicación artículo en revista indexada',
      descripcion: 'Artículo sobre reforma administrativa',
      componente: 'investigacion',
      horasAsignadas: 160,
      horasPorSemana: 8,
      esObligatoria: false,
      requiereEvidencia: true
    },
    {
      id: 'act-008',
      codigo: 'EXT-001',
      nombre: 'Convenio interinstitucional con Gobernación',
      descripcion: 'Asesoría en modernización del Estado',
      componente: 'extension',
      horasAsignadas: 160,
      horasPorSemana: 8,
      esObligatoria: false,
      requiereEvidencia: true
    },
    {
      id: 'act-009',
      codigo: 'ADM-002',
      nombre: 'Proceso de acreditación institucional',
      descripcion: 'Miembro del equipo de autoevaluación',
      componente: 'academico-administrativo',
      horasAsignadas: 80,
      horasPorSemana: 4,
      esObligatoria: false,
      requiereEvidencia: true
    }
  ],
  horasTotalesAsignadas: 800,
  estado: 'en-aprobacion',
  firmas: [
    {
      id: 'firma-001',
      nivel: NivelAprobacion.NIVEL_1,
      aprobadorId: 'docente-002',
      aprobadorNombre: 'Carlos Martínez Gómez',
      aprobadorCargo: 'Docente',
      aprobadorEmail: 'carlos.martinez@esap.edu.co',
      accion: TipoAccionAprobacion.ENVIAR,
      fecha: '2024-12-20T10:30:00Z',
      timestamp: 1734691800000,
      observaciones: 'PTA enviado para aprobación',
      ipAddress: '192.168.1.100'
    }
  ],
  estadoFlujo: {
    nivelActual: NivelAprobacion.NIVEL_1,
    ultimaActualizacion: '2024-12-20T10:30:00Z',
    requiereFirmasEspecificas: true,
    firmasPendientes: ['Director Territorial', 'Subdirector Territorial']
  }
};

/**
 * PTA 3: Ana Patricia Rojas - Aprobado Nivel 1, En Nivel 2
 */
export const pta3: PTAConAprobacion = {
  ...crearPTAConAprobacion(
    'docente-003',
    'Ana Patricia Rojas Silva',
    '2025-1'
  ),
  id: 'PTA-2025-003',
  tipoVinculacion: 'ocasional',
  tipoDedicacion: 'tiempo-completo',
  actividades: [
    {
      id: 'act-010',
      codigo: 'DOC-001',
      nombre: 'Docencia directa - Teoría del Estado',
      descripcion: 'Curso de pregrado',
      componente: 'docencia',
      horasAsignadas: 480,
      horasPorSemana: 24,
      esObligatoria: true,
      requiereEvidencia: true
    },
    {
      id: 'act-011',
      codigo: 'INV-007',
      nombre: 'Dirección semillero de investigación',
      descripcion: 'Semillero "Democracia y Participación"',
      componente: 'investigacion',
      horasAsignadas: 120,
      horasPorSemana: 6,
      esObligatoria: false,
      requiereEvidencia: true
    },
    {
      id: 'act-012',
      codigo: 'EXT-007',
      nombre: 'Proyección social comunitaria',
      descripcion: 'Talleres con líderes comunitarios',
      componente: 'extension',
      horasAsignadas: 120,
      horasPorSemana: 6,
      esObligatoria: false,
      requiereEvidencia: true
    },
    {
      id: 'act-013',
      codigo: 'ADM-009',
      nombre: 'Coordinación de núcleo temático',
      descripcion: 'Núcleo de Teoría Política',
      componente: 'academico-administrativo',
      horasAsignadas: 80,
      horasPorSemana: 4,
      esObligatoria: false,
      requiereEvidencia: true
    }
  ],
  horasTotalesAsignadas: 800,
  estado: 'en-aprobacion',
  firmas: [
    {
      id: 'firma-010',
      nivel: NivelAprobacion.NIVEL_1,
      aprobadorId: 'docente-003',
      aprobadorNombre: 'Ana Patricia Rojas Silva',
      aprobadorCargo: 'Docente',
      aprobadorEmail: 'ana.rojas@esap.edu.co',
      accion: TipoAccionAprobacion.ENVIAR,
      fecha: '2024-12-18T09:00:00Z',
      timestamp: 1734513600000,
      observaciones: 'PTA enviado para aprobación'
    },
    {
      id: 'firma-011',
      nivel: NivelAprobacion.NIVEL_1,
      aprobadorId: 'director-001',
      aprobadorNombre: 'Roberto Silva Castro',
      aprobadorCargo: 'Director Territorial',
      aprobadorEmail: 'roberto.silva@esap.edu.co',
      accion: TipoAccionAprobacion.APROBAR,
      fecha: '2024-12-19T14:30:00Z',
      timestamp: 1734619800000,
      observaciones: 'PTA aprobado. Cumple con los requisitos territoriales. Excelente distribución de componentes.'
    }
  ],
  estadoFlujo: {
    nivelActual: NivelAprobacion.NIVEL_2,
    ultimaActualizacion: '2024-12-19T14:30:00Z',
    requiereFirmasEspecificas: true,
    firmasPendientes: [
      'Coordinador Académico',
      'Decano',
      'Director Subdirección de Investigación'
    ]
  }
};

/**
 * PTA 4: Luis Fernando Pérez - Completamente Aprobado
 */
export const pta4: PTAConAprobacion = {
  ...crearPTAConAprobacion(
    'docente-004',
    'Luis Fernando Pérez Vargas',
    '2025-1'
  ),
  id: 'PTA-2025-004',
  tipoVinculacion: 'carrera',
  tipoDedicacion: 'tiempo-completo',
  actividades: [
    {
      id: 'act-014',
      codigo: 'DOC-001',
      nombre: 'Docencia directa - Derecho Administrativo',
      descripcion: 'Curso de pregrado',
      componente: 'docencia',
      horasAsignadas: 400,
      horasPorSemana: 20,
      esObligatoria: true,
      requiereEvidencia: true
    },
    {
      id: 'act-015',
      codigo: 'DOC-007',
      nombre: 'Dirección de trabajos de grado',
      descripcion: '3 trabajos de grado en dirección',
      componente: 'docencia',
      horasAsignadas: 80,
      horasPorSemana: 4,
      esObligatoria: true,
      requiereEvidencia: true
    },
    {
      id: 'act-016',
      codigo: 'INV-003',
      nombre: 'Publicación de libro académico',
      descripcion: 'Libro: "Reforma del Estado en Colombia"',
      componente: 'investigacion',
      horasAsignadas: 160,
      horasPorSemana: 8,
      esObligatoria: false,
      requiereEvidencia: true
    },
    {
      id: 'act-017',
      codigo: 'EXT-002',
      nombre: 'Ejecución convenio Alcaldía',
      descripcion: 'Fortalecimiento institucional municipal',
      componente: 'extension',
      horasAsignadas: 80,
      horasPorSemana: 4,
      esObligatoria: false,
      requiereEvidencia: true
    },
    {
      id: 'act-018',
      codigo: 'ADM-007',
      nombre: 'Coordinación programa académico',
      descripcion: 'Coordinador de Especialización',
      componente: 'academico-administrativo',
      horasAsignadas: 80,
      horasPorSemana: 4,
      esObligatoria: false,
      requiereEvidencia: true
    }
  ],
  horasTotalesAsignadas: 800,
  estado: 'aprobado',
  firmas: [
    {
      id: 'firma-020',
      nivel: NivelAprobacion.NIVEL_1,
      aprobadorId: 'docente-004',
      aprobadorNombre: 'Luis Fernando Pérez Vargas',
      aprobadorCargo: 'Docente',
      aprobadorEmail: 'luis.perez@esap.edu.co',
      accion: TipoAccionAprobacion.ENVIAR,
      fecha: '2024-12-15T08:00:00Z',
      timestamp: 1734246000000,
      observaciones: 'PTA enviado para aprobación'
    },
    {
      id: 'firma-021',
      nivel: NivelAprobacion.NIVEL_1,
      aprobadorId: 'director-001',
      aprobadorNombre: 'Roberto Silva Castro',
      aprobadorCargo: 'Director Territorial',
      aprobadorEmail: 'roberto.silva@esap.edu.co',
      accion: TipoAccionAprobacion.APROBAR,
      fecha: '2024-12-16T10:00:00Z',
      timestamp: 1734339600000,
      observaciones: 'Aprobado. Excelente planificación.'
    },
    {
      id: 'firma-022',
      nivel: NivelAprobacion.NIVEL_2,
      aprobadorId: 'decano-001',
      aprobadorNombre: 'Patricia Mendoza Ruiz',
      aprobadorCargo: 'Decano',
      aprobadorEmail: 'patricia.mendoza@esap.edu.co',
      accion: TipoAccionAprobacion.APROBAR,
      fecha: '2024-12-17T15:30:00Z',
      timestamp: 1734445800000,
      observaciones: 'Aprobado por Decanatura. Componentes bien balanceados.'
    },
    {
      id: 'firma-023',
      nivel: NivelAprobacion.NIVEL_3,
      aprobadorId: 'subdirector-001',
      aprobadorNombre: 'Jorge Alberto Ramírez',
      aprobadorCargo: 'Subdirector Nacional Académico',
      aprobadorEmail: 'jorge.ramirez@esap.edu.co',
      accion: TipoAccionAprobacion.APROBAR,
      fecha: '2024-12-18T11:00:00Z',
      timestamp: 1734516000000,
      observaciones: 'Aprobación final de Subdirección Nacional Académica. PTA aprobado completamente.'
    }
  ],
  estadoFlujo: {
    nivelActual: null,
    ultimaActualizacion: '2024-12-18T11:00:00Z',
    requiereFirmasEspecificas: false,
    firmasPendientes: []
  }
};

/**
 * PTA 5: Sandra Milena Torres - Devuelto para ajustes
 */
export const pta5: PTAConAprobacion = {
  ...crearPTAConAprobacion(
    'docente-005',
    'Sandra Milena Torres López',
    '2025-1'
  ),
  id: 'PTA-2025-005',
  tipoVinculacion: 'carrera',
  tipoDedicacion: 'tiempo-completo',
  actividades: [
    {
      id: 'act-019',
      codigo: 'DOC-001',
      nombre: 'Docencia directa - Economía Política',
      descripcion: 'Curso de pregrado',
      componente: 'docencia',
      horasAsignadas: 560,
      horasPorSemana: 28,
      esObligatoria: true,
      requiereEvidencia: true
    },
    {
      id: 'act-020',
      codigo: 'INV-009',
      nombre: 'Actividades de apoyo a la investigación',
      descripcion: 'Apoyo general',
      componente: 'investigacion',
      horasAsignadas: 80,
      horasPorSemana: 4,
      esObligatoria: false,
      requiereEvidencia: false
    },
    {
      id: 'act-021',
      codigo: 'ADM-006',
      nombre: 'Participación en comité',
      descripcion: 'Comité de biblioteca',
      componente: 'academico-administrativo',
      horasAsignadas: 160,
      horasPorSemana: 8,
      esObligatoria: false,
      requiereEvidencia: true
    }
  ],
  horasTotalesAsignadas: 800,
  estado: 'devuelto-ajustes',
  firmas: [
    {
      id: 'firma-030',
      nivel: NivelAprobacion.NIVEL_1,
      aprobadorId: 'docente-005',
      aprobadorNombre: 'Sandra Milena Torres López',
      aprobadorCargo: 'Docente',
      aprobadorEmail: 'sandra.torres@esap.edu.co',
      accion: TipoAccionAprobacion.ENVIAR,
      fecha: '2024-12-21T09:00:00Z',
      timestamp: 1734772800000,
      observaciones: 'PTA enviado para aprobación'
    },
    {
      id: 'firma-031',
      nivel: NivelAprobacion.NIVEL_1,
      aprobadorId: 'director-001',
      aprobadorNombre: 'Roberto Silva Castro',
      aprobadorCargo: 'Director Territorial',
      aprobadorEmail: 'roberto.silva@esap.edu.co',
      accion: TipoAccionAprobacion.RECHAZAR,
      fecha: '2024-12-21T16:45:00Z',
      timestamp: 1734800700000,
      observaciones: 'El PTA presenta un desbalance significativo en la distribución de componentes. El componente de Docencia está en 70% (máximo permitido 70%), pero Investigación solo tiene 10% cuando el mínimo recomendado es 10-30%. Se requiere aumentar actividades de Investigación a al menos 15-20% y reducir proporcionalmente Docencia o actividades administrativas. No se evidencian actividades de Extensión (componente obligatorio, mínimo 5%). Por favor reajustar la distribución de acuerdo a los lineamientos institucionales.'
    }
  ],
  estadoFlujo: {
    nivelActual: null,
    ultimaActualizacion: '2024-12-21T16:45:00Z',
    requiereFirmasEspecificas: false,
    firmasPendientes: []
  }
};

// ============================================================================
// PTAs NUEVOS DOCENTES (Carlos Méndez, Ana Gutiérrez, Roberto Silva)
// ============================================================================

/**
 * PTA 6: Dr. Carlos Méndez Bivera - URGENTE - Pendiente Nivel 1
 */
export const pta6: PTAConAprobacion = {
  ...crearPTAConAprobacion(
    'docente-catedra-021',
    'Dr. Carlos Méndez Bivera',
    '2025-1'
  ),
  id: 'PTA-2025-006',
  tipoVinculacion: 'hora-catedra',
  tipoDedicacion: 'medio-tiempo',
  actividades: [
    {
      id: 'act-022',
      codigo: 'DOC-001',
      nombre: 'Docencia directa - Gestión del Talento Humano',
      descripcion: 'Curso de especialización, 3 créditos',
      componente: 'docencia',
      horasAsignadas: 240,
      horasPorSemana: 12,
      esObligatoria: true,
      requiereEvidencia: true,
      evidencias: []
    },
    {
      id: 'act-023',
      codigo: 'DOC-005',
      nombre: 'Preparación y evaluación',
      descripcion: 'Preparación de clases y evaluaciones',
      componente: 'docencia',
      horasAsignadas: 80,
      horasPorSemana: 4,
      esObligatoria: true,
      requiereEvidencia: false
    },
    {
      id: 'act-024',
      codigo: 'INV-010',
      nombre: 'Proyecto de investigación aplicada',
      descripcion: 'Investigación sobre gestión pública territorial',
      componente: 'investigacion',
      horasAsignadas: 80,
      horasPorSemana: 4,
      esObligatoria: false,
      requiereEvidencia: true
    }
  ],
  horasTotalesAsignadas: 400,
  estado: 'en-aprobacion',
  firmas: [
    {
      id: 'firma-060',
      nivel: NivelAprobacion.NIVEL_1,
      aprobadorId: 'docente-catedra-021',
      aprobadorNombre: 'Dr. Carlos Méndez Bivera',
      aprobadorCargo: 'Docente',
      aprobadorEmail: 'carlos.mendez@esap.edu.co',
      accion: TipoAccionAprobacion.ENVIAR,
      fecha: '2024-12-10T08:00:00Z',
      timestamp: 1733817600000,
      observaciones: 'PTA enviado para aprobación URGENTE - Vence en 3 días'
    }
  ],
  estadoFlujo: {
    nivelActual: NivelAprobacion.NIVEL_1,
    ultimaActualizacion: '2024-12-10T08:00:00Z',
    requiereFirmasEspecificas: true,
    firmasPendientes: ['Director Territorial', 'Subdirector Territorial']
  }
};

/**
 * PTA 7: Dra. Ana Gutiérrez López - EN REVISIÓN - Nivel 2
 */
export const pta7: PTAConAprobacion = {
  ...crearPTAConAprobacion(
    'docente-catedra-022',
    'Dra. Ana Gutiérrez López',
    '2025-1'
  ),
  id: 'PTA-2025-007',
  tipoVinculacion: 'hora-catedra',
  tipoDedicacion: 'medio-tiempo',
  actividades: [
    {
      id: 'act-025',
      codigo: 'DOC-001',
      nombre: 'Docencia directa - Desarrollo Territorial',
      descripcion: 'Curso de maestría, 4 créditos',
      componente: 'docencia',
      horasAsignadas: 200,
      horasPorSemana: 10,
      esObligatoria: true,
      requiereEvidencia: true
    },
    {
      id: 'act-026',
      codigo: 'DOC-007',
      nombre: 'Dirección de tesis de maestría',
      descripcion: '2 tesis en dirección',
      componente: 'docencia',
      horasAsignadas: 80,
      horasPorSemana: 4,
      esObligatoria: true,
      requiereEvidencia: true
    },
    {
      id: 'act-027',
      codigo: 'INV-005',
      nombre: 'Co-investigadora proyecto territorial',
      descripcion: 'Proyecto: Gobernanza regional en Antioquia',
      componente: 'investigacion',
      horasAsignadas: 80,
      horasPorSemana: 4,
      esObligatoria: false,
      requiereEvidencia: true
    },
    {
      id: 'act-028',
      codigo: 'EXT-003',
      nombre: 'Consultoría Gobernación de Antioquia',
      descripcion: 'Asesoría en planificación estratégica',
      componente: 'extension',
      horasAsignadas: 40,
      horasPorSemana: 2,
      esObligatoria: false,
      requiereEvidencia: true
    }
  ],
  horasTotalesAsignadas: 400,
  estado: 'en-aprobacion',
  firmas: [
    {
      id: 'firma-070',
      nivel: NivelAprobacion.NIVEL_1,
      aprobadorId: 'docente-catedra-022',
      aprobadorNombre: 'Dra. Ana Gutiérrez López',
      aprobadorCargo: 'Docente',
      aprobadorEmail: 'ana.gutierrez@esap.edu.co',
      accion: TipoAccionAprobacion.ENVIAR,
      fecha: '2024-12-15T10:30:00Z',
      timestamp: 1734261000000,
      observaciones: 'PTA enviado para aprobación'
    },
    {
      id: 'firma-071',
      nivel: NivelAprobacion.NIVEL_1,
      aprobadorId: 'director-002',
      aprobadorNombre: 'María Fernanda Gómez',
      aprobadorCargo: 'Directora Territorial Antioquia',
      aprobadorEmail: 'maria.gomez@esap.edu.co',
      accion: TipoAccionAprobacion.APROBAR,
      fecha: '2024-12-16T14:00:00Z',
      timestamp: 1734358800000,
      observaciones: 'Aprobado Nivel 1. Excelente distribución de componentes académicos.'
    }
  ],
  estadoFlujo: {
    nivelActual: NivelAprobacion.NIVEL_2,
    ultimaActualizacion: '2024-12-16T14:00:00Z',
    requiereFirmasEspecificas: true,
    firmasPendientes: ['Coordinador Académico', 'Decano']
  }
};

/**
 * PTA 8: Mg. Roberto Silva Castro - CON OBSERVACIONES - Devuelto Nivel 1
 */
export const pta8: PTAConAprobacion = {
  ...crearPTAConAprobacion(
    'docente-catedra-023',
    'Mg. Roberto Silva Castro',
    '2025-1'
  ),
  id: 'PTA-2025-008',
  tipoVinculacion: 'hora-catedra',
  tipoDedicacion: 'medio-tiempo',
  actividades: [
    {
      id: 'act-029',
      codigo: 'DOC-001',
      nombre: 'Docencia directa - Administración Municipal',
      descripcion: 'Curso de especialización',
      componente: 'docencia',
      horasAsignadas: 320,
      horasPorSemana: 16,
      esObligatoria: true,
      requiereEvidencia: true
    },
    {
      id: 'act-030',
      codigo: 'DOC-005',
      nombre: 'Tutorías académicas',
      descripcion: 'Acompañamiento a estudiantes',
      componente: 'docencia',
      horasAsignadas: 60,
      horasPorSemana: 3,
      esObligatoria: true,
      requiereEvidencia: false
    },
    {
      id: 'act-031',
      codigo: 'ADM-008',
      nombre: 'Participación comité curricular',
      descripcion: 'Miembro comité de especialización',
      componente: 'academico-administrativo',
      horasAsignadas: 20,
      horasPorSemana: 1,
      esObligatoria: false,
      requiereEvidencia: true
    }
  ],
  horasTotalesAsignadas: 400,
  estado: 'devuelto-ajustes',
  firmas: [
    {
      id: 'firma-080',
      nivel: NivelAprobacion.NIVEL_1,
      aprobadorId: 'docente-catedra-023',
      aprobadorNombre: 'Mg. Roberto Silva Castro',
      aprobadorCargo: 'Docente',
      aprobadorEmail: 'roberto.silva.docente@esap.edu.co',
      accion: TipoAccionAprobacion.ENVIAR,
      fecha: '2024-12-18T09:00:00Z',
      timestamp: 1734513600000,
      observaciones: 'PTA enviado para aprobación'
    },
    {
      id: 'firma-081',
      nivel: NivelAprobacion.NIVEL_1,
      aprobadorId: 'director-003',
      aprobadorNombre: 'Juan Carlos Ospina',
      aprobadorCargo: 'Director Territorial Valle',
      aprobadorEmail: 'juan.ospina@esap.edu.co',
      accion: TipoAccionAprobacion.RECHAZAR,
      fecha: '2024-12-19T11:30:00Z',
      timestamp: 1734609000000,
      observaciones: 'El PTA requiere ajustes importantes. El componente de Docencia está al 95% (380/400 horas), lo cual excede el máximo recomendado de 70%. No se evidencian actividades de Investigación (componente recomendado con mínimo 10%). No hay actividades de Extensión (componente obligatorio con mínimo 5%). Se debe rebalancear el PTA incluyendo al menos una actividad de investigación (40-60 horas) y una actividad de extensión (20-40 horas), reduciendo proporcionalmente las horas de docencia.'
    }
  ],
  estadoFlujo: {
    nivelActual: null,
    ultimaActualizacion: '2024-12-19T11:30:00Z',
    requiereFirmasEspecificas: false,
    firmasPendientes: []
  }
};

// ============================================================================
// NOTIFICACIONES DE EJEMPLO
// ============================================================================

export const notificacionesMock: NotificacionPTA[] = [
  {
    id: 'notif-001',
    tipo: 'envio',
    destinatarioId: 'director-001',
    destinatarioEmail: 'roberto.silva@esap.edu.co',
    asunto: 'Nuevo PTA para revisión - Carlos Martínez Gómez',
    mensaje: 'Tiene un Plan de Trabajo Académico pendiente de revisión del periodo 2025-1 del docente Carlos Martínez Gómez.',
    fechaEnvio: '2024-12-20T10:30:00Z',
    leida: false,
    ptaId: 'PTA-2025-002'
  },
  {
    id: 'notif-002',
    tipo: 'aprobacion',
    destinatarioId: 'docente-003',
    destinatarioEmail: 'ana.rojas@esap.edu.co',
    asunto: 'PTA 2025-1 aprobado en Nivel 1',
    mensaje: 'Su Plan de Trabajo Académico ha sido aprobado por el Director Territorial Roberto Silva Castro. Ahora pasa al Nivel 2 (Coordinación Académica) para su revisión.',
    fechaEnvio: '2024-12-19T14:30:00Z',
    leida: true,
    ptaId: 'PTA-2025-003'
  },
  {
    id: 'notif-003',
    tipo: 'aprobacion',
    destinatarioId: 'docente-004',
    destinatarioEmail: 'luis.perez@esap.edu.co',
    asunto: 'PTA 2025-1 aprobado completamente',
    mensaje: 'Su Plan de Trabajo Académico para el periodo 2025-1 ha sido aprobado por todos los niveles jerárquicos y está listo para su ejecución.',
    fechaEnvio: '2024-12-18T11:00:00Z',
    leida: true,
    ptaId: 'PTA-2025-004'
  },
  {
    id: 'notif-004',
    tipo: 'rechazo',
    destinatarioId: 'docente-005',
    destinatarioEmail: 'sandra.torres@esap.edu.co',
    asunto: 'PTA 2025-1 devuelto para ajustes',
    mensaje: 'Su Plan de Trabajo Académico ha sido devuelto para ajustes por Roberto Silva Castro (Director Territorial).\n\nObservaciones:\nEl PTA presenta un desbalance significativo en la distribución de componentes. El componente de Docencia está en 70% (máximo permitido 70%), pero Investigación solo tiene 10% cuando el mínimo recomendado es 10-30%. Se requiere aumentar actividades de Investigación a al menos 15-20% y reducir proporcionalmente Docencia o actividades administrativas. No se evidencian actividades de Extensión (componente obligatorio, mínimo 5%). Por favor reajustar la distribución de acuerdo a los lineamientos institucionales.',
    fechaEnvio: '2024-12-21T16:45:00Z',
    leida: false,
    ptaId: 'PTA-2025-005'
  },
  {
    id: 'notif-005',
    tipo: 'envio',
    destinatarioId: 'decano-001',
    destinatarioEmail: 'patricia.mendoza@esap.edu.co',
    asunto: 'Nuevo PTA para revisión Nivel 2 - Ana Patricia Rojas Silva',
    mensaje: 'Tiene un Plan de Trabajo Académico pendiente de revisión del periodo 2025-1 del docente Ana Patricia Rojas Silva. El PTA fue aprobado en Nivel 1 y requiere su revisión como Decano.',
    fechaEnvio: '2024-12-19T14:30:00Z',
    leida: false,
    ptaId: 'PTA-2025-003'
  }
];

// ============================================================================
// COLECCIÓN COMPLETA
// ============================================================================

export const ptasMockData: PTAConAprobacion[] = [
  pta1, // En construcción
  pta2, // En aprobación Nivel 1
  pta3, // En aprobación Nivel 2
  pta4, // Aprobado completamente
  pta5, // Devuelto para ajustes
  pta6, // NUEVO: Dr. Carlos Méndez - URGENTE Nivel 1
  pta7, // NUEVO: Dra. Ana Gutiérrez - En Revisión Nivel 2
  pta8  // NUEVO: Mg. Roberto Silva - Observaciones/Devuelto
];

/**
 * PTA DEMO: Claudia Patricia Ramírez - AJUSTES SOLICITADOS
 * PTA completo para demostración con ajustes del Decano
 */
export const ptaDemo = ptaDemoAjustesSolicitados;

/**
 * Array con todas las PTAs (incluyendo la demo)
 */
export const todasLasPTAs: PTAConAprobacion[] = [
  pta1,
  pta2,
  pta3,
  pta4,
  pta5,
  pta6,  // NUEVO: Dr. Carlos Méndez Bivera
  pta7,  // NUEVO: Dra. Ana Gutiérrez López
  pta8,  // NUEVO: Mg. Roberto Silva Castro
  ptaDemo  // PTA demo
];

/**
 * Datos de usuario simulado para el dashboard
 */
export const usuarioActual = {
  id: 'usuario-director-001',
  nombre: 'Roberto Silva Castro',
  cargo: 'Director Territorial',
  email: 'roberto.silva@esap.edu.co',
  territorial: 'Bogotá - Sede Central',
  rol: 'director'
};

/**
 * Obtener PTAs pendientes para un usuario según su rol
 */
export function obtenerPTAsPendientes(usuarioCargo: string): PTAConAprobacion[] {
  return ptasMockData.filter(pta => {
    if (pta.estado !== 'en-aprobacion') return false;

    // Verificar si el usuario puede aprobar en el nivel actual
    const nivel = pta.estadoFlujo.nivelActual;
    if (!nivel) return false;

    const rolesNivel1 = ['Director Territorial', 'Subdirector Territorial'];
    const rolesNivel2 = ['Coordinador Académico', 'Decano'];
    const rolesNivel3 = ['Subdirector Nacional Académico', 'Director Subdirección Académica'];

    switch (nivel) {
      case NivelAprobacion.NIVEL_1:
        return rolesNivel1.includes(usuarioCargo);
      case NivelAprobacion.NIVEL_2:
        return rolesNivel2.includes(usuarioCargo);
      case NivelAprobacion.NIVEL_3:
        return rolesNivel3.includes(usuarioCargo);
      default:
        return false;
    }
  });
}

/**
 * Obtener notificaciones no leídas de un usuario
 */
export function obtenerNotificacionesNoLeidas(usuarioEmail: string): NotificacionPTA[] {
  return notificacionesMock.filter(
    n => n.destinatarioEmail === usuarioEmail && !n.leida
  );
}