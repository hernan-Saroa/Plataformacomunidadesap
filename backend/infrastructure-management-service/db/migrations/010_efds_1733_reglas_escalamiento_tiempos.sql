-- =====================================================================
-- EFDS-1733: Parametrización escalamiento por especialización y
-- tiempos de respuesta (1..3 días / 24..72 horas).
-- Dependencias: 008 (catalog_item schema), 009 (sede-bloque-espacio).
-- Idempotente: re-ejecutable sin errores.
-- =====================================================================

SET search_path TO "infrastructure-management";

-- ---------------------------------------------------------------------
-- Paso 1: Nuevas columnas en solicitud_mantenimiento
-- fecha_limite_atencion: RF-INF-004, = fecha_radicacion + N días.
-- asignaciones: historial JSONB de asignaciones y reasignaciones.
-- ---------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'infrastructure-management'
          AND table_name   = 'solicitud_mantenimiento'
          AND column_name  = 'fecha_limite_atencion'
    ) THEN
        ALTER TABLE solicitud_mantenimiento
            ADD COLUMN fecha_limite_atencion TIMESTAMPTZ NULL;
        COMMENT ON COLUMN solicitud_mantenimiento.fecha_limite_atencion
            IS 'EFDS-1733 RF-INF-004: fecha_limite = fecha_radicacion + TIEMPO_RESPUESTA_DIAS (1..3)';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'infrastructure-management'
          AND table_name   = 'solicitud_mantenimiento'
          AND column_name  = 'asignaciones'
    ) THEN
        ALTER TABLE solicitud_mantenimiento
            ADD COLUMN asignaciones JSONB NOT NULL DEFAULT '[]'::jsonb;
        COMMENT ON COLUMN solicitud_mantenimiento.asignaciones
            IS 'EFDS-1733: historial asignaciones reasignaciones [{fecha, tecnico_codigo, tecnico_nombre, motivo, modo AUTO_SUGERIDO/MANUAL, usuario}]';
    END IF;
END $$;

-- ---------------------------------------------------------------------
-- Paso 2: Índices para algoritmo asignación.
-- idx_solicitud_fecha_limite: ordenar bandeja por SLA vencimiento.
-- idx_solicitud_responsable_estado: calcular carga vigente técnico
--    = COUNT WHERE responsable_asignado = TEC.codigo AND estado
--      IN (RECIBIDA, ASIGNADA, EN_PROGRESO, EN_ANALISIS)
--      AND area_responsable_actual != 'TI'
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_solicitud_fecha_limite
    ON solicitud_mantenimiento (fecha_limite_atencion DESC);

CREATE INDEX IF NOT EXISTS idx_solicitud_responsable_asignado_estado
    ON solicitud_mantenimiento (responsable_asignado, estado, area_responsable_actual)
    WHERE responsable_asignado IS NOT NULL;

-- ---------------------------------------------------------------------
-- Paso 3: Upserts catalog_item = 3 nuevos catálogos
-- 3.1  PARAMETRO_UMI     / TIEMPO_RESPUESTA_DIAS  (default 2 días, rango 1..3)
-- 3.2  REGLA_ESCALAMIENTO/ 2 reglas
--        REG_001: CATEGORIA_SERVICIO CS_002 = 48 Electricas -> ESPECIALIZACION
--        REG_002: 7 categorías restantes -> EQUIDAD_DISPONIBILIDAD_CARGA_MENOR
-- 3.3  TECNICO_MANTENIMIENTO / 5 técnicos seed (2 electricistas + 3 genéricos)
-- ---------------------------------------------------------------------

-- 3.1 Parámetro tiempo respuesta
INSERT INTO catalogo_item
  (catalogo, codigo, nombre, descripcion, orden, is_activo, metadata)
VALUES
  (
    'PARAMETRO_UMI',
    'TIEMPO_RESPUESTA_DIAS',
    'Tiempo máximo de respuesta (días naturales)',
    'RF-INF-004 EFDS-1733: Días que tiene UMI para atender una solicitud antes del vencimiento del SLA. Rango permitido: 1 a 3 días naturales (24h a 72h).',
    1,
    TRUE,
    jsonb_build_object(
      'min', 1,
      'max', 3,
      'default', 2,
      'actual', 2,
      'unidad', 'DIAS_NATURALES',
      'modificadoPor', 'SEED_EFDS_1733',
      'fechaModificacion', NOW()::text
    )
  )
ON CONFLICT ON CONSTRAINT uq_catalogo_item_codigo DO NOTHING;

-- 3.2 Regla 001 Electricas especialista
INSERT INTO catalogo_item
  (catalogo, codigo, nombre, descripcion, orden, is_activo, metadata)
VALUES
  (
    'REGLA_ESCALAMIENTO',
    'REG_001_CATEGORIA_48_ELECTRICAS',
    'Regla escalamiento: Eléctricas y Electrónicas asigna ESPECIALISTA',
    'EFDS-1733 AC-01: Para la categoría CS_002 (idCatalogo=48) la asignación se hace SIEMPRE al técnico especialista (no equidad). El id del técnico se configura desde el panel de parámetros UMI en la propiedad tecnicoCodigo.',
    1,
    TRUE,
    jsonb_build_object(
      'idCategoria', 48,
      'codCategoriaCS', 'CS_002',
      'regla', 'ESPECIALIZACION',
      'tecnicoCodigo', NULL,
      'tecnicoNombreDisplay', NULL
    )
  ),
  (
    'REGLA_ESCALAMIENTO',
    'REG_002_EQUIDAD_OTRAS_7_CATEGORIAS',
    'Regla escalamiento: Resto 7 categorías usan equidad menor carga vigente',
    'EFDS-1733 AC-02: Para Cerrajería / Fontanería / Carpintería / Aire acondicionado / Pintura / Vidrios / Limpieza se sugiere el técnico con MENOR carga vigente. El coordinador UMI puede reasignar manualmente.',
    2,
    TRUE,
    jsonb_build_object(
      'idsCategorias', ARRAY[47,49,50,51,52,53,54],
      'regla', 'EQUIDAD_DISPONIBILIDAD_CARGA_MENOR',
      'excluirAreaResponsableTI', TRUE
    )
  )
ON CONFLICT ON CONSTRAINT uq_catalogo_item_codigo DO NOTHING;

-- 3.3 Seed técnicos mantenimiento: 2 ELECTRICAS + 3 genericos (UMI/Fontanería/Carpintería)
INSERT INTO catalogo_item
  (catalogo, codigo, nombre, descripcion, orden, is_activo, metadata)
VALUES
  (
    'TECNICO_MANTENIMIENTO',
    'TEC-ELC-001',
    'Carlos Ramírez Pineda',
    'Técnico electricista / electrónico senior. Especialidad tableros, cableado estructurado, UPS, luminarias. Primer nivel especialista CS_002.',
    1,
    TRUE,
    jsonb_build_object(
      'email', 'carlos.ramirez@esap.edu.co',
      'telefono', '+57 310 000 0001',
      'especialidades', ARRAY['ELECTRICA','ELECTRONICA','LUMINARIAS','UPS'],
      'fechaIngresoUMI', '2021-06-15'
    )
  ),
  (
    'TECNICO_MANTENIMIENTO',
    'TEC-ELC-002',
    'Andrés Felipe Torres',
    'Técnico electricista junior. Ayudante de Carlos Ramírez. Segunda asignación en picos de carga eléctrica.',
    2,
    TRUE,
    jsonb_build_object(
      'email', 'andres.torres@esap.edu.co',
      'telefono', '+57 310 000 0002',
      'especialidades', ARRAY['ELECTRICA','LUMINARIAS','TOMACORRIENTES'],
      'fechaIngresoUMI', '2023-02-01'
    )
  ),
  (
    'TECNICO_MANTENIMIENTO',
    'TEC-GEN-001',
    'Jorge Armando Cerón',
    'Técnico general UMI. Multidisciplinar: cerrajería, pequeña fontanería, pintura, vidrios, limpieza general.',
    3,
    TRUE,
    jsonb_build_object(
      'email', 'jorge.ceron@esap.edu.co',
      'telefono', '+57 310 000 0003',
      'especialidades', ARRAY['CERRAJERIA','PINTURA','VIDRIOS','LIMPIEZA'],
      'fechaIngresoUMI', '2020-01-10'
    )
  ),
  (
    'TECNICO_MANTENIMIENTO',
    'TEC-FON-001',
    'Luis Hernán Guevara',
    'Fontanero principal. Redes sanitarias, calentadores, filtros, drenajes.',
    4,
    TRUE,
    jsonb_build_object(
      'email', 'luis.guevara@esap.edu.co',
      'telefono', '+57 310 000 0004',
      'especialidades', ARRAY['FONTANERIA','CALENTADORES','DRENAJES','FILTROS'],
      'fechaIngresoUMI', '2019-09-20'
    )
  ),
  (
    'TECNICO_MANTENIMIENTO',
    'TEC-CAR-001',
    'Hernando Alfonso Prieto',
    'Carpintero y mantenimiento de muebles y zonas comunes. Aire acondicionado split básico.',
    5,
    TRUE,
    jsonb_build_object(
      'email', 'hernando.prieto@esap.edu.co',
      'telefono', '+57 310 000 0005',
      'especialidades', ARRAY['CARPINTERIA','MUEBLES','AIRE_ACONDICIONADO_SPLIT_BASICO'],
      'fechaIngresoUMI', '2022-05-01'
    )
  )
ON CONFLICT ON CONSTRAINT uq_catalogo_item_codigo DO NOTHING;

-- ---------------------------------------------------------------------
-- Paso 4: Backfill solicitudes existentes (pre-EFDS1733).
-- Si fecha_radicacion no es nula y la fecha_limite_atencion es nula,
-- suma el valor actual del parámetro (default seed = 2 días).
-- ---------------------------------------------------------------------
DO $$
DECLARE
    v_dias int;
BEGIN
    v_dias := COALESCE(
        (SELECT (metadata->>'actual')::int
         FROM catalogo_item
         WHERE catalogo = 'PARAMETRO_UMI'
           AND codigo   = 'TIEMPO_RESPUESTA_DIAS'),
        2
    );
    v_dias := GREATEST(1, LEAST(3, v_dias));

    UPDATE solicitud_mantenimiento
       SET fecha_limite_atencion = fecha_radicacion + (v_dias::text || ' days')::interval
     WHERE fecha_radicacion IS NOT NULL
       AND fecha_limite_atencion IS NULL;
END $$;

-- ---------------------------------------------------------------------
-- Paso 5 (opcional, seguridad): ligar de una vez la REGLA_001
-- al electricista senior (Carlos Ramírez TEC-ELC-001) para que el
-- algoritmo AC-01 ya devuelva un técnico desde la primera ejecución
-- sin tener que configurar nada manualmente.
-- ON CONFLICT no aplica (no es UNIQUE sobre la pk).
-- ---------------------------------------------------------------------
UPDATE catalogo_item
   SET metadata = jsonb_set(
                    jsonb_set(metadata, '{tecnicoCodigo}', '"TEC-ELC-001"'::jsonb, TRUE),
                    '{tecnicoNombreDisplay}',
                    '"Carlos Ramírez Pineda"'::jsonb,
                    TRUE
                  )
 WHERE catalogo = 'REGLA_ESCALAMIENTO'
   AND codigo   = 'REG_001_CATEGORIA_48_ELECTRICAS'
   AND (metadata->>'tecnicoCodigo') IS NULL;
