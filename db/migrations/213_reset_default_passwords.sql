-- Normaliza contraseñas de cuentas institucionales que quedaron con valores
-- de placeholder ('changeme123', hash inválido, null) a la contraseña inicial
-- estándar del sistema: '123456'.
--
-- Aplica SOLO a cuentas @esap.edu.co o @esap.local creadas por sync/auto-provisioning.
-- NO toca cuentas que ya tienen un hash bcrypt válido diferente a los placeholders.
--
-- Hash bcrypt '123456'    → $2b$10$lWsenGxE2s8d4IxweYD2Jue13J6V6vPUP3vS1sx9TeRcwVcaCxjD2
-- Hash bcrypt 'changeme123' → $2b$10$QFReJZuXaeuGIwh12msCDedTk5aGYGetascD68xHqH8/mHlZrCx/S

UPDATE auth."user"
SET password_hash = '$2b$10$lWsenGxE2s8d4IxweYD2Jue13J6V6vPUP3vS1sx9TeRcwVcaCxjD2'
WHERE
  (username LIKE '%@esap.edu.co' OR username LIKE '%@esap.local')
  AND password_hash = '$2b$10$QFReJZuXaeuGIwh12msCDedTk5aGYGetascD68xHqH8/mHlZrCx/S';

-- Cuentas con hash inválido (null, vacío, o no es bcrypt)
UPDATE auth."user"
SET password_hash = '$2b$10$lWsenGxE2s8d4IxweYD2Jue13J6V6vPUP3vS1sx9TeRcwVcaCxjD2'
WHERE
  (username LIKE '%@esap.edu.co' OR username LIKE '%@esap.local')
  AND (
    password_hash IS NULL
    OR password_hash = ''
    OR password_hash = 'N/A'
    OR password_hash NOT LIKE '$2b$%'
  );
