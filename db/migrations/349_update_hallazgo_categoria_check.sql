-- MIGRACIÓN 345: Actualizar check constraint de la columna categoria de hallazgos
ALTER TABLE control_interno.hallazgo DROP CONSTRAINT IF EXISTS hallazgo_categoria_check;
ALTER TABLE control_interno.hallazgo ADD CONSTRAINT hallazgo_categoria_check CHECK (categoria IN ('leve', 'moderado', 'grave', 'critico', 'borrador', 'controversia'));
