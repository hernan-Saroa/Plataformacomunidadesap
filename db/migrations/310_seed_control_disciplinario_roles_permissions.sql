-- ============================================
-- MIGRATION: Roles y Permisos para Control Disciplinario
-- ============================================

DO $$
DECLARE
  v_module_id uuid;
BEGIN
  -- Obtener ID del módulo
  SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'control-disciplinario';
  
  IF v_module_id IS NULL THEN
    INSERT INTO auth.module (id_module, code, name, description, icon, color, priority, context, is_active)
    VALUES (gen_random_uuid(), 'control-disciplinario', 'Control Disciplinario', 'Control Disciplinario', 'Scale', '#003DA5', 1, 'backoffice', true)
    ON CONFLICT (code) DO NOTHING;
    
    SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'control-disciplinario';
  END IF;

  -- 1. Crear Roles
  INSERT INTO auth.role (id, code, name, description, category, icon, color, type, is_active)
  VALUES 
    (gen_random_uuid(), 'JEFE_DE_LA_OCID', 'Jefe OCID', 'Jefe de la Oficina de Control Disciplinario Interno', 'directivo', 'Shield', '#DC2626', 'sistema', true),
    (gen_random_uuid(), 'SECRETARIA_RADICADOR', 'Radicador Disciplinario', 'Secretaría o Radicador de Procesos Disciplinarios', 'administrativo', 'Inbox', '#2563EB', 'sistema', true),
    (gen_random_uuid(), 'PROFESIONAL', 'Profesional Disciplinario', 'Profesional a cargo de expedientes y procesos', 'administrativo', 'FileCheck', '#10B981', 'sistema', true)
  ON CONFLICT DO NOTHING;

  -- Asignar acceso al backoffice general
  INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
  SELECT r.id, p.id_permission, true
  FROM auth.role r
  CROSS JOIN auth.permission p
  WHERE r.code IN ('JEFE_DE_LA_OCID', 'SECRETARIA_RADICADOR', 'PROFESIONAL')
    AND p.code = 'system.access_backoffice'
  ON CONFLICT (id_rol, id_permission) DO UPDATE SET is_active = true;

END $$;
