-- =====================================================================
-- 229: Crear tabla correo_tracking_tokens para trazabilidad de correos
-- Permite registrar apertura de correos (pixel) y descarga de documentos
-- =====================================================================

CREATE TABLE IF NOT EXISTS legal_management.correo_tracking_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    correo_id       UUID NOT NULL,
    adjunto_id      UUID,
    token           VARCHAR(100) NOT NULL UNIQUE,
    tipo            VARCHAR(20) NOT NULL,  -- OPEN_PIXEL | DOWNLOAD_LINK
    abierto         BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_apertura  TIMESTAMP,
    ip_apertura     VARCHAR(50),
    user_agent      TEXT,
    destinatario_email VARCHAR(255),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),

    -- FK al correo
    CONSTRAINT fk_tracking_correo
        FOREIGN KEY (correo_id)
        REFERENCES legal_management.correos_juridicos(id)
        ON DELETE CASCADE,

    -- FK al adjunto (opcional, solo para DOWNLOAD_LINK)
    CONSTRAINT fk_tracking_adjunto
        FOREIGN KEY (adjunto_id)
        REFERENCES legal_management.adjuntos_correo(id)
        ON DELETE SET NULL
);

-- Índice por token (búsquedas rápidas desde endpoints públicos)
CREATE INDEX IF NOT EXISTS idx_tracking_token ON legal_management.correo_tracking_tokens(token);

-- Índice por correo (para listar todos los tokens de un correo)
CREATE INDEX IF NOT EXISTS idx_tracking_correo_id ON legal_management.correo_tracking_tokens(correo_id);

-- Constraint de tipo válido
ALTER TABLE legal_management.correo_tracking_tokens
    ADD CONSTRAINT chk_tracking_tipo CHECK (tipo IN ('OPEN_PIXEL', 'DOWNLOAD_LINK'));
