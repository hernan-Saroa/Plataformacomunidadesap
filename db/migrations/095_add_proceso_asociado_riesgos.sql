-- =====================================================
-- Migración: Agregar asociación de Riesgos con Procesos
-- Schema: legal_management
-- Módulo: Riesgos (MOD-10)
-- =====================================================

SET search_path TO legal_management, public;

-- =====================================================
-- Agregar columnas para asociar riesgo con proceso específico
-- Las columnas son NULLABLE para compatibilidad con riesgos existentes
-- =====================================================

ALTER TABLE riesgos 
ADD COLUMN IF NOT EXISTS modulo_origen VARCHAR(50),
ADD COLUMN IF NOT EXISTS proceso_id UUID,
ADD COLUMN IF NOT EXISTS proceso_radicado VARCHAR(100);

-- Comentarios descriptivos
COMMENT ON COLUMN riesgos.modulo_origen IS 'Módulo fuente: DEFENSA_JUDICIAL, JUZGAMIENTO, ASESORIA_JURIDICA, COACTIVOS, ORGANOS_CONTROL';
COMMENT ON COLUMN riesgos.proceso_id IS 'UUID del proceso asociado en el módulo correspondiente';
COMMENT ON COLUMN riesgos.proceso_radicado IS 'Radicado o número del proceso para referencia rápida';

-- =====================================================
-- Índices para búsquedas eficientes
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_riesgos_modulo_origen ON riesgos(modulo_origen);
CREATE INDEX IF NOT EXISTS idx_riesgos_proceso_id ON riesgos(proceso_id);
CREATE INDEX IF NOT EXISTS idx_riesgos_proceso_radicado ON riesgos(proceso_radicado);

-- =====================================================
-- Verificación
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Migración 095_add_proceso_asociado_riesgos.sql ejecutada correctamente';
    RAISE NOTICE '   - Columna modulo_origen agregada';
    RAISE NOTICE '   - Columna proceso_id agregada';
    RAISE NOTICE '   - Columna proceso_radicado agregada';
    RAISE NOTICE '   - Índices creados';
    RAISE NOTICE '   - Los riesgos existentes mantienen NULL en estos campos (compatibilidad)';
END $$;
