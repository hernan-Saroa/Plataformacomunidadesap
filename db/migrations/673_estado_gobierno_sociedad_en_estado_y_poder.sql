-- ============================================================================
-- 673 · EFDS-2345 — «Estado, Gobierno y Sociedad» se une a «Estado y Poder».
--
-- Decisión de Tomás (25-oct-2026): al renovar el plan de AP, las asignaturas de
-- «Estado y Poder» que continuaron pasaron a esa área; son una sola.
--
-- Qué hace (todo sobre datos, nada de esquema):
--   1. Las equivalencias que apuntaban al área «Estado, Gobierno y Sociedad»
--      («Estado, Gobierno y Sociedad», «Gobierno y Políticas Públicas»,
--      «Gobierno y Política Pública») apuntan ahora a «Estado y Poder». Con eso
--      `area_de_asignatura()` y la interpretación del RUND resuelven a una sola área.
--   2. Los núcleos de los docentes (`docente_nucleo`, de RUND y de puente) se
--      recalculan: el que estaba en el área vieja pasa a la nueva, sin duplicar
--      si el docente ya la tenía por el mismo origen.
--   3. El área vieja queda inactiva (no se borra: conserva su código para el
--      Excel del catálogo y la trazabilidad).
--
-- Forward-only e idempotente: sin el área vieja con filas, no hace nada.
-- ============================================================================

DO $$
DECLARE
  v_vieja BIGINT;
  v_nueva BIGINT;
BEGIN
  SELECT id INTO v_vieja FROM academic_work_plan.area_formacion WHERE nombre = 'Estado, Gobierno y Sociedad';
  SELECT id INTO v_nueva FROM academic_work_plan.area_formacion WHERE nombre = 'Estado y Poder';
  IF v_vieja IS NULL OR v_nueva IS NULL THEN
    RAISE NOTICE '673: no están las dos áreas; nada que unir.';
    RETURN;
  END IF;

  UPDATE academic_work_plan.nucleo_equivalencia
     SET id_area = v_nueva, updated_at = NOW()
   WHERE id_area = v_vieja;

  DELETE FROM academic_work_plan.docente_nucleo dn
   WHERE dn.id_area = v_vieja
     AND EXISTS (SELECT 1 FROM academic_work_plan.docente_nucleo o
                  WHERE o.id_persona = dn.id_persona AND o.origen = dn.origen AND o.id_area = v_nueva);
  UPDATE academic_work_plan.docente_nucleo SET id_area = v_nueva WHERE id_area = v_vieja;

  UPDATE academic_work_plan.area_formacion SET activa = FALSE WHERE id = v_vieja;
END $$;
