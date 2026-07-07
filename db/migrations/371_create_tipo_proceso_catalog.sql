-- Migration 371: Catalogo relacional de tipos de proceso auditable
-- Schema: control_interno

CREATE TABLE IF NOT EXISTS control_interno.tipo_proceso (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(80) NOT NULL UNIQUE,
    nombre VARCHAR(120) NOT NULL,
    color VARCHAR(120) NOT NULL DEFAULT 'bg-gray-100 text-gray-700',
    orden INTEGER NOT NULL DEFAULT 0,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tipo_proceso_activo ON control_interno.tipo_proceso(activo);
CREATE INDEX IF NOT EXISTS idx_tipo_proceso_orden ON control_interno.tipo_proceso(orden);

INSERT INTO control_interno.tipo_proceso (codigo, nombre, color, orden, activo)
VALUES
    ('estrategico', 'Estratégico', 'bg-purple-100 text-purple-700', 1, true),
    ('misional', 'Misional', 'bg-blue-100 text-blue-700', 2, true),
    ('apoyo', 'Apoyo', 'bg-green-100 text-green-700', 3, true),
    ('transversal', 'Transversal', 'bg-emerald-100 text-emerald-700', 4, true),
    ('evaluacion', 'Evaluación', 'bg-orange-100 text-orange-700', 5, true),
    ('territorial', 'Territorial', 'bg-teal-100 text-teal-700', 6, true)
ON CONFLICT (codigo) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    color = EXCLUDED.color,
    orden = EXCLUDED.orden,
    activo = true,
    updated_at = CURRENT_TIMESTAMP;

WITH tipos_existentes AS (
    SELECT DISTINCT
        lower(
            regexp_replace(
                translate(trim(tipo), 'ÁÀÄÂáàäâÉÈËÊéèëêÍÌÏÎíìïîÓÒÖÔóòöôÚÙÜÛúùüûÑñ', 'AAAAaaaaEEEEeeeeIIIIiiiiOOOOooooUUUUuuuuNn'),
                '[^a-zA-Z0-9]+',
                '_',
                'g'
            )
        ) AS codigo,
        trim(tipo) AS nombre
    FROM control_interno.proceso_auditable
    WHERE tipo IS NOT NULL AND trim(tipo) <> ''
)
INSERT INTO control_interno.tipo_proceso (codigo, nombre, color, orden, activo)
SELECT
    codigo,
    nombre,
    'bg-gray-100 text-gray-700',
    100 + row_number() OVER (ORDER BY nombre),
    true
FROM tipos_existentes
WHERE codigo <> ''
ON CONFLICT (codigo) DO NOTHING;

ALTER TABLE control_interno.proceso_auditable
ADD COLUMN IF NOT EXISTS tipo_proceso_id UUID;

ALTER TABLE control_interno.proceso_auditable
DROP CONSTRAINT IF EXISTS proceso_auditable_tipo_check;

UPDATE control_interno.proceso_auditable proceso
SET tipo_proceso_id = tipo_proceso.id,
    tipo = tipo_proceso.codigo
FROM control_interno.tipo_proceso tipo_proceso
WHERE proceso.tipo IS NOT NULL
  AND lower(
        regexp_replace(
            translate(trim(proceso.tipo), 'ÁÀÄÂáàäâÉÈËÊéèëêÍÌÏÎíìïîÓÒÖÔóòöôÚÙÜÛúùüûÑñ', 'AAAAaaaaEEEEeeeeIIIIiiiiOOOOooooUUUUuuuuNn'),
            '[^a-zA-Z0-9]+',
            '_',
            'g'
        )
      ) = tipo_proceso.codigo
  AND proceso.tipo_proceso_id IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_schema = 'control_interno'
          AND table_name = 'proceso_auditable'
          AND constraint_name = 'fk_proceso_auditable_tipo_proceso'
    ) THEN
        ALTER TABLE control_interno.proceso_auditable
        ADD CONSTRAINT fk_proceso_auditable_tipo_proceso
        FOREIGN KEY (tipo_proceso_id)
        REFERENCES control_interno.tipo_proceso(id)
        ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_proceso_auditable_tipo_proceso_id
ON control_interno.proceso_auditable(tipo_proceso_id);

COMMENT ON TABLE control_interno.tipo_proceso IS 'Catálogo parametrizable de tipos de procesos auditables';
COMMENT ON COLUMN control_interno.tipo_proceso.codigo IS 'Código estable usado por frontend y procesos existentes';
COMMENT ON COLUMN control_interno.tipo_proceso.nombre IS 'Nombre visible del tipo de proceso';
COMMENT ON COLUMN control_interno.tipo_proceso.color IS 'Clases CSS del distintivo visual en frontend';
COMMENT ON COLUMN control_interno.proceso_auditable.tipo_proceso_id IS 'Relación al catálogo control_interno.tipo_proceso';
