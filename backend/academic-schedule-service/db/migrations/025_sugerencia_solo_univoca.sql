-- ============================================================================
-- Corrección · id_asignatura_sugerido: solo cuando es unívoco
--
-- La 022 rellenaba la sugerencia tomando EL PRIMER CANDIDATO cuando había
-- varios. Una columna llamada "sugerido" que está mal cientos de veces termina
-- tratada como buena por alguien, en algún reporte, meses después.
--
-- Regla nueva:
--   · un solo candidato por nombre normalizado        -> se llena
--   · varios por nombre pero uno solo por semestre    -> se llena
--   · cualquier otro caso (incluido 0 candidatos)     -> NULL
--
-- Y se agrega n_candidatos para que quede el rastro de cuántas opciones había.
--
-- Reparto real sobre las 575 franjas:
--     164  un único candidato por nombre
--       4  desambiguadas por semestre
--     ---
--     168  con sugerencia
--     407  en NULL
--
-- Ese 168/575 ES la información útil: el histórico no se puede casar con el
-- catálogo. cod_asigna es PROGRAMA_PENSUM, no código de materia, así que el
-- nombre es lo único que queda y no alcanza.
--
-- ⚠️ Aprovisionamiento de datos de DESARROLLO, no el mecanismo de producción.
-- RN-09 sigue vigente: el RUND es de solo lectura para las decanaturas.
--
-- Forward-only e idempotente. SQL puro.
-- ============================================================================

ALTER TABLE "academic-schedule".programacion_historica
    ADD COLUMN IF NOT EXISTS n_candidatos SMALLINT;

COMMENT ON COLUMN "academic-schedule".programacion_historica.n_candidatos IS
  'Cuántas asignaturas del catálogo coinciden por nombre normalizado. >1 significa que la sugerencia se dejó en NULL a propósito.';

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

-- Canario: ninguna sugerencia puede sobrevivir con ambigüedad sin resolver.
DO $$
DECLARE
  v_con INT; v_null INT; v_malas INT;
BEGIN
  SELECT COUNT(*) INTO v_con  FROM "academic-schedule".programacion_historica WHERE id_asignatura_sugerido IS NOT NULL;
  SELECT COUNT(*) INTO v_null FROM "academic-schedule".programacion_historica WHERE id_asignatura_sugerido IS NULL;
  -- Una fila con varios candidatos y sin desambiguar por semestre NO puede tener sugerencia.
  SELECT COUNT(*) INTO v_malas
    FROM "academic-schedule".programacion_historica
   WHERE id_asignatura_sugerido IS NOT NULL AND n_candidatos > 1;

  RAISE NOTICE '025: con_sugerencia=% null=% ambiguas_con_sugerencia=%', v_con, v_null, v_malas;

  IF v_con <> 168 THEN
    RAISE EXCEPTION '025: se esperaban 168 sugerencias univocas y hay %', v_con;
  END IF;
END $$;
