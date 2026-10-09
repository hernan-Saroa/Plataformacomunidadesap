-- ============================================================================
-- Migración 505: Parametrización de Jornada Laboral, Días Laborales y Anticipación
-- Permite configurar de forma paramétrica:
--   1. Horario de inicio y fin de jornada laboral (corte de radicación)
--   2. Días laborales hábiles de la semana (Lunes a Viernes por defecto)
--   3. Días hábiles de anticipación mínima para radicación ordinaria
--   4. Días hábiles de umbral para pago de avance en RP
-- ============================================================================
SET client_encoding = 'UTF8';

CREATE TABLE IF NOT EXISTS travel_expenses.config_jornada_laboral (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) NOT NULL UNIQUE DEFAULT 'DEFAULT',
    nombre VARCHAR(100) NOT NULL DEFAULT 'Jornada Laboral Institucional',
    hora_inicio VARCHAR(5) NOT NULL DEFAULT '08:00',
    hora_fin VARCHAR(5) NOT NULL DEFAULT '16:30',
    dias_laborales JSONB NOT NULL DEFAULT '[1, 2, 3, 4, 5]'::jsonb,
    dias_anticipacion_minima INTEGER NOT NULL DEFAULT 14,
    dias_umbral_avance INTEGER NOT NULL DEFAULT 5,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    descripcion TEXT DEFAULT 'Horario laboral institucional y días hábiles para radicación y trámites de viáticos',
    creado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    actualizado_por VARCHAR(100) DEFAULT 'Sistema'
);

CREATE INDEX IF NOT EXISTS idx_config_jornada_laboral_activo ON travel_expenses.config_jornada_laboral(activo);
CREATE INDEX IF NOT EXISTS idx_config_jornada_laboral_codigo ON travel_expenses.config_jornada_laboral(codigo);

-- Registro por defecto institucional (idempotente)
INSERT INTO travel_expenses.config_jornada_laboral (
    codigo,
    nombre,
    hora_inicio,
    hora_fin,
    dias_laborales,
    dias_anticipacion_minima,
    dias_umbral_avance,
    activo,
    descripcion
) VALUES (
    'DEFAULT',
    'Jornada Laboral Institucional',
    '08:00',
    '16:30',
    '[1, 2, 3, 4, 5]'::jsonb,
    14,
    5,
    TRUE,
    'Horario institucional de radicación y cómputo de términos de viáticos (8:00 AM - 4:30 PM, Lunes a Viernes)'
)
ON CONFLICT (codigo) DO NOTHING;

-- Sincronizar también en configuraciones_globales para resiliencia
INSERT INTO travel_expenses.configuraciones_globales (clave, valor, descripcion)
VALUES 
    ('HORA_INICIO_JORNADA', '08:00', 'Hora inicial de la jornada laboral para recepción y trámite de comisiones'),
    ('HORA_FIN_JORNADA', '16:30', 'Hora de corte de la jornada laboral diaria (después de esta hora corre al siguiente día hábil)'),
    ('DIAS_LABORALES_SEMANA', '[1, 2, 3, 4, 5]', 'Días laborales hábiles de la semana (1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes)'),
    ('DIAS_ANTICIPACION_MINIMA_SOLICITUD', '14', 'Días hábiles mínimos de anticipación para comisiones ordinarias (RF-EXT-001)'),
    ('DIAS_HABILES_UMBRAL_AVANCE_RP', '5', 'Días hábiles mínimos para expedir RP en modalidad AVANCE (RF-PRE-003)')
ON CONFLICT (clave) DO NOTHING;
