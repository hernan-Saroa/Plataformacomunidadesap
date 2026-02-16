ALTER TABLE academic_registration.graduates
ADD COLUMN IF NOT EXISTS num_acta VARCHAR(100);

ALTER TABLE academic_registration.graduates
ADD COLUMN IF NOT EXISTS num_folio VARCHAR(100);

ALTER TABLE academic_registration.graduates
ADD COLUMN IF NOT EXISTS num_libro VARCHAR(100);
