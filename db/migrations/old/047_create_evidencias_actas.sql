-- Create evidencias table
CREATE TABLE IF NOT EXISTS legal_management.evidencias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expediente_id UUID NOT NULL REFERENCES legal_management.expedientes(id) ON DELETE CASCADE,
    descripcion TEXT,
    aportado_por VARCHAR(255),
    fecha_presentacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    archivo_nombre VARCHAR(255),
    archivo_url TEXT,
    archivo_tamano INTEGER,
    tipo VARCHAR(100),
    prioridad VARCHAR(20) CHECK (prioridad IN ('Alta', 'Media', 'Baja')),
    estado VARCHAR(50) DEFAULT 'En Revisión' CHECK (estado IN ('En Revisión', 'Admitida')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create actas table
CREATE TABLE IF NOT EXISTS legal_management.actas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expediente_id UUID NOT NULL REFERENCES legal_management.expedientes(id) ON DELETE CASCADE,
    numero_acta VARCHAR(100),
    fecha DATE,
    horario VARCHAR(50),
    duracion VARCHAR(50),
    lugar VARCHAR(255),
    presidente VARCHAR(255),
    participantes TEXT, -- Can store JSON or comma-separated list
    resumen TEXT,
    decisiones_tomadas TEXT,
    estado VARCHAR(50) DEFAULT 'Programada' CHECK (estado IN ('Programada', 'Firmada')),
    archivo_nombre VARCHAR(255),
    archivo_url TEXT,
    archivo_tamano INTEGER,
    tipo VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_evidencias_expediente_id ON legal_management.evidencias(expediente_id);
CREATE INDEX idx_actas_expediente_id ON legal_management.actas(expediente_id);
