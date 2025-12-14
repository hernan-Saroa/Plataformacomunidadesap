// MOCK DATA COMPLETO: Módulo de Gestión Profesoral ESAP
// Incluye: Docentes, PTAs, Convocatorias, Evaluaciones

// ============================================================
// PLANS DE TRABAJO ACADÉMICO (PTAs)
// ============================================================

export interface PlanTrabajoAcademico {
  id: string;
  codigo: string;
  periodo_id: string;
  periodo_nombre: string;
  docente_id: string;
  docente_nombre: string;
  territorial: string;
  departamento: string;
  
  tipo_vinculacion: string;
  dedicacion_horas: number;
  
  // Componentes
  componente_ensenanza: ComponentePTA;
  componente_investigacion: ComponentePTA;
  componente_extension: ComponentePTA;
  componente_apoyo_institucional: ComponentePTA;
  
  // Estado
  estado: 'borrador' | 'en_revision' | 'ajustes_solicitados' | 'aprobado' | 'ejecutado';
  distribucion_valida: boolean;
  
  // Fechas
  created_at: string;
  fecha_envio?: string;
  fecha_aprobacion?: string;
  
  // Seguimiento
  cumplimiento_global?: number;
}

export interface ComponentePTA {
  horas: number;
  porcentaje: number;
  actividades: ActividadPTA[];
}

export interface ActividadPTA {
  id: string;
  tipo: string;
  descripcion: string;
  horas: number;
  productos_esperados: string[];
}

export const ptasMock: PlanTrabajoAcademico[] = [
  {
    id: 'pta-001',
    codigo: 'PTA-2025-I-001',
    periodo_id: 'per-2025-i',
    periodo_nombre: '2025-I',
    docente_id: 'doc-001',
    docente_nombre: 'Juan Carlos Pérez Gómez',
    territorial: 'Bogotá',
    departamento: 'Derecho Público',
    
    tipo_vinculacion: 'Tiempo Completo',
    dedicacion_horas: 40,
    
    componente_ensenanza: {
      horas: 24,
      porcentaje: 60,
      actividades: [
        {
          id: 'act-001',
          tipo: 'Docencia Directa',
          descripcion: 'Teoría del Estado - Pregrado',
          horas: 8,
          productos_esperados: ['Syllabus actualizado', 'Materiales didácticos', 'Evaluaciones']
        },
        {
          id: 'act-002',
          tipo: 'Docencia Directa',
          descripcion: 'Derecho Administrativo - Maestría',
          horas: 6,
          productos_esperados: ['Syllabus actualizado', 'Casos de estudio']
        },
        {
          id: 'act-003',
          tipo: 'Preparación de clases',
          descripcion: 'Preparación y actualización de contenidos',
          horas: 6,
          productos_esperados: ['Presentaciones', 'Lecturas complementarias']
        },
        {
          id: 'act-004',
          tipo: 'Dirección de trabajos de grado',
          descripcion: 'Tesis de maestría',
          horas: 4,
          productos_esperados: ['Tesis aprobadas (2)']
        }
      ]
    },
    
    componente_investigacion: {
      horas: 8,
      porcentaje: 20,
      actividades: [
        {
          id: 'act-005',
          tipo: 'Proyecto de investigación',
          descripcion: 'Reforma del Estado en Colombia',
          horas: 5,
          productos_esperados: ['Avance del 30%', 'Informe trimestral']
        },
        {
          id: 'act-006',
          tipo: 'Producción académica',
          descripcion: 'Artículo científico',
          horas: 3,
          productos_esperados: ['Artículo sometido a revista indexada']
        }
      ]
    },
    
    componente_extension: {
      horas: 4,
      porcentaje: 10,
      actividades: [
        {
          id: 'act-007',
          tipo: 'Educación continua',
          descripcion: 'Coordinación diplomado Derecho Público',
          horas: 2,
          productos_esperados: ['Diplomado ejecutado']
        },
        {
          id: 'act-008',
          tipo: 'Proyección social',
          descripcion: 'Asesoría a Alcaldía de Soacha',
          horas: 2,
          productos_esperados: ['Concepto jurídico', 'Informe de asesoría']
        }
      ]
    },
    
    componente_apoyo_institucional: {
      horas: 4,
      porcentaje: 10,
      actividades: [
        {
          id: 'act-009',
          tipo: 'Gestión académica',
          descripcion: 'Coordinación del programa de Maestría',
          horas: 2,
          productos_esperados: ['Informe de gestión trimestral']
        },
        {
          id: 'act-010',
          tipo: 'Comités',
          descripcion: 'Comité de autoevaluación',
          horas: 2,
          productos_esperados: ['Actas de reuniones', 'Informes']
        }
      ]
    },
    
    estado: 'aprobado',
    distribucion_valida: true,
    created_at: '2024-12-01T10:00:00Z',
    fecha_envio: '2024-12-05T14:30:00Z',
    fecha_aprobacion: '2024-12-10T09:15:00Z',
    cumplimiento_global: 78
  },
  
  {
    id: 'pta-002',
    codigo: 'PTA-2025-I-002',
    periodo_id: 'per-2025-i',
    periodo_nombre: '2025-I',
    docente_id: 'doc-002',
    docente_nombre: 'María Alejandra López Martínez',
    territorial: 'Bogotá',
    departamento: 'Administración Pública',
    
    tipo_vinculacion: 'Tiempo Completo',
    dedicacion_horas: 40,
    
    componente_ensenanza: {
      horas: 26,
      porcentaje: 65,
      actividades: [
        {
          id: 'act-011',
          tipo: 'Docencia Directa',
          descripcion: 'Políticas Públicas - Pregrado',
          horas: 10,
          productos_esperados: ['Syllabus', 'Evaluaciones']
        },
        {
          id: 'act-012',
          tipo: 'Docencia Directa',
          descripcion: 'Gestión Social - Especialización',
          horas: 8,
          productos_esperados: ['Materiales didácticos']
        },
        {
          id: 'act-013',
          tipo: 'Preparación',
          descripcion: 'Preparación de clases',
          horas: 8,
          productos_esperados: ['Presentaciones actualizadas']
        }
      ]
    },
    
    componente_investigacion: {
      horas: 8,
      porcentaje: 20,
      actividades: [
        {
          id: 'act-014',
          tipo: 'Investigación',
          descripcion: 'Innovación en políticas públicas',
          horas: 8,
          productos_esperados: ['Capítulo de libro']
        }
      ]
    },
    
    componente_extension: {
      horas: 3,
      porcentaje: 7.5,
      actividades: [
        {
          id: 'act-015',
          tipo: 'Eventos',
          descripcion: 'Organización seminario internacional',
          horas: 3,
          productos_esperados: ['Evento realizado']
        }
      ]
    },
    
    componente_apoyo_institucional: {
      horas: 3,
      porcentaje: 7.5,
      actividades: [
        {
          id: 'act-016',
          tipo: 'Representación',
          descripcion: 'Consejo académico',
          horas: 3,
          productos_esperados: ['Actas']
        }
      ]
    },
    
    estado: 'en_revision',
    distribucion_valida: true,
    created_at: '2024-12-03T08:00:00Z',
    fecha_envio: '2024-12-08T16:45:00Z'
  },
  
  {
    id: 'pta-003',
    codigo: 'PTA-2025-I-003',
    periodo_id: 'per-2025-i',
    periodo_nombre: '2025-I',
    docente_id: 'doc-003',
    docente_nombre: 'Carlos Alberto Ruiz Silva',
    territorial: 'Bogotá',
    departamento: 'Economía',
    
    tipo_vinculacion: 'Medio Tiempo',
    dedicacion_horas: 20,
    
    componente_ensenanza: {
      horas: 12,
      porcentaje: 60,
      actividades: [
        {
          id: 'act-017',
          tipo: 'Docencia Directa',
          descripcion: 'Finanzas Públicas - Pregrado',
          horas: 6,
          productos_esperados: ['Syllabus', 'Evaluaciones']
        },
        {
          id: 'act-018',
          tipo: 'Preparación',
          descripcion: 'Preparación de clases',
          horas: 4,
          productos_esperados: ['Materiales']
        },
        {
          id: 'act-019',
          tipo: 'Asesorías',
          descripcion: 'Asesorías a estudiantes',
          horas: 2,
          productos_esperados: ['Registro de asesorías']
        }
      ]
    },
    
    componente_investigacion: {
      horas: 4,
      porcentaje: 20,
      actividades: [
        {
          id: 'act-020',
          tipo: 'Producción académica',
          descripcion: 'Artículo sobre presupuesto territorial',
          horas: 4,
          productos_esperados: ['Artículo']
        }
      ]
    },
    
    componente_extension: {
      horas: 2,
      porcentaje: 10,
      actividades: [
        {
          id: 'act-021',
          tipo: 'Consultoría',
          descripcion: 'Asesoría a municipio',
          horas: 2,
          productos_esperados: ['Informe']
        }
      ]
    },
    
    componente_apoyo_institucional: {
      horas: 2,
      porcentaje: 10,
      actividades: [
        {
          id: 'act-022',
          tipo: 'Comités',
          descripcion: 'Comité curricular',
          horas: 2,
          productos_esperados: ['Actas']
        }
      ]
    },
    
    estado: 'borrador',
    distribucion_valida: true,
    created_at: '2024-12-10T11:00:00Z'
  }
];

// ============================================================
// CONVOCATORIAS DOCENTES
// ============================================================

export interface Convocatoria {
  id: string;
  codigo: string;
  titulo: string;
  tipo: 'Concurso Público' | 'Mérito' | 'Ocasional';
  
  escalafon_requerido: string;
  asignaturas: string[];
  territorial: string;
  tipo_vinculacion: string;
  dedicacion_horas: number;
  remuneracion?: number;
  
  fecha_apertura: string;
  fecha_cierre: string;
  
  estado: 'borrador' | 'publicada' | 'en_proceso' | 'cerrada' | 'cancelada';
  
  candidatos_inscritos: number;
  candidatos_admitidos: number;
}

export const convocatoriasMock: Convocatoria[] = [
  {
    id: 'conv-001',
    codigo: 'CONV-2025-001',
    titulo: 'Convocatoria Docente - Derecho Administrativo',
    tipo: 'Concurso Público',
    
    escalafon_requerido: 'Asociado o superior',
    asignaturas: ['Derecho Administrativo', 'Teoría del Estado'],
    territorial: 'Bogotá',
    tipo_vinculacion: 'Tiempo Completo',
    dedicacion_horas: 40,
    remuneracion: 8500000,
    
    fecha_apertura: '2025-01-15',
    fecha_cierre: '2025-02-15',
    
    estado: 'publicada',
    
    candidatos_inscritos: 12,
    candidatos_admitidos: 10
  },
  
  {
    id: 'conv-002',
    codigo: 'CONV-2025-002',
    titulo: 'Convocatoria Docente Cátedra - Finanzas Territoriales',
    tipo: 'Mérito',
    
    escalafon_requerido: 'Asistente o superior',
    asignaturas: ['Finanzas Territoriales', 'Presupuesto Público'],
    territorial: 'Medellín',
    tipo_vinculacion: 'Cátedra',
    dedicacion_horas: 12,
    remuneracion: 3200000,
    
    fecha_apertura: '2025-01-20',
    fecha_cierre: '2025-02-20',
    
    estado: 'en_proceso',
    
    candidatos_inscritos: 8,
    candidatos_admitidos: 7
  },
  
  {
    id: 'conv-003',
    codigo: 'CONV-2025-003',
    titulo: 'Docente Ocasional - Gestión de Proyectos',
    tipo: 'Ocasional',
    
    escalafon_requerido: 'Auxiliar o superior',
    asignaturas: ['Gestión de Proyectos', 'Planeación Estratégica'],
    territorial: 'Cali',
    tipo_vinculacion: 'Medio Tiempo',
    dedicacion_horas: 20,
    remuneracion: 4500000,
    
    fecha_apertura: '2024-12-01',
    fecha_cierre: '2024-12-31',
    
    estado: 'cerrada',
    
    candidatos_inscritos: 15,
    candidatos_admitidos: 13
  }
];

// ============================================================
// CANDIDATOS A CONVOCATORIAS
// ============================================================

export interface Candidato {
  id: string;
  convocatoria_id: string;
  nombres: string;
  apellidos: string;
  documento: string;
  email: string;
  telefono: string;
  
  formacion_academica: string[];
  experiencia_docente_anos: number;
  
  estado: 'pendiente' | 'admitido' | 'inadmitido' | 'seleccionado';
  puntaje_total?: number;
  ranking?: number;
  
  fecha_inscripcion: string;
}

export const candidatosMock: Candidato[] = [
  {
    id: 'cand-001',
    convocatoria_id: 'conv-001',
    nombres: 'María',
    apellidos: 'González Pérez',
    documento: '52123456',
    email: 'maria.gonzalez@email.com',
    telefono: '3001234567',
    
    formacion_academica: ['Pregrado: Derecho', 'Maestría: Derecho Público', 'Doctorado: Derecho Administrativo'],
    experiencia_docente_anos: 12,
    
    estado: 'admitido',
    puntaje_total: 92.5,
    ranking: 1,
    
    fecha_inscripcion: '2025-01-16T10:30:00Z'
  },
  
  {
    id: 'cand-002',
    convocatoria_id: 'conv-001',
    nombres: 'Carlos',
    apellidos: 'Ruiz Hernández',
    documento: '80234567',
    email: 'carlos.ruiz@email.com',
    telefono: '3109876543',
    
    formacion_academica: ['Pregrado: Derecho', 'Especialización: Derecho Constitucional', 'Maestría: Administración Pública'],
    experiencia_docente_anos: 8,
    
    estado: 'admitido',
    puntaje_total: 88.3,
    ranking: 2,
    
    fecha_inscripcion: '2025-01-17T14:20:00Z'
  },
  
  {
    id: 'cand-003',
    convocatoria_id: 'conv-001',
    nombres: 'Ana',
    apellidos: 'Martínez López',
    documento: '31345678',
    email: 'ana.martinez@email.com',
    telefono: '3158765432',
    
    formacion_academica: ['Pregrado: Derecho', 'Especialización: Derecho Administrativo', 'Maestría: Gestión Pública'],
    experiencia_docente_anos: 10,
    
    estado: 'admitido',
    puntaje_total: 85.7,
    ranking: 3,
    
    fecha_inscripcion: '2025-01-18T09:45:00Z'
  }
];

// ============================================================
// EVALUACIONES DOCENTES
// ============================================================

export interface EvaluacionDocente {
  id: string;
  periodo_evaluacion_id: string;
  periodo_nombre: string;
  docente_id: string;
  docente_nombre: string;
  
  // Puntajes por fuente
  puntaje_autoevaluacion?: number;
  puntaje_pares?: number;
  puntaje_estudiantil?: number;
  puntaje_directiva?: number;
  
  // Resultado final
  puntaje_final?: number;
  clasificacion?: 'Sobresaliente' | 'Satisfactorio' | 'Aceptable' | 'Insuficiente' | 'Deficiente';
  
  // Estado
  completada: boolean;
  fecha_completada?: string;
  
  // Plan de mejoramiento
  requiere_plan_mejoramiento: boolean;
}

export const evaluacionesMock: EvaluacionDocente[] = [
  {
    id: 'eval-001',
    periodo_evaluacion_id: 'per-eval-2024-ii',
    periodo_nombre: '2024-II',
    docente_id: 'doc-001',
    docente_nombre: 'Juan Carlos Pérez Gómez',
    
    puntaje_autoevaluacion: 88,
    puntaje_pares: 84,
    puntaje_estudiantil: 83,
    puntaje_directiva: 90,
    
    puntaje_final: 85.2,
    clasificacion: 'Satisfactorio',
    
    completada: true,
    fecha_completada: '2024-12-15T16:30:00Z',
    
    requiere_plan_mejoramiento: false
  },
  
  {
    id: 'eval-002',
    periodo_evaluacion_id: 'per-eval-2024-ii',
    periodo_nombre: '2024-II',
    docente_id: 'doc-002',
    docente_nombre: 'María Alejandra López Martínez',
    
    puntaje_autoevaluacion: 92,
    puntaje_pares: 90,
    puntaje_estudiantil: 88,
    puntaje_directiva: 95,
    
    puntaje_final: 90.5,
    clasificacion: 'Sobresaliente',
    
    completada: true,
    fecha_completada: '2024-12-14T11:20:00Z',
    
    requiere_plan_mejoramiento: false
  },
  
  {
    id: 'eval-003',
    periodo_evaluacion_id: 'per-eval-2024-ii',
    periodo_nombre: '2024-II',
    docente_id: 'doc-003',
    docente_nombre: 'Carlos Alberto Ruiz Silva',
    
    puntaje_autoevaluacion: 70,
    puntaje_pares: 65,
    puntaje_estudiantil: 68,
    puntaje_directiva: 72,
    
    puntaje_final: 68.3,
    clasificacion: 'Aceptable',
    
    completada: true,
    fecha_completada: '2024-12-16T09:15:00Z',
    
    requiere_plan_mejoramiento: true
  },
  
  {
    id: 'eval-004',
    periodo_evaluacion_id: 'per-eval-2024-ii',
    periodo_nombre: '2024-II',
    docente_id: 'doc-004',
    docente_nombre: 'Ana Patricia González Herrera',
    
    completada: false,
    
    requiere_plan_mejoramiento: false
  }
];

// ============================================================
// PERIODOS ACADÉMICOS
// ============================================================

export const periodosAcademicos = [
  { id: 'per-2024-i', codigo: '2024-I', nombre: 'Primer Semestre 2024', estado: 'cerrado' },
  { id: 'per-2024-ii', codigo: '2024-II', nombre: 'Segundo Semestre 2024', estado: 'activo' },
  { id: 'per-2025-i', codigo: '2025-I', nombre: 'Primer Semestre 2025', estado: 'planificacion' },
  { id: 'per-2025-ii', codigo: '2025-II', nombre: 'Segundo Semestre 2025', estado: 'futuro' }
];

// ============================================================
// ESTADÍSTICAS AGREGADAS
// ============================================================

export const estadisticasModulo = {
  docentes: {
    total: 752,
    activos: 698,
    licencia: 12,
    retirados: 42,
    por_vinculacion: {
      tiempo_completo: 198,
      medio_tiempo: 109,
      catedra: 391,
      hora_catedra: 54
    },
    por_escalafon: {
      titular: 45,
      asociado: 156,
      asistente: 298,
      auxiliar: 253
    },
    por_territorial_top5: [
      { territorial: 'Bogotá', cantidad: 235 },
      { territorial: 'Antioquia', cantidad: 87 },
      { territorial: 'Valle del Cauca', cantidad: 65 },
      { territorial: 'Atlántico', cantidad: 52 },
      { territorial: 'Santander', cantidad: 48 }
    ]
  },
  
  ptas: {
    periodo_actual: '2025-I',
    total: 145,
    aprobados: 104,
    en_revision: 26,
    pendientes: 15,
    cumplimiento_promedio: 78.5
  },
  
  convocatorias: {
    abiertas: 3,
    en_proceso: 2,
    cerradas_ultimo_año: 18,
    candidatos_totales: 247,
    tasa_exito: 6.5 // % de candidatos seleccionados
  },
  
  evaluaciones: {
    periodo_actual: '2024-II',
    completadas: 598,
    pendientes: 154,
    promedio_institucional: 84.2,
    distribucion: {
      sobresaliente: 112,
      satisfactorio: 512,
      aceptable: 90,
      insuficiente: 30,
      deficiente: 8
    },
    planes_mejoramiento_activos: 38
  }
};

// ============================================================
// EXPORT DEFAULT
// ============================================================

export default {
  ptas: ptasMock,
  convocatorias: convocatoriasMock,
  candidatos: candidatosMock,
  evaluaciones: evaluacionesMock,
  periodos: periodosAcademicos,
  estadisticas: estadisticasModulo
};
