-- ============================================================================
-- 124 · Correo al supervisor con sus documentos
--
-- La matriz pide en la 8.2 que se le avise al supervisor de su designación.
-- Hasta aquí el módulo no enviaba nada: quien designaba tenía que escribirle
-- por fuera y luego dejar constancia con «Ya se le comunicó».
--
-- Desde aquí, al designar (8.2) o reasignar (9.3) sale un correo a la cuenta
-- designada con el acto y los documentos que quien designa quiera mandarle
-- —el contrato, el estudio previo, la propuesta—. Esos documentos quedan en el
-- expediente en la 8.2, y la designación recuerda cuáles le mandó para poder
-- reenviarlos.
--
--   · `anexos_correo`: los documentos del expediente que acompañan el correo,
--     además del acto.
--   · `mensaje_correo`: lo que quien designa le escribió, si algo.
--   · `alerta_enviada_at` ya existía: ahora la marca el envío. «Ya se le
--     comunicó» sigue para cuando el correo no sale y se le avisa por fuera.
--
-- Idempotente: correrla otra vez deja lo mismo.
-- ============================================================================

BEGIN;

ALTER TABLE hiring.supervisiones_contrato
  ADD COLUMN IF NOT EXISTS anexos_correo uuid[] NOT NULL DEFAULT '{}';
ALTER TABLE hiring.supervisiones_contrato
  ADD COLUMN IF NOT EXISTS mensaje_correo text;

COMMENT ON COLUMN hiring.supervisiones_contrato.anexos_correo IS
  'Documentos del expediente que se le mandan al supervisor con el acto (124).';
COMMENT ON COLUMN hiring.supervisiones_contrato.mensaje_correo IS
  'Lo que quien designa le escribió al supervisor en el correo (124).';

COMMIT;
