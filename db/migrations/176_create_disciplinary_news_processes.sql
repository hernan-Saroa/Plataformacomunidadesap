-- Migration: Create disciplinary_news_processes table
-- Schema: internal_disciplinary_control
-- Date: 2026-04-01
-- Description: Tabla puente para asociar noticias disciplinarias con procesos disciplinarios

-- Create disciplinary_news_processes table
CREATE TABLE IF NOT EXISTS internal_disciplinary_control.disciplinary_news_processes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    news_id UUID NOT NULL,
    process_id UUID NOT NULL,
    fecha_asociacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    justificacion TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_news_id FOREIGN KEY (news_id) REFERENCES internal_disciplinary_control.disciplinary_news(id) ON DELETE CASCADE,
    CONSTRAINT fk_process_id FOREIGN KEY (process_id) REFERENCES internal_disciplinary_control.disciplinary_processes(id) ON DELETE CASCADE,
    CONSTRAINT unique_news_process UNIQUE (news_id, process_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_disciplinary_news_processes_news_id ON internal_disciplinary_control.disciplinary_news_processes(news_id);
CREATE INDEX IF NOT EXISTS idx_disciplinary_news_processes_process_id ON internal_disciplinary_control.disciplinary_news_processes(process_id);
CREATE INDEX IF NOT EXISTS idx_disciplinary_news_processes_fecha_asociacion ON internal_disciplinary_control.disciplinary_news_processes(fecha_asociacion);

-- Add comments
COMMENT ON TABLE internal_disciplinary_control.disciplinary_news_processes IS 'Tabla puente para asociar noticias disciplinarias con procesos disciplinarios';
COMMENT ON COLUMN internal_disciplinary_control.disciplinary_news_processes.news_id IS 'ID de la noticia disciplinaria';
COMMENT ON COLUMN internal_disciplinary_control.disciplinary_news_processes.process_id IS 'ID del proceso disciplinario';
COMMENT ON COLUMN internal_disciplinary_control.disciplinary_news_processes.fecha_asociacion IS 'Fecha en que se realizó la asociación';
COMMENT ON COLUMN internal_disciplinary_control.disciplinary_news_processes.justificacion IS 'Justificación de la asociación';
COMMENT ON COLUMN internal_disciplinary_control.disciplinary_news_processes.created_at IS 'Fecha de creación del registro';
COMMENT ON COLUMN internal_disciplinary_control.disciplinary_news_processes.updated_at IS 'Fecha de última actualización del registro';