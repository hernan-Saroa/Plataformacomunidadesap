-- Tabla de consecutivos genéricos para legal_management (SequenceService).
-- Usada para generar radicados legibles por año (ej. TERM-2026-0001) en vez de
-- exponer el UUID crudo del registro. Un registro por nombre de secuencia
-- (ej. "TERM_2026"), incrementado atómicamente vía findOne + save.

CREATE TABLE IF NOT EXISTS legal_management.sequences (
    name VARCHAR(100) PRIMARY KEY,
    current_value INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
