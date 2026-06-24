-- ============================================================================
-- 339: Crear tabla auth.documento_carpeta_digital
-- ============================================================================
-- Objetivo: persistir los documentos subidos por los docentes/funcionarios
-- en la Carpeta Digital. Hasta ahora sólo existía la tabla de tipos requeridos
-- (auth.tipo_documento) y la carpeta por persona (auth.carpeta_digital), pero
-- no había dónde guardar los archivos reales.
--
-- Esta tabla unifica el almacenamiento para las 3 vistas:
--   1) RUND backoffice (vía rund_soporte_id → academic_work_plan.RundSoporteCampo)
--   2) Carpeta Digital backoffice
--   3) Carpeta Digital portal docente (MisDocumentos)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS auth.documento_carpeta_digital (
  id_documento UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Carpeta y tipo
  carpeta_digital_id UUID NOT NULL,
  tipo_documento_id UUID,

  -- Enlace OPCIONAL al soporte RUND en el microservicio PTA (cross-schema).
  -- No es FK física (cross-schema con TypeORM es frágil); se valida en código.
  rund_soporte_id UUID,

  -- Metadatos del archivo
  nombre VARCHAR(255) NOT NULL,
  categoria VARCHAR(80) NOT NULL DEFAULT 'otros',
  tipo_archivo VARCHAR(40),
  tamano_bytes BIGINT DEFAULT 0,
  url_archivo TEXT NOT NULL,

  -- Estado de validación
  estado VARCHAR(30) NOT NULL DEFAULT 'pendiente',
  comentarios TEXT,
  validado_por UUID,
  fecha_validacion TIMESTAMP,

  -- Fechas
  fecha_subida TIMESTAMP NOT NULL DEFAULT now(),
  fecha_vencimiento TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),

  CONSTRAINT fk_documento_carpeta_digital
    FOREIGN KEY (carpeta_digital_id)
    REFERENCES auth.carpeta_digital(id_carpeta_digital)
    ON DELETE CASCADE,

  CONSTRAINT fk_documento_tipo_documento
    FOREIGN KEY (tipo_documento_id)
    REFERENCES auth.tipo_documento(id_tipo_documento)
    ON DELETE SET NULL,

  CONSTRAINT chk_documento_estado
    CHECK (estado IN ('pendiente', 'validado', 'rechazado', 'vencido'))
);

CREATE INDEX IF NOT EXISTS idx_documento_cd_carpeta
  ON auth.documento_carpeta_digital(carpeta_digital_id);

CREATE INDEX IF NOT EXISTS idx_documento_cd_tipo
  ON auth.documento_carpeta_digital(tipo_documento_id);

CREATE INDEX IF NOT EXISTS idx_documento_cd_rund
  ON auth.documento_carpeta_digital(rund_soporte_id)
  WHERE rund_soporte_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_documento_cd_estado
  ON auth.documento_carpeta_digital(estado);

-- Trigger para updated_at (reutiliza la función definida en migración 309)
DROP TRIGGER IF EXISTS trg_documento_cd_updated_at ON auth.documento_carpeta_digital;
CREATE TRIGGER trg_documento_cd_updated_at
BEFORE UPDATE ON auth.documento_carpeta_digital
FOR EACH ROW
EXECUTE FUNCTION auth.set_carpeta_digital_updated_at();

COMMENT ON TABLE auth.documento_carpeta_digital IS
  'Documentos físicos subidos por la persona en su Carpeta Digital. Une las 3 vistas (portal docente, backoffice carpeta digital, backoffice RUND).';

COMMENT ON COLUMN auth.documento_carpeta_digital.rund_soporte_id IS
  'Enlace OPCIONAL al soporte RUND en academic_work_plan.RundSoporteCampo. Cross-schema, no es FK física.';

COMMENT ON COLUMN auth.documento_carpeta_digital.url_archivo IS
  'Ruta relativa del archivo (gateway-friendly), ej: /pta/api/v1/uploads/carpeta-digital/{nombre}/{tipo}/{file}';
