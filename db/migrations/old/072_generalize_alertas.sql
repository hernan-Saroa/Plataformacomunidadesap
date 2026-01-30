-- Migration 072: Generalize Alertas Enviadas Table
-- Description: Make termino_id and regra_alerta_id nullable, add auto_id for generic notifications.

-- 1. Alter columns to be nullable
ALTER TABLE "internal_disciplinary_control"."alertas_enviadas" ALTER COLUMN "termino_id" DROP NOT NULL;
ALTER TABLE "internal_disciplinary_control"."alertas_enviadas" ALTER COLUMN "regla_alerta_id" DROP NOT NULL;

-- 2. Add auto_id column
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'internal_disciplinary_control' AND table_name = 'alertas_enviadas' AND column_name = 'auto_id') THEN
        ALTER TABLE "internal_disciplinary_control"."alertas_enviadas" ADD COLUMN "auto_id" uuid;
        ALTER TABLE "internal_disciplinary_control"."alertas_enviadas" ADD CONSTRAINT "FK_alertas_auto" FOREIGN KEY ("auto_id") REFERENCES "internal_disciplinary_control"."legal_autos" ("id") ON DELETE SET NULL ON UPDATE NO ACTION;
    END IF;
END $$;

-- 3. Add index for auto_id
CREATE INDEX IF NOT EXISTS "IDX_alertas_auto_id" ON "internal_disciplinary_control"."alertas_enviadas" ("auto_id");
