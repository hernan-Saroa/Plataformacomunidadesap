SET client_encoding = 'UTF8';

-- ============================================================================
-- Migration: 034_autorizacion_extemporanea_direccion_nacional.sql
-- Created: 2026-09-11
-- Description: RF-AUT-002 (Etapa 6 — Autorizar comisiones extemporáneas).
--              Registra el rol directivo DIRECCION_NACIONAL y sus permisos RBAC.
--              Agrega columnas de trazabilidad y delegación para la autorización
--              excepcional de comisiones radicadas con menos de 14 días hábiles.
-- ============================================================================

DO $$
DECLARE
    v_role_id UUID;
    v_module_id UUID;
    v_permission_read_extemp_id UUID;
    v_permission_auth_extemp_id UUID;
    v_permission_reject_extemp_id UUID;
    v_permission_wildcard_id UUID;
BEGIN
    SELECT id_module INTO v_module_id
    FROM auth.module
    WHERE code = 'viaticos';

    IF v_module_id IS NULL THEN
        RAISE EXCEPTION 'Modulo viaticos no encontrado en auth.module. Ejecute primero la migracion base del modulo.';
    END IF;

    -- ========================================================================
    -- 1. Rol: DIRECCION_NACIONAL
    -- ========================================================================
    SELECT id INTO v_role_id
    FROM auth.role
    WHERE code = 'DIRECCION_NACIONAL';

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
            'DIRECCION_NACIONAL',
            'Dirección Nacional o Delegado',
            'Rol directivo de Dirección Nacional o su delegado, facultado para autorizar excepcionalmente comisiones de servicio extemporáneas (< 14 días hábiles) en la Etapa 6.',
            'directivo',
            'Award',
            '#7C3AED',
            'sistema',
            true,
            NOW(),
            NOW()
        )
        RETURNING id INTO v_role_id;
        RAISE NOTICE 'Rol DIRECCION_NACIONAL creado';
    END IF;

    -- ========================================================================
    -- 2. Permisos de la Etapa 6 (RF-AUT-002)
    -- ========================================================================

    -- Permiso: consultar bandeja de comisiones extemporáneas
    SELECT id_permission INTO v_permission_read_extemp_id
    FROM auth.permission
    WHERE code = 'travel_expenses:read_extemporaneous_authorizations';

    IF v_permission_read_extemp_id IS NULL THEN
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
            'travel_expenses:read_extemporaneous_authorizations',
            'Ver bandeja de autorizaciones extemporáneas',
            'Permite a la Dirección Nacional consultar la bandeja de comisiones radicadas de manera extemporánea.',
            v_module_id,
            true,
            NOW(),
            NOW()
        )
        RETURNING id_permission INTO v_permission_read_extemp_id;
        RAISE NOTICE 'Permiso travel_expenses:read_extemporaneous_authorizations creado';
    END IF;

    -- Permiso: autorizar comisión extemporánea (pasa a Subdirección)
    SELECT id_permission INTO v_permission_auth_extemp_id
    FROM auth.permission
    WHERE code = 'travel_expenses:authorize_extemporaneous';

    IF v_permission_auth_extemp_id IS NULL THEN
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
            'travel_expenses:authorize_extemporaneous',
            'Autorizar comisión extemporánea',
            'Permite otorgar el visto bueno excepcional de la Dirección Nacional a una comisión extemporánea para habilitar el flujo ordinario en Subdirección.',
            v_module_id,
            true,
            NOW(),
            NOW()
        )
        RETURNING id_permission INTO v_permission_auth_extemp_id;
        RAISE NOTICE 'Permiso travel_expenses:authorize_extemporaneous creado';
    END IF;

    -- Permiso: rechazar comisión extemporánea (se niega con justificación)
    SELECT id_permission INTO v_permission_reject_extemp_id
    FROM auth.permission
    WHERE code = 'travel_expenses:reject_extemporaneous';

    IF v_permission_reject_extemp_id IS NULL THEN
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
            'travel_expenses:reject_extemporaneous',
            'Rechazar comisión extemporánea',
            'Permite a la Dirección Nacional negar de forma definitiva una comisión extemporánea con justificación motivada.',
            v_module_id,
            true,
            NOW(),
            NOW()
        )
        RETURNING id_permission INTO v_permission_reject_extemp_id;
        RAISE NOTICE 'Permiso travel_expenses:reject_extemporaneous creado';
    END IF;

    -- ========================================================================
    -- 3. Asignar permisos al rol DIRECCION_NACIONAL
    -- ========================================================================
    INSERT INTO auth.role_permissions (id_rol, id_permission)
    VALUES
        (v_role_id, v_permission_read_extemp_id),
        (v_role_id, v_permission_auth_extemp_id),
        (v_role_id, v_permission_reject_extemp_id)
    ON CONFLICT (id_rol, id_permission) DO NOTHING;

    -- ========================================================================
    -- 4. Asegurar comodín travel_expenses:* para roles administradores
    -- ========================================================================
    SELECT id_permission INTO v_permission_wildcard_id
    FROM auth.permission
    WHERE code = 'travel_expenses:*';

    IF v_permission_wildcard_id IS NOT NULL THEN
        INSERT INTO auth.role_permissions (id_rol, id_permission)
        SELECT r.id, v_permission_wildcard_id
        FROM auth.role r
        WHERE UPPER(r.code) IN (
            'SUPER_ADMIN',
            'ADMIN',
            'ADMINISTRATIVO',
            'SUPER_ADMINISTRADOR',
            'SUPERUSER'
        )
        ON CONFLICT (id_rol, id_permission) DO NOTHING;
    END IF;

    RAISE NOTICE 'Roles y permisos para RF-AUT-002 configurados exitosamente';
END $$;
