/**
 * PTA DEMO - ESTADO "AJUSTES SOLICITADOS"
 * 
 * PTA completo con historial de aprobaciones, ajustes solicitados,
 * registros de progreso parciales, evidencias y toda la información
 * necesaria para demostrar el sistema completo.
 * 
 * Docente: Dra. Claudia Patricia Ramírez Gómez
 * Estado: ajustes-solicitados
 * Periodo: 2025-1
 * 
 * Fecha: 22 de diciembre de 2024
 */

import { PTAConAprobacion, ActividadPTA, AprobacionPTA, ComentarioAprobacion } from '../components/gestion-profesoral/FlujoAprobacionPTA';
import { RegistroProgreso, EvidenciaProgreso } from '../components/gestion-profesoral/SeguimientoControlPTA';
import { SituacionAdministrativa } from '../components/gestion-profesoral/SituacionesAdministrativasDocentes';

// ============================================================================
// ACTIVIDADES DEL PTA
// ============================================================================

const actividadesDocencia: ActividadPTA[] = [
  {
    id: 'act-demo-001',
    codigo: 'DOC-001',
    nombre: 'Docencia directa - Curso Administración Pública I',
    descripcion: 'Desarrollo de clases magistrales y talleres prácticos para el curso de Administración Pública I. Incluye preparación, dictado y evaluación de 64 horas presenciales durante el semestre.',
    componente: 'docencia',
    tipoActividad: 'docencia-directa',
    horasAsignadas: 128,
    requiereEvidencia: true,
    periodo: '2025-1',
    observaciones: 'Curso principal del programa de Administración Pública. Incluye preparación de material didáctico y actualización de contenidos según reforma al CPACA.',
    creadoPor: 'docente-demo',
    fechaCreacion: '2024-11-15T10:00:00Z'
  },
  {
    id: 'act-demo-002',
    codigo: 'DOC-002',
    nombre: 'Docencia directa - Curso Derecho Administrativo Avanzado',
    descripcion: 'Curso de profundización en Derecho Administrativo para estudiantes de últimos semestres. 48 horas presenciales.',
    componente: 'docencia',
    tipoActividad: 'docencia-directa',
    horasAsignadas: 96,
    requiereEvidencia: true,
    periodo: '2025-1',
    observaciones: 'Curso electivo de profundización',
    creadoPor: 'docente-demo',
    fechaCreacion: '2024-11-15T10:15:00Z'
  },
  {
    id: 'act-demo-003',
    codigo: 'DOC-003',
    nombre: 'Preparación de clases y materiales didácticos',
    descripcion: 'Tiempo dedicado a la preparación de contenidos, actualización de presentaciones, diseño de talleres y casos prácticos.',
    componente: 'docencia',
    tipoActividad: 'preparacion-clases',
    horasAsignadas: 64,
    requiereEvidencia: false,
    periodo: '2025-1',
    observaciones: 'Incluye actualización de casos según jurisprudencia reciente',
    creadoPor: 'docente-demo',
    fechaCreacion: '2024-11-15T10:20:00Z'
  },
  {
    id: 'act-demo-004',
    codigo: 'DOC-004',
    nombre: 'Dirección de trabajos de grado',
    descripcion: 'Dirección y asesoría de 4 trabajos de grado de estudiantes de pregrado y especialización.',
    componente: 'docencia',
    tipoActividad: 'trabajos-grado',
    horasAsignadas: 80,
    requiereEvidencia: true,
    periodo: '2025-1',
    observaciones: 'Incluye: 2 trabajos pregrado + 2 trabajos especialización',
    creadoPor: 'docente-demo',
    fechaCreacion: '2024-11-15T10:25:00Z'
  },
  {
    id: 'act-demo-005',
    codigo: 'DOC-005',
    nombre: 'Atención a estudiantes y tutorías',
    descripcion: 'Horario de atención a estudiantes para resolución de dudas, tutorías personalizadas y seguimiento académico.',
    componente: 'docencia',
    tipoActividad: 'atencion-estudiantes',
    horasAsignadas: 32,
    requiereEvidencia: false,
    periodo: '2025-1',
    observaciones: '2 horas semanales de atención',
    creadoPor: 'docente-demo',
    fechaCreacion: '2024-11-15T10:30:00Z'
  }
];

const actividadesInvestigacion: ActividadPTA[] = [
  {
    id: 'act-demo-006',
    codigo: 'INV-001',
    nombre: 'Proyecto de investigación: "Modernización del Estado Colombiano"',
    descripcion: 'Proyecto de investigación financiado por MinCiencias sobre transformación digital y modernización administrativa en el Estado colombiano.',
    componente: 'investigacion',
    tipoActividad: 'proyecto-investigacion',
    horasAsignadas: 120,
    requiereEvidencia: true,
    periodo: '2025-1',
    observaciones: 'Proyecto activo MinCiencias - Código 1234567. Investigador principal.',
    creadoPor: 'docente-demo',
    fechaCreacion: '2024-11-15T10:35:00Z'
  },
  {
    id: 'act-demo-007',
    codigo: 'INV-002',
    nombre: 'Publicación de artículo científico en revista indexada',
    descripcion: 'Redacción y sometimiento de artículo sobre "Eficiencia administrativa en gobiernos locales" para revista Scopus Q2.',
    componente: 'investigacion',
    tipoActividad: 'publicacion',
    horasAsignadas: 60,
    requiereEvidencia: true,
    periodo: '2025-1',
    observaciones: 'Revista: Public Administration Review (Q2 Scopus)',
    creadoPor: 'docente-demo',
    fechaCreacion: '2024-11-15T10:40:00Z'
  },
  {
    id: 'act-demo-008',
    codigo: 'INV-003',
    nombre: 'Participación en grupo de investigación',
    descripcion: 'Participación activa en el grupo de investigación "Gobierno y Gestión Pública" categorizado en MinCiencias.',
    componente: 'investigacion',
    tipoActividad: 'grupo-investigacion',
    horasAsignadas: 40,
    requiereEvidencia: true,
    periodo: '2025-1',
    observaciones: 'Grupo categoría A1 - MinCiencias',
    creadoPor: 'docente-demo',
    fechaCreacion: '2024-11-15T10:45:00Z'
  }
];

const actividadesExtension: ActividadPTA[] = [
  {
    id: 'act-demo-009',
    codigo: 'EXT-001',
    nombre: 'Convenio con Gobernación de Cundinamarca - Fortalecimiento Institucional',
    descripcion: 'Ejecución de convenio de asistencia técnica para el fortalecimiento de capacidades institucionales de 15 municipios.',
    componente: 'extension',
    tipoActividad: 'convenio',
    horasAsignadas: 80,
    requiereEvidencia: true,
    periodo: '2025-1',
    observaciones: 'Convenio 2024-456 Gobernación Cundinamarca. Coordinador técnico del proyecto.',
    creadoPor: 'docente-demo',
    fechaCreacion: '2024-11-15T10:50:00Z'
  },
  {
    id: 'act-demo-010',
    codigo: 'EXT-002',
    nombre: 'Diplomado en Gestión Pública Municipal',
    descripcion: 'Diseño y dictado de módulos para diplomado dirigido a funcionarios públicos municipales.',
    componente: 'extension',
    tipoActividad: 'educacion-continua',
    horasAsignadas: 48,
    requiereEvidencia: true,
    periodo: '2025-1',
    observaciones: 'Dictado de 3 módulos: Planeación estratégica, Gestión por resultados, Rendición de cuentas',
    creadoPor: 'docente-demo',
    fechaCreacion: '2024-11-15T10:55:00Z'
  }
];

const actividadesAdministrativas: ActividadPTA[] = [
  {
    id: 'act-demo-011',
    codigo: 'ADM-001',
    nombre: 'Coordinación de Especialización en Gestión Pública',
    descripcion: 'Coordinación académica y administrativa de la Especialización en Gestión Pública. Incluye gestión de docentes, estudiantes y procesos académicos.',
    componente: 'academico-administrativo',
    tipoActividad: 'coordinacion-programa',
    horasAsignadas: 80,
    requiereEvidencia: true,
    periodo: '2025-1',
    observaciones: 'Coordinación del programa con 85 estudiantes activos',
    creadoPor: 'docente-demo',
    fechaCreacion: '2024-11-15T11:00:00Z'
  },
  {
    id: 'act-demo-012',
    codigo: 'ADM-002',
    nombre: 'Participación en Comité Curricular',
    descripcion: 'Participación en sesiones ordinarias y extraordinarias del Comité Curricular de la Facultad.',
    componente: 'academico-administrativo',
    tipoActividad: 'comites',
    horasAsignadas: 24,
    requiereEvidencia: true,
    periodo: '2025-1',
    observaciones: 'Comité Curricular - Facultad de Administración Pública',
    creadoPor: 'docente-demo',
    fechaCreacion: '2024-11-15T11:05:00Z'
  },
  {
    id: 'act-demo-013',
    codigo: 'ADM-003',
    nombre: 'Proceso de autoevaluación y acreditación',
    descripcion: 'Participación en el proceso de autoevaluación con fines de renovación de acreditación de alta calidad del programa.',
    componente: 'academico-administrativo',
    tipoActividad: 'acreditacion',
    horasAsignadas: 48,
    requiereEvidencia: true,
    periodo: '2025-1',
    observaciones: 'Líder factor 4: Docentes. Proceso de renovación de acreditación.',
    creadoPor: 'docente-demo',
    fechaCreacion: '2024-11-15T11:10:00Z'
  }
];

const todasLasActividades: ActividadPTA[] = [
  ...actividadesDocencia,
  ...actividadesInvestigacion,
  ...actividadesExtension,
  ...actividadesAdministrativas
];

// ============================================================================
// HISTORIAL DE APROBACIONES
// ============================================================================

const aprobaciones: AprobacionPTA[] = [
  // Nivel 1: Director Territorial - APROBADO
  {
    id: 'apro-demo-001',
    ptaId: 'PTA-DEMO-2025-001',
    nivel: 1,
    aprobadorId: 'director-bogota-001',
    aprobadorNombre: 'Dr. Carlos Andrés Martínez',
    aprobadorCargo: 'Director Territorial Bogotá',
    estado: 'aprobado',
    fechaAprobacion: '2024-11-20T14:30:00Z',
    observaciones: 'Aprobado. La distribución de horas es adecuada y está alineada con las necesidades del programa. Excelente balance entre docencia, investigación y extensión.',
    firmaDigital: 'SHA256:a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
    requiereAjustes: false
  },
  // Nivel 2: Subdirector Académico - APROBADO CON OBSERVACIONES
  {
    id: 'apro-demo-002',
    ptaId: 'PTA-DEMO-2025-001',
    nivel: 2,
    aprobadorId: 'subdirector-academico-001',
    aprobadorNombre: 'Dra. María Teresa González',
    aprobadorCargo: 'Subdirectora Académica Nacional',
    estado: 'aprobado',
    fechaAprobacion: '2024-11-25T10:15:00Z',
    observaciones: 'Aprobado con observaciones menores. Sugiero aumentar ligeramente las horas de atención a estudiantes dada la carga de cursos. Sin embargo, no es un ajuste obligatorio.',
    firmaDigital: 'SHA256:b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7',
    requiereAjustes: false
  },
  // Nivel 3: Decano - AJUSTES SOLICITADOS
  {
    id: 'apro-demo-003',
    ptaId: 'PTA-DEMO-2025-001',
    nivel: 3,
    aprobadorId: 'decano-001',
    aprobadorNombre: 'Dr. Roberto Silva Castro',
    aprobadorCargo: 'Decano Facultad de Administración Pública',
    estado: 'ajustes-solicitados',
    fechaAprobacion: '2024-12-02T16:45:00Z',
    observaciones: `Solicito los siguientes ajustes antes de la aprobación final:

1. DOCENCIA (Ajuste Obligatorio):
   - La actividad DOC-002 "Derecho Administrativo Avanzado" tiene 96 horas asignadas, pero según el plan de estudios actualizado este curso debe ser de 64 horas presenciales (32 horas/semestre).
   - Las 32 horas liberadas deben reasignarse a actividades de investigación o extensión según prioridades institucionales.

2. INVESTIGACIÓN (Ajuste Sugerido):
   - El proyecto MinCiencias requiere mayor dedicación horaria según la propuesta aprobada. Sugerimos aumentar de 120h a 160h.
   - Justificación: El proyecto está en fase de trabajo de campo y requiere mayor tiempo de dedicación.

3. EXTENSIÓN (Ajuste Obligatorio):
   - El convenio con la Gobernación de Cundinamarca (EXT-001) tiene un cronograma que requiere 100 horas semestrales según el plan de trabajo firmado, no 80h.
   - Debe ajustarse a las 100 horas comprometidas contractualmente.

4. ACADÉMICO-ADMINISTRATIVO (Observación):
   - La coordinación de la Especialización con 85 estudiantes justifica las 80 horas asignadas. Aprobado.
   - Sin embargo, sugiero evaluar si el proceso de acreditación (48h) no está subestimado dado que somos líderes del factor 4.

RESUMEN DE AJUSTES:
- DOC-002: Reducir de 96h a 64h (-32h)
- INV-001: Aumentar de 120h a 160h (+40h)
- EXT-001: Aumentar de 80h a 100h (+20h)
- Balance neto: +28h (de 800h a 828h)

Por favor realizar estos ajustes y reenviar para aprobación final. El PTA está muy bien estructurado, solo requiere estos ajustes de alineación con compromisos institucionales.`,
    firmaDigital: 'SHA256:c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8',
    requiereAjustes: true,
    ajustesSolicitados: `1. Reducir horas DOC-002 de 96h a 64h
2. Aumentar horas INV-001 de 120h a 160h  
3. Aumentar horas EXT-001 de 80h a 100h
4. Verificar horas ADM-003 (sugerido, no obligatorio)`
  }
];

// ============================================================================
// COMENTARIOS DE APROBACIÓN
// ============================================================================

const comentarios: ComentarioAprobacion[] = [
  {
    id: 'com-demo-001',
    aprobacionId: 'apro-demo-001',
    autorId: 'director-bogota-001',
    autorNombre: 'Dr. Carlos Andrés Martínez',
    comentario: 'Excelente distribución de carga académica. La docente ha logrado un balance óptimo entre los cuatro componentes misionales.',
    fechaComentario: '2024-11-20T14:30:00Z',
    esPublico: true
  },
  {
    id: 'com-demo-002',
    aprobacionId: 'apro-demo-002',
    autorId: 'subdirector-academico-001',
    autorNombre: 'Dra. María Teresa González',
    comentario: 'La participación en investigación es destacable. El proyecto MinCiencias es estratégico para la institución.',
    fechaComentario: '2024-11-25T10:15:00Z',
    esPublico: true
  },
  {
    id: 'com-demo-003',
    aprobacionId: 'apro-demo-003',
    autorId: 'decano-001',
    autorNombre: 'Dr. Roberto Silva Castro',
    comentario: 'Los ajustes solicitados son necesarios para alinear el PTA con compromisos contractuales. Una vez realizados, el PTA será aprobado inmediatamente.',
    fechaComentario: '2024-12-02T16:45:00Z',
    esPublico: true
  },
  {
    id: 'com-demo-004',
    aprobacionId: 'apro-demo-003',
    autorId: 'decano-001',
    autorNombre: 'Dr. Roberto Silva Castro',
    comentario: 'Nota: He revisado el convenio con la Gobernación y efectivamente requiere 100h según cláusula 5.2 del contrato. Por favor ajustar.',
    fechaComentario: '2024-12-02T16:50:00Z',
    esPublico: false
  }
];

// ============================================================================
// PTA COMPLETO
// ============================================================================

export const ptaDemoAjustesSolicitados: PTAConAprobacion = {
  // Información básica
  id: 'PTA-DEMO-2025-001',
  version: 2,
  
  // Docente
  docenteId: 'docente-demo-001',
  docenteNombre: 'Dra. Claudia Patricia Ramírez Gómez',
  docenteDocumento: '52.678.934',
  docenteEmail: 'claudia.ramirez@esap.edu.co',
  docenteTelefono: '3001234567',
  
  // Vinculación
  tipoVinculacion: 'carrera',
  tipoContrato: 'tiempo-completo',
  dedicacion: 'tiempo-completo',
  
  // Ubicación
  territorial: 'Bogotá',
  facultad: 'Facultad de Administración Pública',
  programa: 'Administración Pública',
  
  // Periodo
  periodo: '2025-1',
  fechaInicio: '2025-01-15',
  fechaFin: '2025-06-30',
  
  // Horas
  horasSemanaContrato: 40,
  horasSemanalesDisponibles: 40,
  horasTotalesAsignadas: 800,
  horasDocencia: 400,
  horasInvestigacion: 220,
  horasExtension: 128,
  horasAdministrativo: 152,
  
  // Actividades
  actividades: todasLasActividades,
  
  // Estado y aprobación
  estado: 'ajustes-solicitados',
  nivelAprobacionActual: 3,
  aprobaciones: aprobaciones,
  comentarios: comentarios,
  requiereAjustes: true,
  ajustesSolicitados: `AJUSTES SOLICITADOS POR DECANATURA:

1. OBLIGATORIO - Actividad DOC-002:
   Reducir horas de 96h a 64h según plan de estudios actualizado

2. OBLIGATORIO - Actividad INV-001:
   Aumentar horas de 120h a 160h según cronograma proyecto MinCiencias

3. OBLIGATORIO - Actividad EXT-001:
   Aumentar horas de 80h a 100h según contrato Gobernación (Cláusula 5.2)

4. SUGERIDO - Actividad ADM-003:
   Revisar si 48h son suficientes para liderazgo del factor 4

Total ajuste: +28 horas (800h → 828h)`,
  
  // Metadata
  creadoPor: 'docente-demo-001',
  fechaCreacion: '2024-11-15T09:00:00Z',
  ultimaModificacion: '2024-12-02T17:00:00Z',
  modificadoPor: 'docente-demo-001',
  
  // Observaciones
  observaciones: `PTA estructurado según lineamientos institucionales y normativa vigente.
  
DISTRIBUCIÓN POR COMPONENTE:
- Docencia: 50% (400h) - Cumple con carga mínima
- Investigación: 27.5% (220h) - Proyecto MinCiencias activo
- Extensión: 16% (128h) - Convenio estratégico Gobernación
- Académico-Administrativo: 19% (152h) - Coordinación Especialización

COMPROMISOS INSTITUCIONALES:
- Proyecto MinCiencias 2024-2026 (Investigador Principal)
- Convenio Gobernación Cundinamarca 2024-456
- Coordinación Especialización en Gestión Pública
- Proceso renovación acreditación alta calidad

ESTADO ACTUAL:
En ajuste por observaciones de Decanatura. Ajustes menores relacionados con alineación contractual y actualización curricular.`
};

// ============================================================================
// REGISTROS DE PROGRESO (PARCIALES)
// ============================================================================

// Nota: Este PTA no tiene registros de progreso porque está en ajustes y no ha sido aprobado finalmente
export const registrosProgresoPTADemo: RegistroProgreso[] = [];

// ============================================================================
// SITUACIÓN ADMINISTRATIVA RELACIONADA
// ============================================================================

export const situacionAdministrativaDemo: SituacionAdministrativa = {
  id: 'SIT-DEMO-001',
  docenteId: 'docente-demo-001',
  docenteNombre: 'Dra. Claudia Patricia Ramírez Gómez',
  docenteDocumento: '52.678.934',
  tipo: 'comision-docente',
  descripcion: 'Comisión de estudios para participación en Congreso Internacional',
  motivo: 'Ponencia en IV Congreso Internacional de Administración Pública - Universidad de Chile',
  fechaInicio: '2025-03-10T00:00:00Z',
  fechaFin: '2025-03-15T23:59:59Z',
  duracionDias: 6,
  estado: 'aprobada',
  impactoDisponibilidad: 'ninguno',
  porcentajeDisponibilidad: 100,
  afectaPTA: false,
  afectaCargaAcademica: false,
  numeroActoAdministrativo: 'Resolución 0234 de 2025',
  evidencias: [
    {
      id: 'EVID-DEMO-001',
      tipo: 'certificado',
      nombre: 'Carta de aceptación ponencia',
      descripcion: 'Carta oficial de aceptación de ponencia en congreso',
      url: 'https://drive.google.com/file/carta-aceptacion-congreso.pdf',
      fechaCarga: '2024-12-01T10:00:00Z',
      cargadoPor: 'docente-demo-001'
    }
  ],
  solicitadoPor: 'docente-demo-001',
  solicitadoFecha: '2024-11-28T09:00:00Z',
  aprobadoPor: 'decano-001',
  aprobadoFecha: '2024-11-30T14:00:00Z',
  aprobadoCargo: 'Decano',
  observacionesAprobacion: 'Aprobada comisión. La participación en el congreso fortalece la visibilidad institucional.',
  registradoTalentoHumano: true,
  fechaRegistroTH: '2024-12-01T09:00:00Z',
  funcionarioTH: 'Ana López - Talento Humano',
  codigoTH: 'TH-COM-2024-0015',
  requiereCompensacion: false,
  createdAt: '2024-11-28T09:00:00Z',
  updatedAt: '2024-12-01T09:00:00Z',
  observaciones: 'Comisión de estudios sin afectación de actividades académicas. Las clases serán compensadas.'
};

// ============================================================================
// FUNCIÓN HELPER
// ============================================================================

/**
 * Obtener el PTA demo con ajustes solicitados
 */
export function obtenerPTADemoAjustes(): PTAConAprobacion {
  return ptaDemoAjustesSolicitados;
}

/**
 * Obtener resumen de ajustes solicitados
 */
export function obtenerResumenAjustes(): {
  total: number;
  obligatorios: number;
  sugeridos: number;
  detalles: Array<{
    actividad: string;
    tipo: 'obligatorio' | 'sugerido';
    descripcion: string;
    ajusteHoras: string;
  }>;
} {
  return {
    total: 4,
    obligatorios: 3,
    sugeridos: 1,
    detalles: [
      {
        actividad: 'DOC-002 - Derecho Administrativo Avanzado',
        tipo: 'obligatorio',
        descripcion: 'Reducir horas según plan de estudios actualizado',
        ajusteHoras: '96h → 64h (-32h)'
      },
      {
        actividad: 'INV-001 - Proyecto MinCiencias',
        tipo: 'obligatorio',
        descripcion: 'Aumentar según cronograma proyecto',
        ajusteHoras: '120h → 160h (+40h)'
      },
      {
        actividad: 'EXT-001 - Convenio Gobernación',
        tipo: 'obligatorio',
        descripcion: 'Ajustar según contrato (Cláusula 5.2)',
        ajusteHoras: '80h → 100h (+20h)'
      },
      {
        actividad: 'ADM-003 - Proceso Acreditación',
        tipo: 'sugerido',
        descripcion: 'Evaluar si las horas son suficientes',
        ajusteHoras: '48h → ? (por definir)'
      }
    ]
  };
}
