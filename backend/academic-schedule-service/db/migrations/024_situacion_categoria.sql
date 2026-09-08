-- ============================================================================
-- Lote 1 · 1.7 — Corrección: poblar situacionCategoria de los TC de la 021
--
-- ⚠️ DEFECTO PROPIO DE LA 021. Llené situacionAdministrativa (texto libre) y
-- dejé situacionCategoria (el campo ESTRUCTURADO) en NULL. resolverSituacion()
-- decide sobre el estructurado y es fail-closed cuando falta, así que los 22
-- docentes nuevos quedaron como "sin situación registrada" y no asignables.
-- Lo detectó el canario agregado de EFDS-1372 (esperaba 9 no asignables, vio 111).
--
-- Es exactamente el fallo contra el que advierte la regla del módulo: la
-- decisión se toma sobre el campo estructurado. La derivación desde el texto
-- libre se hace UNA VEZ aquí, en la carga, con la misma convención de la 011.
--
-- ⚠️ Los 80 CATEDRÁTICOS quedan en NULL a propósito: el histórico no trae
-- situación administrativa. Fail-closed los deja no asignables, que es honesto
-- —no hay dato— pero los inhabilita para programar. Decidir que un catedrático
-- sin situación en el RUND es asignable es decisión de negocio, no mía.
--
-- Forward-only e idempotente (solo toca filas con la categoría en NULL).
--
-- ⚠️ APROVISIONAMIENTO DE DATOS DE DESARROLLO, no el mecanismo de producción.
-- Escribe fuera del esquema del módulo (academic_work_plan / auth) siguiendo el
-- precedente de las migraciones 007 y 011. No toca código del PTA.
-- RN-09 sigue vigente: el RUND es de solo lectura para las decanaturas.
-- ============================================================================

UPDATE academic_work_plan."Docente" d SET "situacionCategoria" = 'No Aplica'
  FROM auth.personas p
 WHERE d."personaId" = p.id_person AND p.num_identificacion = '70950450' AND d."situacionCategoria" IS NULL;

UPDATE academic_work_plan."Docente" d SET "situacionCategoria" = 'No Aplica'
  FROM auth.personas p
 WHERE d."personaId" = p.id_person AND p.num_identificacion = '59829920' AND d."situacionCategoria" IS NULL;

UPDATE academic_work_plan."Docente" d SET "situacionCategoria" = 'No Aplica'
  FROM auth.personas p
 WHERE d."personaId" = p.id_person AND p.num_identificacion = '10267180' AND d."situacionCategoria" IS NULL;

UPDATE academic_work_plan."Docente" d SET "situacionCategoria" = 'No Aplica'
  FROM auth.personas p
 WHERE d."personaId" = p.id_person AND p.num_identificacion = '78715855' AND d."situacionCategoria" IS NULL;

UPDATE academic_work_plan."Docente" d SET "situacionCategoria" = 'No Aplica'
  FROM auth.personas p
 WHERE d."personaId" = p.id_person AND p.num_identificacion = '7175750' AND d."situacionCategoria" IS NULL;

UPDATE academic_work_plan."Docente" d SET "situacionCategoria" = 'No Aplica'
  FROM auth.personas p
 WHERE d."personaId" = p.id_person AND p.num_identificacion = '1069723164' AND d."situacionCategoria" IS NULL;

UPDATE academic_work_plan."Docente" d SET "situacionCategoria" = 'No Aplica'
  FROM auth.personas p
 WHERE d."personaId" = p.id_person AND p.num_identificacion = '60360657' AND d."situacionCategoria" IS NULL;

UPDATE academic_work_plan."Docente" d SET "situacionCategoria" = 'No Aplica'
  FROM auth.personas p
 WHERE d."personaId" = p.id_person AND p.num_identificacion = '1110503380' AND d."situacionCategoria" IS NULL;

UPDATE academic_work_plan."Docente" d SET "situacionCategoria" = 'No Aplica'
  FROM auth.personas p
 WHERE d."personaId" = p.id_person AND p.num_identificacion = '15172130' AND d."situacionCategoria" IS NULL;

UPDATE academic_work_plan."Docente" d SET "situacionCategoria" = 'No Aplica'
  FROM auth.personas p
 WHERE d."personaId" = p.id_person AND p.num_identificacion = '1022369921' AND d."situacionCategoria" IS NULL;

UPDATE academic_work_plan."Docente" d SET "situacionCategoria" = 'No Aplica'
  FROM auth.personas p
 WHERE d."personaId" = p.id_person AND p.num_identificacion = '79421772' AND d."situacionCategoria" IS NULL;

UPDATE academic_work_plan."Docente" d SET "situacionCategoria" = 'No Aplica'
  FROM auth.personas p
 WHERE d."personaId" = p.id_person AND p.num_identificacion = '17653448' AND d."situacionCategoria" IS NULL;

UPDATE academic_work_plan."Docente" d SET "situacionCategoria" = 'No Aplica'
  FROM auth.personas p
 WHERE d."personaId" = p.id_person AND p.num_identificacion = '80129636' AND d."situacionCategoria" IS NULL;

UPDATE academic_work_plan."Docente" d SET "situacionCategoria" = 'No Aplica'
  FROM auth.personas p
 WHERE d."personaId" = p.id_person AND p.num_identificacion = '52472499' AND d."situacionCategoria" IS NULL;

UPDATE academic_work_plan."Docente" d SET "situacionCategoria" = 'No Aplica'
  FROM auth.personas p
 WHERE d."personaId" = p.id_person AND p.num_identificacion = '2000021351' AND d."situacionCategoria" IS NULL;

UPDATE academic_work_plan."Docente" d SET "situacionCategoria" = 'No Aplica'
  FROM auth.personas p
 WHERE d."personaId" = p.id_person AND p.num_identificacion = '16275620' AND d."situacionCategoria" IS NULL;

UPDATE academic_work_plan."Docente" d SET "situacionCategoria" = 'No Aplica'
  FROM auth.personas p
 WHERE d."personaId" = p.id_person AND p.num_identificacion = '16657580' AND d."situacionCategoria" IS NULL;

UPDATE academic_work_plan."Docente" d SET "situacionCategoria" = 'No Aplica'
  FROM auth.personas p
 WHERE d."personaId" = p.id_person AND p.num_identificacion = '7630355' AND d."situacionCategoria" IS NULL;

UPDATE academic_work_plan."Docente" d SET "situacionCategoria" = 'No Aplica'
  FROM auth.personas p
 WHERE d."personaId" = p.id_person AND p.num_identificacion = '98492349' AND d."situacionCategoria" IS NULL;

UPDATE academic_work_plan."Docente" d SET "situacionCategoria" = 'No Aplica'
  FROM auth.personas p
 WHERE d."personaId" = p.id_person AND p.num_identificacion = '32876745' AND d."situacionCategoria" IS NULL;

UPDATE academic_work_plan."Docente" d SET "situacionCategoria" = 'No Aplica'
  FROM auth.personas p
 WHERE d."personaId" = p.id_person AND p.num_identificacion = '23178406' AND d."situacionCategoria" IS NULL;

UPDATE academic_work_plan."Docente" d SET "situacionCategoria" = 'No Aplica'
  FROM auth.personas p
 WHERE d."personaId" = p.id_person AND p.num_identificacion = '77192959' AND d."situacionCategoria" IS NULL;

DO $$
DECLARE v_null INT; v_catedra_null INT;
BEGIN
  SELECT COUNT(*) INTO v_null FROM academic_work_plan."Docente" WHERE "situacionCategoria" IS NULL;
  SELECT COUNT(*) INTO v_catedra_null FROM academic_work_plan."Docente"
   WHERE "situacionCategoria" IS NULL AND "tipoVinculacion" = 'Cátedra';
  RAISE NOTICE '024: sin categoria=% (de ellos catedra=%)', v_null, v_catedra_null;
  IF v_null <> v_catedra_null THEN
    RAISE EXCEPTION '024: quedan % docentes no-catedra sin categoria', v_null - v_catedra_null;
  END IF;
END $$;
