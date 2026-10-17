-- Casos explícitos de revisión: nunca cancela, confirma o reenvía un correo.
BEGIN;
CREATE TABLE IF NOT EXISTS rund.identidad_correo_revision (
  intencion_id uuid PRIMARY KEY REFERENCES rund.identidad_correo(intencion_id),
  caso_id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  intento_id uuid NOT NULL UNIQUE,
  estado_correo_inicial text NOT NULL CHECK(estado_correo_inicial IN ('ENVIANDO','INCIERTO')),
  registrada_por uuid NOT NULL,
  creada_en timestamptz NOT NULL DEFAULT clock_timestamp(),
  estado text NOT NULL DEFAULT 'PENDIENTE',
  asumida_por uuid,
  asumida_en timestamptz,
  CHECK(((estado='PENDIENTE' AND asumida_por IS NULL AND asumida_en IS NULL)
    OR (estado='EN_REVISION' AND asumida_por IS NOT NULL AND asumida_en>=creada_en)) IS TRUE)
);
CREATE INDEX IF NOT EXISTS identidad_correo_revision_bandeja_idx
  ON rund.identidad_correo_revision(estado,creada_en,caso_id);
CREATE OR REPLACE FUNCTION rund.proteger_identidad_correo_revision()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE aviso rund.identidad_correo%ROWTYPE;
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Caso de revision de correo RUND no se puede borrar'; END IF;
  SELECT * INTO aviso FROM rund.identidad_correo WHERE intencion_id=NEW.intencion_id FOR UPDATE;
  IF TG_OP='INSERT' THEN
    IF NOT FOUND OR aviso.estado NOT IN ('ENVIANDO','INCIERTO')
      OR NEW.intento_id IS DISTINCT FROM aviso.intento_id OR NEW.estado_correo_inicial IS DISTINCT FROM aviso.estado
      OR NEW.creada_en<aviso.iniciada_en OR NEW.estado<>'PENDIENTE' OR NEW.asumida_por IS NOT NULL OR NEW.asumida_en IS NOT NULL
      OR EXISTS(SELECT 1 FROM rund.identidad_correo_resultado WHERE intencion_id=NEW.intencion_id) THEN
      RAISE EXCEPTION 'Revision de correo RUND requiere intento incierto sin resultado observado';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.intencion_id IS DISTINCT FROM OLD.intencion_id OR NEW.caso_id IS DISTINCT FROM OLD.caso_id
    OR NEW.intento_id IS DISTINCT FROM OLD.intento_id OR NEW.estado_correo_inicial IS DISTINCT FROM OLD.estado_correo_inicial
    OR NEW.registrada_por IS DISTINCT FROM OLD.registrada_por OR NEW.creada_en IS DISTINCT FROM OLD.creada_en
    OR OLD.estado<>'PENDIENTE' OR NEW.estado<>'EN_REVISION' OR NEW.asumida_por IS NULL
    OR NEW.asumida_en IS DISTINCT FROM CURRENT_TIMESTAMP OR aviso.estado='ENVIADO' THEN
    RAISE EXCEPTION 'Transicion de revision de correo RUND invalida';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS proteger_identidad_correo_revision ON rund.identidad_correo_revision;
CREATE TRIGGER proteger_identidad_correo_revision BEFORE INSERT OR UPDATE OR DELETE ON rund.identidad_correo_revision
FOR EACH ROW EXECUTE FUNCTION rund.proteger_identidad_correo_revision();
-- No backfill: ENVIANDO puede estar en vuelo. Abrir revisión es una acción explícita.
COMMIT;
