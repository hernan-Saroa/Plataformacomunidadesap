-- Migration: Create legal_autos table
-- Description: Creates the legal_autos table with all columns including recent additions (notificationDate, comentarios, etc.)

DROP TABLE IF EXISTS "legal_autos" CASCADE;

CREATE TABLE "legal_autos" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "processId" uuid NOT NULL,
  "tipo" character varying NOT NULL,
  "contenido" text NOT NULL,
  "estado" character varying NOT NULL DEFAULT 'BORRADOR',
  "firmaUrl" text,
  "notificationDate" timestamp without time zone,
  "notificationEvidence" text,
  "comentarios" text,
  "rejection_comments" text,
  "aprobadoPorId" uuid,
  "createdAt" timestamp without time zone NOT NULL DEFAULT now(),
  "currentVersion" integer NOT NULL DEFAULT 1,
  "updatedAt" timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT "PK_legal_autos" PRIMARY KEY ("id"),
  CONSTRAINT "FK_legal_autos_process" FOREIGN KEY ("processId") REFERENCES "disciplinary_processes"("id") ON DELETE CASCADE
);

-- Index for performance on processId
CREATE INDEX "IDX_legal_autos_processId" ON "legal_autos"("processId");
