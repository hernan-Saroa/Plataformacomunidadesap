CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS auth.carpeta_digital (
  id_carpeta_digital UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id UUID NOT NULL UNIQUE,
  nombre_carpeta VARCHAR(255),
  estado VARCHAR(30) NOT NULL DEFAULT 'ACTIVO',
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT fk_carpeta_digital_persona
    FOREIGN KEY (persona_id)
    REFERENCES auth.personas(id_person)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_carpeta_digital_persona_id
  ON auth.carpeta_digital(persona_id);

CREATE INDEX IF NOT EXISTS idx_carpeta_digital_estado
  ON auth.carpeta_digital(estado);

CREATE TABLE IF NOT EXISTS auth.tipo_documento (
  id_tipo_documento UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carpeta_digital_id UUID,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT,
  categoria VARCHAR(80) NOT NULL DEFAULT 'otros',
  icono VARCHAR(80) NOT NULL DEFAULT 'file-text',
  color VARCHAR(20) NOT NULL DEFAULT '#2962FF',
  obligatorio BOOLEAN NOT NULL DEFAULT false,
  requiere_validacion BOOLEAN NOT NULL DEFAULT true,
  formatos_permitidos TEXT[] NOT NULL DEFAULT ARRAY['pdf']::text[],
  tamano_max_mb INTEGER NOT NULL DEFAULT 10,
  activo BOOLEAN NOT NULL DEFAULT true,
  es_sistema BOOLEAN NOT NULL DEFAULT false,
  rol_validador VARCHAR(120),
  orden INTEGER NOT NULL DEFAULT 0,
  asignacion_tipo VARCHAR(40) NOT NULL DEFAULT 'todos',
  asignacion_valor VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT fk_tipo_documento_carpeta_digital
    FOREIGN KEY (carpeta_digital_id)
    REFERENCES auth.carpeta_digital(id_carpeta_digital)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tipo_documento_carpeta_digital_id
  ON auth.tipo_documento(carpeta_digital_id);

CREATE INDEX IF NOT EXISTS idx_tipo_documento_activo
  ON auth.tipo_documento(activo);

CREATE INDEX IF NOT EXISTS idx_tipo_documento_categoria
  ON auth.tipo_documento(categoria);

COMMENT ON COLUMN auth.tipo_documento.nombre IS
  'Nombre del documento requerido configurado, por ejemplo Cedula, Hoja de vida o Certificado laboral.';

COMMENT ON COLUMN auth.tipo_documento.categoria IS
  'Categoria funcional del documento: personal, academico, laboral, certificados, administrativo u otros.';

INSERT INTO auth.carpeta_digital (persona_id, nombre_carpeta)
SELECT p.id_person, p.nom_largo
FROM auth.personas p
WHERE p.id_person IS NOT NULL
ON CONFLICT (persona_id) DO NOTHING;

DO $$
DECLARE
  tipos_json JSONB;
BEGIN
  IF to_regclass('academic_work_plan."ConfiguracionSistema"') IS NOT NULL THEN
    SELECT valor
      INTO tipos_json
    FROM academic_work_plan."ConfiguracionSistema"
    WHERE clave = 'tipos_documentos';

    IF jsonb_typeof(tipos_json) = 'array' THEN
      INSERT INTO auth.tipo_documento (
        nombre,
        descripcion,
        categoria,
        icono,
        color,
        obligatorio,
        requiere_validacion,
        formatos_permitidos,
        tamano_max_mb,
        activo,
        es_sistema,
        rol_validador,
        orden,
        asignacion_tipo,
        asignacion_valor
      )
      SELECT
        COALESCE(NULLIF(item->>'nombre', ''), 'Tipo de documento'),
        NULLIF(item->>'descripcion', ''),
        COALESCE(NULLIF(item->>'categoria', ''), 'otros'),
        COALESCE(NULLIF(item->>'icono', ''), 'file-text'),
        COALESCE(NULLIF(item->>'color', ''), '#2962FF'),
        COALESCE((item->>'obligatorio')::boolean, false),
        COALESCE((item->>'requiere_validacion')::boolean, true),
        COALESCE(
          ARRAY(SELECT jsonb_array_elements_text(item->'formatos_permitidos')),
          ARRAY['pdf']::text[]
        ),
        COALESCE((item->>'tamano_max_mb')::integer, 10),
        COALESCE((item->>'activo')::boolean, true),
        COALESCE((item->>'es_sistema')::boolean, false),
        NULLIF(item->>'rol_validador', ''),
        COALESCE((item->>'orden')::integer, 0),
        COALESCE(NULLIF(item->>'asignacion_tipo', ''), 'todos'),
        NULLIF(item->>'asignacion_valor', '')
      FROM jsonb_array_elements(tipos_json) AS item
      WHERE NOT EXISTS (
        SELECT 1
        FROM auth.tipo_documento existing
        WHERE existing.carpeta_digital_id IS NULL
          AND lower(existing.nombre) = lower(COALESCE(NULLIF(item->>'nombre', ''), 'Tipo de documento'))
      );
    END IF;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION auth.set_carpeta_digital_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_carpeta_digital_updated_at ON auth.carpeta_digital;
CREATE TRIGGER trg_carpeta_digital_updated_at
BEFORE UPDATE ON auth.carpeta_digital
FOR EACH ROW
EXECUTE FUNCTION auth.set_carpeta_digital_updated_at();

DROP TRIGGER IF EXISTS trg_tipo_documento_updated_at ON auth.tipo_documento;
CREATE TRIGGER trg_tipo_documento_updated_at
BEFORE UPDATE ON auth.tipo_documento
FOR EACH ROW
EXECUTE FUNCTION auth.set_carpeta_digital_updated_at();
