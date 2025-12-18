-- Script para agregar columnas faltantes a la tabla personas
-- Base de datos: esap_db
-- Fecha: 2025-12-11

-- Conectar a la base de datos correcta
\c esap_db

-- Agregar las columnas faltantes a la tabla personas
ALTER TABLE auth.personas 
ADD COLUMN IF NOT EXISTS id_seccional BIGINT,
ADD COLUMN IF NOT EXISTS id_sede BIGINT;

-- Agregar las foreign keys
ALTER TABLE auth.personas 
ADD CONSTRAINT fk_personas_seccional 
FOREIGN KEY (id_seccional) REFERENCES auth.seccionales (id_seccional);

ALTER TABLE auth.personas 
ADD CONSTRAINT fk_personas_sede 
FOREIGN KEY (id_sede) REFERENCES auth.sedes (id_sede);

-- Crear índices para mejor performance
CREATE INDEX IF NOT EXISTS idx_personas_seccional ON auth.personas(id_seccional);
CREATE INDEX IF NOT EXISTS idx_personas_sede ON auth.personas(id_sede);

-- Verificar que las columnas se crearon correctamente
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'auth' 
  AND table_name = 'personas' 
  AND column_name IN ('id_seccional', 'id_sede');
