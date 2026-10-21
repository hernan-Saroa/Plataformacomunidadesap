-- ============================================================================
-- EFDS-1939 (ajuste) — Quinto estado DEVUELTA
--
-- El encoding anterior representaba la devolución como PUBLICADA + id_docente no
-- nulo. Eso hacía que 'PUBLICADA' significara DOS cosas según el FK: libre, o
-- devuelta a un docente concreto. Cualquier consulta que filtrara
-- `estado = 'PUBLICADA'` para decir «disponible» incluía las devueltas si el
-- autor olvidaba mirar también el id_docente. Es el fallo silencioso de
-- EFDS-1536/1539 otra vez: expresar cinco situaciones en cuatro valores + un
-- nullable. Se corrige con un estado propio.
--
--   PROGRAMADO → PUBLICADA → TOMADA → APROBADA
--                     ↑___________ DEVUELTA  (devolver conserva id_docente y
--                     |            (re-tomar) comentario; re-tomar limpia y
--                     └────────────────────── vuelve a TOMADA)
--
-- INVARIANTE, ahora por diseño (no solo por canario): una franja PUBLICADA NO
-- puede tener id_docente. Lo que el encoding permitía queda PROHIBIDO por un
-- CHECK.
--
-- Forward-only e idempotente. SQL puro.
-- ============================================================================

-- 1) Migrar el encoding viejo: PUBLICADA con docente = era una devolución.
--    Se hace ANTES de ampliar el CHECK (si no, 'DEVUELTA' violaría el CHECK
--    vigente). Se recrea el CHECK del conjunto para incluir DEVUELTA.
ALTER TABLE "academic-schedule".franja_horaria
  DROP CONSTRAINT IF EXISTS chk_franja_estado_publicacion;

UPDATE "academic-schedule".franja_horaria
   SET estado = 'DEVUELTA'
 WHERE estado = 'PUBLICADA' AND id_docente IS NOT NULL;

ALTER TABLE "academic-schedule".franja_horaria
  ADD CONSTRAINT chk_franja_estado_publicacion
  CHECK (estado IN ('PROGRAMADO', 'PUBLICADA', 'TOMADA', 'APROBADA', 'DEVUELTA'));

-- 2) El invariante, por diseño: PUBLICADA nunca lleva id_docente.
ALTER TABLE "academic-schedule".franja_horaria
  DROP CONSTRAINT IF EXISTS chk_franja_publicada_sin_docente;

ALTER TABLE "academic-schedule".franja_horaria
  ADD CONSTRAINT chk_franja_publicada_sin_docente
  CHECK (NOT (estado = 'PUBLICADA' AND id_docente IS NOT NULL));

-- Canario de la migración.
DO $$
DECLARE v_fuera INT; v_pub_con_doc INT;
BEGIN
  SELECT COUNT(*) INTO v_fuera FROM "academic-schedule".franja_horaria
   WHERE estado NOT IN ('PROGRAMADO','PUBLICADA','TOMADA','APROBADA','DEVUELTA');
  SELECT COUNT(*) INTO v_pub_con_doc FROM "academic-schedule".franja_horaria
   WHERE estado = 'PUBLICADA' AND id_docente IS NOT NULL;
  RAISE NOTICE '032: fuera_del_conjunto=% publicada_con_docente=%', v_fuera, v_pub_con_doc;
  IF v_fuera > 0 THEN RAISE EXCEPTION '032: hay % franjas fuera del conjunto', v_fuera; END IF;
  IF v_pub_con_doc > 0 THEN RAISE EXCEPTION '032: hay % PUBLICADA con docente', v_pub_con_doc; END IF;
END $$;
