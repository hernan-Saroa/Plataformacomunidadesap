-- ============================================================================
-- Recarga de la PROGRAMACIÓN HISTÓRICA 2026-1 / 2026-V1 (575 franjas) desde el
-- respaldo del repo. La retiró la migración 082 (EFDS-2447); esto la devuelve.
--
-- NO es una migración: vive en db/respaldos/ para que db-migrate no la corra sola.
-- Se corre a mano, con el comando (ver DEPLOY-bugs-qa.md §11):
--
--   backend/academic-schedule-service/db/respaldos/recargar-historico.sh <contenedor-db>            # PRUEBA
--   backend/academic-schedule-service/db/respaldos/recargar-historico.sh <contenedor-db> --aplicar  # carga
--
-- o directo con psql desde esta carpeta:  psql -U postgres -d esap_db -v aplicar=0|1 -f recargar_programacion_historica.sql
--
-- · Modo PRUEBA (por defecto, aplicar=0): hace todo dentro de una transacción, informa
--   cuántas filas cargaría y la REVIERTE. No escribe nada.
-- · aplicar=1: lo mismo, y confirma.
-- · Idempotente: cada fila lleva su id; si ya está, no se vuelve a insertar
--   (ON CONFLICT DO NOTHING). Correrlo dos veces deja las mismas 575 filas.
-- · La sugerencia de asignatura (id_asignatura_sugerido, n_candidatos) se recalcula
--   contra el catálogo de ESTE ambiente con la misma regla de la migración 025
--   (solo si es unívoca), porque los id del catálogo pueden variar entre ambientes.
-- · Solo escribe en "academic-schedule".programacion_historica. Nada del PTA.
-- ============================================================================
\set ON_ERROR_STOP on
\if :{?aplicar}
\else
  \set aplicar 0
\endif

BEGIN;

DO $$
BEGIN
  IF to_regclass('"academic-schedule".programacion_historica') IS NULL THEN
    RAISE EXCEPTION 'No existe "academic-schedule".programacion_historica: faltan las migraciones 022/025 de Programación Académica.';
  END IF;
END $$;

SELECT COUNT(*) AS antes FROM "academic-schedule".programacion_historica \gset

\ir programacion_historica.datos.sql

-- Sugerencia contra el catálogo de este ambiente (regla de la 025: solo unívoca).
WITH n AS (
  SELECT id,
         regexp_replace(lower(translate(regexp_replace(asignatura, '\([^)]*\)', '', 'g'),
           'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')), '[^a-z0-9]', '', 'g') AS k,
         semestre
    FROM "academic-schedule".programacion_historica
), c AS (
  SELECT a.id AS id_asig,
         regexp_replace(lower(translate(regexp_replace(a.nombre, '\([^)]*\)', '', 'g'),
           'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')), '[^a-z0-9]', '', 'g') AS k,
         a.id_ubicacion_semestral AS sem
    FROM academic_work_plan.asignatura a
), m AS (
  SELECT n.id,
         (SELECT COUNT(*) FROM c WHERE c.k = n.k) AS ncand,
         (SELECT COUNT(*) FROM c WHERE c.k = n.k AND c.sem = n.semestre) AS ncand_sem,
         (SELECT MIN(c.id_asig) FROM c WHERE c.k = n.k) AS unico_nombre,
         (SELECT MIN(c.id_asig) FROM c WHERE c.k = n.k AND c.sem = n.semestre) AS unico_sem
    FROM n
)
UPDATE "academic-schedule".programacion_historica h
   SET n_candidatos = m.ncand,
       id_asignatura_sugerido = CASE
         WHEN m.ncand = 1 THEN m.unico_nombre
         WHEN m.ncand > 1 AND m.ncand_sem = 1 THEN m.unico_sem
         ELSE NULL
       END
  FROM m
 WHERE m.id = h.id;

-- La secuencia queda detrás del id más alto, para que un alta posterior no choque.
SELECT setval(pg_get_serial_sequence('"academic-schedule".programacion_historica', 'id'),
              GREATEST((SELECT MAX(id) FROM "academic-schedule".programacion_historica), 1)) AS secuencia \gset

SELECT COUNT(*) AS despues,
       COUNT(*) FILTER (WHERE periodo = '2026-1')  AS p1,
       COUNT(*) FILTER (WHERE periodo = '2026-V1') AS v1,
       COUNT(*) FILTER (WHERE id_asignatura_sugerido IS NOT NULL) AS con_sugerencia
  FROM "academic-schedule".programacion_historica \gset

\echo ''
\echo 'Programación histórica: antes' :antes 'filas · después' :despues '(2026-1:' :p1 '· 2026-V1:' :v1 '· con sugerencia:' :con_sugerencia ')'

\if :aplicar
  COMMIT;
  \echo 'APLICADO: la recarga quedó confirmada.'
\else
  ROLLBACK;
  \echo 'MODO PRUEBA: nada se guardó. Para cargar de verdad: --aplicar (o -v aplicar=1).'
\endif
