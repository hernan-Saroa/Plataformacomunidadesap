-- ============================================
-- MIGRACIÓN 080: Sistema de Plantillas y Workflow para Informes de Ley
-- Fecha: 2025-01-XX
-- Descripción: Crea tablas para plantillas, workflow de aprobación y datos automáticos
-- ============================================

-- ============================================
-- Tabla: plantilla_informe_ley
-- Almacena las plantillas de generación de informes
-- ============================================
CREATE TABLE IF NOT EXISTS control_interno.plantilla_informe_ley (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(255) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    tipo_formato VARCHAR(50) NOT NULL CHECK (tipo_formato IN ('PDF', 'Word', 'Excel', 'HTML')),
    ruta_plantilla VARCHAR(500) NOT NULL,
    variables_disponibles JSONB DEFAULT '[]'::jsonb,
    estructura_datos JSONB DEFAULT '{}'::jsonb,
    activa BOOLEAN DEFAULT TRUE,
    version VARCHAR(50) DEFAULT '1.0',
    creado_por VARCHAR(255),
    actualizado_por VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_plantilla_codigo ON control_interno.plantilla_informe_ley(codigo);
CREATE INDEX IF NOT EXISTS idx_plantilla_activa ON control_interno.plantilla_informe_ley(activa);

COMMENT ON TABLE control_interno.plantilla_informe_ley IS 'Plantillas para generación automática de informes de ley';
COMMENT ON COLUMN control_interno.plantilla_informe_ley.variables_disponibles IS 'Array de variables disponibles en la plantilla: ["nombreInforme", "periodo", "datosAutomaticos", etc.]';
COMMENT ON COLUMN control_interno.plantilla_informe_ley.estructura_datos IS 'Estructura esperada de datos para poblar la plantilla';

-- ============================================
-- Tabla: workflow_aprobacion_informe
-- Gestiona el flujo de aprobación de informes
-- ============================================
CREATE TABLE IF NOT EXISTS control_interno.workflow_aprobacion_informe (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entrega_id UUID NOT NULL,
    paso_actual INTEGER DEFAULT 1,
    estado_workflow VARCHAR(50) DEFAULT 'en-elaboracion' CHECK (estado_workflow IN (
        'en-elaboracion', 'en-revision', 'en-aprobacion', 'aprobado', 'rechazado', 'completado'
    )),
    completado BOOLEAN DEFAULT FALSE,
    fecha_completado TIMESTAMP,
    creado_por VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_workflow_entrega FOREIGN KEY (entrega_id) 
        REFERENCES control_interno.entrega_informe_ley(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_workflow_entrega ON control_interno.workflow_aprobacion_informe(entrega_id);
CREATE INDEX IF NOT EXISTS idx_workflow_estado ON control_interno.workflow_aprobacion_informe(estado_workflow);

-- ============================================
-- Tabla: paso_workflow_informe
-- Pasos individuales del workflow
-- ============================================
CREATE TABLE IF NOT EXISTS control_interno.paso_workflow_informe (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL,
    numero_paso INTEGER NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    nombre_display VARCHAR(255) NOT NULL,
    descripcion TEXT,
    responsable VARCHAR(255),
    rol_responsable VARCHAR(255),
    estado VARCHAR(50) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en-proceso', 'completado', 'rechazado')),
    fecha_inicio TIMESTAMP,
    fecha_fin TIMESTAMP,
    observaciones TEXT,
    accion VARCHAR(50) CHECK (accion IN ('elaborar', 'revisar', 'aprobar', 'publicar')),
    es_obligatorio BOOLEAN DEFAULT TRUE,
    orden INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_paso_workflow FOREIGN KEY (workflow_id) 
        REFERENCES control_interno.workflow_aprobacion_informe(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_paso_workflow ON control_interno.paso_workflow_informe(workflow_id);
CREATE INDEX IF NOT EXISTS idx_paso_numero ON control_interno.paso_workflow_informe(workflow_id, numero_paso);

-- ============================================
-- Tabla: datos_automaticos_informe
-- Almacena los datos automáticos generados para cada entrega
-- ============================================
CREATE TABLE IF NOT EXISTS control_interno.datos_automaticos_informe (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entrega_id UUID NOT NULL,
    tipo_dato VARCHAR(100) NOT NULL, -- 'auditorias', 'planes_mejoramiento', 'indicadores', etc.
    datos JSONB NOT NULL DEFAULT '{}'::jsonb,
    fecha_generacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fuente_datos VARCHAR(255), -- 'sistema', 'api_externa', 'manual'
    version_datos VARCHAR(50) DEFAULT '1.0',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_datos_entrega FOREIGN KEY (entrega_id) 
        REFERENCES control_interno.entrega_informe_ley(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_datos_entrega ON control_interno.datos_automaticos_informe(entrega_id);
CREATE INDEX IF NOT EXISTS idx_datos_tipo ON control_interno.datos_automaticos_informe(tipo_dato);

COMMENT ON TABLE control_interno.datos_automaticos_informe IS 'Datos automáticos poblados desde el sistema para cada informe generado';
COMMENT ON COLUMN control_interno.datos_automaticos_informe.datos IS 'JSON con los datos estructurados según el tipo de dato';

-- ============================================
-- Tabla: historial_generacion_informe
-- Registra cada generación de informe (auditoría)
-- ============================================
CREATE TABLE IF NOT EXISTS control_interno.historial_generacion_informe (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entrega_id UUID NOT NULL,
    accion VARCHAR(100) NOT NULL, -- 'generado', 'actualizado', 'enviado_aprobacion', 'aprobado', 'rechazado'
    usuario_id VARCHAR(255),
    usuario_nombre VARCHAR(255),
    observaciones TEXT,
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    ip_origen VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_historial_entrega FOREIGN KEY (entrega_id) 
        REFERENCES control_interno.entrega_informe_ley(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_historial_entrega ON control_interno.historial_generacion_informe(entrega_id);
CREATE INDEX IF NOT EXISTS idx_historial_accion ON control_interno.historial_generacion_informe(accion);
CREATE INDEX IF NOT EXISTS idx_historial_fecha ON control_interno.historial_generacion_informe(created_at);

COMMENT ON TABLE control_interno.historial_generacion_informe IS 'Auditoría completa de todas las acciones sobre informes de ley';

-- ============================================
-- Actualizar tabla entrega_informe_ley
-- Agregar campos necesarios para workflow y generación automática
-- ============================================
ALTER TABLE control_interno.entrega_informe_ley
    ADD COLUMN IF NOT EXISTS estado_workflow VARCHAR(50) DEFAULT 'borrador' CHECK (estado_workflow IN (
        'borrador', 'en-revision', 'en-aprobacion', 'aprobado', 'rechazado', 'enviado'
    )),
    ADD COLUMN IF NOT EXISTS datos_automaticos_poblados BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS fecha_generacion TIMESTAMP,
    ADD COLUMN IF NOT EXISTS generado_por VARCHAR(255),
    ADD COLUMN IF NOT EXISTS formato_archivo VARCHAR(50) CHECK (formato_archivo IN ('PDF', 'Word', 'Excel')),
    ADD COLUMN IF NOT EXISTS plantilla_usada VARCHAR(255),
    ADD COLUMN IF NOT EXISTS version_plantilla VARCHAR(50),
    ADD COLUMN IF NOT EXISTS metadata_generacion JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_entrega_workflow ON control_interno.entrega_informe_ley(estado_workflow);
CREATE INDEX IF NOT EXISTS idx_entrega_generacion ON control_interno.entrega_informe_ley(fecha_generacion);

COMMENT ON COLUMN control_interno.entrega_informe_ley.estado_workflow IS 'Estado en el workflow de aprobación';
COMMENT ON COLUMN control_interno.entrega_informe_ley.datos_automaticos_poblados IS 'Indica si los datos automáticos fueron poblados';
COMMENT ON COLUMN control_interno.entrega_informe_ley.metadata_generacion IS 'Metadatos de la generación: tiempo, tamaño, variables usadas, etc.';

-- ============================================
-- Insertar plantillas base
-- ============================================
INSERT INTO control_interno.plantilla_informe_ley (codigo, nombre, descripcion, tipo_formato, ruta_plantilla, variables_disponibles, estructura_datos, activa, version)
VALUES
    (
        'plantilla-pormenorizado-dafp',
        'Plantilla Informe Pormenorizado DAFP',
        'Plantilla oficial para el Informe Pormenorizado del Estado del Control Interno según formato DAFP',
        'PDF',
        'templates/informes-ley/plantilla-pormenorizado-dafp.hbs',
        '["nombreInforme", "periodo", "fechaGeneracion", "datosAutomaticos", "analisis", "responsable", "firmas"]'::jsonb,
        '{"datosAutomaticos": [{"nombre": "string", "valor": "any"}]}'::jsonb,
        TRUE,
        '1.0'
    ),
    (
        'plantilla-anual-oci',
        'Plantilla Informe Anual OCI',
        'Plantilla para el Informe Anual de Gestión de la Oficina de Control Interno',
        'PDF',
        'templates/informes-ley/plantilla-anual-oci.hbs',
        '["nombreInforme", "periodo", "fechaGeneracion", "resumenEjecutivo", "actividades", "resultados", "responsable"]'::jsonb,
        '{"resumenEjecutivo": {"totalAuditorias": "number", "completadas": "number"}, "actividades": []}'::jsonb,
        TRUE,
        '1.0'
    ),
    (
        'plantilla-fur-dafp',
        'Plantilla Informe FUR DAFP',
        'Plantilla para Informe de Funcionamiento del Sistema de Gestión Institucional (FUR)',
        'Excel',
        'templates/informes-ley/plantilla-fur-dafp.xlsx',
        '["periodo", "datosFUR", "indicadores"]'::jsonb,
        '{"datosFUR": {}}'::jsonb,
        TRUE,
        '1.0'
    ),
    (
        'plantilla-austeridad',
        'Plantilla Informe Austeridad del Gasto',
        'Plantilla para Informe Trimestral de Austeridad del Gasto Público',
        'Excel',
        'templates/informes-ley/plantilla-austeridad.xlsx',
        '["periodo", "trimestre", "datosFinancieros", "medidasAusteridad"]'::jsonb,
        '{"datosFinancieros": {}, "medidasAusteridad": []}'::jsonb,
        TRUE,
        '1.0'
    )
ON CONFLICT (codigo) DO NOTHING;

-- ============================================
-- Comentarios finales
-- ============================================
COMMENT ON TABLE control_interno.workflow_aprobacion_informe IS 'Workflow de aprobación para informes de ley (US-033)';
COMMENT ON TABLE control_interno.paso_workflow_informe IS 'Pasos individuales del workflow de aprobación';
COMMENT ON TABLE control_interno.datos_automaticos_informe IS 'Datos automáticos poblados desde el sistema (US-022)';
COMMENT ON TABLE control_interno.historial_generacion_informe IS 'Auditoría completa de generación y aprobación de informes';
