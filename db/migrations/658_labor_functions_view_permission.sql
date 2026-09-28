-- Separa el acceso a Funciones laborales de su gestion.
--
--   certificados-laborales.functions.view    -> ver el boton "Funciones
--       laborales", entrar al modulo y consultar la matriz (solo lectura).
--   certificados-laborales.functions.manage  -> crear, editar, eliminar y la
--       CARGA MASIVA de la Matriz Funciones ESAP.
--
-- El permiso de lectura reutiliza el registro de "Ver Dashboard"
-- (certificados-laborales.dashboard.view), que estaba inactivo y sin uso en el
-- codigo. Se renombra en vez de crear otro para no dejar basura en el catalogo.
--
-- Nadie pierde acceso: todo rol que hoy tiene functions.manage recibe tambien
-- functions.view. Ademas el backend y el frontend tratan manage como suficiente
-- para ver, de modo que el orden en que se aplique esta migracion no importa.

BEGIN;

DO $$
DECLARE
  v_module_id UUID;
  v_view_permission_id UUID;
  v_manage_permission_id UUID;
BEGIN
  SELECT id_module INTO v_module_id
  FROM auth.module
  WHERE code = 'certificados-laborales';

  IF v_module_id IS NULL THEN
    RAISE EXCEPTION 'No existe el módulo auth.module certificados-laborales';
  END IF;

  SELECT id_permission INTO v_view_permission_id
  FROM auth.permission
  WHERE code = 'certificados-laborales.functions.view';

  -- Reutiliza "Ver Dashboard" solo la primera vez. Sus asignaciones previas se
  -- desactivan: venian de un permiso inactivo que no habilitaba nada, y hacerlas
  -- valer aqui daria acceso a roles que nadie autorizo para esto.
  IF v_view_permission_id IS NULL THEN
    SELECT id_permission INTO v_view_permission_id
    FROM auth.permission
    WHERE code = 'certificados-laborales.dashboard.view';

    IF v_view_permission_id IS NOT NULL THEN
      UPDATE auth.role_permissions
      SET is_active = FALSE, updated_at = NOW()
      WHERE id_permission = v_view_permission_id
        AND COALESCE(is_active, TRUE) = TRUE;

      UPDATE auth.permission
      SET code = 'certificados-laborales.functions.view',
          name = 'Acceder a funciones laborales',
          description = 'Ver el módulo Funciones laborales y consultar la Matriz Funciones ESAP (solo lectura)',
          id_module = v_module_id,
          is_active = TRUE,
          updated_at = NOW()
      WHERE id_permission = v_view_permission_id;
    END IF;
  END IF;

  IF v_view_permission_id IS NULL THEN
    INSERT INTO auth.permission (
      id_permission, code, name, description, id_module,
      is_active, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      'certificados-laborales.functions.view',
      'Acceder a funciones laborales',
      'Ver el módulo Funciones laborales y consultar la Matriz Funciones ESAP (solo lectura)',
      v_module_id,
      TRUE,
      NOW(),
      NOW()
    )
    RETURNING id_permission INTO v_view_permission_id;
  ELSE
    UPDATE auth.permission
    SET name = 'Acceder a funciones laborales',
        description = 'Ver el módulo Funciones laborales y consultar la Matriz Funciones ESAP (solo lectura)',
        id_module = v_module_id,
        is_active = TRUE,
        updated_at = NOW()
    WHERE id_permission = v_view_permission_id;
  END IF;

  -- La gestion queda explicitamente acotada a la escritura y la carga masiva.
  UPDATE auth.permission
  SET name = 'Gestionar funciones laborales',
      description = 'Crear, editar, eliminar y ejecutar la carga masiva de la Matriz Funciones ESAP',
      is_active = TRUE,
      updated_at = NOW()
  WHERE code = 'certificados-laborales.functions.manage';

  SELECT id_permission INTO v_manage_permission_id
  FROM auth.permission
  WHERE code = 'certificados-laborales.functions.manage';

  -- Backfill: quien ya gestiona la matriz conserva el acceso al modulo.
  IF v_manage_permission_id IS NOT NULL THEN
    INSERT INTO auth.role_permissions (
      id_rol, id_permission, is_active, created_at, updated_at
    )
    SELECT role_permission.id_rol, v_view_permission_id, TRUE, NOW(), NOW()
    FROM auth.role_permissions role_permission
    WHERE role_permission.id_permission = v_manage_permission_id
      AND COALESCE(role_permission.is_active, TRUE) = TRUE
    ON CONFLICT (id_rol, id_permission) DO UPDATE SET
      is_active = TRUE,
      updated_at = NOW();
  END IF;
END $$;

COMMIT;
