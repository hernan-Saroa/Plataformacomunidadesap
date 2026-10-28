-- ============================================================================
-- 128 · Una sola publicación del proyecto de pliego, minuta y revisión de la 5.1
--
-- Revisión de QA de EFDS-1150 (2026-10-15):
--
-- 1. SECOP y página web en una sola actividad. La 5.3 recoge las dos
--    evidencias: la publicación en SECOP II (PDF, fecha, número, enlace) y el
--    soporte de que se pidió o se hizo la publicación en la página web a la
--    OTIC. La 5.4 sigue existiendo para guardar esa constancia, pero se
--    registra dentro de la 5.3 y sale del riel (lo hace el microfrontend). La
--    OTIC no tiene tarea propia. El orden queda publicación → observaciones.
--
-- 2. La minuta (borrador del contrato) es obligatoria en la 5.1 donde hay
--    pliego. Los anexos adicionales opcionales ya se podían cargar.
--
-- 3. Los documentos de la 5.1 pasan por el abogado revisor y la Directora de
--    Contratación antes de publicarse (quien los carga es el estructurador).
--    Se crea la cadena «Revisión de los documentos del proceso» con esos dos
--    escalones —el puesto Abogado revisor y el rol DIRECTOR_CONTRATACION— y se
--    asigna a la 5.1 en la versión activa y en el borrador del flujo. No se
--    copia la del pliego definitivo (113): esa se pudo editar en cada ambiente,
--    y en local ya traía al estructurador de primer escalón. Al quedar
--    completos, la 5.1 entra en revisión en vez de cerrarse sola.
--
-- Idempotente.
-- ============================================================================

BEGIN;

UPDATE hiring.actividades
   SET nombre = 'Publicación del proyecto de pliego (SECOP II y página web)'
 WHERE numeral = '5.3';

UPDATE hiring.actividades
   SET nombre = 'Soporte de la publicación en la página web de la ESAP',
       descripcion = 'Se registra dentro de la 5.3: correo o imagen de que se pidió o se hizo la publicación a la OTIC o al webmaster (128).'
 WHERE numeral = '5.4';

INSERT INTO hiring.documentos_requeridos
  (numeral, codigo, nombre, descripcion, modalidades, obligatorio, orden, confirmado, nota_fuente)
SELECT '5.1', 'MINUTA', 'Minuta del contrato',
       'Borrador del contrato con las condiciones contractuales. Se revisa con el aviso y el proyecto de pliego antes de publicar.',
       d.modalidades, true, 25, true,
       'Revisión de QA de EFDS-1150 (2026-10-15).'
  FROM hiring.documentos_requeridos d
 WHERE d.numeral = '5.1' AND d.codigo = 'PROYECTO_PLIEGO'
ON CONFLICT (numeral, codigo) DO NOTHING;

DO $$
DECLARE
  cadena    uuid;
  revisor   uuid;
  pasos     jsonb;
  version   record;
BEGIN
  SELECT id INTO revisor FROM hiring.puestos_proceso WHERE activo AND lower(nombre) = 'abogado revisor';
  pasos := jsonb_build_array(
    jsonb_build_object(
      'nombre', 'Abogado revisor', 'roles', '[]'::jsonb, 'personas', '[]'::jsonb, 'papeles', '[]'::jsonb,
      'puestos', CASE WHEN revisor IS NULL THEN '[]'::jsonb ELSE jsonb_build_array(revisor::text) END,
      'reglaDecision', 'UNO', 'acciones', '["APROBAR", "DEVOLVER"]'::jsonb),
    jsonb_build_object(
      'nombre', 'Directora', 'roles', '["DIRECTOR_CONTRATACION"]'::jsonb, 'personas', '[]'::jsonb,
      'papeles', '[]'::jsonb, 'puestos', '[]'::jsonb, 'reglaDecision', 'UNO',
      'acciones', '["APROBAR", "DEVOLVER"]'::jsonb)
  );

  SELECT id INTO cadena FROM hiring.cadenas_aprobacion WHERE nombre = 'Revisión de los documentos del proceso';

  IF cadena IS NULL THEN
    INSERT INTO hiring.cadenas_aprobacion (nombre, descripcion, escalones, permite_mismo_aprobador, created_by)
    VALUES ('Revisión de los documentos del proceso',
            'El abogado revisor del proceso y después la Directora de Contratación revisan el aviso, el proyecto de pliego y la minuta antes de publicar (migración 128).',
            pasos, false, 'migracion-128')
    RETURNING id INTO cadena;
  ELSE
    -- Una primera versión de esta migración copiaba los escalones de la 113.
    -- Si nadie la ha editado desde entonces, se corrige.
    UPDATE hiring.cadenas_aprobacion
       SET escalones = pasos, permite_mismo_aprobador = false
     WHERE id = cadena AND created_by = 'migracion-128' AND updated_by IS NULL;
  END IF;

  FOR version IN SELECT id FROM hiring.flujo_versiones WHERE estado IN ('ACTIVA', 'BORRADOR') LOOP
    IF EXISTS (SELECT 1 FROM hiring.flujo_asignaciones
                WHERE version_id = version.id AND numeral = '5.1' AND modalidad IS NULL) THEN
      UPDATE hiring.flujo_asignaciones
         SET aprobacion = jsonb_build_object('tipo', 'CADENA', 'cadenaId', cadena::text),
             updated_by = 'migracion-128', updated_at = now()
       WHERE version_id = version.id AND numeral = '5.1' AND modalidad IS NULL
         AND aprobacion IS NULL;
    ELSE
      INSERT INTO hiring.flujo_asignaciones (version_id, numeral, modalidad, aprobacion, updated_by)
      VALUES (version.id, '5.1', NULL,
              jsonb_build_object('tipo', 'CADENA', 'cadenaId', cadena::text), 'migracion-128');
    END IF;
  END LOOP;
END $$;

COMMIT;
