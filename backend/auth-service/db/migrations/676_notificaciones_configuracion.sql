SET client_encoding = 'UTF8';

-- ============================================================================
-- 676: Consola de configuración de notificaciones (EFDS-2406)
-- ============================================================================
-- La campana y el correo reciben los avisos de todos los módulos sin que nadie
-- pueda apagarlos. Esta migración registra lo que la consola necesita en el
-- esquema auth; el catálogo de módulos y eventos vive en el esquema
-- notifications (migración 002 del notifications-service).
--
--   * El módulo `notificaciones`, para que la consola aparezca en el menú de
--     Configuración General y se pueda apagar desde Gestión de módulos.
--   * El permiso "Configuración de Notificaciones" (RN1), asignable desde
--     Roles y Permisos. Aquí solo se le da al Super Administrador para que
--     alguien pueda empezar; a quién más, lo decide la entidad.
-- ============================================================================

DO $$
DECLARE
  v_module_id UUID;
BEGIN
  INSERT INTO auth.module (code, name, description, icon, color, display_order, category, is_active)
  VALUES (
    'notificaciones',
    'Notificaciones',
    'Qué avisa cada módulo, por qué canal y a quién',
    'Bell',
    '#003DA5',
    23,
    'backoffice',
    true
  )
  ON CONFLICT (code) DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description;

  SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'notificaciones';

  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
  VALUES (
    gen_random_uuid(),
    'notificaciones.configuracion.gestionar',
    'Configuración de Notificaciones',
    'Entrar a Configuración General > Notificaciones: activar o desactivar módulos y eventos, elegir el canal, la prioridad, los destinatarios adicionales y enviar pruebas',
    v_module_id,
    true
  )
  ON CONFLICT (code) DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description,
        id_module = EXCLUDED.id_module,
        is_active = true;

  INSERT INTO auth.role_permissions (id_rol, id_permission, is_active, created_at, updated_at)
  SELECT r.id, p.id_permission, true, NOW(), NOW()
    FROM auth.role r
    JOIN auth.permission p ON p.code = 'notificaciones.configuracion.gestionar'
   WHERE UPPER(r.code) = 'SUPER_ADMIN'
     AND NOT EXISTS (
       SELECT 1
         FROM auth.role_permissions rp
        WHERE rp.id_rol = r.id
          AND rp.id_permission = p.id_permission
     );
END $$;
