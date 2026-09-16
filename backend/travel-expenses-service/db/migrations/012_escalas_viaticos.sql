-- ============================================================================
-- 012_escalas_viaticos.sql
-- Description: Tabla de escalas de viáticos según Decreto 314 de 2026.
--              Idempotente (CREATE IF NOT EXISTS + CREATE INDEX IF NOT EXISTS).
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS travel_expenses;
SET search_path TO travel_expenses, public;

CREATE TABLE IF NOT EXISTS travel_expenses.escalas_viaticos (
    id SERIAL PRIMARY KEY,
    decreto_vigente VARCHAR(50) NOT NULL,
    ano_vigencia INT NOT NULL,
    rango_minimo NUMERIC(12, 2) NOT NULL,
    rango_maximo NUMERIC(12, 2) NOT NULL,
    tarifa_diaria NUMERIC(12, 2) NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS travel_expenses.tarifas_investigadores (
    id SERIAL PRIMARY KEY,
    categoria_investigador VARCHAR(50) NOT NULL UNIQUE,
    tarifa_diaria NUMERIC(12, 2) NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS travel_expenses.tarifas_regionales_excepcion (
    id SERIAL PRIMARY KEY,
    departamento VARCHAR(100) NOT NULL UNIQUE,
    es_nuevo_departamento BOOLEAN NOT NULL DEFAULT TRUE,
    tarifa_diaria NUMERIC(12, 2) NOT NULL,
    decreto_referencia VARCHAR(100),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_escalas_rango ON travel_expenses.escalas_viaticos (rango_minimo, rango_maximo);
CREATE INDEX IF NOT EXISTS idx_escalas_ano_vigencia ON travel_expenses.escalas_viaticos (ano_vigencia);
CREATE INDEX IF NOT EXISTS idx_tarifas_investigadores_categoria ON travel_expenses.tarifas_investigadores (categoria_investigador);
CREATE INDEX IF NOT EXISTS idx_tarifas_regionales_excepcion_depto ON travel_expenses.tarifas_regionales_excepcion (departamento);

RESET search_path;
