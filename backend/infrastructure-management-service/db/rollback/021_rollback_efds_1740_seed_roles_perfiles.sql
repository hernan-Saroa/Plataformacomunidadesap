-- ============================================================================
-- ROLLBACK 021 — EFDS-1740 (SOLO EJECUTAR BAJO SOLICITUD EXPLÍCITA DEL USUARIO)
-- Elimina TODO lo que el seed 021 insertó. NO toca permisos/roles históricos preexistentes (SUPER_ADMIN/ADMIN/USER y los 8 permisos de EFDS-1730).
-- ============================================================================
BEGIN;
SET LOCAL search_path TO auth, public;

-- 1) Borrar asignaciones pivot SOLO de los permisos NUEVOS del módulo (27 creados en 021)
--    (Mantiene intacto EFDS-1730 los 8 permisos create/read_own/read_all/view/mant/edit/delete/infraestructura.create históricos)
DELETE FROM auth.role_permissions
WHERE id_permission IN (
  SELECT id_permission FROM auth.permission
  WHERE id_module = 'd2262ff0-1b96-4751-8741-2a0fc76ee1e2'
  AND code IN (
    'infraestructura.solicitud.assign','infraestructura.solicitud.reject','infraestructura.solicitud.redistribute','infraestructura.solicitud.forward_ti',
    'infraestructura.solicitud.execute_assigned','infraestructura.solicitud.close_with_evidence','infraestructura.solicitud.confirm_close_own','infraestructura.solicitud.rate_close_own',
    'infraestructura.solicitud.read_assigned','infraestructura.solicitud.read_rejection_reason_own','infraestructura.solicitud.read_ti','infraestructura.solicitud.read_audit_history_any',
    'infraestructura.solicitud.ti_tracing_full','infraestructura.solicitud.authorize_special_categories','infraestructura.estadisticas.calificaciones.consolidadas','infraestructura.reportes.gestion',
    'infraestructura.param.categories_crud','infraestructura.param.rules_edit','infraestructura.param.sla_times_edit','infraestructura.param.technicians_crud','infraestructura.param.territorial_crud',
    'infraestructura.param.approve_config','infraestructura.reporting.export_excel'
  )
)
AND id_rol IN (
  SELECT id FROM auth.role WHERE code IN (
    'SOLICITANTE_INFRA','ANALISTA_ASIGNADOR_UMI','TECNICO_ELECTRICO_ESPECIALIZADO','TECNICO_UMI_MULTIPROPOSITO',
    'ADMINISTRADOR_FUNCIONAL_INFRA','ADMINISTRADOR_MODULO_INFRA','CONSULTA_CALIDAD_INFRA','SUPER_ADMIN','ADMIN','USER',
    'GESTOR_MANTENIMIENTO','ADMINISTRADOR_FUNCIONAL','UMI','INFRAESTRUCTURA','COORDINADOR_INFRAESTRUCTURA','TECNICO_UMI'
  )
);

-- 2) Borrar 27 permisos NUEVOS (mantiene históricos)
DELETE FROM auth.permission
WHERE id_module = 'd2262ff0-1b96-4751-8741-2a0fc76ee1e2'
AND code IN (
  'infraestructura.solicitud.assign','infraestructura.solicitud.reject','infraestructura.solicitud.redistribute','infraestructura.solicitud.forward_ti',
  'infraestructura.solicitud.execute_assigned','infraestructura.solicitud.close_with_evidence','infraestructura.solicitud.confirm_close_own','infraestructura.solicitud.rate_close_own',
  'infraestructura.solicitud.read_assigned','infraestructura.solicitud.read_rejection_reason_own','infraestructura.solicitud.read_ti','infraestructura.solicitud.read_audit_history_any',
  'infraestructura.solicitud.ti_tracing_full','infraestructura.solicitud.authorize_special_categories','infraestructura.estadisticas.calificaciones.consolidadas','infraestructura.reportes.gestion',
  'infraestructura.param.categories_crud','infraestructura.param.rules_edit','infraestructura.param.sla_times_edit','infraestructura.param.technicians_crud','infraestructura.param.territorial_crud',
  'infraestructura.param.approve_config','infraestructura.reporting.export_excel'
);

-- 3) Borrar los 7 ROLES oficiales NUEVOS de Tabla 5.2 ERS
DELETE FROM auth.role
WHERE code IN (
  'SOLICITANTE_INFRA','ANALISTA_ASIGNADOR_UMI','TECNICO_ELECTRICO_ESPECIALIZADO',
  'TECNICO_UMI_MULTIPROPOSITO','ADMINISTRADOR_FUNCIONAL_INFRA','ADMINISTRADOR_MODULO_INFRA','CONSULTA_CALIDAD_INFRA'
);

COMMIT;
