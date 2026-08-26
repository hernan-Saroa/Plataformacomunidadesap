-- Reglas globales de alerta automática de vencimiento para terminos_procesales.
-- Cada regla define un umbral (en horas) de anticipación; el scheduler
-- (alertas-vencimiento-terminos.service.ts) las evalúa contra cada término pendiente.

CREATE TABLE IF NOT EXISTS legal_management.terminos_reglas_alerta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    horas_anticipacion INT NOT NULL CHECK (horas_anticipacion > 0),
    activa BOOLEAN NOT NULL DEFAULT true,
    enviar_email BOOLEAN NOT NULL DEFAULT true,
    notificar_in_app BOOLEAN NOT NULL DEFAULT true,
    descripcion VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_terminos_reglas_alerta_horas UNIQUE (horas_anticipacion)
);

CREATE INDEX IF NOT EXISTS idx_terminos_reglas_alerta_activa
    ON legal_management.terminos_reglas_alerta (activa);

-- Seed inicial: 3 días (72 horas) de anticipación, valor default mencionado en la observación.
INSERT INTO legal_management.terminos_reglas_alerta (horas_anticipacion, descripcion)
VALUES (72, 'Alerta 3 días antes del vencimiento')
ON CONFLICT (horas_anticipacion) DO NOTHING;
