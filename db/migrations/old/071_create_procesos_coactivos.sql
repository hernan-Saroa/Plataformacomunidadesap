-- Migración: Crear tabla procesos_coactivos
-- Módulo: Procesos Coactivos (Gestión Legal)

-- Crear tipo ENUM para estados
DO $$ BEGIN
    CREATE TYPE estado_proceso_coactivo AS ENUM (
        'IDENTIFICADO',
        'PERSUASIVO', 
        'PREJURIDICO',
        'MANDAMIENTO',
        'EMBARGO',
        'FINALIZADO'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Crear tabla procesos_coactivos
CREATE TABLE IF NOT EXISTS procesos_coactivos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    radicado VARCHAR(50) UNIQUE NOT NULL,
    
    -- Información del deudor (JSONB)
    deudor JSONB NOT NULL DEFAULT '{}',
    -- Estructura esperada:
    -- {
    --   "nombre": "string",
    --   "identificacion": "string",
    --   "telefono": "string",
    --   "email": "string",
    --   "direccion": "string"
    -- }
    
    -- Información de la obligación (JSONB)
    obligacion JSONB NOT NULL DEFAULT '{}',
    -- Estructura esperada:
    -- {
    --   "concepto": "string",
    --   "valor": number,
    --   "fechaVencimiento": "date string"
    -- }
    
    estado estado_proceso_coactivo DEFAULT 'IDENTIFICADO',
    responsable VARCHAR(255),
    documentos_adjuntos INTEGER DEFAULT 0,
    notificaciones_enviadas INTEGER DEFAULT 0,
    observaciones TEXT,
    ultima_actuacion TIMESTAMP,
    
    -- Timestamps
    fecha_creacion TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_procesos_coactivos_radicado ON procesos_coactivos(radicado);
CREATE INDEX IF NOT EXISTS idx_procesos_coactivos_estado ON procesos_coactivos(estado);
CREATE INDEX IF NOT EXISTS idx_procesos_coactivos_fecha ON procesos_coactivos(fecha_creacion DESC);

-- Índice GIN para búsqueda en JSONB
CREATE INDEX IF NOT EXISTS idx_procesos_coactivos_deudor ON procesos_coactivos USING GIN (deudor);

-- Comentarios
COMMENT ON TABLE procesos_coactivos IS 'Tabla de procesos de cobro coactivo - Módulo Gestión Legal';
COMMENT ON COLUMN procesos_coactivos.deudor IS 'Información del deudor en formato JSON (nombre, identificacion, telefono, email, direccion)';
COMMENT ON COLUMN procesos_coactivos.obligacion IS 'Información de la obligación en formato JSON (concepto, valor, fechaVencimiento)';
