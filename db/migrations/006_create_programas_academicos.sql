-- Crear tabla de programas académicos y tablas relacionadas
-- Esquema: auth

-- Asegurar esquema
CREATE SCHEMA IF NOT EXISTS auth;

-- Tabla principal de programas académicos
CREATE TABLE IF NOT EXISTS auth.programas_academicos (
    id              BIGSERIAL PRIMARY KEY,
    codigo          TEXT NOT NULL UNIQUE,
    nombre          TEXT NOT NULL,
    nivel_formacion TEXT NOT NULL, -- Pregrado, Especialización, Maestría, Doctorado, etc.
    modalidad       TEXT NOT NULL, -- Presencial, Virtual, Distancia, Dual
    jornada         TEXT NOT NULL, -- Diurna, Nocturna, Mixta, Flexible
    duracion_semestres INTEGER NOT NULL,
    creditos        INTEGER NOT NULL,
    sede_id         INTEGER NOT NULL REFERENCES auth.sedes(id_sede) ON DELETE RESTRICT,
    facultad        TEXT,
    estado          TEXT NOT NULL DEFAULT 'Activo',
    descripcion     TEXT,
    perfil_egresado TEXT,
    requisitos_ingreso TEXT[],
    costo_matricula NUMERIC(14,2),
    estudiantes_activos INTEGER DEFAULT 0,
    graduados       INTEGER DEFAULT 0,
    docentes_asignados INTEGER DEFAULT 0,
    fecha_creacion  DATE,
    ultima_actualizacion DATE DEFAULT CURRENT_DATE,
    creado_en       TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    actualizado_en  TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Tabla de registros calificados (uno a uno con programa)
CREATE TABLE IF NOT EXISTS auth.registros_calificados (
    id              BIGSERIAL PRIMARY KEY,
    programa_id     BIGINT NOT NULL REFERENCES auth.programas_academicos(id) ON DELETE CASCADE,
    numero          TEXT NOT NULL,
    fecha_emision   DATE NOT NULL,
    vigencia        DATE NOT NULL,
    creado_en       TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    actualizado_en  TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    CONSTRAINT uk_registro_programa UNIQUE (programa_id)
);

-- Tabla de acreditaciones (puede haber más de una por programa si se requiere)
CREATE TABLE IF NOT EXISTS auth.acreditaciones_programa (
    id              BIGSERIAL PRIMARY KEY,
    programa_id     BIGINT NOT NULL REFERENCES auth.programas_academicos(id) ON DELETE CASCADE,
    tipo            TEXT NOT NULL, -- Alta Calidad, Internacional, etc.
    vigencia        DATE NOT NULL,
    creado_en       TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    actualizado_en  TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Índices útiles
CREATE INDEX IF NOT EXISTS idx_programas_sede ON auth.programas_academicos(sede_id);
CREATE INDEX IF NOT EXISTS idx_programas_estado ON auth.programas_academicos(estado);
CREATE INDEX IF NOT EXISTS idx_acreditaciones_programa ON auth.acreditaciones_programa(programa_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION auth.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_programas_academicos_updated_at'
  ) THEN
    CREATE TRIGGER trg_programas_academicos_updated_at
    BEFORE UPDATE ON auth.programas_academicos
    FOR EACH ROW EXECUTE FUNCTION auth.set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_registros_calificados_updated_at'
  ) THEN
    CREATE TRIGGER trg_registros_calificados_updated_at
    BEFORE UPDATE ON auth.registros_calificados
    FOR EACH ROW EXECUTE FUNCTION auth.set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_acreditaciones_programa_updated_at'
  ) THEN
    CREATE TRIGGER trg_acreditaciones_programa_updated_at
    BEFORE UPDATE ON auth.acreditaciones_programa
    FOR EACH ROW EXECUTE FUNCTION auth.set_updated_at();
  END IF;
END;
$$;
