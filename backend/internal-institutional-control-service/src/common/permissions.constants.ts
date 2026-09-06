/**
 * Constantes de permisos para Control Interno de Gestión
 * 
 * Formato: modulo.submodulo.accion
 * 
 * Esto debe estar sincronizado con:
 * - Frontend: src/enums/permissions.ts
 * - Base de datos: auth.permission
 */
export const ControlInternoPermissions = {
  // ═══════════════════════════════════════════════════════════════
  // PLAN ANUAL (5 ROLES)
  // ═══════════════════════════════════════════════════════════════
  PLAN_ANUAL_VIEW: 'control-interno.plan-anual.view',
  PLAN_ANUAL_CREATE: 'control-interno.plan-anual.create',
  PLAN_ANUAL_EDIT: 'control-interno.plan-anual.edit',
  PLAN_ANUAL_DELETE: 'control-interno.plan-anual.delete',
  PLAN_ANUAL_APPROVE: 'control-interno.plan-anual.approve',
  PLAN_ANUAL_ACTIVATE: 'control-interno.plan-anual.activate',
  PLAN_ANUAL_EXPORT: 'control-interno.plan-anual.export',
  PLAN_ANUAL_ASSIGN: 'control-interno.plan-anual.assign',
  PLAN_ANUAL_FOLLOW_UP: 'control-interno.plan-anual.follow-up',

  // ═══════════════════════════════════════════════════════════════
  // AUDITORÍAS
  // ═══════════════════════════════════════════════════════════════
  AUDITORIA_MANAGE: 'control-interno.auditoria.manage',
  AUDITORIA_CREATE: 'control-interno.auditoria.manage', // Usa manage como base
  AUDITORIA_VIEW: 'control-interno.auditoria.view',
  AUDITORIA_EDIT: 'control-interno.auditoria.edit',
  AUDITORIA_EDIT_INFORMACION_BASICA: 'control-interno.auditoria.edit.informacion-basica',
  AUDITORIA_EDIT_CLASIFICACION_ALCANCE: 'control-interno.auditoria.edit.clasificacion-alcance',
  AUDITORIA_EDIT_EQUIPO_AUDITOR: 'control-interno.auditoria.edit.equipo-auditor',
  AUDITORIA_EDIT_PROGRAMACION: 'control-interno.auditoria.edit.programacion',
  AUDITORIA_EDIT_OBJETIVOS_CRITERIOS: 'control-interno.auditoria.edit.objetivos-criterios',
  AUDITORIA_EDIT_RECURSOS_PRODUCTOS: 'control-interno.auditoria.edit.recursos-productos',
  AUDITORIA_EDIT_RIESGOS_CONTROLES: 'control-interno.auditoria.edit.riesgos-controles',
  AUDITORIA_EDIT_HALLAZGOS_PRELIMINARES: 'control-interno.auditoria.edit.hallazgos-preliminares',
  AUDITORIA_EDIT_VINCULACION_PLAN: 'control-interno.auditoria.edit.vinculacion-plan',
  AUDITORIA_DELETE: 'control-interno.auditoria.delete',
  AUDITORIA_APPROVE: 'control-interno.auditoria.approve',
  AUDITORIA_EXPORT: 'control-interno.auditoria.export',
  AUDITORIA_STATE_CHANGE: 'control-interno.auditoria.state.change',
  AUDITORIA_ASSIGN_AUDITOR: 'control-interno.auditoria.audit',
  AUDITORIA_ARCHIVE: 'control-interno.auditoria.archive',
  AUDITORIA_AMPLIACION: 'control-interno.auditoria.add.ampliacion',
  AUDITORIA_NOTAS_CREATE: 'control-interno.auditoria.notas.create',
  AUDITORIA_NOTAS_DELETE: 'control-interno.auditoria.notas.delete',

  // ═══════════════════════════════════════════════════════════════
  // PLANES DE MEJORAMIENTO
  // ═══════════════════════════════════════════════════════════════
  PLANES_MEJ_MANAGE: 'control-interno.planes-mejoramiento.manage',
  PLANES_MEJ_CREATE: 'control-interno.planes-mejoramiento.create',
  PLANES_MEJ_EDIT: 'control-interno.planes-mejoramiento.manage',
  PLANES_MEJ_DELETE: 'control-interno.planes-mejoramiento.manage',
  PLANES_MEJ_APPROVE: 'control-interno.planes-mejoramiento.manage',
  PLANES_MEJ_FOLLOW_UP: 'control-interno.planes-mejoramiento.follow-up',
  
  // Alias para compatibilidad con controladores
  PLAN_MEJORAMIENTO_VIEW: 'control-interno.planes-mejoramiento.view',
  PLAN_MEJORAMIENTO_CREATE: 'control-interno.planes-mejoramiento.create',
  PLAN_MEJORAMIENTO_EDIT: 'control-interno.planes-mejoramiento.edit',
  PLAN_MEJORAMIENTO_DELETE: 'control-interno.planes-mejoramiento.delete',
  PLAN_MEJORAMIENTO_FOLLOW_UP: 'control-interno.planes-mejoramiento.follow-up',

  // Permisos de seguimiento, evaluación y cierre (EM-PT-002 act. 4-10, spec §5.5)
  PLAN_MEJORA_VALIDAR_EVIDENCIA: 'control-interno.planes-mejoramiento.validar-evidencia',
  PLAN_MEJORA_SEGUIMIENTO: 'control-interno.planes-mejoramiento.seguimiento',
  PLAN_MEJORA_CERRAR: 'control-interno.planes-mejoramiento.cerrar',

  // ═══════════════════════════════════════════════════════════════
  // HALLAZGOS
  // ═══════════════════════════════════════════════════════════════
  HALLAZGOS_MANAGE: 'control-interno.hallazgos.manage',
  HALLAZGOS_CREATE: 'control-interno.hallazgos.create',
  HALLAZGOS_EDIT: 'control-interno.hallazgos.edit',
  HALLAZGOS_DELETE: 'control-interno.hallazgos.delete',
  HALLAZGO_VIEW: 'control-interno.hallazgos.view',
  HALLAZGO_CREATE: 'control-interno.hallazgos.create',
  HALLAZGO_EDIT: 'control-interno.hallazgos.edit',
  HALLAZGO_DELETE: 'control-interno.hallazgos.delete',

  // ═══════════════════════════════════════════════════════════════
  // INFORMES DE LEY
  // ═══════════════════════════════════════════════════════════════
  INFORMES_LEY_MANAGE: 'control-interno.informes-de-ley.manage',
  INFORMES_LEY_GENERATE: 'control-interno.informes-de-ley.generate',
  INFORMES_LEY_EXPORT: 'control-interno.informes-de-ley.export',
  INFORME_VIEW: 'control-interno.informes-de-ley.view',
  INFORME_CREATE: 'control-interno.informes-de-ley.create',
  INFORME_EDIT: 'control-interno.informes-de-ley.edit',
  INFORME_DELETE: 'control-interno.informes-de-ley.delete',
  INFORME_APPROVE: 'control-interno.informes-de-ley.approve',

  // ═══════════════════════════════════════════════════════════════
  // EXPEDIENTES
  // ═══════════════════════════════════════════════════════════════
  EXPEDIENTES_MANAGE: 'control-interno.expedientes.manage',
  EXPEDIENTES_UPLOAD: 'control-interno.expedientes.upload',
  EXPEDIENTES_DOWNLOAD: 'control-interno.expedientes.download',

  // ═══════════════════════════════════════════════════════════════
  // CONFIGURACIONES
  // ═══════════════════════════════════════════════════════════════
  CONFIG_MANAGE: 'control-interno.configuraciones.manage',
  CONFIG_TIPOS_AUDITORIA: 'control-interno.configuraciones.manage',
  CONFIG_TABLEROS: 'control-interno.configuraciones.manage',
  CONFIG_LISTAS_CHEQUEO: 'control-interno.configuraciones.manage',
  ROLES_DELETE: 'control-interno.roles.delete',

  // ═══════════════════════════════════════════════════════════════
  // UNIVERSO AUDITABLE / PROGRAMA ANUAL
  // ═══════════════════════════════════════════════════════════════
  UNIVERSO_VIEW: 'control-interno.planeacion.manage',
  UNIVERSO_CREATE: 'control-interno.planeacion.create',
  UNIVERSO_EDIT: 'control-interno.planeacion.plan.edit',
  PROGRAMA_ANUAL_MANAGE: 'control-interno.planeacion.manage',

  // ═══════════════════════════════════════════════════════════════
  // TAREAS Y EVIDENCIAS
  // ═══════════════════════════════════════════════════════════════
  TAREAS_MANAGE: 'control-interno.auditoria.manage',
  EVIDENCIAS_MANAGE: 'control-interno.auditoria.manage',
  EVIDENCIAS_UPLOAD: 'control-interno.auditoria.manage',
  EVIDENCIA_VIEW: 'control-interno.evidencias.view',
  EVIDENCIA_CREATE: 'control-interno.evidencias.create',
  EVIDENCIA_DELETE: 'control-interno.evidencias.delete',
  EVIDENCIA_VALIDATE: 'control-interno.evidencias.validate',

  // ═══════════════════════════════════════════════════════════════
  // APROBACIONES
  // ═══════════════════════════════════════════════════════════════
  APROBACION_VIEW: 'control-interno.aprobaciones.view',
  APROBACION_CREATE: 'control-interno.aprobaciones.create',
  APROBACION_EDIT: 'control-interno.aprobaciones.edit',
  APROBACION_DELETE: 'control-interno.aprobaciones.delete',
  PLAN_MEJORAMIENTO_APPROVE: 'control-interno.planes-mejoramiento.approve',

  // ═══════════════════════════════════════════════════════════════
  // DOCUMENTOS
  // ═══════════════════════════════════════════════════════════════
  DOCUMENTO_VIEW: 'control-interno.documentos.view',
  DOCUMENTO_CREATE: 'control-interno.documentos.create',
  DOCUMENTO_EDIT: 'control-interno.documentos.edit',
  DOCUMENTO_DELETE: 'control-interno.documentos.delete',
};
