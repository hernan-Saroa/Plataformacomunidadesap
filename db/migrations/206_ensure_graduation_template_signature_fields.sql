-- Garantiza persistencia en BD de la firma electronica para plantillas
-- de certificados de verificacion de titulos de egresados.

ALTER TABLE academic_registration.certificate_template_config
  ADD COLUMN IF NOT EXISTS signature_url_override TEXT,
  ADD COLUMN IF NOT EXISTS signature_filename_override VARCHAR(255),
  ADD COLUMN IF NOT EXISTS signer_name_override VARCHAR(255);

COMMENT ON COLUMN academic_registration.certificate_template_config.signature_url_override
  IS 'Imagen de firma electronica para la plantilla. Puede guardar data URL base64 o ruta historica.';

COMMENT ON COLUMN academic_registration.certificate_template_config.signature_filename_override
  IS 'Nombre original o normalizado del archivo de firma electronica.';

COMMENT ON COLUMN academic_registration.certificate_template_config.signer_name_override
  IS 'Nombre del firmante mostrado en el certificado cuando la firma electronica esta activa.';
