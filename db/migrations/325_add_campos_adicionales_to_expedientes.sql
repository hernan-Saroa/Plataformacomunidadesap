-- Agregar columna campos_adicionales a la tabla expedientes
ALTER TABLE "legal_management"."expedientes" 
ADD COLUMN IF NOT EXISTS "campos_adicionales" JSONB DEFAULT NULL;
