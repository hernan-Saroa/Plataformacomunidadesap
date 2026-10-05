SET client_encoding = 'UTF8';

-- ============================================================================
-- Migración: 458_permisos_firmas_analista_y_control_viaticos.sql
-- Objetivo: Asignar permisos de firma digital y verificación OTP (travel_expenses:sign_approval
--           y travel_expenses:read_approvals) a los roles de Analista de Viáticos y
--           Control de Viáticos.
--
-- Justificación:
--   El flujo de verificación del Analista SIIF y la segunda revisión de Control
--   de Viáticos requiere certificar la actuación mediante validación OTP y estampa
--   digital institucional con hash SHA-256 (Ley 527 de 1999).
--
-- Roles afectados:
--   - Analista de Viáticos (ANALISTA, ANALISTA_VIATICOS, ROL_ANALISTA, 'Analista de Viaticos')
--   - Control de Viáticos (CONTROL_VIATICOS, ROL_CONTROL_VIATICOS, 'Control Viaticos')
--
-- Permisos asignados:
--   - travel_expenses:sign_approval (Firmar digitalmente con validación OTP)
--   - travel_expenses:read_approvals (Consultar y validar estado de firmas del proceso)
-- ============================================================================

DO $$
DECLARE
    v_module_id UUID;
    v_perm_sign_id UUID;
    v_perm_read_id UUID;
BEGIN
    -- 1. Obtener ID del módulo viáticos en auth.module
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'module') THEN
        SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'viaticos' LIMIT 1;
        IF v_module_id IS NULL THEN
            SELECT id_module INTO v_module_id FROM auth.module WHERE code ILIKE '%viatico%' LIMIT 1;
        END IF;
    END IF;

    -- 2. Asegurar existencia de los permisos en auth.permission
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'permission') THEN
        -- 2.1 travel_expenses:sign_approval
        SELECT id_permission INTO v_perm_sign_id FROM auth.permission WHERE code = 'travel_expenses:sign_approval';
        IF v_perm_sign_id IS NULL THEN
            INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                'travel_expenses:sign_approval',
                'Firmar Aprobación de Solicitud de Comisión',
                'Permite firmar digitalmente con OTP aprobaciones y verificaciones institucionales de viáticos',
                v_module_id,
                true,
                NOW(),
                NOW()
            )
            RETURNING id_permission INTO v_perm_sign_id;
        END IF;

        -- 2.2 travel_expenses:read_approvals
        SELECT id_permission INTO v_perm_read_id FROM auth.permission WHERE code = 'travel_expenses:read_approvals';
        IF v_perm_read_id IS NULL THEN
            INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                'travel_expenses:read_approvals',
                'Consultar Bandeja y Estado de Firmas de Aprobación',
                'Permite consultar el estado de firmas y certificaciones de una solicitud de comisión',
                v_module_id,
                true,
                NOW(),
                NOW()
            )
            RETURNING id_permission INTO v_perm_read_id;
        END IF;
    END IF;

    -- 3. Vincular permisos a roles en auth.role_permissions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'role_permissions') THEN

        -- 3.1 Asignar a roles de Analista de Viáticos
        INSERT INTO auth.role_permissions (id_rol, id_permission)
        SELECT r.id, p_id
        FROM auth.role r
        CROSS JOIN (VALUES (v_perm_sign_id), (v_perm_read_id)) AS p(p_id)
        WHERE (
            UPPER(r.code) IN ('ANALISTA', 'ANALISTA_VIATICOS', 'ROL_ANALISTA')
            OR UPPER(r.name) ILIKE '%analista%'
        )
        AND p_id IS NOT NULL
        ON CONFLICT (id_rol, id_permission) DO NOTHING;

        -- 3.2 Asignar a roles de Control de Viáticos
        INSERT INTO auth.role_permissions (id_rol, id_permission)
        SELECT r.id, p_id
        FROM auth.role r
        CROSS JOIN (VALUES (v_perm_sign_id), (v_perm_read_id)) AS p(p_id)
        WHERE (
            UPPER(r.code) IN ('CONTROL_VIATICOS', 'ROL_CONTROL_VIATICOS')
            OR UPPER(r.name) ILIKE '%control viaticos%'
            OR UPPER(r.name) ILIKE '%control_viaticos%'
        )
        AND p_id IS NOT NULL
        ON CONFLICT (id_rol, id_permission) DO NOTHING;

    END IF;

    RAISE NOTICE 'Migración 458 ejecutada: permisos de firma y lectura asignados a Analistas y Control de Viáticos';
END $$;
