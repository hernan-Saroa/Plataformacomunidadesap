-- ============================================================================
-- Migration: 001_create_chatbot_schema.sql
-- Description: Creación del esquema chatbot y tablas de conversaciones y mensajes
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS chatbot;

COMMENT ON SCHEMA chatbot IS 'Esquema para el módulo Asistente Virtual y ChatBot institucional ESAP';

-- Tabla de conversaciones
CREATE TABLE IF NOT EXISTS chatbot.conversacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID,
    usuario_email VARCHAR(255),
    usuario_nombre VARCHAR(255),
    titulo VARCHAR(255) NOT NULL DEFAULT 'Nueva conversación',
    contexto VARCHAR(100) DEFAULT 'general',
    metadatos JSONB DEFAULT '{}'::jsonb,
    is_activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de mensajes
CREATE TABLE IF NOT EXISTS chatbot.mensaje (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversacion_id UUID NOT NULL REFERENCES chatbot.conversacion(id) ON DELETE CASCADE,
    rol VARCHAR(30) NOT NULL CHECK (rol IN ('user', 'assistant', 'system')),
    contenido TEXT NOT NULL,
    tokens INT DEFAULT 0,
    metadatos JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de plantillas / prompts de sistema
CREATE TABLE IF NOT EXISTS chatbot.prompt_template (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    system_prompt TEXT NOT NULL,
    is_activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices de optimización
CREATE INDEX IF NOT EXISTS idx_chatbot_conversacion_usuario ON chatbot.conversacion(usuario_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversacion_email ON chatbot.conversacion(usuario_email);
CREATE INDEX IF NOT EXISTS idx_chatbot_mensaje_conversacion ON chatbot.mensaje(conversacion_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_mensaje_created_at ON chatbot.mensaje(created_at ASC);
