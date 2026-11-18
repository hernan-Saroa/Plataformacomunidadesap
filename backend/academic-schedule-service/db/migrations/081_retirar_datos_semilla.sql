-- ============================================================================
-- 081 · Retirar los DATOS SEMILLA de Programación Académica de todos los ambientes.
--
-- Pedido de negocio (18 nov 2026): los datos de arranque que se sembraron para
-- desarrollar y demostrar no deben estar en ningún ambiente (local, dev, QA, pre,
-- prod). Son:
--   · los periodos VIEJOS de programación (`periodo_programacion`: 2026-1, 2026-2,
--     2026-V1, 2026-V2, 2026-INT — migración 016) y su tabla de equivalencias (036);
--   · todo lo que cuelga de esos periodos viejos: grupos, franjas, asignaciones,
--     recesos y concertaciones;
--   · el grupo DEMO de la muestra (010, `observaciones = 'DEMO'`);
--   · la programación HISTÓRICA extraída del Excel 2026-1 / 2026-V1 (022, 575
--     franjas): es la que alimentaba los «cruces del histórico» de Validación de Cruces.
--
-- NO se toca:
--   · los periodos de la PLATAFORMA (`academic_work_plan.periodo_academico`) ni lo
--     programado en ellos: eso es trabajo real, y un periodo de prueba se elimina
--     desde Programación Académica → Periodos → «Eliminar periodo»;
--   · el catálogo real (007), las aulas (019), los CETAP (020/026), los festivos (062),
--     los roles y permisos: son configuración, no datos de prueba;
--   · los docentes del banco (011/021): los administra el RUND y el PTA los usa.
--
-- Las tablas se conservan (el código las sigue leyendo; vacías = sin periodos viejos).
-- Idempotente: si ya no hay nada, no hace nada. Cada paso informa cuántas filas quitó.
-- Las migraciones 010/016/022 no se editan (ya aplicadas en los ambientes); en una base
-- nueva siembran y esta las retira enseguida.
-- ============================================================================

DO $$
DECLARE
  n bigint;
BEGIN
  -- Grupos a retirar: los de periodos viejos (sin periodo de plataforma) y el DEMO.
  CREATE TEMP TABLE _grupos_semilla ON COMMIT DROP AS
    SELECT g.id_grupo
      FROM "academic-schedule".grupo g
     WHERE g.id_periodo_academico IS NULL
        OR g.observaciones = 'DEMO';

  -- Concertaciones de periodos viejos (su periodo_ref es el UUID del periodo viejo).
  CREATE TEMP TABLE _concertaciones_semilla ON COMMIT DROP AS
    SELECT c.id_concertacion
      FROM "academic-schedule".concertacion_docencia c
     WHERE c.periodo_ref !~ '^[0-9]+$';

  IF to_regclass('academic_work_plan.docencia_concertada') IS NOT NULL THEN
    DELETE FROM academic_work_plan.docencia_concertada
     WHERE id_concertacion::text IN (SELECT id_concertacion::text FROM _concertaciones_semilla);
    GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE '081: decisiones de docencia de periodos viejos retiradas: %', n;
  END IF;
  -- revisión, firma, historial y novedad caen por ON DELETE CASCADE.
  DELETE FROM "academic-schedule".concertacion_docencia
   WHERE id_concertacion IN (SELECT id_concertacion FROM _concertaciones_semilla);
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE '081: concertaciones de periodos viejos retiradas: %', n;

  DELETE FROM "academic-schedule".asignacion_docente
   WHERE id_grupo IN (SELECT id_grupo FROM _grupos_semilla);
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE '081: asignaciones de grupos semilla retiradas: %', n;

  DELETE FROM "academic-schedule".franja_horaria
   WHERE id_grupo IN (SELECT id_grupo FROM _grupos_semilla)
      OR (id_grupo IS NULL AND id_periodo IS NOT NULL);
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE '081: franjas de grupos semilla retiradas: %', n;

  DELETE FROM "academic-schedule".grupo
   WHERE id_grupo IN (SELECT id_grupo FROM _grupos_semilla);
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE '081: grupos semilla retirados (periodos viejos y DEMO): %', n;

  -- Recesos de periodos viejos (los de periodos de plataforma se conservan).
  DELETE FROM "academic-schedule".periodo_receso WHERE id_periodo IS NOT NULL;
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE '081: recesos de periodos viejos retirados: %', n;

  DELETE FROM "academic-schedule".equivalencia_periodo;
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE '081: equivalencias de periodos viejos retiradas: %', n;

  DELETE FROM "academic-schedule".periodo_programacion;
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE '081: periodos viejos retirados: %', n;

  DELETE FROM "academic-schedule".programacion_historica;
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE '081: filas de programación histórica retiradas: %', n;
END $$;
