-- Registro privado de efectos y resolucion propietaria. No altera el recibo historico 669/670.
BEGIN;
CREATE TABLE IF NOT EXISTS auth.rund_identidad_efecto (
  operacion_id uuid PRIMARY KEY REFERENCES auth.rund_identidad_operacion(operacion_id),
  orden bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  version integer NOT NULL DEFAULT 1 CHECK (version=1),
  huella_comando text NOT NULL CHECK (huella_comando ~ '^[a-f0-9]{64}$'),
  persona_id uuid NOT NULL,
  usuario_id uuid NOT NULL,
  preimagen jsonb NOT NULL CHECK (jsonb_typeof(preimagen)='object'),
  postimagen jsonb NOT NULL CHECK (jsonb_typeof(postimagen)='object'),
  capturada_en timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS auth.rund_identidad_compensacion (
  operacion_id uuid PRIMARY KEY REFERENCES auth.rund_identidad_operacion(operacion_id),
  version integer NOT NULL DEFAULT 1 CHECK (version=1),
  intencion_id uuid NOT NULL,
  huella_comando text NOT NULL CHECK (huella_comando ~ '^[a-f0-9]{64}$'),
  estado text NOT NULL CHECK (estado IN ('COMPENSADA','REVISION_REQUERIDA')),
  motivo text,
  prueba_aborto jsonb NOT NULL,
  resuelta_en timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT rund_identidad_compensacion_motivo_check CHECK ((
    (estado='COMPENSADA' AND motivo IS NULL) OR
    (estado='REVISION_REQUERIDA' AND motivo IN ('SIN_PREIMAGEN','PREIMAGEN_INCOMPATIBLE',
      'ALTA_IDENTIDAD','CAMBIOS_POSTERIORES','OTRA_OPERACION_POSTERIOR','CORREO_REUTILIZADO'))
  ) IS TRUE),
  CONSTRAINT rund_identidad_compensacion_aborto_check CHECK ((
    jsonb_typeof(prueba_aborto)='object' AND
    prueba_aborto ?& ARRAY['version','intencionId','operacionAuthId','huellaComando','huellaContexto',
      'decisionNativa','estadoNativo','abortadaEn','motivoAborto'] AND
    prueba_aborto->>'version'='1' AND prueba_aborto->>'intencionId'=intencion_id::text AND
    prueba_aborto->>'operacionAuthId'=operacion_id::text AND prueba_aborto->>'huellaComando'=huella_comando AND
    prueba_aborto->>'huellaContexto' ~ '^[a-f0-9]{64}$' AND prueba_aborto->>'decisionNativa'='ABORTADA' AND
    prueba_aborto->>'estadoNativo'='PREPARADA' AND
    prueba_aborto->>'motivoAborto' IN ('FALLO_NEGOCIO','CANCELACION_SOLICITUD') AND
    length(prueba_aborto->>'abortadaEn')>0
  ) IS TRUE)
);
CREATE INDEX IF NOT EXISTS rund_identidad_efecto_persona_orden_idx ON auth.rund_identidad_efecto(persona_id,orden);
CREATE OR REPLACE FUNCTION auth.proteger_rund_identidad_resolucion()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE op auth.rund_identidad_operacion%ROWTYPE;
BEGIN
  IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Registro privado de efectos/resolucion RUND inmutable'; END IF;
  SELECT * INTO op FROM auth.rund_identidad_operacion WHERE operacion_id=NEW.operacion_id FOR UPDATE;
  IF op.estado IS DISTINCT FROM 'APLICADA' OR op.huella_comando IS DISTINCT FROM NEW.huella_comando THEN
    RAISE EXCEPTION 'Efectos/resolucion RUND requieren recibo aplicado coincidente';
  END IF;
  IF TG_TABLE_NAME='rund_identidad_efecto' AND
    (op.resultado->>'personaId' IS DISTINCT FROM to_jsonb(NEW)->>'persona_id' OR
     op.resultado->>'usuarioId' IS DISTINCT FROM to_jsonb(NEW)->>'usuario_id') THEN
    RAISE EXCEPTION 'Efectos RUND no corresponden a la identidad aplicada';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS rund_identidad_efecto_inmutable ON auth.rund_identidad_efecto;
CREATE TRIGGER rund_identidad_efecto_inmutable BEFORE INSERT OR UPDATE OR DELETE ON auth.rund_identidad_efecto
  FOR EACH ROW EXECUTE FUNCTION auth.proteger_rund_identidad_resolucion();
DROP TRIGGER IF EXISTS rund_identidad_compensacion_inmutable ON auth.rund_identidad_compensacion;
CREATE TRIGGER rund_identidad_compensacion_inmutable BEFORE INSERT OR UPDATE OR DELETE ON auth.rund_identidad_compensacion
  FOR EACH ROW EXECUTE FUNCTION auth.proteger_rund_identidad_resolucion();
COMMIT;
