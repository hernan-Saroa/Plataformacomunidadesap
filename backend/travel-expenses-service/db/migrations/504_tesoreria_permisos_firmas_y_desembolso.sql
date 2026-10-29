SET client_encoding = 'UTF8';

-- ============================================================================
-- Migración: 504_tesoreria_permisos_firmas_y_desembolso.sql
-- Objetivo: Asignar permisos oficiales de firma digital, validación OTP y lectura
--           de bandeja al rol de Tesorería y Pagaduría para el desembolso de comisiones.
--
-- Justificación:
--   El rol de Tesorería, así como el resto de roles del flujo de viáticos,
--   no solo confirma el desembolso de pago, sino que también debe emitir la
--   última firma digital con certificación y validación OTP (Ley 527 de 1999).
--
-- Permisos asegurados y asociados:
--   - travel_expenses:sign_approval (Firmar digitalmente con validación OTP)
--   - travel_expenses:read_approvals (Consultar bandeja y estado de firmas)
--   - travel_expenses:process_payment (Procesar desembolso y pago)
--   - travel_expenses:register_payment (Registrar información de pago)
--   - travel_expenses:read_payments (Consultar pagos y desembolsos)
--   - travel_expenses.general.es_tesoreria (Permiso inmutable de rol funcional)
--
-- Roles afectados:
--   - TESORERIA, GRUPO_TESORERIA, ANALISTA_TESORERIA, PAGADOR, ROL_TESORERIA, ROL_PAGADOR
-- ============================================================================

DO $$
DECLARE
    v_module_id UUID;
    v_perm_sign UUID;
    v_perm_read UUID;
    v_perm_process UUID;
    v_perm_register UUID;
    v_perm_read_payments UUID;
    v_perm_es_tesoreria UUID;
BEGIN
    -- 1. Obtener ID del módulo viáticos en auth.module
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'module') THEN
        SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'viaticos' LIMIT 1;
        IF v_module_id IS NULL THEN
            SELECT id_module INTO v_module_id FROM auth.module WHERE code ILIKE '%viatico%' LIMIT 1;
        END IF;
    END IF;

    -- ========================================================================
    -- 2. Asegurar Permisos en auth.permission
    -- ========================================================================
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'permission') THEN

        -- 2.1 Permiso: travel_expenses:sign_approval
        SELECT id_permission INTO v_perm_sign FROM auth.permission WHERE code = 'travel_expenses:sign_approval';
        IF v_perm_sign IS NULL THEN
            INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                'travel_expenses:sign_approval',
                'Firmar aprobación de solicitud de comisión (Formato 023 / Desembolso)',
                'Permite a los roles directivos, revisores y tesorería emitir firma digital certificada con OTP.',
                v_module_id,
                true,
                NOW(),
                NOW()
            )
            RETURNING id_permission INTO v_perm_sign;
            RAISE NOTICE 'Permiso travel_expenses:sign_approval creado.';
        END IF;

        -- 2.2 Permiso: travel_expenses:read_approvals
        SELECT id_permission INTO v_perm_read FROM auth.permission WHERE code = 'travel_expenses:read_approvals';
        IF v_perm_read IS NULL THEN
            INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                'travel_expenses:read_approvals',
                'Consultar bandeja de firmas de aprobación',
                'Permite consultar el estado de firmas y certificaciones de una solicitud de comisión.',
                v_module_id,
                true,
                NOW(),
                NOW()
            )
            RETURNING id_permission INTO v_perm_read;
            RAISE NOTICE 'Permiso travel_expenses:read_approvals creado.';
        END IF;

        -- 2.3 Permiso: travel_expenses:process_payment
        SELECT id_permission INTO v_perm_process FROM auth.permission WHERE code = 'travel_expenses:process_payment';
        IF v_perm_process IS NULL THEN
            INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                'travel_expenses:process_payment',
                'Procesar desembolso y pago de comisiones',
                'Permite confirmar el desembolso de comisiones en Tesorería y firmar digitalmente.',
                v_module_id,
                true,
                NOW(),
                NOW()
            )
            RETURNING id_permission INTO v_perm_process;
        END IF;

        -- 2.4 Permiso: travel_expenses:read_payments
        SELECT id_permission INTO v_perm_read_payments FROM auth.permission WHERE code = 'travel_expenses:read_payments';
        IF v_perm_read_payments IS NULL THEN
            INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                'travel_expenses:read_payments',
                'Consultar bandeja de pagos y desembolsos',
                'Permite a Tesorería consultar las comisiones obligadas listas para desembolso y pagadas.',
                v_module_id,
                true,
                NOW(),
                NOW()
            )
            RETURNING id_permission INTO v_perm_read_payments;
        END IF;

        -- 2.5 Permiso: travel_expenses.general.es_tesoreria
        SELECT id_permission INTO v_perm_es_tesoreria FROM auth.permission WHERE code = 'travel_expenses.general.es_tesoreria';
        IF v_perm_es_tesoreria IS NULL THEN
            INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                'travel_expenses.general.es_tesoreria',
                'Rol General Inmutable Tesorería',
                'Habilita todas las funciones y bandejas oficiales de Tesorería en Viáticos.',
                v_module_id,
                true,
                NOW(),
                NOW()
            )
            RETURNING id_permission INTO v_perm_es_tesoreria;
        END IF;

    END IF;

    -- ========================================================================
    -- 3. Vincular Permisos a Roles en auth.role_permissions
    -- ========================================================================
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'role_permissions') THEN

        INSERT INTO auth.role_permissions (id_rol, id_permission)
        SELECT r.id, p.id_permission
        FROM auth.role r
        CROSS JOIN (
            VALUES 
                (v_perm_sign),
                (v_perm_read),
                (v_perm_process),
                (v_perm_read_payments),
                (v_perm_es_tesoreria)
        ) AS p(id_permission)
        WHERE (
            UPPER(r.code) IN ('TESORERIA', 'GRUPO_TESORERIA', 'ANALISTA_TESORERIA', 'PAGADOR', 'ROL_TESORERIA', 'ROL_PAGADOR')
            OR UPPER(r.name) ILIKE '%tesoreria%'
            OR UPPER(r.name) ILIKE '%pagador%'
        )
        AND p.id_permission IS NOT NULL
        ON CONFLICT (id_rol, id_permission) DO NOTHING;

        RAISE NOTICE 'Permisos de firma, lectura y pago asociados a roles de Tesorería en auth.role_permissions.';
    END IF;

    RAISE NOTICE 'Migración 504_tesoreria_permisos_firmas_y_desembolso ejecutada con éxito.';
END $$;
