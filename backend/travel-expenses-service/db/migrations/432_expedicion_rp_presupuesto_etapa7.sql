SET client_encoding = 'UTF8';

-- ============================================================================
-- Migración: 432_expedicion_rp_presupuesto_etapa7.sql
-- Historia de Usuario: [RF-PRE-001] Etapa 7 - Expedir RP en SIIF Nación (COMPROMETIDA)
-- ============================================================================

-- 1. Agregar campos del Registro Presupuestal (RP) en solicitudes_comision
ALTER TABLE travel_expenses.solicitudes_comision
ADD COLUMN IF NOT EXISTS numero_rp VARCHAR(50) NULL,
ADD COLUMN IF NOT EXISTS fecha_rp DATE NULL,
ADD COLUMN IF NOT EXISTS valor_comprometido NUMERIC(12, 2) NULL,
ADD COLUMN IF NOT EXISTS rubro_presupuestal_rp VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS rubro_rp VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS soporte_rp_path VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS fecha_registro_rp TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS fecha_expedicion_rp TIMESTAMP WITH TIME ZONE NULL,
ADD COLUMN IF NOT EXISTS usuario_presupuesto_id UUID NULL,
ADD COLUMN IF NOT EXISTS expedido_rp_por_id UUID NULL,
ADD COLUMN IF NOT EXISTS codigo_rp VARCHAR(150) NULL,
ADD COLUMN IF NOT EXISTS observaciones_rp TEXT NULL,
ADD COLUMN IF NOT EXISTS enviado_presupuesto BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS fecha_envio_presupuesto TIMESTAMP WITH TIME ZONE NULL,
ADD COLUMN IF NOT EXISTS enviado_presupuesto_por_id UUID NULL,
ADD COLUMN IF NOT EXISTS observaciones_envio_presupuesto TEXT NULL;

-- Claves foráneas idempotentes (compatibles con auth."user" y usuarios)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'usuarios') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'fk_solicitudes_usuario_presupuesto_usuarios'
              AND connamespace = 'travel_expenses'::regnamespace
        ) THEN
            ALTER TABLE travel_expenses.solicitudes_comision
              ADD CONSTRAINT fk_solicitudes_usuario_presupuesto_usuarios
              FOREIGN KEY (usuario_presupuesto_id) REFERENCES usuarios(id) ON DELETE SET NULL;
        END IF;
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'user') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'fk_solicitudes_usuario_presupuesto_auth_user'
              AND connamespace = 'travel_expenses'::regnamespace
        ) THEN
            ALTER TABLE travel_expenses.solicitudes_comision
              ADD CONSTRAINT fk_solicitudes_usuario_presupuesto_auth_user
              FOREIGN KEY (usuario_presupuesto_id) REFERENCES auth."user" (id_user) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- 2. Semillar rol y permisos RBAC para Presupuesto
-- Si existe esquema travel_expenses.roles
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'travel_expenses' AND table_name = 'roles') THEN
        INSERT INTO travel_expenses.roles (codigo, nombre, descripcion)
        VALUES ('GRUPO_PRESUPUESTO', 'Grupo de Presupuesto', 'Rol encargado de expedir y registrar el Registro Presupuestal (RP)')
        ON CONFLICT (codigo) DO NOTHING;

        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'travel_expenses' AND table_name = 'permisos') THEN
            INSERT INTO travel_expenses.permisos (codigo, nombre, descripcion)
            VALUES 
              ('travel_expenses:read_authorized', 'Ver Comisiones Autorizadas', 'Permite consultar la bandeja de comisiones pendientes de RP'),
              ('travel_expenses:issue_rp', 'Expedir y Registrar RP', 'Permite cargar e ingresar los datos del RP individual o masivamente')
            ON CONFLICT (codigo) DO NOTHING;

            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'travel_expenses' AND table_name = 'roles_permisos') THEN
                INSERT INTO travel_expenses.roles_permisos (rol_id, permiso_id)
                SELECT r.id, p.id
                FROM travel_expenses.roles r, travel_expenses.permisos p
                WHERE r.codigo = 'GRUPO_PRESUPUESTO'
                  AND p.codigo IN ('travel_expenses:read_authorized', 'travel_expenses:issue_rp')
                ON CONFLICT DO NOTHING;
            END IF;
        END IF;
    END IF;
END $$;

-- Semillar en esquema auth (esquema activo de seguridad del ecosistema)
DO $$
DECLARE
    v_role_id UUID;
    v_module_id UUID;
    v_perm_read_id UUID;
    v_perm_issue_id UUID;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'role') THEN
        SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'viaticos';

        -- 1. Rol GRUPO_PRESUPUESTO
        SELECT id INTO v_role_id FROM auth.role WHERE code = 'GRUPO_PRESUPUESTO';
        IF v_role_id IS NULL THEN
            IF EXISTS (SELECT 1 FROM auth.role WHERE name = 'Grupo de Presupuesto' AND code = 'PRESUPUESTO') THEN
                UPDATE auth.role SET name = 'Presupuesto' WHERE code = 'PRESUPUESTO' AND name = 'Grupo de Presupuesto';
            END IF;

            IF NOT EXISTS (SELECT 1 FROM auth.role WHERE name = 'Grupo de Presupuesto') THEN
                INSERT INTO auth.role (
                    id, code, name, description, category, icon, color, type, is_active, created_at, updated_at
                ) VALUES (
                    gen_random_uuid(),
                    'GRUPO_PRESUPUESTO',
                    'Grupo de Presupuesto',
                    'Rol encargado de expedir y registrar el Registro Presupuestal (RP)',
                    'financiero',
                    'Receipt',
                    '#059669',
                    'sistema',
                    true,
                    NOW(),
                    NOW()
                );
            ELSE
                INSERT INTO auth.role (
                    id, code, name, description, category, icon, color, type, is_active, created_at, updated_at
                ) VALUES (
                    gen_random_uuid(),
                    'GRUPO_PRESUPUESTO',
                    'Grupo de Presupuesto (SIIF)',
                    'Rol encargado de expedir y registrar el Registro Presupuestal (RP)',
                    'financiero',
                    'Receipt',
                    '#059669',
                    'sistema',
                    true,
                    NOW(),
                    NOW()
                );
            END IF;
        END IF;

        -- 2. Rol PRESUPUESTO (si no existe)
        IF NOT EXISTS (SELECT 1 FROM auth.role WHERE code = 'PRESUPUESTO') THEN
            IF NOT EXISTS (SELECT 1 FROM auth.role WHERE name = 'Presupuesto') THEN
                INSERT INTO auth.role (
                    id, code, name, description, category, icon, color, type, is_active, created_at, updated_at
                ) VALUES (
                    gen_random_uuid(),
                    'PRESUPUESTO',
                    'Presupuesto',
                    'Rol encargado de expedir y registrar el Registro Presupuestal (RP)',
                    'financiero',
                    'Receipt',
                    '#059669',
                    'sistema',
                    true,
                    NOW(),
                    NOW()
                );
            END IF;
        END IF;

        -- 3. Permisos en auth.permission
        INSERT INTO auth.permission (id_permission, code, name, description, id_module, created_at, updated_at)
        SELECT gen_random_uuid(), 'travel_expenses:read_authorized', 'Ver Comisiones Autorizadas', 'Permite consultar la bandeja de comisiones pendientes de RP', v_module_id, NOW(), NOW()
        WHERE NOT EXISTS (SELECT 1 FROM auth.permission WHERE code = 'travel_expenses:read_authorized');

        INSERT INTO auth.permission (id_permission, code, name, description, id_module, created_at, updated_at)
        SELECT gen_random_uuid(), 'travel_expenses:issue_rp', 'Expedir y Registrar RP', 'Permite cargar e ingresar los datos del RP individual o masivamente', v_module_id, NOW(), NOW()
        WHERE NOT EXISTS (SELECT 1 FROM auth.permission WHERE code = 'travel_expenses:issue_rp');

        INSERT INTO auth.permission (id_permission, code, name, description, id_module, created_at, updated_at)
        SELECT gen_random_uuid(), 'travel_expenses:read_budget', 'Consultar bandeja de Presupuesto y RP', 'Permite consultar las comisiones recibidas para expedición y consulta de RP.', v_module_id, NOW(), NOW()
        WHERE NOT EXISTS (SELECT 1 FROM auth.permission WHERE code = 'travel_expenses:read_budget');

        INSERT INTO auth.permission (id_permission, code, name, description, id_module, created_at, updated_at)
        SELECT gen_random_uuid(), 'travel_expenses:register_rp', 'Expedir y registrar RP en SIIF Nación', 'Permite registrar RP individual y mediante carga masiva con nomenclatura Fecha_RP_Número.', v_module_id, NOW(), NOW()
        WHERE NOT EXISTS (SELECT 1 FROM auth.permission WHERE code = 'travel_expenses:register_rp');

        -- 4. Asignar permisos al rol GRUPO_PRESUPUESTO y PRESUPUESTO
        INSERT INTO auth.role_permissions (id_rol, id_permission)
        SELECT r.id, p.id_permission
        FROM auth.role r, auth.permission p
        WHERE UPPER(r.code) IN ('GRUPO_PRESUPUESTO', 'PRESUPUESTO')
          AND p.code IN ('travel_expenses:read_authorized', 'travel_expenses:issue_rp', 'travel_expenses:read_budget', 'travel_expenses:register_rp')
        ON CONFLICT (id_rol, id_permission) DO NOTHING;
    END IF;
END $$;

-- Índices de desempeño
CREATE INDEX IF NOT EXISTS idx_solicitudes_numero_rp ON travel_expenses.solicitudes_comision (numero_rp);
CREATE INDEX IF NOT EXISTS idx_solicitudes_codigo_rp ON travel_expenses.solicitudes_comision (codigo_rp);
CREATE INDEX IF NOT EXISTS idx_solicitudes_enviado_presupuesto ON travel_expenses.solicitudes_comision (enviado_presupuesto);
