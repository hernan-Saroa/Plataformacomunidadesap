-- Migration: Add seccional_name to graduation_certificates

ALTER TABLE IF EXISTS academic_registration.graduation_certificates
ADD COLUMN IF NOT EXISTS seccional_name VARCHAR(150);

COMMENT ON COLUMN academic_registration.graduation_certificates.seccional_name
IS 'Seccional asociada al certificado (persistida desde aprobaciones manuales)';
