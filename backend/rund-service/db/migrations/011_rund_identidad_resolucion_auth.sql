-- Resolucion propietaria recibida por HTTP; conserva APLICADA como hecho historico.
BEGIN;
CREATE TABLE IF NOT EXISTS rund.identidad_resolucion_auth (
  intencion_id uuid PRIMARY KEY REFERENCES rund.identidad_ejecucion(intencion_id),
  operacion_auth_id uuid NOT NULL UNIQUE,
  huella_comando varchar(64) NOT NULL CHECK (huella_comando ~ '^[a-f0-9]{64}$'),
  huella_contexto varchar(64) NOT NULL CHECK (huella_contexto ~ '^[a-f0-9]{64}$'),
  estado text NOT NULL CHECK (estado IN ('COMPENSADA','REVISION_REQUERIDA')),
  motivo text,
  recibo_auth jsonb NOT NULL,
  registrada_en timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT identidad_resolucion_auth_recibo_check CHECK ((
    jsonb_typeof(recibo_auth)='object' AND
    recibo_auth ?& ARRAY['version','operacionId','intencionId','huellaComando','estado','motivo','resueltaEn','identidadRevertida'] AND
    recibo_auth - ARRAY['version','operacionId','intencionId','huellaComando','estado','motivo','resueltaEn','identidadRevertida']='{}'::jsonb AND
    recibo_auth->'version'='1'::jsonb AND recibo_auth->>'operacionId'=operacion_auth_id::text AND
    recibo_auth->>'intencionId'=intencion_id::text AND recibo_auth->>'huellaComando'=huella_comando AND
    recibo_auth->>'estado'=estado AND recibo_auth->'identidadRevertida'=to_jsonb(estado='COMPENSADA') AND
    jsonb_typeof(recibo_auth->'resueltaEn')='string' AND recibo_auth->>'resueltaEn' ~ '^\d{4}-\d\d-\d\dT' AND
    ((estado='COMPENSADA' AND motivo IS NULL AND recibo_auth->'motivo'='null'::jsonb) OR
      (estado='REVISION_REQUERIDA' AND motivo IN ('SIN_PREIMAGEN','PREIMAGEN_INCOMPATIBLE','ALTA_IDENTIDAD',
        'CAMBIOS_POSTERIORES','OTRA_OPERACION_POSTERIOR','CORREO_REUTILIZADO') AND recibo_auth->>'motivo'=motivo))
  ) IS TRUE)
);
CREATE OR REPLACE FUNCTION rund.proteger_identidad_resolucion_auth()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE journal rund.identidad_operacion%ROWTYPE;
  contexto rund.identidad_contexto_nativo%ROWTYPE;
  ejecucion rund.identidad_ejecucion%ROWTYPE;
BEGIN
  IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Resolucion Auth RUND inmutable'; END IF;
  SELECT * INTO journal FROM rund.identidad_operacion WHERE intencion_id=NEW.intencion_id FOR UPDATE;
  SELECT * INTO contexto FROM rund.identidad_contexto_nativo WHERE intencion_id=NEW.intencion_id FOR UPDATE;
  SELECT * INTO ejecucion FROM rund.identidad_ejecucion WHERE intencion_id=NEW.intencion_id FOR UPDATE;
  IF journal.estado IS DISTINCT FROM 'AUTH_APLICADA' OR journal.operacion_auth_id IS DISTINCT FROM NEW.operacion_auth_id
    OR journal.huella_comando IS DISTINCT FROM NEW.huella_comando OR contexto.estado IS DISTINCT FROM 'PREPARADA'
    OR contexto.huella_contexto IS DISTINCT FROM NEW.huella_contexto OR ejecucion.decision IS DISTINCT FROM 'ABORTADA'
    OR ejecucion.huella_contexto IS DISTINCT FROM NEW.huella_contexto THEN
    RAISE EXCEPTION 'Resolucion Auth RUND requiere aborto sin commit e identidad aplicada coincidente';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS proteger_identidad_resolucion_auth ON rund.identidad_resolucion_auth;
CREATE TRIGGER proteger_identidad_resolucion_auth BEFORE INSERT OR UPDATE OR DELETE ON rund.identidad_resolucion_auth
  FOR EACH ROW EXECUTE FUNCTION rund.proteger_identidad_resolucion_auth();
COMMIT;
