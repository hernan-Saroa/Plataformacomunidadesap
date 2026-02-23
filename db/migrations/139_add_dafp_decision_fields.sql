-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN 139: Agregar campos DAFP de decisión a proceso_auditable
-- ═══════════════════════════════════════════════════════════════════════════
-- Fecha: 2026-02-20
-- Descripción: Agrega campos calculados del cuestionario DAFP al JSONB 
--              evaluacion_riesgo para persistir la decisión final
-- ═══════════════════════════════════════════════════════════════════════════

-- El campo evaluacion_riesgo es JSONB, así que no necesitamos ALTER TABLE
-- Los nuevos campos se agregarán automáticamente al guardar.
-- Esta migración solo documenta los campos y actualiza registros existentes
-- con valores por defecto si es necesario.

-- Campos nuevos en evaluacion_riesgo:
-- - vigencia: number (año de la evaluación)
-- - fechaCorte: string (fecha de corte)
-- - ponderacionRiesgo: 'EXTREMO' | 'ALTO' | 'MODERADO' | 'BAJO'
-- - diasRotacion: number (días según plan de rotación)
-- - decisionRotacion: 'INCLUIR' | 'OMITIR' | 'PENDIENTE'
-- - decisionFinal: 'INCLUIR PLAN ANUAL' | 'AUDITORÍA POSTERIOR'
-- - motivoDecision: string (justificación)
-- - prioridadRegla: 1-5 (qué regla DAFP aplicó)

-- Actualizar registros existentes sin decisionFinal para darles un valor por defecto
UPDATE control_interno.proceso_auditable
SET evaluacion_riesgo = evaluacion_riesgo || jsonb_build_object(
  'ponderacionRiesgo', 
  CASE 
    WHEN (evaluacion_riesgo->>'riesgosExtremos')::int > 0 THEN 'ALTO'
    WHEN (evaluacion_riesgo->>'riesgosAltos')::int > 0 THEN 'MODERADO'
    ELSE 'BAJO'
  END,
  'decisionFinal', 'AUDITORÍA POSTERIOR',
  'motivoDecision', 'Pendiente de evaluación DAFP',
  'prioridadRegla', 5
)
WHERE evaluacion_riesgo->>'decisionFinal' IS NULL
  AND evaluacion_riesgo IS NOT NULL;

-- Log de migración
DO $$
BEGIN
  RAISE NOTICE 'Migración 139: Campos DAFP de decisión agregados a proceso_auditable';
END $$;
