-- ============================================================================
-- Lote 1 · 1.6 — Retirar los datos quemados de desarrollo
--
-- Con los datos reales cargados (1.2–1.5), la siembra de desarrollo sobra.
-- Se retira POR CLAVE, explícitamente. Nada de TRUNCATE ni de DELETE sin WHERE.
--
-- Qué se retira:
--   · 14 docentes de la siembra de desarrollo (migración 011) que NO están en
--     la lista real de tiempo completo ni aparecen en el histórico
--   ·  2 catedráticos sintéticos marcados (DESARROLLO) (migración 014)
--   ·  3 grupos y 4 franjas de la demo (migración 010), sin periodo asociado
--
-- ⚠️ NO se retiran los dos usuarios de prueba (1020304050 qa.programacion y
-- 1020304051 qa.posgrado) aunque tampoco estén en las fuentes reales. Son las
-- cuentas con las que se verifica el módulo por navegador; borrarlas rompería
-- el acceso. Aparecían en el mismo conjunto "no está en ninguna fuente" y por
-- eso se listan aquí de forma explícita en vez de derivarse por consulta.
--
-- ⚠️ Las 5 aulas provisionales de la 015 ya se retiraron en la 019.
--
-- Verificado antes de escribir: asignacion_docente está vacía, así que ningún
-- borrado deja asignaciones huérfanas.
--
-- Forward-only e idempotente. SQL puro.
-- ============================================================================

-- 1) Docentes de desarrollo (14 de la siembra + 2 sintéticos de cátedra).
DELETE FROM academic_work_plan."Docente" d
 USING auth.personas p
 WHERE d."personaId" = p.id_person
   AND p.num_identificacion IN (
     '77021522','71696186','30318787','79041880','79205006','94375494',
     '1077442112','40008425','52845106','38249429','77016614','13258907',
     '316647','13246085','9000000001','9000000002'
   );

DELETE FROM auth.personas
 WHERE num_identificacion IN (
   '77021522','71696186','30318787','79041880','79205006','94375494',
   '1077442112','40008425','52845106','38249429','77016614','13258907',
   '316647','13246085','9000000001','9000000002'
 );

-- 2) Demo de grupo/horario de la 010: son las que no tienen periodo asociado.
DELETE FROM "academic-schedule".franja_horaria
 WHERE id_grupo IN (SELECT id_grupo FROM "academic-schedule".grupo WHERE id_periodo IS NULL);

DELETE FROM "academic-schedule".franja_horaria
 WHERE id_grupo IS NULL AND id_periodo IS NULL;

DELETE FROM "academic-schedule".grupo
 WHERE id_periodo IS NULL;

-- Canario del retiro.
DO $$
DECLARE
  v_desarrollo INT; v_sinteticos INT; v_grupos INT; v_qa INT; v_personas INT;
BEGIN
  SELECT COUNT(*) INTO v_desarrollo FROM auth.personas WHERE nom_largo LIKE '%(DESARROLLO)%';
  SELECT COUNT(*) INTO v_sinteticos FROM auth.personas WHERE num_identificacion IN ('9000000001','9000000002');
  SELECT COUNT(*) INTO v_grupos     FROM "academic-schedule".grupo WHERE id_periodo IS NULL;
  SELECT COUNT(*) INTO v_qa         FROM auth.personas WHERE num_identificacion IN ('1020304050','1020304051');
  SELECT COUNT(*) INTO v_personas   FROM auth.personas;

  RAISE NOTICE '023: personas=% desarrollo=% sinteticos=% grupos_sin_periodo=% usuarios_qa=%',
    v_personas, v_desarrollo, v_sinteticos, v_grupos, v_qa;

  IF v_desarrollo > 0 OR v_sinteticos > 0 THEN
    RAISE EXCEPTION '023: quedan datos marcados como desarrollo (% / %)', v_desarrollo, v_sinteticos;
  END IF;
  IF v_grupos > 0 THEN
    RAISE EXCEPTION '023: quedan % grupos demo sin periodo', v_grupos;
  END IF;
  IF v_qa <> 2 THEN
    RAISE EXCEPTION '023: los usuarios de prueba debian conservarse y hay %', v_qa;
  END IF;
END $$;
