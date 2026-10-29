-- ============================================================================
-- 127 · Observaciones al proyecto de pliego por interesado (EFDS-1151)
--
-- Revisión de QA (2026-10-15): las observaciones llegan por SECOP y el
-- abogado estructurador las consolida. Se registra una fila por interesado
-- —observación general, identificación tal como aparece en SECOP (opcional) y
-- los archivos con el detalle—, no una por observación. Y lo habitual es
-- responderlas en un solo documento para toda la actividad.
--
-- - `soportes_documento_ids`: varios archivos por interesado (antes uno, en
--   `documento_id`, que se copia aquí y deja de usarse).
-- - `respuesta_soportes_ids` y `respuesta_general`: el documento de
--   respuestas, que puede cubrir a todos los interesados pendientes a la vez.
-- - `presentado_por` y `asunto` dejan de ser obligatorios.
-- - «¿Generó modificación del pliego?» queda informativo: la respuesta ya no
--   exige `modifico_pliego`.
--
-- Idempotente.
-- ============================================================================

BEGIN;

ALTER TABLE hiring.observaciones_pliego
  ADD COLUMN IF NOT EXISTS soportes_documento_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS respuesta_soportes_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS respuesta_general boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN hiring.observaciones_pliego.soportes_documento_ids IS
  'Archivos con el detalle de lo que observó el interesado, en el orden en que se adjuntaron (127).';
COMMENT ON COLUMN hiring.observaciones_pliego.respuesta_soportes_ids IS
  'Documento(s) de respuesta. En una respuesta general es el mismo arreglo para todos los interesados que cubrió (127).';

UPDATE hiring.observaciones_pliego
   SET soportes_documento_ids = ARRAY[documento_id]
 WHERE documento_id IS NOT NULL
   AND cardinality(soportes_documento_ids) = 0;

ALTER TABLE hiring.observaciones_pliego ALTER COLUMN presentado_por DROP NOT NULL;
ALTER TABLE hiring.observaciones_pliego ALTER COLUMN asunto DROP NOT NULL;

ALTER TABLE hiring.observaciones_pliego DROP CONSTRAINT IF EXISTS observacion_respuesta_completa;
ALTER TABLE hiring.observaciones_pliego ADD CONSTRAINT observacion_respuesta_completa CHECK (
  (respuesta IS NULL AND respondida_at IS NULL)
  OR (respuesta IS NOT NULL AND respondida_at IS NOT NULL)
);

COMMIT;
