-- ============================================
-- MIGRACION 098: Actualizar token de ubicacion en plantilla docente
-- Descripcion: Reemplaza [DATO6] por [DATO7] en plantillas docente
-- ============================================

SET search_path TO certification, public;

UPDATE certificate_template_config
SET certificate_content_html = REPLACE(certificate_content_html, '[DATO6]', '[DATO7]'),
    updated_at = CURRENT_TIMESTAMP
WHERE (template_type = 'docente' OR template_type IS NULL)
  AND certificate_content_html LIKE '%[DATO6]%';
