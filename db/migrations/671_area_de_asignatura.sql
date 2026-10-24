-- ============================================================================
-- 671 · EFDS-2341 — Área de formación de una asignatura (regla única en SQL).
--
-- Programación Académica filtra a los docentes por el área de la asignatura
-- (EFDS-2371). El área sale de:
--   · posgrado (especialización, maestría, doctorado): el PROGRAMA es el área
--     (decisión 4), `area_formacion.id_programa`;
--   · pregrado: el núcleo temático de la asignatura (`nucleo_tematico.nombre`),
--     resuelto por las equivalencias editables (`nucleo_equivalencia`, tipo área):
--     coincidencia exacta del nombre normalizado, si no el prefijo más largo.
-- NULL = la asignatura no tiene área: nadie es apto y la respuesta lo dice.
--
-- Mismas reglas de comparación que `buscarEquivalencia` (PTA, rund-nucleos.ts).
-- Forward-only e idempotente.
-- ============================================================================

CREATE OR REPLACE FUNCTION academic_work_plan.area_de_asignatura(p_id_asignatura bigint)
RETURNS bigint LANGUAGE sql STABLE AS $$
  WITH asig AS (
    SELECT a.id, a.id_programa, lower(coalesce(pr.tipo, '')) AS tipo_programa,
           academic_work_plan.normalizar_nucleo(nt.nombre) AS nucleo
      FROM academic_work_plan.asignatura a
      LEFT JOIN academic_work_plan.programa pr ON pr.id = a.id_programa
      LEFT JOIN academic_work_plan.nucleo_tematico nt ON nt.id = a.id_nucleo_tematico
     WHERE a.id = p_id_asignatura
  )
  SELECT CASE
           WHEN asig.tipo_programa IN ('especializacion', 'maestria', 'doctorado') THEN (
             SELECT af.id FROM academic_work_plan.area_formacion af
              WHERE af.id_programa = asig.id_programa AND af.activa)
           ELSE (
             SELECT e.id_area FROM academic_work_plan.nucleo_equivalencia e
              WHERE e.activa AND e.tipo = 'area' AND asig.nucleo <> ''
                AND (e.variante_normalizada = asig.nucleo
                     OR (e.coincidencia = 'prefijo' AND asig.nucleo LIKE e.variante_normalizada || ' %'))
              ORDER BY (e.variante_normalizada = asig.nucleo) DESC, length(e.variante_normalizada) DESC
              LIMIT 1)
         END
    FROM asig;
$$;

COMMENT ON FUNCTION academic_work_plan.area_de_asignatura(bigint) IS
  'Área de formación canónica de la asignatura (EFDS-2341): programa en posgrado, núcleo temático vía nucleo_equivalencia en pregrado. NULL si no tiene.';
