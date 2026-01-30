-- Migration 018: Create Reglas Alerta Table
-- Description: Create table for storing alert rules (ReglaAlerta) to fix missing relation error.

CREATE TABLE IF NOT EXISTS "internal_disciplinary_control"."reglas_alerta" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "nombre" character varying(200) NOT NULL,
    "dias_anticipacion" integer NOT NULL,
    "activa" boolean NOT NULL DEFAULT true,
    "enviar_email" boolean NOT NULL DEFAULT false,
    "mostrar_panel" boolean NOT NULL DEFAULT true,
    "descripcion" text,
    "creado_por_id" uuid,
    "fecha_creacion" TIMESTAMP NOT NULL DEFAULT now(),
    "fecha_actualizacion" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_reglas_alerta" PRIMARY KEY ("id"),
    CONSTRAINT "UQ_reglas_alerta_nombre" UNIQUE ("nombre")
);

CREATE INDEX IF NOT EXISTS "IDX_reglas_alerta_activa" ON "internal_disciplinary_control"."reglas_alerta" ("activa");
