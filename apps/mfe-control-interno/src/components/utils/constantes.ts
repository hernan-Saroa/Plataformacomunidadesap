/**
 * CONSTANTES Y CONFIGURACIONES - MÓDULO CONTROL INTERNO
 * 
 * Valores constantes, configuraciones y catálogos centralizados
 * para todo el módulo de Control Interno.
 */

// ==================== COLORES ESAP ====================

export const COLORES_ESAP = {
  primario: '#003DA5',
  primarioOscuro: '#002873',
  primarioClaro: '#0052CC',
  secundario: '#F5F5F5',
  acento: '#FF6B00',
  exito: '#10B981',
  advertencia: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6'
} as const;

// ==================== ESTADOS ====================

export const ESTADOS_AUDITORIA = {
  PROGRAMADA: 'programada',
  EN_PLANEACION: 'en-planeacion',
  EN_EJECUCION: 'en-ejecucion',
  EN_COMUNICACION: 'en-comunicacion',
  CERRADA: 'cerrada',
  CANCELADA: 'cancelada'
} as const;

export const ESTADOS_HALLAZGO = {
  ABIERTO: 'abierto',
  EN_ANALISIS: 'en-analisis',
  EN_PLAN_MEJORAMIENTO: 'en-plan-mejoramiento',
  CERRADO: 'cerrado',
  RECHAZADO: 'rechazado'
} as const;

export const ESTADOS_LISTA_CHEQUEO = {
  BORRADOR: 'borrador',
  ACTIVA: 'activa',
  ARCHIVADA: 'archivada'
} as const;

export const ESTADOS_ENTREGA_INFORME = {
  PENDIENTE: 'pendiente',
  EN_PROCESO: 'en-proceso',
  ENTREGADO: 'entregado',
  VENCIDO: 'vencido',
  RECHAZADO: 'rechazado'
} as const;

export const ESTADOS_ACCION_MEJORAMIENTO = {
  PROGRAMADA: 'programada',
  EN_EJECUCION: 'en-ejecucion',
  COMPLETADA: 'completada',
  VENCIDA: 'vencida',
  ATRASADA: 'atrasada'
} as const;

// ==================== TIPOS Y CATEGORÍAS ====================

export const TIPOS_AUDITORIA = [
  'Gestión',
  'Cumplimiento',
  'Desempeño',
  'Sistemas',
  'Financiera',
  'Seguimiento'
] as const;

export const TIPOS_HALLAZGO = [
  'No Conformidad',
  'Observación',
  'Oportunidad de Mejora',
  'Fortaleza'
] as const;

export const GRAVEDADES_HALLAZGO = [
  'Baja',
  'Media',
  'Alta',
  'Crítica'
] as const;

export const CATEGORIAS_LISTA_CHEQUEO = [
  { value: 'normativa', label: 'Cumplimiento Normativo' },
  { value: 'procesos', label: 'Procesos' },
  { value: 'controles', label: 'Controles' },
  { value: 'riesgos', label: 'Riesgos' },
  { value: 'personalizada', label: 'Personalizada' }
] as const;

export const CATEGORIAS_INFORME = [
  { value: 'financiero', label: 'Financiero' },
  { value: 'administrativo', label: 'Administrativo' },
  { value: 'contractual', label: 'Contractual' },
  { value: 'talento-humano', label: 'Talento Humano' },
  { value: 'transparencia', label: 'Transparencia' },
  { value: 'control', label: 'Control' }
] as const;

export const PERIODICIDADES = [
  { value: 'mensual', label: 'Mensual' },
  { value: 'bimestral', label: 'Bimestral' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'cuatrimestral', label: 'Cuatrimestral' },
  { value: 'semestral', label: 'Semestral' },
  { value: 'anual', label: 'Anual' }
] as const;

// ==================== RESPUESTAS Y OPCIONES ====================

export const RESPUESTAS_LISTA_CHEQUEO = [
  { value: 'cumple', label: 'Cumple', color: 'green' },
  { value: 'no-cumple', label: 'No Cumple', color: 'red' },
  { value: 'no-aplica', label: 'No Aplica', color: 'gray' }
] as const;

export const NIVELES_RIESGO = [
  { value: 'bajo', label: 'Bajo', color: 'green' },
  { value: 'medio', label: 'Medio', color: 'yellow' },
  { value: 'alto', label: 'Alto', color: 'orange' },
  { value: 'extremo', label: 'Extremo', color: 'red' }
] as const;

// ==================== ROLES Y PERMISOS ====================

export const ROLES_CONTROL_INTERNO = {
  ADMINISTRADOR: 'Administrador Control Interno',
  JEFE: 'Jefe Control Interno',
  AUDITOR_LIDER: 'Auditor Líder',
  AUDITOR: 'Auditor',
  AREA_AUDITADA: 'Área Auditada'
} as const;

export const PERMISOS_MODULO = {
  // Auditorías
  VER_AUDITORIAS: 'ver_auditorias',
  CREAR_AUDITORIAS: 'crear_auditorias',
  EDITAR_AUDITORIAS: 'editar_auditorias',
  ELIMINAR_AUDITORIAS: 'eliminar_auditorias',
  EJECUTAR_AUDITORIAS: 'ejecutar_auditorias',
  
  // Hallazgos
  VER_HALLAZGOS: 'ver_hallazgos',
  CREAR_HALLAZGOS: 'crear_hallazgos',
  EDITAR_HALLAZGOS: 'editar_hallazgos',
  CERRAR_HALLAZGOS: 'cerrar_hallazgos',
  
  // Listas de chequeo
  VER_LISTAS: 'ver_listas',
  CREAR_LISTAS: 'crear_listas',
  EDITAR_LISTAS: 'editar_listas',
  DILIGENCIAR_LISTAS: 'diligenciar_listas',
  
  // Informes de ley
  VER_INFORMES: 'ver_informes',
  CARGAR_INFORMES: 'cargar_informes',
  APROBAR_INFORMES: 'aprobar_informes',
  
  // Planes de mejoramiento
  VER_PLANES: 'ver_planes',
  CREAR_PLANES: 'crear_planes',
  EDITAR_PLANES: 'editar_planes',
  HACER_SEGUIMIENTO: 'hacer_seguimiento'
} as const;

// ==================== FORMATOS Y PLANTILLAS ====================

export const EXTENSIONES_ARCHIVOS_PERMITIDAS = {
  DOCUMENTOS: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'],
  IMAGENES: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  COMPRIMIDOS: ['zip', 'rar', '7z'],
  TODOS: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'zip']
} as const;

export const TAMANO_MAXIMO_ARCHIVO_MB = 10;

export const FORMATOS_CODIGO = {
  AUDITORIA: /^AUD-\d{4}-\d{3}$/,        // AUD-2025-001
  HALLAZGO: /^HAL-\d{4}-\d{3}$/,         // HAL-2025-001
  LISTA_CHEQUEO: /^LC-[A-Z]{3}-\d{3}$/,  // LC-CTL-001
  INFORME: /^INF-[A-Z]+$/,               // INF-CHIP
  PLAN: /^PLN-\d{4}-\d{3}$/              // PLN-2025-001
} as const;

// ==================== CONFIGURACIONES DE VALIDACIÓN ====================

export const VALIDACIONES = {
  NOMBRE_MIN_LENGTH: 3,
  NOMBRE_MAX_LENGTH: 200,
  DESCRIPCION_MIN_LENGTH: 10,
  DESCRIPCION_MAX_LENGTH: 1000,
  OBSERVACIONES_MIN_LENGTH: 10,
  OBSERVACIONES_MAX_LENGTH: 2000,
  CRITERIO_MIN_LENGTH: 10,
  CRITERIO_MAX_LENGTH: 500,
  
  // Listas de chequeo
  MIN_SECCIONES: 1,
  MIN_ITEMS_POR_LISTA: 1,
  MIN_ITEMS_CRITICOS: 0,
  
  // Planes de mejoramiento
  MIN_ACCIONES: 1,
  AVANCE_MIN: 0,
  AVANCE_MAX: 100,
  
  // Informes
  DIAS_ANTICIPACION_MIN: 1,
  DIAS_ANTICIPACION_MAX: 90
} as const;

// ==================== CONFIGURACIONES DE ALERTAS ====================

export const CONFIGURACION_ALERTAS = {
  // Días antes del vencimiento para alertar
  DIAS_ALERTA_URGENTE: 3,
  DIAS_ALERTA_ATENCION: 7,
  DIAS_ALERTA_ANTICIPADA: 15,
  
  // Colores de alerta
  COLORES_ALERTA: {
    SEGURO: 'bg-green-100 text-green-800 border-green-200',
    ATENCION: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    URGENTE: 'bg-orange-100 text-orange-800 border-orange-200',
    VENCIDO: 'bg-red-100 text-red-800 border-red-200'
  },
  
  // Configuración por tipo de informe
  DIAS_POR_PERIODICIDAD: {
    mensual: 7,
    bimestral: 10,
    trimestral: 10,
    cuatrimestral: 15,
    semestral: 15,
    anual: 30
  }
} as const;

// ==================== TEXTOS Y MENSAJES ====================

export const MENSAJES = {
  // Éxito
  GUARDADO_EXITOSO: 'Los cambios se guardaron correctamente',
  ELIMINADO_EXITOSO: 'El elemento fue eliminado correctamente',
  CREADO_EXITOSO: 'El elemento fue creado correctamente',
  ACTUALIZADO_EXITOSO: 'El elemento fue actualizado correctamente',
  
  // Error
  ERROR_GENERAL: 'Ocurrió un error. Por favor intenta nuevamente',
  ERROR_VALIDACION: 'Por favor corrige los errores antes de continuar',
  ERROR_PERMISOS: 'No tienes permisos para realizar esta acción',
  ERROR_RED: 'Error de conexión. Verifica tu conexión a internet',
  
  // Advertencias
  CAMPOS_REQUERIDOS: 'Por favor completa todos los campos requeridos',
  CAMBIOS_NO_GUARDADOS: '¿Estás seguro? Los cambios no guardados se perderán',
  CONFIRMAR_ELIMINACION: '¿Estás seguro de eliminar este elemento? Esta acción no se puede deshacer',
  
  // Info
  SIN_DATOS: 'No hay datos para mostrar',
  CARGANDO: 'Cargando...',
  PROCESANDO: 'Procesando...'
} as const;

// ==================== CONFIGURACIONES DE PAGINACIÓN ====================

export const PAGINACION = {
  ITEMS_POR_PAGINA_DEFAULT: 10,
  ITEMS_POR_PAGINA_OPCIONES: [10, 20, 50, 100],
  MAX_PAGINAS_VISIBLES: 5
} as const;

// ==================== CONFIGURACIONES DE CACHE ====================

export const CACHE_CONFIG = {
  DURACION_MINUTOS: {
    CORTA: 5,
    MEDIA: 30,
    LARGA: 120
  },
  PREFIJOS: {
    AUDITORIAS: 'cache_auditorias_',
    HALLAZGOS: 'cache_hallazgos_',
    LISTAS: 'cache_listas_',
    INFORMES: 'cache_informes_',
    PLANES: 'cache_planes_'
  }
} as const;

// ==================== CONFIGURACIONES DE EXPORTACIÓN ====================

export const EXPORT_CONFIG = {
  FORMATOS: ['PDF', 'EXCEL', 'CSV'],
  NOMBRES_ARCHIVO: {
    AUDITORIA: 'auditoria',
    HALLAZGOS: 'hallazgos',
    LISTA_CHEQUEO: 'lista_chequeo',
    INFORME: 'informe',
    PLAN_MEJORAMIENTO: 'plan_mejoramiento',
    CALENDARIO: 'calendario_informes'
  },
  HOJAS_EXCEL: {
    GENERAL: 'General',
    DETALLE: 'Detalle',
    HALLAZGOS: 'Hallazgos',
    ACCIONES: 'Acciones',
    EVIDENCIAS: 'Evidencias'
  }
} as const;

// ==================== CONFIGURACIONES DE NOTIFICACIONES ====================

export const NOTIFICACIONES_CONFIG = {
  DURACION_MS: {
    CORTA: 3000,
    MEDIA: 5000,
    LARGA: 7000
  },
  POSICION: 'top-right' as const,
  MAX_NOTIFICACIONES: 3
} as const;

// ==================== URLs Y ENDPOINTS (Mock) ====================

export const API_ENDPOINTS = {
  // Auditorías
  AUDITORIAS: '/api/control-interno/auditorias',
  UNIVERSO_AUDITABLE: '/api/control-interno/universo',
  PLAN_ANUAL: '/api/control-interno/plan-anual',
  
  // Hallazgos
  HALLAZGOS: '/api/control-interno/hallazgos',
  HALLAZGOS_POR_AUDITORIA: '/api/control-interno/hallazgos/auditoria',
  
  // Listas de chequeo
  LISTAS_CHEQUEO: '/api/control-interno/listas-chequeo',
  LISTAS_BIBLIOTECA: '/api/control-interno/listas-chequeo/biblioteca',
  LISTAS_APLICADAS: '/api/control-interno/listas-chequeo/aplicadas',
  
  // Informes de ley
  INFORMES_LEY: '/api/control-interno/informes-ley',
  ENTREGAS_INFORMES: '/api/control-interno/informes-ley/entregas',
  CALENDARIO_INFORMES: '/api/control-interno/informes-ley/calendario',
  
  // Planes de mejoramiento
  PLANES_MEJORAMIENTO: '/api/control-interno/planes-mejoramiento',
  SEGUIMIENTO_PLANES: '/api/control-interno/planes-mejoramiento/seguimiento',
  
  // Reportes
  REPORTES: '/api/control-interno/reportes',
  EXPORTAR: '/api/control-interno/exportar'
} as const;

// ==================== CONFIGURACIONES DE DASHBOARD ====================

export const DASHBOARD_CONFIG = {
  REFRESCAR_CADA_MS: 60000, // 1 minuto
  MOSTRAR_ULTIMOS_DIAS: 30,
  MAX_ITEMS_RECIENTES: 5,
  MAX_ALERTAS: 10
} as const;

// ==================== ICONOS POR CATEGORÍA ====================

export const ICONOS_CATEGORIA = {
  financiero: '💰',
  administrativo: '📋',
  contractual: '📝',
  'talento-humano': '👥',
  transparencia: '🔍',
  control: '✓',
  normativa: '⚖️',
  procesos: '🔄',
  controles: '🛡️',
  riesgos: '⚠️',
  personalizada: '⭐'
} as const;

// ==================== TOOLTIPS Y AYUDA ====================

export const TOOLTIPS = {
  AUDITORIA_TIPO: 'Selecciona el tipo de auditoría según su alcance y objetivo',
  HALLAZGO_GRAVEDAD: 'La gravedad determina la prioridad de atención del hallazgo',
  LISTA_CRITICO: 'Los ítems críticos son de verificación obligatoria',
  INFORME_PERIODICIDAD: 'Frecuencia con la que debe presentarse el informe',
  PLAN_AVANCE: 'Porcentaje de cumplimiento de la acción (0-100)',
  NO_APLICA: 'Marcar cuando el criterio no es aplicable en este caso específico',
  EVIDENCIA_REQUERIDA: 'Se requiere adjuntar evidencia documental',
  HALLAZGO_AUTOMATICO: 'Los ítems marcados como "No Cumple" generarán hallazgos automáticamente'
} as const;

// ==================== CONFIGURACIONES DE BÚSQUEDA ====================

export const BUSQUEDA_CONFIG = {
  MIN_CARACTERES: 2,
  DEBOUNCE_MS: 300,
  MAX_RESULTADOS: 20
} as const;

// ==================== CONFIGURACIONES DE GRÁFICOS ====================

export const GRAFICOS_CONFIG = {
  COLORES_CHART: [
    COLORES_ESAP.primario,
    COLORES_ESAP.acento,
    COLORES_ESAP.exito,
    COLORES_ESAP.advertencia,
    COLORES_ESAP.info
  ],
  ALTURA_DEFAULT: 300,
  TIPO_DEFAULT: 'bar' as const,
  ANIMACION_DURACION: 300
} as const;

// ==================== LÍMITES Y RESTRICCIONES ====================

export const LIMITES = {
  MAX_SECCIONES_LISTA: 20,
  MAX_ITEMS_POR_SECCION: 50,
  MAX_EVIDENCIAS_POR_ITEM: 10,
  MAX_ACCIONES_PLAN: 50,
  MAX_HALLAZGOS_POR_AUDITORIA: 100,
  MAX_CARACTERES_OBSERVACION: 2000
} as const;

// ==================== FÓRMULA DAFP - CÁLCULO DE RIESGO ====================
// Según DAFP - Guía de Auditoría Interna V6
// Implementado: 23 Enero 2026

/**
 * Niveles de Criticidad según DAFP
 * ALTO: Impacto significativo en objetivos estratégicos
 * MEDIO: Impacto moderado en procesos operativos
 * BAJO: Impacto mínimo o localizado
 */
export const DAFP_CRITICIDAD = {
  ALTO: 5,
  MEDIO: 3,
  BAJO: 1
} as const;

/**
 * Factor de Exposición según DAFP
 * Basado en número de beneficiarios/afectados
 * >100: Alto impacto poblacional
 * 50-100: Impacto medio
 * <50: Impacto bajo
 */
export const DAFP_EXPOSICION = {
  MAS_100_BENEFICIARIOS: 5,
  ENTRE_50_100_BENEFICIARIOS: 3,
  MENOS_50_BENEFICIARIOS: 1
} as const;

/**
 * Factores Mitigantes típicos
 * Número de controles existentes que reducen el riesgo
 */
export const DAFP_FACTORES_MITIGANTES = {
  SIN_CONTROLES: 1,
  CONTROLES_BASICOS: 2,
  CONTROLES_MODERADOS: 3,
  CONTROLES_ROBUSTOS: 4,
  CONTROLES_COMPLETOS: 5
} as const;

/**
 * Calcula el nivel de riesgo según la fórmula DAFP
 * 
 * Fórmula: (Criticidad × Factor_Exposición) / Factores_Mitigantes
 * 
 * Clasificación resultante:
 * - ALTO: > 10
 * - MEDIO: 5-10
 * - BAJO: < 5
 * 
 * @param criticidad - Nivel de criticidad (1, 3, 5)
 * @param exposicion - Factor de exposición basado en beneficiarios (1, 3, 5)
 * @param mitigantes - Número de factores mitigantes (1-5)
 * @returns Valor numérico del riesgo calculado
 * 
 * @example
 * // Riesgo ALTO: criticidad alta, muchos beneficiarios, pocos controles
 * const riesgoAlto = calcularRiesgoDAFP(5, 5, 1); // 25 = ALTO
 * 
 * @example
 * // Riesgo MEDIO: criticidad media, beneficiarios medios, controles básicos
 * const riesgoMedio = calcularRiesgoDAFP(3, 3, 2); // 4.5 = MEDIO
 * 
 * @example
 * // Riesgo BAJO: criticidad baja, pocos beneficiarios, controles robustos
 * const riesgoBajo = calcularRiesgoDAFP(1, 1, 4); // 0.25 = BAJO
 */
export function calcularRiesgoDAFP(
  criticidad: number,
  exposicion: number,
  mitigantes: number
): number {
  if (mitigantes === 0) {
    throw new Error('Los factores mitigantes no pueden ser 0');
  }
  
  const riesgo = (criticidad * exposicion) / mitigantes;
  return Math.round(riesgo * 100) / 100; // Redondear a 2 decimales
}

/**
 * Clasifica el nivel de riesgo calculado según DAFP
 * 
 * @param valorRiesgo - Valor numérico del riesgo (resultado de calcularRiesgoDAFP)
 * @returns Clasificación del riesgo: 'ALTO', 'MEDIO', 'BAJO'
 */
export function clasificarRiesgoDAFP(valorRiesgo: number): 'ALTO' | 'MEDIO' | 'BAJO' {
  if (valorRiesgo > 10) return 'ALTO';
  if (valorRiesgo >= 5) return 'MEDIO';
  return 'BAJO';
}

/**
 * Obtiene el color asociado al nivel de riesgo
 * 
 * @param nivelRiesgo - Nivel de riesgo ('ALTO', 'MEDIO', 'BAJO')
 * @returns Color hexadecimal del riesgo
 */
export function obtenerColorRiesgoDAFP(nivelRiesgo: 'ALTO' | 'MEDIO' | 'BAJO'): string {
  const colores = {
    ALTO: '#EF4444',    // Rojo
    MEDIO: '#F59E0B',   // Amarillo/Naranja
    BAJO: '#10B981'     // Verde
  };
  return colores[nivelRiesgo];
}

/**
 * Calcula y clasifica el riesgo en un solo paso
 * 
 * @param criticidad - Nivel de criticidad (1, 3, 5)
 * @param exposicion - Factor de exposición (1, 3, 5)
 * @param mitigantes - Factores mitigantes (1-5)
 * @returns Objeto con valor, clasificación y color del riesgo
 */
export function evaluarRiesgoDAFP(
  criticidad: number,
  exposicion: number,
  mitigantes: number
) {
  const valor = calcularRiesgoDAFP(criticidad, exposicion, mitigantes);
  const clasificacion = clasificarRiesgoDAFP(valor);
  const color = obtenerColorRiesgoDAFP(clasificacion);
  
  return {
    valor,
    clasificacion,
    color,
    descripcion: `Riesgo ${clasificacion} (${valor})`
  };
}

// Exportar todo como un objeto único también
export default {
  COLORES_ESAP,
  ESTADOS_AUDITORIA,
  ESTADOS_HALLAZGO,
  ESTADOS_LISTA_CHEQUEO,
  ESTADOS_ENTREGA_INFORME,
  ESTADOS_ACCION_MEJORAMIENTO,
  TIPOS_AUDITORIA,
  TIPOS_HALLAZGO,
  GRAVEDADES_HALLAZGO,
  CATEGORIAS_LISTA_CHEQUEO,
  CATEGORIAS_INFORME,
  PERIODICIDADES,
  RESPUESTAS_LISTA_CHEQUEO,
  NIVELES_RIESGO,
  ROLES_CONTROL_INTERNO,
  PERMISOS_MODULO,
  EXTENSIONES_ARCHIVOS_PERMITIDAS,
  TAMANO_MAXIMO_ARCHIVO_MB,
  FORMATOS_CODIGO,
  VALIDACIONES,
  CONFIGURACION_ALERTAS,
  MENSAJES,
  PAGINACION,
  CACHE_CONFIG,
  EXPORT_CONFIG,
  NOTIFICACIONES_CONFIG,
  API_ENDPOINTS,
  DASHBOARD_CONFIG,
  ICONOS_CATEGORIA,
  TOOLTIPS,
  BUSQUEDA_CONFIG,
  GRAFICOS_CONFIG,
  LIMITES,
  DAFP_CRITICIDAD,
  DAFP_EXPOSICION,
  DAFP_FACTORES_MITIGANTES,
  calcularRiesgoDAFP,
  clasificarRiesgoDAFP,
  obtenerColorRiesgoDAFP,
  evaluarRiesgoDAFP
};