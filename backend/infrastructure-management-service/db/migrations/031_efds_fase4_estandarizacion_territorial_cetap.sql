-- =============================================================================
-- EFDS-Fase 4 / Migración 031 · Estandarización Territorial Nacional y Seeder CETAP
-- Requerimiento Institucional #8: Red Nacional de Direcciones Territoriales y CETAPs
-- Ambientes: DEV, QA, PROD (todos)
-- Propósito:
--   1. DDL: Habilitar columnas id_direccion_territorial, id_cetap, ubicacion_adicional_texto
--      en solicitud_mantenimiento, y id_cetap en bloque_edificio con índices foráneos.
--   2. DDL: Liberar restricción NOT NULL en id_sede tanto en solicitud_mantenimiento como
--      en bloque_edificio para permitir la radicación fuera de Bogotá.
--   3. SEEDER: Poblado idempotente de Bloques (Principal y Bienestar) y 7 Espacios Físicos
--      para las 12 CETAPs piloto nacionales (Antioquia, Atlántico, Santander, Valle).
--   4. DML: Corrección de caracteres UTF-8 en sedes metropolitanas y territoriales.
-- =============================================================================

BEGIN;

SET search_path TO "infrastructure-management", public;

-- -----------------------------------------------------------------------------
-- 1. DDL: Extensión del Modelo en bloque_edificio
-- -----------------------------------------------------------------------------
ALTER TABLE "infrastructure-management".bloque_edificio
  ALTER COLUMN id_sede DROP NOT NULL;

ALTER TABLE "infrastructure-management".bloque_edificio
  ADD COLUMN IF NOT EXISTS id_cetap BIGINT 
    REFERENCES academic_work_plan.cetap(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_bloque_cetap 
  ON "infrastructure-management".bloque_edificio (id_cetap);

-- -----------------------------------------------------------------------------
-- 2. DDL: Extensión del Modelo en solicitud_mantenimiento
-- -----------------------------------------------------------------------------
ALTER TABLE "infrastructure-management".solicitud_mantenimiento 
  ALTER COLUMN id_sede DROP NOT NULL;

ALTER TABLE "infrastructure-management".solicitud_mantenimiento
  ADD COLUMN IF NOT EXISTS id_direccion_territorial BIGINT 
    REFERENCES academic_work_plan.direccion_territorial(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS id_cetap BIGINT 
    REFERENCES academic_work_plan.cetap(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ubicacion_adicional_texto VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_solicitud_dt 
  ON "infrastructure-management".solicitud_mantenimiento (id_direccion_territorial);

CREATE INDEX IF NOT EXISTS idx_solicitud_cetap 
  ON "infrastructure-management".solicitud_mantenimiento (id_cetap);

COMMENT ON COLUMN "infrastructure-management".solicitud_mantenimiento.id_sede IS 
  'FK a sede metropolitana de Nivel Central (Bogotá D.C.). Nullable para solicitudes de ámbito regional (CETAP / Territorial).';

COMMENT ON COLUMN "infrastructure-management".solicitud_mantenimiento.id_direccion_territorial IS 
  'FK a Dirección Territorial responsable (academic_work_plan.direccion_territorial).';

COMMENT ON COLUMN "infrastructure-management".solicitud_mantenimiento.id_cetap IS 
  'FK a CETAP municipal (academic_work_plan.cetap). Nullable si la solicitud es en Nivel Central.';

COMMENT ON COLUMN "infrastructure-management".solicitud_mantenimiento.ubicacion_adicional_texto IS 
  'Texto libre de ubicación cuando el CETAP opera bajo el mecanismo fallback (sin inventario detallado de bloques).';

-- -----------------------------------------------------------------------------
-- 3. DML: Corrección de caracteres UTF-8 en Sedes
-- -----------------------------------------------------------------------------
UPDATE "infrastructure-management".sede 
SET nombre = 'Sede Central - Bogotá D.C.' 
WHERE codigo = 'SEDE-CENTRAL' AND (nombre LIKE '%Bogot%' OR nombre LIKE '%??%');

UPDATE "infrastructure-management".sede 
SET nombre = 'Territorial Antioquia - Chocó' 
WHERE codigo = 'TERR-ANTIOQUIA' AND (nombre LIKE '%Choc%' OR nombre LIKE '%??%');

UPDATE "infrastructure-management".sede 
SET nombre = 'Territorial Atlántico - Magdalena - Cesar - Guajira' 
WHERE codigo = 'TERR-ATLANTICO' AND (nombre LIKE '%Atl%' OR nombre LIKE '%??%');

UPDATE academic_work_plan.cetap 
SET nombre = 'Apartadó' 
WHERE id = 5 AND nombre LIKE 'Apartad%';

UPDATE academic_work_plan.cetap 
SET nombre = 'Medellín' 
WHERE id = 21 AND nombre LIKE 'Medell%';

-- -----------------------------------------------------------------------------
-- 4. SEEDER IDEMPOTENTE: Bloques y Espacios Físicos para 12 CETAPs Piloto
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  r_cetap RECORD;
  v_id_blq1 UUID;
  v_id_blq2 UUID;
BEGIN
  -- 12 CETAPs piloto:
  -- DT Antioquia-Chocó: 5 (Apartadó), 8 (Caucasia), 21 (Medellín)
  -- DT Atlántico-Magdalena-Cesar-Guajira: 37 (Barranquilla), 41 (Santa Marta), 44 (Valledupar)
  -- DT Santander: 257 (Barrancabermeja), 258 (Bucaramanga), 263 (San Gil)
  -- DT Valle del Cauca: 281 (Buenaventura), 282 (Cali), 285 (Guadalajara de Buga)
  FOR r_cetap IN 
    SELECT id, nombre FROM academic_work_plan.cetap 
    WHERE id IN (5, 8, 21, 37, 41, 44, 257, 258, 263, 281, 282, 285)
  LOOP
    -- Bloque 1: Edificio Principal y Aulas
    SELECT id_bloque INTO v_id_blq1 
    FROM "infrastructure-management".bloque_edificio 
    WHERE id_cetap = r_cetap.id AND codigo = 'BLQ-01' LIMIT 1;
    
    IF v_id_blq1 IS NULL THEN
      INSERT INTO "infrastructure-management".bloque_edificio (
        codigo, nombre, pisos, descripcion, is_activo, id_cetap
      ) VALUES (
        'BLQ-01', 
        'Edificio Principal y Aulas - ' || r_cetap.nombre, 
        2, 
        'Bloque principal institucional para actividades académicas y administrativas en ' || r_cetap.nombre,
        true,
        r_cetap.id
      ) RETURNING id_bloque INTO v_id_blq1;
    ELSE
      -- Garantizar nombre estandarizado
      UPDATE "infrastructure-management".bloque_edificio
      SET nombre = 'Edificio Principal y Aulas - ' || r_cetap.nombre
      WHERE id_bloque = v_id_blq1;
    END IF;

    -- Bloque 2: Módulo de Bienestar y Servicios Comunes
    SELECT id_bloque INTO v_id_blq2 
    FROM "infrastructure-management".bloque_edificio 
    WHERE id_cetap = r_cetap.id AND codigo = 'BLQ-02' LIMIT 1;
    
    IF v_id_blq2 IS NULL THEN
      INSERT INTO "infrastructure-management".bloque_edificio (
        codigo, nombre, pisos, descripcion, is_activo, id_cetap
      ) VALUES (
        'BLQ-02', 
        'Módulo de Bienestar y Servicios Comunes - ' || r_cetap.nombre, 
        1, 
        'Instalaciones de auditorio magistral, cafetería y servicios comunitarios en ' || r_cetap.nombre,
        true,
        r_cetap.id
      ) RETURNING id_bloque INTO v_id_blq2;
    ELSE
      -- Garantizar nombre estandarizado
      UPDATE "infrastructure-management".bloque_edificio
      SET nombre = 'Módulo de Bienestar y Servicios Comunes - ' || r_cetap.nombre
      WHERE id_bloque = v_id_blq2;
    END IF;

    -- Espacios Físicos para BLQ-01 (Aulas, TIC, Oficina, Sanitarios)
    INSERT INTO "infrastructure-management".espacio_fisico (
      id_bloque, codigo, nombre, tipo, capacidad, piso, area_m2, tiene_aire_acondicionado, tiene_videobeam, tiene_computadores, estado, is_activo
    )
    SELECT v_id_blq1, 'AUL-101-' || r_cetap.id, 'Aula 101', 'AULA', 35, 1, 48.00, true, true, false, 'DISPONIBLE', true
    WHERE NOT EXISTS (SELECT 1 FROM "infrastructure-management".espacio_fisico WHERE codigo = 'AUL-101-' || r_cetap.id);

    INSERT INTO "infrastructure-management".espacio_fisico (
      id_bloque, codigo, nombre, tipo, capacidad, piso, area_m2, tiene_aire_acondicionado, tiene_videobeam, tiene_computadores, estado, is_activo
    )
    SELECT v_id_blq1, 'AUL-102-' || r_cetap.id, 'Aula 102', 'AULA', 35, 1, 48.00, true, true, false, 'DISPONIBLE', true
    WHERE NOT EXISTS (SELECT 1 FROM "infrastructure-management".espacio_fisico WHERE codigo = 'AUL-102-' || r_cetap.id);

    INSERT INTO "infrastructure-management".espacio_fisico (
      id_bloque, codigo, nombre, tipo, capacidad, piso, area_m2, tiene_aire_acondicionado, tiene_videobeam, tiene_computadores, estado, is_activo
    )
    SELECT v_id_blq1, 'LAB-TIC-' || r_cetap.id, 'Laboratorio TIC y Sistemas', 'LABORATORIO', 25, 2, 55.00, true, true, true, 'DISPONIBLE', true
    WHERE NOT EXISTS (SELECT 1 FROM "infrastructure-management".espacio_fisico WHERE codigo = 'LAB-TIC-' || r_cetap.id);

    INSERT INTO "infrastructure-management".espacio_fisico (
      id_bloque, codigo, nombre, tipo, capacidad, piso, area_m2, tiene_aire_acondicionado, tiene_videobeam, tiene_computadores, estado, is_activo
    )
    SELECT v_id_blq1, 'ADM-COR-' || r_cetap.id, 'Oficina de Coordinacion CETAP', 'OFICINA', 6, 1, 24.00, true, false, true, 'DISPONIBLE', true
    WHERE NOT EXISTS (SELECT 1 FROM "infrastructure-management".espacio_fisico WHERE codigo = 'ADM-COR-' || r_cetap.id);

    INSERT INTO "infrastructure-management".espacio_fisico (
      id_bloque, codigo, nombre, tipo, capacidad, piso, area_m2, tiene_aire_acondicionado, tiene_videobeam, tiene_computadores, estado, is_activo
    )
    SELECT v_id_blq1, 'SRV-SAN-' || r_cetap.id, 'Bateria Sanitaria Mixta', 'LOCATIVO', 4, 1, 16.00, false, false, false, 'DISPONIBLE', true
    WHERE NOT EXISTS (SELECT 1 FROM "infrastructure-management".espacio_fisico WHERE codigo = 'SRV-SAN-' || r_cetap.id);

    -- Espacios Físicos para BLQ-02 (Auditorio, Cafetería)
    INSERT INTO "infrastructure-management".espacio_fisico (
      id_bloque, codigo, nombre, tipo, capacidad, piso, area_m2, tiene_aire_acondicionado, tiene_videobeam, tiene_computadores, estado, is_activo
    )
    SELECT v_id_blq2, 'AUD-CET-' || r_cetap.id, 'Auditorio Institucional Magistral', 'AUDITORIO', 80, 1, 110.00, true, true, false, 'DISPONIBLE', true
    WHERE NOT EXISTS (SELECT 1 FROM "infrastructure-management".espacio_fisico WHERE codigo = 'AUD-CET-' || r_cetap.id);

    INSERT INTO "infrastructure-management".espacio_fisico (
      id_bloque, codigo, nombre, tipo, capacidad, piso, area_m2, tiene_aire_acondicionado, tiene_videobeam, tiene_computadores, estado, is_activo
    )
    SELECT v_id_blq2, 'CAF-COM-' || r_cetap.id, 'Cafeteria y Zona Comun', 'LOCATIVO', 30, 1, 45.00, false, false, false, 'DISPONIBLE', true
    WHERE NOT EXISTS (SELECT 1 FROM "infrastructure-management".espacio_fisico WHERE codigo = 'CAF-COM-' || r_cetap.id);

  END LOOP;
END $$;

COMMIT;
