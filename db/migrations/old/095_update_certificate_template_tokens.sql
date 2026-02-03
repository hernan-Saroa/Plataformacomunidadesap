-- ============================================
-- MIGRACION 095: Actualizar tokens de plantillas de certificados laborales
-- Descripcion: Reemplaza [DEPENDENCIA] por [CARGO DATO6] y combina [DEPENDENCIA] [DATO6]
-- ============================================

SET search_path TO certification, public;

-- Docente: renombrar token
UPDATE certificate_template_config
SET certificate_content_html = REPLACE(certificate_content_html, '[DEPENDENCIA]', '[CARGO DATO6]'),
    updated_at = CURRENT_TIMESTAMP
WHERE (template_type = 'docente' OR template_type IS NULL)
  AND certificate_content_html LIKE '%[DEPENDENCIA]%';

-- Administrador: renombrar y combinar tokens adyacentes
UPDATE certificate_template_config
SET certificate_content_html = regexp_replace(
      REPLACE(certificate_content_html, '[DEPENDENCIA]', '[CARGO DATO6]'),
      '\\[CARGO DATO6\\]([[:space:]]|&nbsp;|</span>|<span[^>]*>)*\\[DATO6\\]',
      '[CARGO DATO6]',
      'g'
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE template_type = 'administrador'
  AND (
    certificate_content_html LIKE '%[DEPENDENCIA]%'
    OR (
      certificate_content_html LIKE '%[CARGO DATO6]%'
      AND certificate_content_html LIKE '%[DATO6]%'
    )
  );
