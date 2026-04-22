-- ============================================
-- AGREGAR PERMISOS DE SEGUIMIENTO PARA PROFESIONAL_AUDITOR
-- ============================================
-- Ejecutar en: esap_db (schema auth)
-- Fecha: 20/04/2026
-- Propósito: Permitir que Diana Martinez y otros auditores puedan
--   ver el plan, completar tareas, agregar observaciones y adjuntos

-- 1) Crear los permisos si no existen
INSERT INTO auth.permission (code, name, description, module)
VALUES 
  ('control-interno.plan-anual.view', 'Ver Plan Anual', 'Ver el plan anual y sus actividades', 'control-interno'),
  ('control-interno.plan-anual.follow-up', 'Seguimiento Plan Anual', 'Completar tareas, agregar observaciones y adjuntos', 'control-interno'),
  ('control-interno.auditoria.view', 'Ver Auditorías', 'Ver listado de auditorías asignadas', 'control-interno')
ON CONFLICT (code) DO NOTHING;

-- 2) Asignar al rol PROFESIONAL_AUDITOR
INSERT INTO auth.role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM auth.role r
CROSS JOIN auth.permission p
WHERE r.code = 'PROFESIONAL_AUDITOR'
  AND p.code IN (
    'control-interno.plan-anual.view',
    'control-interno.plan-anual.follow-up',
    'control-interno.auditoria.view'
  )
ON CONFLICT DO NOTHING;

-- 3) Verificar
SELECT r.code AS rol, p.code AS permiso, p.name
FROM auth.role_permission rp
JOIN auth.role r ON r.id = rp.role_id
JOIN auth.permission p ON p.id = rp.permission_id
WHERE r.code = 'PROFESIONAL_AUDITOR'
  AND p.code LIKE 'control-interno.%'
ORDER BY p.code;
