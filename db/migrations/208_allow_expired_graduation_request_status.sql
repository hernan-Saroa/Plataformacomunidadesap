-- Permite que las solicitudes de verificacion manual venzan sin romper el CHECK existente.
-- Es idempotente y seguro para bases donde la migracion 207 ya se ejecuto.

DO $$
DECLARE
  invalid_status_count INTEGER;
BEGIN
  IF to_regclass('academic_registration.graduation_certificate_requests') IS NOT NULL THEN
    ALTER TABLE academic_registration.graduation_certificate_requests
      DROP CONSTRAINT IF EXISTS chk_request_status;

    ALTER TABLE academic_registration.graduation_certificate_requests
      ADD CONSTRAINT chk_request_status
      CHECK (
        status IN (
          'PENDING',
          'VALIDATED',
          'PROCESSING',
          'COMPLETED',
          'REJECTED',
          'EXPIRED'
        )
      ) NOT VALID;

    SELECT COUNT(*)
    INTO invalid_status_count
    FROM academic_registration.graduation_certificate_requests
    WHERE status IS NOT NULL
      AND status NOT IN (
        'PENDING',
        'VALIDATED',
        'PROCESSING',
        'COMPLETED',
        'REJECTED',
        'EXPIRED'
      );

    IF invalid_status_count = 0 THEN
      ALTER TABLE academic_registration.graduation_certificate_requests
        VALIDATE CONSTRAINT chk_request_status;
    ELSE
      RAISE NOTICE 'chk_request_status queda NOT VALID: existen % solicitudes con status fuera del catalogo esperado.', invalid_status_count;
    END IF;
  END IF;
END $$;
