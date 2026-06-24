-- ============================================================
-- Migración 361: Agregar permiso para eliminar roles personalizados
-- ============================================================

BEGIN;

DO $$
DECLARE
  v_module_id UUID;
  v_perm_id UUID;
  v_rol_jefe_oci UUID;
BEGIN
  -- Buscar el ID del módulo 'control-interno'
  SELECT id_module INTO v_module_id
  FROM auth.module
  WHERE code = 'control-interno';

  -- Validar que el módulo existe
  IF v_module_id IS NULL THEN
    RAISE EXCEPTION 'El módulo "control-interno" no existe en auth.module.';
  END IF;

  -- Generar ID para el nuevo permiso
  v_perm_id := gen_random_uuid();

  -- Insertar el permiso en auth.permission si no existe
  IF NOT EXISTS (SELECT 1 FROM auth.permission WHERE code = 'control-interno.roles.delete') THEN
    INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
    VALUES (
      v_perm_id,
      'control-interno.roles.delete',
      'Eliminar Rol Personalizado',
      'Permite eliminar un rol personalizado en el plan anual de auditoría',
      v_module_id,
      true,
      NOW(),
      NOW()
    );
  ELSE
    SELECT id_permission INTO v_perm_id FROM auth.permission WHERE code = 'control-interno.roles.delete';
  END IF;

  -- Buscar el ID del rol JEFE_OCI
  SELECT id INTO v_rol_jefe_oci
  FROM auth.role
  WHERE code = 'JEFE_OCI';

  -- Asignar el permiso al rol JEFE_OCI si ambos existen y no están asociados ya
  IF v_rol_jefe_oci IS NOT NULL AND v_perm_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM auth.role_permissions WHERE id_rol = v_rol_jefe_oci AND id_permission = v_perm_id) THEN
      INSERT INTO auth.role_permissions (id_rol, id_permission)
      VALUES (v_rol_jefe_oci, v_perm_id);
    END IF;
  END IF;

END $$;

COMMIT;
