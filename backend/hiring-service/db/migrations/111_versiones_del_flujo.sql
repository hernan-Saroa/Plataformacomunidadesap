-- ============================================================================
-- 111 · Versiones del flujo: se arma un borrador, se valida y se activa
--
-- Hasta la 110, quién hace cada actividad (regla LA_HACE) y quién la aprueba
-- (EXIGE_APROBACION) se cambiaban de uno en uno y regían al instante, también
-- para los procesos que iban a mitad de camino. Con un área que reorganiza
-- quién hace qué en cada reunión, eso dejaba procesos con medio flujo viejo y
-- medio nuevo, y ninguna forma de revisar el conjunto antes de que rigiera.
--
-- Desde aquí (decisión de Juan, 2026-10-15):
--
--   · El flujo tiene VERSIONES. Una sola ACTIVA, a lo sumo un BORRADOR, y las
--     RETIRADAS que todavía usan procesos viejos.
--   · Cada versión dice, por actividad y por modalidad, quién la hace y quién
--     la aprueba. Una fila sin modalidad es la general; una con modalidad la
--     reemplaza solo ahí. NULL en una columna es «hereda la general».
--   · Los cambios se hacen en el borrador. Activarlo exige que ninguna
--     actividad quede sin quién la haga ni sin quién la apruebe.
--   · Cada proceso corre con la versión con la que nació. Contratación puede
--     pasarlo a la activa con un motivo.
--
-- Formas de `la_hace`:   {"tipo":"PERMISO"} · {"tipo":"PUESTO","puestoId"} ·
--                        {"tipo":"PERSONAS","personas":[...]}
-- Formas de `aprobacion`: {"tipo":"NINGUNA"} · {"tipo":"CADENA","cadenaId"} ·
--                        {"tipo":"ESCALON","roles","personas","puestos"}
--
-- Lo de hoy pasa a ser la versión 1, activa, y todos los procesos quedan en
-- ella. Las reglas LA_HACE y EXIGE_APROBACION de reglas_actividad se derogan:
-- desde aquí nadie las lee, y dejarlas vigentes invitaría a leerlas.
--
-- Idempotente: correrla otra vez deja lo mismo.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS hiring.flujo_versiones (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero        int NOT NULL UNIQUE,
  estado        varchar(10) NOT NULL DEFAULT 'BORRADOR',
  nota          text,
  creada_por    varchar(200),
  created_at    timestamptz NOT NULL DEFAULT now(),
  activada_por  varchar(200),
  activada_at   timestamptz,
  retirada_at   timestamptz,
  CONSTRAINT ck_flujo_version_estado CHECK (estado IN ('BORRADOR', 'ACTIVA', 'RETIRADA'))
);

-- Una sola activa y a lo sumo un borrador: dos borradores serían dos ideas
-- del flujo peleándose por activarse.
CREATE UNIQUE INDEX IF NOT EXISTS uq_flujo_una_activa ON hiring.flujo_versiones ((true)) WHERE estado = 'ACTIVA';
CREATE UNIQUE INDEX IF NOT EXISTS uq_flujo_un_borrador ON hiring.flujo_versiones ((true)) WHERE estado = 'BORRADOR';

COMMENT ON TABLE hiring.flujo_versiones IS
  'Versiones del flujo de Contratación: quién hace y quién aprueba cada actividad. Se edita el borrador y se activa.';

CREATE TABLE IF NOT EXISTS hiring.flujo_asignaciones (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id  uuid NOT NULL REFERENCES hiring.flujo_versiones(id) ON DELETE CASCADE,
  numeral     varchar(10) NOT NULL REFERENCES hiring.actividades(numeral) ON DELETE CASCADE,
  modalidad   varchar(60) REFERENCES hiring.modalidades(codigo),
  la_hace     jsonb,
  aprobacion  jsonb,
  updated_by  varchar(200),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_flujo_la_hace CHECK (la_hace IS NULL OR la_hace ->> 'tipo' IN ('PERMISO', 'PUESTO', 'PERSONAS')),
  CONSTRAINT ck_flujo_aprobacion CHECK (aprobacion IS NULL OR aprobacion ->> 'tipo' IN ('NINGUNA', 'CADENA', 'ESCALON'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_flujo_asignacion
  ON hiring.flujo_asignaciones (version_id, numeral, COALESCE(modalidad, ''));

COMMENT ON TABLE hiring.flujo_asignaciones IS
  'Por versión, actividad y modalidad (NULL = general): quién la hace y quién la aprueba. NULL en una columna hereda la general.';

ALTER TABLE hiring.procesos
  ADD COLUMN IF NOT EXISTS flujo_version_id uuid REFERENCES hiring.flujo_versiones(id);

DO $$
DECLARE
  v1 uuid;
BEGIN
  SELECT id INTO v1 FROM hiring.flujo_versiones WHERE numero = 1;
  IF v1 IS NULL THEN
    INSERT INTO hiring.flujo_versiones (numero, estado, nota, creada_por, activada_por, activada_at)
    VALUES (1, 'ACTIVA', 'La configuración que regía antes de las versiones (migración 111).',
            'migracion-111', 'migracion-111', now())
    RETURNING id INTO v1;

    -- Lo que regía, actividad por actividad y modalidad por modalidad.
    INSERT INTO hiring.flujo_asignaciones (version_id, numeral, modalidad, la_hace, aprobacion, updated_by)
    SELECT v1, c.numeral, c.modalidad,
           (SELECT CASE
                     WHEN r.config ? 'puestoId' THEN jsonb_build_object('tipo', 'PUESTO', 'puestoId', r.config ->> 'puestoId')
                     WHEN jsonb_array_length(COALESCE(r.config -> 'personas', '[]'::jsonb)) > 0
                       THEN jsonb_build_object('tipo', 'PERSONAS', 'personas', r.config -> 'personas')
                   END
              FROM hiring.reglas_actividad r
             WHERE r.numeral = c.numeral AND r.tipo = 'LA_HACE' AND r.vigente_hasta IS NULL
               AND r.modalidad IS NOT DISTINCT FROM c.modalidad
             LIMIT 1),
           (SELECT CASE
                     WHEN r.config ? 'cadenaId' THEN jsonb_build_object('tipo', 'CADENA', 'cadenaId', r.config ->> 'cadenaId')
                     ELSE jsonb_build_object(
                            'tipo', 'ESCALON',
                            'roles', COALESCE(r.config -> 'roles', '[]'::jsonb),
                            'personas', COALESCE(r.config -> 'personas', '[]'::jsonb),
                            'puestos', COALESCE(r.config -> 'puestos', '[]'::jsonb))
                   END
              FROM hiring.reglas_actividad r
             WHERE r.numeral = c.numeral AND r.tipo = 'EXIGE_APROBACION' AND r.vigente_hasta IS NULL
               AND r.modalidad IS NOT DISTINCT FROM c.modalidad
             LIMIT 1),
           'migracion-111'
      FROM (SELECT DISTINCT numeral, modalidad
              FROM hiring.reglas_actividad
             WHERE tipo IN ('LA_HACE', 'EXIGE_APROBACION') AND vigente_hasta IS NULL) c;
  END IF;

  UPDATE hiring.procesos SET flujo_version_id = v1 WHERE flujo_version_id IS NULL;

  UPDATE hiring.reglas_actividad
     SET vigente_hasta = now(), updated_at = now()
   WHERE tipo IN ('LA_HACE', 'EXIGE_APROBACION') AND vigente_hasta IS NULL;
END $$;

-- Un proceso nuevo nace con la versión activa, lo cree quien lo cree: así
-- ningún camino de creación (estudio previo, PAA) puede olvidarse de ponerla.
CREATE OR REPLACE FUNCTION hiring.proceso_con_flujo_activo() RETURNS trigger AS $$
BEGIN
  IF NEW.flujo_version_id IS NULL THEN
    SELECT id INTO NEW.flujo_version_id FROM hiring.flujo_versiones WHERE estado = 'ACTIVA';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tg_proceso_con_flujo_activo ON hiring.procesos;
CREATE TRIGGER tg_proceso_con_flujo_activo
  BEFORE INSERT ON hiring.procesos
  FOR EACH ROW EXECUTE FUNCTION hiring.proceso_con_flujo_activo();

COMMIT;
