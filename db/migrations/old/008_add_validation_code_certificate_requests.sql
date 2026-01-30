-- Agregar columnas para código de validación en certificate_requests (esquema certification)
ALTER TABLE certification.certificate_requests
ADD COLUMN IF NOT EXISTS validation_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS validation_expires_at TIMESTAMP WITHOUT TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_certificate_requests_validation_expires
  ON certification.certificate_requests(validation_expires_at);
