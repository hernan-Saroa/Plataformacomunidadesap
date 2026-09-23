-- ---------------------------------------------------------------------------
-- Migracion 014 · EFDS-1735 RF-INF-006 — Valoración en Campo y Registro de Insumos Requeridos
-- Fecha: 2026-09-21
-- Responsable: Coordinación UMI
-- Objetivo:
--   1. Incorporar 2 nuevos estados al catálogo ESTADO_SOLICITUD:
--      EN_CAMPO_VALORACION (orden 14) y EN_ESPERA_DE_INSUMOS (orden 15).
--   2. Extender la tabla solicitud_mantenimiento con 9 columnas para
--      seguimiento de la valoración, riesgo, estimación y extensión de SLA.
--   3. Crear la tabla solicitud_valoracion (1-N con solicitud) para registrar
--      cada visita técnica de inspección con diagnóstico, alcance, evidencias.
--   4. Crear la tabla solicitud_valoracion_insumo (1-N con valoracion) para
--      el detalle de materiales/repuestos por fila con su disponibilidad
--      y el costo estimado subtotal generado como STORED.
--   5. Actualizar el COMMENT oficial de la columna estado.
--
-- Idempotente: todos los INSERT / ALTER llevan DO NOTHING / IF NOT EXISTS.
-- ---------------------------------------------------------------------------

BEGIN;

-- Asegurar search_path
SET LOCAL search_path TO "infrastructure-management", public;

-- Habilitar uuid-ossp (requerido para uuid_generate_v4())
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA public;

-- ===========================================================================
-- PASO 1 — Dos nuevos estados en catálogo ESTADO_SOLICITUD
-- ===========================================================================

-- 1.1 EN_CAMPO_VALORACION — orden 14, grupo EJECUCION_PREVIA
INSERT INTO "infrastructure-management".catalogo_item
  (catalogo, codigo, nombre, orden, metadata, is_activo)
VALUES (
  'ESTADO_SOLICITUD',
  'EN_CAMPO_VALORACION',
  'En campo - Valoración técnica',
  14,
  '{"color":"bg-indigo-100 text-indigo-800 border border-indigo-200",
    "icon": "clipboard-check",
    "grupo": "EJECUCION_PREVIA",
    "descripcion":"Técnico ejecutando visita de inspección previa antes de iniciar trabajos"}'::jsonb,
  TRUE
)
ON CONFLICT (catalogo, codigo) DO NOTHING;

-- 1.2 EN_ESPERA_DE_INSUMOS — orden 15, grupo EJECUCION_BLOQUEADA
INSERT INTO "infrastructure-management".catalogo_item
  (catalogo, codigo, nombre, orden, metadata, is_activo)
VALUES (
  'ESTADO_SOLICITUD',
  'EN_ESPERA_DE_INSUMOS',
  'En espera de insumos y materiales',
  15,
  '{"color":"bg-amber-100 text-amber-800 border border-amber-300",
    "icon": "package",
    "grupo": "EJECUCION_BLOQUEADA",
    "descripcion":"Solicitud en pausa por falta de materiales. El SLA de fecha límite fue extendido automáticamente.",
    "extiende_sla":"true"}'::jsonb,
  TRUE
)
ON CONFLICT (catalogo, codigo) DO NOTHING;

-- ===========================================================================
-- PASO 2 — Nuevas columnas en solicitud_mantenimiento (9 cols)
-- ===========================================================================

-- 2.1 Estado interno de la valoración (independiente del estado general)
ALTER TABLE "infrastructure-management".solicitud_mantenimiento
  ADD COLUMN IF NOT EXISTS estado_valoracion VARCHAR(20)
    NOT NULL DEFAULT 'NO_APLICA'
    CHECK (estado_valoracion IN ('NO_APLICA','EN_CURSO','FINALIZADA'));

COMMENT ON COLUMN "infrastructure-management".solicitud_mantenimiento.estado_valoracion
  IS 'Estado interno del proceso de valoración técnica previa (EFDS-1735). NO_APLICA cuando la solicitud salta directo a ejecución.';

-- 2.2 Fechas de valoración
ALTER TABLE "infrastructure-management".solicitud_mantenimiento
  ADD COLUMN IF NOT EXISTS fecha_inicio_valoracion TIMESTAMPTZ NULL;

ALTER TABLE "infrastructure-management".solicitud_mantenimiento
  ADD COLUMN IF NOT EXISTS fecha_fin_valoracion TIMESTAMPTZ NULL;

-- 2.3 Riesgo detectado y apagado eléctrico (solo CS_002)
ALTER TABLE "infrastructure-management".solicitud_mantenimiento
  ADD COLUMN IF NOT EXISTS riesgo_valoracion VARCHAR(10) NULL
    CHECK (riesgo_valoracion IS NULL OR riesgo_valoracion IN ('BAJO','MEDIO','ALTO'));

ALTER TABLE "infrastructure-management".solicitud_mantenimiento
  ADD COLUMN IF NOT EXISTS requiere_apagado_electrico BOOLEAN NOT NULL DEFAULT FALSE;

-- 2.4 Totales y flag de espera insumos
ALTER TABLE "infrastructure-management".solicitud_mantenimiento
  ADD COLUMN IF NOT EXISTS total_estimado_insumos_cop NUMERIC(15,2) NOT NULL DEFAULT 0;

ALTER TABLE "infrastructure-management".solicitud_mantenimiento
  ADD COLUMN IF NOT EXISTS espera_insumos_flag BOOLEAN NOT NULL DEFAULT FALSE;

-- 2.5 SLA extendido: guardamos la fecha original antes de la ampliación por materiales
ALTER TABLE "infrastructure-management".solicitud_mantenimiento
  ADD COLUMN IF NOT EXISTS fecha_limite_original_antes_extension TIMESTAMPTZ NULL;

ALTER TABLE "infrastructure-management".solicitud_mantenimiento
  ADD COLUMN IF NOT EXISTS dias_extendidos_por_insumos SMALLINT NOT NULL DEFAULT 0;

-- ===========================================================================
-- PASO 3 — Tabla: solicitud_valoracion (1-N con solicitud)
-- ===========================================================================

CREATE TABLE IF NOT EXISTS "infrastructure-management".solicitud_valoracion (
  id_valoracion UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_solicitud_mantenimiento UUID NOT NULL
    REFERENCES "infrastructure-management".solicitud_mantenimiento(id_solicitud)
    ON DELETE CASCADE,

  id_tecnico_valorador UUID NULL,
  tecnico_codigo VARCHAR(20) NULL,
  tecnico_nombre VARCHAR(200) NOT NULL,

  estado_al_finalizar VARCHAR(30) NOT NULL
    CHECK (estado_al_finalizar IN ('EN_PROGRESO','EN_ESPERA_DE_INSUMOS')),

  diagnostico TEXT NOT NULL CHECK (char_length(diagnostico) >= 10),
  alcance_identificado TEXT NOT NULL CHECK (char_length(alcance_identificado) >= 10),
  tiempo_estimado_horas NUMERIC(6,2) NOT NULL
    CHECK (tiempo_estimado_horas >= 0.25 AND tiempo_estimado_horas <= 240.0),

  nivel_riesgo VARCHAR(10) NOT NULL CHECK (nivel_riesgo IN ('BAJO','MEDIO','ALTO')),
  requiere_apagado_electrico BOOLEAN NOT NULL DEFAULT FALSE,
  observaciones TEXT NULL,

  evidencias JSONB NOT NULL DEFAULT '[]'::jsonb,

  fecha_inicio_valoracion TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_fin_valoracion TIMESTAMPTZ NOT NULL DEFAULT now(),

  es_version_corregida_por_encargado BOOLEAN NOT NULL DEFAULT FALSE,
  id_usuario_corrector UUID NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_solicitud_valoracion_solicitud
  ON "infrastructure-management".solicitud_valoracion(id_solicitud_mantenimiento);

CREATE INDEX IF NOT EXISTS idx_solicitud_valoracion_tecnico
  ON "infrastructure-management".solicitud_valoracion(id_tecnico_valorador);

COMMENT ON TABLE "infrastructure-management".solicitud_valoracion
  IS 'EFDS-1735 RF-INF-006. Cada fila es una visita técnica de inspección previa. 1-N con solicitud (se permiten revalorizaciones o segundas visitas).';

COMMENT ON COLUMN "infrastructure-management".solicitud_valoracion.evidencias
  IS 'Arreglo JSON de evidencias fotográficas/pdf de la inspección: [{nombre, url, tamaño_bytes, bucket_path}].';

-- ===========================================================================
-- PASO 4 — Tabla: solicitud_valoracion_insumo (1-N con valoracion)
-- ===========================================================================

CREATE TABLE IF NOT EXISTS "infrastructure-management".solicitud_valoracion_insumo (
  id_insumo UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_valoracion UUID NOT NULL
    REFERENCES "infrastructure-management".solicitud_valoracion(id_valoracion)
    ON DELETE CASCADE,

  codigo_insumo VARCHAR(50) NULL,
  nombre VARCHAR(255) NOT NULL CHECK (char_length(nombre) >= 2),

  cantidad NUMERIC(12,3) NOT NULL CHECK (cantidad > 0),
  unidad_medida VARCHAR(4) NOT NULL
    CHECK (unidad_medida IN ('un','m','m2','kg','L','cj','paq','rol','glb','otro')),

  costo_unitario_cop NUMERIC(15,2) NOT NULL DEFAULT 0
    CHECK (costo_unitario_cop >= 0),

  subtotal_cop NUMERIC(15,2) GENERATED ALWAYS AS (cantidad * costo_unitario_cop) STORED,

  disponibilidad VARCHAR(30) NOT NULL
    CHECK (disponibilidad IN ('DISPONIBLE_EN_BODEGA','NO_DISPONIBLE_A_SOLICITAR')),

  tiempo_adquisicion_dias SMALLINT NULL
    CHECK (tiempo_adquisicion_dias IS NULL OR tiempo_adquisicion_dias BETWEEN 0 AND 90),

  orden_item SMALLINT NOT NULL DEFAULT 1,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_tiempo_adquisicion_si_no_disponible CHECK (
    (disponibilidad = 'DISPONIBLE_EN_BODEGA')
    OR (disponibilidad = 'NO_DISPONIBLE_A_SOLICITAR' AND tiempo_adquisicion_dias IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_solicitud_valoracion_insumo_valoracion
  ON "infrastructure-management".solicitud_valoracion_insumo(id_valoracion);

COMMENT ON TABLE "infrastructure-management".solicitud_valoracion_insumo
  IS 'EFDS-1735. Detalle fila-a-fila de materiales y repuestos requeridos para la ejecución de una visita de valoración. Restricción a nivel fila chk_tiempo_adquisicion_si_no_disponible: si disponibilidad=NO_DISPONIBLE_A_SOLICITAR, es obligatorio tiempo_adquisicion_dias para extender el SLA.';

-- ===========================================================================
-- PASO 5 — Actualizar COMMENT de columna estado
-- ===========================================================================

COMMENT ON COLUMN "infrastructure-management".solicitud_mantenimiento.estado
  IS 'Estado formal de la solicitud (EFDS-1728). Válidos: RECIBIDA, EN_ANALISIS, PENDIENTE_CLASIFICACION, PENDIENTE_COTIZACION, PENDIENTE_APROBACION, EN_VALORACION, EN_PROCESO, ASIGNADA, EN_CAMPO_VALORACION, EN_ESPERA_DE_INSUMOS, EN_PROGRESO, EN_EJECUCION, PENDIENTE_RECURSO, COMPLETADA, CERRADA, CERRADA_SIN_ATENCION, RECHAZADA, REMITIDA_TI.';

COMMIT;
