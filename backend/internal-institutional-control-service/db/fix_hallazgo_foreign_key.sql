-- Script para corregir la foreign key de hallazgo
-- La foreign key debe apuntar a auditoria, no a auditoria_programada

-- Eliminar la foreign key incorrecta
ALTER TABLE control_interno.hallazgo 
DROP CONSTRAINT IF EXISTS fk_hallazgo_auditoria;

-- Crear la foreign key correcta apuntando a auditoria
ALTER TABLE control_interno.hallazgo 
ADD CONSTRAINT fk_hallazgo_auditoria 
FOREIGN KEY (auditoria_id) 
REFERENCES control_interno.auditoria(id) 
ON DELETE SET NULL;

