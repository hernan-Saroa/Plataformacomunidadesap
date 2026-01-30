-- Agrega el tipo de plantilla para soportar variantes (docente/administrador)
ALTER TABLE certification.certificate_template_config
  ADD COLUMN IF NOT EXISTS template_type VARCHAR(30) NOT NULL DEFAULT 'docente';

-- Asegurar valor por defecto en filas existentes
UPDATE certification.certificate_template_config
  SET template_type = 'docente'
  WHERE template_type IS NULL;

CREATE INDEX IF NOT EXISTS idx_certificate_template_config_template_type
  ON certification.certificate_template_config (template_type);
