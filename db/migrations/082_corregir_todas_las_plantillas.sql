-- ============================================
-- MIGRACIÓN 082: Corregir TODAS las Plantillas de Informes
-- Fecha: 2026-01-14
-- Descripción: Hace opcionales todas las variables de todas las plantillas para permitir generación automática
--              excepto las básicas (nombreInforme, periodo, fechaGeneracion, responsable)
-- ============================================

-- ============================================
-- PLANTILLA: plantilla-pormenorizado-dafp
-- ============================================
UPDATE control_interno.plantilla_informe_ley
SET 
    variables_disponibles = '["nombreInforme", "periodo", "fechaGeneracion", "datosAutomaticos", "analisis", "responsable", "baseNormativa", "conclusiones"]'::jsonb,
    estructura_datos = '{
        "datosAutomaticos": {
            "tipo": "array",
            "requerido": true,
            "items": {
                "nombre": "string",
                "valor": "any",
                "tipo": "string",
                "descripcion": "string"
            }
        },
        "analisis": {
            "tipo": "string",
            "requerido": false
        },
        "conclusiones": {
            "tipo": "string",
            "requerido": false
        },
        "nombreInforme": {
            "tipo": "string",
            "requerido": true
        },
        "periodo": {
            "tipo": "string",
            "requerido": true
        },
        "fechaGeneracion": {
            "tipo": "string",
            "requerido": true
        },
        "responsable": {
            "tipo": "string",
            "requerido": true
        },
        "baseNormativa": {
            "tipo": "string",
            "requerido": false
        }
    }'::jsonb,
    updated_at = CURRENT_TIMESTAMP
WHERE codigo = 'plantilla-pormenorizado-dafp';

-- Verificar que se actualizó correctamente
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM control_interno.plantilla_informe_ley 
        WHERE codigo = 'plantilla-pormenorizado-dafp' 
        AND variables_disponibles::text LIKE '%nombreInforme%'
        AND variables_disponibles::text NOT LIKE '%firmas%'
    ) THEN
        RAISE EXCEPTION 'Error al actualizar la plantilla pormenorizado-dafp';
    END IF;
END $$;

-- ============================================
-- PLANTILLA: plantilla-anual-oci
-- ============================================
UPDATE control_interno.plantilla_informe_ley
SET 
    variables_disponibles = '["nombreInforme", "periodo", "fechaGeneracion", "responsable", "resumenEjecutivo", "actividades", "resultados", "baseNormativa"]'::jsonb,
    estructura_datos = '{
        "resumenEjecutivo": {
            "tipo": "object",
            "requerido": false
        },
        "actividades": {
            "tipo": "array",
            "requerido": false
        },
        "resultados": {
            "tipo": "object",
            "requerido": false
        },
        "nombreInforme": {
            "tipo": "string",
            "requerido": true
        },
        "periodo": {
            "tipo": "string",
            "requerido": true
        },
        "fechaGeneracion": {
            "tipo": "string",
            "requerido": true
        },
        "responsable": {
            "tipo": "string",
            "requerido": true
        },
        "baseNormativa": {
            "tipo": "string",
            "requerido": false
        }
    }'::jsonb,
    updated_at = CURRENT_TIMESTAMP
WHERE codigo = 'plantilla-anual-oci';

-- ============================================
-- PLANTILLA: plantilla-fur-dafp
-- ============================================
-- Cambiar de Excel a PDF y actualizar ruta de plantilla
UPDATE control_interno.plantilla_informe_ley
SET 
    tipo_formato = 'PDF',
    ruta_plantilla = 'templates/informes-ley/plantilla-fur-dafp.hbs',
    variables_disponibles = '["nombreInforme", "periodo", "fechaGeneracion", "responsable", "datosFUR", "indicadores", "baseNormativa"]'::jsonb,
    estructura_datos = '{
        "datosFUR": {
            "tipo": "object",
            "requerido": false
        },
        "indicadores": {
            "tipo": "object",
            "requerido": false
        },
        "nombreInforme": {
            "tipo": "string",
            "requerido": true
        },
        "periodo": {
            "tipo": "string",
            "requerido": true
        },
        "fechaGeneracion": {
            "tipo": "string",
            "requerido": true
        },
        "responsable": {
            "tipo": "string",
            "requerido": true
        },
        "baseNormativa": {
            "tipo": "string",
            "requerido": false
        }
    }'::jsonb,
    updated_at = CURRENT_TIMESTAMP
WHERE codigo = 'plantilla-fur-dafp';

-- ============================================
-- PLANTILLA: plantilla-meci
-- ============================================
UPDATE control_interno.plantilla_informe_ley
SET 
    variables_disponibles = '["nombreInforme", "periodo", "fechaGeneracion", "responsable", "evaluacionMECI", "componentes", "resultados", "recomendaciones", "baseNormativa"]'::jsonb,
    estructura_datos = '{
        "evaluacionMECI": {
            "tipo": "object",
            "requerido": false
        },
        "componentes": {
            "tipo": "array",
            "requerido": false
        },
        "resultados": {
            "tipo": "object",
            "requerido": false
        },
        "recomendaciones": {
            "tipo": "array",
            "requerido": false
        },
        "nombreInforme": {
            "tipo": "string",
            "requerido": true
        },
        "periodo": {
            "tipo": "string",
            "requerido": true
        },
        "fechaGeneracion": {
            "tipo": "string",
            "requerido": true
        },
        "responsable": {
            "tipo": "string",
            "requerido": true
        },
        "baseNormativa": {
            "tipo": "string",
            "requerido": false
        }
    }'::jsonb,
    updated_at = CURRENT_TIMESTAMP
WHERE codigo = 'plantilla-meci';

-- ============================================
-- PLANTILLA: plantilla-revision-direccion-sgc
-- ============================================
UPDATE control_interno.plantilla_informe_ley
SET 
    variables_disponibles = '["nombreInforme", "periodo", "fechaGeneracion", "responsable", "entradas", "salidas", "acciones", "decisiones", "baseNormativa"]'::jsonb,
    estructura_datos = '{
        "entradas": {
            "tipo": "array",
            "requerido": false
        },
        "salidas": {
            "tipo": "array",
            "requerido": false
        },
        "acciones": {
            "tipo": "array",
            "requerido": false
        },
        "decisiones": {
            "tipo": "array",
            "requerido": false
        },
        "nombreInforme": {
            "tipo": "string",
            "requerido": true
        },
        "periodo": {
            "tipo": "string",
            "requerido": true
        },
        "fechaGeneracion": {
            "tipo": "string",
            "requerido": true
        },
        "responsable": {
            "tipo": "string",
            "requerido": true
        },
        "baseNormativa": {
            "tipo": "string",
            "requerido": false
        }
    }'::jsonb,
    updated_at = CURRENT_TIMESTAMP
WHERE codigo = 'plantilla-revision-direccion-sgc';

-- ============================================
-- PLANTILLA: plantilla-anticorrupcion
-- ============================================
UPDATE control_interno.plantilla_informe_ley
SET 
    variables_disponibles = '["nombreInforme", "periodo", "fechaGeneracion", "responsable", "mapaRiesgos", "accionesPrevencion", "pqrs", "resultados", "baseNormativa"]'::jsonb,
    estructura_datos = '{
        "mapaRiesgos": {
            "tipo": "array",
            "requerido": false
        },
        "accionesPrevencion": {
            "tipo": "array",
            "requerido": false
        },
        "pqrs": {
            "tipo": "object",
            "requerido": false
        },
        "resultados": {
            "tipo": "object",
            "requerido": false
        },
        "nombreInforme": {
            "tipo": "string",
            "requerido": true
        },
        "periodo": {
            "tipo": "string",
            "requerido": true
        },
        "fechaGeneracion": {
            "tipo": "string",
            "requerido": true
        },
        "responsable": {
            "tipo": "string",
            "requerido": true
        },
        "baseNormativa": {
            "tipo": "string",
            "requerido": false
        }
    }'::jsonb,
    updated_at = CURRENT_TIMESTAMP
WHERE codigo = 'plantilla-anticorrupcion';

-- ============================================
-- PLANTILLA: plantilla-seguimiento-sgc
-- ============================================
UPDATE control_interno.plantilla_informe_ley
SET 
    variables_disponibles = '["nombreInforme", "periodo", "fechaGeneracion", "responsable", "trimestre", "indicadores", "noConformidades", "accionesCorrectivas", "resultados", "baseNormativa"]'::jsonb,
    estructura_datos = '{
        "trimestre": {
            "tipo": "string",
            "requerido": false
        },
        "indicadores": {
            "tipo": "array",
            "requerido": false
        },
        "noConformidades": {
            "tipo": "array",
            "requerido": false
        },
        "accionesCorrectivas": {
            "tipo": "array",
            "requerido": false
        },
        "resultados": {
            "tipo": "object",
            "requerido": false
        },
        "nombreInforme": {
            "tipo": "string",
            "requerido": true
        },
        "periodo": {
            "tipo": "string",
            "requerido": true
        },
        "fechaGeneracion": {
            "tipo": "string",
            "requerido": true
        },
        "responsable": {
            "tipo": "string",
            "requerido": true
        },
        "baseNormativa": {
            "tipo": "string",
            "requerido": false
        }
    }'::jsonb,
    updated_at = CURRENT_TIMESTAMP
WHERE codigo = 'plantilla-seguimiento-sgc';

-- ============================================
-- PLANTILLA: plantilla-seguimiento-planes
-- ============================================
UPDATE control_interno.plantilla_informe_ley
SET 
    variables_disponibles = '["nombreInforme", "periodo", "fechaGeneracion", "responsable", "trimestre", "planes", "avance", "hallazgos", "evidencias", "baseNormativa"]'::jsonb,
    estructura_datos = '{
        "trimestre": {
            "tipo": "string",
            "requerido": false
        },
        "planes": {
            "tipo": "array",
            "requerido": false
        },
        "avance": {
            "tipo": "object",
            "requerido": false
        },
        "hallazgos": {
            "tipo": "array",
            "requerido": false
        },
        "evidencias": {
            "tipo": "array",
            "requerido": false
        },
        "nombreInforme": {
            "tipo": "string",
            "requerido": true
        },
        "periodo": {
            "tipo": "string",
            "requerido": true
        },
        "fechaGeneracion": {
            "tipo": "string",
            "requerido": true
        },
        "responsable": {
            "tipo": "string",
            "requerido": true
        },
        "baseNormativa": {
            "tipo": "string",
            "requerido": false
        }
    }'::jsonb,
    updated_at = CURRENT_TIMESTAMP
WHERE codigo = 'plantilla-seguimiento-planes';

-- ============================================
-- PLANTILLA: plantilla-indicadores-oci
-- ============================================
UPDATE control_interno.plantilla_informe_ley
SET 
    variables_disponibles = '["nombreInforme", "periodo", "fechaGeneracion", "responsable", "trimestre", "indicadores", "metas", "resultados", "analisis", "baseNormativa"]'::jsonb,
    estructura_datos = '{
        "trimestre": {
            "tipo": "string",
            "requerido": false
        },
        "indicadores": {
            "tipo": "array",
            "requerido": false
        },
        "metas": {
            "tipo": "object",
            "requerido": false
        },
        "resultados": {
            "tipo": "object",
            "requerido": false
        },
        "analisis": {
            "tipo": "string",
            "requerido": false
        },
        "nombreInforme": {
            "tipo": "string",
            "requerido": true
        },
        "periodo": {
            "tipo": "string",
            "requerido": true
        },
        "fechaGeneracion": {
            "tipo": "string",
            "requerido": true
        },
        "responsable": {
            "tipo": "string",
            "requerido": true
        },
        "baseNormativa": {
            "tipo": "string",
            "requerido": false
        }
    }'::jsonb,
    updated_at = CURRENT_TIMESTAMP
WHERE codigo = 'plantilla-indicadores-oci';

-- ============================================
-- PLANTILLA: plantilla-revision-contratos
-- ============================================
UPDATE control_interno.plantilla_informe_ley
SET 
    variables_disponibles = '["nombreInforme", "periodo", "fechaGeneracion", "responsable", "mes", "contratos", "revisiones", "hallazgos", "recomendaciones", "baseNormativa"]'::jsonb,
    estructura_datos = '{
        "mes": {
            "tipo": "string",
            "requerido": false
        },
        "contratos": {
            "tipo": "array",
            "requerido": false
        },
        "revisiones": {
            "tipo": "array",
            "requerido": false
        },
        "hallazgos": {
            "tipo": "array",
            "requerido": false
        },
        "recomendaciones": {
            "tipo": "array",
            "requerido": false
        },
        "nombreInforme": {
            "tipo": "string",
            "requerido": true
        },
        "periodo": {
            "tipo": "string",
            "requerido": true
        },
        "fechaGeneracion": {
            "tipo": "string",
            "requerido": true
        },
        "responsable": {
            "tipo": "string",
            "requerido": true
        },
        "baseNormativa": {
            "tipo": "string",
            "requerido": false
        }
    }'::jsonb,
    updated_at = CURRENT_TIMESTAMP
WHERE codigo = 'plantilla-revision-contratos';

-- ============================================
-- PLANTILLA: plantilla-entes-control
-- ============================================
UPDATE control_interno.plantilla_informe_ley
SET 
    variables_disponibles = '["nombreInforme", "periodo", "fechaGeneracion", "responsable", "enteControl", "requerimiento", "respuesta", "documentosAnexos", "baseNormativa"]'::jsonb,
    estructura_datos = '{
        "enteControl": {
            "tipo": "string",
            "requerido": false
        },
        "requerimiento": {
            "tipo": "object",
            "requerido": false
        },
        "respuesta": {
            "tipo": "object",
            "requerido": false
        },
        "documentosAnexos": {
            "tipo": "array",
            "requerido": false
        },
        "nombreInforme": {
            "tipo": "string",
            "requerido": true
        },
        "periodo": {
            "tipo": "string",
            "requerido": true
        },
        "fechaGeneracion": {
            "tipo": "string",
            "requerido": true
        },
        "responsable": {
            "tipo": "string",
            "requerido": true
        },
        "baseNormativa": {
            "tipo": "string",
            "requerido": false
        }
    }'::jsonb,
    updated_at = CURRENT_TIMESTAMP
WHERE codigo = 'plantilla-entes-control';

-- ============================================
-- PLANTILLA: plantilla-consejo-superior
-- ============================================
UPDATE control_interno.plantilla_informe_ley
SET 
    variables_disponibles = '["nombreInforme", "periodo", "fechaGeneracion", "responsable", "temas", "presentacion", "recomendaciones", "baseNormativa"]'::jsonb,
    estructura_datos = '{
        "temas": {
            "tipo": "array",
            "requerido": false
        },
        "presentacion": {
            "tipo": "object",
            "requerido": false
        },
        "recomendaciones": {
            "tipo": "array",
            "requerido": false
        },
        "nombreInforme": {
            "tipo": "string",
            "requerido": true
        },
        "periodo": {
            "tipo": "string",
            "requerido": true
        },
        "fechaGeneracion": {
            "tipo": "string",
            "requerido": true
        },
        "responsable": {
            "tipo": "string",
            "requerido": true
        },
        "baseNormativa": {
            "tipo": "string",
            "requerido": false
        }
    }'::jsonb,
    updated_at = CURRENT_TIMESTAMP
WHERE codigo = 'plantilla-consejo-superior';

-- ============================================
-- PLANTILLA: plantilla-alerta-temprana
-- ============================================
UPDATE control_interno.plantilla_informe_ley
SET 
    variables_disponibles = '["nombreInforme", "periodo", "fechaGeneracion", "responsable", "hallazgo", "riesgo", "impacto", "accionesInmediatas", "recomendaciones", "baseNormativa"]'::jsonb,
    estructura_datos = '{
        "hallazgo": {
            "tipo": "object",
            "requerido": false
        },
        "riesgo": {
            "tipo": "object",
            "requerido": false
        },
        "impacto": {
            "tipo": "object",
            "requerido": false
        },
        "accionesInmediatas": {
            "tipo": "array",
            "requerido": false
        },
        "recomendaciones": {
            "tipo": "array",
            "requerido": false
        },
        "nombreInforme": {
            "tipo": "string",
            "requerido": true
        },
        "periodo": {
            "tipo": "string",
            "requerido": true
        },
        "fechaGeneracion": {
            "tipo": "string",
            "requerido": true
        },
        "responsable": {
            "tipo": "string",
            "requerido": true
        },
        "baseNormativa": {
            "tipo": "string",
            "requerido": false
        }
    }'::jsonb,
    updated_at = CURRENT_TIMESTAMP
WHERE codigo = 'plantilla-alerta-temprana';

-- ============================================
-- PLANTILLA: plantilla-austeridad
-- ============================================
-- Cambiar de Excel a PDF y actualizar ruta de plantilla
UPDATE control_interno.plantilla_informe_ley
SET 
    tipo_formato = 'PDF',
    ruta_plantilla = 'templates/informes-ley/plantilla-austeridad.hbs',
    variables_disponibles = '["nombreInforme", "periodo", "fechaGeneracion", "responsable", "trimestre", "datosFinancieros", "medidasAusteridad", "baseNormativa"]'::jsonb,
    estructura_datos = '{
        "trimestre": {
            "tipo": "string",
            "requerido": false
        },
        "datosFinancieros": {
            "tipo": "object",
            "requerido": false
        },
        "medidasAusteridad": {
            "tipo": "array",
            "requerido": false
        },
        "nombreInforme": {
            "tipo": "string",
            "requerido": true
        },
        "periodo": {
            "tipo": "string",
            "requerido": true
        },
        "fechaGeneracion": {
            "tipo": "string",
            "requerido": true
        },
        "responsable": {
            "tipo": "string",
            "requerido": true
        },
        "baseNormativa": {
            "tipo": "string",
            "requerido": false
        }
    }'::jsonb,
    updated_at = CURRENT_TIMESTAMP
WHERE codigo = 'plantilla-austeridad';

-- ============================================
-- COMENTARIOS FINALES
-- ============================================
COMMENT ON COLUMN control_interno.plantilla_informe_ley.variables_disponibles IS 'Variables disponibles en la plantilla. Las marcadas como requeridas deben estar presentes.';
COMMENT ON COLUMN control_interno.plantilla_informe_ley.estructura_datos IS 'Estructura esperada de datos. Campos con "requerido": false son opcionales.';
