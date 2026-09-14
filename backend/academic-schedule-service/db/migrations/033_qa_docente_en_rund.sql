-- ============================================================================
-- §1.1 — El usuario de prueba qa.docente necesita registro en el RUND
--
-- El portal del docente resuelve el acumulado del docente autenticado contra el
-- RUND (academic_work_plan."Docente"). qa.docente (1020304053) es persona y
-- usuario con rol DOCENTE, pero NO tenía registro de docente, así que
-- /portal-docente/acumulado respondía 404 y la pantalla se veía a medias.
--
-- Se le crea un registro de CÁTEDRA en la territorial DT-009 (la de qa.jefatura),
-- para poder probar el ciclo completo publicar → tomar → devolver → aprobar de
-- punta a punta con los usuarios qa.*.
--
-- ⚠️ APROVISIONAMIENTO DE DATOS DE PRUEBA, no escritura del módulo en el RUND en
-- tiempo de ejecución (RN-09 sigue vigente: la decanatura no escribe el RUND
-- desde la interfaz). Es el mismo patrón de las migraciones 007/011/021 que
-- sembraron docentes de dev. Idempotente y guardado por identificación.
-- ============================================================================

INSERT INTO academic_work_plan."Docente"
       ("personaId", "territorialId", "tipoVinculacion", "dedicacion", "situacionCategoria", "updatedAt")
SELECT p.id_person, 'DT-009', 'Cátedra', 'Cátedra', 'servicio_activo', NOW()
  FROM auth.personas p
 WHERE p.num_identificacion = '1020304053'
   AND NOT EXISTS (
     SELECT 1 FROM academic_work_plan."Docente" d WHERE d."personaId" = p.id_person
   );

-- Canario: qa.docente quedó en el RUND, exactamente uno.
DO $$
DECLARE v_n INT;
BEGIN
  SELECT COUNT(*) INTO v_n
    FROM academic_work_plan."Docente" d
    JOIN auth.personas p ON p.id_person = d."personaId"
   WHERE p.num_identificacion = '1020304053';
  RAISE NOTICE '033: registros RUND de qa.docente = %', v_n;
  IF v_n <> 1 THEN
    RAISE EXCEPTION '033: qa.docente debia tener exactamente 1 registro en el RUND y tiene %', v_n;
  END IF;
END $$;
