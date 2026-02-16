-- ============================================
-- Migración: Agregar columnas faltantes a tablas existentes
-- Ejecutar este script si la base de datos ya existe y necesita actualizarse
-- ============================================

-- Agregar columnas faltantes a legal_autos
ALTER TABLE internal_disciplinary_control.legal_autos
ADD COLUMN IF NOT EXISTS "notificationDate" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "notificationEvidence" TEXT,
ADD COLUMN IF NOT EXISTS "rejection_comments" TEXT,
ADD COLUMN IF NOT EXISTS "currentVersion" INTEGER DEFAULT 1;

-- Crear tabla auto_versions si no existe
CREATE TABLE IF NOT EXISTS internal_disciplinary_control.auto_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "autoId" UUID NOT NULL,
    contenido TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "createdBy" UUID,
    "changeReason" TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_auto_version_auto FOREIGN KEY ("autoId")
        REFERENCES internal_disciplinary_control.legal_autos(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_auto_versions_auto ON internal_disciplinary_control.auto_versions("autoId");
CREATE INDEX IF NOT EXISTS idx_auto_versions_number ON internal_disciplinary_control.auto_versions("versionNumber");

-- Agregar columnas faltantes a evidence (si no existen)
ALTER TABLE internal_disciplinary_control.evidence
ADD COLUMN IF NOT EXISTS "nombreDocumento" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "tipoDocumento" VARCHAR(50),
ADD COLUMN IF NOT EXISTS etapa VARCHAR(100),
ADD COLUMN IF NOT EXISTS "usuarioCarga" VARCHAR(255);

-- Crear índices si no existen
CREATE INDEX IF NOT EXISTS idx_evidence_tipo_documento ON internal_disciplinary_control.evidence("tipoDocumento");

