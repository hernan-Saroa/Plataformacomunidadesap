-- Decision irreversible previa a cualquier compensacion. Sin SQL de otros propietarios.
CREATE TABLE IF NOT EXISTS rund.identidad_ejecucion (
  intencion_id uuid PRIMARY KEY REFERENCES rund.identidad_contexto_nativo(intencion_id),
  huella_contexto varchar(64) NOT NULL CHECK (huella_contexto ~ '^[a-f0-9]{64}$'),
  decision text NOT NULL DEFAULT 'EN_CURSO',
  preparada_en timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  abortada_en timestamptz,
  motivo_aborto text,
  CHECK (((decision='EN_CURSO' AND abortada_en IS NULL AND motivo_aborto IS NULL)
    OR (decision='ABORTADA' AND abortada_en IS NOT NULL AND motivo_aborto IN ('FALLO_NEGOCIO','CANCELACION_SOLICITUD'))) IS TRUE)
);
CREATE OR REPLACE FUNCTION rund.proteger_identidad_ejecucion()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE contexto rund.identidad_contexto_nativo%ROWTYPE;
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'No se puede borrar la decision de identidad RUND'; END IF;
  IF TG_OP='INSERT' THEN
    SELECT * INTO contexto FROM rund.identidad_contexto_nativo WHERE intencion_id=NEW.intencion_id;
    IF NEW.decision<>'EN_CURSO' OR contexto.huella_contexto IS DISTINCT FROM NEW.huella_contexto THEN
      RAISE EXCEPTION 'Decision inicial de identidad RUND invalida';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.intencion_id IS DISTINCT FROM OLD.intencion_id OR NEW.huella_contexto IS DISTINCT FROM OLD.huella_contexto
    OR NEW.preparada_en IS DISTINCT FROM OLD.preparada_en OR OLD.decision<>'EN_CURSO' OR NEW.decision<>'ABORTADA' THEN
    RAISE EXCEPTION 'Transicion de decision de identidad RUND invalida';
  END IF;
  SELECT * INTO contexto FROM rund.identidad_contexto_nativo WHERE intencion_id=NEW.intencion_id FOR UPDATE;
  IF contexto.estado IS DISTINCT FROM 'PREPARADA' THEN RAISE EXCEPTION 'Un commit nativo confirmado no admite aborto'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS proteger_identidad_ejecucion ON rund.identidad_ejecucion;
CREATE TRIGGER proteger_identidad_ejecucion BEFORE INSERT OR UPDATE OR DELETE ON rund.identidad_ejecucion
FOR EACH ROW EXECUTE FUNCTION rund.proteger_identidad_ejecucion();

-- Tambien protege el marcador nativo si alguien omite el servicio de ejecucion.
-- Trigger independiente: repetir 009 no elimina esta barrera.
CREATE OR REPLACE FUNCTION rund.proteger_confirmacion_sin_aborto()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE ejecucion rund.identidad_ejecucion%ROWTYPE;
BEGIN
  IF NEW.estado='CONFIRMADA' THEN
    SELECT * INTO ejecucion FROM rund.identidad_ejecucion WHERE intencion_id=NEW.intencion_id FOR UPDATE;
    IF ejecucion.decision IS DISTINCT FROM 'EN_CURSO' OR ejecucion.huella_contexto IS DISTINCT FROM NEW.huella_contexto THEN
      RAISE EXCEPTION 'Decision de identidad RUND no permite confirmar el commit nativo';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS proteger_confirmacion_sin_aborto ON rund.identidad_contexto_nativo;
CREATE TRIGGER proteger_confirmacion_sin_aborto BEFORE UPDATE ON rund.identidad_contexto_nativo
FOR EACH ROW EXECUTE FUNCTION rund.proteger_confirmacion_sin_aborto();

-- Contextos anteriores, incluso confirmados, conservan sus datos. Nunca reactiva un aborto.
INSERT INTO rund.identidad_ejecucion (intencion_id,huella_contexto)
SELECT intencion_id,huella_contexto FROM rund.identidad_contexto_nativo
ON CONFLICT (intencion_id) DO NOTHING;
