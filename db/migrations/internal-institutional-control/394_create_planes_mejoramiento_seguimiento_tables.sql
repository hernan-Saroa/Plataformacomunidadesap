-- =============================================================================
-- Migración: Control Interno - Tablas de Seguimiento, Evidencias, Alertas y Cierre de Plan
-- Ruta: db/migrations/control-interno-gestion/394_create_planes_mejoramiento_seguimiento_tables.sql
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS control_interno;

-- ---------------------------------------------------------------------------
-- 1. Nuevas columnas en accion_correctiva (seguimiento + efectividad EM-FO-002)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'control_interno' AND table_name = 'accion_correctiva'
    AND column_name = 'cantidad_acciones_programadas')
  THEN
    ALTER TABLE control_interno.accion_correctiva
      ADD COLUMN cantidad_acciones_programadas INT,
      ADD COLUMN cantidad_acciones_implementadas INT,
      ADD COLUMN cumplimiento_emfo INT,
      ADD COLUMN estado_accion_seguimiento VARCHAR(20) DEFAULT 'abierta',
      ADD COLUMN responsable_seguimiento VARCHAR(500),
      ADD COLUMN observacion_cumplimiento TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'control_interno' AND table_name = 'accion_correctiva'
    AND column_name = 'evaluar_aplicacion_controles')
  THEN
    ALTER TABLE control_interno.accion_correctiva
      ADD COLUMN evaluar_aplicacion_controles BOOLEAN,
      ADD COLUMN validar_situacion_no_repitio BOOLEAN,
      ADD COLUMN efectividad_emfo INT,
      ADD COLUMN efectividad_verificada BOOLEAN DEFAULT FALSE,
      ADD COLUMN observacion_efectividad TEXT;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Tabla evidencia_accion — Evidencias cargadas por el auditado
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS control_interno.evidencia_accion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accion_id UUID NOT NULL REFERENCES control_interno.accion_correctiva(id) ON DELETE CASCADE,
  archivo_ref VARCHAR(1000) NOT NULL,
  archivo_nombre VARCHAR(500) NOT NULL,
  archivo_tipo VARCHAR(100),
  archivo_tamanio BIGINT,
  descripcion TEXT,
  cargada_por_id VARCHAR(255) NOT NULL,
  cargada_por_nombre VARCHAR(500),
  cargada_at TIMESTAMPTZ DEFAULT NOW(),
  estado_validacion VARCHAR(30) DEFAULT 'pendiente',
  comentarios TEXT,
  solicita_nueva_evidencia BOOLEAN DEFAULT FALSE,
  calificada_por_id VARCHAR(255),
  calificada_por_nombre VARCHAR(500),
  calificada_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_evidencia_accion_accion_id
  ON control_interno.evidencia_accion(accion_id);

-- ---------------------------------------------------------------------------
-- 3. Tabla alerta_plan — Alertas de seguimiento del plan
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS control_interno.alerta_plan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES control_interno.plan_mejoramiento(id) ON DELETE CASCADE,
  accion_id UUID REFERENCES control_interno.accion_correctiva(id) ON DELETE SET NULL,
  tipo VARCHAR(50) NOT NULL,
  descripcion TEXT,
  generada_at TIMESTAMPTZ DEFAULT NOW(),
  atendida BOOLEAN DEFAULT FALSE,
  atendida_at TIMESTAMPTZ,
  atendida_por_id VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_alerta_plan_plan_id
  ON control_interno.alerta_plan(plan_id);

-- ---------------------------------------------------------------------------
-- 4. Tabla cierre_plan — Cierre y archivo del expediente
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS control_interno.cierre_plan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID UNIQUE NOT NULL REFERENCES control_interno.plan_mejoramiento(id) ON DELETE CASCADE,
  cerrado BOOLEAN DEFAULT FALSE,
  fecha_cierre TIMESTAMPTZ,
  cerrado_por_id VARCHAR(255),
  cerrado_por_nombre VARCHAR(500),
  observaciones_cierre TEXT,
  efectividad_verificada BOOLEAN DEFAULT FALSE,
  archivado BOOLEAN DEFAULT FALSE,
  indice_electronico_ref VARCHAR(1000),
  fecha_archivo TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 5. Tabla seguimiento_plan — Seguimientos periódicos (trimestral / semestral)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS control_interno.seguimiento_plan (
    id                        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plan_id                   UUID NOT NULL REFERENCES control_interno.plan_mejoramiento(id) ON DELETE CASCADE,
    periodicidad              VARCHAR(20) NOT NULL DEFAULT 'TRIMESTRAL',
    tipo_control              VARCHAR(20) NOT NULL DEFAULT 'INTERNO',
    fecha_corte               TIMESTAMP NOT NULL,
    responsable_id            VARCHAR(255) NOT NULL,
    responsable_nombre        VARCHAR(255),
    resumen                   TEXT,
    informe_ref               VARCHAR(500),
    total_acciones_evaluadas  INT DEFAULT 0,
    acciones_cumplen          INT DEFAULT 0,
    acciones_parcial          INT DEFAULT 0,
    acciones_no_cumplen       INT DEFAULT 0,
    alertas_generadas         INT DEFAULT 0,
    automatico                BOOLEAN DEFAULT FALSE,
    created_at                TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seguimiento_plan_plan_id
    ON control_interno.seguimiento_plan (plan_id);

CREATE INDEX IF NOT EXISTS idx_seguimiento_plan_fecha_corte
    ON control_interno.seguimiento_plan (fecha_corte);

-- ---------------------------------------------------------------------------
-- 6. Tabla documento_plan_mejoramiento — Documentos adjuntos a planes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS control_interno.documento_plan_mejoramiento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_mejoramiento_id UUID NOT NULL REFERENCES control_interno.plan_mejoramiento(id) ON DELETE CASCADE,
  accion_id UUID REFERENCES control_interno.accion_correctiva(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  tipo_documento VARCHAR(100) NOT NULL,
  ruta_archivo VARCHAR(500) NOT NULL,
  nombre_archivo_original VARCHAR(255) NOT NULL,
  tipo_mime VARCHAR(100) NOT NULL,
  tamanio_bytes BIGINT NOT NULL,
  subido_por VARCHAR(255) NOT NULL,
  subido_por_id BIGINT,
  fecha_subida TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  estado_validacion VARCHAR(50) DEFAULT 'PENDIENTE_REVISION',
  comentarios_auditor TEXT,
  fecha_validacion TIMESTAMPTZ,
  validado_por VARCHAR(255),
  solicita_nueva_evidencia BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_plan_mejoramiento_plan_id
  ON control_interno.documento_plan_mejoramiento(plan_mejoramiento_id);

CREATE INDEX IF NOT EXISTS idx_doc_plan_mejoramiento_accion_id
  ON control_interno.documento_plan_mejoramiento(accion_id);
