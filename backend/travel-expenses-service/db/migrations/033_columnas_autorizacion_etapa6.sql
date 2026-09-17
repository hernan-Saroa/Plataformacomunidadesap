SET client_encoding = 'UTF8';

-- ============================================================================
-- Migration: 033_columnas_autorizacion_etapa6.sql
-- Created: 2026-09-11
-- Description: RF-AUT-001 (Etapa 6 — Autorización corporativa de gasto e itinerario).
--              Agrega columnas de trazabilidad para la autorización corporativa
--              en travel_expenses.solicitudes_comision.
-- ============================================================================

-- ID del usuario de la Subdirección que aprueba o devuelve la comisión
ALTER TABLE travel_expenses.solicitudes_comision
  ADD COLUMN IF NOT EXISTS autorizador_id UUID NULL;

COMMENT ON COLUMN travel_expenses.solicitudes_comision.autorizador_id
  IS 'ID del usuario de la Subdirección de Gestión Corporativa que autoriza la comisión.';

-- Estampa temporal de la autorización o devolución
ALTER TABLE travel_expenses.solicitudes_comision
  ADD COLUMN IF NOT EXISTS fecha_autorizacion TIMESTAMP NULL;

COMMENT ON COLUMN travel_expenses.solicitudes_comision.fecha_autorizacion
  IS 'Marca temporal en la que la Subdirección emite la autorización o devolución.';

-- Observaciones del visto bueno o hallazgos en caso de devolución
ALTER TABLE travel_expenses.solicitudes_comision
  ADD COLUMN IF NOT EXISTS observaciones_autorizacion TEXT NULL;

COMMENT ON COLUMN travel_expenses.solicitudes_comision.observaciones_autorizacion
  IS 'Observaciones, justificación o reparos de la Subdirección de Gestión Corporativa.';

-- Llave foránea hacia auth."user"(id_user)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_solicitudes_comision_autorizador'
          AND connamespace = 'travel_expenses'::regnamespace
    ) THEN
        ALTER TABLE travel_expenses.solicitudes_comision
          ADD CONSTRAINT fk_solicitudes_comision_autorizador
          FOREIGN KEY (autorizador_id)
          REFERENCES auth."user" (id_user)
          ON DELETE SET NULL;
    END IF;
END $$;

COMMENT ON CONSTRAINT fk_solicitudes_comision_autorizador
  ON travel_expenses.solicitudes_comision
  IS 'Referencia al usuario autorizador en auth."user"(id_user).';

-- Índices de consulta para optimizar bandejas y reportes
CREATE INDEX IF NOT EXISTS idx_solicitudes_autorizador_id
  ON travel_expenses.solicitudes_comision (autorizador_id);

CREATE INDEX IF NOT EXISTS idx_solicitudes_fecha_autorizacion
  ON travel_expenses.solicitudes_comision (fecha_autorizacion);
