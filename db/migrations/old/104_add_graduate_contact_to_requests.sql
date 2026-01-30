ALTER TABLE academic_registration.graduation_certificate_requests
ADD COLUMN IF NOT EXISTS graduate_email VARCHAR(255);

ALTER TABLE academic_registration.graduation_certificate_requests
ADD COLUMN IF NOT EXISTS graduate_phone VARCHAR(50);
