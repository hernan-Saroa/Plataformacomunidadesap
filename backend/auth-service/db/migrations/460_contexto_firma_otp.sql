-- EFDS-1311. Aditiva; aplicar antes de desplegar auth-service.
-- Mantiene token NUMERIC(6), generación y expiración existentes.
ALTER TABLE auth."user" ADD COLUMN IF NOT EXISTS signature_otp_context varchar(128);
