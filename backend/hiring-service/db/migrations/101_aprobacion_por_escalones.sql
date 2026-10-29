-- ============================================================================
-- 101 · La aprobación de una actividad puede pasar por varios escalones
--
-- Hasta aquí una actividad tenía un solo nivel de aprobación: la regla
-- `EXIGE_APROBACION` (061) nombraba roles y personas, decidía cualquiera de
-- ellos y la actividad quedaba cerrada. La Dirección necesita cadenas —el
-- técnico revisa, luego el coordinador, luego el director— y que una
-- aprobación intermedia no se tome por la definitiva.
--
-- Cuatro piezas:
--
--   · cadenas_aprobacion     · la plantilla: un nombre y sus escalones, en
--                              orden. Se configura una vez y se asocia a las
--                              actividades que la usen.
--   · aprobaciones           · una por envío (una «ronda»): la copia congelada
--                              de la cadena con la que se envió, y en qué va.
--   · aprobacion_escalones   · el estado de cada escalón dentro de la ronda.
--   · revisiones (se amplía) · cada decisión dice ahora en qué ronda y en qué
--                              escalón se tomó, y desde qué estado a cuál.
--
-- Decisiones de Juan (2026-10-14):
--
--   · Solo corrige quien envió la actividad: es quien subió los documentos.
--     Toda devolución, la haga el escalón que la haga, cierra la ronda y
--     regresa a él; al reenviarla se abre una ronda nueva desde el escalón 1.
--   · Una misma persona no aprueba dos escalones de la misma ronda, salvo que
--     la plantilla lo permita: si no, un director con todos los roles
--     convertiría la cadena en un solo paso.
--   · Qué puede hacer cada escalón —aprobar, devolver, negar— se configura
--     escalón por escalón. Aprobar es obligatorio: un escalón que no puede
--     aprobar dejaría la cadena sin salida.
--
-- Lo que no cambia: `proceso_actividades.estado` conserva sus valores. La
-- actividad sigue en EN_REVISION mientras quede un escalón por decidir, y los
-- veintitantos servicios que leen ese estado no se enteran del cambio.
--
-- Compatibilidad: la regla con `{roles, personas}` sigue valiendo, leída como
-- una cadena de un solo escalón. Una regla con cadena lleva `{cadenaId}`.
-- Ninguna regla ni revisión existente se reescribe.
--
-- Cambiar una plantilla no toca las rondas en curso: cada una trabaja sobre la
-- copia que se guardó al enviarla. Por eso la plantilla se puede editar en su
-- sitio sin versionarla: la historia de qué cadena se aplicó vive en la ronda.
-- ============================================================================

-- ------------------------------------------------------------ la plantilla --
CREATE TABLE IF NOT EXISTS hiring.cadenas_aprobacion (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre                   varchar(160) NOT NULL,
  descripcion              text,
  /*
   * Los escalones, en orden. Van en la misma fila y no en una tabla aparte
   * porque la plantilla siempre se lee entera —para mostrarla y para copiarla
   * a una ronda— y nunca se consulta escalón por escalón:
   *
   *   [{ "nombre": "Coordinador",
   *      "roles": ["COORDINADOR_GRUPO"], "personas": ["<id_person>"],
   *      "papeles": ["ABOGADO"],
   *      "reglaDecision": "UNO" | "TODOS",
   *      "acciones": ["APROBAR", "DEVOLVER", "NEGAR"] }, ...]
   *
   * La forma la valida el servicio, que es quien la escribe.
   */
  escalones                jsonb NOT NULL,
  permite_mismo_aprobador  boolean NOT NULL DEFAULT false,
  -- Archivar y no borrar: una ronda vieja apunta a la plantilla de la que salió.
  activa                   boolean NOT NULL DEFAULT true,
  created_by               varchar(200),
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_by               varchar(200),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_cadena_con_escalones CHECK (
    jsonb_typeof(escalones) = 'array' AND jsonb_array_length(escalones) > 0
  )
);

COMMENT ON TABLE hiring.cadenas_aprobacion IS
  'Plantillas de aprobación por escalones. Se asocian a una actividad desde la regla EXIGE_APROBACION con {cadenaId}.';

-- --------------------------------------------------------------- la ronda --
CREATE TABLE IF NOT EXISTS hiring.aprobaciones (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proceso_actividad_id    uuid NOT NULL REFERENCES hiring.proceso_actividades(id) ON DELETE CASCADE,
  -- 1, 2, 3… por actividad: cada reenvío tras una devolución abre la siguiente.
  ronda                   int NOT NULL,
  -- NULL cuando la regla era de un solo aprobador y no salió de una plantilla.
  cadena_id               uuid REFERENCES hiring.cadenas_aprobacion(id),
  -- La cadena tal como regía al enviar: nombre, si permite el mismo aprobador.
  cadena_nombre           varchar(160),
  permite_mismo_aprobador boolean NOT NULL DEFAULT false,
  estado                  varchar(12) NOT NULL DEFAULT 'EN_CURSO',
  escalon_actual          int,
  version_enviada         int NOT NULL,
  -- LEGADA: estaba en revisión cuando se aplicó esta migración.
  origen                  varchar(10) NOT NULL DEFAULT 'ENVIO',
  iniciada_por            varchar(200),
  iniciada_por_id         varchar(120),
  iniciada_at             timestamptz NOT NULL DEFAULT now(),
  cerrada_at              timestamptz,
  CONSTRAINT uq_aprobacion_ronda UNIQUE (proceso_actividad_id, ronda),
  CONSTRAINT ck_aprobacion_estado CHECK (estado IN (
    'EN_CURSO',   -- algún escalón está por decidir
    'APROBADA',   -- decidió el último escalón: la actividad quedó aprobada
    'DEVUELTA',   -- un escalón la devolvió a quien la envió
    'NEGADA',     -- un escalón con permiso de negar la negó
    'RETIRADA',   -- quien la envió la retiró antes de que se resolviera
    'CANCELADA'   -- el proceso la reabrió por otro camino (comité, PAA…)
  )),
  CONSTRAINT ck_aprobacion_origen CHECK (origen IN ('ENVIO', 'LEGADA'))
);

-- Una sola ronda abierta por actividad: dos a la vez serían dos cadenas
-- peleándose por el mismo estado.
CREATE UNIQUE INDEX IF NOT EXISTS uq_aprobacion_en_curso
  ON hiring.aprobaciones (proceso_actividad_id) WHERE estado = 'EN_CURSO';

COMMENT ON TABLE hiring.aprobaciones IS
  'Una ronda de aprobación por envío, con la copia de la cadena que regía al enviar.';

-- -------------------------------------------------- los escalones de la ronda --
CREATE TABLE IF NOT EXISTS hiring.aprobacion_escalones (
  aprobacion_id   uuid NOT NULL REFERENCES hiring.aprobaciones(id) ON DELETE CASCADE,
  orden           int NOT NULL CHECK (orden >= 1),
  nombre          varchar(120) NOT NULL,
  roles           text[] NOT NULL DEFAULT '{}',
  -- `id_person` del directorio, como guarda el buscador de Configuración.
  personas        text[] NOT NULL DEFAULT '{}',
  papeles         text[] NOT NULL DEFAULT '{}',
  regla_decision  varchar(6) NOT NULL DEFAULT 'UNO',
  acciones        text[] NOT NULL DEFAULT '{APROBAR,DEVOLVER}',
  estado          varchar(10) NOT NULL DEFAULT 'BLOQUEADO',
  activado_at     timestamptz,
  resuelto_at     timestamptz,
  PRIMARY KEY (aprobacion_id, orden),
  CONSTRAINT ck_escalon_regla CHECK (regla_decision IN ('UNO', 'TODOS')),
  CONSTRAINT ck_escalon_acciones CHECK (
    acciones <@ ARRAY['APROBAR', 'DEVOLVER', 'NEGAR']::text[]
    AND 'APROBAR' = ANY (acciones)
  ),
  CONSTRAINT ck_escalon_papeles CHECK (
    papeles <@ ARRAY['ABOGADO', 'CONTRATACION', 'FINANCIERA', 'SUPERVISOR']::text[]
  ),
  CONSTRAINT ck_escalon_estado CHECK (estado IN (
    'BLOQUEADO',  -- aún no le toca
    'PENDIENTE',  -- le toca decidir
    'APROBADO',
    'DEVUELTO',
    'NEGADO',
    'ANULADO'     -- la ronda se cerró antes de que le tocara
  ))
);

-- La bandeja busca los escalones que esperan decisión.
CREATE INDEX IF NOT EXISTS ix_aprobacion_escalones_pendientes
  ON hiring.aprobacion_escalones (aprobacion_id) WHERE estado = 'PENDIENTE';

-- ------------------------------------------------- las decisiones, ampliadas --
ALTER TABLE hiring.revisiones
  ADD COLUMN IF NOT EXISTS aprobacion_id uuid REFERENCES hiring.aprobaciones(id),
  ADD COLUMN IF NOT EXISTS escalon int,
  -- Para la regla TODOS y para impedir aprobar dos escalones: la persona, no
  -- la cuenta, porque así se designa en la configuración.
  ADD COLUMN IF NOT EXISTS persona_id uuid,
  ADD COLUMN IF NOT EXISTS estado_anterior varchar(30),
  ADD COLUMN IF NOT EXISTS estado_resultante varchar(30);

COMMENT ON COLUMN hiring.revisiones.aprobacion_id IS
  'La ronda en que se decidió. NULL en las decisiones anteriores a la 101: un solo escalón.';

CREATE INDEX IF NOT EXISTS ix_revisiones_aprobacion
  ON hiring.revisiones (aprobacion_id, escalon) WHERE aprobacion_id IS NOT NULL;

/*
 * Una decisión registrada no se corrige ni se borra.
 *
 * Una revisión nueva es una fila nueva; cambiar una vieja reescribiría quién
 * decidió qué. Se deja pasar el borrado en cascada —cuando se elimina el
 * proceso entero, que es la única forma de que desaparezca su historia—, que
 * Postgres ejecuta desde otro disparador y por eso llega con profundidad > 1.
 *
 * La otra excepción es sumar soportes a una devolución (091, 093): quien
 * devolvió adjunta sus correcciones después de devolver, y se acumulan en la
 * misma fila. Se admite solo añadir —todo lo demás igual y ningún soporte
 * quitado—, que no cambia lo que se decidió.
 */
CREATE OR REPLACE FUNCTION hiring.revisiones_inalterables() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' AND pg_trigger_depth() > 1 THEN
    RETURN OLD;
  END IF;
  IF TG_OP = 'UPDATE'
     AND (to_jsonb(NEW) - 'soportes_documento_ids') = (to_jsonb(OLD) - 'soportes_documento_ids')
     AND OLD.soportes_documento_ids <@ NEW.soportes_documento_ids THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Las decisiones de una revisión no se modifican ni se borran: registra una nueva';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tg_revisiones_inalterables ON hiring.revisiones;
CREATE TRIGGER tg_revisiones_inalterables
  BEFORE UPDATE OR DELETE ON hiring.revisiones
  FOR EACH ROW EXECUTE FUNCTION hiring.revisiones_inalterables();

-- ------------------------------------- lo que estaba en revisión al aplicarla --
--
-- Una actividad en EN_REVISION sin ronda no aparecería en la bandeja, que desde
-- ahora busca escalones pendientes. Se le crea una ronda de un escalón con la
-- regla que rige hoy, marcada LEGADA, con la fecha en que se envió. Lo aprobado
-- o devuelto no se toca: su historia queda en `revisiones` como siempre.
--
-- La 3.1 no entra: la decide el abogado asignado en la 3.3, no la regla.
WITH pendientes AS (
  SELECT DISTINCT ON (pa.id)
         pa.id, pa.version, pa.enviado_por, pa.enviado_por_id,
         COALESCE(pa.enviado_at, pa.updated_at) AS desde,
         r.config
    FROM hiring.proceso_actividades pa
    JOIN hiring.procesos p ON p.id = pa.proceso_id
    JOIN hiring.reglas_actividad r
      ON r.numeral = pa.numeral
     AND r.tipo = 'EXIGE_APROBACION'
     AND r.vigente_hasta IS NULL
     AND (r.modalidad IS NULL OR r.modalidad = p.modalidad)
   WHERE pa.estado = 'EN_REVISION'
     AND pa.numeral <> '3.1'
     AND NOT EXISTS (
       SELECT 1 FROM hiring.aprobaciones a
        WHERE a.proceso_actividad_id = pa.id AND a.estado = 'EN_CURSO'
     )
   -- La regla de la modalidad manda sobre la general, como al aprobar.
   ORDER BY pa.id, (r.modalidad IS NULL)
), rondas AS (
  INSERT INTO hiring.aprobaciones
    (proceso_actividad_id, ronda, cadena_nombre, estado, escalon_actual,
     version_enviada, origen, iniciada_por, iniciada_por_id, iniciada_at)
  SELECT id,
         1 + (SELECT count(*) FROM hiring.aprobaciones a WHERE a.proceso_actividad_id = pendientes.id),
         'Aprobación', 'EN_CURSO', 1, version, 'LEGADA', enviado_por, enviado_por_id, desde
    FROM pendientes
  RETURNING id, proceso_actividad_id, iniciada_at
)
INSERT INTO hiring.aprobacion_escalones
  (aprobacion_id, orden, nombre, roles, personas, estado, activado_at)
SELECT rondas.id, 1, 'Aprobación',
       ARRAY(SELECT jsonb_array_elements_text(COALESCE(p.config -> 'roles', '[]'::jsonb))),
       ARRAY(SELECT jsonb_array_elements_text(COALESCE(p.config -> 'personas', '[]'::jsonb))),
       'PENDIENTE', rondas.iniciada_at
  FROM rondas
  JOIN pendientes p ON p.id = rondas.proceso_actividad_id;
