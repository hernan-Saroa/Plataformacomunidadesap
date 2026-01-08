-- ============================================
-- MIGRACIÓN 071: Crear tabla historial_plan_anual
-- ============================================
-- Descripción: Tabla para auditoría y trazabilidad del Plan Anual 5 Roles
-- Fecha: Enero 2026
-- ============================================

CREATE TABLE IF NOT EXISTS control_interno.historial_plan_anual (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL,
    tipo_evento VARCHAR(50) NOT NULL CHECK (tipo_evento IN (
        'creacion', 'actualizacion', 'aprobacion', 
        'actividad_creada', 'actividad_actualizada', 'actividad_eliminada',
        'cambio_estado'
    )),
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    usuario_id BIGINT NOT NULL,
    accion VARCHAR(255) NOT NULL,
    descripcion TEXT,
    observaciones TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    -- Cambios estructurados: Array JSONB con formato [{campo: string, valorAnterior: string, valorNuevo: string}]
    cambios JSONB DEFAULT '[]'::jsonb,
    estado_anterior VARCHAR(50),
    estado_nuevo VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_historial_plan_anual FOREIGN KEY (plan_id) 
        REFERENCES control_interno.plan_anual_5_roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_historial_plan_usuario FOREIGN KEY (usuario_id) 
        REFERENCES auth.personas(id_tercero) ON DELETE RESTRICT
);

-- Índices para mejorar el rendimiento de consultas
CREATE INDEX IF NOT EXISTS idx_historial_plan_anual_plan ON control_interno.historial_plan_anual(plan_id);
CREATE INDEX IF NOT EXISTS idx_historial_plan_anual_usuario ON control_interno.historial_plan_anual(usuario_id);
CREATE INDEX IF NOT EXISTS idx_historial_plan_anual_tipo ON control_interno.historial_plan_anual(tipo_evento);
CREATE INDEX IF NOT EXISTS idx_historial_plan_anual_fecha ON control_interno.historial_plan_anual(fecha, hora);
-- Índice GIN para búsquedas eficientes en el campo JSONB de cambios
CREATE INDEX IF NOT EXISTS idx_historial_plan_cambios_gin ON control_interno.historial_plan_anual USING GIN (cambios);

-- Comentarios para documentación
COMMENT ON TABLE control_interno.historial_plan_anual IS 'Historial de cambios y auditoría del Plan Anual 5 Roles. Registra todas las operaciones CRUD para trazabilidad y compliance.';
COMMENT ON COLUMN control_interno.historial_plan_anual.tipo_evento IS 'Tipo de evento: creacion, actualizacion, aprobacion, actividad_creada, actividad_actualizada, actividad_eliminada, cambio_estado';
COMMENT ON COLUMN control_interno.historial_plan_anual.cambios IS 'Array JSONB con formato [{campo: string, valorAnterior: string, valorNuevo: string}]';
COMMENT ON COLUMN control_interno.historial_plan_anual.usuario_id IS 'FK a auth.personas(id_tercero) - Usuario que realizó la acción';

