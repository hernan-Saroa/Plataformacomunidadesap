-- Agregar campos de empresa a solicitudes de certificados
ALTER TABLE academic_registration.graduation_certificate_requests
ADD COLUMN IF NOT EXISTS company_nit VARCHAR(50),
ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255);
