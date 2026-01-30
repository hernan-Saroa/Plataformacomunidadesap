-- =======================================================================================
-- MIGRATION: 005_add_config_entes_control (FIXED)
-- DESCRIPTION: Add table for storing 'Entes de Control' configuration for Planes de Mejoramiento
--              Includes function definition for timestamp trigger and REMOVES icons.
-- AUTHOR: Agentic Assistant
-- DATE: 2026-01-29
-- =======================================================================================

-- 0. Ensure the timestamp update function exists (Fix for: function update_timestamp() does not exist)
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- 1. Create table for Entes de Control (WITHOUT ICONO)
CREATE TABLE IF NOT EXISTS public.config_entes_control (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo VARCHAR(50) NOT NULL UNIQUE, -- e.g., 'CONTRALORIA', 'PROCURADURIA'
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    color VARCHAR(20) DEFAULT '#3B82F6',
    orden INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Insert default values (Idempotent check) - EXCLUDING ICONS
INSERT INTO public.config_entes_control (codigo, nombre, descripcion, color, orden, activo)
VALUES 
    ('CONTRALORIA', 'Contraloría General', 'Control fiscal a la gestión pública', '#003DA5', 1, true),
    ('PROCURADURIA_GENERAL', 'Procuraduría General', 'Control disciplinario y defensa del orden jurídico', '#2962FF', 2, true),
    ('OFICINA_CONTROL_INTERNO', 'Oficina Control Interno', 'Control interno y auditoría', '#10B981', 3, true),
    ('AUDITORIA_EXTERNA', 'Auditoría Externa', 'Auditoría externa y revisoría fiscal', '#7C3AED', 4, true)
ON CONFLICT (codigo) DO UPDATE 
SET 
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    color = EXCLUDED.color,
    orden = EXCLUDED.orden;

-- 3. Audit Trigger
DROP TRIGGER IF EXISTS update_config_entes_control_timestamp ON public.config_entes_control;
CREATE TRIGGER update_config_entes_control_timestamp
BEFORE UPDATE ON public.config_entes_control
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();
