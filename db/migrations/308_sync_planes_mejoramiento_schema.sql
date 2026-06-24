-- =====================================================================
-- 308_sync_planes_mejoramiento_schema.sql
-- Sincroniza el esquema de la DB con la entity PlanMejoramiento y
-- AccionCorrectiva del internal-institutional-control-service.
--
-- Entity: plan_mejoramiento (schema: control_interno)
-- Entity: accion_correctiva (schema: control_interno)
-- =====================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────
-- 1. plan_mejoramiento — columnas del entity no presentes en migraciones anteriores
-- ─────────────────────────────────────────────────────────────────────

-- fecha_aprobacion (entity: @Column fecha_aprobacion date nullable)
ALTER TABLE control_interno.plan_mejoramiento
    ADD COLUMN IF NOT EXISTS fecha_aprobacion DATE NULL;

-- aprobado_por (entity: @Column aprobado_por varchar(255) nullable)
ALTER TABLE control_interno.plan_mejoramiento
    ADD COLUMN IF NOT EXISTS aprobado_por VARCHAR(255) NULL;

-- observaciones_aprobacion (entity: @Column text nullable)
ALTER TABLE control_interno.plan_mejoramiento
    ADD COLUMN IF NOT EXISTS observaciones_aprobacion TEXT NULL;

-- motivo_rechazo (entity: @Column text nullable)
ALTER TABLE control_interno.plan_mejoramiento
    ADD COLUMN IF NOT EXISTS motivo_rechazo TEXT NULL;

-- objetivos (entity: @Column jsonb default '[]')
ALTER TABLE control_interno.plan_mejoramiento
    ADD COLUMN IF NOT EXISTS objetivos JSONB NOT NULL DEFAULT '[]'::jsonb;

-- ─────────────────────────────────────────────────────────────────────
-- 2. accion_correctiva — columnas del entity
-- ─────────────────────────────────────────────────────────────────────

-- hallazgo_id (entity: nullable uuid FK a hallazgo)
ALTER TABLE control_interno.accion_correctiva
    ADD COLUMN IF NOT EXISTS hallazgo_id UUID NULL;

-- recursos (entity: text nullable)
ALTER TABLE control_interno.accion_correctiva
    ADD COLUMN IF NOT EXISTS recursos TEXT NULL;

-- indicador (entity: varchar(500) nullable)
ALTER TABLE control_interno.accion_correctiva
    ADD COLUMN IF NOT EXISTS indicador VARCHAR(500) NULL;

-- meta_indicador (entity: varchar(500) nullable)
ALTER TABLE control_interno.accion_correctiva
    ADD COLUMN IF NOT EXISTS meta_indicador VARCHAR(500) NULL;

-- evidencias (entity: jsonb default '[]')
ALTER TABLE control_interno.accion_correctiva
    ADD COLUMN IF NOT EXISTS evidencias JSONB NOT NULL DEFAULT '[]'::jsonb;

-- estado_verificacion_oci (entity: varchar(20) nullable default 'sin_verificar')
ALTER TABLE control_interno.accion_correctiva
    ADD COLUMN IF NOT EXISTS estado_verificacion_oci VARCHAR(20) NULL DEFAULT 'sin_verificar';

-- evidencia_verificada (entity: text nullable)
ALTER TABLE control_interno.accion_correctiva
    ADD COLUMN IF NOT EXISTS evidencia_verificada TEXT NULL;

-- observacion_oci (entity: text nullable)
ALTER TABLE control_interno.accion_correctiva
    ADD COLUMN IF NOT EXISTS observacion_oci TEXT NULL;

-- fecha_verificacion_oci (entity: timestamp nullable)
ALTER TABLE control_interno.accion_correctiva
    ADD COLUMN IF NOT EXISTS fecha_verificacion_oci TIMESTAMP NULL;

-- verificada_por_id (entity: bigint nullable)
ALTER TABLE control_interno.accion_correctiva
    ADD COLUMN IF NOT EXISTS verificada_por_id BIGINT NULL;

-- ─────────────────────────────────────────────────────────────────────
-- 3. Índices de rendimiento
-- ─────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_plan_mejoramiento_auditoria_id
    ON control_interno.plan_mejoramiento(auditoria_id);

CREATE INDEX IF NOT EXISTS idx_plan_mejoramiento_estado
    ON control_interno.plan_mejoramiento(estado);

CREATE INDEX IF NOT EXISTS idx_accion_correctiva_plan_id
    ON control_interno.accion_correctiva(plan_id);

CREATE INDEX IF NOT EXISTS idx_accion_correctiva_estado
    ON control_interno.accion_correctiva(estado);

COMMIT;
