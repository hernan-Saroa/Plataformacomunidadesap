-- =====================================================================
-- Migración 190: Agregar etapa_kanban_id y etapa_kanban_nombre a documento
-- Fecha: 2026-04-15
-- Propósito: Almacenar el ID y el nombre de la etapa Kanban en el documento
--            para que sea estable aunque se cambie el nombre de la etapa.
-- =====================================================================

ALTER TABLE control_interno.documento
  ADD COLUMN IF NOT EXISTS etapa_kanban_id UUID NULL,
  ADD COLUMN IF NOT EXISTS etapa_kanban_nombre VARCHAR(255) NULL;

COMMENT ON COLUMN control_interno.documento.etapa_kanban_id IS
  'ID de la etapa en tabla etapa_kanban (FK lógica - estable aunque cambie el nombre)';

COMMENT ON COLUMN control_interno.documento.etapa_kanban_nombre IS
  'Nombre de la etapa al momento de guardar (snapshot para mostrar aunque cambie la configuración)';

-- Índice para búsquedas por etapa kanban ID
CREATE INDEX IF NOT EXISTS idx_documento_etapa_kanban_id
  ON control_interno.documento(etapa_kanban_id);
