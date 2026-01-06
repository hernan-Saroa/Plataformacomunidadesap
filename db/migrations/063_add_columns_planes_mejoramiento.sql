-- Migration: Add new columns to planes_mejoramiento
-- Schema: legal_management

-- Add documento_origen
ALTER TABLE "legal_management"."planes_mejoramiento" 
ADD COLUMN IF NOT EXISTS "documento_origen" VARCHAR(255) NULL;

-- Add area_responsable
ALTER TABLE "legal_management"."planes_mejoramiento" 
ADD COLUMN IF NOT EXISTS "area_responsable" VARCHAR(255) NULL;

-- Add fecha_recepcion
ALTER TABLE "legal_management"."planes_mejoramiento" 
ADD COLUMN IF NOT EXISTS "fecha_recepcion" DATE NULL;

-- Add fecha_respuesta
ALTER TABLE "legal_management"."planes_mejoramiento" 
ADD COLUMN IF NOT EXISTS "fecha_respuesta" DATE NULL;

-- Add severidad
ALTER TABLE "legal_management"."planes_mejoramiento" 
ADD COLUMN IF NOT EXISTS "severidad" VARCHAR(50) NULL;

-- Comments
COMMENT ON COLUMN "legal_management"."planes_mejoramiento"."documento_origen" IS 'Identificador o nombre del documento base (ej: Informe de Auditoría)';
COMMENT ON COLUMN "legal_management"."planes_mejoramiento"."area_responsable" IS 'Nombre del área encargada dentro de la entidad';
COMMENT ON COLUMN "legal_management"."planes_mejoramiento"."severidad" IS 'Nivel de criticidad: CRITICO, ALTO, MEDIO, BAJO';
