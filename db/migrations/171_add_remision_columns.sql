-- Migration 171: Add remision columns to disciplinary_news and REMITIDA status
-- Date: 2026-03-25
-- Description: Agregar columnas de remisión por competencia a disciplinary_news y estado REMITIDA

-- First, add REMITIDA to the enum type if it doesn't exist
ALTER TYPE internal_disciplinary_control.disciplinary_news_estado_enum ADD VALUE IF NOT EXISTS 'REMITIDA';

ALTER TABLE internal_disciplinary_control.disciplinary_news
  ADD COLUMN IF NOT EXISTS numero_rc VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS entidad_remision VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS correo_entidad_remision VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS fecha_remision TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS tipo_remision VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS justificacion_remision TEXT NULL;

-- Create indexes for searches
CREATE INDEX IF NOT EXISTS idx_news_numero_rc ON internal_disciplinary_control.disciplinary_news(numero_rc);
CREATE INDEX IF NOT EXISTS idx_news_entidad_remision ON internal_disciplinary_control.disciplinary_news(entidad_remision);
CREATE INDEX IF NOT EXISTS idx_news_fecha_remision ON internal_disciplinary_control.disciplinary_news(fecha_remision);