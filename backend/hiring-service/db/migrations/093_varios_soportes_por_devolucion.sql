-- ============================================================================
-- 093 · Varios soportes por devolución
--
-- La 091 dejó que una devolución llevara un archivo con las correcciones, pero
-- solo uno. Quien devuelve suele tener más de uno: el estudio previo marcado y
-- el anexo técnico marcado, o el documento y una hoja con observaciones. Con
-- un único soporte tenía que unirlos a mano o dejar alguno por fuera.
--
-- La revisión pasa a señalar una lista de documentos. Se conserva el orden en
-- que se adjuntaron, que es el orden en que se muestran.
--
-- Lo que ya existía se traslada: la revisión que tenía su soporte queda con
-- una lista de uno. Después se quita la columna vieja, para que no queden dos
-- sitios donde buscar el mismo dato.
-- ============================================================================

BEGIN;

ALTER TABLE hiring.revisiones
  ADD COLUMN IF NOT EXISTS soportes_documento_ids uuid[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN hiring.revisiones.soportes_documento_ids IS
  'Archivos que acompañan una devolución, en el orden en que se adjuntaron: las correcciones marcadas sobre los documentos. Solo los adjunta quien devolvió.';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'hiring' AND table_name = 'revisiones'
       AND column_name = 'soporte_documento_id'
  ) THEN
    UPDATE hiring.revisiones
       SET soportes_documento_ids = ARRAY[soporte_documento_id]
     WHERE soporte_documento_id IS NOT NULL
       AND cardinality(soportes_documento_ids) = 0;

    ALTER TABLE hiring.revisiones DROP COLUMN soporte_documento_id;
  END IF;
END $$;

COMMIT;
