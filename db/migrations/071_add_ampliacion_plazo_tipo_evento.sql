-- ============================================
-- MIGRACIÓN 071: AGREGAR TIPO EVENTO AMPLIACION_PLAZO
-- ============================================
-- Descripción: Agrega el tipo de evento 'ampliacion_plazo' al CHECK constraint
--              de historial_auditoria para soportar solicitudes de ampliación
-- Fecha: 2025-01-XX
-- Orden: 71/XX

SET search_path TO control_interno, public;

-- Primero, eliminar el constraint existente
ALTER TABLE control_interno.historial_auditoria 
DROP CONSTRAINT IF EXISTS historial_auditoria_tipo_evento_check;

-- Agregar el nuevo constraint con todos los tipos de evento incluido ampliacion_plazo
ALTER TABLE control_interno.historial_auditoria 
ADD CONSTRAINT historial_auditoria_tipo_evento_check 
CHECK (tipo_evento IN (
    'creacion', 
    'cambio_estado', 
    'asignacion', 
    'actualizacion', 
    'documento', 
    'hallazgo', 
    'nota', 
    'aprobacion', 
    'finalizacion',
    'eliminacion',
    'archivo',
    'ampliacion_plazo'
));

-- Comentarios
COMMENT ON CONSTRAINT historial_auditoria_tipo_evento_check ON control_interno.historial_auditoria 
IS 'Valida que tipo_evento sea uno de los tipos permitidos, incluyendo ampliacion_plazo para solicitudes de ampliación de plazo';

