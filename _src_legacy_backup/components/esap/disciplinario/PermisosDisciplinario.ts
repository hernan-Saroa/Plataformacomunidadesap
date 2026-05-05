/**
 * 🔐 SISTEMA DE PERMISOS - CONTROL INTERNO DISCIPLINARIO
 * 
 * Sistema granular de permisos para máxima parametrización
 * Compatible con el sistema de Roles y Permisos de ESAP
 * 
 * ESTRUCTURA:
 * - Módulos detallados por funcionalidad
 * - Acciones específicas granulares
 * - Roles predefinidos por cargo
 * - Permisos especiales para flujos críticos
 * 
 * Fecha: Enero 2025
 * Versión: 1.0
 */

// ============================================================================
// TIPOS BASE
// ============================================================================

export type AccionPermiso = 
  | 'crear' 
  | 'leer' 
  | 'actualizar' 
  | 'eliminar' 
  | 'aprobar' 
  | 'rechazar'
  | 'exportar' 
  | 'imprimir'
  | 'asignar'
  | 'reasignar'
  | 'comentar'
  | 'archivar'
  | 'restaurar'
  | 'firmar'
  | 'notificar'
  | 'derivar'
  | 'cerrar'
  | 'reabrir'
  | 'anular';

export type NivelAcceso = 'ninguno' | 'propio' | 'equipo' | 'territorial' | 'nacional' | 'total';

export interface PermisoDetallado {
  id: string;
  modulo: string;
  submodulo?: string;
  funcionalidad: string;
  acciones: AccionPermiso[];
  nivelAcceso: NivelAcceso;
  descripcion: string;
  criticidad: 'baja' | 'media' | 'alta' | 'critica';
  requiereAprobacion?: boolean;
  requiereFirmaDigital?: boolean;
  auditable: boolean;
}

export interface RolDisciplinario {
  id: string;
  nombre: string;
  descripcion: string;
  tipo: 'Sistema' | 'Personalizado';
  color: string;
  icono: string;
  permisos: PermisoDetallado[];
  jerarquia: number; // 1 = más alto, 10 = más bajo
}

// ============================================================================
// MÓDULOS DEL SISTEMA DISCIPLINARIO
// ============================================================================

export const MODULOS_DISCIPLINARIO = {
  // MÓDULO PRINCIPAL
  DASHBOARD: 'Control Disciplinario - Dashboard',
  
  // GESTIÓN DE NOTICIAS Y PROCESOS (KANBAN)
  NOTICIAS: 'Control Disciplinario - Noticias',
  PROCESOS: 'Control Disciplinario - Procesos',
  KANBAN: 'Control Disciplinario - Kanban',
  
  // REVISIÓN Y APROBACIÓN
  REVISION: 'Control Disciplinario - Revisión',
  APROBACION: 'Control Disciplinario - Aprobación',
  
  // EXPEDIENTE ELECTRÓNICO
  EXPEDIENTE: 'Control Disciplinario - Expediente',
  DOCUMENTOS: 'Control Disciplinario - Documentos',
  TRAZABILIDAD: 'Control Disciplinario - Trazabilidad',
  
  // TÉRMINOS Y ALERTAS
  TERMINOS: 'Control Disciplinario - Términos',
  ALERTAS: 'Control Disciplinario - Alertas',
  FESTIVOS: 'Control Disciplinario - Días Festivos',
  
  // PROFESIONALES
  PROFESIONALES: 'Control Disciplinario - Profesionales',
  ASIGNACION: 'Control Disciplinario - Asignación de Carga',
  REDISTRIBUCION: 'Control Disciplinario - Redistribución',
  
  // CONFIGURACIÓN
  CONFIGURACION: 'Control Disciplinario - Configuración',
  PARAMETROS: 'Control Disciplinario - Parámetros',
  
  // REPORTES
  REPORTES: 'Control Disciplinario - Reportes',
  ESTADISTICAS: 'Control Disciplinario - Estadísticas',
  EXPORTACION: 'Control Disciplinario - Exportación',
  
  // AUDITORÍA
  AUDITORIA: 'Control Disciplinario - Auditoría'
} as const;

// ============================================================================
// PERMISOS DETALLADOS POR MÓDULO
// ============================================================================

export const PERMISOS_DISCIPLINARIO: PermisoDetallado[] = [
  
  // ========== DASHBOARD ==========
  {
    id: 'disc-dash-001',
    modulo: MODULOS_DISCIPLINARIO.DASHBOARD,
    funcionalidad: 'Visualizar Dashboard General',
    acciones: ['leer'],
    nivelAcceso: 'total',
    descripcion: 'Ver métricas generales y estadísticas del módulo disciplinario',
    criticidad: 'baja',
    auditable: false
  },
  {
    id: 'disc-dash-002',
    modulo: MODULOS_DISCIPLINARIO.DASHBOARD,
    funcionalidad: 'Ver Indicadores Críticos',
    acciones: ['leer'],
    nivelAcceso: 'total',
    descripcion: 'Visualizar indicadores de procesos vencidos, en riesgo y alertas',
    criticidad: 'media',
    auditable: true
  },
  {
    id: 'disc-dash-003',
    modulo: MODULOS_DISCIPLINARIO.DASHBOARD,
    funcionalidad: 'Exportar Dashboard',
    acciones: ['exportar', 'imprimir'],
    nivelAcceso: 'total',
    descripcion: 'Exportar métricas y gráficos del dashboard',
    criticidad: 'baja',
    auditable: true
  },

  // ========== NOTICIAS DISCIPLINARIAS ==========
  {
    id: 'disc-not-001',
    modulo: MODULOS_DISCIPLINARIO.NOTICIAS,
    funcionalidad: 'Ver Noticias',
    acciones: ['leer'],
    nivelAcceso: 'total',
    descripcion: 'Visualizar listado de noticias disciplinarias',
    criticidad: 'baja',
    auditable: false
  },
  {
    id: 'disc-not-002',
    modulo: MODULOS_DISCIPLINARIO.NOTICIAS,
    funcionalidad: 'Crear Noticia',
    acciones: ['crear'],
    nivelAcceso: 'total',
    descripcion: 'Registrar nueva noticia disciplinaria en el sistema',
    criticidad: 'alta',
    requiereAprobacion: false,
    auditable: true
  },
  {
    id: 'disc-not-003',
    modulo: MODULOS_DISCIPLINARIO.NOTICIAS,
    funcionalidad: 'Editar Noticia',
    acciones: ['actualizar'],
    nivelAcceso: 'propio',
    descripcion: 'Modificar información de noticias propias',
    criticidad: 'media',
    auditable: true
  },
  {
    id: 'disc-not-004',
    modulo: MODULOS_DISCIPLINARIO.NOTICIAS,
    funcionalidad: 'Valorar Noticia',
    acciones: ['actualizar', 'aprobar'],
    nivelAcceso: 'total',
    descripcion: 'Realizar valoración preliminar y decidir apertura de proceso',
    criticidad: 'alta',
    requiereAprobacion: false,
    auditable: true
  },
  {
    id: 'disc-not-005',
    modulo: MODULOS_DISCIPLINARIO.NOTICIAS,
    funcionalidad: 'Convertir a Proceso',
    acciones: ['crear', 'actualizar'],
    nivelAcceso: 'total',
    descripcion: 'Convertir noticia en proceso disciplinario formal',
    criticidad: 'critica',
    requiereAprobacion: true,
    auditable: true
  },
  {
    id: 'disc-not-006',
    modulo: MODULOS_DISCIPLINARIO.NOTICIAS,
    funcionalidad: 'Archivar Noticia',
    acciones: ['archivar'],
    nivelAcceso: 'total',
    descripcion: 'Archivar noticia sin mérito para proceso',
    criticidad: 'alta',
    requiereAprobacion: true,
    auditable: true
  },
  {
    id: 'disc-not-007',
    modulo: MODULOS_DISCIPLINARIO.NOTICIAS,
    funcionalidad: 'Derivar Noticia',
    acciones: ['derivar'],
    nivelAcceso: 'total',
    descripcion: 'Remitir noticia a otra área o entidad competente',
    criticidad: 'alta',
    requiereAprobacion: true,
    auditable: true
  },
  {
    id: 'disc-not-008',
    modulo: MODULOS_DISCIPLINARIO.NOTICIAS,
    funcionalidad: 'Eliminar Noticia',
    acciones: ['eliminar'],
    nivelAcceso: 'total',
    descripcion: 'Eliminar noticia del sistema (solo en casos excepcionales)',
    criticidad: 'critica',
    requiereAprobacion: true,
    auditable: true
  },

  // ========== PROCESOS DISCIPLINARIOS ==========
  {
    id: 'disc-proc-001',
    modulo: MODULOS_DISCIPLINARIO.PROCESOS,
    funcionalidad: 'Ver Procesos',
    acciones: ['leer'],
    nivelAcceso: 'total',
    descripcion: 'Visualizar listado de procesos disciplinarios',
    criticidad: 'baja',
    auditable: false
  },
  {
    id: 'disc-proc-002',
    modulo: MODULOS_DISCIPLINARIO.PROCESOS,
    funcionalidad: 'Ver Proceso Asignado',
    acciones: ['leer'],
    nivelAcceso: 'propio',
    descripcion: 'Ver detalle de procesos asignados al usuario',
    criticidad: 'baja',
    auditable: false
  },
  {
    id: 'disc-proc-003',
    modulo: MODULOS_DISCIPLINARIO.PROCESOS,
    funcionalidad: 'Crear Proceso',
    acciones: ['crear'],
    nivelAcceso: 'total',
    descripcion: 'Crear nuevo proceso disciplinario',
    criticidad: 'critica',
    requiereAprobacion: false,
    auditable: true
  },
  {
    id: 'disc-proc-004',
    modulo: MODULOS_DISCIPLINARIO.PROCESOS,
    funcionalidad: 'Actualizar Proceso',
    acciones: ['actualizar'],
    nivelAcceso: 'propio',
    descripcion: 'Modificar información de procesos asignados',
    criticidad: 'alta',
    auditable: true
  },
  {
    id: 'disc-proc-005',
    modulo: MODULOS_DISCIPLINARIO.PROCESOS,
    funcionalidad: 'Cambiar Etapa Proceso',
    acciones: ['actualizar'],
    nivelAcceso: 'propio',
    descripcion: 'Mover proceso entre etapas (Kanban drag & drop)',
    criticidad: 'alta',
    auditable: true
  },
  {
    id: 'disc-proc-006',
    modulo: MODULOS_DISCIPLINARIO.PROCESOS,
    funcionalidad: 'Cerrar Proceso',
    acciones: ['cerrar'],
    nivelAcceso: 'propio',
    descripcion: 'Finalizar proceso disciplinario con decisión',
    criticidad: 'critica',
    requiereAprobacion: true,
    requiereFirmaDigital: true,
    auditable: true
  },
  {
    id: 'disc-proc-007',
    modulo: MODULOS_DISCIPLINARIO.PROCESOS,
    funcionalidad: 'Reabrir Proceso',
    acciones: ['reabrir'],
    nivelAcceso: 'total',
    descripcion: 'Reabrir proceso cerrado por circunstancias excepcionales',
    criticidad: 'critica',
    requiereAprobacion: true,
    auditable: true
  },
  {
    id: 'disc-proc-008',
    modulo: MODULOS_DISCIPLINARIO.PROCESOS,
    funcionalidad: 'Anular Proceso',
    acciones: ['anular'],
    nivelAcceso: 'total',
    descripcion: 'Anular proceso por vicio de procedimiento',
    criticidad: 'critica',
    requiereAprobacion: true,
    requiereFirmaDigital: true,
    auditable: true
  },
  {
    id: 'disc-proc-009',
    modulo: MODULOS_DISCIPLINARIO.PROCESOS,
    funcionalidad: 'Comentar Proceso',
    acciones: ['comentar'],
    nivelAcceso: 'propio',
    descripcion: 'Agregar notas y observaciones al proceso',
    criticidad: 'baja',
    auditable: true
  },
  {
    id: 'disc-proc-010',
    modulo: MODULOS_DISCIPLINARIO.PROCESOS,
    funcionalidad: 'Exportar Proceso',
    acciones: ['exportar', 'imprimir'],
    nivelAcceso: 'propio',
    descripcion: 'Exportar información del proceso a PDF/Excel',
    criticidad: 'media',
    auditable: true
  },

  // ========== KANBAN ==========
  {
    id: 'disc-kanb-001',
    modulo: MODULOS_DISCIPLINARIO.KANBAN,
    funcionalidad: 'Visualizar Kanban',
    acciones: ['leer'],
    nivelAcceso: 'total',
    descripcion: 'Ver tablero Kanban de procesos por etapas',
    criticidad: 'baja',
    auditable: false
  },
  {
    id: 'disc-kanb-002',
    modulo: MODULOS_DISCIPLINARIO.KANBAN,
    funcionalidad: 'Mover Tarjetas',
    acciones: ['actualizar'],
    nivelAcceso: 'propio',
    descripcion: 'Arrastrar y soltar procesos entre etapas',
    criticidad: 'alta',
    auditable: true
  },
  {
    id: 'disc-kanb-003',
    modulo: MODULOS_DISCIPLINARIO.KANBAN,
    funcionalidad: 'Filtrar Kanban',
    acciones: ['leer'],
    nivelAcceso: 'total',
    descripcion: 'Aplicar filtros por profesional, prioridad, semáforo',
    criticidad: 'baja',
    auditable: false
  },
  {
    id: 'disc-kanb-004',
    modulo: MODULOS_DISCIPLINARIO.KANBAN,
    funcionalidad: 'Cambiar Vista Kanban',
    acciones: ['leer'],
    nivelAcceso: 'total',
    descripcion: 'Alternar entre vista Kanban y vista Lista',
    criticidad: 'baja',
    auditable: false
  },

  // ========== REVISIÓN Y APROBACIÓN ==========
  {
    id: 'disc-rev-001',
    modulo: MODULOS_DISCIPLINARIO.REVISION,
    funcionalidad: 'Ver Borradores Pendientes',
    acciones: ['leer'],
    nivelAcceso: 'total',
    descripcion: 'Visualizar documentos pendientes de revisión',
    criticidad: 'media',
    auditable: false
  },
  {
    id: 'disc-rev-002',
    modulo: MODULOS_DISCIPLINARIO.REVISION,
    funcionalidad: 'Revisar Documento',
    acciones: ['leer', 'comentar'],
    nivelAcceso: 'total',
    descripcion: 'Revisar contenido de borrador y agregar observaciones',
    criticidad: 'alta',
    auditable: true
  },
  {
    id: 'disc-apro-001',
    modulo: MODULOS_DISCIPLINARIO.APROBACION,
    funcionalidad: 'Aprobar Documento',
    acciones: ['aprobar', 'firmar'],
    nivelAcceso: 'total',
    descripcion: 'Aprobar borrador para notificación oficial',
    criticidad: 'critica',
    requiereAprobacion: false,
    requiereFirmaDigital: true,
    auditable: true
  },
  {
    id: 'disc-apro-002',
    modulo: MODULOS_DISCIPLINARIO.APROBACION,
    funcionalidad: 'Rechazar Documento',
    acciones: ['rechazar', 'comentar'],
    nivelAcceso: 'total',
    descripcion: 'Devolver documento con observaciones para corrección',
    criticidad: 'alta',
    auditable: true
  },
  {
    id: 'disc-apro-003',
    modulo: MODULOS_DISCIPLINARIO.APROBACION,
    funcionalidad: 'Solicitar Correcciones',
    acciones: ['comentar', 'notificar'],
    nivelAcceso: 'total',
    descripcion: 'Solicitar modificaciones específicas al documento',
    criticidad: 'media',
    auditable: true
  },

  // ========== EXPEDIENTE ELECTRÓNICO ==========
  {
    id: 'disc-exp-001',
    modulo: MODULOS_DISCIPLINARIO.EXPEDIENTE,
    funcionalidad: 'Ver Expedientes',
    acciones: ['leer'],
    nivelAcceso: 'total',
    descripcion: 'Consultar listado de expedientes',
    criticidad: 'baja',
    auditable: false
  },
  {
    id: 'disc-exp-002',
    modulo: MODULOS_DISCIPLINARIO.EXPEDIENTE,
    funcionalidad: 'Ver Expediente Completo',
    acciones: ['leer'],
    nivelAcceso: 'propio',
    descripcion: 'Acceder a expediente completo de un proceso',
    criticidad: 'media',
    auditable: true
  },
  {
    id: 'disc-exp-003',
    modulo: MODULOS_DISCIPLINARIO.EXPEDIENTE,
    funcionalidad: 'Crear Expediente',
    acciones: ['crear'],
    nivelAcceso: 'total',
    descripcion: 'Inicializar expediente electrónico para proceso',
    criticidad: 'alta',
    auditable: true
  },
  {
    id: 'disc-doc-001',
    modulo: MODULOS_DISCIPLINARIO.DOCUMENTOS,
    funcionalidad: 'Ver Documentos',
    acciones: ['leer'],
    nivelAcceso: 'propio',
    descripcion: 'Visualizar documentos del expediente',
    criticidad: 'baja',
    auditable: true
  },
  {
    id: 'disc-doc-002',
    modulo: MODULOS_DISCIPLINARIO.DOCUMENTOS,
    funcionalidad: 'Cargar Documentos',
    acciones: ['crear'],
    nivelAcceso: 'propio',
    descripcion: 'Upload de archivos al expediente electrónico',
    criticidad: 'alta',
    auditable: true
  },
  {
    id: 'disc-doc-003',
    modulo: MODULOS_DISCIPLINARIO.DOCUMENTOS,
    funcionalidad: 'Descargar Documentos',
    acciones: ['leer', 'exportar'],
    nivelAcceso: 'propio',
    descripcion: 'Descargar archivos del expediente',
    criticidad: 'media',
    auditable: true
  },
  {
    id: 'disc-doc-004',
    modulo: MODULOS_DISCIPLINARIO.DOCUMENTOS,
    funcionalidad: 'Eliminar Documentos',
    acciones: ['eliminar'],
    nivelAcceso: 'propio',
    descripcion: 'Eliminar documentos del expediente',
    criticidad: 'critica',
    requiereAprobacion: true,
    auditable: true
  },
  {
    id: 'disc-doc-005',
    modulo: MODULOS_DISCIPLINARIO.DOCUMENTOS,
    funcionalidad: 'Firmar Documentos',
    acciones: ['firmar'],
    nivelAcceso: 'propio',
    descripcion: 'Firma digital de documentos oficiales',
    criticidad: 'critica',
    requiereFirmaDigital: true,
    auditable: true
  },
  {
    id: 'disc-traza-001',
    modulo: MODULOS_DISCIPLINARIO.TRAZABILIDAD,
    funcionalidad: 'Ver Trazabilidad',
    acciones: ['leer'],
    nivelAcceso: 'propio',
    descripcion: 'Consultar historial de cambios del expediente',
    criticidad: 'media',
    auditable: false
  },

  // ========== TÉRMINOS Y ALERTAS ==========
  {
    id: 'disc-term-001',
    modulo: MODULOS_DISCIPLINARIO.TERMINOS,
    funcionalidad: 'Ver Términos',
    acciones: ['leer'],
    nivelAcceso: 'total',
    descripcion: 'Consultar términos y plazos de procesos',
    criticidad: 'media',
    auditable: false
  },
  {
    id: 'disc-term-002',
    modulo: MODULOS_DISCIPLINARIO.TERMINOS,
    funcionalidad: 'Calcular Términos',
    acciones: ['leer'],
    nivelAcceso: 'total',
    descripcion: 'Calcular días hábiles y vencimientos',
    criticidad: 'baja',
    auditable: false
  },
  {
    id: 'disc-term-003',
    modulo: MODULOS_DISCIPLINARIO.TERMINOS,
    funcionalidad: 'Configurar Términos',
    acciones: ['crear', 'actualizar'],
    nivelAcceso: 'total',
    descripcion: 'Definir plazos por etapa procesal',
    criticidad: 'alta',
    requiereAprobacion: true,
    auditable: true
  },
  {
    id: 'disc-alert-001',
    modulo: MODULOS_DISCIPLINARIO.ALERTAS,
    funcionalidad: 'Ver Alertas',
    acciones: ['leer'],
    nivelAcceso: 'propio',
    descripcion: 'Consultar alertas de vencimientos y riesgos',
    criticidad: 'media',
    auditable: false
  },
  {
    id: 'disc-alert-002',
    modulo: MODULOS_DISCIPLINARIO.ALERTAS,
    funcionalidad: 'Configurar Alertas',
    acciones: ['crear', 'actualizar'],
    nivelAcceso: 'total',
    descripcion: 'Configurar umbrales de alertas y notificaciones',
    criticidad: 'media',
    auditable: true
  },
  {
    id: 'disc-fest-001',
    modulo: MODULOS_DISCIPLINARIO.FESTIVOS,
    funcionalidad: 'Ver Festivos',
    acciones: ['leer'],
    nivelAcceso: 'total',
    descripcion: 'Consultar calendario de días festivos',
    criticidad: 'baja',
    auditable: false
  },
  {
    id: 'disc-fest-002',
    modulo: MODULOS_DISCIPLINARIO.FESTIVOS,
    funcionalidad: 'Gestionar Festivos',
    acciones: ['crear', 'actualizar', 'eliminar'],
    nivelAcceso: 'total',
    descripcion: 'Administrar días festivos para cálculo de términos',
    criticidad: 'alta',
    requiereAprobacion: true,
    auditable: true
  },

  // ========== PROFESIONALES ==========
  {
    id: 'disc-prof-001',
    modulo: MODULOS_DISCIPLINARIO.PROFESIONALES,
    funcionalidad: 'Ver Profesionales',
    acciones: ['leer'],
    nivelAcceso: 'total',
    descripcion: 'Consultar listado de profesionales del área',
    criticidad: 'baja',
    auditable: false
  },
  {
    id: 'disc-prof-002',
    modulo: MODULOS_DISCIPLINARIO.PROFESIONALES,
    funcionalidad: 'Ver Carga de Trabajo',
    acciones: ['leer'],
    nivelAcceso: 'total',
    descripcion: 'Ver métricas de procesos asignados por profesional',
    criticidad: 'media',
    auditable: false
  },
  {
    id: 'disc-prof-003',
    modulo: MODULOS_DISCIPLINARIO.PROFESIONALES,
    funcionalidad: 'Ver Desempeño',
    acciones: ['leer'],
    nivelAcceso: 'total',
    descripcion: 'Consultar indicadores de desempeño de profesionales',
    criticidad: 'media',
    auditable: false
  },
  {
    id: 'disc-asig-001',
    modulo: MODULOS_DISCIPLINARIO.ASIGNACION,
    funcionalidad: 'Asignar Procesos',
    acciones: ['asignar'],
    nivelAcceso: 'total',
    descripcion: 'Asignar procesos a profesionales',
    criticidad: 'alta',
    auditable: true
  },
  {
    id: 'disc-asig-002',
    modulo: MODULOS_DISCIPLINARIO.ASIGNACION,
    funcionalidad: 'Reasignar Procesos',
    acciones: ['reasignar'],
    nivelAcceso: 'total',
    descripcion: 'Cambiar asignación de proceso entre profesionales',
    criticidad: 'alta',
    requiereAprobacion: true,
    auditable: true
  },
  {
    id: 'disc-redis-001',
    modulo: MODULOS_DISCIPLINARIO.REDISTRIBUCION,
    funcionalidad: 'Redistribuir Carga',
    acciones: ['asignar', 'reasignar'],
    nivelAcceso: 'total',
    descripcion: 'Redistribuir automáticamente procesos entre profesionales',
    criticidad: 'critica',
    requiereAprobacion: true,
    auditable: true
  },

  // ========== CONFIGURACIÓN ==========
  {
    id: 'disc-config-001',
    modulo: MODULOS_DISCIPLINARIO.CONFIGURACION,
    funcionalidad: 'Ver Configuración',
    acciones: ['leer'],
    nivelAcceso: 'total',
    descripcion: 'Consultar parámetros de configuración',
    criticidad: 'baja',
    auditable: false
  },
  {
    id: 'disc-config-002',
    modulo: MODULOS_DISCIPLINARIO.CONFIGURACION,
    funcionalidad: 'Modificar Configuración',
    acciones: ['actualizar'],
    nivelAcceso: 'total',
    descripcion: 'Cambiar parámetros del sistema disciplinario',
    criticidad: 'critica',
    requiereAprobacion: true,
    auditable: true
  },
  {
    id: 'disc-param-001',
    modulo: MODULOS_DISCIPLINARIO.PARAMETROS,
    funcionalidad: 'Gestionar Estados Kanban',
    acciones: ['crear', 'actualizar', 'eliminar'],
    nivelAcceso: 'total',
    descripcion: 'Administrar etapas y estados del flujo Kanban',
    criticidad: 'alta',
    requiereAprobacion: true,
    auditable: true
  },
  {
    id: 'disc-param-002',
    modulo: MODULOS_DISCIPLINARIO.PARAMETROS,
    funcionalidad: 'Configurar Capacidades',
    acciones: ['actualizar'],
    nivelAcceso: 'total',
    descripcion: 'Definir capacidad máxima de procesos por profesional',
    criticidad: 'media',
    auditable: true
  },

  // ========== REPORTES Y ESTADÍSTICAS ==========
  {
    id: 'disc-rep-001',
    modulo: MODULOS_DISCIPLINARIO.REPORTES,
    funcionalidad: 'Ver Reportes',
    acciones: ['leer'],
    nivelAcceso: 'total',
    descripcion: 'Consultar reportes predefinidos',
    criticidad: 'baja',
    auditable: false
  },
  {
    id: 'disc-rep-002',
    modulo: MODULOS_DISCIPLINARIO.REPORTES,
    funcionalidad: 'Generar Reportes',
    acciones: ['crear', 'leer'],
    nivelAcceso: 'total',
    descripcion: 'Crear reportes personalizados',
    criticidad: 'media',
    auditable: true
  },
  {
    id: 'disc-rep-003',
    modulo: MODULOS_DISCIPLINARIO.REPORTES,
    funcionalidad: 'Exportar Reportes',
    acciones: ['exportar'],
    nivelAcceso: 'total',
    descripcion: 'Descargar reportes en PDF/Excel',
    criticidad: 'media',
    auditable: true
  },
  {
    id: 'disc-est-001',
    modulo: MODULOS_DISCIPLINARIO.ESTADISTICAS,
    funcionalidad: 'Ver Estadísticas',
    acciones: ['leer'],
    nivelAcceso: 'total',
    descripcion: 'Consultar estadísticas y métricas del área',
    criticidad: 'baja',
    auditable: false
  },
  {
    id: 'disc-exp-general-001',
    modulo: MODULOS_DISCIPLINARIO.EXPORTACION,
    funcionalidad: 'Exportación Masiva',
    acciones: ['exportar'],
    nivelAcceso: 'total',
    descripcion: 'Exportar datos en lote del sistema',
    criticidad: 'alta',
    requiereAprobacion: true,
    auditable: true
  },

  // ========== AUDITORÍA ==========
  {
    id: 'disc-audit-001',
    modulo: MODULOS_DISCIPLINARIO.AUDITORIA,
    funcionalidad: 'Ver Auditoría',
    acciones: ['leer'],
    nivelAcceso: 'total',
    descripcion: 'Consultar logs de auditoría del módulo',
    criticidad: 'alta',
    auditable: false
  },
  {
    id: 'disc-audit-002',
    modulo: MODULOS_DISCIPLINARIO.AUDITORIA,
    funcionalidad: 'Exportar Auditoría',
    acciones: ['exportar'],
    nivelAcceso: 'total',
    descripcion: 'Descargar logs de auditoría',
    criticidad: 'alta',
    auditable: true
  }
];

// ============================================================================
// ROLES PREDEFINIDOS PARA CONTROL DISCIPLINARIO
// ============================================================================

export const ROLES_DISCIPLINARIO: RolDisciplinario[] = [
  
  // 1. JEFE DE CONTROL DISCIPLINARIO
  {
    id: 'rol-disc-jefe',
    nombre: 'Jefe de Control Disciplinario',
    descripcion: 'Acceso total al módulo disciplinario con capacidad de aprobación y configuración',
    tipo: 'Sistema',
    color: '#DC2626',
    icono: '👔',
    jerarquia: 1,
    permisos: PERMISOS_DISCIPLINARIO // TODOS los permisos
  },

  // 2. PROFESIONAL ESPECIALIZADO SENIOR
  {
    id: 'rol-disc-prof-senior',
    nombre: 'Profesional Especializado Senior',
    descripcion: 'Gestión completa de procesos, aprobación de documentos, asignación',
    tipo: 'Sistema',
    color: '#EF4444',
    icono: '⚖️',
    jerarquia: 2,
    permisos: PERMISOS_DISCIPLINARIO.filter(p => 
      // Excluir solo configuración crítica y redistribución masiva
      p.id !== 'disc-config-002' && 
      p.id !== 'disc-redis-001' &&
      p.id !== 'disc-param-001'
    )
  },

  // 3. PROFESIONAL UNIVERSITARIO (Operativo)
  {
    id: 'rol-disc-prof-operativo',
    nombre: 'Profesional Universitario',
    descripcion: 'Gestión de procesos asignados, elaboración de documentos, sin aprobación',
    tipo: 'Sistema',
    color: '#F59E0B',
    icono: '📋',
    jerarquia: 3,
    permisos: PERMISOS_DISCIPLINARIO.filter(p =>
      // Solo permisos operativos, sin aprobación ni configuración
      !p.requiereAprobacion &&
      p.nivelAcceso !== 'total' &&
      !p.modulo.includes('Configuración') &&
      !p.modulo.includes('Aprobación') &&
      !p.modulo.includes('Asignación') &&
      !p.modulo.includes('Redistribución')
    )
  },

  // 4. APOYO ADMINISTRATIVO
  {
    id: 'rol-disc-apoyo',
    nombre: 'Apoyo Administrativo Disciplinario',
    descripcion: 'Soporte administrativo: registro de noticias, cargue de documentos, consulta',
    tipo: 'Sistema',
    color: '#10B981',
    icono: '📄',
    jerarquia: 4,
    permisos: PERMISOS_DISCIPLINARIO.filter(p =>
      // Solo lectura, creación de noticias y cargue de docs
      (p.acciones.includes('leer') || 
       p.id === 'disc-not-002' || // Crear noticia
       p.id === 'disc-doc-002' ||  // Cargar documentos
       p.id === 'disc-doc-003')    // Descargar documentos
      && p.criticidad !== 'critica'
    )
  },

  // 5. CONSULTA (Solo Lectura)
  {
    id: 'rol-disc-consulta',
    nombre: 'Consulta Disciplinario',
    descripcion: 'Solo visualización de procesos y reportes, sin capacidad de modificación',
    tipo: 'Sistema',
    color: '#6B7280',
    icono: '👁️',
    jerarquia: 5,
    permisos: PERMISOS_DISCIPLINARIO.filter(p =>
      // Solo permisos de lectura
      p.acciones.length === 1 && p.acciones.includes('leer')
    )
  },

  // 6. AUDITOR DISCIPLINARIO
  {
    id: 'rol-disc-auditor',
    nombre: 'Auditor Disciplinario',
    descripcion: 'Acceso a auditoría, trazabilidad y reportes para supervisión',
    tipo: 'Sistema',
    color: '#3B82F6',
    icono: '🔍',
    jerarquia: 6,
    permisos: PERMISOS_DISCIPLINARIO.filter(p =>
      // Auditoría, reportes, trazabilidad y lectura general
      p.modulo.includes('Auditoría') ||
      p.modulo.includes('Reportes') ||
      p.modulo.includes('Estadísticas') ||
      p.modulo.includes('Trazabilidad') ||
      (p.acciones.includes('leer') && p.nivelAcceso === 'total')
    )
  }
];

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Verifica si un usuario tiene un permiso específico
 */
export function tienePermiso(
  rolId: string, 
  permisoId: string
): boolean {
  const rol = ROLES_DISCIPLINARIO.find(r => r.id === rolId);
  if (!rol) return false;
  
  return rol.permisos.some(p => p.id === permisoId);
}

/**
 * Verifica si un usuario puede ejecutar una acción en un módulo
 */
export function puedeEjecutarAccion(
  rolId: string,
  modulo: string,
  accion: AccionPermiso
): boolean {
  const rol = ROLES_DISCIPLINARIO.find(r => r.id === rolId);
  if (!rol) return false;
  
  return rol.permisos.some(p => 
    p.modulo === modulo && p.acciones.includes(accion)
  );
}

/**
 * Obtiene todos los permisos de un rol
 */
export function obtenerPermisosPorRol(rolId: string): PermisoDetallado[] {
  const rol = ROLES_DISCIPLINARIO.find(r => r.id === rolId);
  return rol?.permisos || [];
}

/**
 * Obtiene permisos por módulo
 */
export function obtenerPermisosPorModulo(modulo: string): PermisoDetallado[] {
  return PERMISOS_DISCIPLINARIO.filter(p => p.modulo === modulo);
}

/**
 * Verifica si una acción requiere aprobación
 */
export function requiereAprobacion(permisoId: string): boolean {
  const permiso = PERMISOS_DISCIPLINARIO.find(p => p.id === permisoId);
  return permiso?.requiereAprobacion || false;
}

/**
 * Verifica si una acción requiere firma digital
 */
export function requiereFirmaDigital(permisoId: string): boolean {
  const permiso = PERMISOS_DISCIPLINARIO.find(p => p.id === permisoId);
  return permiso?.requiereFirmaDigital || false;
}

/**
 * Obtiene el nivel de acceso requerido para un permiso
 */
export function obtenerNivelAcceso(permisoId: string): NivelAcceso | null {
  const permiso = PERMISOS_DISCIPLINARIO.find(p => p.id === permisoId);
  return permiso?.nivelAcceso || null;
}

// ============================================================================
// EXPORT DEFAULT
// ============================================================================

export default {
  MODULOS_DISCIPLINARIO,
  PERMISOS_DISCIPLINARIO,
  ROLES_DISCIPLINARIO,
  tienePermiso,
  puedeEjecutarAccion,
  obtenerPermisosPorRol,
  obtenerPermisosPorModulo,
  requiereAprobacion,
  requiereFirmaDigital,
  obtenerNivelAcceso
};
