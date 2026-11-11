-- ============================================================================
-- MIGRACIÓN 032: EFDS-1737 / RF-INF-008 - Conformidad y Cierre Automático
-- Descripción:
--   1. Registra el estado oficial 'CERRADA_SIN_RESPUESTA' en el catálogo de estados.
--   2. Registra el parámetro institucional 'PARAM_CONFORMIDAD_CIERRE_AUTOMATICO'
--      con configuración editable (plazoValor, plazoUnidad, cierreAutomaticoActivo, estadoDestino).
-- Fecha: Noviembre 2026
-- ============================================================================

-- 1. Estado oficial de solicitud: CERRADA_SIN_RESPUESTA
INSERT INTO "infrastructure-management".catalogo_item (
    catalogo,
    codigo,
    nombre,
    descripcion,
    orden,
    is_activo,
    metadata
) VALUES (
    'ESTADO_SOLICITUD',
    'CERRADA_SIN_RESPUESTA',
    'Cerrada - Sin respuesta',
    'Cierre automático institucional tras expirar el plazo perentorio de conformidad sin confirmación del área solicitante (RF-INF-008).',
    16,
    true,
    '{"color": "bg-slate-100 text-slate-700 border-slate-300", "cierreAutomatico": true}'::jsonb
)
ON CONFLICT (catalogo, codigo) DO UPDATE
SET nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    metadata = EXCLUDED.metadata,
    is_activo = true;

-- 2. Parámetro institucional de conformidad y cierre automático
INSERT INTO "infrastructure-management".catalogo_item (
    catalogo,
    codigo,
    nombre,
    descripcion,
    orden,
    is_activo,
    metadata
) VALUES (
    'PARAMETRO_UMI',
    'PARAM_CONFORMIDAD_CIERRE_AUTOMATICO',
    'Configuración de Plazo y Cierre Automático de Conformidad (EFDS-1737 / RF-INF-008)',
    'Parámetros institucionales del plazo de confirmación del solicitante (días hábiles / horas / minutos para pruebas en vivo) y automatización del cierre tras vencimiento.',
    60,
    true,
    '{
        "plazoValor": 5,
        "plazoUnidad": "DIAS_HABILES",
        "cierreAutomaticoActivo": true,
        "estadoDestino": "CERRADA_SIN_RESPUESTA",
        "intervaloVerificacionSegundos": 60
    }'::jsonb
)
ON CONFLICT (catalogo, codigo) DO UPDATE
SET nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    metadata = EXCLUDED.metadata,
    is_activo = true;

