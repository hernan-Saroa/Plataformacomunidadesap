-- ============================================================
-- Migration 333: Create RUND tables and sequence
-- Previously auto-created in banco-docentes.service.ts (ensureRundTables / onModuleInit).
-- Now managed as a proper migration for deploy consistency.
-- ============================================================

-- 1. Schema
CREATE SCHEMA IF NOT EXISTS academic_work_plan;

-- 2. Sequence for RUND IDs
CREATE SEQUENCE IF NOT EXISTS academic_work_plan.docente_id_rund_seq
  START WITH 1
  INCREMENT BY 1;

-- 3. RundCampoEstado — stores the approval state of each RUND bloque per docente
CREATE TABLE IF NOT EXISTS academic_work_plan."RundCampoEstado" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  docente_id VARCHAR(255) NOT NULL,
  bloque VARCHAR(50) NOT NULL,
  estado VARCHAR(50) NOT NULL DEFAULT 'Pendiente',
  cargado_por VARCHAR(255),
  revisado_por VARCHAR(255),
  observacion TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  canal_origen VARCHAR(50),
  soporte_ids JSONB NOT NULL DEFAULT '[]',
  fecha_revision TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 4. RundSoporteCampo — stores individual document uploads linked to RUND bloques
--    Column names match the ACTUAL DB schema (tipo_soporte, documento_carpeta_id, nombre_archivo).
CREATE TABLE IF NOT EXISTS academic_work_plan."RundSoporteCampo" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  docente_id UUID,
  bloque TEXT,
  tipo_soporte TEXT,
  documento_carpeta_id TEXT,
  nombre_archivo TEXT,
  estado VARCHAR(50) NOT NULL DEFAULT 'Pendiente',
  cargado_por VARCHAR(255),
  observacion TEXT,
  fecha_vencimiento TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 5. Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_rund_campo_estado_docente
  ON academic_work_plan."RundCampoEstado" (docente_id);

CREATE INDEX IF NOT EXISTS idx_rund_soporte_campo_docente
  ON academic_work_plan."RundSoporteCampo" (docente_id);

CREATE INDEX IF NOT EXISTS idx_rund_soporte_campo_bloque
  ON academic_work_plan."RundSoporteCampo" (docente_id, bloque);
