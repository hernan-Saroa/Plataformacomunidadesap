-- Requiere 669-672. Preparación optativa: no activa el modo LOCAL ni modifica identidades.
-- LOCAL usa exclusivamente tablas Auth: inventario inicial y efectos de operaciones no compensadas.
-- Los efectos reservan la protección desde el commit Auth, antes del commit del perfil RUND.
BEGIN;

CREATE TABLE IF NOT EXISTS auth.rund_documento_politica (
  id integer PRIMARY KEY CHECK (id = 1),
  modo text NOT NULL CHECK (modo IN ('HEREDADO', 'LOCAL')),
  activada_en timestamptz,
  total_inventario integer CHECK (total_inventario >= 0),
  CHECK (modo <> 'LOCAL' OR (activada_en IS NOT NULL AND total_inventario IS NOT NULL))
);
INSERT INTO auth.rund_documento_politica(id, modo) VALUES (1, 'HEREDADO') ON CONFLICT (id) DO NOTHING;

-- Inventario de personas con perfiles anteriores a la escritura coordinada.
-- Sin FK a otro propietario y sin inferir la pertenencia a partir del rol DOCENTE.
CREATE TABLE IF NOT EXISTS auth.rund_documento_protegido (
  persona_id uuid PRIMARY KEY,
  registrada_en timestamptz NOT NULL DEFAULT clock_timestamp()
);
REVOKE ALL ON auth.rund_documento_politica, auth.rund_documento_protegido FROM PUBLIC;

-- Activación administrativa, fuera de los servicios HTTP. El inventario completo debe
-- obtenerse/conciliarse con los propietarios RUND y PTA durante una pausa de escrituras.
-- El total independiente detecta duplicados/truncamientos; no certifica el inventario remoto.
CREATE OR REPLACE FUNCTION auth.activar_proteccion_documento_rund_local(personas uuid[], total_esperado integer)
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE total integer;
BEGIN
  PERFORM 1 FROM auth.rund_documento_politica WHERE id=1 FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Falta la política de protección RUND'; END IF;
  -- La base compartida conserva la regla heredada. No se acepta una activación que
  -- deje escritores de perfiles locales fuera del protocolo de operaciones Auth.
  IF to_regclass('rund."Docente"') IS NOT NULL OR to_regclass('academic_work_plan."Docente"') IS NOT NULL THEN
    RAISE EXCEPTION 'LOCAL requiere Auth separado de las tablas Docente RUND/PTA';
  END IF;
  IF personas IS NULL OR total_esperado IS NULL OR total_esperado < 0
    OR cardinality(personas) <> total_esperado
    OR EXISTS (SELECT 1 FROM unnest(personas) p WHERE p IS NULL)
    OR (SELECT count(DISTINCT p) FROM unnest(personas) p) <> total_esperado THEN
    RAISE EXCEPTION 'Inventario RUND incompleto, duplicado o inválido';
  END IF;
  -- No puede cambiar una persona mientras se instala su protección. Los escritores
  -- coordinados toman estos mismos bloqueos al actualizar la identidad.
  LOCK TABLE auth.personas IN SHARE ROW EXCLUSIVE MODE;
  IF EXISTS (SELECT 1 FROM unnest(personas) p WHERE NOT EXISTS
    (SELECT 1 FROM auth.personas a WHERE a.id_person=p)) THEN
    RAISE EXCEPTION 'El inventario RUND contiene personas ausentes de Auth';
  END IF;
  INSERT INTO auth.rund_documento_protegido(persona_id) SELECT p FROM unnest(personas) p
    ON CONFLICT (persona_id) DO NOTHING;
  -- Repetir o ampliar el inventario nunca retira protecciones anteriores.
  SELECT count(*) INTO total FROM auth.rund_documento_protegido;
  UPDATE auth.rund_documento_politica SET modo='LOCAL', activada_en=COALESCE(activada_en,clock_timestamp()),
    total_inventario=total WHERE id=1;
  RETURN total;
END $$;
REVOKE ALL ON FUNCTION auth.activar_proteccion_documento_rund_local(uuid[], integer) FROM PUBLIC;

CREATE OR REPLACE FUNCTION auth.prevent_rund_document_change()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  correction_id text := current_setting('app.rund_identity_correction_id', TRUE);
  suggestion_id text := current_setting('app.rund_ocr_suggestion_id', TRUE);
  old_norm text := COALESCE(regexp_replace(UPPER(BTRIM(OLD.num_identificacion::text)), '[^A-Z0-9]', '', 'g'), '');
  new_norm text := COALESCE(regexp_replace(UPPER(BTRIM(NEW.num_identificacion::text)), '[^A-Z0-9]', '', 'g'), '');
  modo text;
  owner_schema text;
  has_profile boolean := FALSE;
  authorized boolean := FALSE;
BEGIN
  -- La política ausente es un fallo de instalación, nunca autorización implícita.
  SELECT p.modo INTO STRICT modo FROM auth.rund_documento_politica p WHERE p.id=1;
  IF OLD.num_identificacion IS NULL OR BTRIM(OLD.num_identificacion::text) = ''
     OR UPPER(regexp_replace(BTRIM(NEW.num_identificacion::text), '\.', '', 'g'))
        IS NOT DISTINCT FROM UPPER(regexp_replace(BTRIM(OLD.num_identificacion::text), '\.', '', 'g')) THEN
    RETURN NEW;
  END IF;

  IF modo = 'LOCAL' THEN
    SELECT EXISTS (SELECT 1 FROM auth.rund_documento_protegido p WHERE p.persona_id=OLD.id_person)
      OR EXISTS (
        SELECT 1 FROM auth.rund_identidad_efecto e
        WHERE e.persona_id=OLD.id_person AND NOT EXISTS (
          SELECT 1 FROM auth.rund_identidad_compensacion c
          WHERE c.operacion_id=e.operacion_id AND c.estado='COMPENSADA'
        )
      ) INTO has_profile;
    -- REVISION_REQUERIDA y una operación aún en curso mantienen la protección.
    -- Una compensación probada libera solo su reserva, no el inventario ni otras operaciones.
  ELSE
    -- Compatibilidad exacta con 672 mientras se acepta la instalación compartida.
    FOREACH owner_schema IN ARRAY ARRAY['rund', 'academic_work_plan'] LOOP
      IF to_regclass(format('%I."Docente"', owner_schema)) IS NOT NULL THEN
        EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I."Docente" d WHERE d."personaId"::text = $1)', owner_schema)
          INTO has_profile USING OLD.id_person::text;
        EXIT WHEN has_profile;
      END IF;
    END LOOP;
  END IF;
  IF NOT has_profile THEN RETURN NEW; END IF;

  -- Autorización propia: el mismo par de valores en aplicación o compensación OCR.
  IF correction_id ~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' THEN
    SELECT EXISTS (
      SELECT 1 FROM auth.rund_identidad_correccion c
      WHERE c.operacion_id = correction_id::uuid AND c.persona_id = OLD.id_person
        AND c.campo = 'documentNumber' AND c.estado = 'APLICADA'
        AND (
          (old_norm = COALESCE(regexp_replace(UPPER(BTRIM(c.valor_previo)), '[^A-Z0-9]', '', 'g'), '')
            AND new_norm = regexp_replace(UPPER(BTRIM(c.valor_nuevo)), '[^A-Z0-9]', '', 'g'))
          OR (old_norm = regexp_replace(UPPER(BTRIM(c.valor_nuevo)), '[^A-Z0-9]', '', 'g')
            AND new_norm = COALESCE(regexp_replace(UPPER(BTRIM(c.valor_previo)), '[^A-Z0-9]', '', 'g'), ''))
        )
    ) INTO authorized;
  END IF;

  -- LOCAL nunca consulta sugerencias ajenas ni acepta el GUC heredado como permiso.
  IF modo = 'HEREDADO' AND NOT authorized AND suggestion_id IS NOT NULL AND suggestion_id <> '' THEN
    FOREACH owner_schema IN ARRAY ARRAY['rund', 'academic_work_plan'] LOOP
      IF to_regclass(format('%I."RundExtraccionSugerencia"', owner_schema)) IS NOT NULL
         AND to_regclass(format('%I."RundExtraccionTrabajo"', owner_schema)) IS NOT NULL
         AND to_regclass(format('%I."RundDocumentoPerfil"', owner_schema)) IS NOT NULL THEN
        EXECUTE format($q$
          SELECT EXISTS (
            SELECT 1 FROM %1$I."RundExtraccionSugerencia" s
            JOIN %1$I."RundExtraccionTrabajo" j ON j.id = s.trabajo_id
            JOIN %1$I."RundDocumentoPerfil" doc ON doc.id = j.documento_id
            JOIN %1$I."Docente" d ON d.id::text = j.docente_id::text
            WHERE s.id::text = $1 AND s.estado = 'PENDIENTE' AND s.campo = 'documentNumber'
              AND j.estado = 'COMPLETADO' AND doc.estado = 'ACTIVO' AND d."personaId"::text = $2
              AND regexp_replace(UPPER(BTRIM(s.valor)), '[^A-Z0-9]', '', 'g') = $3
          )$q$, owner_schema) INTO authorized USING suggestion_id, OLD.id_person::text, new_norm;
        EXIT WHEN authorized;
      END IF;
    END LOOP;
  END IF;
  IF NOT authorized THEN RAISE EXCEPTION 'REQ-RUND-F001: la cédula de un perfil docente no puede modificarse'; END IF;
  RETURN NEW;
END $$;

COMMENT ON FUNCTION auth.prevent_rund_document_change() IS
  'REQ-RUND-F001: HEREDADO conserva 672; LOCAL protege inventario y operaciones Auth no compensadas, sin consultar RUND/PTA.';
COMMIT;
