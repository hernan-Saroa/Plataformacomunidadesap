-- Persistir preferencias de visualizacion por certificado laboral
ALTER TABLE certification.certificates
  ADD COLUMN IF NOT EXISTS include_salary BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS include_technical_bonus BOOLEAN DEFAULT FALSE;

UPDATE certification.certificates
SET
  include_salary = COALESCE(include_salary, TRUE),
  include_technical_bonus = COALESCE(include_technical_bonus, FALSE);

-- Regla de consistencia: no se puede incluir prima tecnica cuando el salario va oculto
UPDATE certification.certificates
SET include_technical_bonus = FALSE
WHERE include_salary = FALSE;

ALTER TABLE certification.certificates
  ALTER COLUMN include_salary SET DEFAULT TRUE,
  ALTER COLUMN include_salary SET NOT NULL,
  ALTER COLUMN include_technical_bonus SET DEFAULT FALSE,
  ALTER COLUMN include_technical_bonus SET NOT NULL;

COMMENT ON COLUMN certification.certificates.include_salary IS
  'Indica si el certificado debe mostrar informacion salarial';

COMMENT ON COLUMN certification.certificates.include_technical_bonus IS
  'Indica si el certificado debe mostrar prima tecnica';
