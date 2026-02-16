-- ============================================
-- Schema para Legal Management Service
-- ============================================

CREATE SCHEMA IF NOT EXISTS legal_management;

-- ============================================
-- Tabla: expedientes
-- ============================================
CREATE TABLE IF NOT EXISTS legal_management.expedientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    radicado VARCHAR(23) UNIQUE NOT NULL,
    jurisdiccion VARCHAR(50) NOT NULL, -- CIVIL, PENAL, ADMINISTRATIVO
    tipo_proceso VARCHAR(100) NOT NULL, -- REPARACION DIRECTA, NULIDAD, ETC
    demandante VARCHAR(255) NOT NULL,
    demandado VARCHAR(255) NOT NULL DEFAULT 'ESAP',
    estado VARCHAR(50) NOT NULL, -- RADICADO, EN_TRAMITE, FALLO, TRASLADO_DESCARGOS
    fecha_radicacion TIMESTAMP NOT NULL,
    cuantia NUMERIC(15, 2),
    
    -- Campos adicionales inferidos de UI
    abogado_sustanciador VARCHAR(255),
    fecha_prescripcion TIMESTAMP,
    riesgo_prescripcion BOOLEAN DEFAULT false,
    termino_procesal_dias INTEGER,
    ultima_actuacion VARCHAR(255),
    ubicacion_fisica VARCHAR(255),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Seed Data (Semilla)
-- ============================================

INSERT INTO legal_management.expedientes (
    radicado, jurisdiccion, tipo_proceso, demandante, demandado, estado, fecha_radicacion, cuantia, abogado_sustanciador, fecha_prescripcion, riesgo_prescripcion, termino_procesal_dias, ultima_actuacion, ubicacion_fisica
) VALUES 
(
    '110013335002202500125', 
    'ADMINISTRATIVO', 
    'NULIDAD Y RESTABLECIMIENTO DEL DERECHO', 
    'Ana María López Martínez', 
    'ESAP', 
    'TRASLADO_DESCARGOS', 
    '2025-01-02 08:30:00', 
    50000000.00,
    NULL,  -- Will be assigned from abogados table via migration
    '2025-06-15 00:00:00',
    true,
    7,
    'Auto de avocamiento notificado',
    'Dirección Nacional - Bogotá'
),
(
    '250002341000202400567', 
    'CIVIL', 
    'RESPONSABILIDAD EXTRACONTRACTUAL', 
    'Constructora Los Andes S.A.S.', 
    'ESAP', 
    'EN_TRAMITE', 
    '2024-11-15 14:20:00', 
    120000000.00,
    NULL,  -- Will be assigned from abogados table via migration
    '2026-11-15 00:00:00',
    false,
    45,
    'Contestación de demanda radicada',
    'Sede Territorial Cundinamarca'
),
(
    '470013333003202400890', 
    'ADMINISTRATIVO', 
    'REPARACION DIRECTA', 
    'Jorge Eliécer Gaitán', 
    'ESAP', 
    'FALLO', 
    '2024-05-10 09:00:00', 
    85000000.00,
    NULL,  -- Will be assigned from abogados table via migration
    NULL,
    false,
    0,
    'Fallo de primera instancia a favor',
    'Archivo Central'
),
(
    '050013331001202500001', 
    'LABORAL', 
    'ACOSO LABORAL', 
    'Maria Fernanda Cabal', 
    'ESAP', 
    'RADICADO', 
    '2025-02-01 10:15:00', 
    0.00,
    NULL,  -- Will be assigned from abogados table via migration
    '2025-08-01 00:00:00',
    false,
    30,
    'Reparto a juzgado',
    'Dirección Nacional - Talento Humano'
),
(
    '680013334004202400234', 
    'PENAL', 
    'QUERELLA POR CALUMNIA', 
    'Pedro Pablo Kuczynski', 
    'ESAP (Funcionario)', 
    'EN_TRAMITE', 
    '2024-09-20 16:45:00', 
    0.00,
    NULL,  -- Will be assigned from abogados table via migration
    '2025-09-20 00:00:00',
    false,
    15,
    'Audiencia de conciliación fallida',
    'Sede Territorial Santander'
)
ON CONFLICT (radicado) DO NOTHING;
