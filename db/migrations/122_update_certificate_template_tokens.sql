-- Renombrar variables en plantillas de certificados laborales
SET search_path TO certification, public;

UPDATE certificate_template_config
SET certificate_content_html = REPLACE(
    REPLACE(
      REPLACE(certificate_content_html, '[DATO3]', '[CARGO]'),
      '[CARGO DATO6]', '[TIPO_DATO]'
    ),
    '[DATO7]', '[UBICACIÓN]'
  ),
    updated_at = CURRENT_TIMESTAMP
WHERE certificate_content_html IS NOT NULL
  AND (
    certificate_content_html LIKE '%[DATO3]%'
    OR certificate_content_html LIKE '%[CARGO DATO6]%'
    OR certificate_content_html LIKE '%[DATO7]%'
  );
