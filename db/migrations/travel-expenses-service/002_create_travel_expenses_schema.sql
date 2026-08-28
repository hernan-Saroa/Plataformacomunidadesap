-- ============================================================================
-- Migration: 002_create_travel_expenses_schema.sql
-- Description: Crear esquema travel_expenses y tablas comisionados,
--              solicitudes_comision, documentos_soporte con indices y constraints
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS travel_expenses;

SET search_path TO travel_expenses, public;

-- Tabla comisionados
CREATE TABLE IF NOT EXISTS comisionados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_documento VARCHAR(20) UNIQUE NOT NULL,
    primer_nombre VARCHAR(100) NOT NULL,
    segundo_nombre VARCHAR(100),
    primer_apellido VARCHAR(100) NOT NULL,
    segundo_apellido VARCHAR(100),
    email VARCHAR(150) NOT NULL,
    telefono_contacto VARCHAR(150) NOT NULL,
    tipo_comisionado VARCHAR(50) NOT NULL CHECK (tipo_comisionado IN ('FUNCIONARIO','CONTRATISTA','DOCENTE','ESTUDIANTE','INVESTIGADOR')),
    origen_datos VARCHAR(50) NOT NULL CHECK (origen_datos IN ('HUMANO','SECOP')),
    autorizacion_habeas_data BOOLEAN DEFAULT FALSE NOT NULL,
    fecha_autorizacion_habeas_data TIMESTAMP,
    ip_registro_habeas_data VARCHAR(45),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_comisionados_numero_documento ON comisionados(numero_documento);

-- Tabla solicitudes_comision
CREATE TABLE IF NOT EXISTS solicitudes_comision (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consecutivo_unico VARCHAR(50) UNIQUE NOT NULL,
    comisionado_id UUID NOT NULL REFERENCES comisionados(id),
    destino_ciudad VARCHAR(100) NOT NULL,
    destino_departamento VARCHAR(100) NOT NULL,
    fecha_inicio TIMESTAMP NOT NULL,
    fecha_fin TIMESTAMP NOT NULL,
    objeto_comision VARCHAR(250) NOT NULL,
    prioridad VARCHAR(10) NOT NULL CHECK (prioridad IN ('ALTA','MEDIA','BAJA')),
    rubro_presupuestal VARCHAR(100) NOT NULL,
    requiere_tiquetes BOOLEAN DEFAULT FALSE NOT NULL,
    estado_solicitud VARCHAR(50) DEFAULT 'RADICADA' NOT NULL,
    radicado_fuera_jornada BOOLEAN DEFAULT FALSE NOT NULL,
    creado_por_usuario_id UUID NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_solicitudes_consecutivo_unico ON solicitudes_comision(consecutivo_unico);
CREATE INDEX IF NOT EXISTS idx_solicitudes_comisionado_fechas ON solicitudes_comision(comisionado_id, fecha_inicio, fecha_fin);

-- Tabla documentos_soporte
CREATE TABLE IF NOT EXISTS documentos_soporte (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solicitud_id UUID NOT NULL REFERENCES solicitudes_comision(id) ON DELETE CASCADE,
    tipo_documento VARCHAR(50) NOT NULL CHECK (tipo_documento IN ('CDP','RUT','CERT_BANCARIA','SEGURIDAD_SOCIAL','CONTRATO_SECOP')),
    nombre_archivo_original VARCHAR(255) NOT NULL,
    nombre_archivo_seguro VARCHAR(255) NOT NULL,
    url_repositorio VARCHAR(512) NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_documentos_soporte_solicitud ON documentos_soporte(solicitud_id);
