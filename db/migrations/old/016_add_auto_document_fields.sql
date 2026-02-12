-- ============================================
-- Migracion: Campos de documento para legal_autos
-- ============================================

ALTER TABLE internal_disciplinary_control.legal_autos
ADD COLUMN IF NOT EXISTS numero VARCHAR(50),
ADD COLUMN IF NOT EXISTS "documentUrl" TEXT,
ADD COLUMN IF NOT EXISTS "documentName" TEXT,
ADD COLUMN IF NOT EXISTS "documentType" TEXT,
ADD COLUMN IF NOT EXISTS "documentSize" INTEGER;

DO $$ BEGIN
  ALTER TYPE internal_disciplinary_control.legal_autos_tipo_enum ADD VALUE IF NOT EXISTS 'AUTO_INDAGACION_PRELIMINAR';
  ALTER TYPE internal_disciplinary_control.legal_autos_tipo_enum ADD VALUE IF NOT EXISTS 'AUTO_APERTURA_INVESTIGACION';
  ALTER TYPE internal_disciplinary_control.legal_autos_tipo_enum ADD VALUE IF NOT EXISTS 'AUTO_FORMULACION_PLIEGO';
  ALTER TYPE internal_disciplinary_control.legal_autos_tipo_enum ADD VALUE IF NOT EXISTS 'AUTO_CIERRE';
  ALTER TYPE internal_disciplinary_control.legal_autos_tipo_enum ADD VALUE IF NOT EXISTS 'FALLO_SANCION';
  ALTER TYPE internal_disciplinary_control.legal_autos_tipo_enum ADD VALUE IF NOT EXISTS 'FALLO_ABSOLUTORIO';
EXCEPTION
  WHEN undefined_object THEN null;
END $$;
