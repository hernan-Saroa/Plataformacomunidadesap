SET client_encoding = 'UTF8';

-- ============================================================================
-- MIGRACIÓN: Creación y Parametrización de TRD/TVD, Series y Subseries
-- Esquema: auth
-- ============================================================================

CREATE TABLE IF NOT EXISTS auth.trd_configuraciones (
    id SERIAL PRIMARY KEY,
    version VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(255) NOT NULL,
    tipo VARCHAR(20) NOT NULL DEFAULT 'TRD', -- 'TRD' | 'TVD'
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NULL, -- NULL indica vigencia actual / abierta
    acto_administrativo VARCHAR(255) NOT NULL, -- Decreto o Resolución de Adopción
    convalidacion_estado VARCHAR(255) NOT NULL, -- Concepto AGN, Comité de Archivo, etc.
    descripcion TEXT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    es_vigente BOOLEAN NOT NULL DEFAULT FALSE,
    creado_en TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auth_trd_version ON auth.trd_configuraciones(version);
CREATE INDEX IF NOT EXISTS idx_auth_trd_fechas ON auth.trd_configuraciones(fecha_inicio, fecha_fin);
CREATE INDEX IF NOT EXISTS idx_auth_trd_vigente ON auth.trd_configuraciones(es_vigente);

CREATE TABLE IF NOT EXISTS auth.trd_series_subseries (
    id SERIAL PRIMARY KEY,
    trd_id INTEGER NOT NULL REFERENCES auth.trd_configuraciones(id) ON DELETE CASCADE,
    codigo_dependencia VARCHAR(50) NOT NULL,
    nombre_dependencia VARCHAR(255) NOT NULL DEFAULT 'OFICINA DE CONTROL INTERNO DISCIPLINARIO',
    codigo_serie VARCHAR(50) NOT NULL,
    nombre_serie VARCHAR(255) NOT NULL DEFAULT 'PROCESOS JURÍDICOS',
    codigo_subserie VARCHAR(50) NOT NULL,
    nombre_subserie VARCHAR(255) NOT NULL DEFAULT 'PROCESOS DISCIPLINARIOS',
    codigo_identificacion_expediente VARCHAR(100) NULL,
    modulo VARCHAR(100) NOT NULL DEFAULT 'control-disciplinario',
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auth_trd_series_trd_id ON auth.trd_series_subseries(trd_id);
CREATE INDEX IF NOT EXISTS idx_auth_trd_series_modulo ON auth.trd_series_subseries(modulo);

-- Agregar columnas en procesos y evidencias disciplinarios para persistir la clasificación
-- y asegurar que cambios en la TRD no alteren la clasificación de documentos ya registrados:
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'disciplinary_processes') THEN
        ALTER TABLE public.disciplinary_processes ADD COLUMN IF NOT EXISTS codigo_dependencia VARCHAR(50);
        ALTER TABLE public.disciplinary_processes ADD COLUMN IF NOT EXISTS codigo_serie VARCHAR(50);
        ALTER TABLE public.disciplinary_processes ADD COLUMN IF NOT EXISTS nombre_serie VARCHAR(255);
        ALTER TABLE public.disciplinary_processes ADD COLUMN IF NOT EXISTS codigo_subserie VARCHAR(50);
        ALTER TABLE public.disciplinary_processes ADD COLUMN IF NOT EXISTS nombre_subserie VARCHAR(255);
        ALTER TABLE public.disciplinary_processes ADD COLUMN IF NOT EXISTS trd_version VARCHAR(50);
        ALTER TABLE public.disciplinary_processes ADD COLUMN IF NOT EXISTS codigo_identificacion_expediente VARCHAR(100);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'evidence') THEN
        ALTER TABLE public.evidence ADD COLUMN IF NOT EXISTS codigo_dependencia VARCHAR(50);
        ALTER TABLE public.evidence ADD COLUMN IF NOT EXISTS codigo_serie VARCHAR(50);
        ALTER TABLE public.evidence ADD COLUMN IF NOT EXISTS nombre_serie VARCHAR(255);
        ALTER TABLE public.evidence ADD COLUMN IF NOT EXISTS codigo_subserie VARCHAR(50);
        ALTER TABLE public.evidence ADD COLUMN IF NOT EXISTS nombre_subserie VARCHAR(255);
        ALTER TABLE public.evidence ADD COLUMN IF NOT EXISTS trd_version VARCHAR(50);
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- SEED DATA: Versiones TRD/TVD institucionales históricas y vigente
-- -----------------------------------------------------------------------------

-- TRD V1 (TVD Periodo 1)
INSERT INTO auth.trd_configuraciones (
    version, nombre, tipo, fecha_inicio, fecha_fin,
    acto_administrativo, convalidacion_estado, descripcion, activo, es_vigente
) VALUES (
    'TRD V1',
    'Tabla de Valoración Documental (TVD) - Periodo 1998 a 2006',
    'TVD',
    '1998-01-01',
    '2006-12-31',
    'Resolución / Acuerdo Directivo V1',
    'Aprobada por Comité de Archivo',
    'Fechas extremas iniciales sustentadas en Acuerdo Directivo V1',
    false,
    false
) ON CONFLICT (version) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    tipo = EXCLUDED.tipo,
    fecha_inicio = EXCLUDED.fecha_inicio,
    fecha_fin = EXCLUDED.fecha_fin,
    acto_administrativo = EXCLUDED.acto_administrativo,
    convalidacion_estado = EXCLUDED.convalidacion_estado,
    actualizado_en = CURRENT_TIMESTAMP;

-- TRD V2 (Periodo 2)
INSERT INTO auth.trd_configuraciones (
    version, nombre, tipo, fecha_inicio, fecha_fin,
    acto_administrativo, convalidacion_estado, descripcion, activo, es_vigente
) VALUES (
    'TRD V2',
    'Tabla de Retención Documental (TRD) - Periodo 2007 a 2014',
    'TRD',
    '2007-01-01',
    '2014-12-31',
    'Resolución Administrativa V2',
    'Convalidada / Comité de Archivo',
    'Fechas intermedias 2007-2014 convalidada por Comité de Archivo',
    false,
    false
) ON CONFLICT (version) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    tipo = EXCLUDED.tipo,
    fecha_inicio = EXCLUDED.fecha_inicio,
    fecha_fin = EXCLUDED.fecha_fin,
    acto_administrativo = EXCLUDED.acto_administrativo,
    convalidacion_estado = EXCLUDED.convalidacion_estado,
    actualizado_en = CURRENT_TIMESTAMP;

-- TRD V3 (Periodo 3)
INSERT INTO auth.trd_configuraciones (
    version, nombre, tipo, fecha_inicio, fecha_fin,
    acto_administrativo, convalidacion_estado, descripcion, activo, es_vigente
) VALUES (
    'TRD V3',
    'Tabla de Retención Documental (TRD) - Periodo 2015 a 2020',
    'TRD',
    '2015-01-01',
    '2020-12-31',
    'Resolución Administrativa V3',
    'Concepto técnico favorable AGN / CDA',
    'Fechas intermedias 2015-2020 con concepto técnico favorable AGN / CDA',
    false,
    false
) ON CONFLICT (version) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    tipo = EXCLUDED.tipo,
    fecha_inicio = EXCLUDED.fecha_inicio,
    fecha_fin = EXCLUDED.fecha_fin,
    acto_administrativo = EXCLUDED.acto_administrativo,
    convalidacion_estado = EXCLUDED.convalidacion_estado,
    actualizado_en = CURRENT_TIMESTAMP;

-- TRD V4 (Periodo 4 - Vigente)
INSERT INTO auth.trd_configuraciones (
    version, nombre, tipo, fecha_inicio, fecha_fin,
    acto_administrativo, convalidacion_estado, descripcion, activo, es_vigente
) VALUES (
    'TRD V4',
    'Tabla de Retención Documental (TRD) - Periodo 2021 a Actualidad',
    'TRD',
    '2021-01-01',
    NULL,
    'Resolución Vigente (Acuerdo 004/2019)',
    'Certificado Convalidación AGN y RUSD',
    'Versión vigente de la TRD institucional ESAP (Acuerdo 004/2019, AGN y RUSD)',
    true,
    true
) ON CONFLICT (version) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    tipo = EXCLUDED.tipo,
    fecha_inicio = EXCLUDED.fecha_inicio,
    fecha_fin = EXCLUDED.fecha_fin,
    acto_administrativo = EXCLUDED.acto_administrativo,
    convalidacion_estado = EXCLUDED.convalidacion_estado,
    activo = true,
    es_vigente = true,
    actualizado_en = CURRENT_TIMESTAMP;

-- Semillas de Series y Subseries asociadas a cada versión de TRD/TVD:

-- Para TRD V1 (Oficina 1101, Serie 75 'PROCESOS', Subserie 01 'PROCESOS DISCIPLINARIOS')
INSERT INTO auth.trd_series_subseries (
    trd_id, codigo_dependencia, nombre_dependencia, codigo_serie, nombre_serie,
    codigo_subserie, nombre_subserie, codigo_identificacion_expediente, modulo, activo
)
SELECT id, '1101', 'OFICINA DE CONTROL INTERNO DISCIPLINARIO', '75', 'PROCESOS',
       '01', 'PROCESOS DISCIPLINARIOS', '1101-75-01', 'control-disciplinario', false
FROM auth.trd_configuraciones WHERE version = 'TRD V1'
AND NOT EXISTS (
    SELECT 1 FROM auth.trd_series_subseries s
    JOIN auth.trd_configuraciones t ON s.trd_id = t.id
    WHERE t.version = 'TRD V1' AND s.codigo_serie = '75' AND s.codigo_subserie = '01'
);

-- Para TRD V2 (Oficina 10200, Serie 68 'PROCESOS JURÍDICOS', Subserie 22 'PROCESOS DISCIPLINARIOS')
INSERT INTO auth.trd_series_subseries (
    trd_id, codigo_dependencia, nombre_dependencia, codigo_serie, nombre_serie,
    codigo_subserie, nombre_subserie, codigo_identificacion_expediente, modulo, activo
)
SELECT id, '10200', 'OFICINA DE CONTROL INTERNO DISCIPLINARIO', '68', 'PROCESOS JURÍDICOS',
       '22', 'PROCESOS DISCIPLINARIOS', '10200.68.22', 'control-disciplinario', false
FROM auth.trd_configuraciones WHERE version = 'TRD V2'
AND NOT EXISTS (
    SELECT 1 FROM auth.trd_series_subseries s
    JOIN auth.trd_configuraciones t ON s.trd_id = t.id
    WHERE t.version = 'TRD V2' AND s.codigo_serie = '68' AND s.codigo_subserie = '22'
);

-- Para TRD V3 (Oficina 130.2, Serie 1330 'PROCESOS JURÍDICOS', Subserie 60 'PROCESOS DISCIPLINARIOS')
INSERT INTO auth.trd_series_subseries (
    trd_id, codigo_dependencia, nombre_dependencia, codigo_serie, nombre_serie,
    codigo_subserie, nombre_subserie, codigo_identificacion_expediente, modulo, activo
)
SELECT id, '130.2', 'OFICINA DE CONTROL INTERNO DISCIPLINARIO', '1330', 'PROCESOS JURÍDICOS',
       '60', 'PROCESOS DISCIPLINARIOS', '130.2.1330.60', 'control-disciplinario', false
FROM auth.trd_configuraciones WHERE version = 'TRD V3'
AND NOT EXISTS (
    SELECT 1 FROM auth.trd_series_subseries s
    JOIN auth.trd_configuraciones t ON s.trd_id = t.id
    WHERE t.version = 'TRD V3' AND s.codigo_serie = '1330' AND s.codigo_subserie = '60'
);

-- Para TRD V4 Vigente (Oficina 150, Serie 250 'PROCESOS JURÍDICOS', Subserie 05 'PROCESOS DISCIPLINARIOS')
INSERT INTO auth.trd_series_subseries (
    trd_id, codigo_dependencia, nombre_dependencia, codigo_serie, nombre_serie,
    codigo_subserie, nombre_subserie, codigo_identificacion_expediente, modulo, activo
)
SELECT id, '150', 'OFICINA DE CONTROL INTERNO DISCIPLINARIO', '250', 'PROCESOS JURÍDICOS',
       '05', 'PROCESOS DISCIPLINARIOS', '12_150_250_05', 'control-disciplinario', true
FROM auth.trd_configuraciones WHERE version = 'TRD V4'
AND NOT EXISTS (
    SELECT 1 FROM auth.trd_series_subseries s
    JOIN auth.trd_configuraciones t ON s.trd_id = t.id
    WHERE t.version = 'TRD V4' AND s.codigo_serie = '250' AND s.codigo_subserie = '05'
);
