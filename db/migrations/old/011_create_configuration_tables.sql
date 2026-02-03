-- Create System Configuration Table
CREATE TABLE IF NOT EXISTS "system_configuration" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "roleCapacities" jsonb NOT NULL DEFAULT '{}',
    "notificationSettings" jsonb NOT NULL DEFAULT '{}',
    "alertSettings" jsonb NOT NULL DEFAULT '{}',
    "securitySettings" jsonb NOT NULL DEFAULT '{}',
    CONSTRAINT "PK_system_configuration" PRIMARY KEY ("id")
);

-- Create Stage Configuration Table
CREATE TABLE IF NOT EXISTS "stage_configuration" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "etapa" character varying NOT NULL,
    "diasHabiles" integer NOT NULL DEFAULT 30,
    "descripcion" text,
    "activo" boolean NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_stage_configuration" PRIMARY KEY ("id")
);

-- Seed Stage Configuration
INSERT INTO "stage_configuration" ("etapa", "diasHabiles", "descripcion", "activo")
SELECT 'EVALUACION', 30, 'Etapa de evaluación inicial', true
WHERE NOT EXISTS (SELECT 1 FROM "stage_configuration" WHERE "etapa" = 'EVALUACION');

INSERT INTO "stage_configuration" ("etapa", "diasHabiles", "descripcion", "activo")
SELECT 'INDAGACION_PREVIA', 180, 'Etapa de indagación previa', true
WHERE NOT EXISTS (SELECT 1 FROM "stage_configuration" WHERE "etapa" = 'INDAGACION_PREVIA');

INSERT INTO "stage_configuration" ("etapa", "diasHabiles", "descripcion", "activo")
SELECT 'INVESTIGACION', 180, 'Etapa de investigación', true
WHERE NOT EXISTS (SELECT 1 FROM "stage_configuration" WHERE "etapa" = 'INVESTIGACION');

INSERT INTO "stage_configuration" ("etapa", "diasHabiles", "descripcion", "activo")
SELECT 'JUZGAMIENTO', 90, 'Etapa de juzgamiento', true
WHERE NOT EXISTS (SELECT 1 FROM "stage_configuration" WHERE "etapa" = 'JUZGAMIENTO');

-- Seed System Configuration (if empty)
INSERT INTO "system_configuration" ("roleCapacities", "notificationSettings", "alertSettings", "securitySettings")
SELECT 
    '{"especializado": 12, "universitario": 10, "senior": 15, "coordinador": 8}'::jsonb,
    '{"vencimiento7dias": true, "vencimiento3dias": true, "vencimiento1dia": true, "procesoVencido": true, "asignacionProceso": true, "cambioEtapa": true, "aprobacionRequerida": false, "resumenDiario": true, "resumenSemanal": true, "emailMasterSwitch": true}'::jsonb,
    '{"porcentajeRiesgo": 85, "porcentajeCritico": 95, "capacidadAlerta": 90, "diasAnticipacion": 7}'::jsonb,
    '{"auditEnabled": true, "digitalSignature": true, "backupEnabled": true}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM "system_configuration");
