-- ============================================================================
-- NUEVA-1 / EFDS-1937 — Ciclo de publicación de la franja
--
-- Publicar la programación de un periodo NO es una entidad aparte: es un estado
-- de la franja. El ciclo es PROGRAMADO → PUBLICADA → TOMADA.
--   · PROGRAMADO: la decanatura la armó; el docente todavía no la ve.
--   · PUBLICADA : visible en el portal del docente; se puede tomar.
--   · TOMADA    : un docente la tomó (franja.id_docente queda fijo).
--
-- ⚠️ UNA SOLA FUENTE DE VERDAD. No se crea una tabla `publicacion` que conviva
-- con `franja.estado`: dos campos sobre el mismo concepto es el patrón que costó
-- EFDS-1536 y EFDS-1539. El estado de publicación vive en la columna que ya
-- existe.
--
-- ⚠️ 'CONFIRMADO' es estado de GRUPO, no de franja. La franja solo usaba
-- 'PROGRAMADO' (default de la entidad). El conjunto cerrado se fija ahora para
-- que nadie escriba un estado en texto libre (la columna no tenía CHECK).
--
-- Radio de impacto verificado antes de fijar el CHECK:
--   · literales de estado de franja en código .... solo 'PROGRAMADO'
--     (horarios.service.ts crearSesion, grupos.service.ts, franja-horaria.entity)
--   · 'PUBLICADO'/'ASIGNADO'/'CONFIRMADO' ......... son de grupo/asignacion, no franja
--
-- Forward-only e idempotente. SQL puro.
-- ============================================================================

-- Toda franja sin estado pasa a PROGRAMADO (el default histórico).
UPDATE "academic-schedule".franja_horaria
   SET estado = 'PROGRAMADO'
 WHERE estado IS NULL;

-- CHECK del conjunto cerrado. Se recrea idempotentemente: primero se retira si
-- ya existía (para poder ampliarlo en el futuro sin bloquear el replay), luego
-- se agrega. NOT VALID no hace falta: los datos ya están dentro del conjunto.
ALTER TABLE "academic-schedule".franja_horaria
  DROP CONSTRAINT IF EXISTS chk_franja_estado_publicacion;

ALTER TABLE "academic-schedule".franja_horaria
  ADD CONSTRAINT chk_franja_estado_publicacion
  CHECK (estado IN ('PROGRAMADO', 'PUBLICADA', 'TOMADA'));

-- Canario de la migración.
DO $$
DECLARE
  v_fuera INT; v_null INT;
BEGIN
  SELECT COUNT(*) INTO v_null  FROM "academic-schedule".franja_horaria WHERE estado IS NULL;
  SELECT COUNT(*) INTO v_fuera FROM "academic-schedule".franja_horaria
    WHERE estado NOT IN ('PROGRAMADO', 'PUBLICADA', 'TOMADA');
  RAISE NOTICE '029: franjas sin_estado=% fuera_del_conjunto=%', v_null, v_fuera;
  IF v_null > 0 OR v_fuera > 0 THEN
    RAISE EXCEPTION '029: hay franjas con estado nulo (%) o fuera del conjunto (%)', v_null, v_fuera;
  END IF;
END $$;
