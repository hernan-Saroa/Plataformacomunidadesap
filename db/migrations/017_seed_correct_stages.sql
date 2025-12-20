-- Migration 017: Correct Stage Configuration
-- Description: Wipe stage_configuration table and insert the correct 6 stages

-- 1. Limpiar tabla
TRUNCATE TABLE internal_disciplinary_control.stage_configuration;

-- 2. Quitar el valor por defecto (que depende del Enum)
ALTER TABLE internal_disciplinary_control.stage_configuration 
ALTER COLUMN "etapa" DROP DEFAULT;

-- 3. Convertir la columna a TEXTO
ALTER TABLE internal_disciplinary_control.stage_configuration 
ALTER COLUMN "etapa" TYPE VARCHAR(255);

-- 4. Borrar el Enum viejo (ahora sí se deja)
DROP TYPE IF EXISTS internal_disciplinary_control.stage_configuration_etapa_enum CASCADE;

-- 5. Insertar datos
INSERT INTO internal_disciplinary_control.stage_configuration ("etapa", "diasHabiles", "descripcion", "activo")
VALUES 
    ('RECEPCIÓN', 3, 'Recepción de la noticia', true),
    ('VALORACIÓN', 10, 'Valoración inicial', true),
    ('INDAGACIÓN', 40, 'Indagación previa', true),
    ('INVESTIGACIÓN', 60, 'Investigación disciplinaria', true),
    ('JUZGAMIENTO', 50, 'Etapa de juzgamiento', true),
    ('FALLO', 10, 'Emisión de fallo', true);

-- 5. Nota: Al reiniciar el backend con synchronize:true, él recreará el Enum si es necesario o dejará varchar.
-- Esta es la solución más robusta para evitar el error "invalid input value for enum".
