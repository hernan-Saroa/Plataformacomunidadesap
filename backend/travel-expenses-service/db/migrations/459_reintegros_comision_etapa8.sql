SET client_encoding = 'UTF8';

-- ============================================================================
-- Migración: 459_reintegros_comision_etapa8.sql
-- Historia de Usuario: [RF-PAG-004] Etapa 8 - Gestionar reintegros por viaje no
--                      realizado o menor (EFDS-1308)
-- Propósito: Registrar el reintegro de los recursos girados de más cuando una
--            comisión pagada por avance no se realizó o se ejecutó por menos días.
-- Permisos:
--   - travel_expenses:read_reintegros (Consultar reintegros de comisiones)
--   - travel_expenses:register_reintegro (Registrar reintegro con soporte)
-- Roles asignados: ANALISTA, ANALISTA_VIATICOS, TESORERIA, GRUPO_TESORERIA,
--                  ANALISTA_TESORERIA, SUPER_ADMIN
-- ============================================================================

CREATE TABLE IF NOT EXISTS travel_expenses.reintegros_comision (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solicitud_id        UUID NOT NULL
                        REFERENCES travel_expenses.solicitudes_comision (id) ON DELETE CASCADE,
    origen              VARCHAR(30) NOT NULL,
    estado              VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    valor_pagado        NUMERIC(14,2) NOT NULL,
    valor_a_reintegrar  NUMERIC(14,2) NOT NULL,
    dias_comision       NUMERIC(6,2) NULL,
    dias_ejecutados     NUMERIC(6,2) NULL,
    valor_reintegrado   NUMERIC(14,2) NULL,
    fecha_reintegro     DATE NULL,
    soporte_path        VARCHAR(255) NULL,
    observaciones       TEXT NULL,
    registrado_por_id   UUID NULL,
    fecha_registro      TIMESTAMP NULL,
    creado_en           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_reintegros_comision_solicitud_origen UNIQUE (solicitud_id, origen),
    CONSTRAINT chk_reintegros_comision_origen
        CHECK (origen IN ('COMISION_NO_REALIZADA', 'VIAJE_MENOR')),
    CONSTRAINT chk_reintegros_comision_estado
        CHECK (estado IN ('PENDIENTE', 'REGISTRADO')),
    CONSTRAINT chk_reintegros_comision_valores
        CHECK (valor_a_reintegrar > 0
               AND (valor_reintegrado IS NULL OR valor_reintegrado > 0))
);

CREATE INDEX IF NOT EXISTS idx_reintegros_comision_solicitud
    ON travel_expenses.reintegros_comision (solicitud_id);

CREATE INDEX IF NOT EXISTS idx_reintegros_comision_estado
    ON travel_expenses.reintegros_comision (estado);

COMMENT ON TABLE travel_expenses.reintegros_comision
  IS 'Reintegros de comisiones pagadas por avance no realizadas o ejecutadas por menos días (RF-PAG-004).';

COMMENT ON COLUMN travel_expenses.reintegros_comision.origen
  IS 'COMISION_NO_REALIZADA: la comisión pagada se canceló sin viajar. VIAJE_MENOR: se ejecutaron menos días de los pagados.';

COMMENT ON COLUMN travel_expenses.reintegros_comision.valor_a_reintegrar
  IS 'Valor calculado según los días efectivamente ejecutados.';

COMMENT ON COLUMN travel_expenses.reintegros_comision.soporte_path
  IS 'Ruta del soporte de la consignación del reintegro.';

DO $$
DECLARE
    v_module_id UUID;
    v_perm_read_id UUID;
    v_perm_register_id UUID;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'permission') THEN
        SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'viaticos';

        -- Permiso: Consultar reintegros
        SELECT id_permission INTO v_perm_read_id FROM auth.permission WHERE code = 'travel_expenses:read_reintegros';
        IF v_perm_read_id IS NULL THEN
            INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                'travel_expenses:read_reintegros',
                'Consultar Reintegros de Comisiones',
                'Permite consultar los reintegros pendientes y registrados de las comisiones pagadas por avance (Etapa 8 — RF-PAG-004)',
                v_module_id,
                true,
                NOW(),
                NOW()
            );
        END IF;

        -- Permiso: Registrar reintegro
        SELECT id_permission INTO v_perm_register_id FROM auth.permission WHERE code = 'travel_expenses:register_reintegro';
        IF v_perm_register_id IS NULL THEN
            INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                'travel_expenses:register_reintegro',
                'Registrar Reintegro de Comisión',
                'Permite registrar el valor reintegrado, la fecha y el soporte de consignación de una comisión (Etapa 8 — RF-PAG-004)',
                v_module_id,
                true,
                NOW(),
                NOW()
            );
        END IF;

        -- Asignar permisos a los roles
        INSERT INTO auth.role_permissions (id_rol, id_permission)
        SELECT r.id, p.id_permission
        FROM auth.role r, auth.permission p
        WHERE UPPER(r.code) IN ('ANALISTA', 'ANALISTA_VIATICOS', 'TESORERIA', 'GRUPO_TESORERIA', 'ANALISTA_TESORERIA', 'SUPER_ADMIN')
          AND p.code IN ('travel_expenses:read_reintegros', 'travel_expenses:register_reintegro')
        ON CONFLICT (id_rol, id_permission) DO NOTHING;
    END IF;
END $$;

-- Fin de migración 459
