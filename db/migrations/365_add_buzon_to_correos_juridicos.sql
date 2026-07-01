-- ============================================================
-- Migration 365: buzón de origen en correos jurídicos
-- Permite separar dos bandejas (cuentas de correo):
--   'JUDICIAL' → tab Judiciales / Oficios
--   'CORREOS'  → tab Correos
-- Los tabs generales (Respondidos/Urgentes/Enviados/Archivados) muestran ambos
-- y filtran internamente por este campo.
-- ============================================================

ALTER TABLE legal_management.correos_juridicos
  ADD COLUMN IF NOT EXISTS buzon VARCHAR(20) NOT NULL DEFAULT 'JUDICIAL';

-- Backfill: todos los correos existentes provienen de la única cuenta actual,
-- que se asigna al buzón JUDICIAL por defecto. Al configurar la segunda cuenta
-- (LEGAL_EMAIL_ACCOUNT_CORREOS) los nuevos correos se etiquetan como 'CORREOS'.
UPDATE legal_management.correos_juridicos
  SET buzon = 'JUDICIAL'
  WHERE buzon IS NULL OR buzon = '';

CREATE INDEX IF NOT EXISTS idx_correos_juridicos_buzon
  ON legal_management.correos_juridicos (buzon);
