-- =============================================================================
-- Migration 373: Permiso dedicado de "Carga Masiva" para Graduados
-- -----------------------------------------------------------------------------
-- Crea el permiso individual `graduates.bulk_upload` dentro del modulo
-- `graduates` (Verificacion de Titulos > Graduados). Este permiso controla,
-- de forma independiente, la visibilidad del boton "Carga Masiva" y la
-- funcionalidad de carga masiva en el modulo de Gestion de Graduados.
--
-- Para no romper ningun flujo existente: hasta ahora el boton "Carga Masiva"
-- se mostraba a cualquier rol con `graduates.edit`. Esta migracion otorga el
-- nuevo permiso a todos los roles que actualmente tienen `graduates.edit`
-- activo (incluidos Jefe, Aprobador y Revisor de Verificacion de Titulos), de
-- modo que conserven la capacidad actual y luego puedan activarlo/desactivarlo
-- individualmente desde "Roles y Permisos".
-- =============================================================================

DO $$
DECLARE
  v_graduates_module_id UUID;
  v_bulk_permission_id  UUID;
BEGIN
  SELECT id_module INTO v_graduates_module_id
  FROM auth.module
  WHERE code = 'graduates';

  IF v_graduates_module_id IS NULL THEN
    RAISE EXCEPTION 'No existe el modulo auth.module con code = ''graduates''. Ejecute primero la migracion 218.';
  END IF;

  -- 1) Crear (o actualizar) el permiso dedicado.
  INSERT INTO auth.permission (
    id_permission,
    code,
    name,
    description,
    id_module,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    'graduates.bulk_upload',
    'Carga Masiva',
    'Permite mostrar el boton y realizar la carga masiva de graduados',
    v_graduates_module_id,
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (code) DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description,
        id_module = EXCLUDED.id_module,
        is_active = true,
        updated_at = NOW();

  SELECT id_permission INTO v_bulk_permission_id
  FROM auth.permission
  WHERE code = 'graduates.bulk_upload';

  -- 2) Conservar el comportamiento actual: otorgar el nuevo permiso a todos los
  --    roles que hoy tienen `graduates.edit` activo (asi Jefe, Aprobador y
  --    Revisor y cualquier otro rol con esa capacidad no pierden la carga masiva).
  INSERT INTO auth.role_permissions (
    id_rol,
    id_permission,
    is_active,
    created_at,
    updated_at
  )
  SELECT DISTINCT rp.id_rol, v_bulk_permission_id, true, NOW(), NOW()
  FROM auth.role_permissions rp
  JOIN auth.permission pe ON pe.id_permission = rp.id_permission
  WHERE pe.code = 'graduates.edit'
    AND rp.is_active = true
  ON CONFLICT (id_rol, id_permission) DO UPDATE
    SET is_active = true,
        updated_at = NOW();
END $$;
