-- ============================================================================
-- 011 · Soporte documental del CDP
--
-- Actividad 4.4 de la matriz: "se debe cargar el cdp para consulta en las
-- siguientes etapas".
--
-- El CDP es dos cosas a la vez: unos datos que el sistema usa para decidir
-- (¿está expedido?, ¿por cuánto?, ¿cuándo vence?) y un documento firmado que
-- prueba lo que esos datos afirman. 010 modeló lo primero; esto ata lo segundo.
--
-- Sin esta referencia el vínculo sería por convención —"el documento con
-- numeral 4.4 del expediente"— y al anular un CDP y expedir otro no habría
-- forma de saber qué soporte corresponde a cuál.
-- ============================================================================

ALTER TABLE hiring.cdp
  ADD COLUMN IF NOT EXISTS documento_id uuid REFERENCES hiring.documentos (id);

COMMENT ON COLUMN hiring.cdp.documento_id IS
  'Soporte documental del CDP en el expediente (actividad 4.4).';

CREATE INDEX IF NOT EXISTS idx_cdp_documento ON hiring.cdp (documento_id);

-- Un mismo documento no puede ser el soporte de dos CDP distintos.
CREATE UNIQUE INDEX IF NOT EXISTS idx_cdp_documento_unico
  ON hiring.cdp (documento_id)
  WHERE documento_id IS NOT NULL;
