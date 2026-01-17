-- ============================================
-- MIGRACIÓN 087: Crear tabla tipo_auditoria
-- ============================================
-- Este script crea la tabla para gestionar los tipos de auditoría
-- configurables del sistema (Regular, Territorial, Especial, etc.)
-- Con soporte para soft delete
-- ============================================

-- Crear tabla tipo_auditoria
CREATE TABLE IF NOT EXISTS control_interno.tipo_auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(255) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    alcance TEXT,
    duracion_promedio INTEGER NOT NULL DEFAULT 30 CHECK (duracion_promedio > 0),
    equipo_promedio INTEGER NOT NULL DEFAULT 3 CHECK (equipo_promedio > 0),
    color VARCHAR(7) NOT NULL DEFAULT '#3B82F6',
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    auditorias_programadas INTEGER NOT NULL DEFAULT 0 CHECK (auditorias_programadas >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_tipo_auditoria_codigo ON control_interno.tipo_auditoria(codigo);
CREATE INDEX IF NOT EXISTS idx_tipo_auditoria_activa ON control_interno.tipo_auditoria(activa);
CREATE INDEX IF NOT EXISTS idx_tipo_auditoria_deleted_at ON control_interno.tipo_auditoria(deleted_at) WHERE deleted_at IS NULL;

-- Comentarios
COMMENT ON TABLE control_interno.tipo_auditoria IS 'Tipos de auditoría configurables del sistema (Regular, Territorial, Especial)';
COMMENT ON COLUMN control_interno.tipo_auditoria.codigo IS 'Código único del tipo (ej: AUD-REG, AUD-TERR)';
COMMENT ON COLUMN control_interno.tipo_auditoria.nombre IS 'Nombre descriptivo del tipo de auditoría';
COMMENT ON COLUMN control_interno.tipo_auditoria.descripcion IS 'Descripción detallada del tipo de auditoría';
COMMENT ON COLUMN control_interno.tipo_auditoria.alcance IS 'Alcance general del tipo de auditoría';
COMMENT ON COLUMN control_interno.tipo_auditoria.duracion_promedio IS 'Duración promedio en días';
COMMENT ON COLUMN control_interno.tipo_auditoria.equipo_promedio IS 'Número promedio de personas en el equipo';
COMMENT ON COLUMN control_interno.tipo_auditoria.color IS 'Color hexadecimal para representación visual';
COMMENT ON COLUMN control_interno.tipo_auditoria.activa IS 'Indica si el tipo está activo y disponible';
COMMENT ON COLUMN control_interno.tipo_auditoria.auditorias_programadas IS 'Contador de auditorías programadas con este tipo';
COMMENT ON COLUMN control_interno.tipo_auditoria.deleted_at IS 'Fecha de eliminación (soft delete)';

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION control_interno.update_tipo_auditoria_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tipo_auditoria_updated_at
    BEFORE UPDATE ON control_interno.tipo_auditoria
    FOR EACH ROW
    EXECUTE FUNCTION control_interno.update_tipo_auditoria_updated_at();
