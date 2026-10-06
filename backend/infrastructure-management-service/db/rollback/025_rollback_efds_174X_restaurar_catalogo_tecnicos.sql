-- ============================================================================
-- Rollback 025 - EFDS-174X
-- Objetivo: Restaurar estado anterior si Opción A causa fallos en QA.
--   - Dropear columna id_tecnico_asignado
--   - Dropear indice ix_solicitud_mantenimiento_tecnico_estado
--   - Restaurar catalog_item TECNICO_MANTENIMIENTO (estructura vacía; data de
--     pruebas se puede reconstruir via migración 023 o seeds si es necesario)
-- ============================================================================

BEGIN;

-- 1. Indice carga vigente
DROP INDEX IF EXISTS "infrastructure-management".ix_solicitud_mantenimiento_tecnico_estado;

-- 2. Columna id_tecnico_asignado (se pierden asignaciones UUID hechas desde 025)
ALTER TABLE "infrastructure-management".solicitud_mantenimiento
  DROP COLUMN IF EXISTS id_tecnico_asignado;

-- 3. Columnas alias cierre (nunca se agregaron en 025 por no romper DTOs). No-op.
ALTER TABLE "infrastructure-management".solicitud_mantenimiento
  DROP COLUMN IF EXISTS id_tecnico_cierre;

-- 4. Filas catalog TECNICO_MANTENIMIENTO: las data=pruebas se perdieron al DELETE.
--    Recreamos catalogo vacío para que los endpoints legacy sigan funcionando
--    y puedan re poblar via AdminParametrosUMI anterior si se revierte Opción A.
--    (No restauramos Porky/Jorge/Luis/Hernando para evitar duplicados si se
--    vuelve a aplicar 023; restaurar a mano via 023 si hace falta.)
-- No insertamos filas para no colisionar con la migración 023 idempotente.

COMMIT;
