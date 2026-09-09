-- Asignar radicador a autos aprobados
ALTER TABLE internal_disciplinary_control.legal_autos
ADD COLUMN IF NOT EXISTS radicador_asignado_id UUID;

COMMENT ON COLUMN internal_disciplinary_control.legal_autos.radicador_asignado_id IS 'ID del usuario radicador asignado a este auto';

CREATE INDEX IF NOT EXISTS idx_legal_autos_radicador_asignado_id 
ON internal_disciplinary_control.legal_autos(radicador_asignado_id);
