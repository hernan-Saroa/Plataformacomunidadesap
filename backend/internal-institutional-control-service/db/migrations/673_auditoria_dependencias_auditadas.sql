-- ============================================================
-- Migración 673: dependencias auditadas de la auditoría (EFDS-2367)
-- ============================================================
-- Al programar una auditoría se eligen cuáles dependencias del proceso
-- (las de Configuración → Procesos) se auditan. Se guardan aparte para
-- mostrarlas debajo del nombre en la columna A del Programa Anual y se
-- editan en el paso 1. Información básica.
-- ============================================================

ALTER TABLE control_interno.auditoria
  ADD COLUMN IF NOT EXISTS dependencias_auditadas jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN control_interno.auditoria.dependencias_auditadas IS
  'Nombres de las dependencias del proceso que se auditan (EFDS-2367)';
