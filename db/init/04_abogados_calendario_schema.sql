-- 04_abogados_calendario_schema.sql

-- Tabla de Abogados Sustanciadores
CREATE TABLE IF NOT EXISTS abogados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre_completo VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    telefono VARCHAR(50),
    especialidad VARCHAR(100),
    fecha_ingreso DATE NOT NULL,
    estado VARCHAR(50) DEFAULT 'ACTIVO', -- 'ACTIVO', 'INACTIVO', 'LICENCIA'
    foto_url TEXT,
    auditoria_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    auditoria_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Audiencias
CREATE TABLE IF NOT EXISTS audiencias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expediente_id UUID NOT NULL REFERENCES expedientes(id),
    abogado_id UUID NOT NULL REFERENCES abogados(id),
    titulo VARCHAR(255) NOT NULL,
    fecha_hora_inicio TIMESTAMP NOT NULL,
    duracion_minutos INTEGER NOT NULL,
    modalidad VARCHAR(50) NOT NULL, -- 'VIRTUAL', 'PRESENCIAL'
    ubicacion VARCHAR(255),
    link_reunion TEXT,
    estado VARCHAR(50) DEFAULT 'PROGRAMADA', -- 'PROGRAMADA', 'REALIZADA', 'CANCELADA', 'APLAZADA'
    notas_preparacion TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Data para Abogados (Requerido)
INSERT INTO abogados (nombre_completo, email, telefono, especialidad, fecha_ingreso, estado)
VALUES 
('Carlos Mendoza', 'carlos.mendoza@esap.edu.co', '3001234567', 'Derecho Disciplinario', CURRENT_DATE - INTERVAL '5 years', 'ACTIVO'),
('María Torres', 'maria.torres@esap.edu.co', '3109876543', 'Responsabilidad Fiscal', CURRENT_DATE - INTERVAL '2 years', 'ACTIVO')
ON CONFLICT (email) DO NOTHING;
