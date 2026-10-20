BEGIN;
SET LOCAL search_path TO auth, public;

-- ---------------------------------------------------------------------------
-- Ajuste funcional P5:
-- El coordinador funcional de infraestructura sí puede modificar la
-- parametrización UMI y consultar reportes/indicadores consolidados.
-- Mantiene la restricción de tabs de inventario/sedes/mantenimiento en frontend.
-- ---------------------------------------------------------------------------

WITH
rol_objetivo AS (
  SELECT id
  FROM auth.role
  WHERE code = 'ADMINISTRADOR_FUNCIONAL_INFRA'
),
permisos_objetivo AS (
  SELECT id_permission, code
  FROM auth.permission
  WHERE code IN (
    'infraestructura.param.categories_crud',
    'infraestructura.param.rules_edit',
    'infraestructura.param.sla_times_edit',
    'infraestructura.param.technicians_crud',
    'infraestructura.param.approve_config',
    'infraestructura.reportes.gestion',
    'infraestructura.estadisticas.calificaciones.consolidadas',
    'infraestructura.reporting.export_excel',
    'infraestructura.solicitud.authorize_special_categories',
    'infraestructura.solicitud.read_audit_history_any',
    'infraestructura.solicitud.ti_tracing_full',
    'infraestructura.view'
  )
)
INSERT INTO auth.role_permissions (id_rol, id_permission, is_active, created_at, updated_at)
SELECT r.id, p.id_permission, true, now(), now()
FROM rol_objetivo r
JOIN permisos_objetivo p
  ON true
ON CONFLICT (id_rol, id_permission) DO UPDATE
SET is_active = EXCLUDED.is_active,
    updated_at = EXCLUDED.updated_at;

COMMIT;
