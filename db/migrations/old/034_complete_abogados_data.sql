-- 034_complete_abogados_data.sql
-- Migration to:
-- 1. Add cedula column to abogados
-- 2. Update existing abogados with complete data
-- 3. Add 2 new abogados
-- 4. Assign real abogados to expedientes

-- ============================================
-- 1. Add cedula column if not exists
-- ============================================

-- 04_abogados_calendario_schema.sql

-- Tabla de Abogados Sustanciadores
CREATE TABLE IF NOT EXISTS legal_management.abogados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
CREATE TABLE IF NOT EXISTS legal_management.audiencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expediente_id UUID NOT NULL REFERENCES legal_management.expedientes(id),
    abogado_id UUID NOT NULL REFERENCES legal_management.abogados(id),
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
INSERT INTO legal_management.abogados (nombre_completo, email, telefono, especialidad, fecha_ingreso, estado)
VALUES 
('Carlos Mendoza', 'carlos.mendoza@esap.edu.co', '3001234567', 'Derecho Disciplinario', CURRENT_DATE - INTERVAL '5 years', 'ACTIVO'),
('María Torres', 'maria.torres@esap.edu.co', '3109876543', 'Responsabilidad Fiscal', CURRENT_DATE - INTERVAL '2 years', 'ACTIVO')
ON CONFLICT (email) DO NOTHING;


ALTER TABLE legal_management.abogados
ADD COLUMN IF NOT EXISTS cedula VARCHAR(20);

-- ============================================
-- 2. Update existing abogados with complete data
-- ============================================
UPDATE legal_management.abogados
SET 
    cedula = '79456123',
    telefono = COALESCE(telefono, '3001234567'),
    especialidad = COALESCE(especialidad, 'Derecho Administrativo')
WHERE email = 'carlos.mendoza@esap.edu.co';

UPDATE legal_management.abogados
SET 
    cedula = '52123789',
    telefono = COALESCE(telefono, '3109876543'),
    especialidad = COALESCE(especialidad, 'Derecho Laboral')
WHERE email = 'maria.torres@esap.edu.co';

-- ============================================
-- 3. Insert 2 new abogados
-- ============================================
INSERT INTO legal_management.abogados (nombre_completo, email, telefono, especialidad, fecha_ingreso, estado, cedula)
VALUES 
    ('Dr. Luis Ramírez Torres', 'luis.ramirez@esap.edu.co', '3115678901', 'Derecho Constitucional', CURRENT_DATE - INTERVAL '3 years', 'ACTIVO', '80123456'),
    ('Dra. Patricia González Ruiz', 'patricia.gonzalez@esap.edu.co', '3201234567', 'Derecho Civil', CURRENT_DATE - INTERVAL '4 years', 'ACTIVO', '52987654')
ON CONFLICT (email) DO UPDATE SET
    cedula = EXCLUDED.cedula,
    telefono = EXCLUDED.telefono,
    especialidad = EXCLUDED.especialidad;

-- ============================================
-- 4. Assign real abogados to expedientes
-- Get abogado IDs and assign to expedientes
-- ============================================

-- Expediente 1: Assign to Carlos Mendoza
UPDATE legal_management.expedientes 
SET abogado_sustanciador = (
    SELECT id::text FROM legal_management.abogados WHERE email = 'carlos.mendoza@esap.edu.co' LIMIT 1
)
WHERE radicado = '110013335002202500125';

-- Expediente 2: Assign to María Torres  
UPDATE legal_management.expedientes 
SET abogado_sustanciador = (
    SELECT id::text FROM legal_management.abogados WHERE email = 'maria.torres@esap.edu.co' LIMIT 1
)
WHERE radicado = '250002341000202400567';

-- Expediente 3: Assign to Luis Ramírez
UPDATE legal_management.expedientes 
SET abogado_sustanciador = (
    SELECT id::text FROM legal_management.abogados WHERE email = 'luis.ramirez@esap.edu.co' LIMIT 1
)
WHERE radicado = '470013333003202400890';

-- Expediente 4: Assign to Patricia González
UPDATE legal_management.expedientes 
SET abogado_sustanciador = (
    SELECT id::text FROM legal_management.abogados WHERE email = 'patricia.gonzalez@esap.edu.co' LIMIT 1
)
WHERE radicado = '050013331001202500001';

-- Expediente 5: Assign to Carlos Mendoza
UPDATE legal_management.expedientes 
SET abogado_sustanciador = (
    SELECT id::text FROM legal_management.abogados WHERE email = 'carlos.mendoza@esap.edu.co' LIMIT 1
)
WHERE radicado = '680013334004202400234';
