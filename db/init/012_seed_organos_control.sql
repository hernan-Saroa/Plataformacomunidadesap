-- ============================================
-- Seed Data: Catálogo de Organismos de Control
-- ============================================

INSERT INTO requerimientos_oc.cat_organismos_control (nombre, sigla, tipo, nivel, activo) VALUES
-- CONTRALORÍAS
('Contraloría General de la República', 'CGR', 'CONTRALORIA', 'NACIONAL', true),
('Contraloría de Bogotá D.C.', 'CB', 'CONTRALORIA', 'DEPARTAMENTAL', true),
('Contraloría de Antioquia', 'CA', 'CONTRALORIA', 'DEPARTAMENTAL', true),
('Contraloría de Cundinamarca', 'CC', 'CONTRALORIA', 'DEPARTAMENTAL', true),
('Contraloría del Valle del Cauca', 'CVC', 'CONTRALORIA', 'DEPARTAMENTAL', true),

-- PROCURADURÍAS
('Procuraduría General de la Nación', 'PGN', 'PROCURADURIA', 'NACIONAL', true),
('Procuraduría Regional de Bogotá', 'PRB', 'PROCURADURIA', 'DEPARTAMENTAL', true),

-- MINISTERIOS
('Ministerio de Educación Nacional', 'MEN', 'MINISTERIO', 'NACIONAL', true),
('Ministerio de Hacienda y Crédito Público', 'MHCP', 'MINISTERIO', 'NACIONAL', true),
('Ministerio del Trabajo', 'MINTRABAJO', 'MINISTERIO', 'NACIONAL', true),
('Ministerio de las Tecnologías de la Información y las Comunicaciones', 'MINTIC', 'MINISTERIO', 'NACIONAL', true),

-- SUPERINTENDENCIAS
('Superintendencia de Industria y Comercio', 'SIC', 'SUPERINTENDENCIA', 'NACIONAL', true),
('Superintendencia de Servicios Públicos Domiciliarios', 'SSPD', 'SUPERINTENDENCIA', 'NACIONAL', true),
('Superintendencia de Sociedades', 'SUPERSOCIEDADES', 'SUPERINTENDENCIA', 'NACIONAL', true),

-- OTROS ENTES DE CONTROL
('Auditoría General de la República', 'AGR', 'OTROS', 'NACIONAL', true),
('Departamento Administrativo de la Función Pública', 'DAFP', 'OTROS', 'NACIONAL', true),
('Archivo General de la Nación', 'AGN', 'OTROS', 'NACIONAL', true),
('Consejo de Estado', 'CE', 'OTROS', 'NACIONAL', true),
('Defensoría del Pueblo', 'DP', 'OTROS', 'NACIONAL', true),

-- CONTRALORÍAS ADICIONALES
('Contraloría de Santander', 'CS', 'CONTRALORIA', 'DEPARTAMENTAL', true),
('Contraloría del Atlántico', 'CAT', 'CONTRALORIA', 'DEPARTAMENTAL', true),
('Contraloría de Bolívar', 'CB', 'CONTRALORIA', 'DEPARTAMENTAL', true),
('Contraloría de Nariño', 'CN', 'CONTRALORIA', 'DEPARTAMENTAL', true),
('Contraloría del Tolima', 'CT', 'CONTRALORIA', 'DEPARTAMENTAL', true),
('Contraloría del Cauca', 'CCA', 'CONTRALORIA', 'DEPARTAMENTAL', true)

ON CONFLICT (nombre) DO NOTHING;

-- ============================================
-- Seed Data: Requerimientos de Ejemplo
-- ============================================

-- Insertar requerimientos de ejemplo (solo si no existen)
INSERT INTO requerimientos_oc.requerimientos (
    radicado_externo, 
    radicado_interno, 
    entidad_id, 
    asunto, 
    tipo_requerimiento, 
    fecha_recepcion, 
    fecha_vencimiento, 
    estado, 
    prioridad_calculada
) VALUES 
(
    'CGR-2025-001234', 
    'OC-2025-00001', 
    1, -- CGR
    'Solicitud de información sobre contratos de prestación de servicios año 2024',
    'INFORMACION',
    '2025-01-15',
    '2025-02-05',
    'EN_PREPARACION',
    'ALTA'
),
(
    'PGN-2024-987654', 
    'OC-2025-00002', 
    6, -- PGN
    'Requerimiento por hallazgo disciplinario en proceso de contratación',
    'HALLAZGO',
    '2024-12-20',
    '2025-01-20',
    'ENVIADO',
    'CRITICA'
),
(
    'MEN-2025-456789', 
    'OC-2025-00003', 
    8, -- MEN
    'Auditoría a programas académicos ofertados en 2024',
    'AUDITORIA',
    '2025-01-10',
    '2025-02-25',
    'EN_REVISION',
    'NORMAL'
),
(
    'CB-2025-111222', 
    'OC-2025-00004', 
    2, -- Contraloría de Bogotá
    'Ajuste a informe de gestión territorial presentado',
    'AJUSTE',
    '2025-01-18',
    '2025-02-08',
    'EN_PREPARACION',
    'NORMAL'
),
(
    'SIC-2024-333444', 
    'OC-2025-00005', 
    12, -- SIC
    'Solicitud de documentación sobre trámites de propiedad intelectual',
    'INFORMACION',
    '2024-12-15',
    '2025-01-15',
    'CERRADO',
    'BAJA'
)
ON CONFLICT (radicado_interno) DO NOTHING;

-- ============================================
-- Verificación de Datos Insertados
-- ============================================
-- SELECT COUNT(*) as total_organismos FROM requerimientos_oc.cat_organismos_control;
-- SELECT COUNT(*) as total_requerimientos FROM requerimientos_oc.requerimientos;

