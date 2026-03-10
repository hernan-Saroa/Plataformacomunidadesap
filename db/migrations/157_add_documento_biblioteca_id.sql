-- ============================================================================
-- MIGRACIÓN 157: Agregar documento_biblioteca_id a control_interno.documento
-- Fecha: 2026-03-09
-- Descripción: Permite vincular un documento subido (por el auditor) con la
--              plantilla/maestro de la biblioteca. Documentos de biblioteca
--              tienen auditoria_id NULL; los subidos tienen auditoria_id +
--              documento_biblioteca_id (referencia a la plantilla que cumplen).
-- ============================================================================

BEGIN;

-- Agregar columna documento_biblioteca_id (referencia a documento plantilla)
ALTER TABLE control_interno.documento
ADD COLUMN IF NOT EXISTS documento_biblioteca_id UUID;

-- FK hacia la misma tabla (documento plantilla)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_documento_biblioteca'
  ) THEN
    ALTER TABLE control_interno.documento
    ADD CONSTRAINT fk_documento_biblioteca
    FOREIGN KEY (documento_biblioteca_id) 
    REFERENCES control_interno.documento(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_documento_biblioteca_id 
ON control_interno.documento(documento_biblioteca_id);

COMMIT;
