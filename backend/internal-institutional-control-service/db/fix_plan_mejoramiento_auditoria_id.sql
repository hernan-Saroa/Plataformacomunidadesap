-- Script para corregir el tipo de auditoria_id en plan_mejoramiento
-- Cambiar de VARCHAR(255) a UUID para que coincida con la entidad TypeORM

-- Primero, eliminar la columna si existe con el tipo incorrecto
ALTER TABLE control_interno.plan_mejoramiento 
DROP CONSTRAINT IF EXISTS fk_plan_mejoramiento_auditoria;

-- Cambiar el tipo de auditoria_id de VARCHAR a UUID
-- Nota: Esto solo funcionará si todos los valores existentes son UUIDs válidos o NULL
ALTER TABLE control_interno.plan_mejoramiento 
ALTER COLUMN auditoria_id TYPE UUID USING auditoria_id::uuid;

-- Hacer la columna nullable para que coincida con la entidad
ALTER TABLE control_interno.plan_mejoramiento 
ALTER COLUMN auditoria_id DROP NOT NULL;

-- Agregar la foreign key si no existe
ALTER TABLE control_interno.plan_mejoramiento 
ADD CONSTRAINT fk_plan_mejoramiento_auditoria 
FOREIGN KEY (auditoria_id) 
REFERENCES control_interno.auditoria(id) 
ON DELETE SET NULL;

-- También hacer hallazgo_id nullable si no lo es
ALTER TABLE control_interno.plan_mejoramiento 
ALTER COLUMN hallazgo_id DROP NOT NULL;

-- Actualizar la foreign key de hallazgo para que use SET NULL
ALTER TABLE control_interno.plan_mejoramiento 
DROP CONSTRAINT IF EXISTS fk_plan_mejoramiento_hallazgo;

ALTER TABLE control_interno.plan_mejoramiento 
ADD CONSTRAINT fk_plan_mejoramiento_hallazgo 
FOREIGN KEY (hallazgo_id) 
REFERENCES control_interno.hallazgo(id) 
ON DELETE SET NULL;

