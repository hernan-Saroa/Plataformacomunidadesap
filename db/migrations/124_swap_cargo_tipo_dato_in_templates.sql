-- Invertir posiciones de [CARGO] y [TIPO_DATO] en plantillas
SET search_path TO certification, public;

UPDATE certificate_template_config
SET certificate_content_html = REPLACE(
    REPLACE(
      REPLACE(certificate_content_html, '[CARGO]', '__TMP_CARGO__'),
      '[TIPO_DATO]', '[CARGO]'
    ),
    '__TMP_CARGO__', '[TIPO_DATO]'
  ),
  updated_at = CURRENT_TIMESTAMP
WHERE certificate_content_html IS NOT NULL
  AND (
    certificate_content_html LIKE '%[CARGO]%'
    OR certificate_content_html LIKE '%[TIPO_DATO]%'
  );

UPDATE certificates
SET template_snapshot = jsonb_set(
  template_snapshot,
  '{certificateContentHtml}',
  to_jsonb(
    REPLACE(
      REPLACE(
        REPLACE(template_snapshot->>'certificateContentHtml', '[CARGO]', '__TMP_CARGO__'),
        '[TIPO_DATO]', '[CARGO]'
      ),
      '__TMP_CARGO__', '[TIPO_DATO]'
    )
  ),
  true
)
WHERE template_snapshot ? 'certificateContentHtml';
