-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN 170: Agregar columnas causa y efecto a la tabla hallazgo
-- ═══════════════════════════════════════════════════════════════════════════
-- Control Interno - Campos requeridos en formulario Nuevo Hallazgo (Ejecución)
-- y en Hallazgos Preliminares (Nueva Auditoría OCIG).
-- Idempotente: puede ejecutarse múltiples veces sin error.
-- ═══════════════════════════════════════════════════════════════════════════

-- Columna causa: Razón del hallazgo (texto libre)
ALTER TABLE control_interno.hallazgo
  ADD COLUMN IF NOT EXISTS causa TEXT;

-- Columna efecto: Consecuencia del hallazgo (texto libre)
ALTER TABLE control_interno.hallazgo
  ADD COLUMN IF NOT EXISTS efecto TEXT;

-- Comentarios descriptivos
COMMENT ON COLUMN control_interno.hallazgo.causa IS 'Razón o causa del hallazgo identificado';
COMMENT ON COLUMN control_interno.hallazgo.efecto IS 'Consecuencia o efecto del hallazgo';

-- Log
DO $$
BEGIN
  RAISE NOTICE '✅ Migración 170: Columnas causa y efecto agregadas a control_interno.hallazgo';
END $$;
