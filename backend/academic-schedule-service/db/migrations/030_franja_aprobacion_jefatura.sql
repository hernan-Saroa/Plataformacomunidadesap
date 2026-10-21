-- ============================================================================
-- NUEVA-3 / EFDS-1939 — Aprobación de la jefatura territorial
--
-- La jefatura de cada territorial aprueba o devuelve las franjas que sus
-- docentes tomaron. Es el CUARTO estado del ciclo de la franja, no una entidad
-- nueva: se AMPLÍA el CHECK de la 029, no se crea tabla (la decisión vive donde
-- ya vive el estado, evitando el patrón EFDS-1536/1539).
--
--   PROGRAMADO → PUBLICADA → TOMADA → APROBADA
--                     ↑__________________|  (devolver)
--
-- DEVOLVER = TOMADA → PUBLICADA, pero CONSERVANDO id_docente y con un
-- `comentario_jefatura`. Encoding sin tabla de la «devolución pendiente»:
--   · franja fresca por publicar ...... estado=PUBLICADA, id_docente IS NULL, sin comentario
--   · franja devuelta a su docente ..... estado=PUBLICADA, id_docente = <docente>, con comentario
-- Así el docente la ve como suya-para-corregir (no se ofrece a otros), y la
-- jefatura puede saber que ese docente tiene algo pendiente («bloquea el resto»:
-- no se aprueban sus otras franjas mientras haya una devolución sin re-resolver).
-- Re-tomarla limpia el comentario y la vuelve a TOMADA.
--
-- Forward-only e idempotente. SQL puro.
-- ============================================================================

-- 1) Cuarto estado en el CHECK (se recrea idempotentemente, como en la 029).
ALTER TABLE "academic-schedule".franja_horaria
  DROP CONSTRAINT IF EXISTS chk_franja_estado_publicacion;

ALTER TABLE "academic-schedule".franja_horaria
  ADD CONSTRAINT chk_franja_estado_publicacion
  CHECK (estado IN ('PROGRAMADO', 'PUBLICADA', 'TOMADA', 'APROBADA'));

-- 2) Comentario de la devolución (motivo obligatorio al devolver).
ALTER TABLE "academic-schedule".franja_horaria
  ADD COLUMN IF NOT EXISTS comentario_jefatura TEXT;

-- Canario de la migración.
DO $$
DECLARE
  v_col INT; v_fuera INT;
BEGIN
  SELECT COUNT(*) INTO v_col FROM information_schema.columns
   WHERE table_schema='academic-schedule' AND table_name='franja_horaria'
     AND column_name='comentario_jefatura';
  SELECT COUNT(*) INTO v_fuera FROM "academic-schedule".franja_horaria
   WHERE estado NOT IN ('PROGRAMADO','PUBLICADA','TOMADA','APROBADA');
  RAISE NOTICE '030: comentario_jefatura=% franjas_fuera_del_conjunto=%', v_col, v_fuera;
  IF v_col <> 1 THEN RAISE EXCEPTION '030: falta la columna comentario_jefatura'; END IF;
  IF v_fuera > 0 THEN RAISE EXCEPTION '030: hay % franjas fuera del conjunto de estados', v_fuera; END IF;
END $$;
