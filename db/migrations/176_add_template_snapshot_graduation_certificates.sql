ALTER TABLE academic_registration.graduation_certificates
ADD COLUMN IF NOT EXISTS template_snapshot JSONB;

COMMENT ON COLUMN academic_registration.graduation_certificates.template_snapshot IS 'Snapshot JSON de la plantilla usada al emitir el certificado';

WITH default_texts AS (
  SELECT
    '{
      "cityDatePrefix": "Bogota, D.C.,",
      "institutionTitle": "ESCUELA SUPERIOR DE ADMINISTRACION PUBLICA - ESAP",
      "certificateTitle": "Verificacion de titulo",
      "addressee": "A QUIEN INTERESE",
      "introParagraph": "De conformidad con los registros en el Sistema de Control Academico de la Escuela Superior de Administracion Publica -ESAP-, nos permitimos informar la verificacion del siguiente titulo academico:",
      "degreeLabel": "Titulo otorgado:",
      "graduateNameLabel": "Nombres y apellidos del egresado graduado:",
      "documentLabel": "Numero de documento de identificacion:",
      "issuePlaceDateLabel": "Lugar y fecha de expedicion del titulo:",
      "registryLabel": "Registro - Folio - Libro:",
      "closingText": "Cordialmente,",
      "signerTitle": "Direccion Tecnica Registro y Control",
      "validationMessage": "Puede validar la autenticidad de esta verificacion en"
    }'::jsonb AS texts
),
active_config AS (
  SELECT
    cfg.id,
    cfg.version,
    cfg.updated_at,
    cfg.typography_font,
    cfg.signer_id,
    cfg.institution_logo_url,
    cfg.institution_logo_filename,
    cfg.signer_name_override,
    cfg.signature_url_override,
    cfg.signature_filename_override
  FROM academic_registration.certificate_template_config cfg
  WHERE cfg.is_active = TRUE
  ORDER BY cfg.updated_at DESC NULLS LAST, cfg.id DESC
  LIMIT 1
),
history_snapshot AS (
  SELECT
    c.id AS certificate_id,
    jsonb_build_object(
      'schemaVersion', 1,
      'templateConfigId', cfg.id,
      'templateVersion', COALESCE(cfg.version, '1.0.0'),
      'templateUpdatedAt', to_char(
        tcc.change_date AT TIME ZONE 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
      ),
      'typographyFont', COALESCE(cfg.typography_font, 'Arial Narrow, Arial, sans-serif'),
      'signerId', cfg.signer_id,
      'institutionLogoUrl', cfg.institution_logo_url,
      'institutionLogoFilename', cfg.institution_logo_filename,
      'signerNameOverride', cfg.signer_name_override,
      'signatureUrlOverride', cfg.signature_url_override,
      'signatureFilenameOverride', cfg.signature_filename_override,
      'texts', COALESCE((tcc.new_value::jsonb)->'texts', defaults.texts)
    ) AS snapshot
  FROM academic_registration.graduation_certificates c
  CROSS JOIN default_texts defaults
  JOIN active_config cfg ON TRUE
  LEFT JOIN LATERAL (
    SELECT
      change_date,
      new_value
    FROM academic_registration.template_config_changes tcc
    WHERE tcc.template_config_id = cfg.id
      AND tcc.field_changed = 'certificate_template_texts'
      AND tcc.new_value IS NOT NULL
      AND LEFT(TRIM(tcc.new_value), 1) = '{'
      AND tcc.change_date <= COALESCE(c.created_at, CURRENT_TIMESTAMP)
    ORDER BY tcc.change_date DESC
    LIMIT 1
  ) tcc ON TRUE
),
fallback_snapshot AS (
  SELECT
    jsonb_build_object(
      'schemaVersion', 1,
      'templateConfigId', cfg.id,
      'templateVersion', COALESCE(cfg.version, '1.0.0'),
      'templateUpdatedAt', CASE
        WHEN cfg.updated_at IS NOT NULL THEN to_char(
          cfg.updated_at AT TIME ZONE 'UTC',
          'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
        )
        ELSE NULL
      END,
      'typographyFont', COALESCE(cfg.typography_font, 'Arial Narrow, Arial, sans-serif'),
      'signerId', cfg.signer_id,
      'institutionLogoUrl', cfg.institution_logo_url,
      'institutionLogoFilename', cfg.institution_logo_filename,
      'signerNameOverride', cfg.signer_name_override,
      'signatureUrlOverride', cfg.signature_url_override,
      'signatureFilenameOverride', cfg.signature_filename_override,
      'texts', defaults.texts
    ) AS snapshot
  FROM default_texts defaults
  LEFT JOIN active_config cfg ON TRUE
)
UPDATE academic_registration.graduation_certificates c
SET template_snapshot = COALESCE(
  (
    SELECT history.snapshot
    FROM history_snapshot history
    WHERE history.certificate_id = c.id
  ),
  (
    SELECT fallback.snapshot
    FROM fallback_snapshot fallback
    LIMIT 1
  ),
  jsonb_build_object(
    'schemaVersion', 1,
    'templateConfigId', NULL,
    'templateVersion', '1.0.0',
    'templateUpdatedAt', NULL,
    'typographyFont', 'Arial Narrow, Arial, sans-serif',
    'signerId', NULL,
    'institutionLogoUrl', NULL,
    'institutionLogoFilename', NULL,
    'signerNameOverride', NULL,
    'signatureUrlOverride', NULL,
    'signatureFilenameOverride', NULL,
    'texts', defaults.texts
  )
)
FROM default_texts defaults
WHERE c.template_snapshot IS NULL;
