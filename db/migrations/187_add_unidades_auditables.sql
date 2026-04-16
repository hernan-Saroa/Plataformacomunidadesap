-- US-28: Unidades Auditables múltiples por proceso
-- 1. Agregar columna jsonb para las unidades auditables
ALTER TABLE control_interno.proceso_auditable ADD COLUMN IF NOT EXISTS unidades_auditables jsonb DEFAULT '[]'::jsonb;

-- 2. Migrar los datos existentes de 'macroproceso' (que actuaba como unidad auditable) al nuevo arreglo jsonb
UPDATE control_interno.proceso_auditable
SET unidades_auditables = jsonb_build_array(
    jsonb_build_object(
        'id', gen_random_uuid(),
        'nombre', macroproceso,
        'descripcion', ''
    )
)
WHERE macroproceso IS NOT NULL AND macroproceso != '' AND unidades_auditables = '[]'::jsonb;

-- 3. Permitir que macroproceso sea null (opcional, por si deciden dejar de enviarlo desde el frontend)
ALTER TABLE control_interno.proceso_auditable ALTER COLUMN macroproceso DROP NOT NULL;
