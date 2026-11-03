-- ============================================================================
-- 129 · Las adendas las genera el abogado dueño del proceso (EFDS-1154)
--
-- Revisión de QA (2026-10-15): las adendas se generan en distintos momentos
-- del proceso, desde un botón persistente, y solo las genera el abogado dueño
-- del proceso; los demás las consultan. El dueño es quien ocupa el puesto
-- «Abogado estructurador», el mismo que hace la 3.6, la 3.7 y la 5.6.1.
--
-- Las ventanas cambian en el servicio: las de fondo van de la apertura al
-- cierre de ofertas; las de cronograma, hasta el acto de adjudicación.
--
-- Solo se llena donde la 5.13 no tiene regla propia. Idempotente.
-- ============================================================================

BEGIN;

DO $$
DECLARE
  abogado uuid;
  version record;
BEGIN
  SELECT id INTO abogado FROM hiring.puestos_proceso
   WHERE activo AND lower(nombre) = 'abogado estructurador';
  IF abogado IS NULL THEN
    RAISE NOTICE 'No hay puesto «Abogado estructurador»: la 5.13 sigue por permiso';
    RETURN;
  END IF;

  FOR version IN SELECT id FROM hiring.flujo_versiones WHERE estado IN ('ACTIVA', 'BORRADOR') LOOP
    IF EXISTS (SELECT 1 FROM hiring.flujo_asignaciones
                WHERE version_id = version.id AND numeral = '5.13' AND modalidad IS NULL) THEN
      UPDATE hiring.flujo_asignaciones
         SET la_hace = jsonb_build_object('tipo', 'PUESTO', 'puestoId', abogado::text),
             updated_by = 'migracion-129', updated_at = now()
       WHERE version_id = version.id AND numeral = '5.13' AND modalidad IS NULL
         AND la_hace IS NULL;
    ELSE
      INSERT INTO hiring.flujo_asignaciones (version_id, numeral, modalidad, la_hace, updated_by)
      VALUES (version.id, '5.13', NULL,
              jsonb_build_object('tipo', 'PUESTO', 'puestoId', abogado::text), 'migracion-129');
    END IF;
  END LOOP;
END $$;

COMMIT;
