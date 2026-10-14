-- Revisión del estado completo por persona. Sin FK: conserva la baja de una persona.
-- Requiere 158, 309 y 339. No copia documentos ni modifica estados existentes.
CREATE TABLE IF NOT EXISTS auth.carpeta_revision_rund (
  persona_id uuid PRIMARY KEY,
  revision bigint NOT NULL CHECK (revision > 0)
);

CREATE OR REPLACE FUNCTION auth.marcar_carpeta_revision_rund(persona uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF persona IS NOT NULL THEN
    INSERT INTO auth.carpeta_revision_rund VALUES (persona, 1)
    ON CONFLICT (persona_id) DO UPDATE SET revision = auth.carpeta_revision_rund.revision + 1;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION auth.documento_revision_rund()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE anterior uuid; actual uuid; persona uuid;
BEGIN
  -- updated_at forma parte de revision_documento: incluso su cambio debe avanzar el contador.
  IF TG_OP = 'UPDATE' AND to_jsonb(OLD) = to_jsonb(NEW) THEN
    RETURN NULL;
  END IF;
  IF TG_OP <> 'INSERT' THEN
    SELECT persona_id INTO anterior FROM auth.carpeta_digital WHERE id_carpeta_digital = OLD.carpeta_digital_id;
  END IF;
  IF TG_OP <> 'DELETE' THEN
    SELECT persona_id INTO actual FROM auth.carpeta_digital WHERE id_carpeta_digital = NEW.carpeta_digital_id;
  END IF;
  -- Orden estable al mover documentos entre personas.
  FOR persona IN SELECT DISTINCT id FROM unnest(ARRAY[anterior, actual]) AS t(id) WHERE id IS NOT NULL ORDER BY id LOOP
    PERFORM auth.marcar_carpeta_revision_rund(persona);
  END LOOP;
  RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION auth.contenedor_revision_rund()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME = 'personas' THEN
    IF TG_OP = 'INSERT' THEN
      PERFORM auth.marcar_carpeta_revision_rund(NEW.id_person);
      RETURN NEW;
    END IF;
    PERFORM auth.marcar_carpeta_revision_rund(OLD.id_person);
  ELSE
    -- BEFORE DELETE conserva el dueño antes de que la cascada borre los documentos.
    IF TG_OP = 'UPDATE' THEN
      IF OLD.persona_id = NEW.persona_id THEN RETURN NEW; END IF;
      IF OLD.persona_id < NEW.persona_id THEN
        PERFORM auth.marcar_carpeta_revision_rund(OLD.persona_id);
        PERFORM auth.marcar_carpeta_revision_rund(NEW.persona_id);
      ELSE
        PERFORM auth.marcar_carpeta_revision_rund(NEW.persona_id);
        PERFORM auth.marcar_carpeta_revision_rund(OLD.persona_id);
      END IF;
      RETURN NEW;
    END IF;
    PERFORM auth.marcar_carpeta_revision_rund(OLD.persona_id);
  END IF;
  RETURN OLD;
END $$;

DROP TRIGGER IF EXISTS documento_revision_rund ON auth.documento_carpeta_digital;
CREATE TRIGGER documento_revision_rund AFTER INSERT OR UPDATE OR DELETE ON auth.documento_carpeta_digital
FOR EACH ROW EXECUTE FUNCTION auth.documento_revision_rund();
DROP TRIGGER IF EXISTS carpeta_revision_rund ON auth.carpeta_digital;
CREATE TRIGGER carpeta_revision_rund BEFORE UPDATE OF persona_id OR DELETE ON auth.carpeta_digital
FOR EACH ROW EXECUTE FUNCTION auth.contenedor_revision_rund();
DROP TRIGGER IF EXISTS persona_revision_rund ON auth.personas;
CREATE TRIGGER persona_revision_rund BEFORE INSERT OR DELETE ON auth.personas
FOR EACH ROW EXECUTE FUNCTION auth.contenedor_revision_rund();
