-- ============================================================================
-- 110 · Quien lleva el caso no es quien lo revisa
--
-- La 109 dejó un solo puesto, «Abogado», que hacía la causal y el comité y
-- además aprobaba el estudio previo. En el flujo del área son personas
-- distintas (Juan, 2026-10-15):
--
--   · El Gestor de Contratación recibe el proceso en la 3.3 y asigna al
--     abogado que toma el caso.
--   · El ABOGADO DEL CASO hace las actividades de ahí en adelante.
--   · El ABOGADO REVISOR, asignado también por proceso, aprueba o devuelve.
--   · Después decide la jefe: cualquiera con el rol de Director de
--     Contratación, sin asignarla.
--
-- Lo que se hace:
--
--   1. «Abogado» pasa a llamarse «Abogado del caso». Conserva sus
--      asignaciones y lo que hace (3.6 y 3.7); el área le agrega el resto
--      desde «Quién la hace».
--   2. Nace el puesto «Abogado revisor», obligatorio.
--   3. Nace la cadena «Revisión del estudio previo»: Abogado revisor y
--      después Director de Contratación.
--   4. La 3.1 se aprueba con esa cadena si seguía con lo que dejó la 109
--      (el puesto Abogado). Si alguien ya le puso otra cadena, se respeta.
--
-- Idempotente: correrla otra vez deja lo mismo.
-- ============================================================================

BEGIN;

DO $$
DECLARE
  caso uuid;
  revisor uuid;
  cadena uuid;
BEGIN
  -- 1. El abogado que lleva el caso.
  SELECT id INTO caso FROM hiring.puestos_proceso
   WHERE activo AND lower(nombre) IN ('abogado', 'abogado del caso')
   ORDER BY orden LIMIT 1;
  IF caso IS NOT NULL THEN
    UPDATE hiring.puestos_proceso
       SET nombre = 'Abogado del caso',
           descripcion = 'Toma el caso cuando Contratación recibe el proceso y hace las actividades que se le asignen.',
           updated_by = 'migracion-110',
           updated_at = now()
     WHERE id = caso AND nombre <> 'Abogado del caso';
  END IF;

  -- 2. El abogado que revisa.
  SELECT id INTO revisor FROM hiring.puestos_proceso WHERE activo AND lower(nombre) = 'abogado revisor';
  IF revisor IS NULL THEN
    INSERT INTO hiring.puestos_proceso (nombre, descripcion, obligatorio, orden, created_by)
    VALUES ('Abogado revisor', 'Aprueba, devuelve o niega lo que se le pone a revisión.', true, 2, 'migracion-110')
    RETURNING id INTO revisor;
  END IF;

  -- 3. La cadena del estudio previo: el revisor y después la jefe.
  SELECT id INTO cadena FROM hiring.cadenas_aprobacion WHERE activa AND nombre = 'Revisión del estudio previo';
  IF cadena IS NULL THEN
    INSERT INTO hiring.cadenas_aprobacion (nombre, descripcion, escalones, permite_mismo_aprobador, created_by)
    VALUES (
      'Revisión del estudio previo',
      'El abogado revisor del proceso y después el Director de Contratación (migración 110).',
      jsonb_build_array(
        jsonb_build_object(
          'nombre', 'Abogado revisor', 'roles', '[]'::jsonb, 'personas', '[]'::jsonb, 'papeles', '[]'::jsonb,
          'puestos', jsonb_build_array(revisor::text), 'reglaDecision', 'UNO',
          'acciones', '["APROBAR", "DEVOLVER", "NEGAR"]'::jsonb),
        jsonb_build_object(
          'nombre', 'Jefe', 'roles', '["DIRECTOR_CONTRATACION"]'::jsonb, 'personas', '[]'::jsonb,
          'papeles', '[]'::jsonb, 'puestos', '[]'::jsonb, 'reglaDecision', 'UNO',
          'acciones', '["APROBAR", "DEVOLVER", "NEGAR"]'::jsonb)
      ),
      false,
      'migracion-110'
    )
    RETURNING id INTO cadena;
  END IF;

  -- 4. La 3.1 con esa cadena, si seguía con lo que dejó la 109. La regla
  --    anterior se deroga, no se borra: lo ya aprobado se audita con ella.
  IF caso IS NOT NULL AND EXISTS (
    SELECT 1 FROM hiring.reglas_actividad
     WHERE numeral = '3.1' AND tipo = 'EXIGE_APROBACION' AND modalidad IS NULL AND vigente_hasta IS NULL
       AND config = jsonb_build_object('puestos', jsonb_build_array(caso::text))
  ) THEN
    UPDATE hiring.reglas_actividad
       SET vigente_hasta = now(), updated_at = now()
     WHERE numeral = '3.1' AND tipo = 'EXIGE_APROBACION' AND modalidad IS NULL AND vigente_hasta IS NULL;
    INSERT INTO hiring.reglas_actividad (numeral, tipo, config, mensaje)
    VALUES ('3.1', 'EXIGE_APROBACION', jsonb_build_object('cadenaId', cadena::text),
            'Esta actividad requiere aprobación antes de darse por terminada');
  END IF;
END $$;

COMMIT;
