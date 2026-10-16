-- Aviso de bienvenida durable del alta manual confirmada. Sin envío o SQL Auth.
BEGIN;
LOCK TABLE rund.identidad_contexto_nativo IN SHARE ROW EXCLUSIVE MODE;

CREATE OR REPLACE FUNCTION rund.correo_bienvenida_elegible(intencion uuid)
RETURNS boolean LANGUAGE sql VOLATILE AS $$
  SELECT EXISTS (
    SELECT 1 FROM rund.identidad_contexto_nativo n
    JOIN rund.identidad_operacion j USING(intencion_id)
    JOIN rund.identidad_solicitud s USING(intencion_id)
    JOIN rund.identidad_ejecucion e USING(intencion_id)
    WHERE n.intencion_id=intencion AND n.estado='CONFIRMADA' AND e.decision='EN_CURSO'
      AND j.estado='AUTH_APLICADA' AND j.recibo_auth->'resultado'->'usuarioCreado'='true'::jsonb
      AND n.resultado_nativo->'authUserCreated'='true'::jsonb
      AND s.entrada_manual->'contexto'=n.contexto AND s.huella_contexto=n.huella_contexto
      AND n.contexto#>>'{comandoAuth,actorId}'=s.actor_id::text
      AND n.contexto#>>'{escritura,options,audit,canalOrigen}'='MODAL'
      AND n.contexto#>>'{escritura,options,audit,accion}'='CREAR'
  );
$$;

CREATE TABLE IF NOT EXISTS rund.identidad_correo (
  intencion_id uuid PRIMARY KEY REFERENCES rund.identidad_contexto_nativo(intencion_id),
  tipo text NOT NULL DEFAULT 'BIENVENIDA_DOCENTE_V1' CHECK(tipo='BIENVENIDA_DOCENTE_V1'),
  estado text NOT NULL DEFAULT 'PENDIENTE',
  creada_en timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  intento_id uuid UNIQUE,
  iniciada_en timestamptz,
  resuelta_en timestamptz,
  CHECK ((
    (estado='PENDIENTE' AND intento_id IS NULL AND iniciada_en IS NULL AND resuelta_en IS NULL)
    OR (estado='ENVIANDO' AND intento_id IS NOT NULL AND iniciada_en IS NOT NULL AND resuelta_en IS NULL)
    OR (estado IN ('ENVIADO','INCIERTO') AND intento_id IS NOT NULL AND iniciada_en IS NOT NULL AND resuelta_en IS NOT NULL)
  ) IS TRUE),
  CHECK (iniciada_en IS NULL OR iniciada_en>=creada_en),
  CHECK (resuelta_en IS NULL OR resuelta_en>=iniciada_en)
);
CREATE INDEX IF NOT EXISTS identidad_correo_pendiente_idx ON rund.identidad_correo(creada_en,intencion_id)
  WHERE estado='PENDIENTE';

CREATE OR REPLACE FUNCTION rund.proteger_identidad_correo()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Correo de identidad RUND no se puede borrar'; END IF;
  IF TG_OP='INSERT' THEN
    IF NEW.estado<>'PENDIENTE' OR NOT rund.correo_bienvenida_elegible(NEW.intencion_id) THEN
      RAISE EXCEPTION 'Correo de identidad RUND exige alta manual confirmada y cuenta nueva';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.intencion_id IS DISTINCT FROM OLD.intencion_id OR NEW.tipo IS DISTINCT FROM OLD.tipo
    OR NEW.creada_en IS DISTINCT FROM OLD.creada_en THEN
    RAISE EXCEPTION 'Identidad del correo RUND inmutable';
  END IF;
  IF OLD.estado='PENDIENTE' AND NEW.estado='ENVIANDO' THEN RETURN NEW; END IF;
  IF OLD.estado='ENVIANDO' AND NEW.estado IN ('ENVIADO','INCIERTO')
    AND NEW.intento_id IS NOT DISTINCT FROM OLD.intento_id AND NEW.iniciada_en IS NOT DISTINCT FROM OLD.iniciada_en THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Transicion de correo RUND invalida; no se permite reenvio automatico';
END $$;
DROP TRIGGER IF EXISTS proteger_identidad_correo ON rund.identidad_correo;
CREATE TRIGGER proteger_identidad_correo BEFORE INSERT OR UPDATE OR DELETE ON rund.identidad_correo
FOR EACH ROW EXECUTE FUNCTION rund.proteger_identidad_correo();

CREATE OR REPLACE FUNCTION rund.encolar_correo_identidad_confirmada()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.estado='CONFIRMADA' AND rund.correo_bienvenida_elegible(NEW.intencion_id) THEN
    INSERT INTO rund.identidad_correo(intencion_id) VALUES(NEW.intencion_id) ON CONFLICT(intencion_id) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS encolar_correo_identidad_confirmada ON rund.identidad_contexto_nativo;
CREATE TRIGGER encolar_correo_identidad_confirmada AFTER UPDATE ON rund.identidad_contexto_nativo
FOR EACH ROW WHEN(OLD.estado='PREPARADA' AND NEW.estado='CONFIRMADA')
EXECUTE FUNCTION rund.encolar_correo_identidad_confirmada();

-- Recupera únicamente hechos confirmados y capturados por este circuito. No infiere
-- destinatarios o cuentas nuevas del escritor anterior, de lotes o de autogestión.
INSERT INTO rund.identidad_correo(intencion_id)
SELECT intencion_id FROM rund.identidad_contexto_nativo WHERE rund.correo_bienvenida_elegible(intencion_id)
ON CONFLICT(intencion_id) DO NOTHING;
COMMIT;
