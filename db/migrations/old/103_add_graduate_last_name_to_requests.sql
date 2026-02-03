ALTER TABLE academic_registration.graduation_certificate_requests
ADD COLUMN IF NOT EXISTS graduate_last_name VARCHAR(255);
