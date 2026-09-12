SET client_encoding = 'UTF8';

-- ============================================================================
-- Migration: 430_columnas_segunda_revision_etapa5.sql
-- Created: 2026-09-09
-- Description: RF-REV-002 — Agrega la trazabilidad de auditoria de la segunda
--              revision a la tabla de solicitudes de comision.
-- ============================================================================

-- ID del usuario de Control Viaticos que ejecuta la aprobacion o devolucion.
ALTER TABLE travel_expenses.solicitudes_comision
  ADD COLUMN IF NOT EXISTS revisor_control_id UUID NULL;

COMMENT ON COLUMN travel_expenses.solicitudes_comision.revisor_control_id
  IS 'ID del usuario de Control Viaticos que ejecuta la segunda revision.';

-- Estampa comun para aprobacion y devolucion de segunda revision.
ALTER TABLE travel_expenses.solicitudes_comision
  ADD COLUMN IF NOT EXISTS fecha_segunda_revision TIMESTAMP NULL;

COMMENT ON COLUMN travel_expenses.solicitudes_comision.fecha_segunda_revision
  IS 'Marca temporal de la aprobacion o devolucion en la segunda revision.';

-- Observaciones obligatorias cuando la solicitud es devuelta al analista.
ALTER TABLE travel_expenses.solicitudes_comision
  ADD COLUMN IF NOT EXISTS observaciones_segunda_revision TEXT NULL;

COMMENT ON COLUMN travel_expenses.solicitudes_comision.observaciones_segunda_revision
  IS 'Hallazgos u observaciones registrados cuando la solicitud se devuelve al analista.';

-- La tabla real de usuarios del sistema es auth."user" y su PK es id_user.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_solicitudes_comision_revisor_control'
          AND connamespace = 'travel_expenses'::regnamespace
    ) THEN
        ALTER TABLE travel_expenses.solicitudes_comision
          ADD CONSTRAINT fk_solicitudes_comision_revisor_control
          FOREIGN KEY (revisor_control_id)
          REFERENCES auth."user" (id_user)
          ON DELETE SET NULL;
    END IF;
END $$;

COMMENT ON CONSTRAINT fk_solicitudes_comision_revisor_control
  ON travel_expenses.solicitudes_comision
  IS 'Referencia al usuario de Control Viaticos en auth."user"(id_user).';

CREATE INDEX IF NOT EXISTS idx_solicitudes_revisor_control_id
  ON travel_expenses.solicitudes_comision (revisor_control_id);

CREATE INDEX IF NOT EXISTS idx_solicitudes_fecha_segunda_revision
  ON travel_expenses.solicitudes_comision (fecha_segunda_revision);
