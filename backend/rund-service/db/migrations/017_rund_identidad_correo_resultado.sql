-- Resultado observado del intento, sin destinatario, mensaje o credenciales.
-- No reconstruye resultados de avisos históricos ni resetea sus estados.
BEGIN;
CREATE TABLE IF NOT EXISTS rund.identidad_correo_resultado (
  intencion_id uuid PRIMARY KEY REFERENCES rund.identidad_correo(intencion_id),
  intento_id uuid NOT NULL UNIQUE,
  resultado text NOT NULL CHECK(resultado IN ('ACEPTADO','INCIERTO')),
  registrada_en timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE OR REPLACE FUNCTION rund.proteger_identidad_correo_resultado()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE aviso rund.identidad_correo%ROWTYPE;
BEGIN
  IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Resultado de correo RUND inmutable'; END IF;
  SELECT * INTO aviso FROM rund.identidad_correo WHERE intencion_id=NEW.intencion_id FOR UPDATE;
  IF NOT FOUND OR aviso.estado<>'ENVIANDO' OR aviso.intento_id IS DISTINCT FROM NEW.intento_id
    OR NEW.registrada_en<aviso.iniciada_en THEN
    RAISE EXCEPTION 'Resultado de correo RUND requiere el mismo intento reservado';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS proteger_identidad_correo_resultado ON rund.identidad_correo_resultado;
CREATE TRIGGER proteger_identidad_correo_resultado BEFORE INSERT OR UPDATE OR DELETE
ON rund.identidad_correo_resultado FOR EACH ROW EXECUTE FUNCTION rund.proteger_identidad_correo_resultado();
COMMIT;
