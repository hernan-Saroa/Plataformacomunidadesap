-- Migration 171: Add remision columns to disciplinary_news and REMITIDA status
-- Date: 2026-03-25
-- Description: Agregar columnas de remisión por competencia a disciplinary_news y estado REMITIDA


ALTER TABLE internal_disciplinary_control.disciplinary_news  
ADD COLUMN IF NOT EXISTS descripcion_remision JSONB DEFAULT '[]'::jsonb;

