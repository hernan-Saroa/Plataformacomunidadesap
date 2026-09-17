-- ============================================
-- MIGRATION 658: Permisos específicos por rol en Control Disciplinario
-- ============================================
-- Crea permisos identificadores por rol para filtrar acciones sin usar nombres o códigos de rol:
-- 1. 'control-disciplinario.es_jefe_ocid' ('es jefe_ocid') -> Asignado a JEFE_DE_LA_OCID, SUPER_ADMIN, ADMIN
-- 2. 'control-disciplinario.es_radicador' ('es radicador') -> Asignado a SECRETARIA_RADICADOR, RADICADOR_DISCIPLINARIO
-- 3. 'control-disciplinario.es_profesional' ('es profesional') -> Asignado a PROFESIONAL, PROFESIONAL_SUSTANCIADOR, PROFESIONAL_ASIGNADO

DO $$
DECLARE
  v_module_id uuid;
  v_jefe_perm_id uuid;
  v_radicador_perm_id uuid;
  v_profesional_perm_id uuid;
BEGIN
  SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'control-disciplinario';

  -- 1. Permiso 'es jefe_ocid'
  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
  VALUES (
    gen_random_uuid(),
    'control-disciplinario.es_jefe_ocid',
    'es jefe_ocid',
    'Identifica si el usuario tiene rol/perfil de Jefe OCID para filtrado de acciones y permisos',
    v_module_id,
    true
  )
  ON CONFLICT (code) DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description,
        is_active = true
  RETURNING id_permission INTO v_jefe_perm_id;

  IF v_jefe_perm_id IS NULL THEN
    SELECT id_permission INTO v_jefe_perm_id FROM auth.permission WHERE code = 'control-disciplinario.es_jefe_ocid';
  END IF;

  -- 2. Permiso 'es radicador'
  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
  VALUES (
    gen_random_uuid(),
    'control-disciplinario.es_radicador',
    'es radicador',
    'Identifica si el usuario tiene rol/perfil de Radicador para filtrado de acciones y permisos',
    v_module_id,
    true
  )
  ON CONFLICT (code) DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description,
        is_active = true
  RETURNING id_permission INTO v_radicador_perm_id;

  IF v_radicador_perm_id IS NULL THEN
    SELECT id_permission INTO v_radicador_perm_id FROM auth.permission WHERE code = 'control-disciplinario.es_radicador';
  END IF;

  -- 3. Permiso 'es profesional'
  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
  VALUES (
    gen_random_uuid(),
    'control-disciplinario.es_profesional',
    'es profesional',
    'Identifica si el usuario tiene rol/perfil de Profesional Disciplinario para filtrado de acciones y permisos',
    v_module_id,
    true
  )
  ON CONFLICT (code) DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description,
        is_active = true
  RETURNING id_profesional_perm_id;

  IF v_profesional_perm_id IS NULL THEN
    SELECT id_permission INTO v_profesional_perm_id FROM auth.permission WHERE code = 'control-disciplinario.es_profesional';
  END IF;

  -- 4. Asignar 'control-disciplinario.es_jefe_ocid' a roles correspondientes
  INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
  SELECT r.id, v_jefe_perm_id, true
  FROM auth.role r
  WHERE r.code IN ('JEFE_DE_LA_OCID', 'JEFE_OCID', 'JEFE_OFICINA_INTERNO', 'JEFE_DE_LA_OFICINA_DISCIPLINARIA')
  ON CONFLICT (id_rol, id_permission) DO UPDATE SET is_active = true;

  -- 5. Asignar 'control-disciplinario.es_radicador' a roles correspondientes
  INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
  SELECT r.id, v_radicador_perm_id, true
  FROM auth.role r
  WHERE r.code IN ('SECRETARIA_RADICADOR', 'RADICADOR_DISCIPLINARIO', 'SECRETARIO_RADICADOR', 'RADICADOR')
  ON CONFLICT (id_rol, id_permission) DO UPDATE SET is_active = true;

  -- 6. Asignar 'control-disciplinario.es_profesional' a roles correspondientes
  INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
  SELECT r.id, v_profesional_perm_id, true
  FROM auth.role r
  WHERE r.code IN ('PROFESIONAL', 'PROFESIONAL_SUSTANCIADOR', 'PROFESIONAL_ASIGNADO', 'ABOGADO_DISCIPLINARIO')
  ON CONFLICT (id_rol, id_permission) DO UPDATE SET is_active = true;

  RAISE NOTICE 'Permisos específicos creados y asignados: es jefe_ocid, es radicador, es profesional';
END $$;
