SET client_encoding = 'UTF8';

-- ============================================================================
-- Migration: 025_analistas_viaticos_dependencia.sql
-- Created: 2026-09-07
-- Description: RF-REC-002 — Agrega columna dependencia_id a analistas_viaticos
--              para filtrar el tablero de carga por la dependencia de la solicitud.
-- ============================================================================

ALTER TABLE travel_expenses.analistas_viaticos
  ADD COLUMN IF NOT EXISTS dependencia_id BIGINT;

COMMENT ON COLUMN travel_expenses.analistas_viaticos.dependencia_id IS 'ID de la dependencia a la que pertenece el analista (auth.dependencias.id_dependencia).';

CREATE INDEX IF NOT EXISTS idx_analistas_viaticos_dependencia_id
  ON travel_expenses.analistas_viaticos (dependencia_id);
