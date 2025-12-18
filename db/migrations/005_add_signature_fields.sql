-- Campos para firma y nombre por tipo de plantilla (aislar docente/administrador)
ALTER TABLE certification.certificate_template_config
  ADD COLUMN IF NOT EXISTS signature_url TEXT,
  ADD COLUMN IF NOT EXISTS signature_filename TEXT,
  ADD COLUMN IF NOT EXISTS signature_size TEXT,
  ADD COLUMN IF NOT EXISTS signer_name_override TEXT;
