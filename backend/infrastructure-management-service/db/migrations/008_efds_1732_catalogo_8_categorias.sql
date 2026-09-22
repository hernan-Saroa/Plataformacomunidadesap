-- =====================================================================
-- EFDS-1732: Catalogo de 8 categorias de servicio oficiales
-- Migracion 008 - Fase 2 Parametrizacion
-- Idempotente: re-ejecutable sin errores
-- =====================================================================

SET search_path TO "infrastructure-management";

-- ---------------------------------------------------------------------
-- Paso 1: Corregir type mismatch id_categoria UUID -> INT
-- (11/11 filas actuales NULL = safe ALTER directo sin romper nada)
-- ---------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE  table_schema = 'infrastructure-management'
          AND  table_name   = 'solicitud_mantenimiento'
          AND  column_name  = 'id_categoria'
          AND  data_type    = 'uuid'
    ) THEN
        ALTER TABLE solicitud_mantenimiento
            ALTER COLUMN id_categoria TYPE INTEGER
            USING NULL;
    END IF;
END $$;

COMMENT ON COLUMN solicitud_mantenimiento.id_categoria
    IS 'FK catalogo_item.id_catalogo (CATEGORIA_SERVICIO oficial). INT, NULL en Fase2 opcional, obligatorio en EFDS-1732-v2';

-- ---------------------------------------------------------------------
-- Paso 1B: Crear columna id_subcategoria INT (si no existe) para AC02
-- Subcategorias = CATEGORIA_SERVICIO con metadata.parentCodigo. 0 tablas nuevas.
-- ---------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE  table_schema = 'infrastructure-management'
          AND  table_name   = 'solicitud_mantenimiento'
          AND  column_name  = 'id_subcategoria'
    ) THEN
        ALTER TABLE solicitud_mantenimiento
            ADD COLUMN id_subcategoria INTEGER NULL;
    END IF;
END $$;

COMMENT ON COLUMN solicitud_mantenimiento.id_subcategoria
    IS 'AC02 EFDS-1732 Subcategoria: id_catalogo hijo CATEGORIA_SERVICIO metadata.parentCodigo = categoriaPadre.codigo. Opcional Entrega1, admin puede agregar sin alterar 8 oficiales';

-- ---------------------------------------------------------------------
-- Paso 2: UPSERT idempotente 8 categorias oficiales CATEGORIA_SERVICIO
-- ON CONFLICT (catalogo, codigo) NO HACE NADA -> re-runnable
-- ---------------------------------------------------------------------

-- (1) CS_001 - Cerrajeria y Carpinteria
INSERT INTO catalogo_item
    (catalogo, codigo, nombre, descripcion, orden, is_activo, metadata)
VALUES (
    'CATEGORIA_SERVICIO',
    'CS_001',
    'Cerrajeria y Carpinteria',
    'Servicios de cerradura, copia de llaves, reparacion puertas madera/metal, work de carpinteria, ajuste de chapas',
    1,
    TRUE,
    '{"tipo": "CATEGORIA_PRINCIPAL", "fase2": true, "lineaBase745": true, "color": "amber"}'::jsonb
)
ON CONFLICT ON CONSTRAINT uq_catalogo_item_codigo DO NOTHING;

-- (2) CS_002 - Electricas y Electronicas
INSERT INTO catalogo_item
    (catalogo, codigo, nombre, descripcion, orden, is_activo, metadata)
VALUES (
    'CATEGORIA_SERVICIO',
    'CS_002',
    'Electricas y Electronicas',
    'Averias electricas, instalaciones, tomas, interruptores, luminarias, cableado estructurado, equipos electronicos (UPS, CCTV futuro confirmar coordinador)',
    2,
    TRUE,
    '{"tipo": "CATEGORIA_PRINCIPAL", "fase2": true, "lineaBase745": true, "color": "yellow"}'::jsonb
)
ON CONFLICT ON CONSTRAINT uq_catalogo_item_codigo DO NOTHING;

-- (3) CS_003 - Adecuacion de Espacios y Apoyo a Eventos
INSERT INTO catalogo_item
    (catalogo, codigo, nombre, descripcion, orden, is_activo, metadata)
VALUES (
    'CATEGORIA_SERVICIO',
    'CS_003',
    'Adecuacion de Espacios y Apoyo a Eventos',
    'Montaje de sillas, mesas, toldos para eventos, adecuacion de auditorios/salones, distribucion de espacios',
    3,
    TRUE,
    '{"tipo": "CATEGORIA_PRINCIPAL", "fase2": true, "lineaBase745": true, "color": "orange"}'::jsonb
)
ON CONFLICT ON CONSTRAINT uq_catalogo_item_codigo DO NOTHING;

-- (4) CS_004 - Plomeria y Fontaneria
INSERT INTO catalogo_item
    (catalogo, codigo, nombre, descripcion, orden, is_activo, metadata)
VALUES (
    'CATEGORIA_SERVICIO',
    'CS_004',
    'Plomeria y Fontaneria',
    'Fugas agua, reparaciones sanitarias, desagües, sumideros, destapes, red fria/caliente, sanitarios, griferia',
    4,
    TRUE,
    '{"tipo": "CATEGORIA_PRINCIPAL", "fase2": true, "lineaBase745": true, "color": "sky"}'::jsonb
)
ON CONFLICT ON CONSTRAINT uq_catalogo_item_codigo DO NOTHING;

-- (5) CS_005 - Mantenimiento de Infraestructura Fisica y Obras Menores
INSERT INTO catalogo_item
    (catalogo, codigo, nombre, descripcion, orden, is_activo, metadata)
VALUES (
    'CATEGORIA_SERVICIO',
    'CS_005',
    'Mantenimiento de Infraestructura Fisica y Obras Menores',
    'Paredes, pisos, enchapes, pintura, drywall, falsa placa, obras menores de remodelacion, estructuras, techos y cubiertas',
    5,
    TRUE,
    '{"tipo": "CATEGORIA_PRINCIPAL", "fase2": true, "lineaBase745": true, "color": "stone"}'::jsonb
)
ON CONFLICT ON CONSTRAINT uq_catalogo_item_codigo DO NOTHING;

-- (6) CS_006 - Mantenimiento de Zonas Exteriores y Jardineria
INSERT INTO catalogo_item
    (catalogo, codigo, nombre, descripcion, orden, is_activo, metadata)
VALUES (
    'CATEGORIA_SERVICIO',
    'CS_006',
    'Mantenimiento de Zonas Exteriores y Jardineria',
    'Poda de arboles, jardines, zonas verdes, limpieza de zonas exteriores, andenes, parqueaderos, canales pluviales',
    6,
    TRUE,
    '{"tipo": "CATEGORIA_PRINCIPAL", "fase2": true, "lineaBase745": true, "color": "emerald"}'::jsonb
)
ON CONFLICT ON CONSTRAINT uq_catalogo_item_codigo DO NOTHING;

-- (7) CS_007 - Traslados de Mobiliario y Bienes
INSERT INTO catalogo_item
    (catalogo, codigo, nombre, descripcion, orden, is_activo, metadata)
VALUES (
    'CATEGORIA_SERVICIO',
    'CS_007',
    'Traslados de Mobiliario y Bienes',
    'Movilizacion de escritorios, sillas, estantes, equipos, archivos entre sedes, edificios, pisos o dependencias',
    7,
    TRUE,
    '{"tipo": "CATEGORIA_PRINCIPAL", "fase2": true, "lineaBase745": true, "color": "violet"}'::jsonb
)
ON CONFLICT ON CONSTRAINT uq_catalogo_item_codigo DO NOTHING;

-- (8) CS_008 - Revision y Mantenimiento Preventivo de Equipos Criticos
INSERT INTO catalogo_item
    (catalogo, codigo, nombre, descripcion, orden, is_activo, metadata)
VALUES (
    'CATEGORIA_SERVICIO',
    'CS_008',
    'Revision y Mantenimiento Preventivo de Equipos Criticos',
    'Aire acondicionado, plantas electricas, UPS, calentadores, compresores, cocinas industriales, lavadoras, extractores de aire',
    8,
    TRUE,
    '{"tipo": "CATEGORIA_PRINCIPAL", "fase2": true, "lineaBase745": true, "color": "rose"}'::jsonb
)
ON CONFLICT ON CONSTRAINT uq_catalogo_item_codigo DO NOTHING;
