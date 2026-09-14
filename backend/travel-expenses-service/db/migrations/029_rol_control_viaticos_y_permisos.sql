SET client_encoding = 'UTF8';

-- ============================================================================
-- Migration: 429_rol_control_viaticos_y_permisos.sql
-- Created: 2026-09-09
-- Description: RF-REV-002 — Registra el rol técnico CONTROL_VIATICOS y sus
--              permisos RBAC para la segunda revisión de solicitudes SIIF.
-- ============================================================================

DO $$
DECLARE
    v_role_id UUID;
    v_module_id UUID;
    v_permission_read_siif_requested_id UUID;
    v_permission_double_check_request_id UUID;
    v_permission_return_to_analyst_id UUID;
    v_permission_wildcard_id UUID;
BEGIN
    SELECT id_module INTO v_module_id
    FROM auth.module
    WHERE code = 'viaticos';

    IF v_module_id IS NULL THEN
        RAISE EXCEPTION 'Modulo viaticos no encontrado en auth.module. Ejecute primero la migracion del modulo.';
    END IF;

    -- Registrar el rol tecnico de Control Viaticos si aun no existe.
    SELECT id INTO v_role_id
    FROM auth.role
    WHERE code = 'CONTROL_VIATICOS';

    IF v_role_id IS NULL THEN
        INSERT INTO auth.role (
            id,
            code,
            name,
            description,
            category,
            icon,
            color,
            type,
            is_active,
            created_at,
            updated_at
        )
        VALUES (
            gen_random_uuid(),
            'CONTROL_VIATICOS',
            'Control Viaticos',
            'Rol encargado de ejecutar la segunda revision y el control cruzado de solicitudes exportadas a SIIF.',
            'control',
            'ShieldCheck',
            '#059669',
            'sistema',
            true,
            NOW(),
            NOW()
        )
        RETURNING id INTO v_role_id;
        RAISE NOTICE 'Rol CONTROL_VIATICOS creado';
    END IF;

    -- Permiso: consultar la bandeja de solicitudes en estado SOLICITADA_SIIF.
    SELECT id_permission INTO v_permission_read_siif_requested_id
    FROM auth.permission
    WHERE code = 'travel_expenses:read_siif_requested';

    IF v_permission_read_siif_requested_id IS NULL THEN
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
            'travel_expenses:read_siif_requested',
            'Ver bandeja de solicitudes solicitadas a SIIF',
            'Permite consultar solicitudes en estado SOLICITADA_SIIF para la segunda revision.',
            v_module_id,
            true,
            NOW(),
            NOW()
        )
        RETURNING id_permission INTO v_permission_read_siif_requested_id;
        RAISE NOTICE 'Permiso travel_expenses:read_siif_requested creado';
    END IF;

    -- Permiso: aprobar la segunda revision y transicionar a VERIFICADA.
    SELECT id_permission INTO v_permission_double_check_request_id
    FROM auth.permission
    WHERE code = 'travel_expenses:double_check_request';

    IF v_permission_double_check_request_id IS NULL THEN
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
            'travel_expenses:double_check_request',
            'Aprobar segunda revision de control viaticos',
            'Permite aprobar una solicitud SOLICITADA_SIIF y transicionarla a VERIFICADA.',
            v_module_id,
            true,
            NOW(),
            NOW()
        )
        RETURNING id_permission INTO v_permission_double_check_request_id;
        RAISE NOTICE 'Permiso travel_expenses:double_check_request creado';
    END IF;

    -- Permiso: devolver la solicitud al analista con observaciones.
    SELECT id_permission INTO v_permission_return_to_analyst_id
    FROM auth.permission
    WHERE code = 'travel_expenses:return_to_analyst';

    IF v_permission_return_to_analyst_id IS NULL THEN
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
            'travel_expenses:return_to_analyst',
            'Devolver solicitud al analista desde control viaticos',
            'Permite devolver una solicitud SOLICITADA_SIIF al analista asignado con observaciones.',
            v_module_id,
            true,
            NOW(),
            NOW()
        )
        RETURNING id_permission INTO v_permission_return_to_analyst_id;
        RAISE NOTICE 'Permiso travel_expenses:return_to_analyst creado';
    END IF;

    -- Vincular los permisos especificos al rol CONTROL_VIATICOS.
    INSERT INTO auth.role_permissions (id_rol, id_permission)
    VALUES
        (v_role_id, v_permission_read_siif_requested_id),
        (v_role_id, v_permission_double_check_request_id),
        (v_role_id, v_permission_return_to_analyst_id)
    ON CONFLICT (id_rol, id_permission) DO NOTHING;

    RAISE NOTICE 'Permisos de segunda revision asignados al rol CONTROL_VIATICOS';

    -- Los roles administrativos conservan el comodin existente del modulo.
    SELECT id_permission INTO v_permission_wildcard_id
    FROM auth.permission
    WHERE code = 'travel_expenses:*';

    IF v_permission_wildcard_id IS NOT NULL THEN
        INSERT INTO auth.role_permissions (id_rol, id_permission)
        SELECT r.id, v_permission_wildcard_id
        FROM auth.role r
        WHERE UPPER(r.code) IN ('SUPER_ADMIN', 'ADMIN', 'ADMINISTRATIVO', 'SUPER_ADMINISTRADOR')
        ON CONFLICT (id_rol, id_permission) DO NOTHING;

        RAISE NOTICE 'Comodin travel_expenses:* asegurado para roles administrativos';
    END IF;
END $$;
