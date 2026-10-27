SET client_encoding = 'UTF8';

-- ============================================================================
-- MIGRACIÓN / SEED DE AJUSTE: Corrección Códigos y Nombres TRD/TVD Control Disciplinario
--
-- Detalle de correcciones:
--   TRD V4 (Vigente):
--     Oficina: 150
--     Serie:   250 – PROCESOS JURÍDICOS
--     Subserie: 05 – PROCESOS DISCIPLINARIOS
--     Identificador: 12_150_250_05
--
--   TRD V3:
--     Oficina: 130.2
--     Serie:   1330 – PROCESOS JURÍDICOS
--     Subserie: 60 – PROCESOS DISCIPLINARIOS
--     Identificador: 130.2.1330.60
--
--   TRD V2:
--     Oficina: 10200
--     Serie:   68 – PROCESOS JURÍDICOS
--     Subserie: 22 – PROCESOS DISCIPLINARIOS
--     Identificador: 10200.68.22
--
--   TRD V1 / TVD 1:
--     Oficina: 1101
--     Serie:   75 – PROCESOS  (Solo PROCESOS, no "PROCESOS JUDICIALES")
--     Subserie: 01 – PROCESOS DISCIPLINARIOS
--     Identificador: 1101-75-01
-- ============================================================================

-- 1. Asegurar que las tablas existan
CREATE TABLE IF NOT EXISTS auth.trd_configuraciones (
    id SERIAL PRIMARY KEY,
    version VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(255) NOT NULL,
    tipo VARCHAR(20) NOT NULL DEFAULT 'TRD',
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NULL,
    acto_administrativo VARCHAR(255) NOT NULL,
    convalidacion_estado VARCHAR(255) NOT NULL,
    descripcion TEXT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    es_vigente BOOLEAN NOT NULL DEFAULT FALSE,
    creado_en TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

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

-- 2. Asegurar versiones TRD base
INSERT INTO auth.trd_configuraciones (version, nombre, tipo, fecha_inicio, fecha_fin, acto_administrativo, convalidacion_estado, descripcion, activo, es_vigente)
VALUES
    ('TRD V1', 'Tabla de Valoración Documental (TVD) - Periodo 1998 a 2006', 'TVD', '1998-01-01', '2006-12-31', 'Resolución / Acuerdo Directivo V1', 'Aprobada por Comité de Archivo', 'Fechas extremas iniciales sustentadas en Acuerdo Directivo V1', false, false),
    ('TRD V2', 'Tabla de Retención Documental (TRD) - Periodo 2007 a 2014', 'TRD', '2007-01-01', '2014-12-31', 'Resolución Administrativa V2', 'Convalidada / Comité de Archivo', 'Fechas intermedias 2007-2014 convalidada por Comité de Archivo', false, false),
    ('TRD V3', 'Tabla de Retención Documental (TRD) - Periodo 2015 a 2020', 'TRD', '2015-01-01', '2020-12-31', 'Resolución Administrativa V3', 'Concepto técnico favorable AGN / CDA', 'Fechas intermedias 2015-2020 con concepto técnico favorable AGN / CDA', false, false),
    ('TRD V4', 'Tabla de Retención Documental (TRD) - Periodo 2021 a Actualidad', 'TRD', '2021-01-01', NULL, 'Resolución Vigente (Acuerdo 004/2019)', 'Certificado Convalidación AGN y RUSD', 'Versión vigente de la TRD institucional ESAP (Acuerdo 004/2019, AGN y RUSD)', true, true)
ON CONFLICT (version) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    tipo = EXCLUDED.tipo,
    fecha_inicio = EXCLUDED.fecha_inicio,
    fecha_fin = EXCLUDED.fecha_fin,
    acto_administrativo = EXCLUDED.acto_administrativo,
    convalidacion_estado = EXCLUDED.convalidacion_estado,
    actualizado_en = CURRENT_TIMESTAMP;

-- 3. Actualizar / Insertar TRD V4 (Vigente: 150 / 250 PROCESOS JURÍDICOS / 05 PROCESOS DISCIPLINARIOS / 12_150_250_05)
DO $$
DECLARE
    v_trd_v4_id INTEGER;
BEGIN
    SELECT id INTO v_trd_v4_id FROM auth.trd_configuraciones WHERE version = 'TRD V4';
    IF v_trd_v4_id IS NOT NULL THEN
        UPDATE auth.trd_series_subseries
        SET codigo_dependencia = '150',
            nombre_dependencia = 'OFICINA DE CONTROL INTERNO DISCIPLINARIO',
            codigo_serie = '250',
            nombre_serie = 'PROCESOS JURÍDICOS',
            codigo_subserie = '05',
            nombre_subserie = 'PROCESOS DISCIPLINARIOS',
            codigo_identificacion_expediente = '12_150_250_05',
            activo = true,
            actualizado_en = CURRENT_TIMESTAMP
        WHERE trd_id = v_trd_v4_id AND modulo = 'control-disciplinario';

        IF NOT FOUND THEN
            INSERT INTO auth.trd_series_subseries (
                trd_id, codigo_dependencia, nombre_dependencia, codigo_serie, nombre_serie,
                codigo_subserie, nombre_subserie, codigo_identificacion_expediente, modulo, activo
            ) VALUES (
                v_trd_v4_id, '150', 'OFICINA DE CONTROL INTERNO DISCIPLINARIO', '250', 'PROCESOS JURÍDICOS',
                '05', 'PROCESOS DISCIPLINARIOS', '12_150_250_05', 'control-disciplinario', true
            );
        END IF;
    END IF;
END $$;

-- 4. Actualizar / Insertar TRD V3 (130.2 / 1330 PROCESOS JURÍDICOS / 60 PROCESOS DISCIPLINARIOS / 130.2.1330.60)
DO $$
DECLARE
    v_trd_v3_id INTEGER;
BEGIN
    SELECT id INTO v_trd_v3_id FROM auth.trd_configuraciones WHERE version = 'TRD V3';
    IF v_trd_v3_id IS NOT NULL THEN
        UPDATE auth.trd_series_subseries
        SET codigo_dependencia = '130.2',
            nombre_dependencia = 'OFICINA DE CONTROL INTERNO DISCIPLINARIO',
            codigo_serie = '1330',
            nombre_serie = 'PROCESOS JURÍDICOS',
            codigo_subserie = '60',
            nombre_subserie = 'PROCESOS DISCIPLINARIOS',
            codigo_identificacion_expediente = '130.2.1330.60',
            activo = false,
            actualizado_en = CURRENT_TIMESTAMP
        WHERE trd_id = v_trd_v3_id AND modulo = 'control-disciplinario';

        IF NOT FOUND THEN
            INSERT INTO auth.trd_series_subseries (
                trd_id, codigo_dependencia, nombre_dependencia, codigo_serie, nombre_serie,
                codigo_subserie, nombre_subserie, codigo_identificacion_expediente, modulo, activo
            ) VALUES (
                v_trd_v3_id, '130.2', 'OFICINA DE CONTROL INTERNO DISCIPLINARIO', '1330', 'PROCESOS JURÍDICOS',
                '60', 'PROCESOS DISCIPLINARIOS', '130.2.1330.60', 'control-disciplinario', false
            );
        END IF;
    END IF;
END $$;

-- 5. Actualizar / Insertar TRD V2 (10200 / 68 PROCESOS JURÍDICOS / 22 PROCESOS DISCIPLINARIOS / 10200.68.22)
DO $$
DECLARE
    v_trd_v2_id INTEGER;
BEGIN
    SELECT id INTO v_trd_v2_id FROM auth.trd_configuraciones WHERE version = 'TRD V2';
    IF v_trd_v2_id IS NOT NULL THEN
        UPDATE auth.trd_series_subseries
        SET codigo_dependencia = '10200',
            nombre_dependencia = 'OFICINA DE CONTROL INTERNO DISCIPLINARIO',
            codigo_serie = '68',
            nombre_serie = 'PROCESOS JURÍDICOS',
            codigo_subserie = '22',
            nombre_subserie = 'PROCESOS DISCIPLINARIOS',
            codigo_identificacion_expediente = '10200.68.22',
            activo = false,
            actualizado_en = CURRENT_TIMESTAMP
        WHERE trd_id = v_trd_v2_id AND modulo = 'control-disciplinario';

        IF NOT FOUND THEN
            INSERT INTO auth.trd_series_subseries (
                trd_id, codigo_dependencia, nombre_dependencia, codigo_serie, nombre_serie,
                codigo_subserie, nombre_subserie, codigo_identificacion_expediente, modulo, activo
            ) VALUES (
                v_trd_v2_id, '10200', 'OFICINA DE CONTROL INTERNO DISCIPLINARIO', '68', 'PROCESOS JURÍDICOS',
                '22', 'PROCESOS DISCIPLINARIOS', '10200.68.22', 'control-disciplinario', false
            );
        END IF;
    END IF;
END $$;

-- 6. Actualizar / Insertar TRD V1 (1101 / 75 PROCESOS / 01 PROCESOS DISCIPLINARIOS / 1101-75-01)
DO $$
DECLARE
    v_trd_v1_id INTEGER;
BEGIN
    SELECT id INTO v_trd_v1_id FROM auth.trd_configuraciones WHERE version = 'TRD V1';
    IF v_trd_v1_id IS NOT NULL THEN
        UPDATE auth.trd_series_subseries
        SET codigo_dependencia = '1101',
            nombre_dependencia = 'OFICINA DE CONTROL INTERNO DISCIPLINARIO',
            codigo_serie = '75',
            nombre_serie = 'PROCESOS',
            codigo_subserie = '01',
            nombre_subserie = 'PROCESOS DISCIPLINARIOS',
            codigo_identificacion_expediente = '1101-75-01',
            activo = false,
            actualizado_en = CURRENT_TIMESTAMP
        WHERE trd_id = v_trd_v1_id AND modulo = 'control-disciplinario';

        IF NOT FOUND THEN
            INSERT INTO auth.trd_series_subseries (
                trd_id, codigo_dependencia, nombre_dependencia, codigo_serie, nombre_serie,
                codigo_subserie, nombre_subserie, codigo_identificacion_expediente, modulo, activo
            ) VALUES (
                v_trd_v1_id, '1101', 'OFICINA DE CONTROL INTERNO DISCIPLINARIO', '75', 'PROCESOS',
                '01', 'PROCESOS DISCIPLINARIOS', '1101-75-01', 'control-disciplinario', false
            );
        END IF;
    END IF;
END $$;

-- 7. Eliminar registros duplicados obsoletos de series/subseries si existieran de ejecuciones anteriores
DELETE FROM auth.trd_series_subseries a
USING auth.trd_series_subseries b
WHERE a.trd_id = b.trd_id
  AND a.modulo = b.modulo
  AND a.id < b.id;

-- 8. Actualizar procesos disciplinarios y evidencias existentes que tengan serie 250 con nombre anterior erróneo
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'disciplinary_processes') THEN
        UPDATE public.disciplinary_processes
        SET nombre_serie = 'PROCESOS JURÍDICOS'
        WHERE codigo_serie = '250' AND (nombre_serie IS NULL OR nombre_serie = 'PROCESOS DISCIPLINARIOS');
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'evidence') THEN
        UPDATE public.evidence
        SET nombre_serie = 'PROCESOS JURÍDICOS'
        WHERE codigo_serie = '250' AND (nombre_serie IS NULL OR nombre_serie = 'PROCESOS DISCIPLINARIOS');
    END IF;
END $$;
