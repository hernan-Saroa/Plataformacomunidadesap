SET client_encoding = 'UTF8';

-- ============================================================================
-- Migration: 037_etapa7_presupuesto_rp_roles_columnas.sql
-- Created: 2026-09-16
-- Description: RF-PRE-001 (Etapa 7 — Expedir RP en SIIF Nación - COMPROMETIDA).
--              Crea rol PRESUPUESTO y permisos RBAC para Presupuesto y RP.
--              Agrega columnas de trazabilidad de envío a presupuesto y
--              expedición de RP con nomenclatura Fecha_RP_Número.
-- ============================================================================

DO $$
DECLARE
    v_role_id UUID;
    v_module_id UUID;
    v_permission_read_budget_id UUID;
    v_permission_register_rp_id UUID;
    v_permission_send_budget_id UUID;
BEGIN
    SELECT id_module INTO v_module_id
    FROM auth.module
    WHERE code = 'viaticos';

    -- 1. Rol: PRESUPUESTO y GRUPO_PRESUPUESTO
    SELECT id INTO v_role_id
    FROM auth.role
    WHERE code IN ('PRESUPUESTO', 'GRUPO_PRESUPUESTO')
    LIMIT 1;

    IF v_role_id IS NULL THEN
        INSERT INTO auth.role (
            id,
            code,
            name,
            description,
            category,
            icon,
            color,
            type,
            is_active,
            created_at,
            updated_at
        )
        VALUES (
            gen_random_uuid(),
            'GRUPO_PRESUPUESTO',
            'Grupo de Presupuesto',
            'Rol encargado de recibir el paquete de comisión autorizada y expedir el Registro Presupuestal (RP) en SIIF Nación (Etapa 7 — RF-PRE-001).',
            'financiero',
            'Receipt',
            '#059669',
            'sistema',
            true,
            NOW(),
            NOW()
        )
        RETURNING id INTO v_role_id;
    END IF;

    -- Asegurar también alias PRESUPUESTO si no existe
    INSERT INTO auth.role (
        id,
        code,
        name,
        description,
        category,
        icon,
        color,
        type,
        is_active,
        created_at,
        updated_at
    )
    SELECT
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
    WHERE NOT EXISTS (
        SELECT 1 FROM auth.role WHERE code = 'PRESUPUESTO'
    ) AND NOT EXISTS (
        SELECT 1 FROM auth.role WHERE name = 'Presupuesto'
    );

    -- 2. Permisos
    IF v_module_id IS NOT NULL THEN
        -- travel_expenses:read_authorized / travel_expenses:read_budget
        SELECT id_permission INTO v_permission_read_budget_id
        FROM auth.permission
        WHERE code = 'travel_expenses:read_authorized';

        IF v_permission_read_budget_id IS NULL THEN
            INSERT INTO auth.permission (
                id_permission,
                code,
                name,
                description,
                id_module,
                created_at,
                updated_at
            )
            VALUES (
                gen_random_uuid(),
                'travel_expenses:read_authorized',
                'Ver Comisiones Autorizadas',
                'Permite consultar la bandeja de comisiones pendientes de RP en Presupuesto.',
                v_module_id,
                NOW(),
                NOW()
            )
            RETURNING id_permission INTO v_permission_read_budget_id;
        END IF;

        -- Alias read_budget
        INSERT INTO auth.permission (
            id_permission,
            code,
            name,
            description,
            id_module,
            created_at,
            updated_at
        )
        SELECT
            gen_random_uuid(),
            'travel_expenses:read_budget',
            'Consultar bandeja de Presupuesto y RP',
            'Permite consultar las comisiones recibidas para expedición y consulta de RP.',
            v_module_id,
            NOW(),
            NOW()
        WHERE NOT EXISTS (
            SELECT 1 FROM auth.permission WHERE code = 'travel_expenses:read_budget'
        );

        -- travel_expenses:issue_rp / travel_expenses:register_rp
        SELECT id_permission INTO v_permission_register_rp_id
        FROM auth.permission
        WHERE code = 'travel_expenses:issue_rp';

        IF v_permission_register_rp_id IS NULL THEN
            INSERT INTO auth.permission (
                id_permission,
                code,
                name,
                description,
                id_module,
                created_at,
                updated_at
            )
            VALUES (
                gen_random_uuid(),
                'travel_expenses:issue_rp',
                'Expedir y Registrar RP',
                'Permite cargar e ingresar los datos del RP individual o masivamente respetando nomenclatura Fecha_RP_Número.',
                v_module_id,
                NOW(),
                NOW()
            )
            RETURNING id_permission INTO v_permission_register_rp_id;
        END IF;

        -- Alias register_rp
        INSERT INTO auth.permission (
            id_permission,
            code,
            name,
            description,
            id_module,
            created_at,
            updated_at
        )
        SELECT
            gen_random_uuid(),
            'travel_expenses:register_rp',
            'Expedir y registrar RP en SIIF Nación',
            'Permite registrar RP individual y mediante carga masiva con nomenclatura Fecha_RP_Número.',
            v_module_id,
            NOW(),
            NOW()
        WHERE NOT EXISTS (
            SELECT 1 FROM auth.permission WHERE code = 'travel_expenses:register_rp'
        );

        -- travel_expenses:send_to_budget
        SELECT id_permission INTO v_permission_send_budget_id
        FROM auth.permission
        WHERE code = 'travel_expenses:send_to_budget';

        IF v_permission_send_budget_id IS NULL THEN
            INSERT INTO auth.permission (
                id_permission,
                code,
                name,
                description,
                id_module,
                created_at,
                updated_at
            )
            VALUES (
                gen_random_uuid(),
                'travel_expenses:send_to_budget',
                'Enviar paquete de comisión a Presupuesto',
                'Permite al analista enviar la comisión autorizada a la bandeja del Grupo de Presupuesto.',
                v_module_id,
                NOW(),
                NOW()
            )
            RETURNING id_permission INTO v_permission_send_budget_id;
        END IF;

        -- Asignar permisos a roles de presupuesto (GRUPO_PRESUPUESTO y PRESUPUESTO)
        INSERT INTO auth.role_permissions (id_rol, id_permission)
        SELECT r.id, p.id_permission
        FROM auth.role r, auth.permission p
        WHERE UPPER(r.code) IN ('GRUPO_PRESUPUESTO', 'PRESUPUESTO')
          AND p.code IN ('travel_expenses:read_authorized', 'travel_expenses:issue_rp', 'travel_expenses:read_budget', 'travel_expenses:register_rp')
        ON CONFLICT (id_rol, id_permission) DO NOTHING;

        -- Asignar send_to_budget al rol analista y administradores si existen
        IF v_permission_send_budget_id IS NOT NULL THEN
            INSERT INTO auth.role_permissions (id_rol, id_permission)
            SELECT r.id, v_permission_send_budget_id
            FROM auth.role r
            WHERE UPPER(r.code) IN ('ANALISTA_VIATICOS', 'ANALISTA', 'SUPER_ADMIN', 'ADMIN_SISTEMA')
            ON CONFLICT (id_rol, id_permission) DO NOTHING;
        END IF;
    END IF;
END $$;

-- Columnas en travel_expenses.solicitudes_comision
ALTER TABLE travel_expenses.solicitudes_comision
  ADD COLUMN IF NOT EXISTS enviado_presupuesto BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fecha_envio_presupuesto TIMESTAMP WITH TIME ZONE NULL,
  ADD COLUMN IF NOT EXISTS enviado_presupuesto_por_id UUID NULL,
  ADD COLUMN IF NOT EXISTS observaciones_envio_presupuesto TEXT NULL,
  ADD COLUMN IF NOT EXISTS numero_rp VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS fecha_rp DATE NULL,
  ADD COLUMN IF NOT EXISTS valor_comprometido NUMERIC(14, 2) NULL,
  ADD COLUMN IF NOT EXISTS rubro_presupuestal_rp VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS rubro_rp VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS soporte_rp_path VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS fecha_registro_rp TIMESTAMP WITH TIME ZONE NULL,
  ADD COLUMN IF NOT EXISTS fecha_expedicion_rp TIMESTAMP WITH TIME ZONE NULL,
  ADD COLUMN IF NOT EXISTS usuario_presupuesto_id UUID NULL,
  ADD COLUMN IF NOT EXISTS expedido_rp_por_id UUID NULL,
  ADD COLUMN IF NOT EXISTS codigo_rp VARCHAR(150) NULL,
  ADD COLUMN IF NOT EXISTS observaciones_rp TEXT NULL;

-- Llaves foráneas a auth."user"
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_solicitudes_enviado_presupuesto_por'
          AND connamespace = 'travel_expenses'::regnamespace
    ) THEN
        ALTER TABLE travel_expenses.solicitudes_comision
          ADD CONSTRAINT fk_solicitudes_enviado_presupuesto_por
          FOREIGN KEY (enviado_presupuesto_por_id)
          REFERENCES auth."user" (id_user)
          ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_solicitudes_expedido_rp_por'
          AND connamespace = 'travel_expenses'::regnamespace
    ) THEN
        ALTER TABLE travel_expenses.solicitudes_comision
          ADD CONSTRAINT fk_solicitudes_expedido_rp_por
          FOREIGN KEY (expedido_rp_por_id)
          REFERENCES auth."user" (id_user)
          ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_solicitudes_usuario_presupuesto'
          AND connamespace = 'travel_expenses'::regnamespace
    ) THEN
        ALTER TABLE travel_expenses.solicitudes_comision
          ADD CONSTRAINT fk_solicitudes_usuario_presupuesto
          FOREIGN KEY (usuario_presupuesto_id)
          REFERENCES auth."user" (id_user)
          ON DELETE SET NULL;
    END IF;
END $$;

-- Índices de consulta para optimizar bandejas y reportes
CREATE INDEX IF NOT EXISTS idx_solicitudes_enviado_presupuesto
  ON travel_expenses.solicitudes_comision (enviado_presupuesto);

CREATE INDEX IF NOT EXISTS idx_solicitudes_numero_rp
  ON travel_expenses.solicitudes_comision (numero_rp);

CREATE INDEX IF NOT EXISTS idx_solicitudes_codigo_rp
  ON travel_expenses.solicitudes_comision (codigo_rp);

COMMENT ON COLUMN travel_expenses.solicitudes_comision.codigo_rp
  IS 'Código oficial del RP con nomenclatura Fecha_RP_Número expedido en SIIF Nación.';
