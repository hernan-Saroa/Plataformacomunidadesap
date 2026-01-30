-- Migration: Add specific columns for Juzgamiento Disciplinario
-- Description: Extends expedientes table to support Disciplinary process fields

ALTER TABLE "legal_management"."expedientes"
ADD COLUMN IF NOT EXISTS "etapa" VARCHAR(50), 
ADD COLUMN IF NOT EXISTS "cargo_investigado" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "ley_aplicable" VARCHAR(100),
ADD COLUMN IF NOT EXISTS "hechos" TEXT,
ADD COLUMN IF NOT EXISTS "fecha_limite_etapa" TIMESTAMP;

-- Add comments for documentation
COMMENT ON COLUMN "legal_management"."expedientes"."etapa" IS 'Stage of the process: AVOCAMIENTO, PRUEBAS, ALEGATOS, etc.';
COMMENT ON COLUMN "legal_management"."expedientes"."cargo_investigado" IS 'Job title of the investigated person';
COMMENT ON COLUMN "legal_management"."expedientes"."ley_aplicable" IS 'Applicable law, e.g., Ley 1952/2019';
