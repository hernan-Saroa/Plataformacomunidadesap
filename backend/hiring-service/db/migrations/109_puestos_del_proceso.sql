-- ============================================================================
-- 109 · Puestos del proceso: quién lleva cada parte, configurado y no escrito
--
-- Hasta aquí el «abogado» era un papel escrito en el código: la 3.3 lo asignaba
-- siempre, y la 3.4, la 3.6, la 3.7, las revisiones del PAA y los avisos le
-- tocaban a él por definición. Cuando el área pidió dos abogados en orden y que
-- revisara el jefe (101, 102) se montaron los escalones encima, y las dos cosas
-- se contradecían: la 3.3 exigía un abogado que la cadena no usaba.
--
-- Desde aquí (decisión de Juan, 2026-10-15):
--
--   · Los permisos por etapa siguen diciendo quién PUEDE. La asignación nunca
--     da un permiso.
--   · Un PUESTO es un lugar en el proceso que ocupa una persona: «Abogado»,
--     «Segundo abogado», «Jefe». Los crea y los nombra la Dirección; en la 3.3
--     se pone a una persona en cada uno, elegida entre las que tienen los
--     permisos de todo lo que el puesto hace.
--   · Cada actividad dice quién la hace (regla LA_HACE: un puesto o personas;
--     sin regla, quien tenga el permiso) y quién la aprueba (EXIGE_APROBACION:
--     escalones con roles, personas o puestos).
--
-- Para que nada cambie al aplicarla:
--
--   1. Nace el puesto «Abogado», obligatorio.
--   2. Los abogados asignados hoy pasan a ocuparlo; su participación queda
--      relevada con el motivo, como historia.
--   3. La 3.6 y la 3.7 las hace el puesto Abogado (antes, por código).
--   4. La regla de la 3.1 que solo nombraba roles —la «de siempre», en la que
--      decidía el abogado— pasa a aprobarla el puesto Abogado. Las que
--      apuntan a una cadena se quedan con su cadena.
--   5. El papel ABOGADO de los escalones —plantillas y rondas— pasa a ser el
--      puesto Abogado.
--   6. Los avisos dirigidos al abogado pasan al puesto.
--   7. La designación por escalón de la 102 desaparece: un escalón por rol lo
--      decide cualquiera con el rol; para que lo decida una persona por
--      proceso, el escalón nombra un puesto. Nunca salió de local.
--
-- Idempotente: correrla otra vez deja lo mismo.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS hiring.puestos_proceso (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre       varchar(120) NOT NULL,
  descripcion  text,
  -- Si un proceso recibido sin nadie en este puesto genera alerta.
  obligatorio  boolean NOT NULL DEFAULT false,
  orden        int NOT NULL DEFAULT 100,
  -- Archivar y no borrar: las asignaciones de procesos viejos lo nombran.
  activo       boolean NOT NULL DEFAULT true,
  created_by   varchar(200),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_by   varchar(200),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_puesto_activo_nombre
  ON hiring.puestos_proceso (lower(nombre)) WHERE activo;

COMMENT ON TABLE hiring.puestos_proceso IS
  'Lugares del proceso que ocupa una persona (Abogado, Jefe...). Los configura la Dirección; se ocupan en la 3.3.';

CREATE TABLE IF NOT EXISTS hiring.asignaciones_puesto (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proceso_id      uuid NOT NULL REFERENCES hiring.procesos(id) ON DELETE CASCADE,
  puesto_id       uuid NOT NULL REFERENCES hiring.puestos_proceso(id),
  usuario_id      uuid NOT NULL,
  usuario_nombre  varchar(120) NOT NULL,
  persona_id      uuid,
  nombre          varchar(200) NOT NULL,
  estado          varchar(10) NOT NULL DEFAULT 'VIGENTE',
  asignado_por    varchar(200),
  asignado_at     timestamptz NOT NULL DEFAULT now(),
  relevado_at     timestamptz,
  relevado_por    varchar(200),
  motivo_relevo   text,
  CONSTRAINT ck_asignacion_puesto_estado CHECK (estado IN ('VIGENTE', 'RELEVADO')),
  CONSTRAINT ck_asignacion_puesto_relevo CHECK (estado <> 'RELEVADO' OR (relevado_at IS NOT NULL AND motivo_relevo IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_asignacion_puesto_vigente
  ON hiring.asignaciones_puesto (proceso_id, puesto_id) WHERE estado = 'VIGENTE';
CREATE INDEX IF NOT EXISTS idx_asignacion_puesto_usuario
  ON hiring.asignaciones_puesto (usuario_id) WHERE estado = 'VIGENTE';

COMMENT ON TABLE hiring.asignaciones_puesto IS
  'Quién ocupa cada puesto en un proceso. Cambiar es relevar con motivo, sin borrar al anterior.';

-- La regla «quién la hace», por actividad y modalidad.
ALTER TABLE hiring.reglas_actividad DROP CONSTRAINT IF EXISTS ck_regla_tipo;
ALTER TABLE hiring.reglas_actividad ADD CONSTRAINT ck_regla_tipo CHECK (tipo IN (
  'CAMPO_OBLIGATORIO', 'DOCUMENTO_REQUERIDO', 'RANGO_VALOR', 'PLAZO_MINIMO',
  'BLOQUEA_AVANCE', 'REGLA_DERIVADA', 'EXIGE_APROBACION', 'EXIGE_FIRMA', 'LA_HACE'
));

-- Los escalones de las rondas nombran puestos.
ALTER TABLE hiring.aprobacion_escalones
  ADD COLUMN IF NOT EXISTS puestos text[] NOT NULL DEFAULT '{}';

DO $$
DECLARE
  abogado uuid;
BEGIN
  -- 1. El puesto Abogado.
  SELECT id INTO abogado FROM hiring.puestos_proceso WHERE lower(nombre) = 'abogado' AND activo;
  IF abogado IS NULL THEN
    INSERT INTO hiring.puestos_proceso (nombre, descripcion, obligatorio, orden, created_by)
    VALUES ('Abogado',
            'Revisa el estudio previo, elige la causal y registra el comité de contratación.',
            true, 1, 'migracion-109')
    RETURNING id INTO abogado;
  END IF;

  -- 2. Los abogados de hoy ocupan el puesto.
  INSERT INTO hiring.asignaciones_puesto
         (proceso_id, puesto_id, usuario_id, usuario_nombre, persona_id, nombre, asignado_por, asignado_at)
  SELECT pp.proceso_id, abogado, pp.usuario_id, pp.usuario_nombre, pp.persona_id, pp.nombre,
         pp.asignado_por, pp.asignado_at
    FROM hiring.participaciones_proceso pp
   WHERE pp.papel = 'ABOGADO' AND pp.estado = 'VIGENTE' AND pp.usuario_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM hiring.asignaciones_puesto a
        WHERE a.proceso_id = pp.proceso_id AND a.puesto_id = abogado AND a.estado = 'VIGENTE'
     );

  UPDATE hiring.participaciones_proceso
     SET estado = 'RELEVADO',
         relevado_at = now(),
         relevado_por = 'migracion-109',
         motivo_relevo = 'Pasa a ocupar el puesto Abogado (migración 109)'
   WHERE papel = 'ABOGADO' AND estado = 'VIGENTE';

  -- 3. La 3.6 y la 3.7 las hace el puesto Abogado.
  INSERT INTO hiring.reglas_actividad (numeral, tipo, config, mensaje)
  SELECT n, 'LA_HACE', jsonb_build_object('puestoId', abogado::text),
         'La hace quien ocupa el puesto Abogado en el proceso (migración 109)'
    FROM unnest(ARRAY['3.6', '3.7']) AS n
   WHERE EXISTS (SELECT 1 FROM hiring.actividades a WHERE a.numeral = n)
     AND NOT EXISTS (
       SELECT 1 FROM hiring.reglas_actividad r
        WHERE r.numeral = n AND r.tipo = 'LA_HACE' AND r.vigente_hasta IS NULL
     );

  -- 4. La regla de siempre de la 3.1 la aprueba el puesto Abogado.
  UPDATE hiring.reglas_actividad
     SET config = jsonb_build_object('puestos', jsonb_build_array(abogado::text)),
         updated_at = now()
   WHERE numeral = '3.1' AND tipo = 'EXIGE_APROBACION' AND vigente_hasta IS NULL
     AND NOT (config ? 'cadenaId') AND NOT (config ? 'puestos');

  -- 5. El papel ABOGADO de los escalones pasa al puesto.
  UPDATE hiring.aprobacion_escalones
     SET puestos = array_append(array_remove(puestos, abogado::text), abogado::text),
         papeles = array_remove(papeles, 'ABOGADO')
   WHERE 'ABOGADO' = ANY (papeles);

  UPDATE hiring.cadenas_aprobacion c
     SET escalones = (
           SELECT jsonb_agg(
                    CASE WHEN COALESCE(e->'papeles', '[]'::jsonb) ? 'ABOGADO'
                      THEN e || jsonb_build_object(
                             'papeles', (e->'papeles') - 'ABOGADO',
                             'puestos', COALESCE(e->'puestos', '[]'::jsonb) || jsonb_build_array(abogado::text))
                      ELSE e || jsonb_build_object('puestos', COALESCE(e->'puestos', '[]'::jsonb))
                    END ORDER BY o)
             FROM jsonb_array_elements(c.escalones) WITH ORDINALITY AS t(e, o)
         ),
         updated_at = now()
   WHERE EXISTS (
           SELECT 1 FROM jsonb_array_elements(c.escalones) e
            WHERE NOT (e ? 'puestos') OR COALESCE(e->'papeles', '[]'::jsonb) ? 'ABOGADO'
         );

  -- 6. Los avisos al abogado van al puesto.
  UPDATE hiring.avisos
     SET papeles = (papeles - 'ABOGADO') || jsonb_build_array('PUESTO:' || abogado::text)
   WHERE papeles ? 'ABOGADO';
END $$;

-- 7. Sin designación por escalón.
DROP TABLE IF EXISTS hiring.designaciones_escalon;

UPDATE hiring.parametros_alerta
   SET descripcion = 'Días que un proceso recibido puede estar sin nadie en un puesto obligatorio antes de alertar'
 WHERE clave = 'tolerancia_sin_abogado';

COMMIT;
