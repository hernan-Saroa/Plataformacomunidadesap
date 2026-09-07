-- ============================================================================
-- seed_escalas_viaticos.sql
-- Description: Semilla de la escala salarial Decreto 314 de 2026 para
--              comisiones en el interior del país.
--              Idempotente (INSERT ... ON CONFLICT DO NOTHING).
-- ============================================================================

SET search_path TO travel_expenses, public;

INSERT INTO travel_expenses.escalas_viaticos (decreto_vigente, ano_vigencia, rango_minimo, rango_maximo, tarifa_diaria)
VALUES
  ('Decreto 314 de 2026', 2026, 0.00, 1917184.00, 173886.00),
  ('Decreto 314 de 2026', 2026, 1917185.00, 3012670.00, 237646.00),
  ('Decreto 314 de 2026', 2026, 3012671.00, 4022982.00, 288347.00),
  ('Decreto 314 de 2026', 2026, 4022983.00, 5102609.00, 335520.00),
  ('Decreto 314 de 2026', 2026, 5102610.00, 6162456.00, 385283.00),
  ('Decreto 314 de 2026', 2026, 6162457.00, 9293915.00, 434866.00),
  ('Decreto 314 de 2026', 2026, 9293916.00, 12989690.00, 528210.00),
  ('Decreto 314 de 2026', 2026, 12989691.00, 15423452.00, 712557.00),
  ('Decreto 314 de 2026', 2026, 15423453.00, 18986843.00, 926311.00),
  ('Decreto 314 de 2026', 2026, 18986844.00, 22958733.00, 1120464.00),
  ('Decreto 314 de 2026', 2026, 22958734.00, 999999999.00, 1319516.00)
ON CONFLICT DO NOTHING;

RESET search_path;
