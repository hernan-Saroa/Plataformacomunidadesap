-- Agrega el flujo revisor -> aprobador para solicitudes de verificacion de titulos.
-- Mantiene los campos existentes y solo anade persistencia adicional.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE academic_registration.graduation_certificate_requests
  ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50),
  ADD COLUMN IF NOT EXISTS review_recommendation VARCHAR(50),
  ADD COLUMN IF NOT EXISTS review_recommendation_reason TEXT,
  ADD COLUMN IF NOT EXISTS review_payload JSONB,
  ADD COLUMN IF NOT EXISTS review_submitted_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS review_submitted_by VARCHAR(100),
  ADD COLUMN IF NOT EXISTS review_submitted_by_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS approver_decision VARCHAR(50),
  ADD COLUMN IF NOT EXISTS approver_notes TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS approved_by VARCHAR(100),
  ADD COLUMN IF NOT EXISTS approver_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS review_timeline JSONB NOT NULL DEFAULT '[]'::jsonb;

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

CREATE INDEX IF NOT EXISTS idx_graduation_requests_approval_status
  ON academic_registration.graduation_certificate_requests (approval_status);

CREATE INDEX IF NOT EXISTS idx_graduation_requests_review_submitted_at
  ON academic_registration.graduation_certificate_requests (review_submitted_at);

CREATE TABLE IF NOT EXISTS academic_registration.graduation_request_review_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(150) NOT NULL,
  size_bytes INTEGER NOT NULL,
  uploaded_by VARCHAR(255),
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_graduation_request_review_files_request
    FOREIGN KEY (request_id)
    REFERENCES academic_registration.graduation_certificate_requests(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_graduation_request_review_files_request_id
  ON academic_registration.graduation_request_review_files (request_id);

COMMENT ON COLUMN academic_registration.graduation_certificate_requests.approval_status
  IS 'Estado de aprobacion final: PENDING_APPROVAL, APPROVED_FINAL, REJECTED_FINAL u OBSERVATION.';

COMMENT ON COLUMN academic_registration.graduation_certificate_requests.review_recommendation
  IS 'Concepto del revisor: APPROVED o REJECTED. OBSERVATION queda reservado para el aprobador.';

COMMENT ON COLUMN academic_registration.graduation_certificate_requests.review_payload
  IS 'Datos revisados por el revisor antes de pasar a aprobacion final.';

COMMENT ON COLUMN academic_registration.graduation_certificate_requests.review_timeline
  IS 'Traza cronologica del flujo revisor-aprobador.';
