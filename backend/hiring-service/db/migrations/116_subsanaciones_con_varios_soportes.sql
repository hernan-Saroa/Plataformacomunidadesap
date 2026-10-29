-- ============================================================================
-- 116 · Subsanaciones con varios soportes y sin transcripción
--
-- La revisión de QA de la 6.5 (EFDS-1158) pidió un registro más corto:
-- proveedor, tipo, fecha, asunto y los archivos. El gestor no transcribe lo
-- que dice el oferente —está en el escrito adjunto— ni su identificación, que
-- ya sale de la oferta. Y un escrito suele venir en más de un archivo: la
-- carta y los documentos que aporta.
--
-- El soporte pasa a ser una lista de documentos, en el orden en que se
-- adjuntaron, igual que los soportes de una devolución (093). Lo que ya
-- existía queda con una lista de uno y se quita la columna vieja, para que no
-- haya dos sitios donde buscar el mismo dato.
--
-- `contenido` deja de ser obligatorio: los escritos ya registrados conservan
-- su transcripción, los nuevos llegan sin ella.
-- ============================================================================

BEGIN;

ALTER TABLE hiring.subsanaciones
  ADD COLUMN IF NOT EXISTS soportes_documento_ids uuid[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN hiring.subsanaciones.soportes_documento_ids IS
  'Archivos del escrito que presentó el oferente, en el orden en que se adjuntaron.';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'hiring' AND table_name = 'subsanaciones'
       AND column_name = 'soporte_documento_id'
  ) THEN
    UPDATE hiring.subsanaciones
       SET soportes_documento_ids = ARRAY[soporte_documento_id]
     WHERE soporte_documento_id IS NOT NULL
       AND cardinality(soportes_documento_ids) = 0;

    ALTER TABLE hiring.subsanaciones DROP COLUMN soporte_documento_id;
  END IF;
END $$;

ALTER TABLE hiring.subsanaciones ALTER COLUMN contenido DROP NOT NULL;

COMMIT;
