-- Migration: Seed for Juzgamiento Disciplinario V3
-- Description: Adds missing columns and seeds mock data for the 9 process cards in the Kanban

-- 1. ADD COLUMNS
ALTER TABLE "legal_management"."expedientes"
ADD COLUMN IF NOT EXISTS "tipo_falta" VARCHAR(50),
ADD COLUMN IF NOT EXISTS "dependencia_investigado" VARCHAR(150);

COMMENT ON COLUMN "legal_management"."expedientes"."tipo_falta" IS 'Severity: Leve, Grave, Gravísima';
COMMENT ON COLUMN "legal_management"."expedientes"."dependencia_investigado" IS 'Department of the investigated person';

-- 2. SEED EXPEDIENTES
-- Added "estado" and "fecha_radicacion" columns explicitly to avoid NOT NULL violations

-- PD-2025-001 (Grave, Avocamiento, Juan Carlos Pérez)
INSERT INTO "legal_management"."expedientes" (
    "id", "radicado", "jurisdiccion", "tipo_proceso", 
    "demandante", "demandado", "cargo_investigado", "dependencia_investigado",
    "etapa", "tipo_falta", "ley_aplicable", 
    "abogado_sustanciador", "hechos", "fecha_limite_etapa", "created_at", "estado", "fecha_radicacion"
) VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380001', 'PD-2025-001', 'DISCIPLINARIO', 'Disciplinario',
    'Control Interno', 'Juan Carlos Pérez', 'Coordinador Académico', 'Dirección Académica',
    'E1_AVOCAMIENTO', 'Grave', 'Ley 1952/2019',
    'Dr. Carlos Mendoza', 'Presunta irregularidad en contratación docente.', NOW() + INTERVAL '65 days', NOW(), 'EN_TRAMITE', NOW()
) ON CONFLICT ("radicado") DO UPDATE SET "etapa" = EXCLUDED."etapa", "tipo_falta" = EXCLUDED."tipo_falta";

-- PD-2025-002 (Leve, Avocamiento, María Fernanda González)
INSERT INTO "legal_management"."expedientes" (
    "id", "radicado", "jurisdiccion", "tipo_proceso", 
    "demandante", "demandado", "cargo_investigado", "dependencia_investigado",
    "etapa", "tipo_falta", "ley_aplicable", 
    "abogado_sustanciador", "hechos", "fecha_limite_etapa", "created_at", "estado", "fecha_radicacion"
) VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380002', 'PD-2025-002', 'DISCIPLINARIO', 'Disciplinario',
    'Queja Anónima', 'María Fernanda González', 'Secretaria', 'Financiera',
    'E1_AVOCAMIENTO', 'Leve', 'Ley 1952/2019',
    'Dra. Patricia Ruiz', 'Incumplimiento de horario laboral.', NOW() + INTERVAL '72 days', NOW(), 'EN_TRAMITE', NOW()
) ON CONFLICT ("radicado") DO NOTHING;

-- PD-2025-003 (Gravísima, Avocamiento, Pedro Antonio Martínez)
INSERT INTO "legal_management"."expedientes" (
    "id", "radicado", "jurisdiccion", "tipo_proceso", 
    "demandante", "demandado", "cargo_investigado", "dependencia_investigado",
    "etapa", "tipo_falta", "ley_aplicable", 
    "abogado_sustanciador", "hechos", "fecha_limite_etapa", "created_at", "estado", "fecha_radicacion"
) VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380003', 'PD-2025-003', 'DISCIPLINARIO', 'Disciplinario',
    'Auditoría', 'Pedro Antonio Martínez', 'Tesorero', 'Tesorería',
    'E1_AVOCAMIENTO', 'Gravísima', 'Ley 1952/2019',
    'Dr. Roberto Castro', 'Faltante en caja menor.', NOW() + INTERVAL '55 days', NOW(), 'EN_TRAMITE', NOW()
) ON CONFLICT ("radicado") DO NOTHING;

-- PD-2024-046 (Gravísima, Descargos, Carmen Elena Torres)
INSERT INTO "legal_management"."expedientes" (
    "id", "radicado", "jurisdiccion", "tipo_proceso", 
    "demandante", "demandado", "cargo_investigado", "dependencia_investigado",
    "etapa", "tipo_falta", "ley_aplicable", 
    "abogado_sustanciador", "hechos", "fecha_limite_etapa", "created_at", "estado", "fecha_radicacion"
) VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380004', 'PD-2024-046', 'DISCIPLINARIO', 'Disciplinario',
    'Control Interno', 'Carmen Elena Torres', 'Directora Recursos Humanos', 'Talento Humano',
    'E2_DESCARGOS', 'Gravísima', 'Ley 734/2002',
    'Dr. Carlos Mendoza', 'Nómina paralela.', NOW() + INTERVAL '10 days', NOW(), 'EN_TRAMITE', NOW()
) ON CONFLICT ("radicado") DO NOTHING;

-- 3. SEED ACTUACIONES (Autos, Evidencias, Oficios, Actas) for PD-2025-001
-- Autos
INSERT INTO "legal_management"."actuaciones" (
    "expediente_id", "tipo_actuacion", "descripcion", "fecha_actuacion", "documento_nombre", "usuario_responsable"
) VALUES 
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380001', 'AUTO', 'Auto de Apertura de Indagación', NOW() - INTERVAL '25 days', 'Auto_Apertura_001.pdf', 'Dr. Carlos Mendoza'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380001', 'AUTO', 'Auto de Pruebas', NOW() - INTERVAL '10 days', 'Auto_Pruebas_002.pdf', 'Dr. Carlos Mendoza');

-- Evidencias
INSERT INTO "legal_management"."actuaciones" (
    "expediente_id", "tipo_actuacion", "descripcion", "fecha_actuacion", "documento_nombre", "usuario_responsable"
) VALUES 
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380001', 'EVIDENCIA', 'Queja formal recibida', NOW() - INTERVAL '30 days', 'Queja_Soporte.pdf', 'Secretaría'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380001', 'EVIDENCIA', 'Informe de Auditoría', NOW() - INTERVAL '28 days', 'Informe_Final.pdf', 'Control Interno');

-- Oficios
INSERT INTO "legal_management"."actuaciones" (
    "expediente_id", "tipo_actuacion", "descripcion", "fecha_actuacion", "documento_nombre", "usuario_responsable"
) VALUES 
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380001', 'OFICIO', 'Solicitud de antecedentes', NOW() - INTERVAL '20 days', 'Oficio_Procuraduria.pdf', 'Secretaría'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380001', 'OFICIO', 'Citación a versión libre', NOW() - INTERVAL '5 days', 'Citacion_Disciplinado.pdf', 'Secretaría');

-- Actas
INSERT INTO "legal_management"."actuaciones" (
    "expediente_id", "tipo_actuacion", "descripcion", "fecha_actuacion", "documento_nombre", "usuario_responsable"
) VALUES 
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380001', 'ACTA', 'Acta de reparto', NOW() - INTERVAL '24 days', 'Acta_Reparto_001.pdf', 'Jefe Oficina');

-- Ultima Actuacion Logica
UPDATE "legal_management"."expedientes" 
SET "ultima_actuacion" = 'Solicitud de informes a RRHH' 
WHERE "radicado" = 'PD-2025-001';
