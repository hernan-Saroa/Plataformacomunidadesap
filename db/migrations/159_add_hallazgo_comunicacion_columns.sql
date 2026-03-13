-- ============================================================================
-- MIGRACIÓN 159: Columnas para flujo de Comunicación (Controversias y Decisión del Auditor)
-- Fecha: 2026-03-11
-- Descripción: Agrega columnas a control_interno.hallazgo para gestionar
--              aceptación, controversias (argumentos + documento) y decisión
--              del auditor (ratificado/modificado/retirado).
-- ============================================================================

BEGIN;

-- Agregar columnas de controversia y decisión del auditor
ALTER TABLE control_interno.hallazgo
  ADD COLUMN IF NOT EXISTS argumentos_controversia TEXT,
  ADD COLUMN IF NOT EXISTS documento_controversia_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS documento_controversia_nombre VARCHAR(255),
  ADD COLUMN IF NOT EXISTS decision_auditor VARCHAR(50),
  ADD COLUMN IF NOT EXISTS fundamentacion_tecnica TEXT,
  ADD COLUMN IF NOT EXISTS fecha_decision TIMESTAMP,
  ADD COLUMN IF NOT EXISTS auditor_decision_id BIGINT;

-- Comentarios para documentación
COMMENT ON COLUMN control_interno.hallazgo.argumentos_controversia IS 'Argumentos técnicos y normativa del área auditada al presentar controversia';
COMMENT ON COLUMN control_interno.hallazgo.documento_controversia_url IS 'URL o ID del documento adjunto de controversia (PDF, DOCX, JPG)';
COMMENT ON COLUMN control_interno.hallazgo.documento_controversia_nombre IS 'Nombre original del archivo adjunto de controversia';
COMMENT ON COLUMN control_interno.hallazgo.decision_auditor IS 'Decisión del auditor: ratificado, modificado, retirado';
COMMENT ON COLUMN control_interno.hallazgo.fundamentacion_tecnica IS 'Fundamentación técnica de la decisión del auditor (trazabilidad permanente)';
COMMENT ON COLUMN control_interno.hallazgo.fecha_decision IS 'Fecha en que el auditor tomó la decisión sobre la controversia';
COMMENT ON COLUMN control_interno.hallazgo.auditor_decision_id IS 'ID del auditor que tomó la decisión sobre la controversia';

COMMIT;
