SET client_encoding = 'UTF8';

-- ============================================================================
-- Migración: 503_grupo_presupuesto_permisos_firmas_aprobacion.sql
-- Objetivo: Crear roles y permisos oficiales para el flujo de firmas y aprobación
--           de solicitudes de comisión de servicios (Formato GF-FO-023 Versión 07).
--
-- 
--
-- Permisos granulares e inmutables:
--   - travel_expenses:sign_approval (Firmar aprobación de solicitud de comisión)
--   - travel_expenses:read_approvals (Consultar bandeja de firmas de aprobación)
--
-- Asignación a roles:
--   - GRupo Presupuesto
-- ============================================================================

DO $$
DECLARE
    v_module_id UUID;
    v_role_jefe_id UUID;
    v_role_gerente_id UUID;
    v_role_subdireccion_id UUID;
    v_role_direccion_id UUID;
    
    v_perm_sign UUID;
    v_perm_read UUID;
    v_perm_return UUID;
    v_perm_es_jefe UUID;
    v_perm_es_gerente UUID;
    v_perm_wildcard UUID;
BEGIN
    -- 1. Obtener ID del módulo viáticos en auth.module
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'module') THEN
        SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'viaticos' LIMIT 1;
        IF v_module_id IS NULL THEN
            SELECT id_module INTO v_module_id FROM auth.module WHERE code ILIKE '%viatico%' LIMIT 1;
        END IF;
    END IF;

    
    -- ========================================================================
    -- 3. Asegurar Permisos en auth.permission
    -- ========================================================================
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'permission') THEN

        -- 3.1 Permiso: travel_expenses:sign_approval
        SELECT id_permission INTO v_perm_sign FROM auth.permission WHERE code = 'travel_expenses:sign_approval';
        IF v_perm_sign IS NULL THEN
            INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                'travel_expenses:sign_approval',
                'Firmar aprobación de solicitud de comisión (Formato 023)',
                'Permite a los jefes, directivos y grupo presupuesto revisar la solicitud, emitir firma autógrafa o sello digital ESAP y aprobar la comisión en su proceso.',
                v_module_id,
                true,
                NOW(),
                NOW()
            )
            RETURNING id_permission INTO v_perm_sign;
            RAISE NOTICE 'Permiso travel_expenses:sign_approval creado.';
        END IF;

        -- 3.2 Permiso: travel_expenses:read_approvals
        SELECT id_permission INTO v_perm_read FROM auth.permission WHERE code = 'travel_expenses:read_approvals';
        IF v_perm_read IS NULL THEN
            INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                'travel_expenses:read_approvals',
                'Consultar bandeja de firmas de aprobación',
                'Permite a jefes, directivos y grupo presupuesto consultar la bandeja de solicitudes de comisión en su proceso y aprobación (Formato GF-FO-023).',
                v_module_id,
                true,
                NOW(),
                NOW()
            )
            RETURNING id_permission INTO v_perm_read;
            RAISE NOTICE 'Permiso travel_expenses:read_approvals creado.';
        END IF;

    END IF;

    -- ========================================================================
    -- 4. Vincular Permisos a Roles en auth.role_permissions
    -- ========================================================================
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'role_permissions') THEN


        -- 4.1 Asignar permisos de firma y lectura a GRUPO PRESUPUESTO
        INSERT INTO auth.role_permissions (id_rol, id_permission)
        SELECT r.id, p.id_permission
        FROM auth.role r
        CROSS JOIN (
            VALUES 
                (v_perm_sign),
                (v_perm_read)
        ) AS p(id_permission)
        WHERE UPPER(r.code) IN ('PRESUPUESTO', 'DIRECTOR_PRESUPUESTO', 'GRUPO_PRESUPUESTO')
          AND p.id_permission IS NOT NULL
        ON CONFLICT (id_rol, id_permission) DO NOTHING;


        RAISE NOTICE 'Permisos asociados en auth.role_permissions correctamente.';
    END IF;

    RAISE NOTICE 'Migración 503_grupo_presupuesto_permisos_firmas_aprobacion ejecutada con éxito.';
END $$;
