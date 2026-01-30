-- Agregar seccional al registro de graduados
ALTER TABLE academic_registration.graduates
ADD COLUMN IF NOT EXISTS seccional_name VARCHAR(255);

COMMENT ON COLUMN academic_registration.graduates.seccional_name IS 'Seccional/territorial asignada al graduado';
