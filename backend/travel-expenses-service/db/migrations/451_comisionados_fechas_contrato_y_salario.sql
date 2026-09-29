SET client_encoding = 'UTF8';

-- ============================================================================
-- Migration: 451_comisionados_fechas_contrato_y_salario.sql
-- Created: 2026-09-29
-- Description:
--   Agrega a travel_expenses.comisionados:
--   - fecha_inicio_contrato: DATE (fecha de ingreso o vinculación)
--   - fecha_fin_contrato: DATE (fecha de retiro o finalización del contrato)
--   - salario_basico: NUMERIC(15, 2) (salario o asignación mensual base)
--   - cargo: VARCHAR(150) (denominación del cargo o puesto)
--   - es_facturador_electronico: asegurado como BOOLEAN DEFAULT FALSE
-- ============================================================================

ALTER TABLE travel_expenses.comisionados
  ADD COLUMN IF NOT EXISTS fecha_inicio_contrato DATE,
  ADD COLUMN IF NOT EXISTS fecha_fin_contrato DATE,
  ADD COLUMN IF NOT EXISTS salario_basico NUMERIC(15, 2),
  ADD COLUMN IF NOT EXISTS cargo VARCHAR(150),
  ADD COLUMN IF NOT EXISTS es_facturador_electronico BOOLEAN DEFAULT FALSE NOT NULL;

COMMENT ON COLUMN travel_expenses.comisionados.fecha_inicio_contrato IS 'Fecha de inicio de la vinculación contractual o laboral.';
COMMENT ON COLUMN travel_expenses.comisionados.fecha_fin_contrato IS 'Fecha de terminación o vencimiento del contrato/vinculación laboral.';
COMMENT ON COLUMN travel_expenses.comisionados.salario_basico IS 'Sueldo básico mensual del comisionado según nómina o contrato.';
COMMENT ON COLUMN travel_expenses.comisionados.cargo IS 'Cargo o denominación laboral del comisionado.';
