-- ============================================================================
-- seed_tarifas_investigadores.sql
-- Description: Semilla de tarifas diarias por categoría de investigador.
--              Idempotente (INSERT ... ON CONFLICT DO NOTHING).
-- ============================================================================

SET search_path TO travel_expenses, public;

INSERT INTO travel_expenses.tarifas_investigadores (categoria_investigador, tarifa_diaria)
VALUES
  ('JUNIOR', 250000.00),
  ('ASOCIADO', 420000.00),
  ('SENIOR', 650000.00)
ON CONFLICT (categoria_investigador) DO NOTHING;

RESET search_path;
