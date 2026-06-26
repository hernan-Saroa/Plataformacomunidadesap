BEGIN;

-- UPDATE auth.personas
-- SET dir_email = 'desarrollo.ccd@esap.edu.co'
-- WHERE LOWER(dir_email) = LOWER('superuser@esap.edu.co');

-- UPDATE auth."user"
-- SET username = 'desarrollo.ccd@esap.edu.co'
-- WHERE LOWER(username) = LOWER('superuser@esap.edu.co');

UPDATE auth.role
SET
  type = 'sistema'
WHERE UPPER(code) = 'SUPER_ADMIN';

COMMIT;
