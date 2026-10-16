-- Intenciones de identidad del propietario RUND. Sin FK o consultas a otros schemas.
-- No aplica identidades, no confirma perfiles ni activa un consumidor.
CREATE TABLE IF NOT EXISTS rund.identidad_operacion (
  intencion_id uuid PRIMARY KEY,
  operacion_auth_id uuid NOT NULL UNIQUE,
  version integer NOT NULL CHECK (version=1),
  huella_comando varchar(64) NOT NULL CHECK (huella_comando ~ '^[a-f0-9]{64}$'),
  estado text NOT NULL DEFAULT 'PREPARADA',
  preparada_en timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  recibo_auth jsonb,
  CONSTRAINT identidad_operacion_recibo_check CHECK ((
    (estado='PREPARADA' AND recibo_auth IS NULL) OR
    (jsonb_typeof(recibo_auth)='object'
      AND recibo_auth->>'operacionId'=operacion_auth_id::text
      AND recibo_auth->'version'='1'::jsonb
      AND recibo_auth->>'huellaComando'=huella_comando
      AND ((estado='AUTH_REGISTRADA' AND recibo_auth->>'estado'='REGISTRADA' AND recibo_auth->'identidadAplicada'='false'::jsonb)
        OR (estado='AUTH_APLICADA' AND recibo_auth->>'estado'='APLICADA' AND recibo_auth->'identidadAplicada'='true'::jsonb
          AND jsonb_typeof(recibo_auth->'resultado')='object' AND recibo_auth->>'aplicadaEn' IS NOT NULL)
        OR (estado='CANCELADA' AND recibo_auth->>'estado'='CANCELADA' AND recibo_auth->'identidadAplicada'='false'::jsonb
          AND recibo_auth->>'canceladaEn' IS NOT NULL)))
  ) IS TRUE)
);
CREATE INDEX IF NOT EXISTS identidad_operacion_pendiente_idx ON rund.identidad_operacion(preparada_en,intencion_id)
  WHERE estado IN ('PREPARADA','AUTH_REGISTRADA');

CREATE OR REPLACE FUNCTION rund.proteger_identidad_operacion()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'No se puede borrar una intencion de identidad RUND'; END IF;
  IF NEW.intencion_id IS DISTINCT FROM OLD.intencion_id OR NEW.operacion_auth_id IS DISTINCT FROM OLD.operacion_auth_id
    OR NEW.version IS DISTINCT FROM OLD.version OR NEW.huella_comando IS DISTINCT FROM OLD.huella_comando
    OR NEW.preparada_en IS DISTINCT FROM OLD.preparada_en
    OR NOT ((OLD.estado='PREPARADA' AND NEW.estado IN ('AUTH_REGISTRADA','AUTH_APLICADA','CANCELADA'))
      OR (OLD.estado='AUTH_REGISTRADA' AND NEW.estado IN ('AUTH_APLICADA','CANCELADA'))) THEN
    RAISE EXCEPTION 'Transicion de intencion de identidad RUND invalida';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS proteger_identidad_operacion ON rund.identidad_operacion;
CREATE TRIGGER proteger_identidad_operacion BEFORE UPDATE OR DELETE ON rund.identidad_operacion
FOR EACH ROW EXECUTE FUNCTION rund.proteger_identidad_operacion();
