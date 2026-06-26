-- =====================================================
-- SISTEMA DE VALIDACIÓN DE CERTIFICADOS DE GRADUADOS
-- Esquema: academic_registration
-- =====================================================

-- Extensión para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Crear esquema si no existe
CREATE SCHEMA IF NOT EXISTS academic_registration;

-- =====================================================
-- 1. TABLA: graduates (Graduados)
-- Almacena información de los egresados/graduados
-- =====================================================
CREATE TABLE IF NOT EXISTS academic_registration.graduates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Información personal
    person_id UUID NOT NULL, -- FK a auth_service.persons
    full_name VARCHAR(255) NOT NULL,
    id_number VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255),
    phone VARCHAR(50),

    -- Información académica
    program_id UUID NOT NULL, -- FK a auth_service.programas_academicos
    program_name VARCHAR(255) NOT NULL,
    program_type VARCHAR(50) NOT NULL, -- 'Pregrado', 'Especialización', 'Maestría'

    -- Fechas importantes
    enrollment_date DATE,
    graduation_date DATE NOT NULL,
    ceremony_date DATE,

    -- Información del título
    degree_title VARCHAR(255) NOT NULL, -- ej: "Administrador Público"
    diploma_number VARCHAR(100) UNIQUE,
    acta_number VARCHAR(100), -- Número de acta de grado
    resolution_number VARCHAR(100), -- Resolución que otorga el título

    -- Estado y validación
    status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, REVOKED, SUSPENDED
    is_verified BOOLEAN DEFAULT true,

    -- Ubicación
    campus VARCHAR(100), -- Sede donde se graduó

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255),

    -- Índices para búsqueda
    CONSTRAINT chk_graduate_status CHECK (status IN ('ACTIVE', 'REVOKED', 'SUSPENDED'))
);

CREATE INDEX idx_graduates_person_id ON academic_registration.graduates(person_id);
CREATE INDEX idx_graduates_id_number ON academic_registration.graduates(id_number);
CREATE INDEX idx_graduates_diploma_number ON academic_registration.graduates(diploma_number);
CREATE INDEX idx_graduates_graduation_date ON academic_registration.graduates(graduation_date);
CREATE INDEX idx_graduates_program_id ON academic_registration.graduates(program_id);

-- =====================================================
-- 2. TABLA: graduation_certificate_requests (Solicitudes de Certificado)
-- Solicitudes de certificados de grado por graduados o terceros
-- =====================================================
CREATE TABLE IF NOT EXISTS academic_registration.graduation_certificate_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Número de solicitud
    request_number VARCHAR(100) NOT NULL UNIQUE, -- Ej: GC-2025-0001

    -- Tipo de solicitante
    requester_type VARCHAR(50) NOT NULL, -- 'GRADUATE' (graduado), 'COMPANY' (empresa)

    -- Información del graduado
    graduate_id UUID, -- FK a graduates (nullable si es solicitud externa)
    id_number VARCHAR(50) NOT NULL, -- Cédula del graduado
    full_name VARCHAR(255) NOT NULL,

    -- Información del programa
    program_name VARCHAR(255) NOT NULL,
    graduation_date DATE NOT NULL,

    -- Información del solicitante (si es empresa)
    requester_name VARCHAR(255), -- Nombre de quien solicita
    requester_email VARCHAR(255) NOT NULL,
    requester_phone VARCHAR(50),
    company_name VARCHAR(255), -- Si lo solicita una empresa

    -- Tipo de certificado solicitado
    certificate_type VARCHAR(50) DEFAULT 'STANDARD', -- STANDARD, OFFICIAL, INTERNATIONAL

    -- Validación (para graduados que solicitan por primera vez)
    validation_code VARCHAR(10), -- Código enviado por email
    validation_expires_at TIMESTAMP,
    is_validated BOOLEAN DEFAULT false,

    -- Estado de la solicitud
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, VALIDATED, PROCESSING, COMPLETED, REJECTED

    -- Observaciones
    observations TEXT,
    rejection_reason TEXT,

    -- Fechas
    request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    validation_date TIMESTAMP,
    completion_date TIMESTAMP,

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_request_status CHECK (status IN ('PENDING', 'VALIDATED', 'PROCESSING', 'COMPLETED', 'REJECTED')),
    CONSTRAINT chk_requester_type CHECK (requester_type IN ('GRADUATE', 'COMPANY')),
    CONSTRAINT chk_certificate_type CHECK (certificate_type IN ('STANDARD', 'OFFICIAL', 'INTERNATIONAL'))
);

CREATE INDEX idx_cert_requests_number ON academic_registration.graduation_certificate_requests(request_number);
CREATE INDEX idx_cert_requests_id_number ON academic_registration.graduation_certificate_requests(id_number);
CREATE INDEX idx_cert_requests_graduate_id ON academic_registration.graduation_certificate_requests(graduate_id);
CREATE INDEX idx_cert_requests_status ON academic_registration.graduation_certificate_requests(status);
CREATE INDEX idx_cert_requests_date ON academic_registration.graduation_certificate_requests(request_date);

-- =====================================================
-- 3. TABLA: graduation_certificates (Certificados de Grado)
-- Certificados generados y emitidos
-- =====================================================
CREATE TABLE IF NOT EXISTS academic_registration.graduation_certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relación con solicitud
    request_id UUID NOT NULL REFERENCES academic_registration.graduation_certificate_requests(id),
    graduate_id UUID REFERENCES academic_registration.graduates(id),

    -- Número de certificado
    certificate_number VARCHAR(100) NOT NULL UNIQUE, -- Ej: CERT-GR-2025-0001

    -- Código de verificación único (QR)
    verification_code VARCHAR(50) NOT NULL UNIQUE,

    -- Información del graduado
    full_name VARCHAR(255) NOT NULL,
    id_number VARCHAR(50) NOT NULL,

    -- Información académica
    program_name VARCHAR(255) NOT NULL,
    program_type VARCHAR(50) NOT NULL,
    degree_title VARCHAR(255) NOT NULL,
    graduation_date DATE NOT NULL,
    diploma_number VARCHAR(100),
    acta_number VARCHAR(100),

    -- Información adicional
    campus VARCHAR(100),

    -- Datos del firmante
    signer_name VARCHAR(255) NOT NULL,
    signer_position VARCHAR(255) NOT NULL,
    signature_url TEXT,

    -- Archivo PDF
    pdf_url TEXT,
    pdf_filename VARCHAR(255),

    -- Estado del certificado
    status VARCHAR(50) DEFAULT 'VALID', -- VALID, REVOKED, EXPIRED

    -- Fechas
    issue_date DATE DEFAULT CURRENT_DATE,
    expiry_date DATE, -- Algunos certificados pueden tener fecha de expiración
    revocation_date TIMESTAMP,
    revocation_reason TEXT,

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),

    CONSTRAINT chk_certificate_status CHECK (status IN ('VALID', 'REVOKED', 'EXPIRED'))
);

CREATE INDEX idx_certificates_number ON academic_registration.graduation_certificates(certificate_number);
CREATE INDEX idx_certificates_verification ON academic_registration.graduation_certificates(verification_code);
CREATE INDEX idx_certificates_graduate_id ON academic_registration.graduation_certificates(graduate_id);
CREATE INDEX idx_certificates_status ON academic_registration.graduation_certificates(status);
CREATE INDEX idx_certificates_id_number ON academic_registration.graduation_certificates(id_number);

-- =====================================================
-- 4. TABLA: certificate_validations (Validaciones de Certificado)
-- Registro de cada vez que alguien valida un certificado
-- =====================================================
CREATE TABLE IF NOT EXISTS academic_registration.certificate_validations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relación con certificado
    certificate_id UUID NOT NULL REFERENCES academic_registration.graduation_certificates(id),

    -- Información de la validación
    validation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Datos del validador
    ip_address VARCHAR(50),
    user_agent TEXT,
    location VARCHAR(255), -- Ciudad/País si está disponible

    -- Resultado de la validación
    result VARCHAR(50) NOT NULL, -- VALID, REVOKED, EXPIRED, NOT_FOUND

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_validation_result CHECK (result IN ('VALID', 'REVOKED', 'EXPIRED', 'NOT_FOUND'))
);

CREATE INDEX idx_validations_certificate_id ON academic_registration.certificate_validations(certificate_id);
CREATE INDEX idx_validations_date ON academic_registration.certificate_validations(validation_date);

-- =====================================================
-- 5. TABLA: signers (Firmantes)
-- Personas autorizadas para firmar certificados
-- =====================================================
CREATE TABLE IF NOT EXISTS academic_registration.signers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Información del firmante
    full_name VARCHAR(255) NOT NULL,
    position VARCHAR(255) NOT NULL, -- Ej: "Director de Verificación de títulos"
    department VARCHAR(255),
    email VARCHAR(255),

    -- Firma digital
    signature_url TEXT,
    signature_filename VARCHAR(255),

    -- Estado
    is_active BOOLEAN DEFAULT true,
    is_primary BOOLEAN DEFAULT false, -- Firmante principal por defecto

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice único parcial: solo puede haber un firmante principal activo
CREATE UNIQUE INDEX unique_primary_signer ON academic_registration.signers(is_primary) WHERE is_primary = true;

CREATE INDEX idx_signers_active ON academic_registration.signers(is_active);

-- =====================================================
-- 6. TABLA: certificate_template_config (Configuración de Plantilla)
-- Configuración visual de los certificados
-- =====================================================
CREATE TABLE IF NOT EXISTS academic_registration.certificate_template_config (
    id SERIAL PRIMARY KEY,

    -- Relación con firmante
    signer_id UUID REFERENCES academic_registration.signers(id),

    -- Logo institucional
    institution_logo_url TEXT,
    institution_logo_filename VARCHAR(255),

    -- Tipografía
    typography_font VARCHAR(100) DEFAULT 'Arial Narrow, Arial, sans-serif',

    -- Título del cargo del firmante (puede sobrescribirse)
    signer_title_override VARCHAR(255),

    -- Contenido HTML del certificado
    certificate_content_html TEXT NOT NULL,

    -- Versión y estado
    version VARCHAR(50) DEFAULT '1.0.0',
    status VARCHAR(50) DEFAULT 'draft', -- draft, published

    -- Firma (puede sobrescribir la del firmante)
    signature_url_override TEXT,
    signature_filename_override VARCHAR(255),
    signer_name_override VARCHAR(255),

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255),

    is_active BOOLEAN DEFAULT true,

    CONSTRAINT chk_template_status CHECK (status IN ('draft', 'published'))
);

CREATE INDEX idx_template_config_status ON academic_registration.certificate_template_config(status);
CREATE INDEX idx_template_config_active ON academic_registration.certificate_template_config(is_active);

-- =====================================================
-- 7. TABLA: template_config_changes (Cambios en la Plantilla)
-- Historial de cambios en la configuración de plantilla
-- =====================================================
CREATE TABLE IF NOT EXISTS academic_registration.template_config_changes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relación con plantilla
    template_config_id INTEGER NOT NULL REFERENCES academic_registration.certificate_template_config(id),

    -- Tipo de cambio
    change_type VARCHAR(50) NOT NULL, -- CREATED, UPDATED, PUBLISHED, REVERTED

    -- Descripción del cambio
    field_changed VARCHAR(100), -- ej: 'signer_name', 'logo', 'content'
    old_value TEXT,
    new_value TEXT,

    -- Actor
    changed_by VARCHAR(255) NOT NULL,
    change_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Observaciones
    observations TEXT
);

CREATE INDEX idx_template_changes_config_id ON academic_registration.template_config_changes(template_config_id);
CREATE INDEX idx_template_changes_date ON academic_registration.template_config_changes(change_date);

-- =====================================================
-- FUNCIONES Y TRIGGERS
-- =====================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION academic_registration.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_graduates_updated_at BEFORE UPDATE ON academic_registration.graduates
    FOR EACH ROW EXECUTE FUNCTION academic_registration.update_updated_at_column();

CREATE TRIGGER update_cert_requests_updated_at BEFORE UPDATE ON academic_registration.graduation_certificate_requests
    FOR EACH ROW EXECUTE FUNCTION academic_registration.update_updated_at_column();

CREATE TRIGGER update_certificates_updated_at BEFORE UPDATE ON academic_registration.graduation_certificates
    FOR EACH ROW EXECUTE FUNCTION academic_registration.update_updated_at_column();

CREATE TRIGGER update_signers_updated_at BEFORE UPDATE ON academic_registration.signers
    FOR EACH ROW EXECUTE FUNCTION academic_registration.update_updated_at_column();

CREATE TRIGGER update_template_config_updated_at BEFORE UPDATE ON academic_registration.certificate_template_config
    FOR EACH ROW EXECUTE FUNCTION academic_registration.update_updated_at_column();

-- =====================================================
-- DATOS INICIALES (SEED)
-- =====================================================

-- Insertar firmante por defecto
INSERT INTO academic_registration.signers (
    id,
    full_name,
    position,
    department,
    is_active,
    is_primary
) VALUES (
    uuid_generate_v4(),
    'Director de Verificación de títulos',
    'Director(a) de Verificación de títulos',
    'Verificación de títulos',
    true,
    true
) ON CONFLICT DO NOTHING;

-- Insertar plantilla por defecto
INSERT INTO academic_registration.certificate_template_config (
    signer_id,
    typography_font,
    certificate_content_html,
    status,
    is_active,
    created_by
) VALUES (
    (SELECT id FROM academic_registration.signers WHERE is_primary = true LIMIT 1),
    'Arial Narrow, Arial, sans-serif',
    '<p>Certifica que <span class="variable-token">[NOMBRE_COMPLETO]</span> identificado(a) con cédula de ciudadanía No. <span class="variable-token">[DOCUMENTO]</span>, se graduó de la Escuela Superior de Administración Pública - ESAP, el día <span class="variable-token">[FECHA_GRADO]</span>, obteniendo el título de <span class="variable-token">[TITULO]</span> en el programa de <span class="variable-token">[PROGRAMA]</span>, según consta en el Acta de Grado No. <span class="variable-token">[ACTA]</span>.</p>',
    'published',
    true,
    'SYSTEM'
) ON CONFLICT DO NOTHING;

COMMENT ON TABLE academic_registration.graduates IS 'Registro de graduados de la ESAP';
COMMENT ON TABLE academic_registration.graduation_certificate_requests IS 'Solicitudes de certificados de grado';
COMMENT ON TABLE academic_registration.graduation_certificates IS 'Certificados de grado emitidos';
COMMENT ON TABLE academic_registration.certificate_validations IS 'Validaciones de certificados realizadas';
COMMENT ON TABLE academic_registration.signers IS 'Firmantes autorizados para certificados';
COMMENT ON TABLE academic_registration.certificate_template_config IS 'Configuración de plantillas de certificados';
COMMENT ON TABLE academic_registration.template_config_changes IS 'Historial de cambios en plantillas';
