-- ============================================================================
-- 121 · El supervisor es un puesto del proceso
--
-- La 8.2 designaba al supervisor eligiéndolo del directorio y guardaba su
-- `id_person`. Para saber si quien entraba a la 9.4 era el supervisor, ese
-- `id_person` se comparaba con el `id_user` de la sesión —y el nombre completo
-- con el nombre de usuario—: nunca coincidían, y solo el super admin podía
-- avalar una cuenta de cobro o elaborar el informe final.
--
-- Desde aquí, con el modelo de puestos de la 109:
--
--   · Nace el puesto «Supervisor del contrato». No es obligatorio: no se
--     ocupa en la 3.3 sino con el acto de designación de la 8.2.
--   · La 9.4 lo nombra como quien la aprueba: el aval de cada cuenta de cobro
--     es esa aprobación, y la actividad ya no abre además una ronda al cerrar.
--   · La 10.1 (informe final) la hace ese puesto.
--   · El código no busca un puesto «Supervisor»: la 8.2 llena el puesto que
--     la ficha de la 9.4 diga. La Dirección puede cambiarlo en el flujo.
--   · La designación guarda la cuenta (`usuario_id`) y el puesto que llenó.
--     Los supervisores vigentes pasan a ocupar el puesto con la cuenta de su
--     persona, si la tienen.
--
-- Solo toca las filas generales de la 9.4 y la 10.1 en la versión activa y en
-- el borrador, y solo si no dicen nada todavía (sin aprobación o por permiso):
-- lo que la Dirección ya configuró se respeta.
--
-- Idempotente: correrla otra vez deja lo mismo.
-- ============================================================================

BEGIN;

ALTER TABLE hiring.supervisiones_contrato ALTER COLUMN persona_id DROP NOT NULL;
ALTER TABLE hiring.supervisiones_contrato ADD COLUMN IF NOT EXISTS usuario_id uuid;
ALTER TABLE hiring.supervisiones_contrato
  ADD COLUMN IF NOT EXISTS puesto_id uuid REFERENCES hiring.puestos_proceso(id);

COMMENT ON COLUMN hiring.supervisiones_contrato.usuario_id IS
  'La cuenta designada (121): la que ocupa el puesto e inicia sesión.';
COMMENT ON COLUMN hiring.supervisiones_contrato.puesto_id IS
  'El puesto que llenó la designación: el que aprueba la 9.4 en el flujo del proceso.';

DO $$
DECLARE
  supervisor uuid;
BEGIN
  -- 1. El puesto.
  SELECT id INTO supervisor FROM hiring.puestos_proceso
   WHERE lower(nombre) = 'supervisor del contrato' AND activo;
  IF supervisor IS NULL THEN
    INSERT INTO hiring.puestos_proceso (nombre, descripcion, obligatorio, orden, created_by)
    VALUES ('Supervisor del contrato',
            'Vigila la ejecución: avala las cuentas de cobro y elabora el informe final. Se ocupa con el acto de designación de la 8.2.',
            false, 50, 'migracion-121')
    RETURNING id INTO supervisor;
  END IF;

  -- 2. La 9.4 la aprueba el puesto: donde la fila general no dice nada.
  UPDATE hiring.flujo_asignaciones f
     SET aprobacion = jsonb_build_object('tipo', 'ESCALON', 'roles', '[]'::jsonb, 'personas', '[]'::jsonb,
                                         'puestos', jsonb_build_array(supervisor::text)),
         updated_by = 'migracion-121', updated_at = now()
    FROM hiring.flujo_versiones v
   WHERE v.id = f.version_id AND v.estado IN ('ACTIVA', 'BORRADOR')
     AND f.numeral = '9.4' AND f.modalidad IS NULL
     AND (f.aprobacion IS NULL OR f.aprobacion->>'tipo' = 'NINGUNA');

  INSERT INTO hiring.flujo_asignaciones (version_id, numeral, modalidad, aprobacion, updated_by)
  SELECT v.id, '9.4', NULL,
         jsonb_build_object('tipo', 'ESCALON', 'roles', '[]'::jsonb, 'personas', '[]'::jsonb,
                            'puestos', jsonb_build_array(supervisor::text)),
         'migracion-121'
    FROM hiring.flujo_versiones v
   WHERE v.estado IN ('ACTIVA', 'BORRADOR')
     AND EXISTS (SELECT 1 FROM hiring.actividades a WHERE a.numeral = '9.4')
     AND NOT EXISTS (
       SELECT 1 FROM hiring.flujo_asignaciones f
        WHERE f.version_id = v.id AND f.numeral = '9.4' AND f.modalidad IS NULL
     );

  -- 3. La 10.1 la hace el puesto.
  UPDATE hiring.flujo_asignaciones f
     SET la_hace = jsonb_build_object('tipo', 'PUESTO', 'puestoId', supervisor::text),
         updated_by = 'migracion-121', updated_at = now()
    FROM hiring.flujo_versiones v
   WHERE v.id = f.version_id AND v.estado IN ('ACTIVA', 'BORRADOR')
     AND f.numeral = '10.1' AND f.modalidad IS NULL
     AND (f.la_hace IS NULL OR f.la_hace->>'tipo' = 'PERMISO');

  INSERT INTO hiring.flujo_asignaciones (version_id, numeral, modalidad, la_hace, updated_by)
  SELECT v.id, '10.1', NULL, jsonb_build_object('tipo', 'PUESTO', 'puestoId', supervisor::text), 'migracion-121'
    FROM hiring.flujo_versiones v
   WHERE v.estado IN ('ACTIVA', 'BORRADOR')
     AND EXISTS (SELECT 1 FROM hiring.actividades a WHERE a.numeral = '10.1')
     AND NOT EXISTS (
       SELECT 1 FROM hiring.flujo_asignaciones f
        WHERE f.version_id = v.id AND f.numeral = '10.1' AND f.modalidad IS NULL
     );

  -- 4. Los supervisores vigentes: su cuenta, y el puesto en su proceso.
  UPDATE hiring.supervisiones_contrato s
     SET usuario_id = (
           SELECT u.id_user FROM auth."user" u
            WHERE u.id_person = s.persona_id AND u.is_active
            ORDER BY u.id_user LIMIT 1
         )
   WHERE s.usuario_id IS NULL AND s.persona_id IS NOT NULL;

  INSERT INTO hiring.asignaciones_puesto
         (proceso_id, puesto_id, usuario_id, usuario_nombre, persona_id, nombre, asignado_por, asignado_at)
  SELECT k.proceso_id, supervisor, s.usuario_id, u.username, s.persona_id, s.nombre,
         COALESCE(s.designado_por, 'migracion-121'), s.created_at
    FROM hiring.supervisiones_contrato s
    JOIN hiring.contratos k ON k.id = s.contrato_id
    JOIN auth."user" u ON u.id_user = s.usuario_id
   WHERE s.estado = 'VIGENTE'
     AND NOT EXISTS (
       SELECT 1 FROM hiring.asignaciones_puesto a
        WHERE a.proceso_id = k.proceso_id AND a.puesto_id = supervisor AND a.estado = 'VIGENTE'
     );

  UPDATE hiring.supervisiones_contrato s
     SET puesto_id = supervisor
    FROM hiring.contratos k
   WHERE k.id = s.contrato_id AND s.estado = 'VIGENTE' AND s.puesto_id IS NULL
     AND EXISTS (
       SELECT 1 FROM hiring.asignaciones_puesto a
        WHERE a.proceso_id = k.proceso_id AND a.puesto_id = supervisor
          AND a.usuario_id = s.usuario_id AND a.estado = 'VIGENTE'
     );
END $$;

COMMIT;
