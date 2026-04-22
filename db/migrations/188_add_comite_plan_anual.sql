-- Migration: 188_add_comite_plan_anual
-- Agrega soporte estructural persistente para el comportamiento del comité PAI en la BD

ALTER TABLE control_interno.plan_anual_5_roles 
ADD COLUMN IF NOT EXISTS equipo_aprobacion JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS orden_aprobacion VARCHAR(20) DEFAULT 'secuencial';
