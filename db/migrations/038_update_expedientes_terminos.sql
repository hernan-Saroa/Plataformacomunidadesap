-- Migration: Add specific columns for Control de Terminos e Informes
-- Description: Extends expedientes table to support Report Requests fields

ALTER TABLE "legal_management"."expedientes"
ADD COLUMN IF NOT EXISTS "tipo_solicitud" VARCHAR(100),
ADD COLUMN IF NOT EXISTS "radicado_externo" VARCHAR(50),
ADD COLUMN IF NOT EXISTS "asunto" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "datos_requeridos" TEXT;

-- Add comments for documentation
COMMENT ON COLUMN "legal_management"."expedientes"."tipo_solicitud" IS 'Type of report/request, e.g. Informe Pormenorizado';
COMMENT ON COLUMN "legal_management"."expedientes"."radicado_externo" IS 'External ID from the requesting entity';
COMMENT ON COLUMN "legal_management"."expedientes"."asunto" IS 'Short title or subject of the request';
COMMENT ON COLUMN "legal_management"."expedientes"."datos_requeridos" IS 'JSON or text listing required data points';
