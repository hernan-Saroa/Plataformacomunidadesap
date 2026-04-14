ALTER TABLE "internal_disciplinary_control"."disciplinary_processes"
ADD COLUMN IF NOT EXISTS "fechaInicioEtapa" timestamp NULL;

UPDATE "internal_disciplinary_control"."disciplinary_processes"
SET "fechaInicioEtapa" = COALESCE("fechaInicioEtapa", "createdAt")
WHERE "fechaInicioEtapa" IS NULL;

ALTER TABLE "internal_disciplinary_control"."legal_autos"
ADD COLUMN IF NOT EXISTS "etapaDestino" varchar(50) NULL;
