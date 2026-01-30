-- Create table for storing system configurations (kanban columns, etc.)
CREATE TABLE IF NOT EXISTS "legal_management"."system_configurations" (
    "key" character varying NOT NULL,
    "module" character varying NOT NULL,
    "value" jsonb NOT NULL,
    "description" text,
    "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_system_configurations" PRIMARY KEY ("key")
);

-- Note: 'key' will be like 'defensa-judicial', 'juzgamiento', etc. matching the context IDs.
