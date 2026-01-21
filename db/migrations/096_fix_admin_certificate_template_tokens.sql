-- ============================================
-- MIGRACION 096: Corregir token duplicado en plantilla administrador
-- Descripcion: Remueve [DATO6] cuando sigue a [CARGO DATO6]
-- ============================================

SET search_path TO certification, public;

UPDATE certificate_template_config
SET certificate_content_html = regexp_replace(
      regexp_replace(
        translate(REPLACE(certificate_content_html, '[DEPENDENCIA]', '[CARGO DATO6]'), chr(160), ' '),
        '\\[CARGO DATO6\\]</span>([[:space:]]|&nbsp;|&#160;)*<span[^>]*>\\[DATO6\\]</span>',
        '[CARGO DATO6]</span>',
        'g'
      ),
      '\\[CARGO DATO6\\]([[:space:]]|&nbsp;|&#160;)+\\[DATO6\\]',
      '[CARGO DATO6]',
      'g'
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE template_type = 'administrador'
  AND (
    certificate_content_html LIKE '%[DATO6]%'
    OR certificate_content_html LIKE '%[DEPENDENCIA]%'
  );
