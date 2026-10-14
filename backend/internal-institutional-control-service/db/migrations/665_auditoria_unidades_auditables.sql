-- ============================================================
-- Migración 665: unidades auditables de la auditoría (EFDS-2316)
-- ============================================================
-- Al programar una auditoría se eligen cuáles unidades auditables del
-- proceso (las de Configuración) cubre. Se guardan aparte para mostrarlas
-- en la columna "Unidad Auditable" de la exportación del Programa Anual.
-- ============================================================

ALTER TABLE control_interno.auditoria
  ADD COLUMN IF NOT EXISTS unidades_auditables jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN control_interno.auditoria.unidades_auditables IS
  'Nombres de las unidades auditables del proceso que cubre la auditoría (EFDS-2316)';
