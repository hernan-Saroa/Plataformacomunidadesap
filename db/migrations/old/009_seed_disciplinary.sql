-- ============================================
-- Seed Data para Internal Disciplinary Control Service
-- Ejecutar despues de 007_schema_disciplinary.sql
-- ============================================

-- 1. Secuencias
INSERT INTO internal_disciplinary_control.sequences (name, "currentValue", "updatedAt")
VALUES
    ('DISCIPLINARY_NEWS_2025', 4, CURRENT_TIMESTAMP),
    ('DISCIPLINARY_PROCESS_2025', 4, CURRENT_TIMESTAMP)
ON CONFLICT (name) DO UPDATE SET
    "currentValue" = EXCLUDED."currentValue",
    "updatedAt" = CURRENT_TIMESTAMP;

-- 2. Profesionales
INSERT INTO internal_disciplinary_control.disciplinary_professional (
    id, nombre_completo, email, cargo, capacidad_maxima, estado, created_at, updated_at
)
VALUES
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Hernan Buitrago', 'jefe@esap.edu.co', 'Jefe de Oficina', 10, 'ACTIVO', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Tomas Gutierrez', 'tomas@esap.edu.co', 'Profesional Universitario', 10, 'ACTIVO', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('c4d5e6f7-a8b9-0123-cdef-456789012345', 'Maria Garcia Londono', 'maria.garcia@esap.edu.co', 'Profesional Especializado', 12, 'ACTIVO', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (email) DO NOTHING;

-- 3. Configuracion de Etapas
INSERT INTO internal_disciplinary_control.stage_configuration (id, etapa, "diasHabiles", descripcion, activo)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'EVALUACION', 10, 'Valoracion inicial', TRUE),
    ('22222222-2222-2222-2222-222222222222', 'INDAGACION_PREVIA', 40, 'Indagacion previa', TRUE),
    ('33333333-3333-3333-3333-333333333333', 'INVESTIGACION', 60, 'Investigacion', TRUE),
    ('44444444-4444-4444-4444-444444444444', 'JUZGAMIENTO', 30, 'Juzgamiento', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 4. Configuracion Global
INSERT INTO internal_disciplinary_control.system_configuration (id, "roleCapacities", "notificationSettings", "alertSettings", "securitySettings")
VALUES (
  '55555555-5555-5555-5555-555555555555',
  '{"especializado":12,"universitario":10,"coordinador":8}',
  '{"vencimiento7dias":true,"vencimiento3dias":true,"vencimiento1dia":true,"procesoVencido":true,"asignacionProceso":true}',
  '{"porcentajeRiesgo":80,"porcentajeCritico":95,"diasAnticipacion":7}',
  '{"auditEnabled":true,"digitalSignature":true,"backupEnabled":true}'
) ON CONFLICT (id) DO NOTHING;

-- 5. Noticias
-- INSERT INTO internal_disciplinary_control.disciplinary_news (
--     id, radicado, "fechaRecepcion", origen, territorial, "dependenciaDenunciado",
--     denunciante, disciplinable, hechos, adjuntos, estado, "updatedAt"
-- ) VALUES
--     ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'ND-2025-001', CURRENT_TIMESTAMP, 'QUEJOSO', 'BOGOTA', 'TALENTO HUMANO',
--       '{"nombre":"Pedro Sanchez Ruiz","cedula":"1012345678","email":"pedro.sanchez@example.com","cargo":"Ciudadano"}',
--       '{"nombre":"Juan Perez Gomez","cedula":"80123456","cargo":"Profesional Territorial"}',
--       'Presunto acoso laboral en territorial Bogota.', ARRAY[]::text[], 'RADICADA', CURRENT_TIMESTAMP),
--     ('d4e5f6a7-b8c9-0123-def0-234567890123', 'ND-2025-002', CURRENT_TIMESTAMP, 'OFICIO', 'MEDELLIN', 'TESORERIA',
--       '{"nombre":"Inspector ESAP","email":"inspector@esap.gov.co","cargo":"Inspector"}',
--       '{"nombre":"Roberto Perez Mendez","cedula":"5555555555","cargo":"Tesorero Regional"}',
--       'Presunta irregularidad en el manejo de fondos publicos segun auditoria interna.', ARRAY[]::text[], 'RADICADA', CURRENT_TIMESTAMP),
--     ('e5f6a7b8-c9d0-1234-ef01-345678901234', 'ND-2025-003', CURRENT_TIMESTAMP, 'ANONIMO', 'CALI', 'CONTRATACION',
--       '{"nombre":"Anonimo"}',
--       '{"nombre":"Carlos Ruiz","cedula":"111222333","cargo":"Contratista"}',
--       'Posible favorecimiento en proceso de licitacion.', ARRAY[]::text[], 'DEVUELTA', CURRENT_TIMESTAMP),
--     ('f7a8b9c0-d1e2-3456-f789-012345678901', 'ND-2025-004', CURRENT_TIMESTAMP, 'REMISION', 'BARRANQUILLA', 'PLANEACION',
--       '{"nombre":"Oficina Control Interno","email":"oci@esap.edu.co"}',
--       '{"nombre":"Luisa Fernandez","cedula":"321654987","cargo":"Profesional Planeacion"}',
--       'Remision por posible conflicto de interes en contratacion.', ARRAY[]::text[], 'RADICADA', CURRENT_TIMESTAMP)
-- ON CONFLICT (radicado) DO NOTHING;

-- 6. Procesos
-- INSERT INTO internal_disciplinary_control.disciplinary_processes (
--     id, "radicadoProceso", "newsId", abogado_asignado_id, "etapaActual", estado,
--     "fechaPrescripcion", "fechaVencimientoEtapa", observaciones, "createdAt", "updatedAt"
-- ) VALUES
--     ('f6a7b8c9-d0e1-2345-f012-456789012345', 'P-001-2025', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
--       'EVALUACION', 'ACTIVO', CURRENT_TIMESTAMP + INTERVAL '15 years', CURRENT_TIMESTAMP + INTERVAL '10 days', 'Asignado para valoracion inicial', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
--     ('a7b8c9d0-e1f2-3456-0123-567890123456', 'P-002-2025', 'd4e5f6a7-b8c9-0123-def0-234567890123', 'c4d5e6f7-a8b9-0123-cdef-456789012345',
--       'INDAGACION_PREVIA', 'ACTIVO', CURRENT_TIMESTAMP + INTERVAL '15 years', CURRENT_TIMESTAMP + INTERVAL '40 days', 'En indagacion previa', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
--     ('b8c9d0e1-f2a3-4567-0123-678901234567', 'P-003-2025', 'e5f6a7b8-c9d0-1234-ef01-345678901234', 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
--       'INVESTIGACION', 'ACTIVO', CURRENT_TIMESTAMP + INTERVAL '15 years', CURRENT_TIMESTAMP + INTERVAL '60 days', 'Pruebas en curso', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
--     ('c9d0e1f2-a3b4-5678-1234-789012345678', 'P-004-2025', 'f7a8b9c0-d1e2-3456-f789-012345678901', 'c4d5e6f7-a8b9-0123-cdef-456789012345',
--       'JUZGAMIENTO', 'ACTIVO', CURRENT_TIMESTAMP + INTERVAL '15 years', CURRENT_TIMESTAMP + INTERVAL '30 days', 'Etapa de juzgamiento programada', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
-- ON CONFLICT ("radicadoProceso") DO NOTHING;

-- Marcar noticias usadas como asignadas
-- UPDATE internal_disciplinary_control.disciplinary_news
-- SET estado = 'ASIGNADA'
-- WHERE id IN (
--   'c3d4e5f6-a7b8-9012-cdef-123456789012',
--   'd4e5f6a7-b8c9-0123-def0-234567890123',
--   'e5f6a7b8-c9d0-1234-ef01-345678901234',
--   'f7a8b9c0-d1e2-3456-f789-012345678901'
-- );
