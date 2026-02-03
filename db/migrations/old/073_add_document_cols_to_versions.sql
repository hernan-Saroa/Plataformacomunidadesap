-- Migration: Add document columns to auto_versions
-- Description: Adds documentUrl and documentName to support file versioning

ALTER TABLE "internal_disciplinary_control"."auto_versions"
ADD COLUMN "documentUrl" text,
ADD COLUMN "documentName" text;

COMMENT ON COLUMN "internal_disciplinary_control"."auto_versions"."documentUrl" IS 'URL del archivo adjunto en esta versión (si existe)';
COMMENT ON COLUMN "internal_disciplinary_control"."auto_versions"."documentName" IS 'Nombre del archivo adjunto en esta versión';
