-- Decisión explícita de no enviar credenciales históricas rechazadas por Auth.
-- Mantiene PENDIENTE y ausencia de intento; no modifica identidad o resultado SMTP.
BEGIN;
CREATE TABLE IF NOT EXISTS rund.identidad_correo_omision (
  intencion_id uuid PRIMARY KEY REFERENCES rund.identidad_correo(intencion_id),
  version integer NOT NULL DEFAULT 1 CHECK(version=1),
  motivo text NOT NULL CHECK(motivo IN ('OPERACION_NO_ELEGIBLE','IDENTIDAD_NO_VIGENTE','CREDENCIALES_NO_VIGENTES')),
  omitida_por uuid NOT NULL,
  omitida_en timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE OR REPLACE FUNCTION rund.proteger_identidad_correo_omision()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE aviso rund.identidad_correo%ROWTYPE;
BEGIN
  IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Omision de correo RUND inmutable'; END IF;
  SELECT * INTO aviso FROM rund.identidad_correo WHERE intencion_id=NEW.intencion_id FOR UPDATE;
  IF NOT FOUND OR aviso.estado<>'PENDIENTE' OR aviso.intento_id IS NOT NULL
    OR NEW.omitida_en<aviso.creada_en OR NOT rund.correo_bienvenida_elegible(NEW.intencion_id)
    OR EXISTS(SELECT 1 FROM rund.identidad_correo_resultado WHERE intencion_id=NEW.intencion_id) THEN
    RAISE EXCEPTION 'Omision de correo RUND requiere aviso elegible sin intento';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS proteger_identidad_correo_omision ON rund.identidad_correo_omision;
CREATE TRIGGER proteger_identidad_correo_omision BEFORE INSERT OR UPDATE OR DELETE
ON rund.identidad_correo_omision FOR EACH ROW EXECUTE FUNCTION rund.proteger_identidad_correo_omision();

CREATE OR REPLACE FUNCTION rund.impedir_reserva_correo_omitido()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.estado='PENDIENTE' AND NEW.estado='ENVIANDO'
    AND EXISTS(SELECT 1 FROM rund.identidad_correo_omision WHERE intencion_id=OLD.intencion_id) THEN
    RAISE EXCEPTION 'Correo RUND omitido no admite reserva de envio';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS impedir_reserva_correo_omitido ON rund.identidad_correo;
CREATE TRIGGER impedir_reserva_correo_omitido BEFORE UPDATE OF estado ON rund.identidad_correo
FOR EACH ROW EXECUTE FUNCTION rund.impedir_reserva_correo_omitido();
-- Sin backfill, modificación de avisos históricos o rehabilitación automática.
COMMIT;
