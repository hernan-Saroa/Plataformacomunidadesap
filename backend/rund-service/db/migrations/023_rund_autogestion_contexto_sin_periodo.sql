-- Mantener el contrato de autogestión parcial al usar el coordinador propietario.
-- Sin período, el escritor histórico busca un perfil de la misma persona o crea
-- uno sin período. Solo AUTOGESTION con relaxValidation permite ese contexto.
-- Los demás canales siguen exigiendo coincidencia exacta de período y todos
-- conservan las comprobaciones de persona, usuario, recibo e inmutabilidad.
-- No modifica filas, datos de otros propietarios ni los estados ya confirmados.
BEGIN;
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
      AND ("periodoCarga"=NEW.contexto#>>'{escritura,payload,periodoCarga}'
        OR (NEW.contexto#>'{escritura,payload,periodoCarga}'='null'::jsonb
          AND NEW.contexto#>'{escritura,options,relaxValidation}'='true'::jsonb
          AND NEW.contexto#>>'{escritura,options,audit,canalOrigen}'='AUTOGESTION'))) THEN
    RAISE EXCEPTION 'Contexto nativo RUND no confirma el perfil y recibo esperado';
  END IF;
  RETURN NEW;
END $$;
COMMIT;
