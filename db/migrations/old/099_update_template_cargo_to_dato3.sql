-- ============================================
-- MIGRACION 099: Reemplazar [CARGO] por [DATO3] en plantillas
-- Descripcion: Usa el tipo de vinculacion en lugar de [CARGO] para docente y administrador
-- ============================================

SET search_path TO certification, public;

UPDATE certificate_template_config
SET certificate_content_html = REPLACE(certificate_content_html, '[CARGO]', '[DATO3]'),
    updated_at = CURRENT_TIMESTAMP
WHERE certificate_content_html LIKE '%[CARGO]%';
