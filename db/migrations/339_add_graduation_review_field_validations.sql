-- Valida en base de datos la informacion cargada por el revisor de titulos.
-- Los tipos y longitudes fisicas existentes son mas amplios, por lo que no se
-- reducen columnas ni se modifica informacion historica.

BEGIN;

ALTER TABLE academic_registration.graduation_certificate_requests
  DROP CONSTRAINT IF EXISTS chk_graduation_review_notes_length,
  DROP CONSTRAINT IF EXISTS chk_graduation_review_payload_fields;

ALTER TABLE academic_registration.graduation_certificate_requests
  ADD CONSTRAINT chk_graduation_review_notes_length
  CHECK (
    NOT (
      manual_review
      AND review_recommendation IN ('APPROVED', 'REJECTED')
    )
    OR (
      review_recommendation_reason IS NOT NULL
      AND review_recommendation_reason = btrim(review_recommendation_reason)
      AND char_length(review_recommendation_reason) BETWEEN 10 AND 4000
    )
  ) NOT VALID,
  ADD CONSTRAINT chk_graduation_review_payload_fields
  CHECK (
    NOT (
      manual_review
      AND review_recommendation = 'APPROVED'
    )
    OR (
      review_payload IS NOT NULL
      AND jsonb_typeof(review_payload) = 'object'

      AND review_payload ? 'fullName'
      AND review_payload->>'fullName' = btrim(review_payload->>'fullName')
      AND char_length(review_payload->>'fullName') BETWEEN 5 AND 150
      AND review_payload->>'fullName' ~ '^[-[:alpha:][:space:]''’]+$'

      AND review_payload ? 'idNumber'
      AND review_payload->>'idNumber' = btrim(review_payload->>'idNumber')
      AND char_length(review_payload->>'idNumber') BETWEEN 5 AND 20
      AND review_payload->>'idNumber' ~ '^[A-Za-z0-9]+$'

      AND review_payload ? 'email'
      AND review_payload->>'email' = btrim(review_payload->>'email')
      AND char_length(review_payload->>'email') BETWEEN 5 AND 254
      AND review_payload->>'email' ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'

      AND review_payload ? 'numRegistro'
      AND review_payload->>'numRegistro' ~ '^[0-9]{1,20}$'

      AND review_payload ? 'numFolio'
      AND review_payload->>'numFolio' ~ '^[0-9]{1,10}$'

      AND review_payload ? 'numLibro'
      AND review_payload->>'numLibro' ~ '^[0-9]{1,10}$'
    )
  ) NOT VALID;

ALTER TABLE academic_registration.graduates
  DROP CONSTRAINT IF EXISTS chk_manual_review_graduate_fields;

ALTER TABLE academic_registration.graduates
  ADD CONSTRAINT chk_manual_review_graduate_fields
  CHECK (
    created_by IS NULL
    OR created_by NOT LIKE 'manual_review%'
    OR (
      full_name = btrim(full_name)
      AND char_length(full_name) BETWEEN 5 AND 150
      AND full_name ~ '^[-[:alpha:][:space:]''’]+$'

      AND id_number = btrim(id_number)
      AND char_length(id_number) BETWEEN 5 AND 20
      AND id_number ~ '^[A-Za-z0-9]+$'

      AND email IS NOT NULL
      AND email = btrim(email)
      AND char_length(email) BETWEEN 5 AND 254
      AND email ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'

      AND num_registro IS NOT NULL
      AND num_registro ~ '^[0-9]{1,20}$'
      AND num_folio IS NOT NULL
      AND num_folio ~ '^[0-9]{1,10}$'
      AND num_libro IS NOT NULL
      AND num_libro ~ '^[0-9]{1,10}$'
    )
  ) NOT VALID;

DO $$
DECLARE
  invalid_count integer;
BEGIN
  SELECT count(*)
  INTO invalid_count
  FROM academic_registration.graduation_certificate_requests
  WHERE NOT (
    NOT (
      manual_review
      AND review_recommendation IN ('APPROVED', 'REJECTED')
    )
    OR (
      review_recommendation_reason IS NOT NULL
      AND review_recommendation_reason = btrim(review_recommendation_reason)
      AND char_length(review_recommendation_reason) BETWEEN 10 AND 4000
    )
  );

  IF invalid_count = 0 THEN
    ALTER TABLE academic_registration.graduation_certificate_requests
      VALIDATE CONSTRAINT chk_graduation_review_notes_length;
  ELSE
    RAISE NOTICE
      'chk_graduation_review_notes_length queda NOT VALID por % registro(s) historico(s); las inserciones y actualizaciones nuevas quedan protegidas.',
      invalid_count;
  END IF;

  SELECT count(*)
  INTO invalid_count
  FROM academic_registration.graduation_certificate_requests
  WHERE NOT (
    NOT (
      manual_review
      AND review_recommendation = 'APPROVED'
    )
    OR (
      review_payload IS NOT NULL
      AND jsonb_typeof(review_payload) = 'object'
      AND review_payload ? 'fullName'
      AND review_payload->>'fullName' = btrim(review_payload->>'fullName')
      AND char_length(review_payload->>'fullName') BETWEEN 5 AND 150
      AND review_payload->>'fullName' ~ '^[-[:alpha:][:space:]''’]+$'
      AND review_payload ? 'idNumber'
      AND review_payload->>'idNumber' = btrim(review_payload->>'idNumber')
      AND char_length(review_payload->>'idNumber') BETWEEN 5 AND 20
      AND review_payload->>'idNumber' ~ '^[A-Za-z0-9]+$'
      AND review_payload ? 'email'
      AND review_payload->>'email' = btrim(review_payload->>'email')
      AND char_length(review_payload->>'email') BETWEEN 5 AND 254
      AND review_payload->>'email' ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
      AND review_payload ? 'numRegistro'
      AND review_payload->>'numRegistro' ~ '^[0-9]{1,20}$'
      AND review_payload ? 'numFolio'
      AND review_payload->>'numFolio' ~ '^[0-9]{1,10}$'
      AND review_payload ? 'numLibro'
      AND review_payload->>'numLibro' ~ '^[0-9]{1,10}$'
    )
  );

  IF invalid_count = 0 THEN
    ALTER TABLE academic_registration.graduation_certificate_requests
      VALIDATE CONSTRAINT chk_graduation_review_payload_fields;
  ELSE
    RAISE NOTICE
      'chk_graduation_review_payload_fields queda NOT VALID por % registro(s) historico(s); las inserciones y actualizaciones nuevas quedan protegidas.',
      invalid_count;
  END IF;

  SELECT count(*)
  INTO invalid_count
  FROM academic_registration.graduates
  WHERE NOT (
    created_by IS NULL
    OR created_by NOT LIKE 'manual_review%'
    OR (
      full_name = btrim(full_name)
      AND char_length(full_name) BETWEEN 5 AND 150
      AND full_name ~ '^[-[:alpha:][:space:]''’]+$'
      AND id_number = btrim(id_number)
      AND char_length(id_number) BETWEEN 5 AND 20
      AND id_number ~ '^[A-Za-z0-9]+$'
      AND email IS NOT NULL
      AND email = btrim(email)
      AND char_length(email) BETWEEN 5 AND 254
      AND email ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
      AND num_registro IS NOT NULL
      AND num_registro ~ '^[0-9]{1,20}$'
      AND num_folio IS NOT NULL
      AND num_folio ~ '^[0-9]{1,10}$'
      AND num_libro IS NOT NULL
      AND num_libro ~ '^[0-9]{1,10}$'
    )
  );

  IF invalid_count = 0 THEN
    ALTER TABLE academic_registration.graduates
      VALIDATE CONSTRAINT chk_manual_review_graduate_fields;
  ELSE
    RAISE NOTICE
      'chk_manual_review_graduate_fields queda NOT VALID por % registro(s) historico(s); las inserciones y actualizaciones nuevas quedan protegidas.',
      invalid_count;
  END IF;
END $$;

COMMENT ON CONSTRAINT chk_graduation_review_notes_length
  ON academic_registration.graduation_certificate_requests
  IS 'Notas del revisor: entre 10 y 4000 caracteres, sin espacios al inicio o al final.';

COMMENT ON CONSTRAINT chk_graduation_review_payload_fields
  ON academic_registration.graduation_certificate_requests
  IS 'Valida nombre, documento, email, registro, folio y libro cargados por el revisor.';

COMMENT ON CONSTRAINT chk_manual_review_graduate_fields
  ON academic_registration.graduates
  IS 'Valida los graduados creados por el flujo de revision manual.';

COMMIT;
