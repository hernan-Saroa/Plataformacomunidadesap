-- ============================================
-- MIGRACION 097: Normalizar tokens en plantilla administrador
-- Descripcion: Deja solo [CARGO DATO6] cuando aparezca junto a [DATO6]
-- ============================================

SET search_path TO certification, public;

UPDATE certificate_template_config
SET certificate_content_html = regexp_replace(
      regexp_replace(
        translate(REPLACE(certificate_content_html, '[DEPENDENCIA]', '[CARGO DATO6]'), chr(160), ' '),
        E'\\[CARGO DATO6\\]([[:space:]]|&nbsp;|&#160;|&amp;nbsp;|<[^>]+>)*\\[DATO6\\]',
        '[CARGO DATO6]',
        'g'
      ),
      E'\\[DATO6\\]([[:space:]]|&nbsp;|&#160;|&amp;nbsp;|<[^>]+>)*\\[CARGO DATO6\\]',
      '[CARGO DATO6]',
      'g'
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE template_type = 'administrador'
  AND (
    certificate_content_html LIKE '%[DATO6]%'
    OR certificate_content_html LIKE '%[DEPENDENCIA]%'
    OR certificate_content_html LIKE '%[CARGO DATO6]%'
  );
