-- ============================================================================
-- MIGRACIÓN 431: Convertir columnas de fecha a TIMESTAMPTZ en actuaciones disciplinarias
-- Descripción: Evitar desfase de 5 horas entre la hora de ejecución y la registrada.
--              Las columnas fechaActuacion, createdAt y updatedAt se convierten
--              a TIMESTAMP WITH TIME ZONE interpretando el valor actual en America/Bogota.
-- ============================================================================

BEGIN;

ALTER TABLE internal_disciplinary_control.disciplinary_process_actuaciones
    ALTER COLUMN "fechaActuacion" TYPE TIMESTAMPTZ USING "fechaActuacion" AT TIME ZONE 'America/Bogota',
    ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'America/Bogota',
    ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'America/Bogota';

COMMIT;
