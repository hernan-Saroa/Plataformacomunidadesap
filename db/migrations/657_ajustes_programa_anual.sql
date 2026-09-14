-- Migration 657: Ajustes del Programa Anual de Auditoría (EFDS-1919)
-- Schema: control_interno
--
-- Una versión generada deja el programa en solo consulta. Para modificarlo se
-- inicia un ajuste, y la siguiente versión lo cierra. Cada versión puede llevar
-- el motivo del cambio.

ALTER TABLE control_interno.version_programa_anual
ADD COLUMN IF NOT EXISTS motivo TEXT;

CREATE TABLE IF NOT EXISTS control_interno.programa_anual_ajuste (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vigencia INTEGER NOT NULL,
    iniciado_por VARCHAR(255) NOT NULL,
    iniciado_por_id VARCHAR(64),
    iniciado_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cerrado_at TIMESTAMPTZ,
    -- Versión que cerró el ajuste; vacío si se cerró sin cambios.
    version_resultante INTEGER
);

-- Solo un ajuste abierto por vigencia.
CREATE UNIQUE INDEX IF NOT EXISTS uq_programa_anual_ajuste_abierto
ON control_interno.programa_anual_ajuste(vigencia)
WHERE cerrado_at IS NULL;

COMMENT ON TABLE control_interno.programa_anual_ajuste IS
'Ajustes del Programa Anual (EFDS-1919): mientras hay uno abierto el programa se puede modificar; la siguiente versión lo cierra.';
