SET client_encoding = 'UTF8';

-- ============================================================================
-- Migration: 427_rol_analista_y_permisos_etapa5.sql
-- Created: 2026-09-08
-- Description: Etapa 5 (Verificar y crear comision en SIIF Nacion).
--              Reutiliza el rol ANALISTA existente (migracion 024) y le asigna
--              los permisos nuevos para verificacion y exportacion SIIF.
--              Asegura comodin para roles administrativos existentes.
-- ============================================================================

DO $$
DECLARE
    v_role_id UUID;
    v_module_id UUID;
    v_permission_read_assigned_id UUID;
    v_permission_verify_request_id UUID;
    v_permission_export_siif_id UUID;
    v_permission_return_assigned_id UUID;
    v_permission_wildcard_id UUID;
BEGIN
    SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'viaticos';

    IF v_module_id IS NULL THEN
        RAISE EXCEPTION 'Modulo viaticos no encontrado en auth.module. Ejecute primero 001_module.sql';
    END IF;

    -- ==========================================================================
    -- 1. Obtener rol ANALISTA existente (creado en migracion 024)
    -- ==========================================================================

    SELECT id INTO v_role_id FROM auth.role WHERE code = 'ANALISTA';

    IF v_role_id IS NULL THEN
        RAISE EXCEPTION 'Rol ANALISTA no encontrado en auth.role. Ejecute primero 024_rol_analista_permisos.sql';
    END IF;

    RAISE NOTICE 'Rol ANALISTA encontrado (id=%)', v_role_id;

    -- ==========================================================================
    -- 2. Crear permiso travel_expenses:read_assigned si no existe
    -- ==========================================================================

    SELECT id_permission INTO v_permission_read_assigned_id FROM auth.permission WHERE code = 'travel_expenses:read_assigned';

    IF v_permission_read_assigned_id IS NULL THEN
        INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            'travel_expenses:read_assigned',
            'Ver solicitudes asignadas (Etapa 5)',
            'Permite al analista ver las solicitudes de comision asignadas para verificacion.',
            v_module_id,
            true,
            NOW(),
            NOW()
        )
        RETURNING id_permission INTO v_permission_read_assigned_id;
        RAISE NOTICE 'Permiso travel_expenses:read_assigned creado';
    END IF;

    -- ==========================================================================
    -- 3. Crear permiso travel_expenses:verify_request si no existe
    -- ==========================================================================

    SELECT id_permission INTO v_permission_verify_request_id FROM auth.permission WHERE code = 'travel_expenses:verify_request';

    IF v_permission_verify_request_id IS NULL THEN
        INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            'travel_expenses:verify_request',
            'Verificar solicitud de comision',
            'Permite al analista registrar el checklist de verificacion y auditoria de una solicitud.',
            v_module_id,
            true,
            NOW(),
            NOW()
        )
        RETURNING id_permission INTO v_permission_verify_request_id;
        RAISE NOTICE 'Permiso travel_expenses:verify_request creado';
    END IF;

    -- ==========================================================================
    -- 4. Crear permiso travel_expenses:export_siif si no existe
    -- ==========================================================================

    SELECT id_permission INTO v_permission_export_siif_id FROM auth.permission WHERE code = 'travel_expenses:export_siif';

    IF v_permission_export_siif_id IS NULL THEN
        INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            'travel_expenses:export_siif',
            'Exportar solicitud a SIIF Nacion',
            'Permite al analista generar el CSV de exportacion y marcar la solicitud para SIIF.',
            v_module_id,
            true,
            NOW(),
            NOW()
        )
        RETURNING id_permission INTO v_permission_export_siif_id;
        RAISE NOTICE 'Permiso travel_expenses:export_siif creado';
    END IF;

    -- ==========================================================================
    -- 5. Crear permiso travel_expenses:return_assigned si no existe
    -- ==========================================================================

    SELECT id_permission INTO v_permission_return_assigned_id FROM auth.permission WHERE code = 'travel_expenses:return_assigned';

    IF v_permission_return_assigned_id IS NULL THEN
        INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            'travel_expenses:return_assigned',
            'Devolver solicitud asignada',
            'Permite al analista devolver una solicitud asignada para subsanar faltantes.',
            v_module_id,
            true,
            NOW(),
            NOW()
        )
        RETURNING id_permission INTO v_permission_return_assigned_id;
        RAISE NOTICE 'Permiso travel_expenses:return_assigned creado';
    END IF;

    -- ==========================================================================
    -- 6. Asignar los 4 permisos nuevos al rol ANALISTA existente
    -- ==========================================================================

    INSERT INTO auth.role_permissions (id_rol, id_permission)
    VALUES
        (v_role_id, v_permission_read_assigned_id),
        (v_role_id, v_permission_verify_request_id),
        (v_role_id, v_permission_export_siif_id),
        (v_role_id, v_permission_return_assigned_id)
    ON CONFLICT (id_rol, id_permission) DO NOTHING;

    RAISE NOTICE 'Permisos de Etapa 5 asignados al rol ANALISTA';

    -- ==========================================================================
    -- 7. Asegurar comodin travel_expenses:* para roles administrativos
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
