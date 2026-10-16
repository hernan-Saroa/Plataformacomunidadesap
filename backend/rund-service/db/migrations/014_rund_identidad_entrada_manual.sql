-- Captura privada e inmutable del formulario/contexto antes de preparar 008–010.
BEGIN;
ALTER TABLE rund.identidad_solicitud ADD COLUMN IF NOT EXISTS huella_formulario varchar(64);
ALTER TABLE rund.identidad_solicitud ADD COLUMN IF NOT EXISTS entrada_manual jsonb;
ALTER TABLE rund.identidad_solicitud DROP CONSTRAINT IF EXISTS identidad_solicitud_entrada_check;
ALTER TABLE rund.identidad_solicitud ADD CONSTRAINT identidad_solicitud_entrada_check CHECK ((
  (huella_formulario IS NULL AND entrada_manual IS NULL) OR
  (huella_formulario ~ '^[a-f0-9]{64}$' AND jsonb_typeof(entrada_manual)='object'
    AND entrada_manual->'version'='1'::jsonb
    AND jsonb_typeof(entrada_manual->'formulario')='object'
    AND jsonb_typeof(entrada_manual->'contexto')='object'
    AND entrada_manual - ARRAY['version','formulario','contexto']='{}'::jsonb
    AND entrada_manual->'contexto'->'comandoAuth'->>'actorId'=actor_id::text
    AND entrada_manual->'contexto'->'escritura'->'options'->'audit'->>'actorId'=actor_id::text
    AND entrada_manual->'contexto'->'escritura'->'options'->'audit'->>'canalOrigen'='MODAL'
    AND entrada_manual->'contexto'->'escritura'->'options'->'audit'->>'accion'='CREAR'
    AND octet_length(entrada_manual::text)<=1048576)
) IS TRUE);
-- El trigger inmutable de 013 también protege las dos columnas nuevas.
CREATE OR REPLACE FUNCTION rund.validar_contexto_entrada_manual()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE entrada jsonb;
BEGIN
  SELECT entrada_manual INTO entrada FROM rund.identidad_solicitud WHERE intencion_id=NEW.intencion_id;
  IF entrada IS NOT NULL AND NEW.contexto IS DISTINCT FROM entrada->'contexto' THEN
    RAISE EXCEPTION 'Contexto distinto de la entrada manual RUND capturada';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS validar_contexto_entrada_manual ON rund.identidad_contexto_nativo;
CREATE TRIGGER validar_contexto_entrada_manual BEFORE INSERT ON rund.identidad_contexto_nativo
FOR EACH ROW EXECUTE FUNCTION rund.validar_contexto_entrada_manual();
-- Sin backfill: no reconstruir formulario/auditoría del historial ni asignar aprobación.
COMMIT;
