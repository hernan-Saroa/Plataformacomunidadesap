-- ============================================================================
-- MIGRACIÓN: Campos adicionales para actividad_plan_anual_5 y tabla de adjuntos
-- Fecha: 2026-02-16
-- Descripción: Agrega campos faltantes para completar funcionalidad del frontend
--              y crea tabla para gestión de archivos adjuntos
-- ============================================================================

-- ============================================================================
-- PARTE 1: AGREGAR COLUMNAS A actividad_plan_anual_5
-- ============================================================================

-- Campo: control (descripción del control aplicado)
ALTER TABLE control_interno.actividad_plan_anual_5 
ADD COLUMN IF NOT EXISTS control TEXT;

-- Campo: evaluacion (evaluación de la actividad)
ALTER TABLE control_interno.actividad_plan_anual_5 
ADD COLUMN IF NOT EXISTS evaluacion TEXT;

-- Campo: seguimiento (seguimiento de la actividad)
ALTER TABLE control_interno.actividad_plan_anual_5 
ADD COLUMN IF NOT EXISTS seguimiento TEXT;

-- Campo: requiere_verificacion_director (si necesita verificación del Director OCIG)
ALTER TABLE control_interno.actividad_plan_anual_5 
ADD COLUMN IF NOT EXISTS requiere_verificacion_director BOOLEAN DEFAULT false;

-- Campo: verificada_por_director (si fue verificada por el Director)
ALTER TABLE control_interno.actividad_plan_anual_5 
ADD COLUMN IF NOT EXISTS verificada_por_director BOOLEAN DEFAULT false;

-- Campo: fecha_verificacion (cuándo fue verificada)
ALTER TABLE control_interno.actividad_plan_anual_5 
ADD COLUMN IF NOT EXISTS fecha_verificacion TIMESTAMP;

-- Campo: observaciones_director (comentarios del Director al verificar)
ALTER TABLE control_interno.actividad_plan_anual_5 
ADD COLUMN IF NOT EXISTS observaciones_director TEXT;

-- Campo: configuracion_evidencias (configuración de requisitos de evidencias en JSONB)
-- Estructura esperada: { adjuntosRequeridos, observacionRequerida, minimoAdjuntos, tiposPermitidos, longitudMinima }
ALTER TABLE control_interno.actividad_plan_anual_5 
ADD COLUMN IF NOT EXISTS configuracion_evidencias JSONB;

-- ============================================================================
-- PARTE 2: CREAR TABLA DE ADJUNTOS PARA ACTIVIDADES
-- ============================================================================

CREATE TABLE IF NOT EXISTS control_interno.adjunto_actividad_plan_anual_5 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relación con la actividad
    actividad_id UUID NOT NULL REFERENCES control_interno.actividad_plan_anual_5(id) ON DELETE CASCADE,
    
    -- Información del archivo
    nombre VARCHAR(255) NOT NULL,
    tipo VARCHAR(100),                    -- MIME type (application/pdf, image/jpeg, etc)
    tamanio BIGINT,                       -- Tamaño en bytes
    
    -- Información de carga
    fecha_carga TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cargado_por VARCHAR(255),             -- Nombre del usuario que cargó
    cargado_por_id BIGINT,                -- ID del usuario (FK opcional a personas)
    
    -- Ubicación del archivo
    ruta_archivo VARCHAR(500),            -- Ruta en el servidor de archivos
    url VARCHAR(500),                     -- URL pública para acceder al archivo
    
    -- Metadatos adicionales
    hash_archivo VARCHAR(255),            -- Hash SHA256 para verificar integridad (opcional)
    
    -- Timestamps de auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_adjunto_actividad_plan_anual_5_actividad 
ON control_interno.adjunto_actividad_plan_anual_5(actividad_id);

CREATE INDEX IF NOT EXISTS idx_adjunto_actividad_plan_anual_5_fecha 
ON control_interno.adjunto_actividad_plan_anual_5(fecha_carga);

-- Comentarios de documentación
COMMENT ON TABLE control_interno.adjunto_actividad_plan_anual_5 IS 
'Archivos adjuntos (evidencias) para actividades del Plan Anual de Auditoría según Decreto 648/2017';

COMMENT ON COLUMN control_interno.adjunto_actividad_plan_anual_5.actividad_id IS 
'FK a la actividad del plan anual a la que pertenece este adjunto';

COMMENT ON COLUMN control_interno.adjunto_actividad_plan_anual_5.tipo IS 
'MIME type del archivo (ej: application/pdf, image/jpeg, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)';

COMMENT ON COLUMN control_interno.adjunto_actividad_plan_anual_5.tamanio IS 
'Tamaño del archivo en bytes';

COMMENT ON COLUMN control_interno.adjunto_actividad_plan_anual_5.ruta_archivo IS 
'Ruta física del archivo en el servidor o storage';

COMMENT ON COLUMN control_interno.adjunto_actividad_plan_anual_5.url IS 
'URL pública o firmada para acceder/descargar el archivo';

-- ============================================================================
-- PARTE 3: AGREGAR COMENTARIOS A COLUMNAS NUEVAS DE actividad_plan_anual_5
-- ============================================================================

COMMENT ON COLUMN control_interno.actividad_plan_anual_5.control IS 
'Descripción del control aplicado a la actividad';

COMMENT ON COLUMN control_interno.actividad_plan_anual_5.evaluacion IS 
'Evaluación del cumplimiento de la actividad';

COMMENT ON COLUMN control_interno.actividad_plan_anual_5.seguimiento IS 
'Registro de seguimiento de la actividad';

COMMENT ON COLUMN control_interno.actividad_plan_anual_5.requiere_verificacion_director IS 
'Indica si la actividad requiere verificación del Director OCIG antes de marcarse como completada';

COMMENT ON COLUMN control_interno.actividad_plan_anual_5.verificada_por_director IS 
'Indica si la actividad fue verificada y aprobada por el Director OCIG';

COMMENT ON COLUMN control_interno.actividad_plan_anual_5.fecha_verificacion IS 
'Fecha y hora en que el Director OCIG verificó la actividad';

COMMENT ON COLUMN control_interno.actividad_plan_anual_5.observaciones_director IS 
'Observaciones o comentarios del Director OCIG al verificar la actividad';

COMMENT ON COLUMN control_interno.actividad_plan_anual_5.configuracion_evidencias IS 
'Configuración JSON de requisitos de evidencias: adjuntosRequeridos, observacionRequerida, minimoAdjuntos, tiposPermitidos, longitudMinima';

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================
