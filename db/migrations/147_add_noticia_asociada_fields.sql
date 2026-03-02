-- Migration: Add procesoAsociado fields to disciplinary_news
-- Date: 2026-02-27
-- Description: Agregar campos para almacenar información de proceso asociado en noticias

ALTER TABLE internal_disciplinary_control.disciplinary_news ADD COLUMN IF NOT EXISTS proceso_asociado_id UUID;
ALTER TABLE internal_disciplinary_control.disciplinary_news ADD COLUMN IF NOT EXISTS proceso_asociado_numero VARCHAR(50);
ALTER TABLE internal_disciplinary_control.disciplinary_news ADD COLUMN IF NOT EXISTS proceso_asociado_fecha TIMESTAMP;
ALTER TABLE internal_disciplinary_control.disciplinary_news ADD COLUMN IF NOT EXISTS proceso_asociado_justificacion TEXT;

-- Crear índice para mejorar búsquedas por proceso asociado
CREATE INDEX IF NOT EXISTS idx_news_proceso_asociado_id ON internal_disciplinary_control.disciplinary_news(proceso_asociado_id);
