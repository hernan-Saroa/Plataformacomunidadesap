-- Migration: Create Autos table for Juzgamiento
-- Date: 2025-12-26

CREATE TABLE IF NOT EXISTS "legal_management"."autos" (
    "id" uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    "expediente_id" uuid NOT NULL,
    "numero" varchar NOT NULL, -- e.g. AUTO-001-2024
    "tipo" varchar NOT NULL, -- e.g. Auto Admisorio
    "fecha_auto" timestamp NOT NULL,
    "juzgado" varchar NOT NULL DEFAULT 'Juzgado Interno Disciplinario',
    "resumen" text,
    "estado" varchar NOT NULL DEFAULT 'Pendiente', -- Pendiente, Notificado, Archivado
    "fecha_notificacion" timestamp,
    "archivo_url" varchar NOT NULL, -- Essential: the auto IS the file
    "archivo_nombre" varchar NOT NULL,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now(),
    
    CONSTRAINT "fk_autos_expediente" FOREIGN KEY ("expediente_id") 
        REFERENCES "legal_management"."expedientes" ("id") ON DELETE CASCADE
);

-- Index for faster queries by expediente
CREATE INDEX IF NOT EXISTS "idx_autos_expediente_id" ON "legal_management"."autos" ("expediente_id");
