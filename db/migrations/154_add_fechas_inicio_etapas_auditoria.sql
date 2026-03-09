-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN: Agregar fechas de inicio para Ejecución y Comunicación
-- ═══════════════════════════════════════════════════════════════════════════
-- Cronograma de 3 Etapas:
--   • Etapa 1: Planeación     (fecha_inicio → fecha_fin_planeacion)
--   • Etapa 2: Ejecución      (fecha_inicio_ejecucion → fecha_fin_ejecucion)
--   • Etapa 3: Comunicación   (fecha_inicio_comunicacion → fecha_fin)
-- ═══════════════════════════════════════════════════════════════════════════

-- Agregar columna fecha_inicio_ejecucion (Inicio de Etapa 2: Ejecución)
ALTER TABLE control_interno.auditoria
ADD COLUMN IF NOT EXISTS fecha_inicio_ejecucion DATE NULL;

-- Agregar columna fecha_inicio_comunicacion (Inicio de Etapa 3: Comunicación)
ALTER TABLE control_interno.auditoria
ADD COLUMN IF NOT EXISTS fecha_inicio_comunicacion DATE NULL;

-- Comentarios descriptivos
COMMENT ON COLUMN control_interno.auditoria.fecha_inicio IS 'Inicio de Etapa 1: Planeación (= fechaInicioPlaneacion)';
COMMENT ON COLUMN control_interno.auditoria.fecha_fin_planeacion IS 'Fin de Etapa 1: Planeación';
COMMENT ON COLUMN control_interno.auditoria.fecha_inicio_ejecucion IS 'Inicio de Etapa 2: Ejecución';
COMMENT ON COLUMN control_interno.auditoria.fecha_fin_ejecucion IS 'Fin de Etapa 2: Ejecución';
COMMENT ON COLUMN control_interno.auditoria.fecha_inicio_comunicacion IS 'Inicio de Etapa 3: Comunicación';
COMMENT ON COLUMN control_interno.auditoria.fecha_fin IS 'Fin de Etapa 3: Comunicación (= fechaFinComunicacion, fin de la auditoría)';

-- Índice para mejorar consultas por rango de fechas
CREATE INDEX IF NOT EXISTS idx_auditoria_fechas_etapas ON control_interno.auditoria (
  fecha_inicio, 
  fecha_fin_planeacion, 
  fecha_inicio_ejecucion, 
  fecha_fin_ejecucion, 
  fecha_inicio_comunicacion, 
  fecha_fin
);
