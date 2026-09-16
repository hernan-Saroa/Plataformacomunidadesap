-- REQ-RUND-F001 - Cierre técnico del CRUD del perfil docente por cédula.
-- La PK técnica continúa siendo UUID. La cédula es la llave natural universal,
-- única e inmodificable, mientras Docente conserva versiones por periodo.

CREATE SCHEMA IF NOT EXISTS academic_work_plan;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  duplicate_documents TEXT;
BEGIN
  SELECT string_agg(documento, ', ' ORDER BY documento)
    INTO duplicate_documents
    FROM (
      SELECT UPPER(regexp_replace(BTRIM(num_identificacion::text), '\.', '', 'g')) AS documento
      FROM auth.personas
      WHERE num_identificacion IS NOT NULL
        AND BTRIM(num_identificacion::text) <> ''
      GROUP BY UPPER(regexp_replace(BTRIM(num_identificacion::text), '\.', '', 'g'))
      HAVING COUNT(*) > 1
      LIMIT 20
    ) duplicates;

  IF duplicate_documents IS NOT NULL THEN
    RAISE EXCEPTION
      'REQ-RUND-F001: existen cédulas duplicadas en auth.personas: %. Deben consolidarse antes de aplicar la restricción.',
      duplicate_documents;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_auth_personas_cedula_normalizada
  ON auth.personas ((UPPER(regexp_replace(BTRIM(num_identificacion::text), '\.', '', 'g'))))
  WHERE num_identificacion IS NOT NULL
    AND BTRIM(num_identificacion::text) <> '';

COMMENT ON INDEX auth.uq_auth_personas_cedula_normalizada IS
  'REQ-RUND-F001: garantiza una sola persona por cédula normalizada en todos los periodos.';

CREATE OR REPLACE FUNCTION academic_work_plan.prevent_rund_document_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Los registros historicos sin documento pueden regularizarse una sola vez.
  -- Desde el primer valor no vacio, la llave natural queda inmodificable.
  IF OLD.num_identificacion IS NOT NULL
     AND BTRIM(OLD.num_identificacion::text) <> ''
     AND UPPER(regexp_replace(BTRIM(NEW.num_identificacion::text), '\.', '', 'g'))
       IS DISTINCT FROM
     UPPER(regexp_replace(BTRIM(OLD.num_identificacion::text), '\.', '', 'g'))
     AND EXISTS (
       SELECT 1
       FROM academic_work_plan."Docente" d
       WHERE d."personaId" = OLD.id_person
     ) THEN
    RAISE EXCEPTION 'REQ-RUND-F001: la cédula de un perfil docente no puede modificarse';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auth_personas_rund_document_immutable ON auth.personas;

CREATE TRIGGER trg_auth_personas_rund_document_immutable
BEFORE UPDATE OF num_identificacion ON auth.personas
FOR EACH ROW EXECUTE FUNCTION academic_work_plan.prevent_rund_document_change();

CREATE TABLE IF NOT EXISTS academic_work_plan."RundCargaMasiva" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_archivo TEXT NOT NULL,
  tipo_mime TEXT NOT NULL,
  tamano_bytes BIGINT NOT NULL CHECK (tamano_bytes >= 0),
  sha256 VARCHAR(64) NOT NULL,
  contenido BYTEA NOT NULL,
  actor_id TEXT NOT NULL,
  justificacion TEXT NOT NULL,
  ip TEXT,
  estado TEXT NOT NULL DEFAULT 'PROCESANDO'
    CHECK (estado IN ('PROCESANDO', 'COMPLETADA', 'COMPLETADA_CON_ERRORES', 'FALLIDA')),
  resumen JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rund_carga_masiva_created_at
  ON academic_work_plan."RundCargaMasiva" ("createdAt" DESC);

COMMENT ON TABLE academic_work_plan."RundCargaMasiva" IS
  'Soporte documental inmutable de cada importación masiva de perfiles RUND.';

CREATE OR REPLACE FUNCTION academic_work_plan.prevent_rund_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Los registros de auditoría RUND son inmutables';
END;
$$;

DROP TRIGGER IF EXISTS trg_rund_aprobacion_log_immutable
  ON academic_work_plan."RundAprobacionLog";

CREATE TRIGGER trg_rund_aprobacion_log_immutable
BEFORE UPDATE OR DELETE ON academic_work_plan."RundAprobacionLog"
FOR EACH ROW EXECUTE FUNCTION academic_work_plan.prevent_rund_audit_mutation();

DROP TRIGGER IF EXISTS trg_rund_carga_masiva_immutable_content
  ON academic_work_plan."RundCargaMasiva";

CREATE OR REPLACE FUNCTION academic_work_plan.prevent_rund_bulk_support_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'El soporte documental de la carga masiva es inmutable';
  END IF;

  IF NEW.nombre_archivo IS DISTINCT FROM OLD.nombre_archivo
     OR NEW.tipo_mime IS DISTINCT FROM OLD.tipo_mime
     OR NEW.tamano_bytes IS DISTINCT FROM OLD.tamano_bytes
     OR NEW.sha256 IS DISTINCT FROM OLD.sha256
     OR NEW.contenido IS DISTINCT FROM OLD.contenido
     OR NEW.actor_id IS DISTINCT FROM OLD.actor_id
     OR NEW.justificacion IS DISTINCT FROM OLD.justificacion
     OR NEW.ip IS DISTINCT FROM OLD.ip
     OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt" THEN
    RAISE EXCEPTION 'El soporte documental de la carga masiva es inmutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_rund_carga_masiva_immutable_content
BEFORE UPDATE OR DELETE ON academic_work_plan."RundCargaMasiva"
FOR EACH ROW EXECUTE FUNCTION academic_work_plan.prevent_rund_bulk_support_mutation();
