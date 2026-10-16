-- Vínculo durable de solicitud manual; no autoriza ni publica escrituras Auth.
BEGIN;
CREATE TABLE IF NOT EXISTS rund.identidad_solicitud (
  actor_id uuid NOT NULL,
  solicitud_id uuid NOT NULL,
  intencion_id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  origen text NOT NULL DEFAULT 'CREAR_MODAL' CHECK (origen='CREAR_MODAL'),
  huella_comando varchar(64) NOT NULL CHECK (huella_comando ~ '^[a-f0-9]{64}$'),
  huella_contexto varchar(64) NOT NULL CHECK (huella_contexto ~ '^[a-f0-9]{64}$'),
  creada_en timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (actor_id,solicitud_id)
);
-- La intención se reserva antes de preparar 008–010, por eso aún no puede tener FK.
CREATE OR REPLACE FUNCTION rund.proteger_identidad_solicitud()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Solicitud de identidad RUND inmutable'; END IF;
  IF EXISTS(SELECT 1 FROM rund.identidad_operacion WHERE intencion_id=NEW.intencion_id) THEN
    RAISE EXCEPTION 'Solicitud de identidad RUND no puede adoptar una intencion anterior';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS proteger_identidad_solicitud ON rund.identidad_solicitud;
CREATE TRIGGER proteger_identidad_solicitud BEFORE INSERT OR UPDATE OR DELETE ON rund.identidad_solicitud
FOR EACH ROW EXECUTE FUNCTION rund.proteger_identidad_solicitud();
CREATE OR REPLACE FUNCTION rund.validar_solicitud_identidad()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE solicitud rund.identidad_solicitud%ROWTYPE;
BEGIN
  SELECT * INTO solicitud FROM rund.identidad_solicitud WHERE intencion_id=NEW.intencion_id;
  IF FOUND THEN
    IF TG_TABLE_NAME='identidad_operacion' THEN
      IF NEW.huella_comando IS DISTINCT FROM solicitud.huella_comando THEN
        RAISE EXCEPTION 'Comando ajeno a la solicitud de identidad RUND';
      END IF;
    ELSIF NEW.huella_contexto IS DISTINCT FROM solicitud.huella_contexto
      OR NEW.contexto->'comandoAuth'->>'actorId' IS DISTINCT FROM solicitud.actor_id::text
      OR NEW.contexto->'escritura'->'options'->'audit'->>'canalOrigen' IS DISTINCT FROM 'MODAL'
      OR NEW.contexto->'escritura'->'options'->'audit'->>'accion' IS DISTINCT FROM 'CREAR'
      OR NEW.contexto->'escritura'->'options'->'audit'->>'actorId' IS DISTINCT FROM solicitud.actor_id::text
      OR NEW.contexto->'escritura'->'options'->>'rejectExisting' IS DISTINCT FROM 'true'
      OR NEW.contexto->'escritura'->'options'->>'bulkImport' IS DISTINCT FROM 'false'
      OR NEW.contexto->'escritura'->'options'->>'preserveTerritorial' IS DISTINCT FROM 'false'
      OR NEW.contexto->'escritura'->'options'->>'relaxValidation' IS DISTINCT FROM 'false' THEN
      RAISE EXCEPTION 'Contexto ajeno a la solicitud de identidad RUND';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS validar_solicitud_identidad ON rund.identidad_operacion;
CREATE TRIGGER validar_solicitud_identidad BEFORE INSERT ON rund.identidad_operacion
FOR EACH ROW EXECUTE FUNCTION rund.validar_solicitud_identidad();
DROP TRIGGER IF EXISTS validar_solicitud_identidad ON rund.identidad_contexto_nativo;
CREATE TRIGGER validar_solicitud_identidad BEFORE INSERT ON rund.identidad_contexto_nativo
FOR EACH ROW EXECUTE FUNCTION rund.validar_solicitud_identidad();
COMMIT;
