-- ============================================================================
-- MIGRACIÓN 433: Convertir columnas de fecha a TIMESTAMPTZ en legal_autos,
--                auto_versions, disciplinary_processes y disciplinary_news
-- Descripción: Evitar desfase de 5 horas entre la hora de ejecución y la registrada.
--              Garantiza que la hora real de aprobación, revisión y envío a Jurídica
--              se guarde y visualice correctamente en America/Bogota.
-- ============================================================================

BEGIN;

-- 1. legal_autos
ALTER TABLE internal_disciplinary_control.legal_autos
    ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'America/Bogota',
    ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'America/Bogota',
    ALTER COLUMN "notificationDate" TYPE TIMESTAMPTZ USING "notificationDate" AT TIME ZONE 'America/Bogota',
    ALTER COLUMN "fechaVencimientoAnterior" TYPE TIMESTAMPTZ USING "fechaVencimientoAnterior" AT TIME ZONE 'America/Bogota',
    ALTER COLUMN "fechaVencimientoNueva" TYPE TIMESTAMPTZ USING "fechaVencimientoNueva" AT TIME ZONE 'America/Bogota';

-- 2. auto_versions
ALTER TABLE internal_disciplinary_control.auto_versions
    ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'America/Bogota';

-- 3. disciplinary_processes
ALTER TABLE internal_disciplinary_control.disciplinary_processes
    ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'America/Bogota',
    ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'America/Bogota',
    ALTER COLUMN "fecha_cierre" TYPE TIMESTAMPTZ USING "fecha_cierre" AT TIME ZONE 'America/Bogota',
    ALTER COLUMN "correo_juridica_fecha_envio" TYPE TIMESTAMPTZ USING "correo_juridica_fecha_envio" AT TIME ZONE 'America/Bogota',
    ALTER COLUMN "fechaInicioEtapa" TYPE TIMESTAMPTZ USING "fechaInicioEtapa" AT TIME ZONE 'America/Bogota',
    ALTER COLUMN "fechaVencimientoEtapa" TYPE TIMESTAMPTZ USING "fechaVencimientoEtapa" AT TIME ZONE 'America/Bogota',
    ALTER COLUMN "fechaPrescripcion" TYPE TIMESTAMPTZ USING "fechaPrescripcion" AT TIME ZONE 'America/Bogota',
    ALTER COLUMN "proceso_asociado_fecha" TYPE TIMESTAMPTZ USING "proceso_asociado_fecha" AT TIME ZONE 'America/Bogota';

-- 4. disciplinary_news
ALTER TABLE internal_disciplinary_control.disciplinary_news
    ALTER COLUMN "created_at" TYPE TIMESTAMPTZ USING "created_at" AT TIME ZONE 'America/Bogota',
    ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'America/Bogota',
    ALTER COLUMN "fecha_remision" TYPE TIMESTAMPTZ USING "fecha_remision" AT TIME ZONE 'America/Bogota',
    ALTER COLUMN "proceso_asociado_fecha" TYPE TIMESTAMPTZ USING "proceso_asociado_fecha" AT TIME ZONE 'America/Bogota';

-- 5. disciplinary_news_processes
ALTER TABLE internal_disciplinary_control.disciplinary_news_processes
    ALTER COLUMN "created_at" TYPE TIMESTAMPTZ USING "created_at" AT TIME ZONE 'America/Bogota',
    ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ USING "updated_at" AT TIME ZONE 'America/Bogota',
    ALTER COLUMN "fecha_asociacion" TYPE TIMESTAMPTZ USING "fecha_asociacion" AT TIME ZONE 'America/Bogota';

COMMIT;
