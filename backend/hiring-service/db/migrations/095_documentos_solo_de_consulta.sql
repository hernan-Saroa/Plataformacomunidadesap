-- ============================================================================
-- 095 · Documentos que la actividad ofrece solo para consulta
--
-- La lista de chequeo de cada actividad (085) tenía dos clases de fila:
-- obligatoria y opcional, y las dos abren un espacio para que el gestor cargue
-- el archivo. Contratación también necesita poner documentos que solo se leen:
-- una guía, una circular, un modelo de referencia. Se ofrecen para descargar
-- junto a lo demás, pero no se entregan, no cuentan como pendientes y no
-- traban nada.
--
-- Una marca en la misma tabla y no una tabla aparte: comparten nombre,
-- descripción, plantilla, alcance por modalidad y tipología, orden y retiro,
-- y el área los administra en la misma lista. Un documento de consulta nunca
-- es obligatorio; el CHECK lo deja escrito para que la pantalla no pueda
-- pedir lo que nadie podría entregar.
-- ============================================================================

BEGIN;

ALTER TABLE hiring.documentos_requeridos
  ADD COLUMN IF NOT EXISTS informativo boolean NOT NULL DEFAULT false;

ALTER TABLE hiring.documentos_requeridos
  DROP CONSTRAINT IF EXISTS ck_documento_informativo_no_obligatorio;

ALTER TABLE hiring.documentos_requeridos
  ADD CONSTRAINT ck_documento_informativo_no_obligatorio
  CHECK (NOT (informativo AND obligatorio));

COMMENT ON COLUMN hiring.documentos_requeridos.informativo IS
  'Solo de consulta: se ofrece su plantilla para descargar y no se carga nada (095).';

COMMIT;
