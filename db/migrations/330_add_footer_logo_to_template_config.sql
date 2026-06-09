BEGIN;

ALTER TABLE academic_registration.certificate_template_config
  ADD COLUMN IF NOT EXISTS footer_logo_url text,
  ADD COLUMN IF NOT EXISTS footer_logo_filename varchar(255);

COMMIT;
