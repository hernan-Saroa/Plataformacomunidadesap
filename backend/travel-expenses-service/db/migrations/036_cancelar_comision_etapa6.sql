SET client_encoding = 'UTF8';

-- ============================================================================
-- Migration: 036_cancelar_comision_etapa6.sql
-- Created: 2026-09-14
-- Description: RF-AUT-003 (Etapa 6 — Cancelar comisión con trazabilidad).
--              Agrega columnas de cancelación e indicación de reintegro en
--              travel_expenses.solicitudes_comision y crea permisos correspondientes.
-- ============================================================================

-- 1. Columnas en travel_expenses.solicitudes_comision
ALTER TABLE travel_expenses.solicitudes_comision
  ADD COLUMN IF NOT EXISTS motivo_cancelacion TEXT NULL,
  ADD COLUMN IF NOT EXISTS fecha_cancelacion TIMESTAMP WITH TIME ZONE NULL,
  ADD COLUMN IF NOT EXISTS cancelado_por_usuario_id UUID NULL,
  ADD COLUMN IF NOT EXISTS responsable_cancelacion VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS pendiente_reintegro BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN travel_expenses.solicitudes_comision.motivo_cancelacion
  IS 'Motivo obligatorio detallado de la cancelación de la comisión (RF-AUT-003).';

COMMENT ON COLUMN travel_expenses.solicitudes_comision.fecha_cancelacion
  IS 'Marca temporal (UTC) en la que se confirmó la cancelación de la comisión.';

COMMENT ON COLUMN travel_expenses.solicitudes_comision.cancelado_por_usuario_id
  IS 'ID del usuario del sistema que ejecutó y confirmó la cancelación (auth.user.id_user).';

COMMENT ON COLUMN travel_expenses.solicitudes_comision.responsable_cancelacion
  IS 'Nombre, cargo o dependencia solicitante/responsable de la orden de cancelación.';

COMMENT ON COLUMN travel_expenses.solicitudes_comision.pendiente_reintegro
  IS 'Indica si la comisión contaba con recursos comprometidos (SIIF/RP/Tiquetes) y requiere reintegro/liberación en Etapa 8.';

-- 2. Clave foránea hacia auth.user
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_solicitudes_comision_cancelado_por'
          AND connamespace = 'travel_expenses'::regnamespace
    ) THEN
        ALTER TABLE travel_expenses.solicitudes_comision
          ADD CONSTRAINT fk_solicitudes_comision_cancelado_por
          FOREIGN KEY (cancelado_por_usuario_id)
          REFERENCES auth."user" (id_user)
          ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_solicitudes_fecha_cancelacion
  ON travel_expenses.solicitudes_comision (fecha_cancelacion);

CREATE INDEX IF NOT EXISTS idx_solicitudes_cancelado_por
  ON travel_expenses.solicitudes_comision (cancelado_por_usuario_id);

CREATE INDEX IF NOT EXISTS idx_solicitudes_pendiente_reintegro
  ON travel_expenses.solicitudes_comision (pendiente_reintegro);

-- ============================================================================
-- 4. Permisos de cancelación (RF-AUT-003)
-- ============================================================================
DO $$
DECLARE
    v_module_id UUID;
    v_permission_cancel_id UUID;
    v_role_record RECORD;
BEGIN
    -- Obtener el ID del módulo de viáticos
    SELECT id_module INTO v_module_id
    FROM auth.module
    WHERE code = 'travel_expenses';

    IF v_module_id IS NULL THEN
        RAISE NOTICE 'Módulo travel_expenses no encontrado, omitiendo registro de permisos.';
        RETURN;
    END IF;

    -- Permiso de cancelar comisión
    SELECT id_permission INTO v_permission_cancel_id
    FROM auth.permission
    WHERE code = 'travel_expenses:cancel_request';

    IF v_permission_cancel_id IS NULL THEN
        INSERT INTO auth.permission (
            id_permission,
            code,
            name,
            description,
            id_module,
            is_active,
            created_at,
            updated_at
        )
        VALUES (
            gen_random_uuid(),
            'travel_expenses:cancel_request',
            'Cancelar comisión de servicios con trazabilidad',
            'Permite cancelar comisiones no legalizadas registrando motivo, responsable e indicación de reintegro presupuestal (RF-AUT-003).',
            v_module_id,
            true,
            NOW(),
            NOW()
        )
        RETURNING id_permission INTO v_permission_cancel_id;
        RAISE NOTICE 'Permiso travel_expenses:cancel_request creado';
    END IF;

    -- Asignar el permiso a roles de Dependencia y Grupo de Viáticos
    FOR v_role_record IN
        SELECT id
        FROM auth.role
        WHERE code IN (
            'ENLACE_DEPENDENCIA',
            'ANALISTA_VIATICOS',
            'CONTROL_VIATICOS',
            'SUBDIRECCION_GESTION_CORPORATIVA',
            'DIRECCION_NACIONAL',
            'ADMINISTRADOR_SISTEMA',
            'SUPER_ADMIN'
        )
    LOOP
        INSERT INTO auth.role_permissions (id_rol, id_permission)
        VALUES (v_role_record.id, v_permission_cancel_id)
        ON CONFLICT (id_rol, id_permission) DO NOTHING;
    END LOOP;

    RAISE NOTICE 'Permisos de cancelación asignados a roles autorizados';
END $$;
