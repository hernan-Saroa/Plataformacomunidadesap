SET client_encoding = 'UTF8';

-- ============================================================================
-- Migration: 021_permiso_asignacion_analistas.sql
-- Created: 2026-09-07
-- Description: RF-REC-002 — Asignar comision a analista con tablero de carga.
--              Crea permiso travel_expenses:assign_analyst y lo asigna al rol SECRETARIO.
-- ============================================================================

-- ============================================================================
-- 1. Definir e Insertar Permiso de Seguridad: travel_expenses:assign_analyst
-- ============================================================================

DO $$
DECLARE
    v_module_id UUID;
    v_permission_id UUID;
    v_role_id UUID;
BEGIN
    SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'viaticos';

    IF v_module_id IS NULL THEN
        RAISE EXCEPTION 'Modulo viaticos no encontrado en auth.module. Ejecute primero 018_etapa4_roles_permisos.sql';
    END IF;

    -- Crear permiso tecnico travel_expenses:assign_analyst si no existe
    SELECT id_permission INTO v_permission_id FROM auth.permission WHERE code = 'travel_expenses:assign_analyst';

    IF v_permission_id IS NULL THEN
        INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            'travel_expenses:assign_analyst',
            'Asignar solicitud a analista',
            'Permite al secretario de viaticos seleccionar y asignar una solicitud a un analista especifico del Grupo de Viaticos.',
            v_module_id,
            true,
            NOW(),
            NOW()
        )
        RETURNING id_permission INTO v_permission_id;
        RAISE NOTICE 'Permiso travel_expenses:assign_analyst creado';
    END IF;

    -- Vincular permiso exclusivamente al rol SECRETARIO
    SELECT id INTO v_role_id FROM auth.role WHERE code = 'SECRETARIO';

    IF v_role_id IS NULL THEN
        RAISE EXCEPTION 'Rol SECRETARIO no encontrado. Ejecute primero 018_etapa4_roles_permisos.sql';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM auth.role_permissions WHERE id_rol = v_role_id AND id_permission = v_permission_id
    ) THEN
        INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
        VALUES (v_role_id, v_permission_id, true);
        RAISE NOTICE 'Permiso travel_expenses:assign_analyst asignado al rol SECRETARIO';
    END IF;
END $$;
