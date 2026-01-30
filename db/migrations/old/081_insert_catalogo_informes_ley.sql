-- ============================================
-- MIGRACIÓN 081: Insertar Catálogo de Informes de Ley (16 informes normativos)
-- Fecha: 2025-01-XX
-- Descripción: Inserta los 16 informes del catálogo normativo del frontend
-- ============================================

-- Función auxiliar para mapear vinculacionRol a categoria
-- 'enfoque-prevencion' -> 'control'
-- 'evaluacion-gestion' -> 'administrativo'
-- 'seguimiento' -> 'administrativo'
-- 'relacion-control-externo' -> 'control'
-- 'gestion-conocimiento' -> 'administrativo'

-- Función auxiliar para calcular dia_presentacion desde mesGeneracion
-- Febrero/Augosto -> 28, Enero/Diciembre -> 31, Otros -> 15

-- ============================================
-- Hacer campos nullable (catálogo no tiene estos valores)
-- ============================================
ALTER TABLE control_interno.informe_ley 
ALTER COLUMN fecha_vencimiento DROP NOT NULL;

ALTER TABLE control_interno.informe_ley 
ALTER COLUMN historial DROP NOT NULL;

-- ============================================
-- INSERTAR 16 INFORMES DEL CATÁLOGO NORMATIVO
-- ============================================

-- 1. Informe Pormenorizado
INSERT INTO control_interno.informe_ley (
    codigo, nombre, descripcion, normativa, categoria, periodicidad, 
    dia_presentacion, entidad_destino, responsable, area, area_responsable,
    dias_anticipacion_alerta, activo, codigo_corto, tiene_plantilla, url_plantilla, requiere_aprobacion
) VALUES (
    'INF-PORM',
    'Informe Pormenorizado del Estado del Control Interno',
    'Informe más importante de Control Interno. Formato DAFP obligatorio.',
    'Ley 1474 de 2011 (Estatuto Anticorrupción)',
    'control',
    'semestral',
    28, -- Febrero y Agosto
    'Consejo Superior, DAFP, Contraloría General',
    'Jefe OCI',
    'Control Interno',
    'Jefe OCI',
    15,
    true,
    'Informe Pormenorizado',
    true,
    'plantilla-pormenorizado-dafp',
    true
) ON CONFLICT (codigo) DO NOTHING;

-- 2. Informe Anual OCI
INSERT INTO control_interno.informe_ley (
    codigo, nombre, descripcion, normativa, categoria, periodicidad, 
    dia_presentacion, entidad_destino, responsable, area, area_responsable,
    dias_anticipacion_alerta, activo, codigo_corto, tiene_plantilla, url_plantilla, requiere_aprobacion
) VALUES (
    'INF-ANUAL-OCI',
    'Informe Anual de Gestión de la Oficina de Control Interno',
    'Presenta resultados de gestión anual de la OCI según Decreto 648.',
    'Decreto 648 de 2017',
    'control',
    'anual',
    28, -- Febrero
    'Consejo Superior, Rectoría, Comunidad Universitaria',
    'Jefe OCI',
    'Control Interno',
    'Jefe OCI',
    20,
    true,
    'Informe Anual OCI',
    true,
    'plantilla-anual-oci',
    true
) ON CONFLICT (codigo) DO NOTHING;

-- 3. Informe FUR
INSERT INTO control_interno.informe_ley (
    codigo, nombre, descripcion, normativa, categoria, periodicidad, 
    dia_presentacion, entidad_destino, responsable, area, area_responsable,
    dias_anticipacion_alerta, activo, codigo_corto, tiene_plantilla, url_plantilla, requiere_aprobacion
) VALUES (
    'INF-FUR',
    'Informe de Funcionamiento del Sistema de Gestión Institucional (FUR)',
    'Requiere datos del Excel suministrado por DAF. Formato DAFP.',
    'Decreto 1537 de 2001',
    'control',
    'anual',
    31, -- Marzo
    'DAFP, Consejo Superior',
    'Jefe OCI',
    'Control Interno',
    'Jefe OCI',
    15,
    true,
    'Informe FUR',
    true,
    'plantilla-fur-dafp',
    true
) ON CONFLICT (codigo) DO NOTHING;

-- 4. Informe Anual MECI
INSERT INTO control_interno.informe_ley (
    codigo, nombre, descripcion, normativa, categoria, periodicidad, 
    dia_presentacion, entidad_destino, responsable, area, area_responsable,
    dias_anticipacion_alerta, activo, codigo_corto, tiene_plantilla, url_plantilla, requiere_aprobacion
) VALUES (
    'INF-ANUAL-MECI',
    'Informe Anual del Estado del Modelo Estándar de Control Interno (MECI)',
    'Evaluación anual del funcionamiento del MECI en la entidad.',
    'Decreto 943 de 2014',
    'administrativo',
    'anual',
    28, -- Febrero
    'Consejo Superior, DAFP, Dirección',
    'Jefe OCI',
    'Control Interno',
    'Jefe OCI',
    15,
    true,
    'Informe Anual MECI',
    true,
    'plantilla-meci',
    true
) ON CONFLICT (codigo) DO NOTHING;

-- 5. Revisión Dirección SGC
INSERT INTO control_interno.informe_ley (
    codigo, nombre, descripcion, normativa, categoria, periodicidad, 
    dia_presentacion, entidad_destino, responsable, area, area_responsable,
    dias_anticipacion_alerta, activo, codigo_corto, tiene_plantilla, url_plantilla, requiere_aprobacion
) VALUES (
    'INF-ANUAL-CALIDAD',
    'Informe Anual de Revisión por la Dirección del Sistema de Gestión de Calidad',
    'Presentación en Comité de Calidad. Requisito ISO 9001.',
    'NTC ISO 9001:2015',
    'administrativo',
    'anual',
    31, -- Enero
    'Comité de Calidad, Rectoría, Directores',
    'Profesional Universitario OCI',
    'Control Interno',
    'Profesional Universitario OCI',
    10,
    true,
    'Revisión Dirección SGC',
    true,
    'plantilla-revision-direccion-sgc',
    true
) ON CONFLICT (codigo) DO NOTHING;

-- 6. Informe Anticorrupción
INSERT INTO control_interno.informe_ley (
    codigo, nombre, descripcion, normativa, categoria, periodicidad, 
    dia_presentacion, entidad_destino, responsable, area, area_responsable,
    dias_anticipacion_alerta, activo, codigo_corto, tiene_plantilla, url_plantilla, requiere_aprobacion
) VALUES (
    'INF-ANUAL-ANTICORRUPCION',
    'Informe de Avance del Plan Anticorrupción y de Atención al Ciudadano',
    'Seguimiento a mapa de riesgos de corrupción y gestión de PQRS.',
    'Ley 1474 de 2011 y Decreto 1081 de 2015',
    'control',
    'semestral',
    28, -- Junio y Diciembre
    'Consejo Superior, DAFP, Procuraduría',
    'Profesional Especializado OCI',
    'Control Interno',
    'Profesional Especializado OCI',
    10,
    true,
    'Informe Anticorrupción',
    true,
    'plantilla-anticorrupcion',
    true
) ON CONFLICT (codigo) DO NOTHING;

-- 7. Austeridad del Gasto
INSERT INTO control_interno.informe_ley (
    codigo, nombre, descripcion, normativa, categoria, periodicidad, 
    dia_presentacion, entidad_destino, responsable, area, area_responsable,
    dias_anticipacion_alerta, activo, codigo_corto, tiene_plantilla, url_plantilla, requiere_aprobacion
) VALUES (
    'INF-TRIM-AUSTERIDAD',
    'Informe Trimestral de Austeridad del Gasto Público',
    'Requiere datos financieros del SIIF. Formato Excel DAFP.',
    'Decreto 1737 de 1998 y Circular Externa 100-011 DAFP',
    'administrativo',
    'trimestral',
    15, -- Abril, Julio, Octubre, Enero
    'DAFP, Rectoría, Contraloría',
    'Profesional Especializado OCI',
    'Control Interno',
    'Profesional Especializado OCI',
    7,
    true,
    'Austeridad del Gasto',
    true,
    'plantilla-austeridad',
    true
) ON CONFLICT (codigo) DO NOTHING;

-- 8. Seguimiento Trimestral SGC
INSERT INTO control_interno.informe_ley (
    codigo, nombre, descripcion, normativa, categoria, periodicidad, 
    dia_presentacion, entidad_destino, responsable, area, area_responsable,
    dias_anticipacion_alerta, activo, codigo_corto, tiene_plantilla, url_plantilla, requiere_aprobacion
) VALUES (
    'INF-TRIM-SEGUIMIENTO-SGC',
    'Informe Trimestral de Seguimiento al Sistema de Gestión de Calidad',
    'Presentación en Comité de Calidad trimestral.',
    'NTC ISO 9001:2015',
    'administrativo',
    'trimestral',
    15, -- Marzo, Junio, Septiembre, Diciembre
    'Comité de Calidad, Rectoría',
    'Profesional Universitario OCI',
    'Control Interno',
    'Profesional Universitario OCI',
    7,
    true,
    'Seguimiento Trimestral SGC',
    true,
    'plantilla-seguimiento-sgc',
    true
) ON CONFLICT (codigo) DO NOTHING;

-- 9. Seguimiento Planes Mejora
INSERT INTO control_interno.informe_ley (
    codigo, nombre, descripcion, normativa, categoria, periodicidad, 
    dia_presentacion, entidad_destino, responsable, area, area_responsable,
    dias_anticipacion_alerta, activo, codigo_corto, tiene_plantilla, url_plantilla, requiere_aprobacion
) VALUES (
    'INF-TRIM-PLANES-MEJORA',
    'Informe Trimestral de Seguimiento a Planes de Mejoramiento',
    'Seguimiento a hallazgos de auditorías internas y externas.',
    'Procedimiento Interno OCI - MECI',
    'administrativo',
    'trimestral',
    15, -- Marzo, Junio, Septiembre, Diciembre
    'Rectoría, Directores, Áreas auditadas',
    'Todos los Profesionales OCI',
    'Control Interno',
    'Todos los Profesionales OCI',
    10,
    true,
    'Seguimiento Planes Mejora',
    true,
    'plantilla-seguimiento-planes',
    true
) ON CONFLICT (codigo) DO NOTHING;

-- 10. Indicadores OCI
INSERT INTO control_interno.informe_ley (
    codigo, nombre, descripcion, normativa, categoria, periodicidad, 
    dia_presentacion, entidad_destino, responsable, area, area_responsable,
    dias_anticipacion_alerta, activo, codigo_corto, tiene_plantilla, url_plantilla, requiere_aprobacion
) VALUES (
    'INF-TRIM-INDICADORES',
    'Informe Trimestral de Indicadores de Gestión OCI',
    'Medición de cumplimiento del Plan Anual de Auditoría.',
    'Decreto 648 de 2017',
    'administrativo',
    'trimestral',
    15, -- Marzo, Junio, Septiembre, Diciembre
    'Consejo Superior, Rectoría',
    'Jefe OCI',
    'Control Interno',
    'Jefe OCI',
    7,
    true,
    'Indicadores OCI',
    true,
    'plantilla-indicadores-oci',
    true
) ON CONFLICT (codigo) DO NOTHING;

-- 11. Revisión Contratos
INSERT INTO control_interno.informe_ley (
    codigo, nombre, descripcion, normativa, categoria, periodicidad, 
    dia_presentacion, entidad_destino, responsable, area, area_responsable,
    dias_anticipacion_alerta, activo, codigo_corto, tiene_plantilla, url_plantilla, requiere_aprobacion
) VALUES (
    'INF-MENS-CONTRATACION',
    'Informe Mensual de Revisión de Procesos de Contratación',
    'Revisión de legalidad y cumplimiento normativo de contratos.',
    'Ley 80 de 1993 y Ley 1150 de 2007',
    'administrativo',
    'mensual',
    15, -- Todos los meses
    'Oficina Jurídica, Dirección Administrativa, Rectoría',
    'Profesional Especializado OCI',
    'Control Interno',
    'Profesional Especializado OCI',
    5,
    true,
    'Revisión Contratos',
    true,
    'plantilla-revision-contratos',
    true
) ON CONFLICT (codigo) DO NOTHING;

-- 12. Seguimiento PQRS
INSERT INTO control_interno.informe_ley (
    codigo, nombre, descripcion, normativa, categoria, periodicidad, 
    dia_presentacion, entidad_destino, responsable, area, area_responsable,
    dias_anticipacion_alerta, activo, codigo_corto, tiene_plantilla, url_plantilla, requiere_aprobacion
) VALUES (
    'INF-MENS-PQRS',
    'Informe Mensual de Seguimiento a PQRS',
    'Verifica cumplimiento de términos legales de respuesta.',
    'Ley 1755 de 2015 (Código de Procedimiento Administrativo)',
    'administrativo',
    'mensual',
    15, -- Todos los meses
    'Rectoría, Jefe Atención al Ciudadano',
    'Técnico Administrativo OCI',
    'Control Interno',
    'Técnico Administrativo OCI',
    3,
    true,
    'Seguimiento PQRS',
    true,
    'plantilla-pqrs',
    true
) ON CONFLICT (codigo) DO NOTHING;

-- 13. Derechos de Autor
INSERT INTO control_interno.informe_ley (
    codigo, nombre, descripcion, normativa, categoria, periodicidad, 
    dia_presentacion, entidad_destino, responsable, area, area_responsable,
    dias_anticipacion_alerta, activo, codigo_corto, tiene_plantilla, url_plantilla, requiere_aprobacion
) VALUES (
    'INF-MENS-DERECHOS-AUTOR',
    'Informe Mensual de Seguimiento a Derechos de Autor y Licenciamiento',
    'Verificación de licenciamiento de software institucional.',
    'Ley 23 de 1982 y Circular Externa 016 de 2002 DAFP',
    'control',
    'mensual',
    15, -- Todos los meses
    'Director de TI, Rectoría, Oficina Jurídica',
    'Profesional Universitario OCI',
    'Control Interno',
    'Profesional Universitario OCI',
    5,
    true,
    'Derechos de Autor',
    true,
    'plantilla-derechos-autor',
    true
) ON CONFLICT (codigo) DO NOTHING;

-- 14. Entes de Control
INSERT INTO control_interno.informe_ley (
    codigo, nombre, descripcion, normativa, categoria, periodicidad, 
    dia_presentacion, entidad_destino, responsable, area, area_responsable,
    dias_anticipacion_alerta, activo, codigo_corto, tiene_plantilla, url_plantilla, requiere_aprobacion
) VALUES (
    'INF-ESP-ENTES-CONTROL',
    'Informes a Entes de Control Externo (Contraloría, Procuraduría, Fiscalía)',
    'Respuesta a requerimientos específicos de entes de control.',
    'Ley 42 de 1993 y Ley 610 de 2000',
    'control',
    'anual',
    31, -- Diciembre, pero puede variar
    'Contraloría, Procuraduría, Fiscalía, CGR',
    'Jefe OCI',
    'Control Interno',
    'Jefe OCI',
    5,
    true,
    'Entes de Control',
    true,
    'plantilla-entes-control',
    true
) ON CONFLICT (codigo) DO NOTHING;

-- 15. Informes Consejo Superior
INSERT INTO control_interno.informe_ley (
    codigo, nombre, descripcion, normativa, categoria, periodicidad, 
    dia_presentacion, entidad_destino, responsable, area, area_responsable,
    dias_anticipacion_alerta, activo, codigo_corto, tiene_plantilla, url_plantilla, requiere_aprobacion
) VALUES (
    'INF-ESP-CONSEJO-SUPERIOR',
    'Informes Especiales al Consejo Superior Universitario',
    'Presentaciones especiales en sesiones del Consejo Superior.',
    'Estatuto Orgánico ESAP',
    'control',
    'trimestral',
    15, -- Marzo, Junio, Septiembre, Diciembre
    'Consejo Superior Universitario',
    'Jefe OCI',
    'Control Interno',
    'Jefe OCI',
    10,
    true,
    'Informes Consejo Superior',
    true,
    'plantilla-consejo-superior',
    true
) ON CONFLICT (codigo) DO NOTHING;

-- 16. Alertas Tempranas
INSERT INTO control_interno.informe_ley (
    codigo, nombre, descripcion, normativa, categoria, periodicidad, 
    dia_presentacion, entidad_destino, responsable, area, area_responsable,
    dias_anticipacion_alerta, activo, codigo_corto, tiene_plantilla, url_plantilla, requiere_aprobacion
) VALUES (
    'INF-ESP-HALLAZGOS-CRITICOS',
    'Informe Especial de Hallazgos Críticos o Alertas Tempranas',
    'Función de advertencia ante riesgos inminentes o hallazgos críticos.',
    'Decreto 648 de 2017',
    'control',
    'anual',
    31, -- N/A - Cuando se requiera
    'Rector, Consejo Superior, Dependencia afectada',
    'Jefe OCI',
    'Control Interno',
    'Jefe OCI',
    0, -- Inmediato
    true,
    'Alertas Tempranas',
    true,
    'plantilla-alerta-temprana',
    true
) ON CONFLICT (codigo) DO NOTHING;

-- ============================================
-- INSERTAR PLANTILLAS FALTANTES (12 plantillas adicionales)
-- ============================================
INSERT INTO control_interno.plantilla_informe_ley (codigo, nombre, descripcion, tipo_formato, ruta_plantilla, variables_disponibles, estructura_datos, activa, version)
VALUES
    (
        'plantilla-meci',
        'Plantilla Informe Anual MECI',
        'Plantilla para el Informe Anual del Estado del Modelo Estándar de Control Interno (MECI)',
        'PDF',
        'templates/informes-ley/plantilla-meci.hbs',
        '["nombreInforme", "periodo", "fechaGeneracion", "evaluacionMECI", "componentes", "resultados", "recomendaciones"]'::jsonb,
        '{"evaluacionMECI": {}, "componentes": [], "resultados": {}}'::jsonb,
        TRUE,
        '1.0'
    ),
    (
        'plantilla-revision-direccion-sgc',
        'Plantilla Revisión Dirección SGC',
        'Plantilla para el Informe Anual de Revisión por la Dirección del Sistema de Gestión de Calidad',
        'PDF',
        'templates/informes-ley/plantilla-revision-direccion-sgc.hbs',
        '["nombreInforme", "periodo", "fechaGeneracion", "entradas", "salidas", "acciones", "decisiones"]'::jsonb,
        '{"entradas": [], "salidas": [], "acciones": [], "decisiones": []}'::jsonb,
        TRUE,
        '1.0'
    ),
    (
        'plantilla-anticorrupcion',
        'Plantilla Informe Anticorrupción',
        'Plantilla para el Informe de Avance del Plan Anticorrupción y de Atención al Ciudadano',
        'PDF',
        'templates/informes-ley/plantilla-anticorrupcion.hbs',
        '["nombreInforme", "periodo", "fechaGeneracion", "mapaRiesgos", "accionesPrevencion", "pqrs", "resultados"]'::jsonb,
        '{"mapaRiesgos": [], "accionesPrevencion": [], "pqrs": {}, "resultados": {}}'::jsonb,
        TRUE,
        '1.0'
    ),
    (
        'plantilla-seguimiento-sgc',
        'Plantilla Seguimiento Trimestral SGC',
        'Plantilla para el Informe Trimestral de Seguimiento al Sistema de Gestión de Calidad',
        'PDF',
        'templates/informes-ley/plantilla-seguimiento-sgc.hbs',
        '["nombreInforme", "periodo", "trimestre", "indicadores", "noConformidades", "accionesCorrectivas", "resultados"]'::jsonb,
        '{"indicadores": [], "noConformidades": [], "accionesCorrectivas": [], "resultados": {}}'::jsonb,
        TRUE,
        '1.0'
    ),
    (
        'plantilla-seguimiento-planes',
        'Plantilla Seguimiento Planes Mejora',
        'Plantilla para el Informe Trimestral de Seguimiento a Planes de Mejoramiento',
        'PDF',
        'templates/informes-ley/plantilla-seguimiento-planes.hbs',
        '["nombreInforme", "periodo", "trimestre", "planes", "avance", "hallazgos", "evidencias"]'::jsonb,
        '{"planes": [], "avance": {}, "hallazgos": [], "evidencias": []}'::jsonb,
        TRUE,
        '1.0'
    ),
    (
        'plantilla-indicadores-oci',
        'Plantilla Indicadores OCI',
        'Plantilla para el Informe Trimestral de Indicadores de Gestión OCI',
        'PDF',
        'templates/informes-ley/plantilla-indicadores-oci.hbs',
        '["nombreInforme", "periodo", "trimestre", "indicadores", "metas", "resultados", "analisis"]'::jsonb,
        '{"indicadores": [], "metas": {}, "resultados": {}, "analisis": {}}'::jsonb,
        TRUE,
        '1.0'
    ),
    (
        'plantilla-revision-contratos',
        'Plantilla Revisión Contratos',
        'Plantilla para el Informe Mensual de Revisión de Procesos de Contratación',
        'PDF',
        'templates/informes-ley/plantilla-revision-contratos.hbs',
        '["nombreInforme", "periodo", "mes", "contratos", "revisiones", "hallazgos", "recomendaciones"]'::jsonb,
        '{"contratos": [], "revisiones": [], "hallazgos": [], "recomendaciones": []}'::jsonb,
        TRUE,
        '1.0'
    ),
    (
        'plantilla-pqrs',
        'Plantilla Seguimiento PQRS',
        'Plantilla para el Informe Mensual de Seguimiento a PQRS',
        'Excel',
        'templates/informes-ley/plantilla-pqrs.xlsx',
        '["periodo", "mes", "pqrs", "estados", "tiemposRespuesta", "cumplimiento"]'::jsonb,
        '{"pqrs": [], "estados": {}, "tiemposRespuesta": {}, "cumplimiento": {}}'::jsonb,
        TRUE,
        '1.0'
    ),
    (
        'plantilla-derechos-autor',
        'Plantilla Derechos de Autor',
        'Plantilla para el Informe Mensual de Seguimiento a Derechos de Autor y Licenciamiento',
        'Excel',
        'templates/informes-ley/plantilla-derechos-autor.xlsx',
        '["periodo", "mes", "software", "licencias", "cumplimiento", "observaciones"]'::jsonb,
        '{"software": [], "licencias": [], "cumplimiento": {}, "observaciones": []}'::jsonb,
        TRUE,
        '1.0'
    ),
    (
        'plantilla-entes-control',
        'Plantilla Entes de Control',
        'Plantilla para Informes a Entes de Control Externo (Contraloría, Procuraduría, Fiscalía)',
        'PDF',
        'templates/informes-ley/plantilla-entes-control.hbs',
        '["nombreInforme", "enteControl", "fechaGeneracion", "requerimiento", "respuesta", "documentosAnexos"]'::jsonb,
        '{"requerimiento": {}, "respuesta": {}, "documentosAnexos": []}'::jsonb,
        TRUE,
        '1.0'
    ),
    (
        'plantilla-consejo-superior',
        'Plantilla Consejo Superior',
        'Plantilla para Informes Especiales al Consejo Superior Universitario',
        'PDF',
        'templates/informes-ley/plantilla-consejo-superior.hbs',
        '["nombreInforme", "periodo", "fechaGeneracion", "temas", "presentacion", "recomendaciones"]'::jsonb,
        '{"temas": [], "presentacion": {}, "recomendaciones": []}'::jsonb,
        TRUE,
        '1.0'
    ),
    (
        'plantilla-alerta-temprana',
        'Plantilla Alerta Temprana',
        'Plantilla para el Informe Especial de Hallazgos Críticos o Alertas Tempranas',
        'PDF',
        'templates/informes-ley/plantilla-alerta-temprana.hbs',
        '["nombreInforme", "fechaGeneracion", "hallazgo", "riesgo", "impacto", "accionesInmediatas", "recomendaciones"]'::jsonb,
        '{"hallazgo": {}, "riesgo": {}, "impacto": {}, "accionesInmediatas": [], "recomendaciones": []}'::jsonb,
        TRUE,
        '1.0'
    )
ON CONFLICT (codigo) DO NOTHING;

-- ============================================
-- VERIFICACIÓN DE INSERCIONES
-- ============================================

-- 1. Resumen de Informes Insertados
DO $$
DECLARE
    total_informes INTEGER;
    informes_activos INTEGER;
BEGIN
    SELECT COUNT(*), COUNT(*) FILTER (WHERE activo = true)
    INTO total_informes, informes_activos
    FROM control_interno.informe_ley
    WHERE codigo IN (
        'INF-PORM', 'INF-ANUAL-OCI', 'INF-FUR', 'INF-ANUAL-MECI', 'INF-ANUAL-CALIDAD',
        'INF-ANUAL-ANTICORRUPCION', 'INF-TRIM-AUSTERIDAD', 'INF-TRIM-SEGUIMIENTO-SGC',
        'INF-TRIM-PLANES-MEJORA', 'INF-TRIM-INDICADORES', 'INF-MENS-CONTRATACION',
        'INF-MENS-PQRS', 'INF-MENS-DERECHOS-AUTOR', 'INF-ESP-ENTES-CONTROL',
        'INF-ESP-CONSEJO-SUPERIOR', 'INF-ESP-HALLAZGOS-CRITICOS'
    );
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RESUMEN DE INFORMES INSERTADOS';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Tabla: control_interno.informe_ley';
    RAISE NOTICE 'Total de informes: %', total_informes;
    RAISE NOTICE 'Informes activos: %', informes_activos;
    RAISE NOTICE '========================================';
END $$;

-- 2. Resumen de Plantillas Insertadas
DO $$
DECLARE
    total_plantillas INTEGER;
    plantillas_activas INTEGER;
BEGIN
    SELECT COUNT(*), COUNT(*) FILTER (WHERE activa = true)
    INTO total_plantillas, plantillas_activas
    FROM control_interno.plantilla_informe_ley
    WHERE codigo IN (
        'plantilla-pormenorizado-dafp', 'plantilla-anual-oci', 'plantilla-fur-dafp', 
        'plantilla-austeridad', 'plantilla-meci', 'plantilla-revision-direccion-sgc',
        'plantilla-anticorrupcion', 'plantilla-seguimiento-sgc', 'plantilla-seguimiento-planes',
        'plantilla-indicadores-oci', 'plantilla-revision-contratos', 'plantilla-pqrs',
        'plantilla-derechos-autor', 'plantilla-entes-control', 'plantilla-consejo-superior',
        'plantilla-alerta-temprana'
    );
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RESUMEN DE PLANTILLAS INSERTADAS';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Tabla: control_interno.plantilla_informe_ley';
    RAISE NOTICE 'Total de plantillas: %', total_plantillas;
    RAISE NOTICE 'Plantillas activas: %', plantillas_activas;
    RAISE NOTICE '========================================';
END $$;

-- 3. Verificación detallada de Informes (Query para ver resultados)
SELECT 
    'INFORMES DE LEY' as tipo_registro,
    COUNT(*) as total_insertados,
    COUNT(*) FILTER (WHERE activo = true) as activos,
    COUNT(*) FILTER (WHERE activo = false) as inactivos
FROM control_interno.informe_ley
WHERE codigo IN (
    'INF-PORM', 'INF-ANUAL-OCI', 'INF-FUR', 'INF-ANUAL-MECI', 'INF-ANUAL-CALIDAD',
    'INF-ANUAL-ANTICORRUPCION', 'INF-TRIM-AUSTERIDAD', 'INF-TRIM-SEGUIMIENTO-SGC',
    'INF-TRIM-PLANES-MEJORA', 'INF-TRIM-INDICADORES', 'INF-MENS-CONTRATACION',
    'INF-MENS-PQRS', 'INF-MENS-DERECHOS-AUTOR', 'INF-ESP-ENTES-CONTROL',
    'INF-ESP-CONSEJO-SUPERIOR', 'INF-ESP-HALLAZGOS-CRITICOS'
);

-- 4. Verificación detallada de Plantillas (Query para ver resultados)
SELECT 
    'PLANTILLAS DE INFORMES' as tipo_registro,
    COUNT(*) as total_insertadas,
    COUNT(*) FILTER (WHERE activa = true) as activas,
    COUNT(*) FILTER (WHERE activa = false) as inactivas
FROM control_interno.plantilla_informe_ley
WHERE codigo IN (
    'plantilla-pormenorizado-dafp', 'plantilla-anual-oci', 'plantilla-fur-dafp', 
    'plantilla-austeridad', 'plantilla-meci', 'plantilla-revision-direccion-sgc',
    'plantilla-anticorrupcion', 'plantilla-seguimiento-sgc', 'plantilla-seguimiento-planes',
    'plantilla-indicadores-oci', 'plantilla-revision-contratos', 'plantilla-pqrs',
    'plantilla-derechos-autor', 'plantilla-entes-control', 'plantilla-consejo-superior',
    'plantilla-alerta-temprana'
);

-- 5. Verificación: Informes sin plantilla correspondiente
SELECT 
    i.codigo as codigo_informe,
    i.nombre as nombre_informe,
    i.url_plantilla as plantilla_referenciada,
    CASE 
        WHEN p.codigo IS NULL THEN 'PLANTILLA NO ENCONTRADA'
        ELSE 'PLANTILLA OK'
    END as estado_plantilla
FROM control_interno.informe_ley i
LEFT JOIN control_interno.plantilla_informe_ley p ON i.url_plantilla = p.codigo
WHERE i.codigo IN (
    'INF-PORM', 'INF-ANUAL-OCI', 'INF-FUR', 'INF-ANUAL-MECI', 'INF-ANUAL-CALIDAD',
    'INF-ANUAL-ANTICORRUPCION', 'INF-TRIM-AUSTERIDAD', 'INF-TRIM-SEGUIMIENTO-SGC',
    'INF-TRIM-PLANES-MEJORA', 'INF-TRIM-INDICADORES', 'INF-MENS-CONTRATACION',
    'INF-MENS-PQRS', 'INF-MENS-DERECHOS-AUTOR', 'INF-ESP-ENTES-CONTROL',
    'INF-ESP-CONSEJO-SUPERIOR', 'INF-ESP-HALLAZGOS-CRITICOS'
)
AND i.tiene_plantilla = true
ORDER BY estado_plantilla, i.codigo;
