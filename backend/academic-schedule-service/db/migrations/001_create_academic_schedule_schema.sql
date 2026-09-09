-- ============================================================================
-- Migration: Create academic-schedule schema
-- Description: Crear esquema para la gestión de programación académica de la ESAP
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS "academic-schedule";

-- Comentario descriptivo del esquema
COMMENT ON SCHEMA "academic-schedule" IS 'Esquema para la gestión de franjas horarias, aulas, jornadas y programación académica institucional ESAP';

-- Tabla base de periodos de programación académica
CREATE TABLE IF NOT EXISTS "academic-schedule".periodo_programacion (
    id_periodo UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    is_activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de franjas horarias de programación
CREATE TABLE IF NOT EXISTS "academic-schedule".franja_horaria (
    id_franja UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_periodo UUID REFERENCES "academic-schedule".periodo_programacion(id_periodo),
    id_programa UUID,
    id_asignatura UUID,
    id_docente UUID,
    sede_codigo VARCHAR(50) NOT NULL,
    aula_codigo VARCHAR(50) NOT NULL,
    dia_semana VARCHAR(15) NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    jornada VARCHAR(30) DEFAULT 'DIURNA',
    cupo_maximo INT DEFAULT 30,
    estado VARCHAR(30) DEFAULT 'PROGRAMADO',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
