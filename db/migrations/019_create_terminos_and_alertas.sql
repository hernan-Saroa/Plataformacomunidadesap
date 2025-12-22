-- Migration 019: Create Terminos Procesales and Alertas Enviadas Tables
-- Description: Create missing tables for terms and alerts with necessary types.

-- 1. Create Enums
DO $$ BEGIN
    CREATE TYPE internal_disciplinary_control.termino_estado_enum AS ENUM ('pendiente', 'proximo_vencer', 'vencido', 'cumplido');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE internal_disciplinary_control.tipo_alerta_enum AS ENUM ('email', 'visual', 'sistema');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE internal_disciplinary_control.estado_alerta_enum AS ENUM ('enviada', 'pendiente', 'error');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create terminos_procesales table
CREATE TABLE IF NOT EXISTS "internal_disciplinary_control"."terminos_procesales" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "proceso_id" uuid NOT NULL,
    "numero_proceso" character varying(20),
    "actuacion" character varying(200) NOT NULL,
    "responsable_id" uuid NOT NULL,
    "responsable_nombre" character varying(200) NOT NULL,
    "email_responsable" character varying(100) NOT NULL,
    "fecha_inicio" date NOT NULL,
    "dias_habiles" integer NOT NULL,
    "fecha_vencimiento" date NOT NULL,
    "dias_restantes" integer NOT NULL,
    "estado" "internal_disciplinary_control"."termino_estado_enum" NOT NULL DEFAULT 'pendiente',
    "alerta_enviada" boolean NOT NULL DEFAULT false,
    "fecha_cumplimiento" date,
    "observaciones" text,
    "creado_por_id" uuid NOT NULL,
    "fecha_creacion" TIMESTAMP NOT NULL DEFAULT now(),
    "fecha_actualizacion" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_terminos_procesales" PRIMARY KEY ("id"),
    CONSTRAINT "FK_terminos_proceso" FOREIGN KEY ("proceso_id") REFERENCES "internal_disciplinary_control"."disciplinary_processes" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- Indexes for terminos_procesales
CREATE INDEX IF NOT EXISTS "IDX_terminos_proceso_id" ON "internal_disciplinary_control"."terminos_procesales" ("proceso_id");
CREATE INDEX IF NOT EXISTS "IDX_terminos_responsable_id" ON "internal_disciplinary_control"."terminos_procesales" ("responsable_id");
CREATE INDEX IF NOT EXISTS "IDX_terminos_estado" ON "internal_disciplinary_control"."terminos_procesales" ("estado");
CREATE INDEX IF NOT EXISTS "IDX_terminos_fecha_vencimiento" ON "internal_disciplinary_control"."terminos_procesales" ("fecha_vencimiento");
CREATE INDEX IF NOT EXISTS "IDX_terminos_dias_restantes" ON "internal_disciplinary_control"."terminos_procesales" ("dias_restantes");

-- 3. Create alertas_enviadas table
CREATE TABLE IF NOT EXISTS "internal_disciplinary_control"."alertas_enviadas" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "termino_id" uuid NOT NULL,
    "regla_alerta_id" uuid NOT NULL,
    "tipo" "internal_disciplinary_control"."tipo_alerta_enum" NOT NULL,
    "destinatario" character varying(200) NOT NULL,
    "asunto" character varying(500),
    "mensaje" text,
    "estado" "internal_disciplinary_control"."estado_alerta_enum" NOT NULL DEFAULT 'pendiente',
    "fecha_envio" TIMESTAMP NOT NULL DEFAULT now(),
    "fecha_lectura" TIMESTAMP,
    "error_mensaje" text,
    "creado_por_id" uuid,
    "fecha_creacion" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_alertas_enviadas" PRIMARY KEY ("id"),
    CONSTRAINT "FK_alertas_termino" FOREIGN KEY ("termino_id") REFERENCES "internal_disciplinary_control"."terminos_procesales" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT "FK_alertas_regla" FOREIGN KEY ("regla_alerta_id") REFERENCES "internal_disciplinary_control"."reglas_alerta" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- Indexes for alertas_enviadas
CREATE INDEX IF NOT EXISTS "IDX_alertas_termino_id" ON "internal_disciplinary_control"."alertas_enviadas" ("termino_id");
CREATE INDEX IF NOT EXISTS "IDX_alertas_regla_alerta_id" ON "internal_disciplinary_control"."alertas_enviadas" ("regla_alerta_id");
CREATE INDEX IF NOT EXISTS "IDX_alertas_estado" ON "internal_disciplinary_control"."alertas_enviadas" ("estado");
CREATE INDEX IF NOT EXISTS "IDX_alertas_fecha_envio" ON "internal_disciplinary_control"."alertas_enviadas" ("fecha_envio");
