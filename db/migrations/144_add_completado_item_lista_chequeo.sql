-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN 144: Agregar campos de estado completado a item_lista_chequeo
-- ═══════════════════════════════════════════════════════════════════════════════
-- PROBLEMA: Los items de las listas de chequeo no persisten el estado de 
--           "completado", causando que al recargar el modal del Kanban se 
--           pierda la marca de las tareas completadas.
--
-- SOLUCIÓN: Agregar columnas para persistir el estado de completado, 
--           fecha, responsable y observaciones de cada item.
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Agregar columna completado (boolean, default false)
ALTER TABLE control_interno.item_lista_chequeo 
ADD COLUMN IF NOT EXISTS completado BOOLEAN DEFAULT false;

-- 2. Agregar columna fecha_completado (timestamp, nullable)
ALTER TABLE control_interno.item_lista_chequeo 
ADD COLUMN IF NOT EXISTS fecha_completado TIMESTAMP NULL;

-- 3. Agregar columna completado_por (quien marcó como completado)
ALTER TABLE control_interno.item_lista_chequeo 
ADD COLUMN IF NOT EXISTS completado_por VARCHAR(255) NULL;

-- 4. Agregar columna observaciones (texto libre para notas del auditor)
ALTER TABLE control_interno.item_lista_chequeo 
ADD COLUMN IF NOT EXISTS observaciones TEXT NULL;

-- 5. Índice para consultas de items completados por lista
CREATE INDEX IF NOT EXISTS idx_item_lista_chequeo_completado 
ON control_interno.item_lista_chequeo(lista_chequeo_id, completado);

-- 6. Comentarios de documentación
COMMENT ON COLUMN control_interno.item_lista_chequeo.completado IS 'Indica si el item ha sido marcado como completado en el tablero Kanban';
COMMENT ON COLUMN control_interno.item_lista_chequeo.fecha_completado IS 'Fecha y hora en que se marcó el item como completado';
COMMENT ON COLUMN control_interno.item_lista_chequeo.completado_por IS 'Usuario que marcó el item como completado';
COMMENT ON COLUMN control_interno.item_lista_chequeo.observaciones IS 'Observaciones o notas adicionales del auditor sobre este item';

-- ═══════════════════════════════════════════════════════════════════════════════
-- FIN DE MIGRACIÓN 144
-- ═══════════════════════════════════════════════════════════════════════════════
