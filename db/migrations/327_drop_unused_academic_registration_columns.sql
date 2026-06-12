-- Retira columnas de registro academico sin flujo vigente en la plataforma.
-- La revocacion de certificados solo conserva el estado REVOKED; el endpoint
-- de revocacion no esta implementado y no escribe fecha/motivo.
-- En firmantes, email y signature_filename no tienen lectura ni escritura
-- funcional; la firma activa usa signature_url y/o signature_filename_override.

ALTER TABLE academic_registration.graduation_certificates
  DROP COLUMN IF EXISTS revocation_reason,
  DROP COLUMN IF EXISTS revocation_date;

ALTER TABLE academic_registration.signers
  DROP COLUMN IF EXISTS signature_filename,
  DROP COLUMN IF EXISTS email;
