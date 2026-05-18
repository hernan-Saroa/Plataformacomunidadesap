-- Agrega columna correos (jsonb) y updated_at a la tabla organismos_control
-- para soportar múltiples correos electrónicos por organismo de control

ALTER TABLE legal_management.organismos_control
    ADD COLUMN IF NOT EXISTS correos    JSONB        NOT NULL DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW();

-- Trigger para mantener updated_at actualizado automáticamente
CREATE OR REPLACE FUNCTION legal_management.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_organismos_control_updated_at
    ON legal_management.organismos_control;

CREATE TRIGGER trg_organismos_control_updated_at
    BEFORE UPDATE ON legal_management.organismos_control
    FOR EACH ROW EXECUTE FUNCTION legal_management.set_updated_at();
