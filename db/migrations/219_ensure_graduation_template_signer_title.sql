-- Garantiza persistencia del cargo mostrado bajo la firma electronica
-- en la plantilla de verificacion de titulos.

ALTER TABLE academic_registration.certificate_template_config
  ADD COLUMN IF NOT EXISTS signer_title_override VARCHAR(255);

UPDATE academic_registration.certificate_template_config
SET signer_title_override = 'Direccion Tecnica Registro y Control'
WHERE signer_title_override IS NULL
   OR btrim(signer_title_override) = '';

COMMENT ON COLUMN academic_registration.certificate_template_config.signer_title_override
  IS 'Cargo o titulo del firmante mostrado debajo de la firma electronica o como cierre predeterminado.';
