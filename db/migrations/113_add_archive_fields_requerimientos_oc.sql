-- Migration: Add archive fields to Requerimientos OC
ALTER TABLE "legal_management"."requerimientos_oc"
ADD COLUMN "estado_archivo" varchar DEFAULT 'ACTIVO',
ADD COLUMN "fecha_archivo" timestamp,
ADD COLUMN "usuario_archivo" varchar,
ADD COLUMN "motivo_archivo" text;

COMMENT ON COLUMN "legal_management"."requerimientos_oc"."estado_archivo" IS 'Estado del requerimiento en el sistema de archivo: ACTIVO, ARCHIVADO, ELIMINADO';
