-- =====================================================================
-- Bug 5c: Hallazgos y Acciones de Mejora de un Plan de Mejoramiento
-- Tabla con FK al plan, nombre, descripción, archivo adjunto y % avance.
-- El plan padre solo puede llegar a 100% si TODOS los hallazgos hijos
-- están en 100% (regla aplicada en backend al recalcular).
-- =====================================================================

CREATE TABLE IF NOT EXISTS legal_management.planes_hallazgos (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id             UUID NOT NULL,
    nombre              VARCHAR(255) NOT NULL,
    descripcion         TEXT,
    porcentaje_avance   INTEGER NOT NULL DEFAULT 0,
    archivo_url         TEXT,
    archivo_nombre      VARCHAR(255),
    archivo_mime        VARCHAR(100),
    created_by          VARCHAR(150),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT planes_hallazgos_porcentaje_check
        CHECK (porcentaje_avance >= 0 AND porcentaje_avance <= 100),
    CONSTRAINT planes_hallazgos_plan_fk
        FOREIGN KEY (plan_id) REFERENCES legal_management.planes_mejoramiento(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_planes_hallazgos_plan_id
    ON legal_management.planes_hallazgos(plan_id);
