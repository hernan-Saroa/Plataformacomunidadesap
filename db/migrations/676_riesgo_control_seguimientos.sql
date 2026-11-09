-- EFDS-2416: seguimiento cuatrimestral de los controles de un riesgo (Gestión Legal)
-- Aditiva e idempotente. Un seguimiento por control en cada cuatrimestre de cada vigencia.
CREATE TABLE IF NOT EXISTS legal_management.riesgo_control_seguimientos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    riesgo_id UUID NOT NULL REFERENCES legal_management.riesgos(id) ON DELETE CASCADE,
    control_id VARCHAR(100) NOT NULL,
    vigencia INTEGER NOT NULL,
    cuatrimestre SMALLINT NOT NULL CHECK (cuatrimestre BETWEEN 1 AND 3),
    fecha_ejecucion DATE NOT NULL,
    comentarios TEXT NOT NULL,
    resultado VARCHAR(30) NOT NULL CHECK (resultado IN ('APLICADO', 'APLICADO_PARCIALMENTE', 'NO_APLICADO')),
    efectividad SMALLINT NOT NULL CHECK (efectividad BETWEEN 0 AND 100),
    evidencias JSONB NOT NULL DEFAULT '[]'::jsonb,
    responsable VARCHAR(200) NOT NULL,
    responsable_id UUID,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_riesgo_control_seguimiento_corte
    ON legal_management.riesgo_control_seguimientos (riesgo_id, control_id, vigencia, cuatrimestre);

CREATE INDEX IF NOT EXISTS idx_riesgo_control_seguimientos_riesgo
    ON legal_management.riesgo_control_seguimientos (riesgo_id);

COMMENT ON TABLE legal_management.riesgo_control_seguimientos IS 'Seguimiento cuatrimestral (enero-abril, mayo-agosto, septiembre-diciembre) de los controles existentes de un riesgo';
