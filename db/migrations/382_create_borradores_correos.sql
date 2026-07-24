-- Migration 382: Borradores de correos del Centro de Comunicaciones (Redactar Correo)
--
-- Contexto: al redactar una "Nueva Comunicación" el usuario puede salir sin enviar.
-- Antes se perdía todo lo diligenciado. Ahora esa composición se conserva como
-- BORRADOR (privado por usuario) y puede reabrirse para continuar o enviarse.
--
-- Alcance: SOLO correos nuevos (no aplica a respuestas ni reenvíos, que dependen
-- del correo original). Un borrador se elimina automáticamente al enviarse.
--
-- Los adjuntos se guardan embebidos como arreglo JSON base64
-- ([{ name, contentType, contentBytes, size }]) para que el borrador sea
-- autocontenido y pueda restaurarse tal cual. El frontend limita el total a ~25MB.

CREATE TABLE IF NOT EXISTS legal_management.borradores_correos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Propietario del borrador. Los borradores son PRIVADOS: cada usuario solo ve
    -- los suyos. Se guarda el id (y el nombre para trazabilidad/UI).
    usuario_id VARCHAR(100) NOT NULL,
    usuario_nombre VARCHAR(255),

    -- Cuenta remitente (bandeja) desde la que se compone: JUDICIAL | CORREOS.
    -- Permite restaurar el remitente correcto al reabrir el borrador.
    buzon VARCHAR(20) NOT NULL DEFAULT 'JUDICIAL',

    -- Destinatarios como arreglo JSON de correos (texto). Coherente con
    -- correos_juridicos.destinatarios / destinatarios_cco.
    destinatarios_to  TEXT, -- "Para"
    destinatarios_cc  TEXT, -- CC
    destinatarios_cco TEXT, -- CCO / Copia Oculta

    asunto VARCHAR(500),
    cuerpo TEXT,

    -- Adjuntos embebidos: [{ name, contentType, contentBytes(base64), size }]
    adjuntos JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- Opción "solicitar acuse de recibido" tal como la dejó el usuario.
    solicitar_acuse BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Un usuario consulta sus borradores ordenados por última edición.
CREATE INDEX IF NOT EXISTS idx_borradores_correos_usuario
    ON legal_management.borradores_correos (usuario_id, updated_at DESC);

COMMENT ON TABLE legal_management.borradores_correos
    IS 'Borradores privados de correos nuevos del Centro de Comunicaciones (Redactar Correo). Se autoguardan y se eliminan al enviarse.';
COMMENT ON COLUMN legal_management.borradores_correos.adjuntos
    IS 'Adjuntos embebidos como arreglo JSON base64: [{ name, contentType, contentBytes, size }]. Límite ~25MB aplicado en el frontend.';
COMMENT ON COLUMN legal_management.borradores_correos.buzon
    IS 'Cuenta remitente/bandeja de origen (JUDICIAL | CORREOS) para restaurar el remitente correcto al reabrir.';
