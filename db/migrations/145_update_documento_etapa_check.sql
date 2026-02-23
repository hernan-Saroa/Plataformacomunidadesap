-- ============================================================================
-- MIGRACIÓN: Actualizar constraint de etapa en documento
-- Fecha: 2026-02-23
-- Descripción: Actualiza el check constraint de etapa para soportar todas las
--              fases de auditoría: planificacion, ejecucion, hallazgos, 
--              comunicacion, comunicacion_resultados, seguimiento, cierre
-- ============================================================================

BEGIN;

-- Eliminar el constraint existente
ALTER TABLE control_interno.documento
DROP CONSTRAINT IF EXISTS documento_etapa_check;

-- Crear nuevo constraint con todos los valores permitidos
ALTER TABLE control_interno.documento
ADD CONSTRAINT documento_etapa_check CHECK (
    etapa IS NULL OR 
    etapa IN (
        'planificacion', 
        'planeacion',
        'ejecucion', 
        'hallazgos',
        'comunicacion',
        'comunicacion_resultados', 
        'seguimiento', 
        'cierre'
    )
);

COMMIT;

