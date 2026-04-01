-- Migration: Add ASOCIADA status to disciplinary_news_estado_enum
-- Schema: internal_disciplinary_control
-- Date: 2026-03-31
-- Description: Agregar estado ASOCIADA para noticias asociadas a otras noticias o procesos

ALTER TYPE internal_disciplinary_control.disciplinary_news_estado_enum ADD VALUE IF NOT EXISTS 'ASOCIADA';