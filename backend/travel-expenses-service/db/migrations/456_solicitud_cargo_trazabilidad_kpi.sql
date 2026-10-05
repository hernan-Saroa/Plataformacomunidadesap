-- Migration: 456_solicitud_cargo_trazabilidad_kpi.sql
-- Descripción: Añade las columnas 'cargo' e 'id_cargo' con índice analítico a travel_expenses.solicitudes_comision
--              para trazabilidad y generación de dashboards/KPIs (gastos por cargo institucional).

SET search_path TO travel_expenses, public;

-- 1. Añadir columnas de cargo a solicitudes_comision si no existen
ALTER TABLE travel_expenses.solicitudes_comision
  ADD COLUMN IF NOT EXISTS cargo VARCHAR(150),
  ADD COLUMN IF NOT EXISTS id_cargo BIGINT;

-- 2. Retrocompatibilidad: Poblar 'cargo' en solicitudes existentes desde campos_adicionales o comisionados
UPDATE travel_expenses.solicitudes_comision s
SET cargo = COALESCE(
  NULLIF(TRIM(s.campos_adicionales->>'cargo'), ''),
  NULLIF(TRIM(s.campos_adicionales->>'cargoEsap'), ''),
  NULLIF(TRIM(s.campos_adicionales->>'cargoInstitucional'), ''),
  NULLIF(TRIM(s.campos_adicionales->>'cargoComisionado'), ''),
  (
    SELECT c.cargo
    FROM travel_expenses.comisionados com,
         jsonb_to_recordset(COALESCE(com.cargos, '[]'::jsonb)) AS c(cargo text, esPrincipal boolean)
    WHERE com.id = s.comisionado_id AND (c.esPrincipal = true OR c.cargo IS NOT NULL)
    LIMIT 1
  )
)
WHERE s.cargo IS NULL;

-- 3. Crear índice para acelerar consultas analíticas, filtros de dashboard y KPIs
CREATE INDEX IF NOT EXISTS idx_solicitudes_comision_cargo
  ON travel_expenses.solicitudes_comision(cargo);

COMMENT ON COLUMN travel_expenses.solicitudes_comision.cargo IS 'Cargo institucional asignado a la comisión GF-FO-023 para trazabilidad, liquidación y KPIs de analítica.';
COMMENT ON COLUMN travel_expenses.solicitudes_comision.id_cargo IS 'Identificador referencial del cargo institucional (auth.cargos).';
