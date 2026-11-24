-- =============================================================================
-- EFDS-Fase 4 / Rollback Migración 031 · Estandarización Territorial Nacional
-- =============================================================================

BEGIN;

SET search_path TO "infrastructure-management", public;

-- 1. Eliminar espacios físicos creados para los 12 CETAPs piloto
DELETE FROM "infrastructure-management".espacio_fisico
WHERE id_bloque IN (
  SELECT id_bloque FROM "infrastructure-management".bloque_edificio WHERE id_cetap IS NOT NULL
);

-- 2. Eliminar bloques asociados a CETAPs
DELETE FROM "infrastructure-management".bloque_edificio
WHERE id_cetap IS NOT NULL;

-- 3. Eliminar índices
DROP INDEX IF EXISTS "infrastructure-management".idx_bloque_cetap;
DROP INDEX IF EXISTS "infrastructure-management".idx_solicitud_dt;
DROP INDEX IF EXISTS "infrastructure-management".idx_solicitud_cetap;

-- 4. Revertir columnas si no hay solicitudes territoriales huérfanas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "infrastructure-management".solicitud_mantenimiento WHERE id_sede IS NULL
  ) THEN
    ALTER TABLE "infrastructure-management".solicitud_mantenimiento 
      ALTER COLUMN id_sede SET NOT NULL;
    ALTER TABLE "infrastructure-management".solicitud_mantenimiento 
      DROP COLUMN IF EXISTS id_direccion_territorial,
      DROP COLUMN IF EXISTS id_cetap,
      DROP COLUMN IF EXISTS ubicacion_adicional_texto;
  END IF;
END $$;

COMMIT;
