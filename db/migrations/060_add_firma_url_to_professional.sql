-- ============================================
-- Migration 060: Add Firma URL to Disciplinary Professional
-- Description: Adds a column to store the URL of the professional's signature file (PDF/Image)
-- ============================================

ALTER TABLE internal_disciplinary_control.disciplinary_professional
ADD COLUMN IF NOT EXISTS "firma_url" TEXT;

COMMENT ON COLUMN internal_disciplinary_control.disciplinary_professional."firma_url" IS 'URL del archivo de firma mecánica/digital del profesional';
