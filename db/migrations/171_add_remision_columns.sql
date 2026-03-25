-- Migration 171: Add remision columns to disciplinary_news
-- Date: 2026-03-25
-- Description: Agregar columnas de remisión por competencia a disciplinary_news

ALTER TABLE internal_disciplinary_control.disciplinary_news
  ADD COLUMN IF NOT EXISTS numero_rc VARCHAR(50),
  ADD COLUMN IF NOT EXISTS entidad_remision VARCHAR(255),
  ADD COLUMN IF NOT EXISTS correo_entidad_remision VARCHAR(255),
  ADD COLUMN IF NOT EXISTS fecha_remision TIMESTAMP,
  ADD COLUMN IF NOT EXISTS tipo_remision VARCHAR(100),
  ADD COLUMN IF NOT EXISTS justificacion_remision TEXT;

-- Create indexes for searches
CREATE INDEX IF NOT EXISTS idx_news_numero_rc ON internal_disciplinary_control.disciplinary_news(numero_rc);
CREATE INDEX IF NOT EXISTS idx_news_entidad_remision ON internal_disciplinary_control.disciplinary_news(entidad_remision);
CREATE INDEX IF NOT EXISTS idx_news_fecha_remision ON internal_disciplinary_control.disciplinary_news(fecha_remision);