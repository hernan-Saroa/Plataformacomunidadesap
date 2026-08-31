-- ============================================================================
-- Migration: 003_seed_travel_expenses_permissions.sql
-- Description: Crear rol ENLACE_DEPENDENCIA y permiso travel_expenses:create_request
-- ============================================================================

DO $$
DECLARE
    v_role_id UUID;
    v_permission_id UUID;
    v_module_id UUID;
BEGIN
    SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'viaticos';

    IF v_module_id IS NULL THEN
        RAISE EXCEPTION 'Módulo viaticos no encontrado en auth.module';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM auth.role WHERE code = 'ENLACE_DEPENDENCIA') THEN
        INSERT INTO auth.role (id, code, name, description, icon, color, type, sistema_destino, category, is_active, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            'ENLACE_DEPENDENCIA',
            'Enlace de Dependencia',
            'Usuario enlace encargado de radicar solicitudes de comisión y gestionar trámites de viáticos.',
            'UserCheck',
            '#003DA5',
            'sistema',
            'backoffice',
            'backoffice',
            true,
            NOW(),
            NOW()
        );
        RAISE NOTICE 'Rol ENLACE_DEPENDENCIA creado';
    END IF;

    SELECT id INTO v_role_id FROM auth.role WHERE code = 'ENLACE_DEPENDENCIA';

    IF NOT EXISTS (SELECT 1 FROM auth.permission WHERE code = 'travel_expenses:create_request') THEN
        INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            'travel_expenses:create_request',
            'Radicar solicitud de comisión',
            'Permite radicar nuevas solicitudes de comisión (Formato 023) en el módulo de viáticos.',
            v_module_id,
            true,
            NOW(),
            NOW()
        );
        RAISE NOTICE 'Permiso travel_expenses:create_request creado';
    END IF;

    SELECT id_permission INTO v_permission_id FROM auth.permission WHERE code = 'travel_expenses:create_request';

    IF NOT EXISTS (
        SELECT 1 FROM auth.role_permissions WHERE id_rol = v_role_id AND id_permission = v_permission_id
    ) THEN
        INSERT INTO auth.role_permissions (id_rol, id_permission)
        VALUES (v_role_id, v_permission_id);
        RAISE NOTICE 'Permiso asignado al rol ENLACE_DEPENDENCIA';
    END IF;
END $$;
