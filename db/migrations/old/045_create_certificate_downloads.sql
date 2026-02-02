-- =====================================================
-- Tabla: certificate_downloads (Descargas de Certificado)
-- =====================================================

CREATE TABLE IF NOT EXISTS academic_registration.certificate_downloads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relacion con certificado
    certificate_id UUID NOT NULL REFERENCES academic_registration.graduation_certificates(id),

    -- Informacion de la descarga
    download_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Datos del solicitante
    ip_address VARCHAR(50),
    user_agent TEXT,

    -- Auditoria
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_downloads_certificate_id ON academic_registration.certificate_downloads(certificate_id);
CREATE INDEX idx_downloads_date ON academic_registration.certificate_downloads(download_date);
