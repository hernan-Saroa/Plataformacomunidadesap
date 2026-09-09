-- ============================================
-- MIGRATION 654: Permiso de Reportes (Procesos/Etapas/Autos) para el Jefe OCID
-- ============================================
-- Nuevo permiso control-disciplinario.reportes.manage para el tab "Reportes"
-- del módulo Control Disciplinario, exclusivo del rol Jefe de la OCID.

DO $$
DECLARE
  v_module_id uuid;
BEGIN
  SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'control-disciplinario';

  IF v_module_id IS NULL THEN
    RAISE NOTICE 'Módulo control-disciplinario no existe; nada que hacer';
    RETURN;
  END IF;

  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
  VALUES
    (gen_random_uuid(), 'control-disciplinario.reportes.manage', 'Ver Submódulo Reportes', 'Permite consultar reportes consolidados de procesos, etapas, profesionales y autos, con filtros y exportación a Excel', v_module_id, true)
  ON CONFLICT (code) DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description,
        is_active = true;

  INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
  SELECT r.id, p.id_permission, true
  FROM auth.role r
  CROSS JOIN auth.permission p
  WHERE r.code = 'JEFE_DE_LA_OCID'
    AND p.code = 'control-disciplinario.reportes.manage'
  ON CONFLICT (id_rol, id_permission) DO UPDATE SET is_active = true;
END $$;
