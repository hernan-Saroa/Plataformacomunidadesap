-- REQ-RUND-F010 - Gestión documental del perfil docente por categoría.
-- Las versiones son inmutables: reemplazar crea una fila nueva y marca la anterior.

CREATE SCHEMA IF NOT EXISTS academic_work_plan;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS academic_work_plan."RundDocumentoCategoria" (
  codigo TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  mime_permitidos TEXT[] NOT NULL DEFAULT ARRAY['application/pdf']::TEXT[],
  tamano_maximo_bytes BIGINT NOT NULL DEFAULT 10485760,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  orden INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO academic_work_plan."RundDocumentoCategoria"
  (codigo, nombre, descripcion, orden)
VALUES
  ('IDENTIDAD', 'Identidad', 'Documentos que acreditan la identidad del docente.', 10),
  ('TITULOS', 'Títulos', 'Diplomas, actas de grado y convalidaciones.', 20),
  ('CONTRATOS', 'Contratos', 'Contratos y documentos de vinculación.', 30),
  ('CERTIFICADOS', 'Certificados', 'Certificados académicos, laborales o de evaluación.', 40),
  ('RESOLUCIONES', 'Resoluciones', 'Resoluciones y actos administrativos.', 50),
  ('AUTORIZACIONES', 'Autorizaciones', 'Autorizaciones y formatos firmados.', 60),
  ('OTROS', 'Otros', 'Otros documentos PDF relacionados con el perfil.', 99)
ON CONFLICT (codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  orden = EXCLUDED.orden,
  "updatedAt" = NOW();

CREATE TABLE IF NOT EXISTS academic_work_plan."RundDocumentoPerfil" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_logico_id UUID NOT NULL,
  docente_id UUID NOT NULL,
  categoria_codigo TEXT NOT NULL REFERENCES academic_work_plan."RundDocumentoCategoria"(codigo),
  bloque TEXT,
  tipo_soporte TEXT,
  descripcion TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  nombre_archivo TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  tamano_bytes BIGINT NOT NULL CHECK (tamano_bytes >= 0),
  checksum_sha256 TEXT NOT NULL,
  proveedor_almacenamiento TEXT NOT NULL,
  almacenamiento_id TEXT,
  almacenamiento_ruta TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'REEMPLAZADO', 'ELIMINADO')),
  reemplaza_id UUID REFERENCES academic_work_plan."RundDocumentoPerfil"(id),
  rund_soporte_id UUID,
  creado_por TEXT NOT NULL,
  eliminado_por TEXT,
  eliminado_en TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (documento_logico_id, version)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_rund_documento_perfil_vigente
  ON academic_work_plan."RundDocumentoPerfil" (documento_logico_id)
  WHERE estado = 'ACTIVO';

CREATE INDEX IF NOT EXISTS idx_rund_documento_perfil_docente_categoria
  ON academic_work_plan."RundDocumentoPerfil" (docente_id, categoria_codigo, "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_rund_documento_perfil_soporte
  ON academic_work_plan."RundDocumentoPerfil" (rund_soporte_id);

ALTER TABLE academic_work_plan."RundSoporteCampo"
  ADD COLUMN IF NOT EXISTS documento_perfil_id UUID;

-- Incorpora soportes históricos sin mover ni duplicar sus archivos.
WITH legacy AS (
  SELECT
    s.id AS soporte_id,
    s.docente_id,
    s.bloque,
    s.tipo_soporte,
    s.nombre_archivo,
    s.documento_carpeta_id,
    s.cargado_por,
    CASE
      WHEN s.bloque = 'IDENTIDAD' THEN 'IDENTIDAD'
      WHEN s.bloque = 'FORMACION' THEN 'TITULOS'
      WHEN s.tipo_soporte ILIKE '%contrato%' THEN 'CONTRATOS'
      WHEN s.tipo_soporte ILIKE '%certif%' OR s.tipo_soporte ILIKE '%evaluacion%' THEN 'CERTIFICADOS'
      WHEN s.tipo_soporte ILIKE '%resolucion%' OR s.tipo_soporte ILIKE '%acto_%' THEN 'RESOLUCIONES'
      WHEN s.tipo_soporte ILIKE '%autorizacion%' OR s.tipo_soporte ILIKE '%habeas%' THEN 'AUTORIZACIONES'
      ELSE 'OTROS'
    END AS categoria
  FROM academic_work_plan."RundSoporteCampo" s
  WHERE s.documento_carpeta_id IS NOT NULL
    AND s.documento_perfil_id IS NULL
), inserted AS (
  INSERT INTO academic_work_plan."RundDocumentoPerfil" (
    documento_logico_id, docente_id, categoria_codigo, bloque, tipo_soporte,
    version, nombre_archivo, mime_type, tamano_bytes, checksum_sha256,
    proveedor_almacenamiento, almacenamiento_ruta, estado, rund_soporte_id,
    creado_por, "createdAt"
  )
  SELECT
    gen_random_uuid(), docente_id, categoria, bloque, tipo_soporte,
    1, COALESCE(nombre_archivo, 'documento.pdf'), 'application/pdf', 0,
    'LEGACY-' || soporte_id::text, 'LEGACY_LOCAL', documento_carpeta_id,
    'ACTIVO', soporte_id, COALESCE(cargado_por, 'MIGRACION'), NOW()
  FROM legacy
  RETURNING id, rund_soporte_id
)
UPDATE academic_work_plan."RundSoporteCampo" s
SET documento_perfil_id = i.id
FROM inserted i
WHERE s.id = i.rund_soporte_id;

COMMENT ON TABLE academic_work_plan."RundDocumentoPerfil" IS
  'REQ-RUND-F010: documentos PDF versionados del perfil docente, almacenados en OpenKM o proveedor local de desarrollo.';
