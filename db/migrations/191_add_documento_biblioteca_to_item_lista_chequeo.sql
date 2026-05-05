-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN 191: Agrega campos de plantilla asociada a item_lista_chequeo
-- ═══════════════════════════════════════════════════════════════════════════
-- Permite asociar un documento de la biblioteca a cada ítem de lista de chequeo

ALTER TABLE control_interno.item_lista_chequeo
  ADD COLUMN IF NOT EXISTS documento_biblioteca_id VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS documento_nombre VARCHAR(500) NULL;

COMMENT ON COLUMN control_interno.item_lista_chequeo.documento_biblioteca_id IS 'ID del documento en la biblioteca de plantillas asociado a este ítem';
COMMENT ON COLUMN control_interno.item_lista_chequeo.documento_nombre IS 'Nombre del documento de la biblioteca asociado (snapshot)';
