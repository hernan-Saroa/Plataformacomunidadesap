-- ============================================================================
-- Migration: 001_create_rund_schema.sql
-- Description: Creación del esquema 'rund' y tablas para el Registro Único Nacional Docente (RUND)
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS rund;

-- Extensiones requeridas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. TABLA: rund.docente
-- Perfil central del docente en el Registro Único Nacional Docente
-- ============================================================================
CREATE TABLE IF NOT EXISTS rund.docente (
    id_docente UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_persona UUID NULL,
    numero_documento VARCHAR(50) NOT NULL,
    tipo_documento VARCHAR(20) NOT NULL DEFAULT 'CC',
    nombres VARCHAR(150) NOT NULL,
    apellidos VARCHAR(150) NOT NULL,
    correo_institucional VARCHAR(150),
    correo_personal VARCHAR(150),
    telefono VARCHAR(50),
    celular VARCHAR(50),
    direccion VARCHAR(255),
    departamento_codigo VARCHAR(10),
    departamento_nombre VARCHAR(100),
    municipio_codigo VARCHAR(10),
    municipio_nombre VARCHAR(100),
    escalafon_docente VARCHAR(50) DEFAULT 'INSTRUCTOR', -- INSTRUCTOR, ASISTENTE, ASOCIADO, TITULAR
    categoria_minciencias VARCHAR(50) DEFAULT 'SIN_CATEGORIA', -- INVESTIGADOR_JUNIOR, ASOCIADO, SENIOR, EMERITO, SIN_CATEGORIA
    estado_rund VARCHAR(30) NOT NULL DEFAULT 'ACTIVO', -- ACTIVO, INACTIVO, EN_REVISION, PENDIENTE_VALIDACION, SUSPENDIDO
    numero_tarjeta_rund VARCHAR(50) UNIQUE,
    fecha_expedicion_rund TIMESTAMP WITH TIME ZONE,
    horas_semanales_max INTEGER DEFAULT 40,
    sede_principal_id VARCHAR(50),
    sede_principal_nombre VARCHAR(150),
    fecha_ingreso_esap DATE,
    es_par_evaluador BOOLEAN DEFAULT FALSE,
    foto_perfil_url TEXT,
    observaciones TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    CONSTRAINT uq_rund_docente_documento UNIQUE (tipo_documento, numero_documento)
);

CREATE INDEX IF NOT EXISTS idx_rund_docente_num_doc ON rund.docente (numero_documento);
CREATE INDEX IF NOT EXISTS idx_rund_docente_estado ON rund.docente (estado_rund);
CREATE INDEX IF NOT EXISTS idx_rund_docente_id_persona ON rund.docente (id_persona);
CREATE INDEX IF NOT EXISTS idx_rund_docente_tarjeta ON rund.docente (numero_tarjeta_rund);

-- ============================================================================
-- 2. TABLA: rund.formacion_academica
-- Historial académico y títulos universitarios del docente
-- ============================================================================
CREATE TABLE IF NOT EXISTS rund.formacion_academica (
    id_formacion UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_docente UUID NOT NULL REFERENCES rund.docente(id_docente) ON DELETE CASCADE,
    nivel_educativo VARCHAR(50) NOT NULL, -- PREGRADO, ESPECIALIZACION, MAESTRIA, DOCTORADO, POSTDOCTORADO
    titulo_obtenido VARCHAR(255) NOT NULL,
    institucion VARCHAR(255) NOT NULL,
    pais VARCHAR(100) DEFAULT 'Colombia',
    ano_graduacion INTEGER,
    convalidad_mineducacion BOOLEAN DEFAULT FALSE,
    numero_resolucion_convalidacion VARCHAR(100),
    soporte_url TEXT,
    estado_validacion VARCHAR(30) DEFAULT 'PENDIENTE', -- PENDIENTE, APROBADO, RECHAZADO, OBSERVADO
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rund_formacion_docente ON rund.formacion_academica (id_docente);

-- ============================================================================
-- 3. TABLA: rund.experiencia_docente
-- Trayectoria profesional y docente tanto en ESAP como en otras instituciones
-- ============================================================================
CREATE TABLE IF NOT EXISTS rund.experiencia_docente (
    id_experiencia UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_docente UUID NOT NULL REFERENCES rund.docente(id_docente) ON DELETE CASCADE,
    tipo_experiencia VARCHAR(50) NOT NULL DEFAULT 'DOCENCIA_UNIVERSITARIA', -- DOCENCIA_UNIVERSITARIA, INVESTIGACION, PROFESIONAL, ASESORIA_CONSULTORIA
    institucion_empresa VARCHAR(255) NOT NULL,
    cargo_asignatura VARCHAR(255) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE,
    es_actual BOOLEAN DEFAULT FALSE,
    horas_semanales INTEGER DEFAULT 0,
    soporte_url TEXT,
    estado_validacion VARCHAR(30) DEFAULT 'PENDIENTE',
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rund_experiencia_docente ON rund.experiencia_docente (id_docente);

-- ============================================================================
-- 4. TABLA: rund.produccion_intelectual
-- Publicaciones, libros, artículos indexados, patentes y proyectos de investigación
-- ============================================================================
CREATE TABLE IF NOT EXISTS rund.produccion_intelectual (
    id_produccion UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_docente UUID NOT NULL REFERENCES rund.docente(id_docente) ON DELETE CASCADE,
    tipo_produccion VARCHAR(50) NOT NULL, -- ARTICULO, LIBRO, CAPITULO_LIBRO, PONENCIA, PATENTE, SOFTWARE
    titulo VARCHAR(500) NOT NULL,
    autores TEXT,
    revista_editorial VARCHAR(255),
    issn_isbn VARCHAR(50),
    ano_publicacion INTEGER,
    indexacion_tipo VARCHAR(50), -- SCOPUS, PUBLINDEX_A1, PUBLINDEX_A2, PUBLINDEX_B, PUBLINDEX_C, OTRO
    link_doi TEXT,
    soporte_url TEXT,
    estado_validacion VARCHAR(30) DEFAULT 'PENDIENTE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rund_produccion_docente ON rund.produccion_intelectual (id_docente);

-- ============================================================================
-- 5. TABLA: rund.situacion_administrativa
-- Registro de situaciones especiales, comisiones, licencias, permisos y novedades
-- ============================================================================
CREATE TABLE IF NOT EXISTS rund.situacion_administrativa (
    id_situacion UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_docente UUID NOT NULL REFERENCES rund.docente(id_docente) ON DELETE CASCADE,
    tipo_novedad VARCHAR(80) NOT NULL, -- COMISION_ESTUDIOS, LICENCIA_REMUNERADA, LICENCIA_NO_REMUNERADA, INCAPACIDAD, ENCARGO, VACACIONES, SANCION, OTRA
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE,
    numero_acto_administrativo VARCHAR(100),
    fecha_acto DATE,
    soporte_url TEXT,
    estado VARCHAR(30) DEFAULT 'VIGENTE', -- VIGENTE, FINALIZADA, CANCELADA
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_rund_situacion_docente ON rund.situacion_administrativa (id_docente);
CREATE INDEX IF NOT EXISTS idx_rund_situacion_fechas ON rund.situacion_administrativa (fecha_inicio, fecha_fin);

-- ============================================================================
-- 6. TABLA: rund.soporte_documental
-- Repositorio de evidencias y soportes PDF validados para el RUND
-- ============================================================================
CREATE TABLE IF NOT EXISTS rund.soporte_documental (
    id_soporte UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_docente UUID NOT NULL REFERENCES rund.docente(id_docente) ON DELETE CASCADE,
    tipo_documento VARCHAR(80) NOT NULL, -- DOCUMENTO_IDENTIDAD, TITULO_PREGRADO, TITULO_POSGRADO, CERTIFICADO_LABORAL, RUT, ANTECEDENTES, CVLAC, CERTIFICADO_MINCIENCIAS
    categoria VARCHAR(50) DEFAULT 'GENERAL', -- IDENTIFICACION, ACADEMICO, LABORAL, INVESTIGACION, NOVEDADES
    nombre_archivo VARCHAR(255) NOT NULL,
    ruta_archivo TEXT NOT NULL,
    mimetype VARCHAR(100) DEFAULT 'application/pdf',
    tamano_bytes BIGINT,
    hash_sha256 VARCHAR(64),
    estado_validacion VARCHAR(30) DEFAULT 'PENDIENTE', -- PENDIENTE, APROBADO, RECHAZADO, OBSERVADO
    validado_por UUID,
    fecha_validacion TIMESTAMP WITH TIME ZONE,
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rund_soporte_docente ON rund.soporte_documental (id_docente);
CREATE INDEX IF NOT EXISTS idx_rund_soporte_tipo ON rund.soporte_documental (tipo_documento);

-- ============================================================================
-- 7. TABLA: rund.tarjeta_rund_log
-- Histórico y auditoría de emisión de Tarjeta Digital RUND con QR verificable
-- ============================================================================
CREATE TABLE IF NOT EXISTS rund.tarjeta_rund_log (
    id_log UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_docente UUID NOT NULL REFERENCES rund.docente(id_docente) ON DELETE CASCADE,
    codigo_verificacion VARCHAR(100) NOT NULL UNIQUE,
    qr_code_payload TEXT NOT NULL,
    fecha_emision TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    emitido_por UUID,
    version INTEGER DEFAULT 1,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rund_tarjeta_codigo ON rund.tarjeta_rund_log (codigo_verificacion);
CREATE INDEX IF NOT EXISTS idx_rund_tarjeta_docente ON rund.tarjeta_rund_log (id_docente);

-- ============================================================================
-- 8. TABLA: rund.invitacion_docente
-- Gestión de auto-registro e invitaciones por correo
-- ============================================================================
CREATE TABLE IF NOT EXISTS rund.invitacion_docente (
    id_invitacion UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(150) NOT NULL,
    numero_documento VARCHAR(50),
    nombres VARCHAR(150),
    apellidos VARCHAR(150),
    token VARCHAR(255) NOT NULL UNIQUE,
    estado VARCHAR(30) DEFAULT 'PENDIENTE', -- PENDIENTE, COMPLETADO, EXPIRADO, CANCELADO
    fecha_expiracion TIMESTAMP WITH TIME ZONE NOT NULL,
    utilizado_en TIMESTAMP WITH TIME ZONE,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rund_invitacion_token ON rund.invitacion_docente (token);
CREATE INDEX IF NOT EXISTS idx_rund_invitacion_email ON rund.invitacion_docente (email);
