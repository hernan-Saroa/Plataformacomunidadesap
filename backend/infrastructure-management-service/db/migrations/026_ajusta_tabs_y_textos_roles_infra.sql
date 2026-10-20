BEGIN;
SET LOCAL search_path TO auth, public;

-- ---------------------------------------------------------------------------
-- Alinear textos visibles de reglas de escalamiento sin referencias internas.
-- ---------------------------------------------------------------------------
UPDATE "infrastructure-management".catalogo_item
SET
  nombre = 'Asignación especializada para solicitudes eléctricas',
  descripcion = 'Para la categoría CS_002 se sugiere el técnico especialista configurado en la regla.'
WHERE catalogo = 'REGLA_ESCALAMIENTO'
  AND codigo = 'REG_001_CATEGORIA_48_ELECTRICAS';

UPDATE "infrastructure-management".catalogo_item
SET
  nombre = 'Asignación por menor carga para categorías generales',
  descripcion = 'Para las demás categorías configuradas se sugiere el técnico con menor carga vigente. La coordinación puede reasignar manualmente.'
WHERE catalogo = 'REGLA_ESCALAMIENTO'
  AND codigo = 'REG_002_EQUIDAD_OTRAS_7_CATEGORIAS';

-- ---------------------------------------------------------------------------
-- Reajustar matriz de permisos para tabs iniciales:
-- P1  = sin reportes.
-- P5  = categorías + parámetros (solo aprobación) + reportes. Sin inventario ni mantenimiento.
-- P6  = solo categorías + parámetros UMI. Sin reportes, sedes ni mantenimiento.
-- ---------------------------------------------------------------------------
WITH roles_objetivo AS (
  SELECT id, code
  FROM auth.role
  WHERE code IN (
    'SOLICITANTE_INFRA',
    'ADMINISTRADOR_FUNCIONAL_INFRA',
    'ADMINISTRADOR_MODULO_INFRA'
  )
),
permisos_infra AS (
  SELECT id_permission, code
  FROM auth.permission
  WHERE code LIKE 'infraestructura.%'
)
DELETE FROM auth.role_permissions rp
USING roles_objetivo r, permisos_infra p
WHERE rp.id_rol = r.id
  AND rp.id_permission = p.id_permission;

WITH
roles_objetivo AS (
  SELECT id, code
  FROM auth.role
  WHERE code IN (
    'SOLICITANTE_INFRA',
    'ADMINISTRADOR_FUNCIONAL_INFRA',
    'ADMINISTRADOR_MODULO_INFRA'
  )
),
permisos_objetivo AS (
  SELECT id_permission, code
  FROM auth.permission
  WHERE code IN (
    'infraestructura.view',
    'infraestructura.solicitud.create',
    'infraestructura.solicitud.read_own',
    'infraestructura.solicitud.read_rejection_reason_own',
    'infraestructura.solicitud.confirm_close_own',
    'infraestructura.solicitud.rate_close_own',
    'infraestructura.solicitud.read_audit_history_any',
    'infraestructura.solicitud.ti_tracing_full',
    'infraestructura.solicitud.authorize_special_categories',
    'infraestructura.estadisticas.calificaciones.consolidadas',
    'infraestructura.reportes.gestion',
    'infraestructura.reporting.export_excel',
    'infraestructura.param.categories_crud',
    'infraestructura.param.rules_edit',
    'infraestructura.param.sla_times_edit',
    'infraestructura.param.technicians_crud',
    'infraestructura.param.approve_config'
  )
),
matrix(rol_code, perm_code) AS (
  VALUES
    ('SOLICITANTE_INFRA', 'infraestructura.view'),
    ('SOLICITANTE_INFRA', 'infraestructura.solicitud.create'),
    ('SOLICITANTE_INFRA', 'infraestructura.solicitud.read_own'),
    ('SOLICITANTE_INFRA', 'infraestructura.solicitud.read_rejection_reason_own'),
    ('SOLICITANTE_INFRA', 'infraestructura.solicitud.confirm_close_own'),
    ('SOLICITANTE_INFRA', 'infraestructura.solicitud.rate_close_own'),

    ('ADMINISTRADOR_FUNCIONAL_INFRA', 'infraestructura.view'),
    ('ADMINISTRADOR_FUNCIONAL_INFRA', 'infraestructura.solicitud.read_audit_history_any'),
    ('ADMINISTRADOR_FUNCIONAL_INFRA', 'infraestructura.solicitud.ti_tracing_full'),
    ('ADMINISTRADOR_FUNCIONAL_INFRA', 'infraestructura.solicitud.authorize_special_categories'),
    ('ADMINISTRADOR_FUNCIONAL_INFRA', 'infraestructura.estadisticas.calificaciones.consolidadas'),
    ('ADMINISTRADOR_FUNCIONAL_INFRA', 'infraestructura.reportes.gestion'),
    ('ADMINISTRADOR_FUNCIONAL_INFRA', 'infraestructura.reporting.export_excel'),
    ('ADMINISTRADOR_FUNCIONAL_INFRA', 'infraestructura.param.approve_config'),

    ('ADMINISTRADOR_MODULO_INFRA', 'infraestructura.view'),
    ('ADMINISTRADOR_MODULO_INFRA', 'infraestructura.param.categories_crud'),
    ('ADMINISTRADOR_MODULO_INFRA', 'infraestructura.param.rules_edit'),
    ('ADMINISTRADOR_MODULO_INFRA', 'infraestructura.param.sla_times_edit'),
    ('ADMINISTRADOR_MODULO_INFRA', 'infraestructura.param.technicians_crud')
)
INSERT INTO auth.role_permissions (id_rol, id_permission, is_active, created_at, updated_at)
SELECT r.id, p.id_permission, true, now(), now()
FROM matrix m
JOIN roles_objetivo r
  ON r.code = m.rol_code
JOIN permisos_objetivo p
  ON p.code = m.perm_code
ON CONFLICT (id_rol, id_permission) DO UPDATE
SET is_active = EXCLUDED.is_active,
    updated_at = EXCLUDED.updated_at;

COMMIT;
