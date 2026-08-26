-- Traza qué alertas/recordatorios ya se enviaron para cada término, para que el
-- scheduler no reenvíe la misma alerta en cada corrida del cron.
-- regla_id = NULL representa el envío de la "anticipación personalizada" del
-- propio término (horas_anticipacion_alerta_personalizada), que no está ligado
-- a ninguna fila de terminos_reglas_alerta.

CREATE TABLE IF NOT EXISTS legal_management.terminos_alertas_enviadas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    termino_id UUID NOT NULL REFERENCES legal_management.terminos_procesales(id) ON DELETE CASCADE,
    regla_id UUID REFERENCES legal_management.terminos_reglas_alerta(id) ON DELETE CASCADE,
    fecha_envio TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A lo sumo un envío por (término, regla nombrada).
CREATE UNIQUE INDEX IF NOT EXISTS uq_terminos_alertas_enviadas_regla
    ON legal_management.terminos_alertas_enviadas (termino_id, regla_id)
    WHERE regla_id IS NOT NULL;

-- A lo sumo un envío de "anticipación personalizada" (regla_id NULL) por término.
CREATE UNIQUE INDEX IF NOT EXISTS uq_terminos_alertas_enviadas_personalizada
    ON legal_management.terminos_alertas_enviadas (termino_id)
    WHERE regla_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_terminos_alertas_enviadas_termino
    ON legal_management.terminos_alertas_enviadas (termino_id);
