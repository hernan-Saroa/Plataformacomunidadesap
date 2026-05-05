-- ============================================
-- MIGRATION: Add restore permissions for disciplinary control
-- ============================================

DO $$
DECLARE
  v_module_id uuid;
BEGIN
  -- Obtener ID del módulo
  SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'control-disciplinario';
  
  IF v_module_id IS NULL THEN
    RAISE EXCEPTION 'Module control-disciplinario not found';
  END IF;

  -- Insertar permisos de restauración
  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
  VALUES 
    (gen_random_uuid(), 'control-disciplinario.procesos.restaurar', 'Restaurar Procesos', 'Permite restaurar procesos disciplinarios desde estado archivado', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.noticia-disciplinaria.restaurar', 'Restaurar Noticias', 'Permite restaurar noticias disciplinarias desde estado archivado', v_module_id, true),
    (gen_random_uuid(), 'control-disciplinario.noticia-disciplinaria.restaurar_mine', 'Restaurar Mis Noticias', 'Permite restaurar únicamente las noticias propias que fueron archivadas', v_module_id, true)
  ON CONFLICT (code) DO UPDATE 
    SET name = EXCLUDED.name,
        description = EXCLUDED.description;

  -- Asignar permisos al rol JEFE_DE_LA_OCID (todos los permisos de restauración)
  INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
  SELECT r.id, p.id_permission, true
  FROM auth.role r
  CROSS JOIN auth.permission p
  WHERE r.code = 'JEFE_DE_LA_OCID' 
    AND p.code IN (
      'control-disciplinario.procesos.restaurar',
      'control-disciplinario.noticia-disciplinaria.restaurar'
    )
  ON CONFLICT (id_rol, id_permission) DO UPDATE SET is_active = true;

  -- Asignar permiso de restaurar mis noticias al rol SECRETARIA_RADICADOR
  INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
  SELECT r.id, p.id_permission, true
  FROM auth.role r
  CROSS JOIN auth.permission p
  WHERE r.code = 'SECRETARIA_RADICADOR' 
    AND p.code = 'control-disciplinario.noticia-disciplinaria.restaurar_mine'
  ON CONFLICT (id_rol, id_permission) DO UPDATE SET is_active = true;

END $$;