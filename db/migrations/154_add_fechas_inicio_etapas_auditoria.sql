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

-- ═══════════════════════════════════════════════════════════════════════════
-- Corregir nombres de roles en rol_decreto_648_template (Decreto 648/2017)
-- ═══════════════════════════════════════════════════════════════════════════
-- Alinear roles 3, 4, 5 con rolesDecreto648Oficial.ts
-- Rol 3: → Evaluación de la gestión del riesgo
-- Rol 4: → Evaluación y seguimiento
-- Rol 5: → Relación con entes externos de control
-- ═══════════════════════════════════════════════════════════════════════════

UPDATE control_interno.rol_decreto_648_template
SET nombre = 'Evaluación de la gestión del riesgo',
    descripcion = 'Revisar política de riesgos, promover gestión del riesgo, articular líneas de defensa',
    color = '#FF6D00', updated_at = NOW()
WHERE rol_numero = 3;

UPDATE control_interno.rol_decreto_648_template
SET nombre = 'Evaluación y seguimiento',
    descripcion = 'Efectuar auditorías internas, seguimiento a planes de mejoramiento, informes de ley',
    color = '#AA00FF', updated_at = NOW()
WHERE rol_numero = 4;

UPDATE control_interno.rol_decreto_648_template
SET nombre = 'Relación con entes externos de control',
    descripcion = 'Brindar asesoría a procesos y alertar sobre información requerida por organismos de control',
    color = '#C62828', updated_at = NOW()
WHERE rol_numero = 5;

-- Actualizar roles existentes en planes anuales
UPDATE control_interno.rol_plan_anual_5
SET nombre = 'Evaluación de la gestión del riesgo',
    descripcion = 'Revisar política de riesgos, promover gestión del riesgo, articular líneas de defensa',
    color = '#FF6D00', updated_at = NOW()
WHERE rol_numero = 3;

UPDATE control_interno.rol_plan_anual_5
SET nombre = 'Evaluación y seguimiento',
    descripcion = 'Efectuar auditorías internas, seguimiento a planes de mejoramiento, informes de ley',
    color = '#AA00FF', updated_at = NOW()
WHERE rol_numero = 4;

UPDATE control_interno.rol_plan_anual_5
SET nombre = 'Relación con entes externos de control',
    descripcion = 'Brindar asesoría a procesos y alertar sobre información requerida por organismos de control',
    color = '#C62828', updated_at = NOW()
WHERE rol_numero = 5;
