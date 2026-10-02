-- Migration: 455_eliminar_cargo_y_salario_basico_plano_comisionados.sql
-- Descripción: Elimina las columnas redundantes 'cargo' y 'salario_basico' en travel_expenses.comisionados,
-- consolidando la información de múltiples cargos y salarios relacionales exclusivamente en 'cargos' (JSONB).

SET search_path TO travel_expenses, public;

-- 1. Asegurar que cualquier registro existente con datos en 'cargo' o 'salario_basico' se migre a 'cargos' JSONB
UPDATE travel_expenses.comisionados
SET cargos = jsonb_build_array(
  jsonb_build_object(
    'id', 'crg-' || SUBSTRING(MD5(RANDOM()::text) FROM 1 FOR 8),
    'cargo', TRIM(cargo),
    'salario', COALESCE(salario_basico, 0),
    'idDependencia', id_dependencia,
    'esPrincipal', true,
    'fechaAsignacion', TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  )
)
WHERE (cargos IS NULL OR jsonb_array_length(cargos) = 0)
  AND cargo IS NOT NULL
  AND TRIM(cargo) != '';

-- 2. Eliminar las columnas planas para dejar una única implementación
ALTER TABLE travel_expenses.comisionados
  DROP COLUMN IF EXISTS cargo,
  DROP COLUMN IF EXISTS salario_basico;

COMMENT ON COLUMN travel_expenses.comisionados.cargos IS 'Historial y asignación de cargos del comisionado con su respectivo salario relacional (formato JSONB). Reemplaza y unifica las columnas cargo y salario_basico.';
