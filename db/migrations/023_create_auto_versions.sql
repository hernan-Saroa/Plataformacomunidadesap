DROP TABLE IF EXISTS "internal_disciplinary_control"."auto_versions" CASCADE;

CREATE TABLE IF NOT EXISTS "internal_disciplinary_control"."auto_versions" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "autoId" uuid,
  "contenido" text NOT NULL,
  "versionNumber" integer NOT NULL,
  "createdBy" uuid,
  "changeReason" text,
  "createdAt" timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT "PK_auto_versions" PRIMARY KEY ("id"),
  CONSTRAINT "FK_auto_versions_auto" FOREIGN KEY ("autoId") REFERENCES "internal_disciplinary_control"."legal_autos"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IDX_auto_versions_autoId" ON "internal_disciplinary_control"."auto_versions"("autoId");
