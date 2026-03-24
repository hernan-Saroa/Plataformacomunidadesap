-- Migration: Create disciplinary process actuaciones table
-- Date: 2026-03-17
-- Description: Persistencia de actuaciones del modulo disciplinario por proceso

CREATE TABLE IF NOT EXISTS internal_disciplinary_control.disciplinary_process_actuaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "processId" UUID NOT NULL,
    tipo VARCHAR(50) NOT NULL DEFAULT 'ACTUACION',
    etapa VARCHAR(80),
    descripcion TEXT NOT NULL,
    "responsableNombre" VARCHAR(255) NOT NULL,
    "fechaActuacion" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    observaciones TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_disciplinary_process_actuaciones_process
        FOREIGN KEY ("processId")
        REFERENCES internal_disciplinary_control.disciplinary_processes(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_disciplinary_process_actuaciones_process
    ON internal_disciplinary_control.disciplinary_process_actuaciones("processId");

CREATE INDEX IF NOT EXISTS idx_disciplinary_process_actuaciones_fecha
    ON internal_disciplinary_control.disciplinary_process_actuaciones("fechaActuacion" DESC);
