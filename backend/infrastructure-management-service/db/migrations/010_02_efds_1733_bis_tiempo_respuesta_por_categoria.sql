-- =====================================================================
-- EFDS-1733 BIS (HUECO 1 RF-INF-004 L104):
-- "El tiempo de respuesta esperado POR CATEGORÍA se parametriza en 1..3
--  días (72 horas), confirmado por el área."
--
-- Antes: 1 único PARAMETRO_UMI/TIEMPO_RESPUESTA_DIAS global.
-- Ahora: 8 filas PARAMETRO_UMI/TIEMPO_RESP_DIAS_CAT_IDXX una por categoría
--        de servicio (47,48,49,50,51,52,53,54) con rango 1..3,
--        default 2 días, actual = 2 inicial.
-- Idempotente: re-ejecutable sin errores.
-- Dependencias: 010 (catalog_item schema, PARAM/REGLA/TECNICOS ya existan).
-- =====================================================================

SET search_path TO "infrastructure-management";

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema='infrastructure-management'
          AND table_name='catalogo_item'
    ) THEN
        RAISE NOTICE 'catalogo_item NO existe schema, saliendo...';
        RETURN;
    END IF;
END $$;

-- ---------------------------------------------------------------------
-- Paso 1: Borrar PARAM global único anterior SOLO si sigue siendo el
-- seed de 010 (actual=2, modificadoPor SEED_EFDS_1733) para no borrar
-- parámetros que un admin hubiese editado. Si ya se editó, nos
-- quedamos quietos, él lo migra manual.
-- ---------------------------------------------------------------------
DELETE FROM catalogo_item
 WHERE catalogo = 'PARAMETRO_UMI'
   AND codigo   = 'TIEMPO_RESPUESTA_DIAS'
   AND (metadata->>'modificadoPor') = 'SEED_EFDS_1733'
   AND (metadata->>'actual')::int = 2;

-- ---------------------------------------------------------------------
-- Paso 2: Insert 8 parámetros UNO POR CATEGORÍA (47..54).
-- Códigos: TIEMPO_RESP_DIAS_CAT_47 ... TIEMPO_RESP_DIAS_CAT_54.
-- Cada metadata: min=1 max=3 default=2 actual=2 DIAS_NATURALES +
-- liga idCategoria / codCategoriaCS / nombreCategoriaCS
-- ON CONFLICT uq_catalogo_item_codigo DO NOTHING (idempotente).
-- ---------------------------------------------------------------------
INSERT INTO catalogo_item
  (catalogo, codigo, nombre, descripcion, orden, is_activo, metadata)
SELECT
  'PARAMETRO_UMI' AS catalogo,
  'TIEMPO_RESP_DIAS_CAT_' || lpad(id_cat::text, 2, '0') AS codigo,
  'Tiempo respuesta ' || nombre_cat || ' (días naturales 1..3)' AS nombre,
  'RF-INF-004 L104: SLA categoría ' || cod_cs || '. Rango 1..3 días naturales (24-72h).'
    || ' Default 2 días según cierre 2026 UMI. Modificable desde panel parámetros UMI.'
    AS descripcion,
  100 + id_cat AS orden,
  TRUE AS is_activo,
  jsonb_build_object(
    'idCategoria', id_cat,
    'codCategoriaCS', cod_cs,
    'nombreCategoriaCS', nombre_cat,
    'min', 1,
    'max', 3,
    'default', 2,
    'actual', 2,
    'unidad', 'DIAS_NATURALES',
    'modificadoPor', 'SEED_EFDS_1733_BIS',
    'fechaModificacion', NOW()::text
  ) AS metadata
FROM (
  SELECT 47 AS id_cat, 'CS_001' AS cod_cs, 'Cerrajería y Carpintería' AS nombre_cat UNION ALL
  SELECT 48 AS id_cat, 'CS_002' AS cod_cs, 'Eléctricas y Electrónicas' UNION ALL
  SELECT 49 AS id_cat, 'CS_003' AS cod_cs, 'Adecuación de Espacios y Apoyo a Eventos' UNION ALL
  SELECT 50 AS id_cat, 'CS_004' AS cod_cs, 'Plomería y Fontanería' UNION ALL
  SELECT 51 AS id_cat, 'CS_005' AS cod_cs, 'Mantenimiento Infraestructura Física y Obras Menores' UNION ALL
  SELECT 52 AS id_cat, 'CS_006' AS cod_cs, 'Mantenimiento Zonas Exteriores y Jardinería' UNION ALL
  SELECT 53 AS id_cat, 'CS_007' AS cod_cs, 'Traslados de Mobiliario y Bienes' UNION ALL
  SELECT 54 AS id_cat, 'CS_008' AS cod_cs, 'Revisión y Mantenimiento Preventivo Equipos Críticos'
) AS catalogo8
ON CONFLICT ON CONSTRAINT uq_catalogo_item_codigo DO NOTHING;

-- ---------------------------------------------------------------------
-- Paso 3: Backfill fecha_limite_atencion para solicitudes existentes
-- que TENGAN id_categoria y fecha_limite sea NULL (o solo si quieren
-- re-calcular para TODAS, por defecto solo NULL por seguridad).
-- COALESCE: si para esa categoría NO existe parámetro (ej: idCategoria
-- NULL históricos) usamos 2 días global fallback.
-- ---------------------------------------------------------------------
DO $$
DECLARE
    filas_actualizadas int;
BEGIN
    WITH dias_por_cat AS (
        SELECT
            (metadata->>'idCategoria')::int AS id_categoria,
            GREATEST(1, LEAST(3, (metadata->>'actual')::int)) AS dias
        FROM catalogo_item
        WHERE catalogo = 'PARAMETRO_UMI'
          AND codigo LIKE 'TIEMPO_RESP_DIAS_CAT_%'
    )
    UPDATE solicitud_mantenimiento s
       SET fecha_limite_atencion = s.fecha_radicacion + (COALESCE(dc.dias, 2)::text || ' days')::interval
      FROM dias_por_cat dc
     WHERE s.id_categoria = dc.id_categoria
       AND s.fecha_radicacion IS NOT NULL
       AND s.fecha_limite_atencion IS NULL;

    GET DIAGNOSTICS filas_actualizadas = ROW_COUNT;
    RAISE NOTICE '[010_02] Backfill fecha_limite por categoria actualizadas = %', filas_actualizadas;
END $$;

-- ---------------------------------------------------------------------
-- Paso 4: Solicitudes idCategoria NULL (pre 1732 sin clasificar) →
-- fecha_limite = fecha_radicacion + 2 días si está NULL.
-- ---------------------------------------------------------------------
UPDATE solicitud_mantenimiento
   SET fecha_limite_atencion = fecha_radicacion + INTERVAL '2 days'
 WHERE id_categoria IS NULL
   AND fecha_radicacion IS NOT NULL
   AND fecha_limite_atencion IS NULL;
