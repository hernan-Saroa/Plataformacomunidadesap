-- Alinea la tabla final de graduados con Gestion de Graduados.
-- El formulario de Solicitudes de Revision conserva folio/libro maximo 10;
-- una vez creado el graduado, Gestion conserva su rango historico de 12.

BEGIN;

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
      AND num_folio ~ '^[0-9]{1,12}$'
      AND num_libro IS NOT NULL
      AND num_libro ~ '^[0-9]{1,12}$'
    )
  ) NOT VALID;

DO $$
DECLARE
  invalid_count integer;
BEGIN
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
      AND num_folio ~ '^[0-9]{1,12}$'
      AND num_libro IS NOT NULL
      AND num_libro ~ '^[0-9]{1,12}$'
    )
  );

  IF invalid_count = 0 THEN
    ALTER TABLE academic_registration.graduates
      VALIDATE CONSTRAINT chk_manual_review_graduate_fields;
  ELSE
    RAISE NOTICE
      'chk_manual_review_graduate_fields queda NOT VALID por % registro(s) historico(s); los cambios nuevos quedan protegidos.',
      invalid_count;
  END IF;
END $$;

COMMENT ON CONSTRAINT chk_manual_review_graduate_fields
  ON academic_registration.graduates
  IS 'Valida graduados de revision manual y conserva folio/libro hasta 12 en Gestion.';

COMMIT;
