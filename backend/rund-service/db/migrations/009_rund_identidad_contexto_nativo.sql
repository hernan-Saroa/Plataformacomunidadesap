-- Contexto de negocio previo a HTTP y confirmacion atomica del commit nativo.
CREATE TABLE IF NOT EXISTS rund.identidad_contexto_nativo (
  intencion_id uuid PRIMARY KEY REFERENCES rund.identidad_operacion(intencion_id),
  huella_contexto varchar(64) NOT NULL CHECK (huella_contexto ~ '^[a-f0-9]{64}$'),
  contexto jsonb NOT NULL CHECK ((jsonb_typeof(contexto)='object' AND contexto->'version'='1'::jsonb) IS TRUE),
  estado text NOT NULL DEFAULT 'PREPARADA',
  preparada_en timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  confirmada_en timestamptz,
  docente_id text,
  resultado_nativo jsonb,
  CHECK (((estado='PREPARADA' AND confirmada_en IS NULL AND docente_id IS NULL AND resultado_nativo IS NULL)
    OR (estado='CONFIRMADA' AND confirmada_en IS NOT NULL AND docente_id IS NOT NULL
      AND jsonb_typeof(resultado_nativo)='object' AND resultado_nativo->>'docenteId'=docente_id)) IS TRUE)
);
CREATE OR REPLACE FUNCTION rund.proteger_identidad_contexto_nativo()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE recibo jsonb;
BEGIN
  IF TG_OP='INSERT' THEN
    IF NEW.estado<>'PREPARADA' OR NOT EXISTS (SELECT 1 FROM rund.identidad_operacion
      WHERE intencion_id=NEW.intencion_id AND estado='PREPARADA') THEN
      RAISE EXCEPTION 'Contexto nativo RUND debe prepararse antes de publicar la intencion';
    END IF;
    RETURN NEW;
  END IF;
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'No se puede borrar un contexto nativo RUND'; END IF;
  IF NEW.intencion_id IS DISTINCT FROM OLD.intencion_id OR NEW.huella_contexto IS DISTINCT FROM OLD.huella_contexto
    OR NEW.contexto IS DISTINCT FROM OLD.contexto OR NEW.preparada_en IS DISTINCT FROM OLD.preparada_en
    OR OLD.estado<>'PREPARADA' OR NEW.estado<>'CONFIRMADA' THEN
    RAISE EXCEPTION 'Transicion de contexto nativo RUND invalida';
  END IF;
  SELECT recibo_auth INTO recibo FROM rund.identidad_operacion WHERE intencion_id=NEW.intencion_id AND estado='AUTH_APLICADA';
  IF recibo IS NULL OR (NEW.resultado_nativo->>'personaId' IS NOT DISTINCT FROM recibo#>>'{resultado,personaId}') IS NOT TRUE
    OR (NEW.resultado_nativo->>'usuarioId' IS NOT DISTINCT FROM recibo#>>'{resultado,usuarioId}') IS NOT TRUE
    OR NOT EXISTS (SELECT 1 FROM rund."Docente" WHERE id=NEW.docente_id
      AND "personaId"::text=recibo#>>'{resultado,personaId}'
      AND "periodoCarga"=NEW.contexto#>>'{escritura,payload,periodoCarga}') THEN
    RAISE EXCEPTION 'Contexto nativo RUND no confirma el perfil y recibo esperado';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS proteger_identidad_contexto_nativo ON rund.identidad_contexto_nativo;
CREATE TRIGGER proteger_identidad_contexto_nativo BEFORE INSERT OR UPDATE OR DELETE ON rund.identidad_contexto_nativo
FOR EACH ROW EXECUTE FUNCTION rund.proteger_identidad_contexto_nativo();
