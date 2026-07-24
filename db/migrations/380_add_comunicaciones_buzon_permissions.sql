-- Migration 380: Permisos de acceso por buzón en el Centro de Comunicaciones (Gestión Legal)
--
-- Contexto: hoy los 4 permisos del Centro de Comunicaciones habilitan acciones
-- funcionales (manage / create / leido / archivar) pero NO parametrizan a qué buzón
-- institucional accede cada usuario, por lo que cualquier usuario con acceso ve y
-- gestiona tanto el buzón Judicial como el buzón Correos (Institucional).
--
-- Esta migración agrega dos permisos que segregan el acceso por buzón. Para no romper
-- el acceso actual, se otorgan AMBOS buzones a todo rol que ya administra el Centro de
-- Comunicaciones (poseedores de gestion-legal.comunicaciones.manage). Desde el editor de
-- roles cada rol puede luego restringirse a un solo buzón según sus funciones.

DO $$
DECLARE
    v_module_id uuid;
BEGIN
    SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'gestion-legal';

    IF v_module_id IS NULL THEN
        RAISE EXCEPTION 'Module gestion-legal not found';
    END IF;

    -- 1. Crear los permisos de acceso por buzón (grupo 'comunicaciones' → se agrupan
    --    junto a los demás permisos del Centro de Comunicaciones en el editor de roles).
    INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
    VALUES
        (gen_random_uuid(), 'gestion-legal.comunicaciones.buzon.judicial', 'Acceso a Buzón Judicial', 'Permite consultar y gestionar las comunicaciones del buzón Judicial en el Centro de Comunicaciones', v_module_id, true),
        (gen_random_uuid(), 'gestion-legal.comunicaciones.buzon.correos', 'Acceso a Buzón Correos (Institucional)', 'Permite consultar y gestionar las comunicaciones del buzón Correos (Institucional) en el Centro de Comunicaciones', v_module_id, true)
    ON CONFLICT (code) DO NOTHING;

    -- 2. Backward-compat: todo rol que hoy administra el Centro de Comunicaciones
    --    conserva acceso a ambos buzones (evita bloqueo por la nueva parametrización).
    INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
    SELECT rp.id_rol, p_new.id_permission, true
    FROM auth.role_permissions rp
    JOIN auth.permission p_manage
        ON p_manage.id_permission = rp.id_permission
        AND p_manage.code = 'gestion-legal.comunicaciones.manage'
    JOIN auth.permission p_new
        ON p_new.code IN (
            'gestion-legal.comunicaciones.buzon.judicial',
            'gestion-legal.comunicaciones.buzon.correos'
        )
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Permisos de buzón (Judicial / Correos) creados y otorgados a los roles con acceso al Centro de Comunicaciones';
END $$;
