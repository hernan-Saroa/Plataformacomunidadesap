-- Congelar snapshot de plantilla para certificados existentes sin snapshot
-- para que cambios futuros de plantilla no afecten certificados ya emitidos.
SET search_path TO certification, public;

WITH default_firmante AS (
  SELECT f.*
  FROM firmantes f
  WHERE f.activo = true
  ORDER BY f.es_principal DESC, f.updated_at DESC NULLS LAST, f.created_at DESC NULLS LAST
  LIMIT 1
),
active_template AS (
  SELECT DISTINCT ON (cfg.template_type)
    cfg.id,
    cfg.template_type,
    cfg.version,
    cfg.status,
    cfg.typography_font,
    cfg.cargo_title,
    cfg.certificate_content_html,
    cfg.entity_logo_url,
    cfg.entity_logo_filename,
    cfg.entity_logo_size,
    cfg.signature_url,
    cfg.signer_name_override,
    cfg.updated_by,
    cfg.created_at,
    cfg.updated_at,
    cfg.firmante_id
  FROM certificate_template_config cfg
  WHERE cfg.is_active = true
  ORDER BY cfg.template_type, cfg.updated_at DESC NULLS LAST, cfg.id DESC
),
certificates_to_freeze AS (
  SELECT
    c.id,
    COALESCE(
      NULLIF(BTRIM(c.template_type), ''),
      CASE
        WHEN POSITION('docen' IN LOWER(COALESCE(c.position_category, '') || ' ' || COALESCE(c.career_category, ''))) > 0
             OR POSITION(' doc ' IN (' ' || LOWER(COALESCE(c.position_category, '') || ' ' || COALESCE(c.career_category, '')) || ' ')) > 0
          THEN 'docente'
        ELSE 'administrador'
      END
    ) AS resolved_template_type
  FROM certificates c
  WHERE c.template_snapshot IS NULL
)
UPDATE certificates c
SET
  template_snapshot = jsonb_strip_nulls(
    jsonb_build_object(
      'id', tpl.id,
      'version', tpl.version,
      'status', tpl.status,
      'templateType', tpl.template_type,
      'createdAt', tpl.created_at,
      'updatedAt', tpl.updated_at,
      'updatedBy', tpl.updated_by,
      'typography', jsonb_build_object(
        'font',
        COALESCE(NULLIF(BTRIM(tpl.typography_font), ''), 'Arial Narrow, Arial, sans-serif')
      ),
      'cargoTitle', COALESCE(tpl.cargo_title, ''),
      'certificateContentHtml', COALESCE(tpl.certificate_content_html, ''),
      'logo',
      CASE
        WHEN COALESCE(BTRIM(tpl.entity_logo_url), '') <> ''
          THEN jsonb_build_object(
            'url', tpl.entity_logo_url,
            'filename', tpl.entity_logo_filename,
            'size', tpl.entity_logo_size
          )
        ELSE NULL
      END,
      'firmante',
      CASE
        WHEN COALESCE(
          NULLIF(BTRIM(tpl.signer_name_override), ''),
          assigned.nombre_completo,
          fallback.nombre_completo
        ) IS NOT NULL
          THEN jsonb_build_object(
            'id', COALESCE(assigned.id, fallback.id),
            'nombreCompleto', COALESCE(
              NULLIF(BTRIM(tpl.signer_name_override), ''),
              assigned.nombre_completo,
              fallback.nombre_completo
            ),
            'cargo', COALESCE(assigned.cargo, fallback.cargo),
            'dependencia', COALESCE(assigned.dependencia, fallback.dependencia),
            'firmaDigitalUrl', COALESCE(
              NULLIF(BTRIM(tpl.signature_url), ''),
              assigned.firma_digital_url,
              fallback.firma_digital_url
            )
          )
        ELSE NULL
      END
    )
  ),
  template_type = cert.resolved_template_type,
  template_version = COALESCE(NULLIF(BTRIM(c.template_version), ''), tpl.version)
FROM certificates_to_freeze cert
JOIN active_template tpl
  ON tpl.template_type = cert.resolved_template_type
LEFT JOIN firmantes assigned
  ON assigned.id = tpl.firmante_id
LEFT JOIN default_firmante fallback
  ON TRUE
WHERE c.id = cert.id
  AND c.template_snapshot IS NULL;
