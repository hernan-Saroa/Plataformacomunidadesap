SET client_encoding = 'UTF8';

-- ============================================================================
-- Migration: 028_id_dependencia_en_solicitudes_comision.sql
-- Created: 2026-09-08
-- Description: Agrega la columna id_dependencia a solicitudes_comision para
--              permitir el calculo presupuestal por dependencia desde la
--              creacion de la solicitud.
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'travel_expenses'
          AND table_name = 'solicitudes_comision'
          AND column_name = 'id_dependencia'
    ) THEN
        ALTER TABLE travel_expenses.solicitudes_comision
            ADD COLUMN id_dependencia BIGINT NULL;

        CREATE INDEX idx_solicitudes_id_dependencia
            ON travel_expenses.solicitudes_comision (id_dependencia);
    END IF;
END $$;
