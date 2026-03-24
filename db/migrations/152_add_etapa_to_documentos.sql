-- Migration 152: Agregar campo etapa a documentos
-- Para registrar en qué etapa procesal se incorporó cada documento

ALTER TABLE legal_management.documentos
ADD COLUMN IF NOT EXISTS etapa VARCHAR(100) DEFAULT NULL;

-- Backfill: para documentos existentes, intentar inferir la etapa desde el expediente
UPDATE legal_management.documentos d
SET etapa = e.etapa_procesal
FROM legal_management.expedientes e
WHERE d.expediente_id = e.id
AND d.etapa IS NULL
AND e.etapa_procesal IS NOT NULL;

COMMENT ON COLUMN legal_management.documentos.etapa IS 'Etapa procesal en la que fue incorporado el documento';
