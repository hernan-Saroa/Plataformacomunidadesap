-- ============================================================================
-- NUEVA-5a - Ciclo de vida del periodo de programación
--
-- `is_activo` es BOOLEAN y el ciclo pide TRES estados: planeacion → activo →
-- cerrado. Un booleano no distingue "cerrado" de "aún no activo".
--
-- ⚠️ SE RETIRA `is_activo` EN ESTA MISMA MIGRACIÓN, a propósito. Dejar los dos
-- campos conviviendo crea dos fuentes de verdad sobre el mismo concepto, que es
-- el patrón que costó EFDS-1536 y EFDS-1539. Una columna "deprecada" que sigue
-- funcionando es peor que una que no está: nadie la borra y alguien la lee.
--
-- Radio de impacto verificado antes de dropear (no solo por grep):
--   · lecturas de is_activo ....... 1 (ofertas.service.ts) → migrada a `estado`
--   · acumulado.service.ts ........ solo lee pp.nombre, no requiere cambio
--   · microfront .................. lee `activo` del DTO, no la columna cruda
--   · SELECT * .................... ninguno en el servicio
--   · entidades TypeORM ........... ninguna mapea periodo_programacion
--                                   (grupo.entity.ts mapea el escalar id_periodo)
--   · synchronize ................. false (TypeORM no altera el esquema)
--   · vistas en la BD ............. ninguna referencia la tabla
--   · otros microservicios ........ ninguno la referencia
--
-- ⚠️ El DROP va DESPUÉS de la 016, que inserta las 5 ofertas con is_activo. En
-- un replay desde cero el orden lo resuelve (016 inserta, 018 dropea). NO
-- retroportar el drop a la 001 ni tocar la 016, o el replay se rompe.
--
-- ⚠️ El mapeo de is_activo=false NO estaba especificado. Se mapea a
-- 'planeacion', no a 'cerrado': 'cerrado' es inmutable en NUEVA-5, y fabricar
-- registros inmutables a partir de un booleano ambiguo no se puede deshacer.
-- Hoy no se ejercita (las 5 filas están en true), pero la migración debe ser
-- determinista.
--
-- Forward-only e idempotente.
-- ============================================================================

ALTER TABLE "academic-schedule".periodo_programacion
    ADD COLUMN IF NOT EXISTS estado VARCHAR(20);

-- Backfill desde is_activo. Va por SQL dinámico y guardado por la existencia de
-- la columna: en una reejecución (ya dropeada) el UPDATE estático fallaría al
-- parsear, y la migración deja de ser idempotente.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'academic-schedule'
       AND table_name   = 'periodo_programacion'
       AND column_name  = 'is_activo'
  ) THEN
    EXECUTE $q$
      UPDATE "academic-schedule".periodo_programacion
         SET estado = CASE WHEN is_activo THEN 'activo' ELSE 'planeacion' END
       WHERE estado IS NULL
    $q$;
  END IF;
END $$;

-- Red de seguridad: filas creadas sin estado tras el drop.
UPDATE "academic-schedule".periodo_programacion
   SET estado = 'planeacion'
 WHERE estado IS NULL;

ALTER TABLE "academic-schedule".periodo_programacion
    ALTER COLUMN estado SET DEFAULT 'planeacion';

ALTER TABLE "academic-schedule".periodo_programacion
    ALTER COLUMN estado SET NOT NULL;

-- CHECK de los estados válidos, con guarda para ser idempotente.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'periodo_estado_check'
  ) THEN
    ALTER TABLE "academic-schedule".periodo_programacion
      ADD CONSTRAINT periodo_estado_check
      CHECK (estado IN ('planeacion', 'activo', 'cerrado'));
  END IF;
END $$;

COMMENT ON COLUMN "academic-schedule".periodo_programacion.estado IS
  'Ciclo de vida del periodo (NUEVA-5a): planeacion, activo o cerrado. '
  'Reemplaza a is_activo, que no podía expresar el tercer estado. '
  'Un periodo cerrado es inmutable (NUEVA-5b). '
  'OJO: "borrador" pertenece a la publicación de la programación (NUEVA-1), '
  'no al periodo: no reintroducir ese nombre aquí.';

-- Retiro de is_activo: fuente de verdad única.
ALTER TABLE "academic-schedule".periodo_programacion
    DROP COLUMN IF EXISTS is_activo;

-- Verificación en la propia migración.
DO $$
DECLARE
  v_activos   INT;
  v_total     INT;
  v_invalidos INT;
  v_is_activo INT;
BEGIN
  SELECT COUNT(*) INTO v_total   FROM "academic-schedule".periodo_programacion;
  SELECT COUNT(*) INTO v_activos FROM "academic-schedule".periodo_programacion WHERE estado = 'activo';
  SELECT COUNT(*) INTO v_invalidos
    FROM "academic-schedule".periodo_programacion
   WHERE estado NOT IN ('planeacion', 'activo', 'cerrado');
  SELECT COUNT(*) INTO v_is_activo
    FROM information_schema.columns
   WHERE table_schema = 'academic-schedule'
     AND table_name   = 'periodo_programacion'
     AND column_name  = 'is_activo';

  RAISE NOTICE '018: periodos=% activos=% invalidos=% columna_is_activo=%',
    v_total, v_activos, v_invalidos, v_is_activo;

  IF v_invalidos > 0 THEN
    RAISE EXCEPTION '018: hay % periodos con estado fuera del CHECK', v_invalidos;
  END IF;
  IF v_is_activo > 0 THEN
    RAISE EXCEPTION '018: is_activo sigue existiendo; el retiro no se aplicó';
  END IF;
END $$;
