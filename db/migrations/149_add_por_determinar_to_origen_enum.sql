-- Migration 148: Agregar POR_DETERMINAR al enum de origen de noticias y hacerlo nullable
-- Permite que el campo "origen" pueda quedar como "Por determinar" cuando se desconoce

ALTER TYPE internal_disciplinary_control.disciplinary_news_origen_enum ADD VALUE IF NOT EXISTS 'POR_DETERMINAR';
ALTER TABLE internal_disciplinary_control.disciplinary_news ALTER COLUMN origen DROP NOT NULL;
