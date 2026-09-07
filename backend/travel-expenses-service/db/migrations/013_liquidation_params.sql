-- Migration: create liquidation_params table
-- Created: 2026-09-02
-- Description: Tabla de parámetros configurables para autoliquidación de viáticos

CREATE TABLE IF NOT EXISTS travel_expenses.liquidation_params (
    id SERIAL PRIMARY KEY,
    clave VARCHAR(50) NOT NULL UNIQUE,
    valor VARCHAR(255) NOT NULL,
    tipo VARCHAR(20) NOT NULL DEFAULT 'STRING',
    descripcion VARCHAR(255),
    creado_en TIMESTAMP NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_liquidation_params_clave ON travel_expenses.liquidation_params(clave);
