-- =============================================================================
-- Migración: Plan de Mejoramiento — Seguimiento, Evaluación y Cierre
-- Fecha: 2026-06-22
-- Spec: spec-plan-mejoramiento-seguimiento.md
-- Fuente normativa: EM-PT-002 v3 (act. 4-10), EM-FO-002 v3
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Nuevas columnas en accion_correctiva (seguimiento + efectividad EM-FO-002)
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  -- Seguimiento / evaluación
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

  -- Efectividad
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
-- 2. Tabla evidencia_accion — Evidencias formales cargadas por el auditado
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
-- 3. Tabla alerta_plan — Alertas del motor de seguimiento (EM-PT-002 act. 6)
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
-- 4. Tabla cierre_plan — Cierre y archivo del expediente (EM-PT-002 act. 8-10)
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
-- 5. Permisos RBAC nuevos (RF015 / US-025)
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  -- Solo insertar si la tabla de permisos existe
  IF EXISTS (SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'auth' AND table_name = 'permission')
  THEN
    INSERT INTO auth.permission (code, name, description, id_module, is_active)
    VALUES
      ('control-interno.planes-mejoramiento.validar-evidencia',
       'Validar Evidencias Plan Mejoramiento',
       'Calificar evidencias de acciones de mejora (Aceptado/Con Observaciones). Ref: US-032 / RF-SG-02',
       'fc0051b8-761d-4cf6-9d14-9cfdc08b4555', true),
      ('control-interno.planes-mejoramiento.seguimiento',
       'Seguimiento Plan Mejoramiento',
       'Registrar seguimiento y evaluacion de acciones de mejora. Ref: EM-PT-002 act. 5',
       'fc0051b8-761d-4cf6-9d14-9cfdc08b4555', true),
      ('control-interno.planes-mejoramiento.cerrar',
       'Cerrar Plan Mejoramiento',
       'Cerrar y archivar planes de mejoramiento. Ref: EM-PT-002 act. 8-10',
       'fc0051b8-761d-4cf6-9d14-9cfdc08b4555', true)
    ON CONFLICT (code) DO NOTHING;
  END IF;
END $$;

-- =============================================================================
-- FIN DE MIGRACIÓN
-- =============================================================================
