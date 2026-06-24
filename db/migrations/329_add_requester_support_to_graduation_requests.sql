BEGIN;

ALTER TABLE academic_registration.graduation_certificate_requests
  ADD COLUMN IF NOT EXISTS requester_support_original_name varchar(255),
  ADD COLUMN IF NOT EXISTS requester_support_stored_name varchar(255),
  ADD COLUMN IF NOT EXISTS requester_support_mime_type varchar(150),
  ADD COLUMN IF NOT EXISTS requester_support_size_bytes integer,
  ADD COLUMN IF NOT EXISTS requester_support_uploaded_at timestamp;

WITH legacy_public_support AS (
  SELECT DISTINCT ON (request_id)
    id,
    request_id,
    original_name,
    stored_name,
    mime_type,
    size_bytes,
    uploaded_at
  FROM academic_registration.graduation_request_review_files
  WHERE stored_name LIKE 'public-review-%'
  ORDER BY request_id, uploaded_at DESC, id DESC
)
UPDATE academic_registration.graduation_certificate_requests requests
SET
  requester_support_original_name = legacy.original_name,
  requester_support_stored_name = legacy.stored_name,
  requester_support_mime_type = legacy.mime_type,
  requester_support_size_bytes = legacy.size_bytes,
  requester_support_uploaded_at = legacy.uploaded_at
FROM legacy_public_support legacy
WHERE requests.id = legacy.request_id
  AND requests.requester_support_stored_name IS NULL;

DELETE FROM academic_registration.graduation_request_review_files files
WHERE files.stored_name LIKE 'public-review-%';

COMMIT;
