-- Migration 326: Create catalog tables for academic work plan import
-- Schema: academic_work_plan

-- Drop old tables to avoid conflicts
DROP TABLE IF EXISTS academic_work_plan.oferta_cetap_programa CASCADE;
DROP TABLE IF EXISTS academic_work_plan.asignatura CASCADE;
DROP TABLE IF EXISTS academic_work_plan.cetap_alias CASCADE;
DROP TABLE IF EXISTS academic_work_plan.cetap CASCADE;
DROP TABLE IF EXISTS academic_work_plan.nucleo_tematico CASCADE;
DROP TABLE IF EXISTS academic_work_plan.programa CASCADE;
DROP TABLE IF EXISTS academic_work_plan.periodo_academico CASCADE;
DROP TABLE IF EXISTS academic_work_plan.ubicacion_semestral CASCADE;
DROP TABLE IF EXISTS academic_work_plan.direccion_territorial CASCADE;
DROP TABLE IF EXISTS academic_work_plan.facultad CASCADE;

-- Drop legacy tables if they exist
DROP TABLE IF EXISTS academic_work_plan."Asignatura" CASCADE;
DROP TABLE IF EXISTS academic_work_plan.programas CASCADE;

-- Create facultad table
CREATE TABLE academic_work_plan.facultad (
    id          BIGSERIAL PRIMARY KEY,
    codigo      VARCHAR(20) NOT NULL UNIQUE,
    nombre      VARCHAR(50) NOT NULL UNIQUE,
    activo      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by  BIGINT,
    updated_at  TIMESTAMP,
    updated_by  BIGINT,
    deleted_at  TIMESTAMP,
    deleted_by  BIGINT
);

-- Create direccion_territorial table
CREATE TABLE academic_work_plan.direccion_territorial (
    id                    BIGSERIAL PRIMARY KEY,
    codigo                VARCHAR(20) NOT NULL UNIQUE,
    nombre                VARCHAR(50) NOT NULL UNIQUE,
    nombre_normalizado    VARCHAR(50) NOT NULL UNIQUE,
    activo                BOOLEAN NOT NULL DEFAULT TRUE,
    orden_visualizacion   INT NOT NULL DEFAULT 999,
    created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by            BIGINT,
    updated_at            TIMESTAMP,
    updated_by            BIGINT,
    deleted_at            TIMESTAMP,
    deleted_by            BIGINT
);

-- Create ubicacion_semestral table
CREATE TABLE academic_work_plan.ubicacion_semestral (
    id              SMALLSERIAL PRIMARY KEY,
    codigo          VARCHAR(10) NOT NULL UNIQUE,
    etiqueta        VARCHAR(30) NOT NULL UNIQUE,
    tipo_programa   VARCHAR(20) NOT NULL CHECK (tipo_programa IN ('pregrado','posgrado')),
    orden           SMALLINT NOT NULL
);

-- Create periodo_academico table
CREATE TABLE academic_work_plan.periodo_academico (
    id              BIGSERIAL PRIMARY KEY,
    codigo          VARCHAR(10) NOT NULL UNIQUE,
    anio            INT NOT NULL,
    semestre        SMALLINT NOT NULL CHECK (semestre IN (1,2)),
    fecha_inicio    DATE NOT NULL,
    fecha_fin       DATE NOT NULL,
    estado          VARCHAR(20) NOT NULL DEFAULT 'planeacion' CHECK (estado IN ('planeacion','concertacion','en_curso','cerrado')),
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by      BIGINT,
    updated_at      TIMESTAMP,
    updated_by      BIGINT,
    CONSTRAINT uq_periodo_anio_sem UNIQUE (anio, semestre),
    CONSTRAINT chk_periodo_fechas CHECK (fecha_fin > fecha_inicio)
);

-- Create programa table
CREATE TABLE academic_work_plan.programa (
    id                       BIGSERIAL PRIMARY KEY,
    codigo                   VARCHAR(20) NOT NULL UNIQUE,
    nombre                   VARCHAR(100) NOT NULL UNIQUE,
    nombre_excel             VARCHAR(100) NOT NULL UNIQUE,
    nombre_corto             VARCHAR(30) NOT NULL UNIQUE,
    id_facultad              BIGINT NOT NULL REFERENCES academic_work_plan.facultad(id),
    tipo                     VARCHAR(20) NOT NULL CHECK (tipo IN ('pregrado','especializacion','maestria')),
    modalidad                VARCHAR(20) NOT NULL CHECK (modalidad IN ('presencial','distancia','mixto')),
    horas_base_por_credito   INT NOT NULL DEFAULT 16,
    horas_pregrado_central   INT,
    activo                   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by               BIGINT,
    updated_at               TIMESTAMP,
    updated_by               BIGINT,
    deleted_at               TIMESTAMP,
    deleted_by               BIGINT
);
CREATE INDEX idx_programa_facultad ON academic_work_plan.programa(id_facultad);
CREATE INDEX idx_programa_tipo ON academic_work_plan.programa(tipo);

-- Create nucleo_tematico table
CREATE TABLE academic_work_plan.nucleo_tematico (
    id              BIGSERIAL PRIMARY KEY,
    codigo          VARCHAR(20) NOT NULL UNIQUE,
    nombre          VARCHAR(100) NOT NULL UNIQUE,
    id_programa     BIGINT REFERENCES academic_work_plan.programa(id),
    descripcion     TEXT,
    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by      BIGINT,
    updated_at      TIMESTAMP,
    updated_by      BIGINT,
    deleted_at      TIMESTAMP,
    deleted_by      BIGINT
);
CREATE INDEX idx_nt_programa ON academic_work_plan.nucleo_tematico(id_programa);

-- Create cetap table
CREATE TABLE academic_work_plan.cetap (
    id                          BIGSERIAL PRIMARY KEY,
    codigo                      VARCHAR(20) NOT NULL UNIQUE,
    nombre                      VARCHAR(100) NOT NULL,
    nombre_normalizado          VARCHAR(100) NOT NULL,
    id_direccion_territorial    BIGINT NOT NULL REFERENCES academic_work_plan.direccion_territorial(id),
    tipo                        VARCHAR(20) NOT NULL DEFAULT 'cetap' CHECK (tipo IN ('sede_central','cetap','otro')),
    latitud                     DECIMAL(10,7),
    longitud                    DECIMAL(10,7),
    activo                      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at                  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                  BIGINT,
    updated_at                  TIMESTAMP,
    updated_by                  BIGINT,
    deleted_at                  TIMESTAMP,
    deleted_by                  BIGINT,
    CONSTRAINT uq_cetap_dt_nombre UNIQUE (id_direccion_territorial, nombre_normalizado)
);
CREATE INDEX idx_cetap_dt ON academic_work_plan.cetap(id_direccion_territorial);
CREATE INDEX idx_cetap_activo ON academic_work_plan.cetap(activo);

-- Create cetap_alias table
CREATE TABLE academic_work_plan.cetap_alias (
    id                   BIGSERIAL PRIMARY KEY,
    id_cetap             BIGINT NOT NULL REFERENCES academic_work_plan.cetap(id),
    alias                VARCHAR(100) NOT NULL,
    alias_normalizado    VARCHAR(100) NOT NULL UNIQUE,
    origen               VARCHAR(50) DEFAULT 'excel_2025_2',
    created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by           BIGINT
);
CREATE INDEX idx_alias_cetap ON academic_work_plan.cetap_alias(id_cetap);

-- Create asignatura table
CREATE TABLE academic_work_plan.asignatura (
    id                              BIGSERIAL PRIMARY KEY,
    codigo                          VARCHAR(20) NOT NULL UNIQUE,
    nombre                          VARCHAR(200) NOT NULL,
    nombre_base                     VARCHAR(200),
    modalidad_sufijo                VARCHAR(30),
    modalidad                       VARCHAR(30) NOT NULL DEFAULT 'sin_definir'
        CHECK (modalidad IN ('presencial','presencial_dia','presencial_noche','virtual','distancia','mixta','sin_definir')),
    requiere_revision_modalidad     BOOLEAN NOT NULL DEFAULT FALSE,
    creditos                        SMALLINT NOT NULL CHECK (creditos BETWEEN 1 AND 20),
    id_ubicacion_semestral          SMALLINT NOT NULL REFERENCES academic_work_plan.ubicacion_semestral(id),
    id_programa                     BIGINT NOT NULL REFERENCES academic_work_plan.programa(id),
    id_nucleo_tematico              BIGINT NOT NULL REFERENCES academic_work_plan.nucleo_tematico(id),
    id_facultad                     BIGINT NOT NULL REFERENCES academic_work_plan.facultad(id),
    horas_fijas_pta                 INT CHECK (horas_fijas_pta IS NULL OR horas_fijas_pta > 0),
    tipo_excepcion                  VARCHAR(40) CHECK (tipo_excepcion IS NULL OR tipo_excepcion IN ('seminario_enfasis','opciones_grado_ap','seminario_opciones_apt')),
    activa                          BOOLEAN NOT NULL DEFAULT TRUE,
    observaciones                   TEXT,
    created_at                      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                      BIGINT,
    updated_at                      TIMESTAMP,
    updated_by                      BIGINT,
    deleted_at                      TIMESTAMP,
    deleted_by                      BIGINT,
    CONSTRAINT chk_asig_excepcion_coherente CHECK (
        (tipo_excepcion IS NULL AND horas_fijas_pta IS NULL)
        OR
        (tipo_excepcion IS NOT NULL AND horas_fijas_pta IS NOT NULL)
    )
);
CREATE INDEX idx_asig_programa ON academic_work_plan.asignatura(id_programa);
CREATE INDEX idx_asig_nucleo ON academic_work_plan.asignatura(id_nucleo_tematico);
CREATE INDEX idx_asig_facultad ON academic_work_plan.asignatura(id_facultad);
CREATE INDEX idx_asig_activa ON academic_work_plan.asignatura(activa);
CREATE INDEX idx_asig_modalidad ON academic_work_plan.asignatura(modalidad);
CREATE INDEX idx_asig_nombre ON academic_work_plan.asignatura(nombre);

-- Create oferta_cetap_programa table
CREATE TABLE academic_work_plan.oferta_cetap_programa (
    id                       BIGSERIAL PRIMARY KEY,
    id_cetap                 BIGINT NOT NULL REFERENCES academic_work_plan.cetap(id),
    id_programa              BIGINT NOT NULL REFERENCES academic_work_plan.programa(id),
    id_periodo_academico     BIGINT NOT NULL REFERENCES academic_work_plan.periodo_academico(id),
    cupos_estimados          INT,
    observaciones            TEXT,
    activa                   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by               BIGINT,
    updated_at               TIMESTAMP,
    updated_by               BIGINT,
    deleted_at               TIMESTAMP,
    deleted_by               BIGINT,
    CONSTRAINT uq_ocp UNIQUE (id_cetap, id_programa, id_periodo_academico)
);
CREATE INDEX idx_ocp_cetap ON academic_work_plan.oferta_cetap_programa(id_cetap);
CREATE INDEX idx_ocp_programa ON academic_work_plan.oferta_cetap_programa(id_programa);
CREATE INDEX idx_ocp_periodo ON academic_work_plan.oferta_cetap_programa(id_periodo_academico);
CREATE INDEX idx_ocp_activa ON academic_work_plan.oferta_cetap_programa(activa);
