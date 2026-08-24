-- Conserva en cada certificado el indicador de encargo que alimenta [CARGO].
-- Esto permite corregir la marca (E) sin modificar la fuente laboral original.

BEGIN;

ALTER TABLE certification.certificates
  ADD COLUMN IF NOT EXISTS assignment_type VARCHAR(1) NULL;

UPDATE certification.certificates AS certificate
SET assignment_type = CASE
  WHEN UPPER(BTRIM(COALESCE(request.observations, ''))) LIKE 'E%' THEN 'E'
  WHEN UPPER(BTRIM(COALESCE(request.observations, ''))) LIKE 'N%' THEN 'N'
  ELSE NULL
END
FROM certification.certificate_requests AS request
WHERE request.id = certificate.request_id
  AND certificate.assignment_type IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_certificates_assignment_type'
      AND conrelid = 'certification.certificates'::regclass
  ) THEN
    ALTER TABLE certification.certificates
      ADD CONSTRAINT chk_certificates_assignment_type
      CHECK (assignment_type IS NULL OR assignment_type IN ('E', 'N'));
  END IF;
END $$;

COMMENT ON COLUMN certification.certificates.assignment_type IS
  'Assignment indicator rendered by the labor certificate: E shows the encargo suffix and N omits it';

COMMIT;
