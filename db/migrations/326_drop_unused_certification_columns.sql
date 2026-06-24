-- Retira columnas de certificacion laboral que no tienen flujo vigente.
-- Estas columnas estaban en DDL historico, pero no estan mapeadas ni usadas
-- por el certification-service actual, salvo template_config_changes.user_info,
-- que estaba mapeada pero nunca se poblaba ni se consumia.

ALTER TABLE certification.certificate_requests
  DROP COLUMN IF EXISTS rejection_reason,
  DROP COLUMN IF EXISTS approved_by_name,
  DROP COLUMN IF EXISTS approved_by_id,
  DROP COLUMN IF EXISTS generation_date,
  DROP COLUMN IF EXISTS approval_date;

ALTER TABLE certification.certificates
  DROP COLUMN IF EXISTS revoked_by_id,
  DROP COLUMN IF EXISTS last_validation,
  DROP COLUMN IF EXISTS valid_until,
  DROP COLUMN IF EXISTS pdf_filename,
  DROP COLUMN IF EXISTS revocation_date,
  DROP COLUMN IF EXISTS revocation_reason;

ALTER TABLE certification.signers
  DROP COLUMN IF EXISTS signature_base64;

ALTER TABLE certification.template_config_changes
  DROP COLUMN IF EXISTS user_info;
