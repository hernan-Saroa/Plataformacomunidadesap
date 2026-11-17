-- RUND-NF002/NF004 (HU 1365): trazabilidad inmutable y escala.
-- Aditiva e idempotente. Hasta ahora RundAprobacionLog bloqueaba UPDATE/DELETE pero permitía TRUNCATE
-- (vaciar toda la auditoría de un golpe), y la bitácora del Macro Docente no tenía ninguna protección.
-- Se agregan además índices para consultar el historial por docente / acción con +70.000 registros.
BEGIN;

CREATE OR REPLACE FUNCTION academic_work_plan.prevent_rund_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Los registros de auditoría RUND son inmutables';
END;
$$;

-- 1. Auditoría de perfiles: bloquear también el vaciado completo.
DROP TRIGGER IF EXISTS trg_rund_aprobacion_log_no_truncate ON academic_work_plan."RundAprobacionLog";
CREATE TRIGGER trg_rund_aprobacion_log_no_truncate BEFORE TRUNCATE
  ON academic_work_plan."RundAprobacionLog" FOR EACH STATEMENT
  EXECUTE FUNCTION academic_work_plan.prevent_rund_audit_mutation();

-- 2. Bitácora de consultas del Macro Docente: solo INSERT.
DROP TRIGGER IF EXISTS trg_rund_macro_log_immutable ON academic_work_plan."RundMacroDocenteConsultaLog";
CREATE TRIGGER trg_rund_macro_log_immutable BEFORE UPDATE OR DELETE
  ON academic_work_plan."RundMacroDocenteConsultaLog" FOR EACH ROW
  EXECUTE FUNCTION academic_work_plan.prevent_rund_audit_mutation();
DROP TRIGGER IF EXISTS trg_rund_macro_log_no_truncate ON academic_work_plan."RundMacroDocenteConsultaLog";
CREATE TRIGGER trg_rund_macro_log_no_truncate BEFORE TRUNCATE
  ON academic_work_plan."RundMacroDocenteConsultaLog" FOR EACH STATEMENT
  EXECUTE FUNCTION academic_work_plan.prevent_rund_audit_mutation();

-- 3. Soporte de cargas masivas: también sin TRUNCATE.
CREATE OR REPLACE FUNCTION academic_work_plan.prevent_rund_bulk_support_truncate()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'El soporte documental de la carga masiva es inmutable';
END;
$$;
DROP TRIGGER IF EXISTS trg_rund_carga_masiva_no_truncate ON academic_work_plan."RundCargaMasiva";
CREATE TRIGGER trg_rund_carga_masiva_no_truncate BEFORE TRUNCATE
  ON academic_work_plan."RundCargaMasiva" FOR EACH STATEMENT
  EXECUTE FUNCTION academic_work_plan.prevent_rund_bulk_support_truncate();

-- 4. Escala: historial por docente ordenado por fecha, y consultas por acción/fecha.
CREATE INDEX IF NOT EXISTS idx_rund_aprobacion_log_docente_fecha
  ON academic_work_plan."RundAprobacionLog" (docente_id, "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_rund_aprobacion_log_accion_fecha
  ON academic_work_plan."RundAprobacionLog" (accion, "createdAt" DESC);

COMMIT;
