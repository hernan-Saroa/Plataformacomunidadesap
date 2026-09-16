-- REQ-RUND-F003 / NF001. Aplicar antes de iniciar la versión con RBAC transversal.
BEGIN;
CREATE TABLE IF NOT EXISTS academic_work_plan."RundAccesoDatosLog" (
  id UUID PRIMARY KEY,
  actor_id TEXT NOT NULL,
  roles TEXT[] NOT NULL,
  endpoint TEXT NOT NULL,
  recurso_id TEXT,
  docentes TEXT[] NOT NULL DEFAULT '{}',
  campos TEXT[] NOT NULL,
  resultado TEXT NOT NULL CHECK (resultado IN ('COMPLETO','ENMASCARADO','DENEGADO')),
  ip TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS idx_rund_acceso_actor_fecha
  ON academic_work_plan."RundAccesoDatosLog" (actor_id, "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_rund_acceso_docentes
  ON academic_work_plan."RundAccesoDatosLog" USING GIN (docentes);
CREATE INDEX IF NOT EXISTS idx_rund_acceso_recurso
  ON academic_work_plan."RundAccesoDatosLog" (recurso_id);
CREATE OR REPLACE FUNCTION academic_work_plan.prevent_rund_access_log_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Los accesos a datos sensibles son inmutables';
END;
$$;
DROP TRIGGER IF EXISTS trg_rund_access_log_immutable ON academic_work_plan."RundAccesoDatosLog";
CREATE TRIGGER trg_rund_access_log_immutable BEFORE UPDATE OR DELETE
  ON academic_work_plan."RundAccesoDatosLog" FOR EACH ROW
  EXECUTE FUNCTION academic_work_plan.prevent_rund_access_log_mutation();
DROP TRIGGER IF EXISTS trg_rund_access_log_no_truncate ON academic_work_plan."RundAccesoDatosLog";
CREATE TRIGGER trg_rund_access_log_no_truncate BEFORE TRUNCATE
  ON academic_work_plan."RundAccesoDatosLog" FOR EACH STATEMENT
  EXECUTE FUNCTION academic_work_plan.prevent_rund_access_log_mutation();
ALTER TABLE academic_work_plan."BancoDocentesInvitaciones"
  ADD COLUMN IF NOT EXISTS sesion_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS sesion_expira_en TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS idx_rund_invitacion_session_hash
  ON academic_work_plan."BancoDocentesInvitaciones" (sesion_token_hash)
  WHERE sesion_token_hash IS NOT NULL;
COMMIT;
