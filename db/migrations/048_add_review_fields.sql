-- Agregar campos de revisión manual a solicitudes de certificados
ALTER TABLE academic_registration.graduation_certificate_requests
  ADD COLUMN IF NOT EXISTS id_issue_date DATE,
  ADD COLUMN IF NOT EXISTS manual_review BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(100),
  ADD COLUMN IF NOT EXISTS reviewer_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS review_notes TEXT,
  ADD COLUMN IF NOT EXISTS review_resolution VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_graduation_certificate_requests_manual_review
  ON academic_registration.graduation_certificate_requests(manual_review);
