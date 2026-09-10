SET client_encoding = 'UTF8';

-- ============================================================================
-- Migration: 024_rol_analista_permisos.sql
-- Created: 2026-09-07
-- Description: RF-REC-002 — Crea rol ANALISTA y permiso para ver solicitudes
--              asignadas dentro del modulo de viaticos.
-- ============================================================================

DO $$
DECLARE
    v_role_id UUID;
    v_permission_view_assigned_id UUID;
    v_permission_wildcard_id UUID;
    v_module_id UUID;
BEGIN
    SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'viaticos';

    IF v_module_id IS NULL THEN
        RAISE EXCEPTION 'Modulo viaticos no encontrado en auth.module. Ejecute primero 001_module.sql';
    END IF;

    -- ==========================================================================
    -- 1. Crear rol ANALISTA si no existe
    -- ==========================================================================

    SELECT id INTO v_role_id FROM auth.role WHERE code = 'ANALISTA';

    IF v_role_id IS NULL THEN
        INSERT INTO auth.role (id, code, name, description, category, icon, color, type, is_active, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            'ANALISTA',
            'Analista de Viaticos',
            'Rol encargado de revisar y procesar las solicitudes de comision asignadas por el Secretario de Viaticos.',
            'operativo',
            'UserCheck',
            '#10B981',
            'sistema',
            true,
            NOW(),
            NOW()
        )
        RETURNING id INTO v_role_id;
        RAISE NOTICE 'Rol ANALISTA creado';
    END IF;

    -- ==========================================================================
    -- 2. Crear permiso para ver solicitudes asignadas
    -- ==========================================================================

    IF NOT EXISTS (SELECT 1 FROM auth.permission WHERE code = 'travel_expenses:view_assigned_requests') THEN
        INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            'travel_expenses:view_assigned_requests',
            'Ver solicitudes asignadas',
            'Permite al analista ver las solicitudes de comision que tiene asignadas para revision.',
            v_module_id,
            true,
            NOW(),
            NOW()
        )
        RETURNING id_permission INTO v_permission_view_assigned_id;
        RAISE NOTICE 'Permiso travel_expenses:view_assigned_requests creado';
    ELSE
        SELECT id_permission INTO v_permission_view_assigned_id FROM auth.permission WHERE code = 'travel_expenses:view_assigned_requests';
    END IF;

    -- ==========================================================================
    -- 3. Asignar permiso al rol ANALISTA
    -- ==========================================================================

    IF NOT EXISTS (
        SELECT 1 FROM auth.role_permissions WHERE id_rol = v_role_id AND id_permission = v_permission_view_assigned_id
    ) THEN
        INSERT INTO auth.role_permissions (id_rol, id_permission)
        VALUES (v_role_id, v_permission_view_assigned_id);
        RAISE NOTICE 'Permiso travel_expenses:view_assigned_requests asignado al rol ANALISTA';
    END IF;

    -- ==========================================================================
    -- 4. Asegurar que SUPER_ADMIN y roles administrativos tengan el comodin
    -- ==========================================================================

    SELECT id_permission INTO v_permission_wildcard_id FROM auth.permission WHERE code = 'travel_expenses:*';

    IF v_permission_wildcard_id IS NOT NULL THEN
        INSERT INTO auth.role_permissions (id_rol, id_permission)
        SELECT r.id, v_permission_wildcard_id
        FROM auth.role r
        WHERE UPPER(r.code) IN ('SUPER_ADMIN', 'ADMIN', 'ADMINISTRATIVO', 'SUPER_ADMINISTRADOR')
        ON CONFLICT (id_rol, id_permission) DO NOTHING;

        RAISE NOTICE 'Comodin travel_expenses:* asegurado para roles administrativos';
    END IF;
END $$;
