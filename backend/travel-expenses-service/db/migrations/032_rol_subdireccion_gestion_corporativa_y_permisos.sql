SET client_encoding = 'UTF8';

-- ============================================================================
-- Migration: 032_rol_subdireccion_gestion_corporativa_y_permisos.sql
-- Created: 2026-09-11
-- Description: RF-AUT-001 (Etapa 6 — Autorizar gasto e itinerario).
--              Registra el nuevo rol directivo SUBDIRECCION_GESTION_CORPORATIVA,
--              el rol operativo RESPONSABLE_TIQUETES y sus permisos RBAC.
-- ============================================================================

DO $$
DECLARE
    v_role_id UUID;
    v_role_tiquetes_id UUID;
    v_module_id UUID;
    v_permission_read_auth_id UUID;
    v_permission_authorize_id UUID;
    v_permission_return_auth_id UUID;
    v_permission_wildcard_id UUID;
BEGIN
    SELECT id_module INTO v_module_id
    FROM auth.module
    WHERE code = 'viaticos';

    IF v_module_id IS NULL THEN
        RAISE EXCEPTION 'Modulo viaticos no encontrado en auth.module. Ejecute primero la migracion base del modulo.';
    END IF;

    -- ========================================================================
    -- 1. Rol: SUBDIRECCION_GESTION_CORPORATIVA
    -- ========================================================================
    SELECT id INTO v_role_id
    FROM auth.role
    WHERE code = 'SUBDIRECCION_GESTION_CORPORATIVA';

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
            'SUBDIRECCION_GESTION_CORPORATIVA',
            'Subdirección de Gestión Corporativa',
            'Rol encargado de autorizar el gasto y el itinerario de la comisión para dar el visto bueno corporativo y habilitar el trámite presupuestal (Etapa 6).',
            'directivo',
            'FileCheck',
            '#6366F1',
            'sistema',
            true,
            NOW(),
            NOW()
        )
        RETURNING id INTO v_role_id;
        RAISE NOTICE 'Rol SUBDIRECCION_GESTION_CORPORATIVA creado';
    END IF;

    -- ========================================================================
    -- 2. Rol: RESPONSABLE_TIQUETES (asegurar existencia para notificaciones)
    -- ========================================================================
    SELECT id INTO v_role_tiquetes_id
    FROM auth.role
    WHERE code = 'RESPONSABLE_TIQUETES';

    IF v_role_tiquetes_id IS NULL THEN
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
            'RESPONSABLE_TIQUETES',
            'Responsable de Gestión de Tiquetes',
            'Rol encargado de la emisión, compra y despacho de pasajes aéreos y terrestres autorizados.',
            'operativo',
            'Plane',
            '#0284C7',
            'sistema',
            true,
            NOW(),
            NOW()
        )
        RETURNING id INTO v_role_tiquetes_id;
        RAISE NOTICE 'Rol RESPONSABLE_TIQUETES creado';
    END IF;

    -- ========================================================================
    -- 3. Permisos de la Etapa 6 (RF-AUT-001)
    -- ========================================================================

    -- Permiso: consultar la bandeja de comisiones en autorizacion
    SELECT id_permission INTO v_permission_read_auth_id
    FROM auth.permission
    WHERE code = 'travel_expenses:read_authorizations';

    IF v_permission_read_auth_id IS NULL THEN
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
            'travel_expenses:read_authorizations',
            'Ver bandeja de autorizaciones corporativas',
            'Permite a la Subdirección consultar la bandeja de comisiones en etapa de autorización (VERIFICADA / EN_AUTORIZACION).',
            v_module_id,
            true,
            NOW(),
            NOW()
        )
        RETURNING id_permission INTO v_permission_read_auth_id;
        RAISE NOTICE 'Permiso travel_expenses:read_authorizations creado';
    END IF;

    -- Permiso: autorizar gasto e itinerario
    SELECT id_permission INTO v_permission_authorize_id
    FROM auth.permission
    WHERE code = 'travel_expenses:authorize_expense';

    IF v_permission_authorize_id IS NULL THEN
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
            'travel_expenses:authorize_expense',
            'Autorizar gasto e itinerario de comisión',
            'Permite otorgar el visto bueno corporativo a la comisión y transicionarla al estado AUTORIZADA.',
            v_module_id,
            true,
            NOW(),
            NOW()
        )
        RETURNING id_permission INTO v_permission_authorize_id;
        RAISE NOTICE 'Permiso travel_expenses:authorize_expense creado';
    END IF;

    -- Permiso: devolver comisión con observaciones
    SELECT id_permission INTO v_permission_return_auth_id
    FROM auth.permission
    WHERE code = 'travel_expenses:return_authorization';

    IF v_permission_return_auth_id IS NULL THEN
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
            'travel_expenses:return_authorization',
            'Devolver comisión desde autorización con observaciones',
            'Permite a la Subdirección regresar una comisión con reparos y observaciones obligatorias.',
            v_module_id,
            true,
            NOW(),
            NOW()
        )
        RETURNING id_permission INTO v_permission_return_auth_id;
        RAISE NOTICE 'Permiso travel_expenses:return_authorization creado';
    END IF;

    -- ========================================================================
    -- 4. Asignar permisos al rol SUBDIRECCION_GESTION_CORPORATIVA
    -- ========================================================================
    INSERT INTO auth.role_permissions (id_rol, id_permission)
    VALUES
        (v_role_id, v_permission_read_auth_id),
        (v_role_id, v_permission_authorize_id),
        (v_role_id, v_permission_return_auth_id)
    ON CONFLICT (id_rol, id_permission) DO NOTHING;

    -- ========================================================================
    -- 5. Asegurar comodín travel_expenses:* para roles administradores
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

    RAISE NOTICE 'Migración 032 completada exitosamente';
END $$;
