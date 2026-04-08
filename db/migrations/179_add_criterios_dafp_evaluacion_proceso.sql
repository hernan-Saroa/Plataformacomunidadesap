-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN 179: Criterios de Priorización DAFP en evaluacion_proceso
-- Fecha: 2026-04-07
-- Descripción: Agrega los 4 criterios de priorización DAFP (Tiempo, Alta
--              Dirección, Objetivos Estratégicos, Hallazgos Anteriores) y
--              los 3 resultados calculados (Ponderación, Nivel Criticidad,
--              Ciclo Rotación) al reemplazar el modelo C+E-M y los
--              Requerimientos Especiales.
-- Fórmula: Ponderación = RI×0.4 + Tiempo×0.1 + AD×0.1 + Obj×0.1 + Hall×0.3
-- Ref: RE-E-GE-034 DAFP
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Criterios de priorización (entradas del formulario, calificación 1-5)
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE control_interno.evaluacion_proceso
  ADD COLUMN IF NOT EXISTS tiempo_ultima_auditoria INTEGER DEFAULT 0;

ALTER TABLE control_interno.evaluacion_proceso
  ADD COLUMN IF NOT EXISTS temas_alta_direccion INTEGER DEFAULT 0;

ALTER TABLE control_interno.evaluacion_proceso
  ADD COLUMN IF NOT EXISTS objetivos_estrategicos INTEGER DEFAULT 0;

ALTER TABLE control_interno.evaluacion_proceso
  ADD COLUMN IF NOT EXISTS hallazgos_anteriores INTEGER DEFAULT 0;

COMMENT ON COLUMN control_interno.evaluacion_proceso.tiempo_ultima_auditoria
  IS 'Criterio DAFP: tiempo transcurrido desde la última auditoría. 1=<=1año … 5=>4años/Nunca';
COMMENT ON COLUMN control_interno.evaluacion_proceso.temas_alta_direccion
  IS 'Criterio DAFP: temas de interés de la Alta Dirección. 2=Bajo … 5=Muy relevante';
COMMENT ON COLUMN control_interno.evaluacion_proceso.objetivos_estrategicos
  IS 'Criterio DAFP: cantidad de objetivos estratégicos asociados. 2=1 obj … 5=4+ obj';
COMMENT ON COLUMN control_interno.evaluacion_proceso.hallazgos_anteriores
  IS 'Criterio DAFP: resultados de auditorías anteriores (hallazgos). 1=Sin hallazgos … 5=7+';

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Resultados calculados automáticamente
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE control_interno.evaluacion_proceso
  ADD COLUMN IF NOT EXISTS ponderacion_final_dafp NUMERIC(4,2) DEFAULT 0;

ALTER TABLE control_interno.evaluacion_proceso
  ADD COLUMN IF NOT EXISTS nivel_criticidad_dafp VARCHAR(20) DEFAULT NULL;

ALTER TABLE control_interno.evaluacion_proceso
  ADD COLUMN IF NOT EXISTS ciclo_rotacion_dafp VARCHAR(20) DEFAULT NULL;

COMMENT ON COLUMN control_interno.evaluacion_proceso.ponderacion_final_dafp
  IS 'Ponderación DAFP calculada: RI×0.4 + Tiempo×0.1 + AD×0.1 + Obj×0.1 + Hallazgos×0.3';
COMMENT ON COLUMN control_interno.evaluacion_proceso.nivel_criticidad_dafp
  IS 'Nivel de criticidad resultante: Extremo | Alto | Moderado | Bajo';
COMMENT ON COLUMN control_interno.evaluacion_proceso.ciclo_rotacion_dafp
  IS 'Ciclo de rotación de auditorías: Cada año | Cada 2 años | Cada 3 años';

-- ───────────────────────────────────────────────────────────────────────────
-- 3. Índice para consultas por nivel de criticidad
-- ───────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_evaluacion_nivel_criticidad
  ON control_interno.evaluacion_proceso(nivel_criticidad_dafp);

CREATE INDEX IF NOT EXISTS idx_evaluacion_ponderacion_dafp
  ON control_interno.evaluacion_proceso(ponderacion_final_dafp DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- FIN MIGRACIÓN 179
-- ═══════════════════════════════════════════════════════════════════════════
