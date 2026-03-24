CREATE TABLE IF NOT EXISTS internal_disciplinary_control.disciplinary_process_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "processId" UUID NOT NULL REFERENCES internal_disciplinary_control.disciplinary_processes(id) ON DELETE CASCADE,
    texto TEXT NOT NULL,
    etapa VARCHAR(80),
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disciplinary_process_notes_process_id
    ON internal_disciplinary_control.disciplinary_process_notes ("processId");

CREATE INDEX IF NOT EXISTS idx_disciplinary_process_notes_created_at
    ON internal_disciplinary_control.disciplinary_process_notes ("createdAt" DESC);
