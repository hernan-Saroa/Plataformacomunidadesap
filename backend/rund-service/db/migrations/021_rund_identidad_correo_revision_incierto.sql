-- Amplía el caso existente para resultados INCIERTO ya proyectados del mismo intento.
-- Sin tablas/columnas nuevas, backfill, cambio de resultado o permiso de reenvío.
BEGIN;
CREATE OR REPLACE FUNCTION rund.proteger_identidad_correo_revision()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE aviso rund.identidad_correo%ROWTYPE; resultado rund.identidad_correo_resultado%ROWTYPE;
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Caso de revision de correo RUND no se puede borrar'; END IF;
  SELECT * INTO aviso FROM rund.identidad_correo WHERE intencion_id=NEW.intencion_id FOR UPDATE;
  IF TG_OP='INSERT' THEN
    IF NOT FOUND OR aviso.estado NOT IN ('ENVIANDO','INCIERTO')
      OR NEW.intento_id IS DISTINCT FROM aviso.intento_id OR NEW.estado_correo_inicial IS DISTINCT FROM aviso.estado
      OR NEW.creada_en<aviso.iniciada_en OR NEW.estado<>'PENDIENTE' OR NEW.asumida_por IS NOT NULL OR NEW.asumida_en IS NOT NULL THEN
      RAISE EXCEPTION 'Revision de correo RUND requiere intento incierto sin resultado observado';
    END IF;
    SELECT * INTO resultado FROM rund.identidad_correo_resultado WHERE intencion_id=NEW.intencion_id;
    IF FOUND AND (aviso.estado<>'INCIERTO' OR resultado.resultado<>'INCIERTO'
      OR resultado.intento_id IS DISTINCT FROM NEW.intento_id OR NEW.creada_en<resultado.registrada_en
      OR NEW.creada_en<aviso.resuelta_en) THEN
      RAISE EXCEPTION 'Revision de correo RUND requiere resultado incierto proyectado del mismo intento';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.intencion_id IS DISTINCT FROM OLD.intencion_id OR NEW.caso_id IS DISTINCT FROM OLD.caso_id
    OR NEW.intento_id IS DISTINCT FROM OLD.intento_id OR NEW.estado_correo_inicial IS DISTINCT FROM OLD.estado_correo_inicial
    OR NEW.registrada_por IS DISTINCT FROM OLD.registrada_por OR NEW.creada_en IS DISTINCT FROM OLD.creada_en
    OR OLD.estado<>'PENDIENTE' OR NEW.estado<>'EN_REVISION' OR NEW.asumida_por IS NULL
    OR NEW.asumida_en IS DISTINCT FROM CURRENT_TIMESTAMP OR aviso.estado='ENVIADO' THEN
    RAISE EXCEPTION 'Transicion de revision de correo RUND invalida';
  END IF;
  RETURN NEW;
END $$;
-- Usa el trigger de 018. Aplicar migraciones en orden: 021 extiende esa función.
COMMIT;
