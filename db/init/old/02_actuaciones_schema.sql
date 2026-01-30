-- ============================================
-- Tabla: actuaciones
-- ============================================
CREATE TABLE IF NOT EXISTS legal_management.actuaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expediente_id UUID NOT NULL,
    tipo_actuacion VARCHAR(100) NOT NULL, -- AUTO_ADMISORIO, PRUEBAS, FALLO, etc.
    descripcion TEXT,
    fecha_actuacion TIMESTAMP NOT NULL,
    documento_url VARCHAR(255),
    documento_nombre VARCHAR(255),
    usuario_responsable VARCHAR(100) DEFAULT 'Sistema',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_expediente
        FOREIGN KEY(expediente_id) 
        REFERENCES legal_management.expedientes(id)
        ON DELETE CASCADE
);

-- Index para búsquedas rápidas por expediente
CREATE INDEX IF NOT EXISTS idx_actuaciones_expediente ON legal_management.actuaciones(expediente_id);

-- ============================================
-- Seed Data de Prueba (Solo si existen expedientes)
-- ============================================
DO $$
DECLARE
    expediente_id UUID;
BEGIN
    -- Intentar obtener un ID real de expedientes
    SELECT id INTO expediente_id FROM legal_management.expedientes LIMIT 1;

    IF expediente_id IS NOT NULL THEN
        INSERT INTO legal_management.actuaciones (expediente_id, tipo_actuacion, descripcion, fecha_actuacion, usuario_responsable)
        VALUES 
        (expediente_id, 'AUTO_AVOCAMIENTO', 'Se avoca conocimiento del proceso disciplinario.', NOW() - INTERVAL '10 days', 'Dr. Carlos Mendoza'),
        (expediente_id, 'NOTIFICACION', 'Notificación personal al investigado.', NOW() - INTERVAL '8 days', 'Secretaría'),
        (expediente_id, 'TRASLADO_DESCARGOS', 'Se corre traslado para alegatos de conclusión.', NOW(), 'Dr. Carlos Mendoza')
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
