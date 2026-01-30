-- =====================================================
-- Migration 054: Create tables for tareas and notas on expedientes
-- For Defensa Judicial module - MOD-01
-- =====================================================

SET search_path TO legal_management, public;

-- =====================================================
-- TABLA: Tareas de Expediente
-- =====================================================
CREATE TABLE IF NOT EXISTS legal_management.tareas_expediente (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expediente_id UUID NOT NULL REFERENCES legal_management.expedientes(id) ON DELETE CASCADE,
    
    -- Datos de la tarea
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    fecha_vencimiento TIMESTAMP,
    prioridad VARCHAR(20) DEFAULT 'media' CHECK (prioridad IN ('alta', 'media', 'baja')),
    estado VARCHAR(30) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_proceso', 'completada', 'cancelada')),
    
    -- Asignación
    responsable_id UUID REFERENCES legal_management.abogados(id),
    responsable_nombre VARCHAR(255), -- Backup if responsable is not a registered abogado
    
    -- Fechas
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_completada TIMESTAMP,
    
    -- Auditoría
    creado_por VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para tareas
CREATE INDEX IF NOT EXISTS idx_tareas_expediente_id ON legal_management.tareas_expediente(expediente_id);
CREATE INDEX IF NOT EXISTS idx_tareas_estado ON legal_management.tareas_expediente(estado);
CREATE INDEX IF NOT EXISTS idx_tareas_responsable ON legal_management.tareas_expediente(responsable_id);
CREATE INDEX IF NOT EXISTS idx_tareas_vencimiento ON legal_management.tareas_expediente(fecha_vencimiento);

-- =====================================================
-- TABLA: Notas de Expediente
-- =====================================================
CREATE TABLE IF NOT EXISTS legal_management.notas_expediente (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expediente_id UUID NOT NULL REFERENCES legal_management.expedientes(id) ON DELETE CASCADE,
    
    -- Datos de la nota
    contenido TEXT NOT NULL,
    tipo VARCHAR(30) DEFAULT 'general' CHECK (tipo IN ('importante', 'seguimiento', 'informacion', 'general', 'alerta')),
    
    -- Autor
    autor_id UUID REFERENCES legal_management.abogados(id),
    autor_nombre VARCHAR(255), -- Backup or display name
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para notas
CREATE INDEX IF NOT EXISTS idx_notas_expediente_id ON legal_management.notas_expediente(expediente_id);
CREATE INDEX IF NOT EXISTS idx_notas_tipo ON legal_management.notas_expediente(tipo);
CREATE INDEX IF NOT EXISTS idx_notas_created ON legal_management.notas_expediente(created_at DESC);

-- =====================================================
-- FUNCIÓN: Actualizar updated_at automáticamente
-- =====================================================
CREATE OR REPLACE FUNCTION legal_management.update_tareas_notas_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
DROP TRIGGER IF EXISTS trg_tareas_updated_at ON legal_management.tareas_expediente;
CREATE TRIGGER trg_tareas_updated_at
    BEFORE UPDATE ON legal_management.tareas_expediente
    FOR EACH ROW
    EXECUTE FUNCTION legal_management.update_tareas_notas_timestamp();

DROP TRIGGER IF EXISTS trg_notas_updated_at ON legal_management.notas_expediente;
CREATE TRIGGER trg_notas_updated_at
    BEFORE UPDATE ON legal_management.notas_expediente
    FOR EACH ROW
    EXECUTE FUNCTION legal_management.update_tareas_notas_timestamp();

-- =====================================================
-- COMENTARIOS DE DOCUMENTACIÓN
-- =====================================================
COMMENT ON TABLE legal_management.tareas_expediente IS 'Tareas asociadas a expedientes judiciales para control de actividades';
COMMENT ON TABLE legal_management.notas_expediente IS 'Notas internas de los abogados sobre el expediente';

COMMENT ON COLUMN legal_management.tareas_expediente.prioridad IS 'Nivel de prioridad: alta, media, baja';
COMMENT ON COLUMN legal_management.tareas_expediente.estado IS 'Estado de la tarea: pendiente, en_proceso, completada, cancelada';
COMMENT ON COLUMN legal_management.notas_expediente.tipo IS 'Tipo de nota: importante, seguimiento, informacion, general, alerta';
