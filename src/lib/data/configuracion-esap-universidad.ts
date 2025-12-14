/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * CONFIGURACIÓN ESPECÍFICA ESAP - INSTITUCIÓN DE EDUCACIÓN SUPERIOR
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * Personalización del MRAE v3.0 MinTIC para Universidades
 * Escuela Superior de Administración Pública - ESAP
 * 
 * CONTEXTO UNIVERSITARIO:
 * - Institución de educación superior pública
 * - 1 Sede Nacional + 17 Direcciones Territoriales + 307 CETAPs
 * - Programas académicos: Pregrado, Especialización, Maestría, Doctorado
 * - Usuarios: Estudiantes, Docentes, Administrativos, Graduados, Aspirantes
 * - Procesos misionales: Docencia, Investigación, Extensión, Bienestar
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONTEXTO INSTITUCIONAL ESAP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const CONTEXTO_ESAP = {
  tipoInstitucion: 'Universidad Pública',
  nombreCompleto: 'Escuela Superior de Administración Pública',
  sigla: 'ESAP',
  sector: 'Educación Superior',
  naturaleza: 'Institución de Educación Superior Pública',
  
  // Estructura Organizacional
  estructura: {
    nacional: {
      nombre: 'Sede Nacional - Bogotá',
      tipo: 'Sede Central'
    },
    territoriales: 17,
    cetaps: 307,
    totalSedes: 325
  },
  
  // Población Universitaria
  poblacion: {
    estudiantes: 45000,
    docentes: 2500,
    administrativos: 800,
    graduados: 120000
  },
  
  // Procesos Misionales
  procesosMisionales: [
    'Docencia (Pregrado y Posgrado)',
    'Investigación',
    'Extensión y Proyección Social',
    'Bienestar Universitario',
    'Internacionalización'
  ],
  
  // Sistemas Académicos
  sistemasAcademicos: [
    'Sistema de Gestión Académica',
    'Sistema de Registro y Matrículas',
    'Sistema de Calificaciones',
    'Sistema de Certificados',
    'Sistema de Graduados',
    'Plataforma LMS (Moodle)',
    'Sistema de Biblioteca',
    'Portal Estudiantil',
    'Portal Docente'
  ],
  
  // Sistemas Administrativos
  sistemasAdministrativos: [
    'Sistema de Gestión Humana',
    'Sistema Financiero',
    'Sistema de Contratación',
    'Sistema de Inventarios',
    'Sistema de Correspondencia',
    'Sistema de Archivo Digital'
  ]
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ADAPTACIÓN DE DOMINIOS AL CONTEXTO UNIVERSITARIO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const DOMINIOS_UNIVERSITARIOS = {
  // MAE - Modelo de Arquitectura Empresarial
  mae: {
    estrategia: {
      nombre: 'Estrategia Institucional',
      descripcion: 'Plan de Desarrollo Institucional, Plan Estratégico de TI Educativo',
      ejemplos: [
        'Plan de Desarrollo ESAP 2024-2028',
        'Plan Estratégico de Transformación Digital Académica',
        'Política de Calidad Educativa',
        'Objetivos de Desarrollo Sostenible en Educación'
      ]
    },
    
    misional: {
      nombre: 'Procesos Misionales Académicos',
      descripcion: 'Docencia, Investigación, Extensión, Bienestar',
      ejemplos: [
        'Gestión de Programas Académicos',
        'Proceso de Admisiones y Matrículas',
        'Gestión de Calificaciones y Evaluación',
        'Proceso de Grado y Titulación',
        'Gestión de Investigación',
        'Extensión y Proyección Social',
        'Bienestar Universitario'
      ]
    },
    
    apoyo: {
      nombre: 'Procesos de Apoyo Universitario',
      descripcion: 'Servicios administrativos que soportan la academia',
      ejemplos: [
        'Gestión Humana (Docentes y Administrativos)',
        'Gestión Financiera',
        'Gestión de Biblioteca',
        'Gestión de Infraestructura',
        'Gestión de Tecnología Educativa',
        'Servicios Estudiantiles'
      ]
    }
  },
  
  // MGGTI - Modelo de Gestión de TI
  mggti: {
    sistemas: {
      nombre: 'Sistemas de Información Académica',
      descripcion: 'Plataformas tecnológicas para gestión universitaria',
      ejemplos: [
        'Sistema de Gestión Académica (SGA)',
        'Plataforma LMS Moodle',
        'Sistema de Registro y Matrículas',
        'Sistema de Certificados Académicos',
        'Portal Estudiantil Transaccional',
        'Sistema de Graduados y Alumni',
        'Sistema de Biblioteca Digital',
        'Sistema de Gestión de Investigación'
      ]
    },
    
    infraestructura: {
      nombre: 'Infraestructura Tecnológica Educativa',
      descripcion: 'Infraestructura para soporte académico y administrativo',
      ejemplos: [
        'Aulas Virtuales',
        'Servidores para Plataformas Educativas',
        'Red de Campus Universitario',
        'WiFi Estudiantil',
        'Laboratorios de Cómputo',
        'Salas de Videoconferencia',
        'Centro de Datos Institucional'
      ]
    },
    
    seguridad: {
      nombre: 'Seguridad de Información Académica',
      descripcion: 'Protección de datos de estudiantes, docentes y procesos académicos',
      ejemplos: [
        'Protección de Datos Personales (Ley 1581)',
        'Seguridad de Historiales Académicos',
        'Protección de Propiedad Intelectual',
        'Control de Acceso a Plataformas',
        'Backup de Calificaciones',
        'Seguridad en Pagos en Línea'
      ]
    }
  },
  
  // MGPTI - Modelo de Gestión de Proyectos de TI
  mgpti: {
    proyectos: {
      nombre: 'Proyectos de Transformación Digital Académica',
      descripcion: 'Iniciativas tecnológicas para mejorar procesos universitarios',
      ejemplos: [
        'Implementación de Portal Transaccional Estudiantil',
        'Digitalización de Certificados Académicos',
        'Modernización del Sistema de Matrículas',
        'Implementación de Analytics Académico',
        'Desarrollo de App Móvil Estudiantil',
        'Renovación de Infraestructura de Aulas'
      ]
    }
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EVIDENCIAS ESPECÍFICAS PARA UNIVERSIDADES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const EVIDENCIAS_UNIVERSITARIAS = {
  estrategicas: [
    {
      id: 'PDI',
      nombre: 'Plan de Desarrollo Institucional',
      descripcion: 'Plan estratégico de la universidad (4-5 años)',
      ejemplo: 'PDI ESAP 2024-2028.pdf'
    },
    {
      id: 'PETI',
      nombre: 'Plan Estratégico de Tecnologías de Información',
      descripcion: 'PETI enfocado en transformación digital académica',
      ejemplo: 'PETI_Educativo_ESAP_2024-2027.pdf'
    },
    {
      id: 'PEP',
      nombre: 'Proyecto Educativo del Programa (PEP)',
      descripcion: 'Documento de cada programa académico',
      ejemplo: 'PEP_Administracion_Publica.pdf'
    },
    {
      id: 'PEI',
      nombre: 'Proyecto Educativo Institucional (PEI)',
      descripcion: 'Identidad y propósito formativo de ESAP',
      ejemplo: 'PEI_ESAP_2024.pdf'
    }
  ],
  
  academicas: [
    {
      id: 'REGACAD',
      nombre: 'Reglamento Académico',
      descripcion: 'Normas que rigen los procesos académicos',
      ejemplo: 'Reglamento_Academico_ESAP.pdf'
    },
    {
      id: 'REGDOC',
      nombre: 'Reglamento Docente',
      descripcion: 'Normas de vinculación y evaluación docente',
      ejemplo: 'Reglamento_Docente_ESAP.pdf'
    },
    {
      id: 'REGMAT',
      nombre: 'Procedimiento de Matrículas',
      descripcion: 'Proceso documentado de inscripción y matrícula',
      ejemplo: 'Procedimiento_Matriculas_2025.pdf'
    },
    {
      id: 'REGGRA',
      nombre: 'Procedimiento de Grados',
      descripcion: 'Proceso de obtención de título profesional',
      ejemplo: 'Procedimiento_Grados_ESAP.pdf'
    },
    {
      id: 'CERTIF',
      nombre: 'Certificados Académicos',
      descripcion: 'Plantillas de certificados y notas',
      ejemplo: 'Plantilla_Certificado_Notas.docx'
    }
  ],
  
  tecnologicas: [
    {
      id: 'ARQTI',
      nombre: 'Arquitectura de Sistemas Académicos',
      descripcion: 'Diagrama de sistemas de información académica',
      ejemplo: 'Arquitectura_SGA_ESAP.pdf'
    },
    {
      id: 'DIARED',
      nombre: 'Diagrama de Red Universitaria',
      descripcion: 'Topología de red del campus',
      ejemplo: 'Diagrama_Red_Campus_ESAP.pdf'
    },
    {
      id: 'MANUAL',
      nombre: 'Manuales de Usuario',
      descripcion: 'Guías para estudiantes y docentes',
      ejemplo: 'Manual_Portal_Estudiantil.pdf'
    },
    {
      id: 'BACKUP',
      nombre: 'Política de Backup Académico',
      descripcion: 'Respaldo de historiales académicos',
      ejemplo: 'Politica_Backup_Calificaciones.pdf'
    }
  ],
  
  seguridad: [
    {
      id: 'POLSEG',
      nombre: 'Política de Seguridad de la Información',
      descripcion: 'Protección de datos de la comunidad universitaria',
      ejemplo: 'Politica_Seguridad_ESAP.pdf'
    },
    {
      id: 'HABEAS',
      nombre: 'Política de Habeas Data',
      descripcion: 'Protección de datos personales (Ley 1581)',
      ejemplo: 'Politica_Habeas_Data_ESAP.pdf'
    },
    {
      id: 'MATRIX',
      nombre: 'Matriz de Roles y Accesos',
      descripcion: 'Control de acceso por perfil (estudiante, docente, admin)',
      ejemplo: 'Matriz_Accesos_Sistemas_ESAP.xlsx'
    },
    {
      id: 'INCIDEN',
      nombre: 'Registro de Incidentes de Seguridad',
      descripcion: 'Log de incidentes y respuesta',
      ejemplo: 'Registro_Incidentes_2024.xlsx'
    }
  ],
  
  cumplimiento: [
    {
      id: 'ACRED',
      nombre: 'Acreditación de Alta Calidad',
      descripcion: 'Certificados de acreditación de programas (CNA)',
      ejemplo: 'Acreditacion_CNA_Programa.pdf'
    },
    {
      id: 'REGCAL',
      nombre: 'Registro Calificado',
      descripcion: 'Registro calificado de programas académicos (MEN)',
      ejemplo: 'Registro_Calificado_MEN.pdf'
    },
    {
      id: 'LICEN',
      nombre: 'Licencias de Software Educativo',
      descripcion: 'Licenciamiento de plataformas académicas',
      ejemplo: 'Licencias_Moodle_Office365.pdf'
    },
    {
      id: 'NORISO',
      nombre: 'Certificación ISO (si aplica)',
      descripcion: 'ISO 9001, ISO 27001 para educación',
      ejemplo: 'Certificado_ISO9001_ESAP.pdf'
    }
  ]
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RESPONSABLES POR ROL UNIVERSITARIO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const RESPONSABLES_UNIVERSITARIOS = {
  estrategico: [
    { rol: 'Rector', area: 'Rectoría', responsabilidad: 'Aprobación estratégica' },
    { rol: 'Vicerrector Académico', area: 'Vicerrectoría Académica', responsabilidad: 'Procesos académicos' },
    { rol: 'Vicerrector Administrativo', area: 'Vicerrectoría Administrativa', responsabilidad: 'Procesos administrativos' }
  ],
  
  academico: [
    { rol: 'Decano', area: 'Facultad', responsabilidad: 'Gestión académica de facultad' },
    { rol: 'Director de Programa', area: 'Programa Académico', responsabilidad: 'Gestión de programa' },
    { rol: 'Director de Registro', area: 'Registro y Control Académico', responsabilidad: 'Matrículas, calificaciones, certificados' },
    { rol: 'Director de Biblioteca', area: 'Biblioteca', responsabilidad: 'Servicios bibliotecarios' },
    { rol: 'Director de Investigación', area: 'Investigación', responsabilidad: 'Gestión de investigación' }
  ],
  
  tecnologico: [
    { rol: 'Director de TI', area: 'Dirección de Tecnología', responsabilidad: 'Estrategia tecnológica' },
    { rol: 'Arquitecto TI', area: 'Arquitectura Empresarial', responsabilidad: 'Arquitectura y estándares' },
    { rol: 'Coordinador SGA', area: 'Sistemas Académicos', responsabilidad: 'Sistema de Gestión Académica' },
    { rol: 'Coordinador LMS', area: 'Educación Virtual', responsabilidad: 'Plataforma Moodle' },
    { rol: 'Administrador de Red', area: 'Infraestructura', responsabilidad: 'Red y conectividad' },
    { rol: 'CISO', area: 'Seguridad de la Información', responsabilidad: 'Ciberseguridad' }
  ],
  
  calidad: [
    { rol: 'Director de Autoevaluación', area: 'Aseguramiento de Calidad', responsabilidad: 'Acreditación' },
    { rol: 'Auditor Interno', area: 'Control Interno', responsabilidad: 'Auditoría de procesos' }
  ]
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INDICADORES UNIVERSITARIOS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const INDICADORES_UNIVERSITARIOS = {
  academicos: [
    { id: 'TASA_GRAD', nombre: 'Tasa de Graduación', meta: '≥85%', formula: 'Graduados / Matriculados' },
    { id: 'TASA_DESER', nombre: 'Tasa de Deserción', meta: '≤10%', formula: 'Desertores / Matriculados' },
    { id: 'SATISF_EST', nombre: 'Satisfacción Estudiantil', meta: '≥4.0/5.0', formula: 'Promedio encuestas' },
    { id: 'EMPLEA', nombre: 'Empleabilidad Graduados', meta: '≥75%', formula: 'Empleados / Graduados' }
  ],
  
  tecnologicos: [
    { id: 'DISP_SGA', nombre: 'Disponibilidad SGA', meta: '≥99.5%', formula: 'Uptime del sistema' },
    { id: 'ADOPT_LMS', nombre: 'Adopción LMS', meta: '≥80%', formula: 'Docentes activos / Total docentes' },
    { id: 'INCID_TI', nombre: 'Incidentes TI', meta: '≤50/mes', formula: 'Tickets críticos resueltos' },
    { id: 'TIEMPO_RESP', nombre: 'Tiempo Respuesta Mesa Ayuda', meta: '≤4 horas', formula: 'Promedio resolución' }
  ],
  
  cumplimiento: [
    { id: 'ACRED_PROG', nombre: 'Programas Acreditados', meta: '100%', formula: 'Acreditados / Total programas' },
    { id: 'CUMP_MRAE', nombre: 'Cumplimiento MRAE', meta: '≥80%', formula: 'Lineamientos cumplidos / 106' },
    { id: 'CUMP_ISO', nombre: 'Cumplimiento ISO', meta: '≥95%', formula: 'Requisitos cumplidos' }
  ]
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CASOS DE USO UNIVERSITARIOS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const CASOS_USO_UNIVERSITARIOS = [
  {
    id: 'UC-001',
    nombre: 'Matrícula en Línea',
    descripcion: 'Estudiante realiza matrícula desde el portal',
    actores: ['Estudiante', 'Sistema de Matrículas', 'Pasarela de Pagos'],
    flujo: [
      '1. Estudiante ingresa al portal',
      '2. Consulta oferta académica',
      '3. Selecciona asignaturas',
      '4. Realiza pago en línea',
      '5. Sistema genera recibo',
      '6. Estudiante descarga certificado de matrícula'
    ],
    lineamientos: ['MAE.LI.NE.03', 'MGGTI.LI.GAN.01', 'MGGTI.LI.GAN.04']
  },
  {
    id: 'UC-002',
    nombre: 'Consulta de Calificaciones',
    descripcion: 'Estudiante consulta sus notas en tiempo real',
    actores: ['Estudiante', 'Docente', 'Sistema Académico'],
    flujo: [
      '1. Docente ingresa calificaciones al SGA',
      '2. Sistema valida y almacena',
      '3. Estudiante ingresa al portal',
      '4. Consulta notas por asignatura',
      '5. Descarga certificado de notas'
    ],
    lineamientos: ['MAE.LI.NE.02', 'MGGTI.LI.GAN.03', 'MGGTI.LI.SI.02']
  },
  {
    id: 'UC-003',
    nombre: 'Solicitud de Certificado Académico',
    descripcion: 'Graduado solicita certificado de título',
    actores: ['Graduado', 'Registro y Control', 'Sistema de Certificados'],
    flujo: [
      '1. Graduado solicita certificado en línea',
      '2. Sistema valida identidad',
      '3. Registro valida historial académico',
      '4. Sistema genera certificado digital',
      '5. Se envía por correo con código QR verificable'
    ],
    lineamientos: ['MAE.LI.NE.04', 'MGGTI.LI.GAN.02', 'MGGTI.LI.SI.05']
  }
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RIESGOS ESPECÍFICOS UNIVERSITARIOS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const RIESGOS_UNIVERSITARIOS = [
  {
    id: 'R-001',
    categoria: 'Académico',
    nombre: 'Pérdida de Historiales Académicos',
    descripcion: 'Pérdida de datos de calificaciones por fallo de sistema',
    impacto: 'Crítico',
    probabilidad: 'Baja',
    mitigacion: 'Backup diario de base de datos académica',
    lineamiento: 'MGGTI.LI.GAN.06'
  },
  {
    id: 'R-002',
    categoria: 'Tecnológico',
    nombre: 'Caída del Sistema en Periodo de Matrículas',
    descripcion: 'Indisponibilidad del SGA en fechas críticas',
    impacto: 'Alto',
    probabilidad: 'Media',
    mitigacion: 'Escalamiento de infraestructura temporal',
    lineamiento: 'MGGTI.LI.GAN.03'
  },
  {
    id: 'R-003',
    categoria: 'Seguridad',
    nombre: 'Acceso No Autorizado a Notas',
    descripcion: 'Hackeo de cuentas docentes para modificar calificaciones',
    impacto: 'Crítico',
    probabilidad: 'Media',
    mitigacion: 'Autenticación multifactor (2FA) para docentes',
    lineamiento: 'MGGTI.LI.SI.01'
  },
  {
    id: 'R-004',
    categoria: 'Cumplimiento',
    nombre: 'Pérdida de Acreditación de Programas',
    descripcion: 'Incumplimiento de requisitos del CNA',
    impacto: 'Crítico',
    probabilidad: 'Baja',
    mitigacion: 'Auditorías internas trimestrales',
    lineamiento: 'MAE.LI.AL.01'
  },
  {
    id: 'R-005',
    categoria: 'Operacional',
    nombre: 'Bajo Uso de Plataforma LMS',
    descripcion: 'Docentes no adoptan herramientas virtuales',
    impacto: 'Medio',
    probabilidad: 'Media',
    mitigacion: 'Capacitación docente continua',
    lineamiento: 'MGGTI.LI.RH.01'
  }
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GLOSARIO UNIVERSITARIO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const GLOSARIO_UNIVERSITARIO = {
  'SGA': 'Sistema de Gestión Académica - Plataforma central para administrar procesos académicos',
  'LMS': 'Learning Management System - Plataforma de educación virtual (Moodle)',
  'CNA': 'Consejo Nacional de Acreditación - Organismo que acredita programas académicos',
  'MEN': 'Ministerio de Educación Nacional - Regula la educación superior en Colombia',
  'SNIES': 'Sistema Nacional de Información de la Educación Superior',
  'PEI': 'Proyecto Educativo Institucional - Documento identitario de la universidad',
  'PEP': 'Proyecto Educativo del Programa - Documento de cada programa académico',
  'Crédito Académico': 'Unidad de medida del trabajo académico (1 crédito = 48 horas)',
  'Registro Calificado': 'Autorización del MEN para ofrecer un programa académico',
  'Acreditación de Alta Calidad': 'Reconocimiento de excelencia otorgado por el CNA',
  'CETAP': 'Centro Territorial de Administración Pública - Sedes regionales de ESAP',
  'Homologación': 'Reconocimiento de asignaturas cursadas en otra institución',
  'Reglamento Académico': 'Normas que rigen la vida académica de estudiantes',
  'Consejo Académico': 'Órgano de gobierno para decisiones académicas',
  'Consejo Directivo': 'Máximo órgano de gobierno de la universidad'
};

export default {
  CONTEXTO_ESAP,
  DOMINIOS_UNIVERSITARIOS,
  EVIDENCIAS_UNIVERSITARIAS,
  RESPONSABLES_UNIVERSITARIOS,
  INDICADORES_UNIVERSITARIOS,
  CASOS_USO_UNIVERSITARIOS,
  RIESGOS_UNIVERSITARIOS,
  GLOSARIO_UNIVERSITARIO
};
