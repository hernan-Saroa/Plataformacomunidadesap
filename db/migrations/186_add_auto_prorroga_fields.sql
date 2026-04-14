-- US-26: Auto de Prórroga — Campos adicionales en legal_autos
-- Nota: la columna 'tipo' es varchar, no enum de PostgreSQL.
-- La validación del valor AUTO_PRORROGA la hace TypeORM en la aplicación.

-- 1. Agregar columnas de prórroga a legal_autos
ALTER TABLE internal_disciplinary_control.legal_autos
  ADD COLUMN IF NOT EXISTS "prorrogaMeses" INTEGER NULL,
  ADD COLUMN IF NOT EXISTS "fechaVencimientoAnterior" TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS "fechaVencimientoNueva" TIMESTAMP NULL;

-- 3. Constraint de validación para prorrogaMeses (solo 3 o 6)
ALTER TABLE internal_disciplinary_control.legal_autos
  DROP CONSTRAINT IF EXISTS check_prorroga_meses;

ALTER TABLE internal_disciplinary_control.legal_autos
  ADD CONSTRAINT check_prorroga_meses
  CHECK ("prorrogaMeses" IS NULL OR "prorrogaMeses" IN (3, 6));

-- 4. Seed: Registrar AUTO_PRORROGA en autos_configuration (disponible en todas las etapas)
INSERT INTO internal_disciplinary_control.autos_configuration
  (id, tipo, nombre, estado, stage, orden, "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'AUTO_PRORROGA', 'Auto de Prórroga', 'activo', NULL, 99, NOW(), NOW())
ON CONFLICT (tipo) DO NOTHING;
