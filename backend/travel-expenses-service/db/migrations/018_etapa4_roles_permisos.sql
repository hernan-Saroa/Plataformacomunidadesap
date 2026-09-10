-- ============================================================================
-- Migration: 018_etapa4_roles_permisos.sql
-- Created: 2026-09-04
-- Description: RF-REC-001 (Etapa 4 — Revisar solicitud y definir prioridad).
--              Crea rol SECRETARIO y permisos específicos del módulo.
--              Usa las tablas existentes del esquema auth (role, permission,
--              role_permissions) con idempotencia via IF NOT EXISTS.
-- ============================================================================

SET client_encoding = 'UTF8';

DO $$
DECLARE
    v_role_id UUID;
    v_permission_inbox_id UUID;
    v_permission_priority_id UUID;
    v_permission_return_id UUID;
    v_permission_wildcard_id UUID;
    v_module_id UUID;
BEGIN
    SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'viaticos';

    IF v_module_id IS NULL THEN
        RAISE EXCEPTION 'Módulo viaticos no encontrado en auth.module. Ejecute primero 001_module.sql';
    END IF;

    -- ==========================================================================
    -- 1. Crear rol SECRETARIO si no existe
    -- ==========================================================================

    SELECT id INTO v_role_id FROM auth.role WHERE code = 'SECRETARIO';

    IF v_role_id IS NULL THEN
        INSERT INTO auth.role (id, code, name, description, category, icon, color, type, is_active, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            'SECRETARIO',
            'Secretario/a de Viáticos',
            'Rol encargado de revisar la bandeja de solicitudes entrantes, definir prioridad y devolver expedientes con observaciones.',
            'administrativo',
            'Shield',
            '#003DA5',
            'sistema',
            true,
            NOW(),
            NOW()
        )
        RETURNING id INTO v_role_id;
        RAISE NOTICE 'Rol SECRETARIO creado';
    END IF;

    -- ==========================================================================
    -- 2. Crear permisos específicos de la Etapa 4 (RF-REC-001)
    -- ==========================================================================

    IF NOT EXISTS (SELECT 1 FROM auth.permission WHERE code = 'travel_expenses:read_inbox') THEN
        INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            'travel_expenses:read_inbox',
            'Ver bandeja de solicitudes entrantes',
            'Acceso a la bandeja de entrada de viáticos para revisión de solicitudes en estado SOLICITADA.',
            v_module_id,
            true,
            NOW(),
            NOW()
        );
        RAISE NOTICE 'Permiso travel_expenses:read_inbox creado';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM auth.permission WHERE code = 'travel_expenses:set_priority') THEN
        INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            'travel_expenses:set_priority',
            'Modificar prioridad de solicitudes',
            'Permite actualizar la prioridad (Alta/Media/Baja) de una solicitud de comisión.',
            v_module_id,
            true,
            NOW(),
            NOW()
        );
        RAISE NOTICE 'Permiso travel_expenses:set_priority creado';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM auth.permission WHERE code = 'travel_expenses:return_request') THEN
        INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            'travel_expenses:return_request',
            'Devolver solicitud con motivo',
            'Permite devolver una solicitud al estado DEVUELTA con un motivo obligatorio.',
            v_module_id,
            true,
            NOW(),
            NOW()
        );
        RAISE NOTICE 'Permiso travel_expenses:return_request creado';
    END IF;

    -- Comodín para Super Admin (elude cualquier control de SoD o inmutabilidad).
    IF NOT EXISTS (SELECT 1 FROM auth.permission WHERE code = 'travel_expenses:*') THEN
        INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            'travel_expenses:*',
            'Comodín total de Viáticos y Comisiones',
            'Otorga control absoluto sobre el módulo de viáticos; bypassea SoD e inmutabilidad por diseño.',
            v_module_id,
            true,
            NOW(),
            NOW()
        );
        RAISE NOTICE 'Permiso travel_expenses:* creado';
    END IF;

    -- ==========================================================================
    -- 3. Asignar permisos específicos a SECRETARIO
    -- ==========================================================================

    SELECT id_permission INTO v_permission_inbox_id FROM auth.permission WHERE code = 'travel_expenses:read_inbox';
    SELECT id_permission INTO v_permission_priority_id FROM auth.permission WHERE code = 'travel_expenses:set_priority';
    SELECT id_permission INTO v_permission_return_id FROM auth.permission WHERE code = 'travel_expenses:return_request';

    IF NOT EXISTS (
        SELECT 1 FROM auth.role_permissions WHERE id_rol = v_role_id AND id_permission = v_permission_inbox_id
    ) THEN
        INSERT INTO auth.role_permissions (id_rol, id_permission)
        VALUES (v_role_id, v_permission_inbox_id);
        RAISE NOTICE 'Permiso travel_expenses:read_inbox asignado al rol SECRETARIO';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM auth.role_permissions WHERE id_rol = v_role_id AND id_permission = v_permission_priority_id
    ) THEN
        INSERT INTO auth.role_permissions (id_rol, id_permission)
        VALUES (v_role_id, v_permission_priority_id);
        RAISE NOTICE 'Permiso travel_expenses:set_priority asignado al rol SECRETARIO';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM auth.role_permissions WHERE id_rol = v_role_id AND id_permission = v_permission_return_id
    ) THEN
        INSERT INTO auth.role_permissions (id_rol, id_permission)
        VALUES (v_role_id, v_permission_return_id);
        RAISE NOTICE 'Permiso travel_expenses:return_request asignado al rol SECRETARIO';
    END IF;

    -- ==========================================================================
    -- 4. Asegurar que SUPER_ADMIN y roles administrativos tengan el comodín
    -- ==========================================================================

    SELECT id_permission INTO v_permission_wildcard_id FROM auth.permission WHERE code = 'travel_expenses:*';

    INSERT INTO auth.role_permissions (id_rol, id_permission)
    SELECT r.id, v_permission_wildcard_id
    FROM auth.role r
    WHERE UPPER(r.code) IN ('SUPER_ADMIN', 'ADMIN', 'ADMINISTRATIVO', 'SUPER_ADMINISTRADOR')
    ON CONFLICT (id_rol, id_permission) DO NOTHING;

    RAISE NOTICE 'Comodín travel_expenses:* asegurado para roles administrativos';
END $$;
