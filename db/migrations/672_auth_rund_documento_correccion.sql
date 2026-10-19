-- REQ-RUND-F001: la cédula de un perfil docente solo cambia con una corrección autorizada.
-- La regla vivía en academic_work_plan y validaba la sugerencia OCR en tablas de PTA; tras la
-- separación del RUND esas sugerencias están en el esquema rund y la corrección era rechazada.
-- Auth es dueño de auth.personas, así que su propia regla autoriza el cambio de dos maneras:
--   1) Registro propio auth.rund_identidad_correccion (API de correcciones; no depende de otro servicio).
--   2) Ruta heredada app.rund_ocr_suggestion_id, validada en el esquema que contenga la sugerencia
--      (rund o academic_work_plan), para no romper el RUND embebido de PTA ni la ruta actual de rund-service.
-- No modifica personas ni cuentas. Es idempotente.
BEGIN;

CREATE TABLE IF NOT EXISTS auth.rund_identidad_correccion (
  operacion_id uuid PRIMARY KEY,
  persona_id uuid NOT NULL,
  campo text NOT NULL CHECK (campo IN ('documentNumber','documentType','nombreCompleto','genero','fechaNacimiento')),
  valor_previo text,
  valor_nuevo text NOT NULL,
  huella varchar(64) NOT NULL CHECK (huella ~ '^[a-f0-9]{64}$'),
  actor_id text NOT NULL,
  sugerencia_id text,
  estado text NOT NULL DEFAULT 'APLICADA' CHECK (estado IN ('APLICADA','COMPENSADA')),
  aplicada_en timestamptz NOT NULL DEFAULT clock_timestamp(),
  compensada_en timestamptz,
  CHECK ((estado = 'APLICADA' AND compensada_en IS NULL) OR (estado = 'COMPENSADA' AND compensada_en IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_rund_identidad_correccion_persona ON auth.rund_identidad_correccion (persona_id, aplicada_en DESC);

CREATE OR REPLACE FUNCTION auth.proteger_rund_identidad_correccion()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'No se puede eliminar un registro de corrección de identidad RUND';
  END IF;
  IF NEW.operacion_id IS DISTINCT FROM OLD.operacion_id OR NEW.persona_id IS DISTINCT FROM OLD.persona_id
    OR NEW.campo IS DISTINCT FROM OLD.campo OR NEW.valor_previo IS DISTINCT FROM OLD.valor_previo
    OR NEW.valor_nuevo IS DISTINCT FROM OLD.valor_nuevo OR NEW.huella IS DISTINCT FROM OLD.huella
    OR NEW.actor_id IS DISTINCT FROM OLD.actor_id OR NEW.sugerencia_id IS DISTINCT FROM OLD.sugerencia_id
    OR NEW.aplicada_en IS DISTINCT FROM OLD.aplicada_en
    OR OLD.estado <> 'APLICADA' OR NEW.estado <> 'COMPENSADA' OR NEW.compensada_en IS NULL THEN
    RAISE EXCEPTION 'Transición de corrección de identidad RUND inválida';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS proteger_rund_identidad_correccion ON auth.rund_identidad_correccion;
CREATE TRIGGER proteger_rund_identidad_correccion BEFORE UPDATE OR DELETE ON auth.rund_identidad_correccion
FOR EACH ROW EXECUTE FUNCTION auth.proteger_rund_identidad_correccion();

CREATE OR REPLACE FUNCTION auth.prevent_rund_document_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  correction_id TEXT := current_setting('app.rund_identity_correction_id', TRUE);
  suggestion_id TEXT := current_setting('app.rund_ocr_suggestion_id', TRUE);
  old_norm TEXT := COALESCE(regexp_replace(UPPER(BTRIM(OLD.num_identificacion::text)), '[^A-Z0-9]', '', 'g'), '');
  new_norm TEXT := COALESCE(regexp_replace(UPPER(BTRIM(NEW.num_identificacion::text)), '[^A-Z0-9]', '', 'g'), '');
  owner_schema TEXT;
  has_profile BOOLEAN := FALSE;
  authorized BOOLEAN := FALSE;
BEGIN
  -- Registros sin cédula previa pueden regularizarse; un cambio que solo altera los puntos no es un cambio.
  IF OLD.num_identificacion IS NULL OR BTRIM(OLD.num_identificacion::text) = ''
     OR UPPER(regexp_replace(BTRIM(NEW.num_identificacion::text), '\.', '', 'g'))
        IS NOT DISTINCT FROM UPPER(regexp_replace(BTRIM(OLD.num_identificacion::text), '\.', '', 'g')) THEN
    RETURN NEW;
  END IF;

  -- La regla solo protege a las personas con perfil docente (en rund o en la proyección/RUND embebido de PTA).
  FOREACH owner_schema IN ARRAY ARRAY['rund', 'academic_work_plan'] LOOP
    IF to_regclass(format('%I."Docente"', owner_schema)) IS NOT NULL THEN
      EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I."Docente" d WHERE d."personaId"::text = $1)', owner_schema)
        INTO has_profile USING OLD.id_person::text;
      EXIT WHEN has_profile;
    END IF;
  END LOOP;
  IF NOT has_profile THEN
    RETURN NEW;
  END IF;

  -- 1) Corrección registrada por Auth en esta misma transacción (aplicación o compensación del mismo par de valores).
  IF correction_id ~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' THEN
    SELECT EXISTS (
      SELECT 1 FROM auth.rund_identidad_correccion c
      WHERE c.operacion_id = correction_id::uuid
        AND c.persona_id = OLD.id_person
        AND c.campo = 'documentNumber'
        AND c.estado = 'APLICADA'
        AND (
          (old_norm = COALESCE(regexp_replace(UPPER(BTRIM(c.valor_previo)), '[^A-Z0-9]', '', 'g'), '')
            AND new_norm = regexp_replace(UPPER(BTRIM(c.valor_nuevo)), '[^A-Z0-9]', '', 'g'))
          OR (old_norm = regexp_replace(UPPER(BTRIM(c.valor_nuevo)), '[^A-Z0-9]', '', 'g')
            AND new_norm = COALESCE(regexp_replace(UPPER(BTRIM(c.valor_previo)), '[^A-Z0-9]', '', 'g'), ''))
        )
    ) INTO authorized;
  END IF;

  -- 2) Ruta heredada: sugerencia OCR pendiente, vigente y de la misma persona, en el esquema que la contenga.
  IF NOT authorized AND suggestion_id IS NOT NULL AND suggestion_id <> '' THEN
    FOREACH owner_schema IN ARRAY ARRAY['rund', 'academic_work_plan'] LOOP
      IF to_regclass(format('%I."RundExtraccionSugerencia"', owner_schema)) IS NOT NULL
         AND to_regclass(format('%I."RundExtraccionTrabajo"', owner_schema)) IS NOT NULL
         AND to_regclass(format('%I."RundDocumentoPerfil"', owner_schema)) IS NOT NULL THEN
        EXECUTE format($q$
          SELECT EXISTS (
            SELECT 1
            FROM %1$I."RundExtraccionSugerencia" s
            JOIN %1$I."RundExtraccionTrabajo" j ON j.id = s.trabajo_id
            JOIN %1$I."RundDocumentoPerfil" doc ON doc.id = j.documento_id
            JOIN %1$I."Docente" d ON d.id::text = j.docente_id::text
            WHERE s.id::text = $1
              AND s.estado = 'PENDIENTE'
              AND s.campo = 'documentNumber'
              AND j.estado = 'COMPLETADO'
              AND doc.estado = 'ACTIVO'
              AND d."personaId"::text = $2
              AND regexp_replace(UPPER(BTRIM(s.valor)), '[^A-Z0-9]', '', 'g') = $3
          )$q$, owner_schema) INTO authorized USING suggestion_id, OLD.id_person::text, new_norm;
        EXIT WHEN authorized;
      END IF;
    END LOOP;
  END IF;

  IF NOT authorized THEN
    RAISE EXCEPTION 'REQ-RUND-F001: la cédula de un perfil docente no puede modificarse';
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION auth.prevent_rund_document_change() IS
  'REQ-RUND-F001: bloquea cambios de cédula de personas con perfil docente salvo una corrección registrada en Auth o una sugerencia OCR vigente de la misma persona.';

DROP TRIGGER IF EXISTS trg_auth_personas_rund_document_immutable ON auth.personas;
CREATE TRIGGER trg_auth_personas_rund_document_immutable
BEFORE UPDATE OF num_identificacion ON auth.personas
FOR EACH ROW EXECUTE FUNCTION auth.prevent_rund_document_change();

COMMIT;
