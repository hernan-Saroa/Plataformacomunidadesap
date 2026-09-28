SET client_encoding = 'UTF8';

-- ============================================================================
-- Migración: 439_roles_permisos_pago_tesoreria_etapa8.sql (Roles y Permisos RBAC)
-- Historia de Usuario: [RF-PAG-003] Etapa 8 - Procesar desembolso y pago de comisión
-- Rol: Tesorería / Pagador
-- Permisos:
--   - travel_expenses:process_payment (Procesar Pago y Desembolso en SIIF Nación)
--   - travel_expenses:read_payments (Consultar Pagos y Desembolsos de Comisiones)
--   - travel_expenses:register_payment (Registrar Orden y Soporte de Pago SIIF)
-- Roles asignados: TESORERIA, GRUPO_TESORERIA, SUPER_ADMIN
-- ============================================================================

DO $$
DECLARE
    v_module_id UUID;
    v_perm_process_id UUID;
    v_perm_read_id UUID;
    v_perm_register_id UUID;
    v_role_tesoreria_id UUID;
BEGIN
    -- 1. Asegurar la existencia del Rol TESORERIA en auth.role
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'role') THEN
        SELECT id INTO v_role_tesoreria_id FROM auth.role WHERE code = 'TESORERIA';
        IF v_role_tesoreria_id IS NULL THEN
            INSERT INTO auth.role (id, code, name, description, category, icon, color, is_active)
            VALUES (
                gen_random_uuid(),
                'TESORERIA',
                'Grupo de Tesorería y Desembolso',
                'Responsable de procesar el pago y desembolso de comisiones en SIIF Nación (Etapa 8 — RF-PAG-003)',
                'administrativo',
                'BadgeDollarSign',
                '#059669',
                true
            )
            RETURNING id INTO v_role_tesoreria_id;
        END IF;
    END IF;

    -- 2. Registrar permisos en auth.permission
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'permission') THEN
        SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'viaticos';

        -- Permiso: Procesar Pago y Desembolso
        SELECT id_permission INTO v_perm_process_id FROM auth.permission WHERE code = 'travel_expenses:process_payment';
        IF v_perm_process_id IS NULL THEN
            INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                'travel_expenses:process_payment',
                'Procesar Pago y Desembolso de Comisión',
                'Permite a Tesorería procesar el desembolso y formalizar el pago de comisiones obligadas dejándolas en estado PAGADA (Etapa 8 — RF-PAG-003)',
                v_module_id,
                true,
                NOW(),
                NOW()
            )
            RETURNING id_permission INTO v_perm_process_id;
        END IF;

        -- Permiso: Consultar Pagos y Desembolsos
        SELECT id_permission INTO v_perm_read_id FROM auth.permission WHERE code = 'travel_expenses:read_payments';
        IF v_perm_read_id IS NULL THEN
            INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                'travel_expenses:read_payments',
                'Consultar Pagos y Desembolsos Registrados',
                'Permite consultar las comisiones en estado de desembolso y comisiones formalmente pagadas',
                v_module_id,
                true,
                NOW(),
                NOW()
            )
            RETURNING id_permission INTO v_perm_read_id;
        END IF;

        -- Permiso: Registrar Orden y Soporte de Pago SIIF
        SELECT id_permission INTO v_perm_register_id FROM auth.permission WHERE code = 'travel_expenses:register_payment';
        IF v_perm_register_id IS NULL THEN
            INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                'travel_expenses:register_payment',
                'Registrar Orden y Soporte de Pago SIIF',
                'Permite adjuntar el soporte de egreso y registrar la orden de pago oficial de SIIF Nación',
                v_module_id,
                true,
                NOW(),
                NOW()
            )
            RETURNING id_permission INTO v_perm_register_id;
        END IF;

        -- 3. Asignar permisos a roles: TESORERIA, GRUPO_TESORERIA, SUPER_ADMIN
        INSERT INTO auth.role_permissions (id_rol, id_permission)
        SELECT r.id, p.id_permission
        FROM auth.role r, auth.permission p
        WHERE UPPER(r.code) IN ('TESORERIA', 'GRUPO_TESORERIA', 'ANALISTA_TESORERIA', 'SUPER_ADMIN')
          AND p.code IN ('travel_expenses:process_payment', 'travel_expenses:read_payments', 'travel_expenses:register_payment')
        ON CONFLICT (id_rol, id_permission) DO NOTHING;
    END IF;
END $$;

