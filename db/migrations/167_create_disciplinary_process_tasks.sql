-- Migration: Create disciplinary process tasks table
-- Date: 2026-03-17
-- Description: Persistencia de tareas del modulo disciplinario por proceso

CREATE TABLE IF NOT EXISTS internal_disciplinary_control.disciplinary_process_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "processId" UUID NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    prioridad VARCHAR(20) NOT NULL DEFAULT 'media',
    etapa VARCHAR(80),
    "responsableNombre" VARCHAR(255),
    "fechaVencimiento" DATE NOT NULL,
    completada BOOLEAN NOT NULL DEFAULT FALSE,
    "fechaCompletada" TIMESTAMP,
    observaciones TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_disciplinary_process_tasks_process
        FOREIGN KEY ("processId")
        REFERENCES internal_disciplinary_control.disciplinary_processes(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_disciplinary_process_tasks_process
    ON internal_disciplinary_control.disciplinary_process_tasks("processId");

CREATE INDEX IF NOT EXISTS idx_disciplinary_process_tasks_vencimiento
    ON internal_disciplinary_control.disciplinary_process_tasks("fechaVencimiento" ASC);

CREATE INDEX IF NOT EXISTS idx_disciplinary_process_tasks_completada
    ON internal_disciplinary_control.disciplinary_process_tasks(completada);
