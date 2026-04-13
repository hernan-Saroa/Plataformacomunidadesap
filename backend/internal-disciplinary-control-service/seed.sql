-- ============================================
-- Seed Data para Internal Disciplinary Control Service
-- Base de datos: PostgreSQL
-- Ejecutar DESPUES de schema.sql
-- Compatible con TypeORM (nombres de columnas en camelCase)
-- ============================================

-- ============================================
-- 1. Inicializar Secuencias
-- ============================================
INSERT INTO internal_disciplinary_control.sequences (name, "currentValue", "updatedAt")
VALUES
    ('DISCIPLINARY_NEWS_2025', 3, CURRENT_TIMESTAMP),
    ('DISCIPLINARY_PROCESS_2025', 2, CURRENT_TIMESTAMP)
ON CONFLICT (name) DO UPDATE SET
    "currentValue" = EXCLUDED."currentValue",
    "updatedAt" = CURRENT_TIMESTAMP;

-- ============================================
-- 2. Profesionales (Abogados)
-- ============================================
INSERT INTO internal_disciplinary_control.disciplinary_professional (
    id, nombre_completo, email, cargo, capacidad_maxima, estado, created_at, updated_at
)
VALUES
    (
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        'Hernán Buitrago',
        'jefe@esap.edu.co',
        'Jefe de Oficina',
        10,
        'ACTIVO',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'b2c3d4e5-f6a7-8901-bcde-f12345678901',
        'Tomás Gutiérrez',
        'tomas@esap.edu.co',
        'Profesional Universitario',
        10,
        'ACTIVO',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    )
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- 3. Noticias Disciplinarias
-- ============================================
-- INSERT INTO internal_disciplinary_control.disciplinary_news (
--     id, radicado, "fechaRecepcion", origen, territorial, "dependenciaDenunciado",
--     denunciante, disciplinable, hechos, adjuntos, estado, "updatedAt"
-- )
-- VALUES
--     (
--         'c3d4e5f6-a7b8-9012-cdef-123456789012',
--         'ND-2025-001',
--         CURRENT_TIMESTAMP,
--         'QUEJOSO',
--         'BOGOTA',
--         'RECURSOS HUMANOS',
--         '{"nombre": "Juan Carlos López", "cedula": "1234567890", "email": "juan.lopez@example.com", "cargo": "Ciudadano"}'::jsonb,
--         '{"nombre": "María González García", "cedula": "9876543210", "cargo": "Jefe de Departamento"}'::jsonb,
--         'Se alega incumplimiento en los procedimientos administrativos y trato discriminatorio hacia el personal.',
--         ARRAY[]::text[],
--         'RADICADA',
--         CURRENT_TIMESTAMP
--     ),
--     (
--         'd4e5f6a7-b8c9-0123-def0-234567890123',
--         'ND-2025-002',
--         CURRENT_TIMESTAMP,
--         'OFICIO',
--         'MEDELLIN',
--         'TESORERIA',
--         '{"nombre": "Inspector ESAP", "email": "inspector@esap.gov.co", "cargo": "Inspector"}'::jsonb,
--         '{"nombre": "Roberto Pérez Mendez", "cedula": "5555555555", "cargo": "Tesorero Regional"}'::jsonb,
--         'Presunta irregularidad en el manejo de fondos públicos según auditoría interna.',
--         ARRAY[]::text[],
--         'ASIGNADA',
--         CURRENT_TIMESTAMP
--     ),
--     (
--         'e5f6a7b8-c9d0-1234-ef01-345678901234',
--         'ND-2025-003',
--         CURRENT_TIMESTAMP,
--         'ANONIMO',
--         'CALI',
--         'CONTRATACION',
--         '{"nombre": "Anónimo"}'::jsonb,
--         '{"nombre": "Carlos Ruiz", "cedula": "111222333", "cargo": "Contratista"}'::jsonb,
--         'Posible favorecimiento en proceso de licitación.',
--         ARRAY[]::text[],
--         'DEVUELTA',
--         CURRENT_TIMESTAMP
--     )
-- ON CONFLICT (radicado) DO NOTHING;

-- ============================================
-- 4. Procesos Disciplinarios
-- ============================================
-- INSERT INTO internal_disciplinary_control.disciplinary_processes (
--     id, "radicadoProceso", "newsId", abogado_asignado_id, "etapaActual", estado,
--     "createdAt", "updatedAt"
-- )
-- VALUES
--     (
--         'f6a7b8c9-d0e1-2345-f012-456789012345',
--         'P-001-2025',
--         'c3d4e5f6-a7b8-9012-cdef-123456789012', -- ND-2025-001
--         'b2c3d4e5-f6a7-8901-bcde-f12345678901', -- Tomás Gutiérrez
--         'EVALUACION',
--         'ACTIVO',
--         CURRENT_TIMESTAMP,
--         CURRENT_TIMESTAMP
--     ),
--     (
--         'a7b8c9d0-e1f2-3456-0123-567890123456',
--         'P-002-2025',
--         'd4e5f6a7-b8c9-0123-def0-234567890123', -- ND-2025-002
--         'b2c3d4e5-f6a7-8901-bcde-f12345678901', -- Tomás Gutiérrez
--         'INDAGACION_PREVIA',
--         'ACTIVO',
--         CURRENT_TIMESTAMP,
--         CURRENT_TIMESTAMP
--     )
-- ON CONFLICT ("radicadoProceso") DO NOTHING;

-- ============================================
-- 5. Plantilla de Autos por Defecto
-- ============================================
INSERT INTO internal_disciplinary_control.plantilla_auto (
    id, "htmlContent", estado, nombre, descripcion, "createdAt", "updatedAt"
)
VALUES
    (
        '550e8400-e29b-41d4-a716-446655440000',
        '<p>En el proceso disciplinario [RADICADO], iniciado el [FECHA_QUEJA], se ha determinado lo siguiente:</p>

<p><strong>HECHOS:</strong></p>
<p>[HECHOS]</p>

<p><strong>DENUNCIANTE:</strong> [DENUNCIANTE_NOMBRE] - [DENUNCIANTE_DOCUMENTO]</p>
<p><strong>DISCIPLINABLE:</strong> [DISCIPLINABLE_NOMBRE] - [DISCIPLINABLE_DOCUMENTO] - [DISCIPLINABLE_CARGO]</p>

<p>Por lo anterior, se resuelve:</p>

<p>PRIMERO: Iniciar proceso disciplinario contra [DISCIPLINABLE_NOMBRE] por los hechos descritos.</p>

<p>SEGUNDO: Notificar al investigado de los cargos formulados.</p>

<p>TERCERO: Designar abogado instructor para el proceso.</p>

<p>Dado en Bogotá D.C., a los [FECHA_ACTUAL].</p>',
        'activo',
        'Plantilla General de Autos',
        'Plantilla por defecto para la generación de autos disciplinarios con todas las variables disponibles',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    )
ON CONFLICT (id) DO UPDATE SET
    "htmlContent" = EXCLUDED."htmlContent",
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    "updatedAt" = CURRENT_TIMESTAMP;

-- ============================================
-- Verificación de datos insertados
-- ============================================
-- SELECT 'Secuencias:' AS tabla, COUNT(*) AS total FROM internal_disciplinary_control.sequences
-- UNION ALL
-- SELECT 'Profesionales:', COUNT(*) FROM internal_disciplinary_control.disciplinary_professional
-- UNION ALL
-- SELECT 'Noticias:', COUNT(*) FROM internal_disciplinary_control.disciplinary_news
-- UNION ALL
-- SELECT 'Procesos:', COUNT(*) FROM internal_disciplinary_control.disciplinary_processes
-- UNION ALL
-- SELECT 'Plantillas:', COUNT(*) FROM internal_disciplinary_control.plantilla_auto;
