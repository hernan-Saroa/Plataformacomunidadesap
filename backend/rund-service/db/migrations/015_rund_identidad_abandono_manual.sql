-- Abandono previo a reservar una operación Auth. No borra capturas o journals.
BEGIN;
CREATE TABLE IF NOT EXISTS rund.identidad_abandono_manual (
  actor_id uuid NOT NULL,
  solicitud_id uuid NOT NULL,
  abandonada_en timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(actor_id,solicitud_id)
);
-- Sin FK: también cierra IDs cuyo formulario nunca llegó al servidor.
CREATE OR REPLACE FUNCTION rund.proteger_abandono_manual()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE intencion uuid;
BEGIN
  IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Abandono manual RUND inmutable'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.actor_id::text||':'||NEW.solicitud_id::text,7600));
  SELECT intencion_id INTO intencion FROM rund.identidad_solicitud
    WHERE actor_id=NEW.actor_id AND solicitud_id=NEW.solicitud_id;
  IF intencion IS NOT NULL AND EXISTS(SELECT 1 FROM rund.identidad_operacion WHERE intencion_id=intencion) THEN
    RAISE EXCEPTION USING ERRCODE='P7601',MESSAGE='La solicitud ya tiene una operacion de identidad; requiere recuperacion';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS proteger_abandono_manual ON rund.identidad_abandono_manual;
CREATE TRIGGER proteger_abandono_manual BEFORE INSERT OR UPDATE OR DELETE ON rund.identidad_abandono_manual
FOR EACH ROW EXECUTE FUNCTION rund.proteger_abandono_manual();

CREATE OR REPLACE FUNCTION rund.impedir_captura_abandonada()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.actor_id::text||':'||NEW.solicitud_id::text,7600));
  IF EXISTS(SELECT 1 FROM rund.identidad_abandono_manual WHERE actor_id=NEW.actor_id AND solicitud_id=NEW.solicitud_id) THEN
    RAISE EXCEPTION USING ERRCODE='P7602',MESSAGE='Solicitud manual RUND abandonada';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS impedir_captura_abandonada ON rund.identidad_solicitud;
CREATE TRIGGER impedir_captura_abandonada BEFORE INSERT ON rund.identidad_solicitud
FOR EACH ROW EXECUTE FUNCTION rund.impedir_captura_abandonada();

-- Serializa la primera reserva del journal con el abandono. No toma este bloqueo
-- en actualizaciones/commit nativo: no invierte los bloqueos journal/contexto/ejecución.
CREATE OR REPLACE FUNCTION rund.impedir_operacion_abandonada()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE solicitud rund.identidad_solicitud%ROWTYPE;
BEGIN
  SELECT * INTO solicitud FROM rund.identidad_solicitud WHERE intencion_id=NEW.intencion_id;
  IF FOUND THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(solicitud.actor_id::text||':'||solicitud.solicitud_id::text,7600));
    IF EXISTS(SELECT 1 FROM rund.identidad_abandono_manual WHERE actor_id=solicitud.actor_id AND solicitud_id=solicitud.solicitud_id) THEN
      RAISE EXCEPTION USING ERRCODE='P7602',MESSAGE='Solicitud manual RUND abandonada';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS impedir_operacion_abandonada ON rund.identidad_operacion;
CREATE TRIGGER impedir_operacion_abandonada BEFORE INSERT ON rund.identidad_operacion
FOR EACH ROW EXECUTE FUNCTION rund.impedir_operacion_abandonada();
COMMIT;
