SET client_encoding = 'UTF8';

-- ============================================================================
-- Migración: 435_roles_permisos_obligacion_etapa8.sql (Roles y Permisos RBAC)
-- Historia de Usuario: [RF-PAG-001] Etapa 8 - Crear obligación en SIIF Nación según modalidad de pago
-- Rol: Analista de Viáticos
-- Permisos:
--   - travel_expenses:create_obligation (Crear y Registrar Obligación SIIF)
--   - travel_expenses:read_obligations (Consultar Obligaciones Registradas)
-- Roles asignados en esquema auth: ANALISTA, ANALISTA_VIATICOS, SUPER_ADMIN
-- ============================================================================

DO $$
DECLARE
    v_module_id UUID;
    v_perm_create_id UUID;
    v_perm_read_id UUID;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'permission') THEN
        SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'viaticos';

        -- 1. Permiso: Crear obligación en SIIF Nación
        SELECT id_permission INTO v_perm_create_id FROM auth.permission WHERE code = 'travel_expenses:create_obligation';
        IF v_perm_create_id IS NULL THEN
            INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                'travel_expenses:create_obligation',
                'Crear y Registrar Obligación SIIF',
                'Permite registrar la obligación en SIIF Nación según la modalidad de pago para habilitar el desembolso de Tesorería (Etapa 8 — RF-PAG-001)',
                v_module_id,
                true,
                NOW(),
                NOW()
            )
            RETURNING id_permission INTO v_perm_create_id;
        END IF;

        -- 2. Permiso: Consultar obligaciones
        SELECT id_permission INTO v_perm_read_id FROM auth.permission WHERE code = 'travel_expenses:read_obligations';
        IF v_perm_read_id IS NULL THEN
            INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                'travel_expenses:read_obligations',
                'Consultar Obligaciones Registradas',
                'Permite consultar las comisiones en estado de obligación y listas para pago',
                v_module_id,
                true,
                NOW(),
                NOW()
            )
            RETURNING id_permission INTO v_perm_read_id;
        END IF;

        -- 3. Asignar permisos a roles: ANALISTA, ANALISTA_VIATICOS en auth.role_permissions
        INSERT INTO auth.role_permissions (id_rol, id_permission)
        SELECT r.id, p.id_permission
        FROM auth.role r, auth.permission p
        WHERE UPPER(r.code) IN ('ANALISTA', 'ANALISTA_VIATICOS')
          AND p.code IN ('travel_expenses:create_obligation', 'travel_expenses:read_obligations')
        ON CONFLICT (id_rol, id_permission) DO NOTHING;
    END IF;
END $$;
