-- ============================================
-- SEED: Datos iniciales para tipos_auditoria
-- ============================================
-- Este script inserta los tipos de auditoría iniciales
-- basados en los datos del frontend ConfiguracionAuditoriasModule.tsx
-- ============================================

-- Insertar tipos de auditoría iniciales
INSERT INTO control_interno.tipo_auditoria (
    codigo,
    nombre,
    descripcion,
    alcance,
    duracion_promedio,
    equipo_promedio,
    color,
    activa,
    auditorias_programadas,
    created_at,
    updated_at
) VALUES
(
    'AUD-REG',
    'Regular',
    'Auditoría de tipo regular',
    'Procesos administrativos, académicos y financieros',
    30,
    3,
    '#3B82F6',
    TRUE,
    8,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'AUD-TERR',
    'Territorial',
    'Auditoría a sedes territoriales',
    'Procesos de territoriales',
    45,
    4,
    '#10B981',
    TRUE,
    4,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'AUD-ESP',
    'Especial',
    'Auditoría de tipo especial',
    'Procesos específicos según requiera',
    20,
    2,
    '#F59E0B',
    TRUE,
    12,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (codigo) DO NOTHING;

-- Verificar que los tipos fueron creados correctamente
SELECT 
    id,
    codigo,
    nombre,
    descripcion,
    duracion_promedio,
    equipo_promedio,
    color,
    activa,
    auditorias_programadas,
    created_at
FROM control_interno.tipo_auditoria
WHERE deleted_at IS NULL
ORDER BY codigo;
