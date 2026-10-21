-- ============================================================================
-- Lote 1 · 1.2 — Catálogo REAL de aulas de Sede Central
--
-- Reemplaza las 5 aulas provisionales de la 015 (C-4) por las 28 reales.
-- Origen: 10_aulas_catalogo.csv (24 aula, 4 auditorio).
--
-- ⚠️ Las 5 provisionales se borran POR CÓDIGO, explícitamente. Nada de TRUNCATE.
-- Verificado antes de escribir esta migración: ninguna franja las referencia
-- (franja_horaria.aula_codigo apunta a '141' y 'Aula 204', que no existen en el
-- catálogo, y no hay FK hacia aula).
--
-- ⚠️ `capacidad` queda NULL a propósito: el CSV no la trae. Se llenará por el
-- CRUD de NUEVA-6, fuera del alcance de este lote.
--
-- ⚠️ Los códigos van VERBATIM del origen ('101', 'ALFONSO LOPEZ'): son la clave
-- con la que la programación histórica referencia el salón.
--
-- Forward-only e idempotente. SQL puro: no depende de ningún runner.
-- ============================================================================

ALTER TABLE "academic-schedule".aula ADD COLUMN IF NOT EXISTS tipo         VARCHAR(20);
ALTER TABLE "academic-schedule".aula ADD COLUMN IF NOT EXISTS piso         SMALLINT;
ALTER TABLE "academic-schedule".aula ADD COLUMN IF NOT EXISTS codigo_cetap VARCHAR(20);
ALTER TABLE "academic-schedule".aula ADD COLUMN IF NOT EXISTS origen       VARCHAR(60);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'aula_tipo_check') THEN
    ALTER TABLE "academic-schedule".aula
      ADD CONSTRAINT aula_tipo_check CHECK (tipo IS NULL OR tipo IN ('aula', 'auditorio'));
  END IF;
END $$;

-- Retiro de las provisionales de la 015, una por una y solo si nadie las usa.
DO $$
DECLARE
  v_ref INT;
BEGIN
  SELECT COUNT(*) INTO v_ref
    FROM "academic-schedule".franja_horaria
   WHERE aula_codigo IN ('AULA-101','AULA-102','AULA-201','LAB-COMP-1','AUD-PRINCIPAL');

  IF v_ref > 0 THEN
    RAISE EXCEPTION '019: % franjas referencian aulas provisionales; no se borran a ciegas', v_ref;
  END IF;

  DELETE FROM "academic-schedule".aula
   WHERE codigo IN ('AULA-101','AULA-102','AULA-201','LAB-COMP-1','AUD-PRINCIPAL');
END $$;

-- Catálogo real. Idempotente por código.
INSERT INTO "academic-schedule".aula
       (codigo, nombre, tipo, piso, sede_codigo, codigo_cetap, origen, capacidad, provisional)
SELECT v.codigo, v.nombre, v.tipo, v.piso, v.sede_codigo, v.codigo_cetap, v.origen, NULL, FALSE
  FROM (VALUES
    ('101', 'Aula 101', 'aula', 1, 'SC', 'CET-0288', 'PROGRAMACION_2026-1'),
    ('102', 'Aula 102', 'aula', 1, 'SC', 'CET-0288', 'PROGRAMACION_2026-1'),
    ('103', 'Aula 103', 'aula', 1, 'SC', 'CET-0288', 'PROGRAMACION_2026-1'),
    ('104', 'Aula 104', 'aula', 1, 'SC', 'CET-0288', 'PROGRAMACION_2026-1'),
    ('105', 'Aula 105', 'aula', 1, 'SC', 'CET-0288', 'PROGRAMACION_2026-1'),
    ('106', 'Aula 106', 'aula', 1, 'SC', 'CET-0288', 'PROGRAMACION_2026-1'),
    ('107', 'Aula 107', 'aula', 1, 'SC', 'CET-0288', 'PROGRAMACION_2026-1'),
    ('108', 'Aula 108', 'aula', 1, 'SC', 'CET-0288', 'PROGRAMACION_2026-1'),
    ('201', 'Aula 201', 'aula', 2, 'SC', 'CET-0288', 'PROGRAMACION_2026-1'),
    ('202', 'Aula 202', 'aula', 2, 'SC', 'CET-0288', 'PROGRAMACION_2026-1'),
    ('203', 'Aula 203', 'aula', 2, 'SC', 'CET-0288', 'PROGRAMACION_2026-1'),
    ('204', 'Aula 204', 'aula', 2, 'SC', 'CET-0288', 'PROGRAMACION_2026-1'),
    ('205', 'Aula 205', 'aula', 2, 'SC', 'CET-0288', 'PROGRAMACION_2026-1'),
    ('206', 'Aula 206', 'aula', 2, 'SC', 'CET-0288', 'PROGRAMACION_2026-1'),
    ('207', 'Aula 207', 'aula', 2, 'SC', 'CET-0288', 'PROGRAMACION_2026-1'),
    ('208', 'Aula 208', 'aula', 2, 'SC', 'CET-0288', 'PROGRAMACION_2026-1'),
    ('301', 'Aula 301', 'aula', 3, 'SC', 'CET-0288', 'PROGRAMACION_2026-1'),
    ('302', 'Aula 302', 'aula', 3, 'SC', 'CET-0288', 'PROGRAMACION_2026-1'),
    ('303', 'Aula 303', 'aula', 3, 'SC', 'CET-0288', 'PROGRAMACION_2026-1'),
    ('304', 'Aula 304', 'aula', 3, 'SC', 'CET-0288', 'PROGRAMACION_2026-1'),
    ('305', 'Aula 305', 'aula', 3, 'SC', 'CET-0288', 'PROGRAMACION_2026-1'),
    ('306', 'Aula 306', 'aula', 3, 'SC', 'CET-0288', 'PROGRAMACION_2026-1'),
    ('307', 'Aula 307', 'aula', 3, 'SC', 'CET-0288', 'PROGRAMACION_2026-1'),
    ('308', 'Aula 308', 'aula', 3, 'SC', 'CET-0288', 'PROGRAMACION_2026-1'),
    ('ALFONSO LOPEZ', 'Auditorio ALFONSO LOPEZ', 'auditorio', NULL, 'SC', 'CET-0288', 'PROGRAMACION_2026-1'),
    ('ALBERTO LLERAS', 'Auditorio ALBERTO LLERAS', 'auditorio', NULL, 'SC', 'CET-0288', 'PROGRAMACION_2026-1'),
    ('GUILERMO NANETI', 'Auditorio GUILERMO NANETI', 'auditorio', NULL, 'SC', 'CET-0288', 'PROGRAMACION_2026-1'),
    ('CARLOS LLERAS', 'Auditorio CARLOS LLERAS', 'auditorio', NULL, 'SC', 'CET-0288', 'PROGRAMACION_2026-1')
  ) AS v(codigo, nombre, tipo, piso, sede_codigo, codigo_cetap, origen)
 WHERE NOT EXISTS (SELECT 1 FROM "academic-schedule".aula a WHERE a.codigo = v.codigo);

COMMENT ON TABLE "academic-schedule".aula IS
  'Catálogo de aulas. Desde el Lote 1 son las 28 reales de Sede Central (provisional=FALSE); capacidad pendiente del CRUD de NUEVA-6.';

-- Canario de la carga.
DO $$
DECLARE
  v_total INT; v_aulas INT; v_audit INT; v_prov INT;
BEGIN
  SELECT COUNT(*) INTO v_total FROM "academic-schedule".aula;
  SELECT COUNT(*) INTO v_aulas FROM "academic-schedule".aula WHERE tipo = 'aula';
  SELECT COUNT(*) INTO v_audit FROM "academic-schedule".aula WHERE tipo = 'auditorio';
  SELECT COUNT(*) INTO v_prov  FROM "academic-schedule".aula WHERE provisional = TRUE;

  RAISE NOTICE '019: aulas=% (aula=%, auditorio=%) provisionales=%', v_total, v_aulas, v_audit, v_prov;

  IF v_total <> 28 THEN
    RAISE EXCEPTION '019: se esperaban 28 aulas y hay %', v_total;
  END IF;
  IF v_prov > 0 THEN
    RAISE EXCEPTION '019: quedan % aulas provisionales', v_prov;
  END IF;
END $$;
