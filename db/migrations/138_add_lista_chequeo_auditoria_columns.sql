-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN: Agregar columnas de vinculación con auditoría a lista_chequeo
-- Fecha: 2026-02-20
-- ═══════════════════════════════════════════════════════════════════════════

-- Agregar columna auditoria_id
ALTER TABLE control_interno.lista_chequeo 
ADD COLUMN IF NOT EXISTS auditoria_id UUID;

-- Agregar columna nombre_auditoria
ALTER TABLE control_interno.lista_chequeo 
ADD COLUMN IF NOT EXISTS nombre_auditoria VARCHAR(500);

-- Agregar columna auditor_responsable
ALTER TABLE control_interno.lista_chequeo 
ADD COLUMN IF NOT EXISTS auditor_responsable VARCHAR(255);

-- Agregar columna fecha_aplicacion
ALTER TABLE control_interno.lista_chequeo 
ADD COLUMN IF NOT EXISTS fecha_aplicacion DATE;

-- Agregar columna fecha_diligenciamiento
ALTER TABLE control_interno.lista_chequeo 
ADD COLUMN IF NOT EXISTS fecha_diligenciamiento DATE;

-- Agregar columna items_completados
ALTER TABLE control_interno.lista_chequeo 
ADD COLUMN IF NOT EXISTS items_completados INTEGER DEFAULT 0;

-- Agregar columna cumplimiento
ALTER TABLE control_interno.lista_chequeo 
ADD COLUMN IF NOT EXISTS cumplimiento INTEGER DEFAULT 0;

-- Agregar constraint para cumplimiento (0-100)
ALTER TABLE control_interno.lista_chequeo
DROP CONSTRAINT IF EXISTS lista_chequeo_cumplimiento_check;

ALTER TABLE control_interno.lista_chequeo
ADD CONSTRAINT lista_chequeo_cumplimiento_check CHECK ((cumplimiento >= 0) AND (cumplimiento <= 100));

-- Agregar columna no_cumplimientos
ALTER TABLE control_interno.lista_chequeo 
ADD COLUMN IF NOT EXISTS no_cumplimientos INTEGER DEFAULT 0;

-- Agregar columna no_aplica
ALTER TABLE control_interno.lista_chequeo 
ADD COLUMN IF NOT EXISTS no_aplica INTEGER DEFAULT 0;

-- Agregar columna hallazgos_generados
ALTER TABLE control_interno.lista_chequeo 
ADD COLUMN IF NOT EXISTS hallazgos_generados INTEGER DEFAULT 0;

-- Índice para buscar por auditoría
CREATE INDEX IF NOT EXISTS idx_lista_chequeo_auditoria_id 
ON control_interno.lista_chequeo(auditoria_id) 
WHERE auditoria_id IS NOT NULL;

-- Log
DO $$
BEGIN
  RAISE NOTICE '✅ Columnas de auditoría agregadas a control_interno.lista_chequeo (incluye: no_cumplimientos, no_aplica, hallazgos_generados)';
END $$;
