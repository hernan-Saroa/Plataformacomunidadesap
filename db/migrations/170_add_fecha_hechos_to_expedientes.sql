-- 170_add_fecha_hechos_to_expedientes.sql
-- Adds fecha_hechos column to expedientes table for disciplinary processes.
-- This date determines which law applies:
--   Before 30/06/2021  → Ley 734 de 2002
--   On/After 30/06/2021 → Ley 1952 de 2019

ALTER TABLE legal_management.expedientes
    ADD COLUMN IF NOT EXISTS fecha_hechos TIMESTAMP NULL;

COMMENT ON COLUMN legal_management.expedientes.fecha_hechos IS
    'Fecha en que ocurrieron los hechos disciplinarios. Determina la ley aplicable: anterior al 30/06/2021 = Ley 734/2002, igual o posterior = Ley 1952/2019.';
