-- ============================================
-- Migración 068: Crear tabla criterio_auditoria si no existe
-- Fecha: 2026-01-08
-- Descripción: Crea la tabla criterio_auditoria que almacena los criterios de auditoría
--              (normas, políticas, estándares aplicables)
-- ============================================

-- Crear tabla criterio_auditoria si no existe
CREATE TABLE IF NOT EXISTS control_interno.criterio_auditoria (
    id SERIAL PRIMARY KEY,
    auditoria_id UUID NOT NULL,
    criterio TEXT NOT NULL,
    orden INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_criterio_auditoria FOREIGN KEY (auditoria_id) 
        REFERENCES control_interno.auditoria(id) ON DELETE CASCADE
);

-- Crear índices si no existen
CREATE INDEX IF NOT EXISTS idx_criterio_auditoria_auditoria_id 
ON control_interno.criterio_auditoria(auditoria_id);

CREATE INDEX IF NOT EXISTS idx_criterio_auditoria_activo 
ON control_interno.criterio_auditoria(activo);

-- Agregar comentario
COMMENT ON TABLE control_interno.criterio_auditoria IS 
'Criterios de auditoría (normas, políticas, estándares aplicables)';

