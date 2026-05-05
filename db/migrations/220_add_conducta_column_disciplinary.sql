-- Migration: Add conducta column to disciplinary_news table
-- Date: 2026-04-30
-- Description: Adds conducta column (string) to store selected disciplinary behavior

ALTER TABLE internal_disciplinary_control.disciplinary_news
ADD COLUMN IF NOT EXISTS conducta_disciplinaria VARCHAR(255);

-- Optional: Add comment for documentation
COMMENT ON COLUMN internal_disciplinary_control.disciplinary_news.conducta IS 'Conducta indisciplinaria seleccionada';