-- SCHEMA 53: Módulo de Indicadores y Plan Estratégico

-- 1. Tabla de Definición de Indicadores (La Meta)
CREATE TABLE IF NOT EXISTS legal_management.pei_indicadores (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL, -- Ej: "Eficiencia en Defensa Judicial"
    descripcion TEXT,
    
    -- Clasificación
    eje_estrategico VARCHAR(50) NOT NULL, -- 'GESTION', 'TALENTO', 'TRANSPARENCIA', 'TECNOLOGIA'
    
    -- Metas Numéricas
    meta_objetivo DECIMAL(10,2) NOT NULL, -- Ej: 100.00
    unidad_medida VARCHAR(20) DEFAULT 'PORCENTAJE', -- 'PORCENTAJE', 'NUMERO', 'MONEDA'
    
    -- Plazos
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    frecuencia_medicion VARCHAR(20) DEFAULT 'MENSUAL',
    
    -- Responsable
    responsable_id UUID,  -- Changed to UUID to match existing user system if applicable, or keep INT if external. Using UUID for consistency with 'users' usually.
    responsable_nombre VARCHAR(200), -- Snapshot for display
    
    -- Estado del Indicador
    estado VARCHAR(20) DEFAULT 'ACTIVO', -- 'ACTIVO', 'INACTIVO', 'ARCHIVADO'
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Tabla de Seguimiento (El Historial de Avances)
CREATE TABLE IF NOT EXISTS legal_management.pei_registros_avance (
    id SERIAL PRIMARY KEY,
    indicador_id INT REFERENCES legal_management.pei_indicadores(id) ON DELETE CASCADE,
    
    valor_reportado DECIMAL(10,2) NOT NULL, -- El valor real en este momento
    porcentaje_avance DECIMAL(5,2), -- Calculado: (valor_reportado / meta) * 100
    
    observaciones TEXT, -- Justificación del avance
    evidencia_url TEXT, -- Link a documento soporte (opcional)
    
    fecha_registro TIMESTAMP DEFAULT NOW(),
    usuario_registra_id UUID -- Quién hizo la actualización
);

-- 3. Índices para optimizar el Dashboard
CREATE INDEX IF NOT EXISTS idx_pei_eje ON legal_management.pei_indicadores(eje_estrategico);
CREATE INDEX IF NOT EXISTS idx_pei_estado ON legal_management.pei_indicadores(estado);

-- 4. SEED DATA (Datos de Prueba)
INSERT INTO legal_management.pei_indicadores (nombre, descripcion, eje_estrategico, meta_objetivo, unidad_medida, fecha_inicio, fecha_fin, responsable_nombre)
VALUES 
('Eficiencia Procesal', 'Porcentaje de procesos cerrados a favor de la entidad', 'GESTION', 100.00, 'PORCENTAJE', '2025-01-01', '2025-12-31', 'Dr. Director Jurídico'),
('Digitalización de Expedientes', 'Número de expedientes físicos migrados al sistema', 'TECNOLOGIA', 5000.00, 'NUMERO', '2025-01-01', '2025-06-30', 'Ing. Jefe Sistemas');

-- Initial records
INSERT INTO legal_management.pei_registros_avance (indicador_id, valor_reportado, porcentaje_avance, observaciones)
VALUES 
((SELECT id FROM legal_management.pei_indicadores WHERE nombre = 'Eficiencia Procesal'), 45.00, 45.00, 'Avance inicial Q1'),
((SELECT id FROM legal_management.pei_indicadores WHERE nombre = 'Digitalización de Expedientes'), 2500.00, 50.00, 'Migración de archivo central completada al 50%');
