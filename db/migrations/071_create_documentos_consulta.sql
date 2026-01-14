-- Migración: 071_create_documentos_consulta.sql
-- Descripción: Crea la tabla 'documentos_consulta' en el esquema 'legal_management'

CREATE TABLE IF NOT EXISTS "legal_management"."documentos_consulta" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "consulta_id" uuid NOT NULL,
    "nombre" character varying(255) NOT NULL,
    "tipo_documento" character varying(50) NOT NULL DEFAULT 'otro',
    "descripcion" text,
    "archivo_url" text,
    "archivo_nombre_original" character varying(255),
    "tamano_bytes" bigint,
    "mime_type" character varying(100),
    "subido_por" character varying(200),
    "fecha_documento" date,
    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_documentos_consulta" PRIMARY KEY ("id"),
    CONSTRAINT "FK_consulta_documento" FOREIGN KEY ("consulta_id") REFERENCES "legal_management"."consultas_juridicas" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IDX_documento_consulta_id" ON "legal_management"."documentos_consulta" ("consulta_id");
