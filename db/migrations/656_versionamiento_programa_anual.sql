-- Migration 656: Versionamiento del Programa Anual de Auditoría (EFDS-1919 / EFDS-1639)
-- Schema: control_interno
--
-- El Programa Anual es la lista de auditorías de una vigencia tal como sale en el
-- documento exportado. Cada versión guarda esas filas; se genera sola al exportar
-- cuando cambió algo de lo que el documento imprime. No modifica tablas existentes.

CREATE TABLE IF NOT EXISTS control_interno.version_programa_anual (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vigencia INTEGER NOT NULL,
    version INTEGER NOT NULL,
    -- Huella de los campos que imprime el documento: si no cambia, no hay versión nueva.
    huella VARCHAR(64) NOT NULL,
    -- Filas del programa tal como quedaron en esta versión.
    filas JSONB NOT NULL,
    -- Diferencias frente a la versión anterior (vacío en la versión 1).
    cambios JSONB NOT NULL DEFAULT '[]'::jsonb,
    generada_por VARCHAR(255) NOT NULL,
    generada_por_id VARCHAR(64),
    -- Con zona horaria: la base corre en America/Bogota y el servicio en UTC, y sin
    -- zona la hora se leía corrida 5 horas.
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_version_programa_anual UNIQUE (vigencia, version)
);

CREATE INDEX IF NOT EXISTS idx_version_programa_anual_vigencia
ON control_interno.version_programa_anual(vigencia, version DESC);

COMMENT ON TABLE control_interno.version_programa_anual IS
'Versiones del Programa Anual de Auditoría por vigencia (EFDS-1919). Se generan al exportar si cambió lo que el documento imprime.';
