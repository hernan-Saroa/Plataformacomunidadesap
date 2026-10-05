SET client_encoding = 'UTF8';

-- ============================================================================
-- Migration: 454_comisionados_cuentas_bancarias_y_cargos.sql
-- Description:
--   Agrega a travel_expenses.comisionados:
--   - cuentas_bancarias: JSONB DEFAULT '[]'::jsonb (historial de cuentas bancarias asociadas al comisionado)
--   - cargos: JSONB DEFAULT '[]'::jsonb (historial de cargos y salarios relacionales del comisionado)
-- ============================================================================

ALTER TABLE travel_expenses.comisionados
  ADD COLUMN IF NOT EXISTS cuentas_bancarias JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS cargos JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN travel_expenses.comisionados.cuentas_bancarias IS 'Historial y lista de cuentas bancarias del comisionado (banco, tipo_cuenta, numero_cuenta, url_certificado, etc.).';
COMMENT ON COLUMN travel_expenses.comisionados.cargos IS 'Historial de cargos y asignaciones salariales relacionales del comisionado (cargo, salario, idDependencia, esPrincipal).';

-- Si existen comisionados con cargo o salario_basico, inicializar cargos con el cargo y salario actual
UPDATE travel_expenses.comisionados
SET cargos = jsonb_build_array(
  jsonb_build_object(
    'id', gen_random_uuid()::text,
    'cargo', cargo,
    'salario', COALESCE(salario_basico, 0),
    'idDependencia', id_dependencia,
    'esPrincipal', true
  )
)
WHERE cargo IS NOT NULL AND (cargos IS NULL OR cargos = '[]'::jsonb);
