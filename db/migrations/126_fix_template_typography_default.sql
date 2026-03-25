-- Alinear la tipografia predeterminada de certificados laborales con la fuente actual de produccion
SET search_path TO certification, public;

ALTER TABLE certificate_template_config
  ALTER COLUMN typography_font SET DEFAULT 'Arial Narrow, Arial, sans-serif';

-- Solo corrige configuraciones que siguen con el valor legacy y nunca registraron cambio explicito de tipografia.
UPDATE certificate_template_config cfg
SET typography_font = 'Arial Narrow, Arial, sans-serif',
    updated_at = CURRENT_TIMESTAMP
WHERE (
    cfg.typography_font IS NULL
    OR BTRIM(cfg.typography_font) = ''
    OR LOWER(BTRIM(cfg.typography_font)) = LOWER('Times New Roman')
  )
  AND NOT EXISTS (
    SELECT 1
    FROM template_config_changes ch
    WHERE ch.template_config_id = cfg.id
      AND (
        ch.field_name = 'typography_font'
        OR ch.field_name = 'typographyFont'
      )
      AND ch.change_type = 'tipografia'
  );
