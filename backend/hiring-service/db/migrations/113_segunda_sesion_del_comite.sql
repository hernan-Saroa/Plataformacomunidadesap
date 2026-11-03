-- ============================================================================
-- 113 · Pliego definitivo y segunda sesión del Comité de Contratación
--
-- En licitación pública el proceso va dos veces al Comité de Contratación: la
-- primera es la 3.7, que ya existía; la segunda, con el pliego definitivo,
-- después de atender las observaciones (5.6) y antes de la apertura (5.7). La
-- matriz no la numera, y el prototipo no la trataba como un ciclo propio.
--
-- Decisiones de Juan (2026-10-16):
--   · La primera sesión es la 3.7 de hoy; no se mueve.
--   · La segunda es una actividad nueva entre la 5.6 y la 5.7: la 5.6.1. Se
--     intercala con un tercer nivel en vez de renumerar la etapa 5, que la 112
--     acaba de alinear con la matriz.
--   · Solo en licitación pública. Las demás la tienen como NO_APLICA y se
--     pueden encender después quitando su exclusión.
--
-- Lo que hace la 5.6.1, en orden:
--   1. El abogado del caso sube las versiones definitivas de los documentos
--      de la 5.1 que cambian por las observaciones. Los demás conservan la
--      versión aprobada; el catálogo guarda el historial de cada uno.
--   2. La envía a la cadena «Revisión del pliego definitivo»: abogado revisor y
--      después la directora. No se envía ni se aprueba sin el CDP cargado.
--   3. Registra lo que decidió el comité en la segunda sesión, con el CDP
--      cargado. Observar la devuelve a la cadena desde el principio.
--   4. La apertura (5.7) exige que esa sesión haya aprobado.
--
-- Las actas de las dos sesiones dejan de ser obligatorias al registrar: el
-- acta puede tardar hasta diez días calendario y no puede frenar el proceso.
-- Mientras falte, el abogado dueño del proceso tiene una alerta.
--
-- Idempotente: se puede volver a correr sin duplicar nada.
-- ============================================================================

BEGIN;

-- 1. La actividad ----------------------------------------------------------------
--
-- Va en el orden 7 y la apertura y lo que sigue bajan un puesto. El orden es el
-- del riel; el numeral no cambia.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM hiring.actividades WHERE numeral = '5.6.1') THEN
    UPDATE hiring.actividades SET orden = orden + 1 WHERE etapa = 5 AND orden >= 7;

    INSERT INTO hiring.actividades (numeral, etapa, nombre, descripcion, orden, activa)
    VALUES (
      '5.6.1', 5, 'Pliego definitivo y segunda sesión del Comité',
      'Atendidas las observaciones, se ajustan los documentos que lo requieran, el pliego definitivo pasa otra vez por el abogado revisor y la directora, y vuelve al Comité de Contratación antes de la apertura. Exige el CDP cargado.',
      7, true
    );
  END IF;
END $$;

-- 2. Solo en licitación pública ---------------------------------------------------

INSERT INTO hiring.actividades_excluidas (numeral, modalidad, motivo)
SELECT '5.6.1', m.codigo,
       'La segunda sesión del Comité con el pliego definitivo solo se adelanta en licitación pública'
  FROM hiring.modalidades m
 WHERE m.codigo <> 'LICITACION_PUBLICA'
ON CONFLICT DO NOTHING;

-- Los procesos que ya existen la reciben como si hubieran nacido con ella.
INSERT INTO hiring.proceso_actividades (proceso_id, numeral, estado, datos)
SELECT p.id, '5.6.1',
       CASE WHEN p.modalidad = 'LICITACION_PUBLICA' THEN 'BORRADOR' ELSE 'NO_APLICA' END,
       '{}'::jsonb
  FROM hiring.procesos p
 WHERE NOT EXISTS (
   SELECT 1 FROM hiring.proceso_actividades pa
    WHERE pa.proceso_id = p.id AND pa.numeral = '5.6.1'
 );

-- 3. Las sesiones dicen a cuál sumisión pertenecen -------------------------------

ALTER TABLE hiring.sesiones_comite_contratacion
  ADD COLUMN IF NOT EXISTS sumision smallint NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_sesion_comite_sumision') THEN
    ALTER TABLE hiring.sesiones_comite_contratacion
      ADD CONSTRAINT ck_sesion_comite_sumision CHECK (sumision IN (1, 2));
  END IF;
END $$;

COMMENT ON COLUMN hiring.sesiones_comite_contratacion.sumision IS
  '1 = la 3.7 (primera sesión); 2 = la 5.6.1, con el pliego definitivo (migración 113).';

COMMENT ON COLUMN hiring.sesiones_comite_contratacion.acta_documento_id IS
  'El acta de la sesión. Puede llegar hasta diez días después y no frena el proceso; mientras falte, el abogado del proceso tiene una alerta (113).';

-- 4. Quién la hace y quién la aprueba --------------------------------------------
--
-- La hace quien hace la 3.7 (el abogado del caso, en la configuración de hoy).
-- La aprueba una cadena propia, copiada de la del estudio previo —abogado
-- revisor y después la jefe—, para que el área pueda cambiar una sin la otra.

DO $$
DECLARE
  origen   hiring.cadenas_aprobacion%ROWTYPE;
  revisor  uuid;
  cadena   uuid;
  version  record;
  la_hace  jsonb;
BEGIN
  SELECT id INTO cadena FROM hiring.cadenas_aprobacion
   WHERE activa AND nombre = 'Revisión del pliego definitivo';

  IF cadena IS NULL THEN
    SELECT * INTO origen FROM hiring.cadenas_aprobacion
     WHERE activa AND nombre = 'Revisión del estudio previo';

    IF origen.id IS NOT NULL THEN
      INSERT INTO hiring.cadenas_aprobacion (nombre, descripcion, escalones, permite_mismo_aprobador, created_by)
      VALUES ('Revisión del pliego definitivo',
              'El abogado revisor del proceso y después la Directora de Contratación, antes de la segunda sesión del Comité (migración 113).',
              origen.escalones, origen.permite_mismo_aprobador, 'migracion-113')
      RETURNING id INTO cadena;
    ELSE
      SELECT id INTO revisor FROM hiring.puestos_proceso WHERE activo AND lower(nombre) = 'abogado revisor';
      INSERT INTO hiring.cadenas_aprobacion (nombre, descripcion, escalones, permite_mismo_aprobador, created_by)
      VALUES (
        'Revisión del pliego definitivo',
        'El abogado revisor del proceso y después la Directora de Contratación, antes de la segunda sesión del Comité (migración 113).',
        jsonb_build_array(
          jsonb_build_object(
            'nombre', 'Abogado revisor', 'roles', '[]'::jsonb, 'personas', '[]'::jsonb, 'papeles', '[]'::jsonb,
            'puestos', CASE WHEN revisor IS NULL THEN '[]'::jsonb ELSE jsonb_build_array(revisor::text) END,
            'reglaDecision', 'UNO', 'acciones', '["APROBAR", "DEVOLVER", "NEGAR"]'::jsonb),
          jsonb_build_object(
            'nombre', 'Directora', 'roles', '["DIRECTOR_CONTRATACION"]'::jsonb, 'personas', '[]'::jsonb,
            'papeles', '[]'::jsonb, 'puestos', '[]'::jsonb, 'reglaDecision', 'UNO',
            'acciones', '["APROBAR", "DEVOLVER", "NEGAR"]'::jsonb)
        ),
        false,
        'migracion-113'
      )
      RETURNING id INTO cadena;
    END IF;
  END IF;

  -- En la versión activa y en el borrador, si lo hay: si solo fuera a la
  -- activa, activar el borrador la dejaría sin cadena.
  FOR version IN
    SELECT id FROM hiring.flujo_versiones WHERE estado IN ('ACTIVA', 'BORRADOR')
  LOOP
    IF EXISTS (SELECT 1 FROM hiring.flujo_asignaciones
                WHERE version_id = version.id AND numeral = '5.6.1') THEN
      CONTINUE;
    END IF;

    SELECT fa.la_hace INTO la_hace
      FROM hiring.flujo_asignaciones fa
     WHERE fa.version_id = version.id AND fa.numeral = '3.7' AND fa.modalidad IS NULL;

    INSERT INTO hiring.flujo_asignaciones (version_id, numeral, modalidad, la_hace, aprobacion, updated_by)
    VALUES (version.id, '5.6.1', NULL, la_hace,
            jsonb_build_object('tipo', 'CADENA', 'cadenaId', cadena::text),
            'migracion-113');
  END LOOP;
END $$;

-- 5. El plazo del acta -------------------------------------------------------------

INSERT INTO hiring.parametros_alerta (clave, valor, minimo, maximo, descripcion)
VALUES ('plazo_acta_comite', 10, 1, 60,
        'Días calendario que puede tardar el acta de una sesión del Comité de Contratación antes de darse por vencida')
ON CONFLICT (clave) DO NOTHING;

COMMIT;
