-- Cierre administrativo con aceptación observada del mismo intento. Sin SMTP.
BEGIN;
CREATE TABLE IF NOT EXISTS rund.identidad_correo_revision_cierre (
  caso_id uuid PRIMARY KEY REFERENCES rund.identidad_correo_revision(caso_id),
  intencion_id uuid NOT NULL UNIQUE REFERENCES rund.identidad_correo(intencion_id),
  intento_id uuid NOT NULL UNIQUE,
  cerrada_por uuid NOT NULL,
  cerrada_en timestamptz NOT NULL DEFAULT clock_timestamp(),
  motivo text NOT NULL DEFAULT 'ACEPTACION_REGISTRADA' CHECK(motivo='ACEPTACION_REGISTRADA')
);
CREATE OR REPLACE FUNCTION rund.proteger_identidad_correo_revision_cierre()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE vinculada uuid; caso rund.identidad_correo_revision%ROWTYPE;
  aviso rund.identidad_correo%ROWTYPE; resultado rund.identidad_correo_resultado%ROWTYPE;
BEGIN
  IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Cierre de revision de correo RUND inmutable'; END IF;
  SELECT intencion_id INTO vinculada FROM rund.identidad_correo_revision WHERE caso_id=NEW.caso_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cierre de correo RUND requiere caso registrado'; END IF;
  -- Mismo orden de bloqueo que registro, asignación y resultado: aviso antes de caso.
  SELECT * INTO aviso FROM rund.identidad_correo WHERE intencion_id=vinculada FOR UPDATE;
  SELECT * INTO caso FROM rund.identidad_correo_revision WHERE caso_id=NEW.caso_id FOR UPDATE;
  SELECT * INTO resultado FROM rund.identidad_correo_resultado WHERE intencion_id=vinculada;
  IF NEW.intencion_id IS DISTINCT FROM vinculada OR NEW.intento_id IS DISTINCT FROM caso.intento_id
    OR aviso.intento_id IS DISTINCT FROM caso.intento_id OR aviso.estado IS DISTINCT FROM 'ENVIADO'
    OR resultado.intento_id IS DISTINCT FROM caso.intento_id OR resultado.resultado IS DISTINCT FROM 'ACEPTADO'
    OR caso.estado NOT IN ('PENDIENTE','EN_REVISION')
    OR (caso.estado='EN_REVISION' AND NEW.cerrada_por IS DISTINCT FROM caso.asumida_por)
    OR NEW.cerrada_en<caso.creada_en OR NEW.cerrada_en<aviso.resuelta_en OR NEW.cerrada_en<resultado.registrada_en THEN
    RAISE EXCEPTION 'Cierre de correo RUND requiere aceptacion compatible y responsable autorizado';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS proteger_identidad_correo_revision_cierre ON rund.identidad_correo_revision_cierre;
CREATE TRIGGER proteger_identidad_correo_revision_cierre BEFORE INSERT OR UPDATE OR DELETE
ON rund.identidad_correo_revision_cierre FOR EACH ROW EXECUTE FUNCTION rund.proteger_identidad_correo_revision_cierre();
-- Ningún caso se cierra automáticamente o se reconstruye desde estados históricos.
COMMIT;
