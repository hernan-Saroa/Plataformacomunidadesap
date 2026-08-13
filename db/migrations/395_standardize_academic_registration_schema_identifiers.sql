-- Standardize only physical identifiers and metadata in academic_registration.
-- Public HTTP payloads, Oracle fields and spreadsheet headers remain unchanged.

BEGIN;

DO $$
DECLARE
  rename_pair record;
BEGIN
  FOR rename_pair IN
    SELECT *
    FROM (VALUES
      ('graduates', 'acta_number', 'registry_reference'),
      ('graduates', 'num_acta', 'graduation_record_number'),
      ('graduates', 'num_folio', 'folio_number'),
      ('graduates', 'num_libro', 'book_number'),
      ('graduates', 'num_registro', 'registry_number'),
      ('graduates', 'seccional_name', 'regional_office_name'),
      ('graduation_certificates', 'acta_number', 'registry_reference'),
      ('graduation_certificates', 'seccional_name', 'regional_office_name'),
      ('graduation_certificate_requests', 'company_nit', 'company_tax_id')
    ) AS identifiers(table_name, old_name, new_name)
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'academic_registration'
        AND table_name = rename_pair.table_name
        AND column_name = rename_pair.old_name
    ) AND NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'academic_registration'
        AND table_name = rename_pair.table_name
        AND column_name = rename_pair.new_name
    ) THEN
      EXECUTE format(
        'ALTER TABLE academic_registration.%I RENAME COLUMN %I TO %I',
        rename_pair.table_name,
        rename_pair.old_name,
        rename_pair.new_name
      );
    ELSIF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'academic_registration'
        AND table_name = rename_pair.table_name
        AND column_name = rename_pair.old_name
    ) THEN
      RAISE EXCEPTION
        'Both academic_registration.%.% and academic_registration.%.% exist; refusing an ambiguous migration',
        rename_pair.table_name,
        rename_pair.old_name,
        rename_pair.table_name,
        rename_pair.new_name;
    END IF;
  END LOOP;
END
$$;

-- This trigger function is stored as PL/pgSQL source text, so column renames do
-- not rewrite its NEW/OLD field references automatically.
CREATE OR REPLACE FUNCTION academic_registration.validate_graduate_management_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.full_name IS DISTINCT FROM OLD.full_name
     OR NEW.first_name IS DISTINCT FROM OLD.first_name
     OR NEW.last_name IS DISTINCT FROM OLD.last_name THEN
    IF NEW.full_name IS NULL
       OR NEW.full_name <> btrim(NEW.full_name)
       OR char_length(NEW.full_name) NOT BETWEEN 5 AND 150
       OR NEW.full_name !~ '^[-[:alpha:][:space:]''’]+$' THEN
      RAISE EXCEPTION
        'El nombre completo debe tener entre 5 y 150 caracteres y solo puede contener letras, espacios, apostrofes y guiones.'
        USING ERRCODE = '23514';
    END IF;

    IF NEW.first_name IS DISTINCT FROM OLD.first_name
       AND (
         NEW.first_name IS NULL
         OR NEW.first_name <> btrim(NEW.first_name)
         OR char_length(NEW.first_name) NOT BETWEEN 1 AND 150
         OR NEW.first_name !~ '^[-[:alpha:][:space:]''’]+$'
       ) THEN
      RAISE EXCEPTION
        'El nombre solo puede contener letras, espacios, apostrofes y guiones.'
        USING ERRCODE = '23514';
    END IF;

    IF NEW.last_name IS DISTINCT FROM OLD.last_name
       AND (
         NEW.last_name IS NULL
         OR NEW.last_name <> btrim(NEW.last_name)
         OR char_length(NEW.last_name) NOT BETWEEN 1 AND 150
         OR NEW.last_name !~ '^[-[:alpha:][:space:]''’]+$'
       ) THEN
      RAISE EXCEPTION
        'El apellido solo puede contener letras, espacios, apostrofes y guiones.'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF NEW.id_number IS DISTINCT FROM OLD.id_number
     AND (
       NEW.id_number IS NULL
       OR NEW.id_number <> btrim(NEW.id_number)
       OR char_length(NEW.id_number) NOT BETWEEN 5 AND 20
       OR NEW.id_number !~ '^[A-Za-z0-9]+$'
     ) THEN
    RAISE EXCEPTION
      'El documento debe tener entre 5 y 20 caracteres y solo puede contener letras y numeros.'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.email IS DISTINCT FROM OLD.email
     AND (
       NEW.email IS NULL
       OR NEW.email <> btrim(NEW.email)
       OR char_length(NEW.email) NOT BETWEEN 5 AND 254
       OR NEW.email !~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
     ) THEN
    RAISE EXCEPTION
      'El correo electronico debe tener entre 5 y 254 caracteres y un formato valido.'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.registry_number IS DISTINCT FROM OLD.registry_number
     AND (
       NEW.registry_number IS NULL
       OR NEW.registry_number !~ '^[0-9]{1,20}$'
     ) THEN
    RAISE EXCEPTION
      'El numero de registro es obligatorio y debe contener entre 1 y 20 caracteres numericos.'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.folio_number IS DISTINCT FROM OLD.folio_number
     AND (
       NEW.folio_number IS NULL
       OR NEW.folio_number !~ '^[0-9]{1,10}$'
     ) THEN
    RAISE EXCEPTION
      'El numero de folio es obligatorio y debe contener entre 1 y 10 caracteres numericos.'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.book_number IS DISTINCT FROM OLD.book_number
     AND (
       NEW.book_number IS NULL
       OR NEW.book_number !~ '^[0-9]{1,10}$'
     ) THEN
    RAISE EXCEPTION
      'El numero de libro es obligatorio y debe contener entre 1 y 10 caracteres numericos.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON TABLE academic_registration.certificate_template_config IS
  'Certificate template configuration';
COMMENT ON TABLE academic_registration.certificate_validations IS
  'Public certificate validation history';
COMMENT ON TABLE academic_registration.graduates IS
  'Graduates from the supported academic program types';
COMMENT ON TABLE academic_registration.graduation_certificate_requests IS
  'Graduation certificate requests across workflow states';
COMMENT ON TABLE academic_registration.graduation_certificates IS
  'Issued graduation certificates with valid QR codes';
COMMENT ON TABLE academic_registration.signers IS
  'Authorized certificate signers';
COMMENT ON TABLE academic_registration.template_config_changes IS
  'Certificate template change history';

COMMENT ON COLUMN academic_registration.certificate_template_config.signature_filename_override IS
  'Original or normalized electronic signature filename';
COMMENT ON COLUMN academic_registration.certificate_template_config.signature_url_override IS
  'Electronic signature image for the template; supports a base64 data URL or a historical path';
COMMENT ON COLUMN academic_registration.certificate_template_config.signer_name_override IS
  'Signer name displayed on the certificate when the electronic signature is active';
COMMENT ON COLUMN academic_registration.certificate_template_config.signer_title_override IS
  'Signer position or title displayed below the electronic signature or as the default closing title';
COMMENT ON COLUMN academic_registration.graduates.id_issue_date IS
  'Identity document issue date';
COMMENT ON COLUMN academic_registration.graduates.registry_reference IS
  'Composite registry, folio and book reference used by issued certificates';
COMMENT ON COLUMN academic_registration.graduates.graduation_record_number IS
  'Graduation record number received from the academic source system';
COMMENT ON COLUMN academic_registration.graduates.folio_number IS
  'Academic registry folio number';
COMMENT ON COLUMN academic_registration.graduates.book_number IS
  'Academic registry book number';
COMMENT ON COLUMN academic_registration.graduates.registry_number IS
  'Academic registry number';
COMMENT ON COLUMN academic_registration.graduates.regional_office_name IS
  'Regional office assigned to the graduate';
COMMENT ON COLUMN academic_registration.graduation_certificate_requests.company_tax_id IS
  'Company tax identifier supplied by the requester';
COMMENT ON COLUMN academic_registration.graduation_certificate_requests.approval_status IS
  'Workflow state: PENDING_APPROVAL, PENDING_HEAD_APPROVAL, APPROVED_FINAL, REJECTED_FINAL, OBSERVATION or HEAD_OBSERVATION';
COMMENT ON COLUMN academic_registration.graduation_certificate_requests.head_decision IS
  'Academic registration head decision: APPROVED, REJECTED or OBSERVATION';
COMMENT ON COLUMN academic_registration.graduation_certificate_requests.head_notes IS
  'Notes or justification from the academic registration head';
COMMENT ON COLUMN academic_registration.graduation_certificate_requests.head_reviewed_at IS
  'Date and time when the academic registration head issued a final decision or observation';
COMMENT ON COLUMN academic_registration.graduation_certificate_requests.head_reviewed_by IS
  'Identifier of the academic registration head who issued the decision';
COMMENT ON COLUMN academic_registration.graduation_certificate_requests.head_reviewer_name IS
  'Name of the academic registration head who issued the decision';
COMMENT ON COLUMN academic_registration.graduation_certificate_requests.review_payload IS
  'Data verified by the reviewer before final approval';
COMMENT ON COLUMN academic_registration.graduation_certificate_requests.review_recommendation IS
  'Reviewer recommendation: APPROVED or REJECTED; OBSERVATION is reserved for the approver';
COMMENT ON COLUMN academic_registration.graduation_certificate_requests.review_timeline IS
  'Chronological reviewer and approver workflow trace';
COMMENT ON COLUMN academic_registration.graduation_certificates.registry_reference IS
  'Composite registry, folio and book reference stored when the certificate is issued';
COMMENT ON COLUMN academic_registration.graduation_certificates.regional_office_name IS
  'Regional office associated with the certificate and persisted from manual approvals';
COMMENT ON COLUMN academic_registration.graduation_certificates.template_snapshot IS
  'JSON snapshot of the template used when the certificate was issued';

COMMENT ON CONSTRAINT chk_graduation_review_notes_length
  ON academic_registration.graduation_certificate_requests IS
  'Reviewer notes must contain 10 to 4000 characters without leading or trailing spaces';
COMMENT ON CONSTRAINT chk_graduation_review_payload_fields
  ON academic_registration.graduation_certificate_requests IS
  'Validates the name, identity document, email, registry, folio and book submitted by the reviewer';
COMMENT ON CONSTRAINT chk_manual_review_graduate_fields
  ON academic_registration.graduates IS
  'Validates manually reviewed graduates with registry length 1-20 and folio/book length 1-10';
COMMENT ON FUNCTION academic_registration.validate_graduate_management_update() IS
  'Applies registry length 1-20 and folio/book length 1-10 to graduate management updates';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns column_info
    JOIN (VALUES
      ('graduates', 'acta_number'),
      ('graduates', 'num_acta'),
      ('graduates', 'num_folio'),
      ('graduates', 'num_libro'),
      ('graduates', 'num_registro'),
      ('graduates', 'seccional_name'),
      ('graduation_certificates', 'acta_number'),
      ('graduation_certificates', 'seccional_name'),
      ('graduation_certificate_requests', 'company_nit')
    ) AS legacy(table_name, column_name)
      ON legacy.table_name = column_info.table_name
     AND legacy.column_name = column_info.column_name
    WHERE column_info.table_schema = 'academic_registration'
  ) THEN
    RAISE EXCEPTION
      'The academic_registration schema still contains mixed-language column identifiers';
  END IF;
END
$$;

COMMIT;
