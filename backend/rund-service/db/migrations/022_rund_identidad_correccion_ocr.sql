-- Diario de correcciones de identidad pedidas a Auth al confirmar una sugerencia OCR.
-- Auth es dueño de auth.personas: RUND ya no escribe allí; registra aquí su intención, la aplica por API
-- y solo entonces confirma la sugerencia. Si algo falla a medias, el diario permite compensar en Auth.
-- No altera datos existentes ni habilita por sí mismo la ruta (RUND_OCR_IDENTITY_VIA_AUTH_API).
BEGIN;
CREATE TABLE IF NOT EXISTS rund.identidad_correccion_ocr (
  operacion_id uuid PRIMARY KEY,
  sugerencia_id uuid NOT NULL,
  docente_id text NOT NULL,
  persona_id uuid NOT NULL,
  campo text NOT NULL CHECK (campo IN ('documentNumber','documentType','nombreCompleto','genero','fechaNacimiento')),
  valor_previo text,
  valor_nuevo text NOT NULL,
  huella varchar(64) NOT NULL CHECK (huella ~ '^[a-f0-9]{64}$'),
  actor_id text NOT NULL,
  ip text,
  estado text NOT NULL DEFAULT 'RESERVADA' CHECK (estado IN ('RESERVADA','APLICADA_AUTH','CONFIRMADA','COMPENSADA','REVISION')),
  intentos integer NOT NULL DEFAULT 0 CHECK (intentos >= 0),
  error_codigo text,
  creada_en timestamptz NOT NULL DEFAULT clock_timestamp(),
  actualizada_en timestamptz NOT NULL DEFAULT clock_timestamp()
);
-- Una sola corrección viva por sugerencia: reintentar la misma confirmación reanuda la anterior.
CREATE UNIQUE INDEX IF NOT EXISTS uq_identidad_correccion_ocr_viva
  ON rund.identidad_correccion_ocr (sugerencia_id) WHERE estado IN ('RESERVADA','APLICADA_AUTH','REVISION');
CREATE INDEX IF NOT EXISTS idx_identidad_correccion_ocr_pendientes
  ON rund.identidad_correccion_ocr (actualizada_en) WHERE estado IN ('RESERVADA','APLICADA_AUTH');

CREATE OR REPLACE FUNCTION rund.proteger_identidad_correccion_ocr()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'El diario de correcciones de identidad OCR no admite borrados';
  END IF;
  IF NEW.operacion_id IS DISTINCT FROM OLD.operacion_id OR NEW.sugerencia_id IS DISTINCT FROM OLD.sugerencia_id
    OR NEW.docente_id IS DISTINCT FROM OLD.docente_id OR NEW.persona_id IS DISTINCT FROM OLD.persona_id
    OR NEW.campo IS DISTINCT FROM OLD.campo OR NEW.valor_previo IS DISTINCT FROM OLD.valor_previo
    OR NEW.valor_nuevo IS DISTINCT FROM OLD.valor_nuevo OR NEW.huella IS DISTINCT FROM OLD.huella
    OR NEW.actor_id IS DISTINCT FROM OLD.actor_id OR NEW.creada_en IS DISTINCT FROM OLD.creada_en THEN
    RAISE EXCEPTION 'El contenido de una corrección de identidad OCR es inmutable';
  END IF;
  -- Estados finales (CONFIRMADA, COMPENSADA) no cambian; las demás transiciones siguen el flujo del diario.
  IF OLD.estado IN ('CONFIRMADA','COMPENSADA') AND NEW.estado IS DISTINCT FROM OLD.estado THEN
    RAISE EXCEPTION 'La corrección de identidad OCR ya tiene un estado final';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS proteger_identidad_correccion_ocr ON rund.identidad_correccion_ocr;
CREATE TRIGGER proteger_identidad_correccion_ocr BEFORE UPDATE OR DELETE ON rund.identidad_correccion_ocr
FOR EACH ROW EXECUTE FUNCTION rund.proteger_identidad_correccion_ocr();
COMMIT;
