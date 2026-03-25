-- ============================================
-- MIGRACIÓN: Agregar 'Plan Anual' al estado_kanban
-- ============================================
-- Fecha: 2026-02-19
-- Descripción: Agrega el nuevo estado 'Plan Anual' al constraint del campo estado_kanban
-- ============================================

-- Paso 1: Eliminar el constraint antiguo
ALTER TABLE control_interno.auditoria 
DROP CONSTRAINT IF EXISTS auditoria_estado_kanban_check;

-- Paso 2: Crear el nuevo constraint con todos los valores permitidos
ALTER TABLE control_interno.auditoria 
ADD CONSTRAINT auditoria_estado_kanban_check 
CHECK (estado_kanban IN ('Plan Anual', 'Planeación', 'Ejecución', 'Comunicación', 'Seguimiento', 'Finalizada'));
