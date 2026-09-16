-- Migration: add activo column for soft-delete
-- Created: 2026-09-02
-- Description: Agrega columna activo para eliminación lógica en escalas y tarifas

ALTER TABLE travel_expenses.escalas_viaticos
    ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE travel_expenses.tarifas_investigadores
    ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_escalas_activo ON travel_expenses.escalas_viaticos(activo);
CREATE INDEX IF NOT EXISTS idx_tarifas_investigadores_activo ON travel_expenses.tarifas_investigadores(activo);
