-- ============================================================================
-- seed_tarifas_regionales_excepcion.sql
-- Description: Semilla de excepciones del Artículo 5 del Decreto 314 de 2026
--              para departamentos creados por el artículo 309 de la Constitución
--              (nuevos departamentos), exceptuando San Andrés.
--              Idempotente (INSERT ... ON CONFLICT DO NOTHING).
-- ============================================================================

SET search_path TO travel_expenses, public;

INSERT INTO travel_expenses.tarifas_regionales_excepcion (departamento, es_nuevo_departamento, tarifa_diaria, decreto_referencia)
VALUES
  ('Amazonas', TRUE, 380000.00, 'Decreto 314 de 2026 - Artículo 5'),
  ('Arauca', TRUE, 360000.00, 'Decreto 314 de 2026 - Artículo 5'),
  ('Casanare', TRUE, 370000.00, 'Decreto 314 de 2026 - Artículo 5'),
  ('Putumayo', TRUE, 390000.00, 'Decreto 314 de 2026 - Artículo 5'),
  ('Guaviare', TRUE, 400000.00, 'Decreto 314 de 2026 - Artículo 5'),
  ('Guainía', TRUE, 410000.00, 'Decreto 314 de 2026 - Artículo 5'),
  ('Vaupés', TRUE, 420000.00, 'Decreto 314 de 2026 - Artículo 5'),
  ('Vichada', TRUE, 430000.00, 'Decreto 314 de 2026 - Artículo 5')
ON CONFLICT (departamento) DO NOTHING;

RESET search_path;
