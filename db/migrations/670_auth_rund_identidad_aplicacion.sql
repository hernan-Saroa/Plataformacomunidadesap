-- Extiende 669: identidad y recibo aplicado se confirman en una transacción Auth.
BEGIN;
ALTER TABLE auth.rund_identidad_operacion ADD COLUMN IF NOT EXISTS resultado jsonb;
ALTER TABLE auth.rund_identidad_operacion ADD COLUMN IF NOT EXISTS aplicada_en timestamptz;
ALTER TABLE auth.rund_identidad_operacion DROP CONSTRAINT IF EXISTS rund_identidad_operacion_estado_check;
ALTER TABLE auth.rund_identidad_operacion DROP CONSTRAINT IF EXISTS rund_identidad_operacion_check;
ALTER TABLE auth.rund_identidad_operacion DROP CONSTRAINT IF EXISTS rund_identidad_operacion_fase_check;
ALTER TABLE auth.rund_identidad_operacion ADD CONSTRAINT rund_identidad_operacion_fase_check CHECK (
  (estado='REGISTRADA' AND cancelada_en IS NULL AND aplicada_en IS NULL AND resultado IS NULL) OR
  (estado='CANCELADA' AND cancelada_en IS NOT NULL AND aplicada_en IS NULL AND resultado IS NULL) OR
  (estado='APLICADA' AND cancelada_en IS NULL AND aplicada_en IS NOT NULL AND resultado IS NOT NULL
    AND jsonb_typeof(resultado)='object' AND resultado ?& ARRAY['personaId','usuarioId','usuarioCreado','camposModificados','cambios'])
);
CREATE OR REPLACE FUNCTION auth.proteger_rund_identidad_operacion()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'No se puede eliminar un recibo de intención RUND'; END IF;
  IF NEW.operacion_id IS DISTINCT FROM OLD.operacion_id OR NEW.version IS DISTINCT FROM OLD.version
    OR NEW.huella_comando IS DISTINCT FROM OLD.huella_comando OR NEW.registrada_en IS DISTINCT FROM OLD.registrada_en
    OR OLD.estado<>'REGISTRADA' OR NEW.estado NOT IN ('CANCELADA','APLICADA') THEN
    RAISE EXCEPTION 'Transición de intención RUND inválida';
  END IF;
  RETURN NEW;
END $$;
COMMIT;
