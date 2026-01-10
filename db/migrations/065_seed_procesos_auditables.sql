-- ============================================
-- Migración 065: Seed de Procesos Auditables
-- Fecha: 2026-01-XX
-- Descripción: Inserta los 25 procesos auditables (9 Sede + 16 Territoriales) 
--              desde los datos mock del componente UniversoAuditorias
-- ============================================

-- Función auxiliar para mapear criticidad (5|3|1) a impacto (3|2|1)
-- Función auxiliar para mapear exposición (5|3|1) a probabilidad (3|2|1)
-- Función auxiliar para mapear mitigantes (1-10) a nivelControl (1|2|3)
-- Función auxiliar para mapear nivelRiesgo DAFP a nivelRiesgo BD
-- Función auxiliar para mapear estado a prioridad
-- Función auxiliar para calcular priorizacionAnos según nivelRiesgo

-- ============================================
-- INSERTAR PROCESOS SEDE (9)
-- ============================================

INSERT INTO control_interno.proceso_auditable (
    codigo, nombre, descripcion, tipo, macroproceso, responsable, dependencia, territorial,
    evaluacion_riesgo, frecuencia_auditoria, ultima_auditoria, proxima_auditoria,
    prioridad, priorizacion_anos
) VALUES
-- SEDE-001: Gestión Financiera
(
    'SEDE-001',
    'Gestión Financiera',
    'Presupuesto, tesorería, contabilidad y gestión financiera institucional',
    'misional',
    'Procesos Sede',
    'Director Administrativo y Financiero',
    'Sede Central',
    NULL,
    jsonb_build_object(
        'probabilidad', 3,  -- factorExposicion 5 -> 3
        'impacto', 3,       -- criticidad 5 -> 3
        'nivelControl', 1,  -- factoresMitigantes 2 -> 1 (1-3)
        'riesgoInherente', 9,  -- probabilidad * impacto
        'riesgoResidual', 9.0,  -- riesgoInherente / nivelControl
        'nivelRiesgo', 'alto'  -- Crítico -> alto
    ),
    'Anual',
    '2024-03-15'::date,
    '2025-03-10'::date,
    1,  -- seleccionada -> 1
    1   -- Crítico/Alto -> 1 año
),
-- SEDE-002: Gestión Administrativa
(
    'SEDE-002',
    'Gestión Administrativa',
    'Servicios generales, infraestructura, correspondencia y archivo',
    'apoyo',
    'Procesos Sede',
    'Subdirector Administrativo',
    'Sede Central',
    NULL,
    jsonb_build_object(
        'probabilidad', 3,  -- 5 -> 3
        'impacto', 2,       -- 3 -> 2
        'nivelControl', 1,  -- 3 -> 1
        'riesgoInherente', 6,
        'riesgoResidual', 6.0,
        'nivelRiesgo', 'alto'  -- Alto -> alto
    ),
    'Anual',
    '2024-06-20'::date,
    '2025-06-15'::date,
    1,
    1
),
-- SEDE-003: Formación para la Vida Pública
(
    'SEDE-003',
    'Formación para la Vida Pública',
    'Programas académicos, cursos, diplomados y capacitación',
    'misional',
    'Procesos Sede',
    'Director de Formación',
    'Sede Central',
    NULL,
    jsonb_build_object(
        'probabilidad', 3,
        'impacto', 3,
        'nivelControl', 1,
        'riesgoInherente', 9,
        'riesgoResidual', 9.0,
        'nivelRiesgo', 'alto'
    ),
    'Anual',
    '2024-02-10'::date,
    '2025-02-05'::date,
    1,
    1
),
-- SEDE-004: Adquisición de Bienes y Servicios
(
    'SEDE-004',
    'Adquisición de Bienes y Servicios',
    'Contratación, compras, licitaciones y procesos de selección',
    'apoyo',
    'Procesos Sede',
    'Jefe de Contratación',
    'Sede Central',
    NULL,
    jsonb_build_object(
        'probabilidad', 3,
        'impacto', 3,
        'nivelControl', 1,
        'riesgoInherente', 9,
        'riesgoResidual', 9.0,
        'nivelRiesgo', 'alto'
    ),
    'Anual',
    '2024-05-10'::date,
    '2025-05-05'::date,
    1,
    1
),
-- SEDE-005: Gestión de Talento Humano
(
    'SEDE-005',
    'Gestión de Talento Humano',
    'Nómina, bienestar, capacitación, evaluación de desempeño',
    'apoyo',
    'Procesos Sede',
    'Jefe de Talento Humano',
    'Sede Central',
    NULL,
    jsonb_build_object(
        'probabilidad', 2,  -- 3 -> 2
        'impacto', 2,      -- 3 -> 2
        'nivelControl', 1, -- 2 -> 1
        'riesgoInherente', 4,
        'riesgoResidual', 4.0,
        'nivelRiesgo', 'medio'
    ),
    'Anual',
    '2024-07-15'::date,
    '2025-07-10'::date,
    1,
    2  -- Medio -> 2 años
),
-- SEDE-006: Efectividad Institucional
(
    'SEDE-006',
    'Efectividad Institucional',
    'Planeación estratégica, indicadores, gestión de calidad',
    'estrategico',
    'Procesos Sede',
    'Jefe de Planeación',
    'Sede Central',
    NULL,
    jsonb_build_object(
        'probabilidad', 2,
        'impacto', 2,
        'nivelControl', 1,  -- 3 -> 1
        'riesgoInherente', 4,
        'riesgoResidual', 4.0,
        'nivelRiesgo', 'medio'
    ),
    'Anual',
    '2024-08-20'::date,
    '2025-08-15'::date,
    1,
    2
),
-- SEDE-007: Evaluación de Control y Mejora
(
    'SEDE-007',
    'Evaluación de Control y Mejora',
    'Seguimiento a planes de mejoramiento y control interno',
    'evaluacion',
    'Procesos Sede',
    'Jefe OCI',
    'Sede Central',
    NULL,
    jsonb_build_object(
        'probabilidad', 2,
        'impacto', 2,
        'nivelControl', 1,
        'riesgoInherente', 4,
        'riesgoResidual', 4.0,
        'nivelRiesgo', 'medio'
    ),
    'Anual',
    '2024-09-10'::date,
    '2025-09-05'::date,
    1,
    2
),
-- SEDE-008: Modelo de Seguridad y Privacidad
(
    'SEDE-008',
    'Modelo de Seguridad y Privacidad',
    'Seguridad de información, protección de datos, ciberseguridad',
    'apoyo',
    'Procesos Sede',
    'Oficial de Seguridad',
    'Sede Central',
    NULL,
    jsonb_build_object(
        'probabilidad', 3,
        'impacto', 3,
        'nivelControl', 2,  -- 4 -> 2 (4-6)
        'riesgoInherente', 9,
        'riesgoResidual', 4.5,
        'nivelRiesgo', 'alto'
    ),
    'Anual',
    '2024-04-25'::date,
    '2025-04-20'::date,
    1,
    1
),
-- SEDE-009: Transformación Digital
(
    'SEDE-009',
    'Transformación Digital',
    'TI, innovación digital, sistemas de información',
    'apoyo',
    'Procesos Sede',
    'Director de TI',
    'Sede Central',
    NULL,
    jsonb_build_object(
        'probabilidad', 3,
        'impacto', 2,
        'nivelControl', 1,
        'riesgoInherente', 6,
        'riesgoResidual', 6.0,
        'nivelRiesgo', 'medio'
    ),
    'Anual',
    '2024-10-05'::date,
    '2025-10-01'::date,
    1,
    2
)

ON CONFLICT (codigo) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    tipo = EXCLUDED.tipo,
    macroproceso = EXCLUDED.macroproceso,
    responsable = EXCLUDED.responsable,
    dependencia = EXCLUDED.dependencia,
    territorial = EXCLUDED.territorial,
    evaluacion_riesgo = EXCLUDED.evaluacion_riesgo,
    frecuencia_auditoria = EXCLUDED.frecuencia_auditoria,
    ultima_auditoria = EXCLUDED.ultima_auditoria,
    proxima_auditoria = EXCLUDED.proxima_auditoria,
    prioridad = EXCLUDED.prioridad,
    priorizacion_anos = EXCLUDED.priorizacion_anos,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- INSERTAR TERRITORIALES (16)
-- ============================================

INSERT INTO control_interno.proceso_auditable (
    codigo, nombre, descripcion, tipo, macroproceso, responsable, dependencia, territorial,
    evaluacion_riesgo, frecuencia_auditoria, ultima_auditoria, proxima_auditoria,
    prioridad, priorizacion_anos
) VALUES
-- TERR-001: Territorial Antioquia
(
    'TERR-001',
    'Territorial Antioquia',
    'Dirección territorial y programas académicos región Antioquia',
    'misional',
    'Procesos Territoriales',
    'Director Territorial Antioquia',
    'Territorial Antioquia',
    TRUE,
    jsonb_build_object(
        'probabilidad', 3,
        'impacto', 2,
        'nivelControl', 1,
        'riesgoInherente', 6,
        'riesgoResidual', 6.0,
        'nivelRiesgo', 'alto'
    ),
    'Anual',
    '2024-02-20'::date,
    NULL,
    1,
    1
),
-- TERR-002: Territorial Atlántico-Cesar
(
    'TERR-002',
    'Territorial Atlántico-Cesar',
    'Dirección territorial región Caribe (Atlántico y Cesar)',
    'misional',
    'Procesos Territoriales',
    'Director Territorial Atlántico',
    'Territorial Atlántico-Cesar',
    TRUE,
    jsonb_build_object(
        'probabilidad', 3,
        'impacto', 2,
        'nivelControl', 1,
        'riesgoInherente', 6,
        'riesgoResidual', 6.0,
        'nivelRiesgo', 'alto'
    ),
    'Anual',
    '2024-03-10'::date,
    NULL,
    1,
    1
),
-- TERR-003: Territorial Bolívar-Córdoba
(
    'TERR-003',
    'Territorial Bolívar-Córdoba',
    'Dirección territorial región Bolívar y Córdoba',
    'misional',
    'Procesos Territoriales',
    'Director Territorial Bolívar',
    'Territorial Bolívar-Córdoba',
    TRUE,
    jsonb_build_object(
        'probabilidad', 2,
        'impacto', 2,
        'nivelControl', 1,
        'riesgoInherente', 4,
        'riesgoResidual', 4.0,
        'nivelRiesgo', 'medio'
    ),
    'Anual',
    '2024-04-05'::date,
    NULL,
    1,
    2
),
-- TERR-004: Territorial Caldas
(
    'TERR-004',
    'Territorial Caldas',
    'Dirección territorial región Eje Cafetero (Caldas)',
    'misional',
    'Procesos Territoriales',
    'Director Territorial Caldas',
    'Territorial Caldas',
    TRUE,
    jsonb_build_object(
        'probabilidad', 2,
        'impacto', 2,
        'nivelControl', 1,
        'riesgoInherente', 4,
        'riesgoResidual', 4.0,
        'nivelRiesgo', 'medio'
    ),
    'Anual',
    '2024-05-15'::date,
    NULL,
    1,
    2
),
-- TERR-005: Territorial Cundinamarca
(
    'TERR-005',
    'Territorial Cundinamarca',
    'Dirección territorial región Cundinamarca',
    'misional',
    'Procesos Territoriales',
    'Director Territorial Cundinamarca',
    'Territorial Cundinamarca',
    TRUE,
    jsonb_build_object(
        'probabilidad', 3,
        'impacto', 3,
        'nivelControl', 1,
        'riesgoInherente', 9,
        'riesgoResidual', 9.0,
        'nivelRiesgo', 'alto'
    ),
    'Anual',
    '2024-01-20'::date,
    NULL,
    1,
    1
),
-- TERR-006: Territorial Nariño-Putumayo
(
    'TERR-006',
    'Territorial Nariño-Putumayo',
    'Dirección territorial región Sur (Nariño y Putumayo)',
    'misional',
    'Procesos Territoriales',
    'Director Territorial Nariño',
    'Territorial Nariño-Putumayo',
    TRUE,
    jsonb_build_object(
        'probabilidad', 2,
        'impacto', 2,
        'nivelControl', 1,
        'riesgoInherente', 4,
        'riesgoResidual', 4.0,
        'nivelRiesgo', 'medio'
    ),
    'Anual',
    '2024-06-10'::date,
    NULL,
    1,
    2
),
-- TERR-007: Territorial Huila
(
    'TERR-007',
    'Territorial Huila',
    'Dirección territorial región Huila',
    'misional',
    'Procesos Territoriales',
    'Director Territorial Huila',
    'Territorial Huila',
    TRUE,
    jsonb_build_object(
        'probabilidad', 2,
        'impacto', 2,
        'nivelControl', 1,
        'riesgoInherente', 4,
        'riesgoResidual', 4.0,
        'nivelRiesgo', 'medio'
    ),
    'Anual',
    '2024-07-05'::date,
    NULL,
    1,
    2
),
-- TERR-008: Territorial Meta
(
    'TERR-008',
    'Territorial Meta',
    'Dirección territorial región Meta',
    'misional',
    'Procesos Territoriales',
    'Director Territorial Meta',
    'Territorial Meta',
    TRUE,
    jsonb_build_object(
        'probabilidad', 2,
        'impacto', 2,
        'nivelControl', 1,
        'riesgoInherente', 4,
        'riesgoResidual', 4.0,
        'nivelRiesgo', 'medio'
    ),
    'Anual',
    '2024-08-15'::date,
    NULL,
    1,
    2
),
-- TERR-009: Territorial Cauca
(
    'TERR-009',
    'Territorial Cauca',
    'Dirección territorial región Cauca',
    'misional',
    'Procesos Territoriales',
    'Director Territorial Cauca',
    'Territorial Cauca',
    TRUE,
    jsonb_build_object(
        'probabilidad', 2,
        'impacto', 2,
        'nivelControl', 1,
        'riesgoInherente', 4,
        'riesgoResidual', 4.0,
        'nivelRiesgo', 'medio'
    ),
    'Anual',
    '2023-12-10'::date,
    NULL,
    2,  -- pendiente -> 2
    2
),
-- TERR-010: Territorial Amazonas
(
    'TERR-010',
    'Territorial Amazonas',
    'Dirección territorial región Amazonas',
    'misional',
    'Procesos Territoriales',
    'Director Territorial Amazonas',
    'Territorial Amazonas',
    TRUE,
    jsonb_build_object(
        'probabilidad', 1,  -- 1 -> 1
        'impacto', 1,       -- 1 -> 1
        'nivelControl', 1,  -- 1 -> 1
        'riesgoInherente', 1,
        'riesgoResidual', 1.0,
        'nivelRiesgo', 'bajo'
    ),
    'Anual',
    NULL,
    NULL,
    2,  -- pendiente -> 2
    4   -- Bajo -> 4 años
),
-- TERR-011: Territorial Boyacá
(
    'TERR-011',
    'Territorial Boyacá',
    'Dirección territorial región Boyacá',
    'misional',
    'Procesos Territoriales',
    'Director Territorial Boyacá',
    'Territorial Boyacá',
    TRUE,
    jsonb_build_object(
        'probabilidad', 2,
        'impacto', 2,
        'nivelControl', 1,
        'riesgoInherente', 4,
        'riesgoResidual', 4.0,
        'nivelRiesgo', 'medio'
    ),
    'Anual',
    '2024-09-20'::date,
    NULL,
    1,
    2
),
-- TERR-012: Territorial Casanare
(
    'TERR-012',
    'Territorial Casanare',
    'Dirección territorial región Casanare',
    'misional',
    'Procesos Territoriales',
    'Director Territorial Casanare',
    'Territorial Casanare',
    TRUE,
    jsonb_build_object(
        'probabilidad', 2,  -- 3 -> 2
        'impacto', 1,      -- 1 -> 1
        'nivelControl', 1,
        'riesgoInherente', 2,
        'riesgoResidual', 2.0,
        'nivelRiesgo', 'bajo'
    ),
    'Anual',
    NULL,
    NULL,
    2,
    4
),
-- TERR-013: Territorial Guaviare
(
    'TERR-013',
    'Territorial Guaviare',
    'Dirección territorial región Guaviare',
    'misional',
    'Procesos Territoriales',
    'Director Territorial Guaviare',
    'Territorial Guaviare',
    TRUE,
    jsonb_build_object(
        'probabilidad', 1,
        'impacto', 1,
        'nivelControl', 1,
        'riesgoInherente', 1,
        'riesgoResidual', 1.0,
        'nivelRiesgo', 'bajo'
    ),
    'Anual',
    NULL,
    NULL,
    3,  -- no-aplica -> 3
    4
),
-- TERR-014: Territorial Putumayo
(
    'TERR-014',
    'Territorial Putumayo',
    'Dirección territorial región Putumayo',
    'misional',
    'Procesos Territoriales',
    'Director Territorial Putumayo',
    'Territorial Putumayo',
    TRUE,
    jsonb_build_object(
        'probabilidad', 2,
        'impacto', 1,
        'nivelControl', 1,
        'riesgoInherente', 2,
        'riesgoResidual', 2.0,
        'nivelRiesgo', 'bajo'
    ),
    'Anual',
    NULL,
    NULL,
    2,
    4
),
-- TERR-015: Territorial Archipiélago San Andrés
(
    'TERR-015',
    'Territorial Archipiélago San Andrés',
    'Dirección territorial Archipiélago de San Andrés',
    'misional',
    'Procesos Territoriales',
    'Director Territorial San Andrés',
    'Territorial Archipiélago San Andrés',
    TRUE,
    jsonb_build_object(
        'probabilidad', 1,
        'impacto', 1,
        'nivelControl', 1,
        'riesgoInherente', 1,
        'riesgoResidual', 1.0,
        'nivelRiesgo', 'bajo'
    ),
    'Anual',
    NULL,
    NULL,
    3,  -- no-aplica -> 3
    4
),
-- TERR-016: Territorial Vichada
(
    'TERR-016',
    'Territorial Vichada',
    'Dirección territorial región Vichada',
    'misional',
    'Procesos Territoriales',
    'Director Territorial Vichada',
    'Territorial Vichada',
    TRUE,
    jsonb_build_object(
        'probabilidad', 1,
        'impacto', 1,
        'nivelControl', 1,
        'riesgoInherente', 1,
        'riesgoResidual', 1.0,
        'nivelRiesgo', 'bajo'
    ),
    'Anual',
    NULL,
    NULL,
    3,  -- no-aplica -> 3
    4
)

ON CONFLICT (codigo) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    tipo = EXCLUDED.tipo,
    macroproceso = EXCLUDED.macroproceso,
    responsable = EXCLUDED.responsable,
    dependencia = EXCLUDED.dependencia,
    territorial = EXCLUDED.territorial,
    evaluacion_riesgo = EXCLUDED.evaluacion_riesgo,
    frecuencia_auditoria = EXCLUDED.frecuencia_auditoria,
    ultima_auditoria = EXCLUDED.ultima_auditoria,
    proxima_auditoria = EXCLUDED.proxima_auditoria,
    prioridad = EXCLUDED.prioridad,
    priorizacion_anos = EXCLUDED.priorizacion_anos,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- VERIFICACIÓN
-- ============================================

DO $$
DECLARE
    total_procesos INTEGER;
    procesos_sede INTEGER;
    procesos_territorial INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_procesos FROM control_interno.proceso_auditable;
    SELECT COUNT(*) INTO procesos_sede FROM control_interno.proceso_auditable WHERE macroproceso = 'Procesos Sede';
    SELECT COUNT(*) INTO procesos_territorial FROM control_interno.proceso_auditable WHERE macroproceso = 'Procesos Territoriales';
    
    RAISE NOTICE '✅ Migración completada:';
    RAISE NOTICE '   - Total procesos: %', total_procesos;
    RAISE NOTICE '   - Procesos Sede: %', procesos_sede;
    RAISE NOTICE '   - Procesos Territoriales: %', procesos_territorial;
    
    IF total_procesos >= 25 THEN
        RAISE NOTICE '✅ Todos los procesos fueron insertados correctamente';
    ELSE
        RAISE WARNING '⚠️  Se esperaban 25 procesos, se encontraron %', total_procesos;
    END IF;
END $$;



