-- REQ-RUND-F014. Las sugerencias no son datos confirmados del perfil.
CREATE TABLE IF NOT EXISTS academic_work_plan."RundExtraccionInicio" (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id), desde TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS academic_work_plan."RundExtraccionTrabajo" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id UUID NOT NULL REFERENCES academic_work_plan."RundDocumentoPerfil"(id),
  docente_id UUID NOT NULL,
  estado TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE','PROCESANDO','COMPLETADO','ERROR','OBSOLETO')),
  intentos INTEGER NOT NULL DEFAULT 0,
  disponible_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  lease_id UUID, lease_hasta TIMESTAMPTZ,
  perfil_base JSONB NOT NULL DEFAULT '{}'::jsonb,
  motor JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_codigo TEXT,
  creado_por TEXT NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rund_extraccion_cola ON academic_work_plan."RundExtraccionTrabajo"(estado, disponible_en);
CREATE UNIQUE INDEX IF NOT EXISTS uq_rund_extraccion_activa ON academic_work_plan."RundExtraccionTrabajo"(documento_id) WHERE estado IN ('PENDIENTE','PROCESANDO');
CREATE INDEX IF NOT EXISTS idx_rund_extraccion_docente ON academic_work_plan."RundExtraccionTrabajo"(docente_id, creado_en DESC);
CREATE TABLE IF NOT EXISTS academic_work_plan."RundExtraccionSugerencia" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trabajo_id UUID NOT NULL REFERENCES academic_work_plan."RundExtraccionTrabajo"(id),
  campo TEXT NOT NULL,
  valor TEXT NOT NULL,
  valor_previo TEXT,
  pagina INTEGER NOT NULL CHECK (pagina > 0),
  evidencia TEXT NOT NULL,
  confianza NUMERIC NOT NULL CHECK (confianza BETWEEN 0 AND 1),
  baja_confianza BOOLEAN NOT NULL,
  estado TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE','APROBADA','CORREGIDA','DESCARTADA')),
  valor_confirmado TEXT,
  revisado_por TEXT,
  motivo TEXT,
  revisado_en TIMESTAMPTZ,
  UNIQUE (trabajo_id, campo)
);
