-- ============================================
-- MIGRATION 59: GEOLOCATION FIELDS FOR CERTIFICATE VALIDATIONS
-- ============================================
-- Description: Adds location fields for labor certificate validations
-- Date: 2026-01-02

SET search_path TO certification, public;

ALTER TABLE certificate_validations
  ADD COLUMN IF NOT EXISTS country VARCHAR(100),
  ADD COLUMN IF NOT EXISTS region VARCHAR(120),
  ADD COLUMN IF NOT EXISTS city VARCHAR(120),
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS isp VARCHAR(255);

COMMENT ON COLUMN certificate_validations.country IS 'Country detected by IP';
COMMENT ON COLUMN certificate_validations.region IS 'Region detected by IP';
COMMENT ON COLUMN certificate_validations.city IS 'City detected by IP';
COMMENT ON COLUMN certificate_validations.latitude IS 'Latitude detected by IP';
COMMENT ON COLUMN certificate_validations.longitude IS 'Longitude detected by IP';
COMMENT ON COLUMN certificate_validations.isp IS 'Internet service provider';
