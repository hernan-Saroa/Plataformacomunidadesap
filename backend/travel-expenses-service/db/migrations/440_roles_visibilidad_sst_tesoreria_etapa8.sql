SET client_encoding = 'UTF8';

-- ============================================================================
-- Migración: 440_roles_visibilidad_sst_tesoreria_etapa8.sql (Seguridad RBAC)
-- Historia de Usuario: [RF-PAG-002, RF-PAG-003] Etapa 8 - Visibilidad y Acceso SST y Tesorería
-- Roles:
--   - SST (Seguridad y Salud en el Trabajo): Consulta comisiones OBLIGADA y PAGADA
--   - TESORERIA (Tesorería y Pagador): Consulta comisiones OBLIGADA y procesa desembolso
-- Permisos:
--   - travel_expenses:read_sst_requests (Consultar comisiones formalizadas para SST)
--   - travel_expenses:read_sst_logs (Consultar bitácora de notificaciones SST)
--   - travel_expenses:read_payments (Consultar comisiones obligadas y pagadas para Tesorería)
--   - travel_expenses:process_payment (Procesar desembolso y pago)
--   - travel_expenses:register_payment (Registrar orden y soporte de pago SIIF)
-- ============================================================================

DO $$
DECLARE
    v_module_id UUID;
    v_perm_read_sst_req UUID;
    v_perm_read_sst_logs UUID;
    v_perm_read_payments UUID;
    v_perm_process_payment UUID;
    v_perm_register_payment UUID;
    v_role_sst_id UUID;
    v_role_tesoreria_id UUID;
BEGIN
    -- 1. Asegurar la existencia de roles en auth.role
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'role') THEN
        -- Rol SST
        SELECT id INTO v_role_sst_id FROM auth.role WHERE code = 'SST';
        IF v_role_sst_id IS NULL THEN
            INSERT INTO auth.role (id, code, name, description, category, icon, color, is_active)
            VALUES (
                gen_random_uuid(),
                'SST',
                'Seguridad y Salud en el Trabajo',
                'Responsable de verificar y monitorear comisiones de servicio obligadas y pagadas (Etapa 8)',
                'administrativo',
                'HeartPulse',
                '#10B981',
                true
            )
            RETURNING id INTO v_role_sst_id;
        END IF;

        -- Rol TESORERIA
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

    -- 2. Asegurar la existencia de permisos en auth.permission
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'permission') THEN
        SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'viaticos';

        -- Permiso: Consultar comisiones formalizadas para SST
        SELECT id_permission INTO v_perm_read_sst_req FROM auth.permission WHERE code = 'travel_expenses:read_sst_requests';
        IF v_perm_read_sst_req IS NULL THEN
            INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                'travel_expenses:read_sst_requests',
                'Consultar Comisiones Formalizadas ante SST',
                'Permite a Seguridad y Salud en el Trabajo consultar expedientes con obligación y pago (Etapa 8)',
                v_module_id,
                true,
                NOW(),
                NOW()
            )
            RETURNING id_permission INTO v_perm_read_sst_req;
        END IF;

        -- Permiso: Ver registros de notificación SST
        SELECT id_permission INTO v_perm_read_sst_logs FROM auth.permission WHERE code = 'travel_expenses:read_sst_logs';
        IF v_perm_read_sst_logs IS NULL THEN
            INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                'travel_expenses:read_sst_logs',
                'Ver Registros de Notificación SST',
                'Permite consultar bitácora de notificaciones enviadas a SST',
                v_module_id,
                true,
                NOW(),
                NOW()
            )
            RETURNING id_permission INTO v_perm_read_sst_logs;
        END IF;

        -- Permiso: Consultar pagos y desembolsos
        SELECT id_permission INTO v_perm_read_payments FROM auth.permission WHERE code = 'travel_expenses:read_payments';
        IF v_perm_read_payments IS NULL THEN
            INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                'travel_expenses:read_payments',
                'Consultar Pagos y Desembolsos Registrados',
                'Permite consultar comisiones obligadas pendientes de giro y comisiones pagadas',
                v_module_id,
                true,
                NOW(),
                NOW()
            )
            RETURNING id_permission INTO v_perm_read_payments;
        END IF;

        -- Permiso: Procesar pago y desembolso
        SELECT id_permission INTO v_perm_process_payment FROM auth.permission WHERE code = 'travel_expenses:process_payment';
        IF v_perm_process_payment IS NULL THEN
            INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                'travel_expenses:process_payment',
                'Procesar Pago y Desembolso de Comisión',
                'Permite a Tesorería procesar el desembolso y formalizar el pago de comisiones obligadas',
                v_module_id,
                true,
                NOW(),
                NOW()
            )
            RETURNING id_permission INTO v_perm_process_payment;
        END IF;

        -- Permiso: Registrar orden y soporte de pago
        SELECT id_permission INTO v_perm_register_payment FROM auth.permission WHERE code = 'travel_expenses:register_payment';
        IF v_perm_register_payment IS NULL THEN
            INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                'travel_expenses:register_payment',
                'Registrar Orden y Soporte de Pago SIIF',
                'Permite registrar la orden de pago y comprobante de desembolso',
                v_module_id,
                true,
                NOW(),
                NOW()
            )
            RETURNING id_permission INTO v_perm_register_payment;
        END IF;

        -- 3. Vincular permisos a roles en auth.role_permissions
        -- Asignación para SST
        INSERT INTO auth.role_permissions (id_rol, id_permission)
        SELECT r.id, p.id_permission
        FROM auth.role r, auth.permission p
        WHERE UPPER(r.code) IN ('SST', 'SEGURIDAD_SALUD_TRABAJO', 'SEGURIDAD_Y_SALUD_EN_EL_TRABAJO', 'GRUPO_SST', 'ANALISTA_SST', 'SUPER_ADMIN')
          AND p.code IN ('travel_expenses:read_sst_requests', 'travel_expenses:read_sst_logs')
        ON CONFLICT (id_rol, id_permission) DO NOTHING;

        -- Asignación para TESORERIA
        INSERT INTO auth.role_permissions (id_rol, id_permission)
        SELECT r.id, p.id_permission
        FROM auth.role r, auth.permission p
        WHERE UPPER(r.code) IN ('TESORERIA', 'GRUPO_TESORERIA', 'ANALISTA_TESORERIA', 'PAGADOR', 'SUPER_ADMIN')
          AND p.code IN ('travel_expenses:read_payments', 'travel_expenses:process_payment', 'travel_expenses:register_payment')
        ON CONFLICT (id_rol, id_permission) DO NOTHING;
    END IF;
END $$;

