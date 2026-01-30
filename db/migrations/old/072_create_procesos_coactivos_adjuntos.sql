-- Migration: Create Procesos Coactivos Adjuntos Table

CREATE TABLE IF NOT EXISTS procesos_coactivos_adjuntos (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    proceso_id uuid NOT NULL,
    nombre_original character varying NOT NULL,
    nombre_archivo character varying NOT NULL,
    mime_type character varying NOT NULL,
    tamano integer NOT NULL,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_procesos_coactivos_adjuntos" PRIMARY KEY (id),
    CONSTRAINT "FK_procesos_coactivos_adjuntos_proceso" FOREIGN KEY (proceso_id) REFERENCES procesos_coactivos(id) ON DELETE CASCADE
);

-- Index for faster lookups by proceso_id
CREATE INDEX IF NOT EXISTS "IDX_procesos_coactivos_adjuntos_proceso_id" ON procesos_coactivos_adjuntos (proceso_id);
