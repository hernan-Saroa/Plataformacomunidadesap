-- ============================================
-- 192: Asignar permisos de seguimiento al rol PROFESIONAL_AUDITOR
-- ============================================
-- Propósito: Los profesionales OCI (como Diana Martinez) necesitan
-- ver el plan anual y completar tareas de seguimiento con evidencias
-- sin tener permisos de edición completa del plan.
--
-- Permisos ya existen en auth.permission (creados por migración 177).
-- Esta migración solo los ASIGNA al rol.
-- ============================================

BEGIN;

-- Asignar permisos de seguimiento a todos los roles OCI que lo necesitan
-- (PROFESIONAL_AUDITOR, auditor, auditor-senior, apoyo-tecnico, auditor-junior)
INSERT INTO auth.role_permissions (id_rol, id_permission)
SELECT r.id, p.id_permission
FROM auth.role r
CROSS JOIN auth.permission p
WHERE r.code IN ('PROFESIONAL_AUDITOR', 'auditor', 'auditor-senior', 'auditor-junior', 'apoyo-tecnico')
  AND p.code IN (
    'control-interno.plan-anual.view',
    'control-interno.plan-anual.follow-up',
    'control-interno.auditoria.view'
  )
  AND NOT EXISTS (
    SELECT 1 FROM auth.role_permissions rp 
    WHERE rp.id_rol = r.id AND rp.id_permission = p.id_permission
  );

-- Verificación
SELECT r.code AS rol, p.code AS permiso, p.name
FROM auth.role_permissions rp
JOIN auth.role r ON r.id = rp.id_rol
JOIN auth.permission p ON p.id_permission = rp.id_permission
WHERE r.code IN ('PROFESIONAL_AUDITOR', 'auditor', 'auditor-senior', 'auditor-junior', 'apoyo-tecnico')
  AND p.code LIKE 'control-interno.plan-anual%'
ORDER BY r.code, p.code;

COMMIT;
