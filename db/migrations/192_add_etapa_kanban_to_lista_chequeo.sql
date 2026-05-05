-- =====================================================================
-- Migración 192: Agregar etapa_kanban_id y etapa_kanban_nombre a lista_chequeo
-- Fecha: 2026-04-17
-- Propósito: Alinear la tabla lista_chequeo con la entidad TypeORM
--            ListaChequeo que ya define estas columnas.
-- =====================================================================

ALTER TABLE control_interno.lista_chequeo
  ADD COLUMN IF NOT EXISTS etapa_kanban_id UUID NULL,
  ADD COLUMN IF NOT EXISTS etapa_kanban_nombre VARCHAR(255) NULL;

COMMENT ON COLUMN control_interno.lista_chequeo.etapa_kanban_id IS
  'ID de la etapa en tabla etapa_kanban (FK lógica - estable aunque cambie el nombre)';

COMMENT ON COLUMN control_interno.lista_chequeo.etapa_kanban_nombre IS
  'Nombre de la etapa al momento de guardar (snapshot para mostrar aunque cambie la configuración)';

-- Índice para búsquedas por etapa kanban ID
CREATE INDEX IF NOT EXISTS idx_lista_chequeo_etapa_kanban_id
  ON control_interno.lista_chequeo(etapa_kanban_id);
