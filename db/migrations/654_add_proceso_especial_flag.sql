-- Migration 654: Marca de proceso especial en proceso_auditable (EFDS-1923)
-- Schema: control_interno
-- Reemplaza la marca que vivía en localStorage (`esap_esp_process_ids`).

ALTER TABLE control_interno.proceso_auditable
ADD COLUMN IF NOT EXISTS es_especial BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_proceso_auditable_es_especial
ON control_interno.proceso_auditable(es_especial)
WHERE es_especial = TRUE;

COMMENT ON COLUMN control_interno.proceso_auditable.es_especial IS
'Proceso Especial (EFDS-1923): va directo a Programación sin pasar por Universo Auditable. El subtipo lo determina tipo_proceso_id.';
