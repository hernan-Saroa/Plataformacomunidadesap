-- ============================================================================
-- 082 · EFDS-2447 — Retirar los DATOS SEMILLA de Programación Académica sin tocar el PTA.
--
-- Pedido de negocio (18 nov 2026): Programación Académica no debe arrancar cargada
-- con los datos base sembrados para desarrollar (local, dev, QA, pre, prod).
-- Reemplaza a la 081, que quedó sin efecto (ver su encabezado).
--
-- QUÉ SE RETIRA (solo tablas del esquema "academic-schedule"):
--   · los 5 periodos VIEJOS sembrados por la 016 en `periodo_programacion`
--     (2026-1, 2026-2, 2026-V1, 2026-V2, 2026-INT), cada uno con lo que cuelga de
--     él: grupos, sesiones (franjas), asignaciones, recesos, concertaciones y su
--     fila de `equivalencia_periodo` (036);
--   · el grupo DEMO de la 010 (observaciones = 'DEMO'), si no está en un periodo del PTA;
--   · la programación HISTÓRICA de la 022 (575 franjas, «cruces del histórico»).
--     Respaldo para volver a cargarla: db/respaldos/ (ver DEPLOY-bugs-qa.md §11).
--
-- QUÉ NO SE TOCA, NUNCA:
--   · ninguna tabla del esquema academic_work_plan (el PTA): ni periodo_academico
--     (el 2026-1 del PTA es real y tiene PTA firmados), ni los PTA, ni
--     docencia_concertada (decisiones de docencia aplicadas al PTA);
--   · nada que dependa de un periodo del PTA: un grupo con id_periodo_academico
--     no se borra, aunque venga de un periodo viejo (la 036 los reapunta);
--   · los periodos viejos creados por usuarios (solo se retiran esos 5 códigos);
--   · catálogo, aulas, CETAP, festivos, roles, permisos y docentes.
--
-- REGLA DE PROTECCIÓN: un periodo viejo se retira ENTERO o NO se retira. Si tiene
-- al menos un grupo ya reapuntado a un periodo del PTA, o una concertación con
-- decisión de docencia registrada en el PTA, se CONSERVA intacto (con sus grupos,
-- sesiones y concertaciones) y se informa con un NOTICE. Así nunca queda un
-- periodo a medio borrar ni falla una llave foránea.
--
-- Las tablas se conservan. Idempotente: si ya no hay nada, no hace nada. Sin tablas
-- temporales (corre también dentro de una transacción de prueba).
-- Prueba con el SQL real: src/periodos/datos-semilla.agregado.spec.ts
-- ============================================================================

DO $$
DECLARE
  n bigint;
  r record;
  v_codigos  CONSTANT text[] := ARRAY['2026-1', '2026-2', '2026-V1', '2026-V2', '2026-INT'];
  v_retirar  uuid[] := '{}';
  v_cod_ret  text[] := '{}';
  v_hay_dc   boolean := to_regclass('academic_work_plan.docencia_concertada') IS NOT NULL;
  v_con_dc   bigint;
  v_grupos   uuid[];
BEGIN
  -- 1) Qué periodos viejos se retiran y cuáles se conservan por tener algo del PTA.
  FOR r IN
    SELECT pp.id_periodo, pp.codigo,
           (SELECT COUNT(*) FROM "academic-schedule".grupo g
             WHERE g.id_periodo = pp.id_periodo AND g.id_periodo_academico IS NOT NULL) AS grupos_pta
      FROM "academic-schedule".periodo_programacion pp
     WHERE pp.codigo = ANY (v_codigos)
  LOOP
    v_con_dc := 0;
    IF v_hay_dc THEN
      EXECUTE 'SELECT COUNT(*) FROM "academic-schedule".concertacion_docencia c
                 JOIN academic_work_plan.docencia_concertada d ON d.id_concertacion = c.id_concertacion
                WHERE c.periodo_ref = $1'
         INTO v_con_dc USING r.id_periodo::text;
    END IF;
    IF r.grupos_pta = 0 AND v_con_dc = 0 THEN
      v_retirar := v_retirar || r.id_periodo;
      v_cod_ret := v_cod_ret || r.codigo;
    ELSE
      RAISE NOTICE '082: periodo viejo % CONSERVADO: % grupo(s) ya en un periodo del PTA, % concertación(es) con docencia registrada en el PTA',
        r.codigo, r.grupos_pta, v_con_dc;
    END IF;
  END LOOP;
  RAISE NOTICE '082: periodos viejos a retirar: %', COALESCE(array_to_string(v_cod_ret, ', '), '');

  -- 2) Grupos a retirar: los de esos periodos y el DEMO, nunca uno de un periodo del PTA.
  SELECT COALESCE(array_agg(g.id_grupo), '{}') INTO v_grupos
    FROM "academic-schedule".grupo g
   WHERE g.id_periodo_academico IS NULL
     AND (g.id_periodo = ANY (v_retirar)
          OR (g.observaciones = 'DEMO' AND (g.id_periodo IS NULL OR g.id_periodo = ANY (v_retirar))));

  -- 3) Concertaciones de los periodos retirados (ninguna tiene docencia en el PTA: paso 1).
  --    Revisión, firma, historial y novedad caen por ON DELETE CASCADE.
  DELETE FROM "academic-schedule".concertacion_docencia
   WHERE periodo_ref = ANY (v_retirar::text[]);
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE '082: concertaciones de periodos viejos retiradas: %', n;

  DELETE FROM "academic-schedule".asignacion_docente WHERE id_grupo = ANY (v_grupos);
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE '082: asignaciones retiradas: %', n;

  DELETE FROM "academic-schedule".franja_horaria
   WHERE id_grupo = ANY (v_grupos)
      OR (id_grupo IS NULL AND id_periodo = ANY (v_retirar));
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE '082: sesiones (franjas) retiradas: %', n;

  DELETE FROM "academic-schedule".grupo WHERE id_grupo = ANY (v_grupos);
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE '082: grupos retirados (periodos viejos y DEMO): %', n;

  DELETE FROM "academic-schedule".periodo_receso WHERE id_periodo = ANY (v_retirar);
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE '082: recesos de periodos viejos retirados: %', n;

  DELETE FROM "academic-schedule".equivalencia_periodo WHERE codigo_programacion = ANY (v_cod_ret);
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE '082: equivalencias retiradas: %', n;

  DELETE FROM "academic-schedule".periodo_programacion WHERE id_periodo = ANY (v_retirar);
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE '082: periodos viejos retirados: %', n;

  -- 4) Programación histórica (respaldo en el repo: db/respaldos/).
  DELETE FROM "academic-schedule".programacion_historica;
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE '082: filas de programación histórica retiradas: %', n;
END $$;
