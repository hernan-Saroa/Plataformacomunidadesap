-- Add department_son columns and seed placeholders once.
-- Safe to run multiple times; only fills NULL values.

ALTER TABLE IF EXISTS certification.certificates
  ADD COLUMN IF NOT EXISTS department_son VARCHAR(255);

UPDATE certification.certificates
SET department_son = 'Registro hijo'
WHERE department_son IS NULL;

ALTER TABLE IF EXISTS certification.certificate_requests
  ADD COLUMN IF NOT EXISTS department_son VARCHAR(255);

UPDATE certification.certificate_requests
SET department_son = 'Registro hijo'
WHERE department_son IS NULL;
