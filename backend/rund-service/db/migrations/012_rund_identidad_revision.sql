-- Bandeja propia de revision. Asignar un responsable no compensa ni cierra el pendiente.
BEGIN;
CREATE TABLE IF NOT EXISTS rund.identidad_revision (
  intencion_id uuid PRIMARY KEY REFERENCES rund.identidad_resolucion_auth(intencion_id),
  caso_id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  estado text NOT NULL DEFAULT 'PENDIENTE',
  creada_en timestamptz NOT NULL,
  asumida_por uuid,
  asumida_en timestamptz,
  CONSTRAINT identidad_revision_estado_check CHECK (((estado='PENDIENTE' AND asumida_por IS NULL AND asumida_en IS NULL)
    OR (estado='EN_REVISION' AND asumida_por IS NOT NULL AND asumida_en IS NOT NULL)) IS TRUE)
);
CREATE INDEX IF NOT EXISTS identidad_revision_bandeja_idx ON rund.identidad_revision(estado,creada_en,caso_id);
CREATE OR REPLACE FUNCTION rund.proteger_identidad_revision()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE resolucion rund.identidad_resolucion_auth%ROWTYPE;
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'No se puede borrar un caso de revision de identidad RUND'; END IF;
  IF TG_OP='INSERT' THEN
    SELECT * INTO resolucion FROM rund.identidad_resolucion_auth WHERE intencion_id=NEW.intencion_id;
    IF resolucion.estado IS DISTINCT FROM 'REVISION_REQUERIDA' OR NEW.estado IS DISTINCT FROM 'PENDIENTE'
      OR NEW.creada_en IS DISTINCT FROM resolucion.registrada_en OR NEW.asumida_por IS NOT NULL OR NEW.asumida_en IS NOT NULL THEN
      RAISE EXCEPTION 'Caso de revision RUND requiere resolucion pendiente coincidente';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.intencion_id IS DISTINCT FROM OLD.intencion_id OR NEW.caso_id IS DISTINCT FROM OLD.caso_id
    OR NEW.creada_en IS DISTINCT FROM OLD.creada_en OR OLD.estado<>'PENDIENTE' OR NEW.estado<>'EN_REVISION'
    OR NEW.asumida_por IS NULL OR NEW.asumida_en IS DISTINCT FROM CURRENT_TIMESTAMP THEN
    RAISE EXCEPTION 'Transicion de caso de revision RUND invalida';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS proteger_identidad_revision ON rund.identidad_revision;
CREATE TRIGGER proteger_identidad_revision BEFORE INSERT OR UPDATE OR DELETE ON rund.identidad_revision
  FOR EACH ROW EXECUTE FUNCTION rund.proteger_identidad_revision();
CREATE OR REPLACE FUNCTION rund.registrar_revision_identidad()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.estado='REVISION_REQUERIDA' THEN
    INSERT INTO rund.identidad_revision (intencion_id,creada_en) VALUES (NEW.intencion_id,NEW.registrada_en)
      ON CONFLICT (intencion_id) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS registrar_revision_identidad ON rund.identidad_resolucion_auth;
CREATE TRIGGER registrar_revision_identidad AFTER INSERT ON rund.identidad_resolucion_auth
  FOR EACH ROW EXECUTE FUNCTION rund.registrar_revision_identidad();
-- Las revisiones anteriores reciben caso una sola vez; repetir nunca desasigna responsables.
INSERT INTO rund.identidad_revision (intencion_id,creada_en)
SELECT intencion_id,registrada_en FROM rund.identidad_resolucion_auth WHERE estado='REVISION_REQUERIDA'
ON CONFLICT (intencion_id) DO NOTHING;
COMMIT;
