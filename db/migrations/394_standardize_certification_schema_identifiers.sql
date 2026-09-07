-- Standardizes only the certification schema. All operations are renames or
-- metadata updates, so existing labor-certificate data is preserved.

BEGIN;

DO $$
BEGIN
  IF to_regclass('certification.firmantes') IS NOT NULL
     AND to_regclass('certification.template_signers') IS NULL THEN
    ALTER TABLE certification.firmantes RENAME TO template_signers;
  ELSIF to_regclass('certification.firmantes') IS NOT NULL
        AND to_regclass('certification.template_signers') IS NOT NULL THEN
    RAISE EXCEPTION
      'Both certification.firmantes and certification.template_signers exist; refusing an ambiguous migration';
  END IF;
END
$$;

DO $$
DECLARE
  rename_pair record;
BEGIN
  FOR rename_pair IN
    SELECT *
    FROM (VALUES
      ('template_signers', 'nombre_completo', 'full_name'),
      ('template_signers', 'cargo', 'position'),
      ('template_signers', 'dependencia', 'department'),
      ('template_signers', 'activo', 'is_active'),
      ('template_signers', 'es_principal', 'is_primary'),
      ('template_signers', 'firma_digital_url', 'signature_url'),
      ('certificate_template_config', 'firmante_id', 'signer_id'),
      ('certificate_template_config', 'cargo_title', 'signer_title'),
      ('certificate_requests', 'cod_cargo', 'position_code'),
      ('certificate_requests', 'cod_grade', 'grade_code'),
      ('certificates', 'cod_cargo', 'position_code'),
      ('certificates', 'cod_grade', 'grade_code'),
      -- These two tables were accidentally included in an old certification
      -- snapshot. If present, standardize only their certification copies.
      ('stage_configuration', 'etapa', 'stage'),
      ('stage_configuration', 'diasHabiles', 'business_days'),
      ('stage_configuration', 'descripcion', 'description'),
      ('stage_configuration', 'activo', 'is_active'),
      ('stage_configuration', 'createdAt', 'created_at'),
      ('stage_configuration', 'updatedAt', 'updated_at'),
      ('system_configuration', 'roleCapacities', 'role_capacities'),
      ('system_configuration', 'notificationSettings', 'notification_settings'),
      ('system_configuration', 'alertSettings', 'alert_settings'),
      ('system_configuration', 'securitySettings', 'security_settings')
    ) AS identifiers(table_name, old_name, new_name)
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'certification'
        AND table_name = rename_pair.table_name
        AND column_name = rename_pair.old_name
    ) AND NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'certification'
        AND table_name = rename_pair.table_name
        AND column_name = rename_pair.new_name
    ) THEN
      EXECUTE format(
        'ALTER TABLE certification.%I RENAME COLUMN %I TO %I',
        rename_pair.table_name,
        rename_pair.old_name,
        rename_pair.new_name
      );
    ELSIF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'certification'
        AND table_name = rename_pair.table_name
        AND column_name = rename_pair.old_name
    ) THEN
      RAISE EXCEPTION
        'Both certification.%.% and certification.%.% exist; refusing an ambiguous migration',
        rename_pair.table_name,
        rename_pair.old_name,
        rename_pair.table_name,
        rename_pair.new_name;
    END IF;
  END LOOP;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'certification.template_signers'::regclass
      AND conname = 'firmantes_pkey'
  ) THEN
    ALTER TABLE certification.template_signers
      RENAME CONSTRAINT firmantes_pkey TO template_signers_pkey;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'certification.certificate_template_config'::regclass
      AND conname = 'certificate_template_config_firmante_id_fkey'
  ) THEN
    ALTER TABLE certification.certificate_template_config
      RENAME CONSTRAINT certificate_template_config_firmante_id_fkey
      TO certificate_template_config_signer_id_fkey;
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('certification.idx_firmantes_principal') IS NOT NULL
     AND to_regclass('certification.idx_template_signers_primary') IS NULL THEN
    ALTER INDEX certification.idx_firmantes_principal
      RENAME TO idx_template_signers_primary;
  END IF;
END
$$;

-- The audit history stores physical field identifiers. Keep it aligned with
-- the renamed column so future rollbacks continue to work.
UPDATE certification.template_config_changes
SET field_name = CASE field_name
  WHEN 'cargo_title' THEN 'signer_title'
  WHEN 'firma_digital_url' THEN 'signature_url'
  WHEN 'nombre_completo' THEN 'signer_name_override'
  ELSE field_name
END
WHERE field_name IN ('cargo_title', 'firma_digital_url', 'nombre_completo');

COMMENT ON TABLE certification.certificate_requests IS
  'Labor certificate requests submitted by employees';
COMMENT ON COLUMN certification.certificate_requests.document_type IS
  'Document type provided through labor-certificate self-service (CC, CE, PP)';
COMMENT ON COLUMN certification.certificate_requests.position_code IS
  'Position code received from the authoritative human-resources source';
COMMENT ON COLUMN certification.certificate_requests.grade_code IS
  'Position grade code received from the authoritative human-resources source';

COMMENT ON TABLE certification.certificate_template_config IS
  'Labor-certificate template configuration';
COMMENT ON COLUMN certification.certificate_template_config.signer_id IS
  'Reference to the signer assigned to this template';
COMMENT ON COLUMN certification.certificate_template_config.entity_logo_url IS
  'URL of the institutional ESAP logo';
COMMENT ON COLUMN certification.certificate_template_config.typography_font IS
  'Font family applied to the certificate';
COMMENT ON COLUMN certification.certificate_template_config.signer_title IS
  'Signer title displayed in the certificate heading';
COMMENT ON COLUMN certification.certificate_template_config.certificate_content_html IS
  'Certificate HTML content with dynamic placeholders';
COMMENT ON COLUMN certification.certificate_template_config.is_active IS
  'Indicates whether this configuration is active';

COMMENT ON TABLE certification.certificate_templates IS
  'HTML templates used to generate certificates';
COMMENT ON TABLE certification.certificate_validations IS
  'Labor-certificate validation history';
COMMENT ON COLUMN certification.certificate_validations.certificate_id IS
  'Reference to the validated certificate';
COMMENT ON COLUMN certification.certificate_validations.result IS
  'Certificate validation result';

COMMENT ON TABLE certification.certificates IS
  'Labor certificates generated with a QR verification code';
COMMENT ON COLUMN certification.certificates.document_type IS
  'Document type stored with the generated labor certificate (CC, CE, PP)';
COMMENT ON COLUMN certification.certificates.position_code IS
  'Position code captured when the certificate was issued';
COMMENT ON COLUMN certification.certificates.grade_code IS
  'Position grade code captured when the certificate was issued';
COMMENT ON COLUMN certification.certificates.include_salary IS
  'Indicates whether the certificate displays salary information';
COMMENT ON COLUMN certification.certificates.include_technical_bonus IS
  'Indicates whether the certificate displays technical-bonus information';
COMMENT ON COLUMN certification.certificates.technical_bonus_category IS
  'Technical-bonus category captured when the certificate was issued';
COMMENT ON COLUMN certification.certificates.technical_bonuses IS
  'JSON snapshot of technical bonuses included when the certificate was issued';
COMMENT ON COLUMN certification.certificates.template_snapshot IS
  'Snapshot of the template used to issue the certificate';
COMMENT ON COLUMN certification.certificates.template_type IS
  'Template type used to issue the certificate';
COMMENT ON COLUMN certification.certificates.template_version IS
  'Version of the template used to issue the certificate';

COMMENT ON TABLE certification.template_signers IS
  'Signers available for labor-certificate templates';
COMMENT ON COLUMN certification.template_signers.is_primary IS
  'Indicates whether this is the default template signer';
COMMENT ON COLUMN certification.template_signers.signature_url IS
  'URL of the signer signature image';

COMMENT ON TABLE certification.signers IS
  'Authorized signers captured on issued certificates';

COMMENT ON TABLE certification.technical_bonus_assignments IS
  'Technical-bonus percentage assignments by employee and category';
COMMENT ON COLUMN certification.technical_bonus_assignments.category IS
  'Technical-bonus category code';
COMMENT ON COLUMN certification.technical_bonus_assignments.id_number IS
  'Normalized employee identification number';
COMMENT ON COLUMN certification.technical_bonus_assignments.percentage IS
  'Assigned technical-bonus percentage (greater than 0 and at most 100)';

COMMENT ON TABLE certification.technical_bonus_templates IS
  'Paragraph templates for technical-bonus sections in labor certificates';
COMMENT ON COLUMN certification.technical_bonus_templates.category IS
  'Stable technical-bonus category code';
COMMENT ON COLUMN certification.technical_bonus_templates.template_text IS
  'Paragraph template with value placeholder tokens';

COMMENT ON TABLE certification.template_config_changes IS
  'Certificate-template configuration change history';
COMMENT ON COLUMN certification.template_config_changes.change_type IS
  'Template configuration change category';
COMMENT ON COLUMN certification.template_config_changes.field_name IS
  'Physical configuration field modified by the change';
COMMENT ON COLUMN certification.template_config_changes.old_value IS
  'Field value before the change';
COMMENT ON COLUMN certification.template_config_changes.new_value IS
  'Field value after the change';
COMMENT ON COLUMN certification.template_config_changes.metadata IS
  'Additional change metadata stored as JSON';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'certification'
      AND table_name = 'firmantes'
  ) OR EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'certification'
      AND column_name IN (
        'firmante_id', 'cargo_title', 'cod_cargo', 'cod_grade',
        'nombre_completo', 'cargo', 'dependencia', 'activo',
        'es_principal', 'firma_digital_url', 'etapa', 'diasHabiles',
        'descripcion', 'createdAt', 'updatedAt', 'roleCapacities',
        'notificationSettings', 'alertSettings', 'securitySettings'
      )
  ) OR EXISTS (
    SELECT 1
    FROM pg_class relation
    JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = 'certification'
      AND relation.relname IN ('firmantes_pkey', 'idx_firmantes_principal')
  ) OR EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE connamespace = 'certification'::regnamespace
      AND conname = 'certificate_template_config_firmante_id_fkey'
  ) THEN
    RAISE EXCEPTION
      'The certification schema still contains Spanish or mixed-language identifiers';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM certification.template_config_changes
    WHERE field_name IN ('cargo_title', 'firma_digital_url', 'nombre_completo')
  ) THEN
    RAISE EXCEPTION
      'The template configuration history still contains legacy physical field identifiers';
  END IF;
END
$$;

COMMIT;
