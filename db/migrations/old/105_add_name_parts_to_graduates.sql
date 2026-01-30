ALTER TABLE academic_registration.graduates
ADD COLUMN IF NOT EXISTS first_name VARCHAR(255);

ALTER TABLE academic_registration.graduates
ADD COLUMN IF NOT EXISTS last_name VARCHAR(255);
