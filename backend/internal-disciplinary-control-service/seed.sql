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
    ('DISCIPLINARY_NEWS_2025', 15, CURRENT_TIMESTAMP),
    ('DISCIPLINARY_PROCESS_2025', 12, CURRENT_TIMESTAMP)
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
    -- Jefe OCID
    (
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        'Hernán Buitrago',
        'jefe@esap.edu.co',
        'Jefe de Oficina Control Interno Disciplinario',
        10,
        'ACTIVO',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    -- Profesionales
    (
        'b2c3d4e5-f6a7-8901-bcde-f12345678901',
        'Tomás Gutiérrez',
        'tomas@esap.edu.co',
        'Profesional Universitario',
        10,
        'ACTIVO',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'c3d4e5f6-a7b8-9012-cdef-234567890123',
        'María Fernanda López',
        'maria.lopez@esap.edu.co',
        'Profesional Universitario',
        10,
        'ACTIVO',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'd4e5f6a7-b8c9-0123-def0-345678901234',
        'Carlos Alberto Ruiz',
        'carlos.ruiz@esap.edu.co',
        'Profesional Universitario',
        10,
        'ACTIVO',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'e5f6a7b8-c9d0-1234-ef01-456789012345',
        'Ana Patricia Morales',
        'ana.morales@esap.edu.co',
        'Profesional Universitario',
        10,
        'ACTIVO',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'f6a7b8c9-d0e1-2345-f012-567890123456',
        'Jorge Iván Herrera',
        'jorge.herrera@esap.edu.co',
        'Profesional Universitario',
        10,
        'ACTIVO',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    )
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- 3. Noticias Disciplinarias (15 casos reales)
-- ============================================
INSERT INTO internal_disciplinary_control.disciplinary_news (
    id, radicado, "fechaRecepcion", origen, territorial, "dependenciaDenunciado",
    denunciante, disciplinable, hechos, adjuntos, estado, "radicador_id", "updatedAt"
)
VALUES
    -- 1. Acoso laboral - Bogotá
    (
        '11111111-1111-1111-1111-111111111111',
        'ND-2025-001',
        '2025-01-15 09:30:00',
        'QUEJOSO',
        'BOGOTA',
        'RECURSOS HUMANOS',
        '{"nombre": "Juan Carlos López", "cedula": "1234567890", "email": "juan.lopez@example.com", "cargo": "Ciudadano"}'::jsonb,
        '{"nombre": "María González García", "cedula": "9876543210", "cargo": "Jefa de Departamento"}'::jsonb,
        'Se alega acoso laboral sistemático por parte de la jefa de departamento hacia subalternos, incluyendo humillaciones públicas, asignación de tareas imposibles y amenazas de despido injustificado.',
        ARRAY[]::text[],
        'ASIGNADA',
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        CURRENT_TIMESTAMP
    ),
    -- 2. Malversación de fondos - Medellín
    (
        '22222222-2222-2222-2222-222222222222',
        'ND-2025-002',
        '2025-01-20 10:15:00',
        'OFICIO',
        'MEDELLIN',
        'TESORERIA',
        '{"nombre": "Inspector ESAP", "email": "inspector@esap.gov.co", "cargo": "Inspector"}'::jsonb,
        '{"nombre": "Roberto Pérez Méndez", "cedula": "5555555555", "cargo": "Tesorero Regional"}'::jsonb,
        'Presunta irregularidad en el manejo de fondos públicos según auditoría interna que detectó desvío de recursos por $150.000.000 en el periodo 2023-2024.',
        ARRAY['auditoria-2024.pdf', 'acta-hallazgos.pdf']::text[],
        'EN_VALORACION',
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        CURRENT_TIMESTAMP
    ),
    -- 3. Favorecimiento contractual - Cali
    (
        '33333333-3333-3333-3333-333333333333',
        'ND-2025-003',
        '2025-02-05 14:20:00',
        'ANONIMO',
        'CALI',
        'CONTRATACION',
        '{"nombre": "Anónimo"}'::jsonb,
        '{"nombre": "Carlos Ruiz", "cedula": "111222333", "cargo": "Contratista"}'::jsonb,
        'Posible favorecimiento en proceso de licitación pública LP-2024-005 donde se adjudicó contrato a empresa sin experiencia requerida, con sobrecostos del 40%.',
        ARRAY[]::text[],
        'RADICADA',
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        CURRENT_TIMESTAMP
    ),
    -- 4. Negligencia en funciones - Barranquilla
    (
        '44444444-4444-4444-4444-444444444444',
        'ND-2025-004',
        '2025-02-10 08:45:00',
        'QUEJOSO',
        'BARRANQUILLA',
        'ACADEMICA',
        '{"nombre": "Estudiante afectado", "cedula": "444555666", "email": "estudiante@esap.edu.co", "cargo": "Estudiante"}'::jsonb,
        '{"nombre": "Patricia Vargas", "cedula": "777888999", "cargo": "Directora de Programa"}'::jsonb,
        'Negligencia en la revisión y aprobación de contenidos académicos que generó pérdida de acreditación de programa, afectando a 120 estudiantes.',
        ARRAY['comunicado-acreditacion.pdf']::text[],
        'ASIGNADA',
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        CURRENT_TIMESTAMP
    ),
    -- 5. Uso indebido de bienes públicos - Bucaramanga
    (
        '55555555-5555-5555-5555-555555555555',
        'ND-2025-005',
        '2025-02-18 11:00:00',
        'OFICIO',
        'BUCARAMANGA',
        'LOGISTICA',
        '{"nombre": "Control Interno", "email": "control.interno@esap.edu.co", "cargo": "Auditor"}'::jsonb,
        '{"nombre": "Luis Alberto Torres", "cedula": "333444555", "cargo": "Jefe de Logística"}'::jsonb,
        'Uso de vehículo oficial para diligencias personales y préstamo de equipos de cómputo a terceros sin autorización.',
        ARRAY['bitacora-vehiculo.xlsx', 'prestamo-equipos.pdf']::text[],
        'EN_VALORACION',
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        CURRENT_TIMESTAMP
    ),
    -- 6. Discriminación - Cartagena
    (
        '66666666-6666-6666-6666-666666666666',
        'ND-2025-006',
        '2025-03-01 09:00:00',
        'QUEJOSO',
        'CARTAGENA',
        'BIENESTAR UNIVERSITARIO',
        '{"nombre": "Colectivo Estudiantil", "email": "colectivo@esap.edu.co", "cargo": "Representantes"}'::jsonb,
        '{"nombre": "Claudia Ramírez", "cedula": "666777888", "cargo": "Coordinadora de Bienestar"}'::jsonb,
        'Trato discriminatorio hacia estudiantes de estratos bajos en asignación de becas y auxilios de transporte.',
        ARRAY['peticiones-estudiantes.pdf']::text[],
        'RADICADA',
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        CURRENT_TIMESTAMP
    ),
    -- 7. Falsificación de documentos - Pereira
    (
        '77777777-7777-7777-7777-777777777777',
        'ND-2025-007',
        '2025-03-10 16:30:00',
        'ANONIMO',
        'PEREIRA',
        'REGISTRO Y CONTROL',
        '{"nombre": "Anónimo"}'::jsonb,
        '{"nombre": "Fernando Castro", "cedula": "999000111", "cargo": "Auxiliar Administrativo"}'::jsonb,
        'Presunta falsificación de actas de grado y certificaciones académicas para beneficiar a terceros a cambio de dádivas.',
        ARRAY[]::text[],
        'ASIGNADA',
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        CURRENT_TIMESTAMP
    ),
    -- 8. Hostigamiento sexual - Cúcuta
    (
        '88888888-8888-8888-8888-888888888888',
        'ND-2025-008',
        '2025-03-15 10:00:00',
        'QUEJOSO',
        'CUCUTA',
        'SEDE CUCUTA',
        '{"nombre": "Víctima (reserva identidad)", "cedula": "222333444", "email": "victima@esap.edu.co", "cargo": "Docente Ocasional"}'::jsonb,
        '{"nombre": "Andrés Felipe Díaz", "cedula": "555666777", "cargo": "Docente de Planta"}'::jsonb,
        'Hostigamiento sexual hacia docente ocasional mediante propuestas indecorosas condicionadas a renovación de contrato.',
        ARRAY[]::text[],
        'RADICADA',
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        CURRENT_TIMESTAMP
    ),
    -- 9. Incumplimiento de deberes - Pasto
    (
        '99999999-9999-9999-9999-999999999999',
        'ND-2025-009',
        '2025-03-20 13:45:00',
        'OFICIO',
        'PASTO',
        'SEDE PASTO',
        '{"nombre": "Director Seccional", "email": "director.pasto@esap.edu.co", "cargo": "Director"}'::jsonb,
        '{"nombre": "Óscar Gómez", "cedula": "888999000", "cargo": "Secretario Académico"}'::jsonb,
        'Incumplimiento reiterado de funciones: no radica calificaciones en plazo, no atiende estudiantes, ausencia injustificada a consejos académicos.',
        ARRAY['reporte-inasistencias.xlsx']::text[],
        'EN_VALORACION',
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        CURRENT_TIMESTAMP
    ),
    -- 10. Abuso de autoridad - Manizales
    (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'ND-2025-010',
        '2025-04-01 08:30:00',
        'QUEJOSO',
        'MANIZALES',
        'SEDE MANIZALES',
        '{"nombre": "Grupo de docentes", "email": "docentes@esap.edu.co", "cargo": "Docentes"}'::jsonb,
        '{"nombre": "Raúl Jiménez", "cedula": "111000222", "cargo": "Director Seccional"}'::jsonb,
        'Abuso de autoridad: impone sanciones verbales sin debido proceso, condiciona asignación de horas a lealtad personal.',
        ARRAY['acta-reunion-docentes.pdf']::text[],
        'RADICADA',
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        CURRENT_TIMESTAMP
    ),
    -- 11. Caso para INHIBITORIO - No constituye falta (Ibagué)
    (
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        'ND-2025-011',
        '2025-04-10 11:20:00',
        'QUEJOSO',
        'IBAGUE',
        'SEDE IBAGUE',
        '{"nombre": "Ciudadano denunciante", "cedula": "333222111", "email": "ciudadano@email.com", "cargo": "Particular"}'::jsonb,
        '{"nombre": "Servidor público X", "cedula": "444333222", "cargo": "Auxiliar Administrativo"}'::jsonb,
        'Denuncia por trato grosero en ventanilla. Tras verificación, el actuar corresponde a estricto cumplimiento de norma técnica, no hay falta disciplinaria.',
        ARRAY['norma-tecnica-aplicable.pdf']::text[],
        'ASIGNADA',
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        CURRENT_TIMESTAMP
    ),
    -- 12. Caso para ARCHIVO - Prescripción (Neiva)
    (
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        'ND-2025-012',
        '2025-04-15 09:00:00',
        'ANONIMO',
        'NEIVA',
        'SEDE NEIVA',
        '{"nombre": "Anónimo"}'::jsonb,
        '{"nombre": "Ex-servidor Y", "cedula": "777666555", "cargo": "Ex-Director (jubilado)"}'::jsonb,
        'Hechos ocurridos en 2018, fuera del término de prescripción de 5 años según Ley 734 de 2002.',
        ARRAY['certificado-jubilacion.pdf']::text[],
        'ASIGNADA',
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        CURRENT_TIMESTAMP
    ),
    -- 13. Acoso laboral - Armenia
    (
        'dddddddd-dddd-dddd-dddd-dddddddddddd',
        'ND-2025-013',
        '2025-05-01 14:00:00',
        'QUEJOSO',
        'ARMENIA',
        'SEDE ARMENIA',
        '{"nombre": "Trabajador sindicalizado", "cedula": "888777666", "email": "sindicato@esap.edu.co", "cargo": "Auxiliar"}'::jsonb,
        '{"nombre": "Directora Administrativa", "cedula": "999888777", "cargo": "Directora Administrativa Seccional"}'::jsonb,
        'Acoso laboral por afiliación sindical: traslados arbitrarios, negación de permisos, cargas de trabajo excesivas tras presentar pliego de peticiones.',
        ARRAY['pliego-peticiones.pdf', 'respuesta-administrativa.pdf']::text[],
        'RADICADA',
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        CURRENT_TIMESTAMP
    ),
    -- 14. Concusión - Popayán
    (
        'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        'ND-2025-014',
        '2025-05-10 10:30:00',
        'OFICIO',
        'POPAYAN',
        'SEDE POPAYAN',
        '{"nombre": "Fiscalía General", "email": "fiscalia@fiscalia.gov.co", "cargo": "Entidad de control"}'::jsonb,
        '{"nombre": "Coordinador Académico", "cedula": "222111000", "cargo": "Coordinador Académico Seccional"}'::jsonb,
        'Exacción de dinero a estudiantes a cambio de aprobaciones y certificados de notas. Remitido por Fiscalía.',
        ARRAY['oficio-fiscalia.pdf', 'denuncia-penal.pdf']::text[],
        'ASIGNADA',
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        CURRENT_TIMESTAMP
    ),
    -- 15. Caso para ARCHIVO - Hechos no constitutivos (Tunja)
    (
        'ffffffff-ffff-ffff-ffff-ffffffffffff',
        'ND-2025-015',
        '2025-05-15 15:00:00',
        'QUEJOSO',
        'TUNJA',
        'SEDE TUNJA',
        '{"nombre": "Estudiante", "cedula": "555444333", "email": "estudiante.tunja@esap.edu.co", "cargo": "Estudiante"}'::jsonb,
        '{"nombre": "Docente Z", "cedula": "666555444", "cargo": "Docente de Cátedra"}'::jsonb,
        'Queja por metodología de evaluación considerada injusta. Se verifica que la metodología está en el sílabo aprobado y es acorde a reglamento académico.',
        ARRAY['silabo-aprobado.pdf', 'reglamento-evaluacion.pdf']::text[],
        'RADICADA',
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        CURRENT_TIMESTAMP
    )
ON CONFLICT (radicado) DO NOTHING;

-- ============================================
-- 4. Procesos Disciplinarios (12 procesos en diferentes etapas)
-- ============================================
INSERT INTO internal_disciplinary_control.disciplinary_processes (
    id, "radicadoProceso", "newsId", "abogado_asignado_id", "etapaActual", estado,
    "fechaPrescripcion", "fechaVencimientoEtapa", "createdAt", "updatedAt"
)
VALUES
    -- 1. Acoso laboral - En VALORACION (Tomás Gutiérrez)
    (
        'p1111111-1111-1111-1111-111111111111',
        'P-001-2025',
        '11111111-1111-1111-1111-111111111111', -- ND-2025-001
        'b2c3d4e5-f6a7-8901-bcde-f12345678901', -- Tomás Gutiérrez
        'VALORACION',
        'ACTIVO',
        '2030-01-15 09:30:00',
        '2025-07-15 09:30:00',
        '2025-01-20 09:30:00',
        CURRENT_TIMESTAMP
    ),
    -- 2. Malversación - En INDAGACION_PREVIA (María Fernanda López)
    (
        'p2222222-2222-2222-2222-222222222222',
        'P-002-2025',
        '22222222-2222-2222-2222-222222222222', -- ND-2025-002
        'c3d4e5f6-a7b8-9012-cdef-234567890123', -- María Fernanda López
        'INDAGACION_PREVIA',
        'ACTIVO',
        '2030-01-20 10:15:00',
        '2025-08-20 10:15:00',
        '2025-01-25 10:15:00',
        CURRENT_TIMESTAMP
    ),
    -- 3. Favorecimiento - En INVESTIGACION (Carlos Alberto Ruiz)
    (
        'p3333333-3333-3333-3333-333333333333',
        'P-003-2025',
        '33333333-3333-3333-3333-333333333333', -- ND-2025-003
        'd4e5f6a7-b8c9-0123-def0-345678901234', -- Carlos Alberto Ruiz
        'INVESTIGACION',
        'ACTIVO',
        '2030-02-05 14:20:00',
        '2025-09-05 14:20:00',
        '2025-02-10 14:20:00',
        CURRENT_TIMESTAMP
    ),
    -- 4. Negligencia académica - En JUZGAMIENTO (Ana Patricia Morales)
    (
        'p4444444-4444-4444-4444-444444444444',
        'P-004-2025',
        '44444444-4444-4444-4444-444444444444', -- ND-2025-004
        'e5f6a7b8-c9d0-1234-ef01-456789012345', -- Ana Patricia Morales
        'JUZGAMIENTO',
        'ACTIVO',
        '2030-02-10 08:45:00',
        '2025-10-10 08:45:00',
        '2025-02-15 08:45:00',
        CURRENT_TIMESTAMP
    ),
    -- 5. Uso indebido bienes - En FALLO (Jorge Iván Herrera)
    (
        'p5555555-5555-5555-5555-555555555555',
        'P-005-2025',
        '55555555-5555-5555-5555-555555555555', -- ND-2025-005
        'f6a7b8c9-d0e1-2345-f012-567890123456', -- Jorge Iván Herrera
        'FALLO',
        'ACTIVO',
        '2030-02-18 11:00:00',
        '2025-11-18 11:00:00',
        '2025-02-23 11:00:00',
        CURRENT_TIMESTAMP
    ),
    -- 6. Discriminación - ARCHIVO (art. 209 - inhibitorio) (Tomás Gutiérrez)
    (
        'p6666666-6666-6666-6666-666666666666',
        'P-006-2025',
        '66666666-6666-6666-6666-666666666666', -- ND-2025-006
        'b2c3d4e5-f6a7-8901-bcde-f12345678901', -- Tomás Gutiérrez
        'ARCHIVO',
        'ARCHIVADO',
        '2030-03-01 09:00:00',
        NULL,
        '2025-03-05 09:00:00',
        CURRENT_TIMESTAMP
    ),
    -- 7. Falsificación - INHIBITORIO (art. 209) (María Fernanda López)
    (
        'p7777777-7777-7777-7777-777777777777',
        'P-007-2025',
        '77777777-7777-7777-7777-777777777777', -- ND-2025-007
        'c3d4e5f6-a7b8-9012-cdef-234567890123', -- María Fernanda López
        'INHIBITORIO',
        'ARCHIVADO',
        '2030-03-10 16:30:00',
        NULL,
        '2025-03-15 16:30:00',
        CURRENT_TIMESTAMP
    ),
    -- 8. Hostigamiento sexual - En INDAGACION (Carlos Alberto Ruiz)
    (
        'p8888888-8888-8888-8888-888888888888',
        'P-008-2025',
        '88888888-8888-8888-8888-888888888888', -- ND-2025-008
        'd4e5f6a7-b8c9-0123-def0-345678901234', -- Carlos Alberto Ruiz
        'INDAGACION',
        'ACTIVO',
        '2030-03-15 10:00:00',
        '2025-12-15 10:00:00',
        '2025-03-20 10:00:00',
        CURRENT_TIMESTAMP
    ),
    -- 9. Incumplimiento deberes - En VALORACION (Ana Patricia Morales)
    (
        'p9999999-9999-9999-9999-999999999999',
        'P-009-2025',
        '99999999-9999-9999-9999-999999999999', -- ND-2025-009
        'e5f6a7b8-c9d0-1234-ef01-456789012345', -- Ana Patricia Morales
        'VALORACION',
        'ACTIVO',
        '2030-03-20 13:45:00',
        '2025-12-20 13:45:00',
        '2025-03-25 13:45:00',
        CURRENT_TIMESTAMP
    ),
    -- 10. Abuso autoridad - En INDAGACION_PREVIA (Jorge Iván Herrera)
    (
        'paaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'P-010-2025',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', -- ND-2025-010
        'f6a7b8c9-d0e1-2345-f012-567890123456', -- Jorge Iván Herrera
        'INDAGACION_PREVIA',
        'ACTIVO',
        '2030-04-01 08:30:00',
        '2025-01-01 08:30:00',
        '2025-04-05 08:30:00',
        CURRENT_TIMESTAMP
    ),
    -- 11. Acoso laboral sindical - En INVESTIGACION (Tomás Gutiérrez)
    (
        'pbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        'P-011-2025',
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', -- ND-2025-011
        'b2c3d4e5-f6a7-8901-bcde-f12345678901', -- Tomás Gutiérrez
        'INVESTIGACION',
        'ACTIVO',
        '2030-04-10 11:20:00',
        '2025-02-10 11:20:00',
        '2025-04-15 11:20:00',
        CURRENT_TIMESTAMP
    ),
    -- 12. Concusión - En JUZGAMIENTO (María Fernanda López)
    (
        'pccccccc-cccc-cccc-cccc-cccccccccccc',
        'P-012-2025',
        'cccccccc-cccc-cccc-cccc-cccccccccccc', -- ND-2025-012
        'c3d4e5f6-a7b8-9012-cdef-234567890123', -- María Fernanda López
        'JUZGAMIENTO',
        'ACTIVO',
        '2030-05-10 10:30:00',
        '2025-03-10 10:30:00',
        '2025-05-15 10:30:00',
        CURRENT_TIMESTAMP
    )
ON CONFLICT ("radicadoProceso") DO NOTHING;

-- ============================================
-- 5. Configuración de Autos (Tipos paramétricos)
-- ============================================
-- IDs son UUID generados automáticamente, usamos INSERT sin ID explícito
INSERT INTO internal_disciplinary_control.autos_configuration (
    tipo, nombre, estado, plantilla, stage, orden, "createdAt", "updatedAt",
    "nombre_plantilla", "descripcion_plantilla", "version_plantilla", "estado_plantilla"
)
VALUES
    -- Autos de apertura
    (
        'AUTO_APERTURA_VALORACION', 'Auto Apertura Valoración', 'activo', NULL, 'VALORACION', 1,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, NULL, '1.0', 'activo'
    ),
    (
        'AUTO_APERTURA_INDAGACION_PREVIA', 'Auto Apertura Indagación Previa', 'activo', NULL, 'INDAGACION_PREVIA', 2,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, NULL, '1.0', 'activo'
    ),
    (
        'AUTO_APERTURA_INDAGACION', 'Auto Apertura Indagación', 'activo', NULL, 'INDAGACION', 3,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, NULL, '1.0', 'activo'
    ),
    (
        'AUTO_APERTURA_INVESTIGACION', 'Auto Apertura Investigación', 'activo', NULL, 'INVESTIGACION', 4,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, NULL, '1.0', 'activo'
    ),
    (
        'AUTO_APERTURA_JUZGAMIENTO', 'Auto Apertura Juzgamiento', 'activo', NULL, 'JUZGAMIENTO', 5,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, NULL, '1.0', 'activo'
    ),
    -- Autos de cierre
    (
        'AUTO_ARCHIVO', 'Auto de Archivo', 'activo', NULL, 'ARCHIVO', 10,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, NULL, '1.0', 'activo'
    ),
    (
        'AUTO_INHIBITORIO', 'Auto de Inhibitorio', 'activo', NULL, 'INHIBITORIO', 11,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, NULL, '1.0', 'activo'
    ),
    -- Otros
    (
        'AUTO_PRORROGA', 'Auto de Prórroga', 'activo', NULL, NULL, 20,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, NULL, '1.0', 'activo'
    ),
    (
        'AUTO_FORMULACION_PLIEGO', 'Auto Formulación Pliego de Cargos', 'activo', NULL, 'CARGOS', 30,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, NULL, '1.0', 'activo'
    ),
    (
        'AUTO_NO_PREVISTO', 'Auto No Previsto', 'activo', NULL, NULL, 40,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, NULL, '1.0', 'activo'
    )
ON CONFLICT (tipo) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    estado = EXCLUDED.estado,
    stage = EXCLUDED.stage,
    orden = EXCLUDED.orden,
    "updatedAt" = CURRENT_TIMESTAMP;

-- ============================================
-- 6. Plantilla de Autos por Defecto
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
-- 7. Autos de ejemplo (para testing)
-- ============================================
-- Nota: Los autos se crean via API, aquí solo ejemplos de estructura
-- INSERT INTO internal_disciplinary_control.legal_autos (...)

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
-- SELECT 'Config Autos:', COUNT(*) FROM internal_disciplinary_control.autos_configuration
-- UNION ALL
-- SELECT 'Plantillas:', COUNT(*) FROM internal_disciplinary_control.plantilla_auto;