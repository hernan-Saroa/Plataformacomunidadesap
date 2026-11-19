-- ============================================================================
-- 081 · SIN EFECTO. Reemplazada por 082_retirar_datos_semilla_sin_tocar_pta.sql
--
-- La primera versión (publicada el 18 nov 2026, f6d7d631e, sin desplegar en QA)
-- borraba también en `academic_work_plan.docencia_concertada`, una tabla del PTA:
-- decisiones de docencia que se aplican al PTA del docente (id_pta, aplicada_en)
-- y que se leen por el código del periodo ('2026-1'), el mismo del PTA real.
-- Además, si un grupo de un periodo viejo ya estaba reapuntado a un periodo del
-- PTA (migración 036), el borrado del periodo viejo fallaba por llave foránea.
--
-- Se deja vacía (el nombre se conserva para que el registro de migraciones no
-- cambie) y la limpieza correcta va en la 082. Donde la 081 vieja ya corrió, la
-- 082 corre igual y no encuentra nada o termina lo que faltó.
-- ============================================================================

SELECT 1;
