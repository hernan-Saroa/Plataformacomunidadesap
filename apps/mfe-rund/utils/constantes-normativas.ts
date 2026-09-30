/**
 * ============================================
 * CONSTANTES NORMATIVAS - MÓDULO OCIG
 * ============================================
 * 
 * Centraliza TODAS las constantes normativas según:
 * - Decreto 648/2017 (Control Interno)
 * - EM-PT-004 (Procedimiento Auditorías)
 * - EM-PT-002 (Planes de Mejoramiento)
 * - EM-FO-001 y EM-FO-002 (Formatos)
 * - Guía DAFP (Auditoría Interna v6)
 * - Ley 1581/2012 (Protección de Datos)
 * 
 * FECHA: 30 Enero 2025
 * VERSIÓN: 1.0
 */

// ============================================
// COLORES CORPORATIVOS ESAP
// ============================================

export const COLORES_ESAP = {
  // Azules principales
  AZUL_PRINCIPAL: '#2962FF',
  AZUL_OSCURO: '#003DA5',
  AZUL_CLARO: '#E0EDFF',
  
  // Naranja
  NARANJA: '#F57C00',
  NARANJA_CLARO: '#FFE0B2',
  
  // Estados Kanban
  BACKLOG: '#E8F4F8',
  PLANEACION: '#FEF9E7',
  EJECUCION: '#D4EFDF',
  COMUNICACION: '#FADBD8',
  CERRADO: '#D5D8DC',
  
  // Semáforos
  VERDE: '#10B981',
  AMARILLO: '#F59E0B',
  ROJO: '#EF4444',
  
  // Neutrales
  GRIS_100: '#F3F4F6',
  GRIS_200: '#E5E7EB',
  GRIS_300: '#D1D5DB',
  GRIS_400: '#9CA3AF',
  GRIS_500: '#6B7280',
  GRIS_600: '#4B5563',
  GRIS_700: '#374151',
  GRIS_800: '#1F2937',
  GRIS_900: '#111827'
} as const;

// ============================================
// DECRETO 648/2017 - CONTROL INTERNO
// ============================================

export const DECRETO_648 = {
  NUMERO_ROLES_REQUERIDOS: 5,
  ROLES: [
    {
      id: 'rol_1',
      numero: 1,
      nombre: 'Liderazgo Estratégico',
      descripcion: 'Dirección Nacional + Jefe OCI',
      articulo: 'Art. 2',
      color: '#1B4F72'
    },
    {
      id: 'rol_2',
      numero: 2,
      nombre: 'Enfoque hacia la Prevención',
      descripcion: 'Diseño + implantación de controles',
      articulo: 'Art. 3',
      color: '#117A65'
    },
    {
      id: 'rol_3',
      numero: 3,
      nombre: 'Relación con Entes de Control',
      descripcion: 'Coordinación con CGR, MECI',
      articulo: 'Art. 4',
      color: '#7D3C98'
    },
    {
      id: 'rol_4',
      numero: 4,
      nombre: 'Evaluación de la Gestión del Riesgo',
      descripcion: 'Identificación + evaluación de riesgos',
      articulo: 'Art. 5',
      color: '#D68910'
    },
    {
      id: 'rol_5',
      numero: 5,
      nombre: 'Evaluación y Seguimiento',
      descripcion: 'Monitoreo + efectividad de controles',
      articulo: 'Art. 6',
      color: '#C0392B'
    }
  ]
} as const;

// ============================================
// EM-PT-004 - DURACIONES DE AUDITORÍA
// ============================================

export const DURACIONES_AUDITORIA = {
  SEDE_CENTRAL: {
    PLANEACION: {
      MIN_DIAS: 5,
      MAX_DIAS: 10,
      RECOMENDADO_DIAS: 7,
      UNIDAD: 'días hábiles'
    },
    EJECUCION: {
      MIN_DIAS: 10,
      MAX_DIAS: 30,
      RECOMENDADO_DIAS: 15,
      UNIDAD: 'días hábiles'
    },
    COMUNICACION: {
      MIN_DIAS: 10,
      MAX_DIAS: 15,
      RECOMENDADO_DIAS: 12,
      UNIDAD: 'días hábiles'
    }
  },
  TERRITORIAL: {
    PLANEACION: {
      DIAS: 3,
      FIJO: true,
      UNIDAD: 'días hábiles'
    },
    EJECUCION: {
      DIAS: 4,
      FIJO: true, // ⚠️ CRÍTICO: SIEMPRE 4 DÍAS
      UNIDAD: 'días hábiles'
    },
    COMUNICACION: {
      DIAS: 2,
      FIJO: true,
      UNIDAD: 'días hábiles'
    }
  }
} as const;

// ============================================
// EM-PT-002 - SEGUIMIENTO TRIMESTRAL
// ============================================

export const SEGUIMIENTO_TRIMESTRAL = {
  PERIODICIDAD: [
    {
      numero: 1,
      mes: 'JULIO',
      trimestre: 'Q3',
      fechaCorte: '07-31',
      fechaEntrega: '08-07',
      diasEntrega: 7
    },
    {
      numero: 2,
      mes: 'OCTUBRE',
      trimestre: 'Q4',
      fechaCorte: '10-31',
      fechaEntrega: '11-07',
      diasEntrega: 7
    },
    {
      numero: 3,
      mes: 'ENERO',
      trimestre: 'Q1',
      fechaCorte: '01-31',
      fechaEntrega: '02-07',
      diasEntrega: 7
    },
    {
      numero: 4,
      mes: 'ABRIL',
      trimestre: 'Q2',
      fechaCorte: '04-30',
      fechaEntrega: '05-07',
      diasEntrega: 7
    }
  ],
  ALERTAS: {
    RECORDATORIO_DIAS_PREVIOS: 7,
    ALERTA_VENCIMIENTO_DIAS: 0,
    ESCALAMIENTO_DIAS_POSTERIORES: 3,
    CIERRE_AUTOMATICO_DIAS: 7
  }
} as const;

// ============================================
// EM-FO-002 - VALORES DE CUMPLIMIENTO
// ============================================

export const VALORES_CUMPLIMIENTO = {
  COMPLETO: {
    valor: 2,
    nombre: 'Completo',
    descripcion: '100% - Cantidad implementada >= Cantidad programada',
    color: COLORES_ESAP.VERDE,
    icono: 'CheckCircle'
  },
  PARCIAL: {
    valor: 1,
    nombre: 'Parcial',
    descripcion: '1-99% - Al menos 1 implementada pero < programada',
    color: COLORES_ESAP.AMARILLO,
    icono: 'Clock'
  },
  PENDIENTE: {
    valor: 0,
    nombre: 'Pendiente',
    descripcion: '0% - Sin implementación',
    color: COLORES_ESAP.ROJO,
    icono: 'AlertCircle'
  }
} as const;

export const VALORES_EFECTIVIDAD = {
  EFECTIVA: {
    valor: 2,
    nombre: 'Efectiva',
    descripcion: 'Controles aplicados Y situación no se repitió',
    color: COLORES_ESAP.VERDE
  },
  PARCIAL: {
    valor: 1,
    nombre: 'Parcialmente Efectiva',
    descripcion: 'Solo uno de los dos criterios cumplido',
    color: COLORES_ESAP.AMARILLO
  },
  INEFECTIVA: {
    valor: 0,
    nombre: 'Inefectiva',
    descripcion: 'Ninguno de los criterios cumplido',
    color: COLORES_ESAP.ROJO
  }
} as const;

// ============================================
// SEMÁFOROS DE CUMPLIMIENTO
// ============================================

export const SEMAFOROS = {
  VERDE: {
    nombre: 'Verde',
    porcentajeMin: 80,
    porcentajeMax: 100,
    color: COLORES_ESAP.VERDE,
    descripcion: 'Cumplimiento satisfactorio (80-100%)',
    emoji: '🟢'
  },
  AMARILLO: {
    nombre: 'Amarillo',
    porcentajeMin: 50,
    porcentajeMax: 79,
    color: COLORES_ESAP.AMARILLO,
    descripcion: 'Cumplimiento parcial (50-79%)',
    emoji: '🟡'
  },
  ROJO: {
    nombre: 'Rojo',
    porcentajeMin: 0,
    porcentajeMax: 49,
    color: COLORES_ESAP.ROJO,
    descripcion: 'Cumplimiento bajo (0-49%)',
    emoji: '🔴'
  }
} as const;

// ============================================
// GUÍA DAFP - PRIORIZACIÓN DE RIESGOS
// ============================================

export const DAFP_RIESGOS = {
  CRITICIDAD: {
    ALTO: { valor: 5, nombre: 'Alto', descripcion: 'Impacto crítico en la entidad' },
    MEDIO: { valor: 3, nombre: 'Medio', descripcion: 'Impacto moderado' },
    BAJO: { valor: 1, nombre: 'Bajo', descripcion: 'Impacto menor' }
  },
  EXPOSICION: {
    MAS_100_MILLONES: { valor: 5, nombre: '>$100M', descripcion: 'Más de $100 millones' },
    ENTRE_50_100_MILLONES: { valor: 3, nombre: '$50M-$100M', descripcion: 'Entre $50 y $100 millones' },
    MENOS_50_MILLONES: { valor: 1, nombre: '<$50M', descripcion: 'Menos de $50 millones' }
  },
  CLASIFICACION: {
    EXTREMO: { nombre: 'Extremo', valorMin: 16, color: '#B71C1C', frecuenciaAños: 1 },
    ALTO: { nombre: 'Alto', valorMin: 11, valorMax: 15, color: '#D32F2F', frecuenciaAños: 2 },
    MODERADO: { nombre: 'Moderado', valorMin: 5, valorMax: 10, color: '#F57C00', frecuenciaAños: 3 },
    BAJO: { nombre: 'Bajo', valorMax: 4, color: '#388E3C', frecuenciaAños: 4 }
  }
} as const;

// ============================================
// PLAN DE ROTACIÓN DE AUDITORÍAS
// ============================================

export const PLAN_ROTACION = {
  FRECUENCIAS: {
    EXTREMO: {
      ADECUADO: 1,
      INADECUADO: 1
    },
    ALTO: {
      ADECUADO: 2,
      INADECUADO: 1
    },
    MODERADO: {
      ADECUADO: 3,
      INADECUADO: 2
    },
    BAJO: {
      ADECUADO: 4,
      INADECUADO: 3
    }
  }
} as const;

// ============================================
// TIPOS DE HALLAZGOS
// ============================================

export const TIPOS_HALLAZGO = {
  HALLAZGO: {
    nombre: 'Hallazgo',
    descripcion: 'Incumplimiento normativo o de procedimiento',
    color: COLORES_ESAP.ROJO,
    severidad: 'ALTA',
    requierePlanMejora: true,
    icono: 'AlertTriangle'
  },
  OBSERVACION: {
    nombre: 'Observación',
    descripcion: 'Tendencia negativa o situación por mejorar',
    color: COLORES_ESAP.AMARILLO,
    severidad: 'MEDIA',
    requierePlanMejora: false,
    icono: 'Eye'
  },
  RECOMENDACION: {
    nombre: 'Recomendación',
    descripcion: 'Oportunidad de mejora detectada',
    color: COLORES_ESAP.AZUL_PRINCIPAL,
    severidad: 'BAJA',
    requierePlanMejora: false,
    icono: 'Lightbulb'
  }
} as const;

// ============================================
// ESTADOS DE AUDITORÍA
// ============================================

export const ESTADOS_AUDITORIA = {
  BACKLOG: {
    nombre: 'Backlog',
    descripcion: 'Auditorías programadas en PAI',
    color: COLORES_ESAP.BACKLOG,
    orden: 1,
    siguientes: ['PLANEACION']
  },
  PLANEACION: {
    nombre: 'Planeación',
    descripcion: 'Elaboración Plan de Trabajo',
    color: COLORES_ESAP.PLANEACION,
    orden: 2,
    siguientes: ['EJECUCION', 'BACKLOG']
  },
  EJECUCION: {
    nombre: 'Ejecución',
    descripcion: 'Pruebas y recopilación evidencias',
    color: COLORES_ESAP.EJECUCION,
    orden: 3,
    siguientes: ['COMUNICACION', 'PLANEACION']
  },
  COMUNICACION: {
    nombre: 'Comunicación',
    descripcion: 'Generación informe y socialización',
    color: COLORES_ESAP.COMUNICACION,
    orden: 4,
    siguientes: ['CERRADO', 'EJECUCION']
  },
  CERRADO: {
    nombre: 'Cerrado',
    descripcion: 'Auditoría finalizada y archivada',
    color: COLORES_ESAP.CERRADO,
    orden: 5,
    siguientes: []
  }
} as const;

// ============================================
// PROCESOS AUDITABLES ESAP
// ============================================

export const PROCESOS_AUDITABLES = {
  SEDE_CENTRAL: [
    { id: 'proc_01', nombre: 'Gestión Financiera', criticidad: 'ALTO' },
    { id: 'proc_02', nombre: 'Gestión Administrativa', criticidad: 'ALTO' },
    { id: 'proc_03', nombre: 'Formación para la Vida / Gestión Programas Académicos', criticidad: 'ALTO' },
    { id: 'proc_04', nombre: 'Adquisición de Bienes y Servicios', criticidad: 'ALTO' },
    { id: 'proc_05', nombre: 'Gestión del Talento Humano / Gestión Profesoral', criticidad: 'MEDIO' },
    { id: 'proc_06', nombre: 'Efectividad Institucional', criticidad: 'MEDIO' },
    { id: 'proc_07', nombre: 'Evaluación Control y Mejora (OCID)', criticidad: 'MEDIO' },
    { id: 'proc_08', nombre: 'Modelo Seguridad y Privacidad de la Información', criticidad: 'ALTO' },
    { id: 'proc_09', nombre: 'Transformación Digital', criticidad: 'MEDIO' }
  ],
  TERRITORIALES: [
    { id: 'ter_01', nombre: 'Antioquia', cobertura: ['Antioquia'] },
    { id: 'ter_02', nombre: 'Atlántico', cobertura: ['Atlántico', 'Cesar', 'Magdalena', 'La Guajira'] },
    { id: 'ter_03', nombre: 'Bolívar', cobertura: ['Bolívar', 'Córdoba', 'Sucre', 'San Andrés'] },
    { id: 'ter_04', nombre: 'Caldas', cobertura: ['Caldas'] },
    { id: 'ter_05', nombre: 'Cundinamarca', cobertura: ['Cundinamarca'] },
    { id: 'ter_06', nombre: 'Nariño-Putumayo', cobertura: ['Nariño', 'Putumayo'] },
    { id: 'ter_07', nombre: 'Huila', cobertura: ['Huila'] },
    { id: 'ter_08', nombre: 'Meta', cobertura: ['Meta'] },
    { id: 'ter_09', nombre: 'Tolima', cobertura: ['Tolima'] },
    { id: 'ter_10', nombre: 'Valle', cobertura: ['Valle del Cauca'] },
    { id: 'ter_11', nombre: 'Risaralda', cobertura: ['Risaralda'] },
    { id: 'ter_12', nombre: 'Norte de Santander', cobertura: ['Norte de Santander'] },
    { id: 'ter_13', nombre: 'Boyacá', cobertura: ['Boyacá'] },
    { id: 'ter_14', nombre: 'Santander', cobertura: ['Santander'] },
    { id: 'ter_15', nombre: 'Amazonas', cobertura: ['Amazonas'] },
    { id: 'ter_16', nombre: 'Cauca', cobertura: ['Cauca'] }
  ]
} as const;

// ============================================
// ROLES DEL SISTEMA
// ============================================

export const ROLES_SISTEMA = {
  JEFE_OCI: {
    id: 'JEFE_OCI',
    nombre: 'Jefe OCI',
    descripcion: 'Aprobar PAI, supervisar auditorías, firmar informes',
    permisos: ['APROBAR_PAI', 'SUPERVISAR_TODO', 'FIRMAR_INFORMES', 'REPORTAR_DIRECCION'],
    color: COLORES_ESAP.AZUL_OSCURO
  },
  AUDITOR_LIDER: {
    id: 'AUDITOR_LIDER',
    nombre: 'Auditor Líder',
    descripcion: 'Planificar auditorías, asignar equipo, elaborar informes',
    permisos: ['PLANIFICAR', 'ASIGNAR_EQUIPO', 'REVISAR_PAPELES', 'ELABORAR_INFORMES'],
    color: '#117A65'
  },
  AUDITOR: {
    id: 'AUDITOR',
    nombre: 'Auditor',
    descripcion: 'Ejecutar pruebas, recopilar evidencias, documentar hallazgos',
    permisos: ['EJECUTAR_PRUEBAS', 'CARGAR_EVIDENCIAS', 'DOCUMENTAR_HALLAZGOS'],
    color: '#7D3C98'
  },
  CONTRATISTA: {
    id: 'CONTRATISTA',
    nombre: 'Contratista',
    descripcion: 'Apoyo en ejecución de auditorías',
    permisos: ['EJECUTAR_PRUEBAS', 'CARGAR_EVIDENCIAS'],
    color: '#D68910'
  },
  AREA_AUDITADA: {
    id: 'AREA_AUDITADA',
    nombre: 'Líder Proceso Auditado',
    descripcion: 'Formular planes mejora, cargar evidencias cumplimiento',
    permisos: ['FORMULAR_PLANES', 'CARGAR_EVIDENCIAS', 'VER_PROPIOS'],
    color: '#C0392B'
  },
  ADMIN: {
    id: 'ADMIN',
    nombre: 'Administrador',
    descripcion: 'Configuración del sistema',
    permisos: ['CONFIGURAR_TODO', 'GESTIONAR_USUARIOS', 'ACCESO_COMPLETO'],
    color: '#2C3E50'
  }
} as const;

// ============================================
// FORMATOS OFICIALES ESAP
// ============================================

export const FORMATOS_OFICIALES = {
  EMFO001: {
    codigo: 'EM-FO-001',
    nombre: 'Plan Anual de Auditoría',
    version: 'V3',
    descripcion: 'Cronograma semanal 52 columnas',
    reemplazo: 'Módulo Plan Anual'
  },
  EMFO002: {
    codigo: 'EM-FO-002',
    nombre: 'Plan de Mejoramiento',
    version: 'V3',
    columnas: 19,
    descripcion: '19 columnas con fórmulas automáticas',
    reemplazo: 'Módulo Planes Mejora'
  },
  EMFO003: {
    codigo: 'EM-FO-003',
    nombre: 'Plan de Trabajo Individual',
    version: 'V2',
    descripcion: 'Alcance, criterios, cronograma detallado',
    reemplazo: 'Módulo Auditorías'
  },
  EMFO004: {
    codigo: 'EM-FO-004',
    nombre: 'Papeles de Trabajo',
    version: 'V2',
    descripcion: 'Índice automático, referencias cruzadas',
    reemplazo: 'Gestión Documental'
  }
} as const;

// ============================================
// CONFIGURACIÓN DE SEGURIDAD
// ============================================

export const SECURITY_CONFIG = {
  TLS_VERSION: '1.3',
  CIFRADO_ALGORITMO: 'AES-256',
  RETENCION_LOGS_DIAS: 90,
  ARCHIVO_HISTORICO_INDEFINIDO: true,
  CONSENTIMIENTO_REQUERIDO: true,
  BACKUP_FRECUENCIA_DIAS: 1,
  DISPONIBILIDAD_MINIMA: 99.5, // porcentaje
  HORARIO_LABORAL: {
    INICIO: '07:00',
    FIN: '19:00',
    ZONA_HORARIA: 'America/Bogota'
  }
} as const;

// ============================================
// LÍMITES Y RESTRICCIONES
// ============================================

export const LIMITES_SISTEMA = {
  MAX_USUARIOS_CONCURRENTES: 50,
  MAX_ARCHIVO_MB: 50,
  MAX_ACTIVIDADES_POR_ROL: 20,
  MAX_EQUIPO_AUDITORIA: 10,
  MAX_HALLAZGOS_POR_AUDITORIA: 50,
  MAX_EVIDENCIAS_POR_HALLAZGO: 20,
  TIMEOUT_KANBAN_MS: 3000, // 3 segundos
  CURVA_APRENDIZAJE_HORAS: 2
} as const;

// ============================================
// EXPORTACIÓN PRINCIPAL
// ============================================

export const CONSTANTES_OCIG = {
  colores: COLORES_ESAP,
  decreto648: DECRETO_648,
  duraciones: DURACIONES_AUDITORIA,
  seguimiento: SEGUIMIENTO_TRIMESTRAL,
  cumplimiento: VALORES_CUMPLIMIENTO,
  efectividad: VALORES_EFECTIVIDAD,
  semaforos: SEMAFOROS,
  dafp: DAFP_RIESGOS,
  rotacion: PLAN_ROTACION,
  hallazgos: TIPOS_HALLAZGO,
  estados: ESTADOS_AUDITORIA,
  procesos: PROCESOS_AUDITABLES,
  roles: ROLES_SISTEMA,
  formatos: FORMATOS_OFICIALES,
  seguridad: SECURITY_CONFIG,
  limites: LIMITES_SISTEMA
} as const;

export default CONSTANTES_OCIG;
