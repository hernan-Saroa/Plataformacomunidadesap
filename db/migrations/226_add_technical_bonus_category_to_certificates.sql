-- Persistir la categoria de prima usada al generar certificados laborales
ALTER TABLE certification.certificates
  ADD COLUMN IF NOT EXISTS technical_bonus_category VARCHAR(20);

ALTER TABLE certification.certificates
  DROP CONSTRAINT IF EXISTS chk_certificates_technical_bonus_category;

ALTER TABLE certification.certificates
  ADD CONSTRAINT chk_certificates_technical_bonus_category
  CHECK (
    technical_bonus_category IS NULL
    OR technical_bonus_category IN ('DIRECTIVOS', 'COORDINADORES')
  );

DO $$
BEGIN
  IF to_regclass('certification.technical_bonus_assignments') IS NOT NULL THEN
    WITH matched_assignments AS (
      SELECT
        cert.id AS certificate_id,
        assignment.category,
        ROW_NUMBER() OVER (
          PARTITION BY cert.id
          ORDER BY assignment.updated_at DESC
        ) AS row_number
      FROM certification.certificates cert
      JOIN certification.technical_bonus_assignments assignment
        ON REPLACE(REPLACE(REPLACE(assignment.id_number, '.', ''), '-', ''), ' ', '')
         = REPLACE(REPLACE(REPLACE(cert.id_number, '.', ''), '-', ''), ' ', '')
      WHERE cert.technical_bonus_category IS NULL
        AND COALESCE(cert.include_technical_bonus, FALSE) = TRUE
        AND COALESCE(cert.technical_bonus, 0) > 0
    )
    UPDATE certification.certificates cert
    SET technical_bonus_category = matched_assignments.category
    FROM matched_assignments
    WHERE cert.id = matched_assignments.certificate_id
      AND matched_assignments.row_number = 1;
  END IF;
END $$;

COMMENT ON COLUMN certification.certificates.technical_bonus_category IS
  'Categoria de prima persistida para el texto del certificado: DIRECTIVOS = prima tecnica, COORDINADORES = prima de coordinacion.';
