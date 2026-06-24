-- Agregar columna created_at a disciplinary_news para ordenar por fecha de creación en el sistema
ALTER TABLE internal_disciplinary_control.disciplinary_news
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

-- Para registros existentes, usar updatedAt como aproximación de la fecha de creación
UPDATE internal_disciplinary_control.disciplinary_news
SET created_at = "updatedAt"
WHERE created_at IS NULL;

