SET client_encoding = 'UTF8';

-- ============================================================================
-- Migración: 437_permisos_y_config_notificacion_sst.sql (Seguridad RBAC y Configuración)
-- Historia de Usuario: [RF-PAG-002] Etapa 8 - Notificar automáticamente a SST
-- Permisos:
--   - travel_expenses:read_sst_logs (Ver Registros de Notificación SST)
--   - travel_expenses:resend_sst_notification (Reenviar Notificación SST)
-- Configuración:
--   - CORREO_DESTINO_SST = 'sst@esap.edu.co'
-- ============================================================================

-- 1. Tabla de configuraciones globales del módulo de viáticos (idempotente)
CREATE TABLE IF NOT EXISTS travel_expenses.configuraciones_globales (
    clave VARCHAR(100) PRIMARY KEY,
    valor TEXT NOT NULL,
    descripcion TEXT,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Parámetro global del correo del área de SST
INSERT INTO travel_expenses.configuraciones_globales (clave, valor, descripcion)
VALUES ('CORREO_DESTINO_SST', 'sst@esap.edu.co', 'Dirección de correo institucional del área de Seguridad y Salud en el Trabajo')
ON CONFLICT (clave) DO NOTHING;

-- 2. Esquema travel_expenses: Permisos y Roles (si existen las tablas)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'travel_expenses' AND table_name = 'roles') THEN
        INSERT INTO travel_expenses.roles (codigo, nombre, descripcion)
        VALUES ('SST', 'Seguridad y Salud en el Trabajo', 'Área institucional de SST')
        ON CONFLICT (codigo) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'travel_expenses' AND table_name = 'permisos') THEN
        INSERT INTO travel_expenses.permisos (codigo, nombre, descripcion)
        VALUES 
          ('travel_expenses:read_sst_logs', 'Ver Registros de Notificación SST', 'Permite consultar el historial de notificaciones enviadas a SST'),
          ('travel_expenses:resend_sst_notification', 'Reenviar Notificación SST', 'Permite forzar el reintento manual de notificación a SST')
        ON CONFLICT (codigo) DO NOTHING;

        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'travel_expenses' AND table_name = 'roles_permisos') THEN
            INSERT INTO travel_expenses.roles_permisos (rol_id, permiso_id)
            SELECT r.id, p.id
            FROM travel_expenses.roles r, travel_expenses.permisos p
            WHERE r.codigo IN ('SUPER_ADMIN', 'GRUPO_PRESUPUESTO', 'PRESUPUESTO', 'TESORERIA', 'ANALISTA_VIATICOS', 'ANALISTA', 'SST')
              AND p.codigo IN ('travel_expenses:read_sst_logs', 'travel_expenses:resend_sst_notification')
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
END $$;

-- 3. Esquema auth: Permisos y Roles (si existe el esquema auth)
DO $$
DECLARE
    v_module_id UUID;
    v_perm_read_id UUID;
    v_perm_resend_id UUID;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'role') THEN
        INSERT INTO auth.role (id, code, name, description, category, icon, color, is_active)
        VALUES (
            gen_random_uuid(),
            'SST',
            'Seguridad y Salud en el Trabajo',
            'Área de Seguridad y Salud en el Trabajo (SST) receptora de desplazamientos en comisión',
            'administrativo',
            'HeartPulse',
            '#10B981',
            true
        )
        ON CONFLICT (code) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'permission') THEN
        SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'viaticos';

        -- Permiso: Ver Registros de Notificación SST
        SELECT id_permission INTO v_perm_read_id FROM auth.permission WHERE code = 'travel_expenses:read_sst_logs';
        IF v_perm_read_id IS NULL THEN
            INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                'travel_expenses:read_sst_logs',
                'Ver Registros de Notificación SST',
                'Permite consultar el historial de notificaciones enviadas a SST',
                v_module_id,
                true,
                NOW(),
                NOW()
            )
            RETURNING id_permission INTO v_perm_read_id;
        END IF;

        -- Permiso: Reenviar Notificación SST
        SELECT id_permission INTO v_perm_resend_id FROM auth.permission WHERE code = 'travel_expenses:resend_sst_notification';
        IF v_perm_resend_id IS NULL THEN
            INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                'travel_expenses:resend_sst_notification',
                'Reenviar Notificación SST',
                'Permite forzar el reintento manual de notificación a SST',
                v_module_id,
                true,
                NOW(),
                NOW()
            )
            RETURNING id_permission INTO v_perm_resend_id;
        END IF;

        -- Asignar permisos a roles: SUPER_ADMIN, GRUPO_PRESUPUESTO, PRESUPUESTO, TESORERIA, ANALISTA
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'role_permissions') THEN
            INSERT INTO auth.role_permissions (id_rol, id_permission)
            SELECT r.id, p.id_permission
            FROM auth.role r, auth.permission p
            WHERE UPPER(r.code) IN ('SUPER_ADMIN', 'GRUPO_PRESUPUESTO', 'PRESUPUESTO', 'TESORERIA', 'ANALISTA', 'ANALISTA_VIATICOS')
              AND p.code IN ('travel_expenses:read_sst_logs', 'travel_expenses:resend_sst_notification')
            ON CONFLICT (id_rol, id_permission) DO NOTHING;
        END IF;
    END IF;
END $$;
