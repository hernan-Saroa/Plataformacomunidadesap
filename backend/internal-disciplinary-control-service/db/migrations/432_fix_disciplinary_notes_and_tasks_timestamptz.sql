-- ============================================================================
-- MIGRACIÓN 432: Convertir columnas de fecha a TIMESTAMPTZ en notas y tareas
-- Descripción: Evitar desfase de 5 horas entre la hora de ejecución y la registrada.
--              Las columnas createdAt, updatedAt y fechaCompletada se convierten
--              a TIMESTAMP WITH TIME ZONE interpretando el valor actual en America/Bogota.
-- ============================================================================

BEGIN;

ALTER TABLE internal_disciplinary_control.disciplinary_process_notes
    ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'America/Bogota',
    ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'America/Bogota';

ALTER TABLE internal_disciplinary_control.disciplinary_process_tasks
    ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'America/Bogota',
    ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'America/Bogota',
    ALTER COLUMN "fechaCompletada" TYPE TIMESTAMPTZ USING "fechaCompletada" AT TIME ZONE 'America/Bogota';

COMMIT;
