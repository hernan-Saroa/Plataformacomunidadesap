-- ============================================================================
-- permision_enlace_v1.sql
-- Description: Crear el permiso travel_expenses:view_own_requests
--              (ver solo las solicitudes radicadas por el propio usuario)
--              y asignarlo al rol ENLACE_DEPENDENCIA.
--              NOTA: La creación del rol y del permiso create_request
--              ya se realiza en otra migración. Idempotente.
-- ============================================================================

DO $$
DECLARE
    v_role_id UUID;
    v_permission_view_id UUID;
    v_module_id UUID;
BEGIN
    SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'viaticos';

    IF v_module_id IS NULL THEN
        RAISE EXCEPTION 'Módulo viaticos no encontrado en auth.module. Ejecute primero 001_module.sql';
    END IF;

    SELECT id INTO v_role_id FROM auth.role WHERE code = 'ENLACE_DEPENDENCIA';

    IF v_role_id IS NULL THEN
        RAISE EXCEPTION 'Rol ENLACE_DEPENDENCIA no encontrado. Ejecute primero la migración que lo crea.';
    END IF;

    -- Permiso: ver solo las solicitudes radicadas por el usuario
    IF NOT EXISTS (SELECT 1 FROM auth.permission WHERE code = 'travel_expenses:view_own_requests') THEN
        INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            'travel_expenses:view_own_requests',
            'Ver solicitudes radicadas',
            'Permite consultar únicamente las solicitudes de comisión que el propio usuario ha radicado.',
            v_module_id,
            true,
            NOW(),
            NOW()
        );
        RAISE NOTICE 'Permiso travel_expenses:view_own_requests creado';
    END IF;

    SELECT id_permission INTO v_permission_view_id FROM auth.permission WHERE code = 'travel_expenses:view_own_requests';

    -- Asociación rol -> permiso: view_own_requests
    IF NOT EXISTS (
        SELECT 1 FROM auth.role_permissions WHERE id_rol = v_role_id AND id_permission = v_permission_view_id
    ) THEN
        INSERT INTO auth.role_permissions (id_rol, id_permission)
        VALUES (v_role_id, v_permission_view_id);
        RAISE NOTICE 'Permiso travel_expenses:view_own_requests asignado al rol ENLACE_DEPENDENCIA';
    END IF;
END $$;