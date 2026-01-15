-- ============================================
-- 073_create_riesgo_historial.sql
-- Crear tabla para historial de cambios de riesgos
-- ============================================

-- Crear tabla riesgo_historial
CREATE TABLE IF NOT EXISTS legal_management.riesgo_historial (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    riesgo_id UUID NOT NULL REFERENCES legal_management.riesgos(id) ON DELETE CASCADE,
    tipo_evento VARCHAR(50) NOT NULL,
    descripcion TEXT NOT NULL,
    campo_modificado VARCHAR(100),
    valor_anterior TEXT,
    valor_nuevo TEXT,
    usuario VARCHAR(200) DEFAULT 'Sistema',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_riesgo_historial_riesgo_id 
    ON legal_management.riesgo_historial(riesgo_id);
    
CREATE INDEX IF NOT EXISTS idx_riesgo_historial_created_at 
    ON legal_management.riesgo_historial(created_at DESC);

-- Comentarios de documentación
COMMENT ON TABLE legal_management.riesgo_historial IS 'Historial de cambios y eventos de riesgos para trazabilidad';
COMMENT ON COLUMN legal_management.riesgo_historial.tipo_evento IS 'Tipo: CREACION, ACTUALIZACION, CAMBIO_ETAPA, CAMBIO_ZONA, ARCHIVADO, CONTROL_AGREGADO, etc.';
COMMENT ON COLUMN legal_management.riesgo_historial.campo_modificado IS 'Campo que fue modificado (e.g. etapa, probabilidad, impacto)';
COMMENT ON COLUMN legal_management.riesgo_historial.valor_anterior IS 'Valor antes del cambio';
COMMENT ON COLUMN legal_management.riesgo_historial.valor_nuevo IS 'Valor después del cambio';
