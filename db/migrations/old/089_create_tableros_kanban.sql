-- ============================================
-- MIGRACIÓN 089: Crear tablas para Tableros Kanban
-- ============================================
-- Este script crea las tablas necesarias para la configuración
-- de tableros Kanban (tableros y etapas)
-- ============================================

-- Crear tabla tablero_kanban
CREATE TABLE IF NOT EXISTS control_interno.tablero_kanban (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('auditorias', 'planes_mejoramiento')),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Crear índices para tablero_kanban
CREATE INDEX IF NOT EXISTS idx_tablero_kanban_tipo ON control_interno.tablero_kanban(tipo);
CREATE INDEX IF NOT EXISTS idx_tablero_kanban_activo ON control_interno.tablero_kanban(activo);
CREATE INDEX IF NOT EXISTS idx_tablero_kanban_deleted_at ON control_interno.tablero_kanban(deleted_at) WHERE deleted_at IS NULL;

-- Crear tabla etapa_kanban
CREATE TABLE IF NOT EXISTS control_interno.etapa_kanban (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tablero_kanban_id UUID NOT NULL REFERENCES control_interno.tablero_kanban(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    orden INTEGER NOT NULL,
    color VARCHAR(7) NOT NULL, -- Hex color
    tiempo_sla INTEGER NOT NULL DEFAULT 0, -- días
    limite_wip INTEGER, -- null = sin límite
    visible BOOLEAN NOT NULL DEFAULT TRUE,
    notificar_vencimiento BOOLEAN NOT NULL DEFAULT FALSE,
    dias_anticipacion_alerta INTEGER NOT NULL DEFAULT 0,
    estado VARCHAR(20) NOT NULL DEFAULT 'intermedia' CHECK (estado IN ('inicial', 'intermedia', 'final')),
    permitir_retroceso BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Crear índices para etapa_kanban
CREATE INDEX IF NOT EXISTS idx_etapa_kanban_tablero_orden ON control_interno.etapa_kanban(tablero_kanban_id, orden);
CREATE INDEX IF NOT EXISTS idx_etapa_kanban_deleted_at ON control_interno.etapa_kanban(deleted_at) WHERE deleted_at IS NULL;

-- Comentarios en las tablas
COMMENT ON TABLE control_interno.tablero_kanban IS 'Configuración de tableros Kanban para auditorías y planes de mejoramiento';
COMMENT ON TABLE control_interno.etapa_kanban IS 'Etapas configuradas para cada tablero Kanban';

-- Comentarios en columnas importantes
COMMENT ON COLUMN control_interno.tablero_kanban.tipo IS 'Tipo de tablero: auditorias o planes_mejoramiento';
COMMENT ON COLUMN control_interno.etapa_kanban.tiempo_sla IS 'Tiempo SLA en días hábiles para esta etapa';
COMMENT ON COLUMN control_interno.etapa_kanban.limite_wip IS 'Límite de elementos en progreso (null = sin límite)';
COMMENT ON COLUMN control_interno.etapa_kanban.estado IS 'Estado de la etapa: inicial, intermedia o final';

