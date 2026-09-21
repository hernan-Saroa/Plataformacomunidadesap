-- =====================================================================
-- EFDS-1732: Semillas de Bloques / Edificios y Espacios Físicos por sede
-- + Constraint UNIQUE (id_bloque, codigo) para idempotencia UPSERT espacio
-- Migracion 009 - Fase 3 Parametrizacion Sede > Bloque > Espacio
-- Idempotente: re-ejecutable sin errores
-- =====================================================================

SET search_path TO "infrastructure-management";

-- ---------------------------------------------------------------------
-- Paso 1: UNIQUE (id_bloque, codigo) en espacio_fisico
-- Equivalente a uq_sede_bloque en bloque_edificio.
-- Necesario para UPSERT idempotente en el seed de espacios.
-- ---------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uq_bloque_espacio'
    ) THEN
        ALTER TABLE espacio_fisico
            ADD CONSTRAINT uq_bloque_espacio UNIQUE (id_bloque, codigo);
    END IF;
END $$;

-- =====================================================================
-- Paso 2: SEED Bloques por cada sede del alcance UMI.
-- Resuelve id_sede por codigo (los codigos de sede ya existen en 001 y 003).
-- Bloques = mixto, algunos reales (Edificio A, B, Auditorio) y otros
-- descriptivos para tener volumen util en selects.
-- =====================================================================

-- (S1) SEDE-CENTRAL / Bogota D.C. ------------------------------------------------
WITH sede_ref AS (SELECT id_sede FROM sede WHERE codigo = 'SEDE-CENTRAL')
INSERT INTO bloque_edificio (id_sede, codigo, nombre, pisos, descripcion)
SELECT id_sede, v.codigo, v.nombre, v.pisos, v.descripcion
FROM sede_ref
CROSS JOIN (VALUES
    ('BLQ-A',  'Bloque A - Aulas y Auditorios',        5, 'Edificio principal de aulas, salones de clase y auditorio principal'),
    ('BLQ-B',  'Bloque B - Laboratorios',               3, 'Laboratorios de ingenieria, electronica, computo y quimica'),
    ('BLQ-C',  'Bloque C - Administrativo y Vicerrectorias', 4, 'Oficinas de direccion, coordinacion y administrativo'),
    ('BLQ-D',  'Bloque D - Biblioteca y Zona Comun',    3, 'Biblioteca, salas de estudio, cafeteria y zonas comunes'),
    ('BLQ-E',  'Bloque E - Wellbeing y Deportes',       2, 'Gimnasio, canchas cubiertas, enfermeria y salon de eventos')
) AS v(codigo, nombre, pisos, descripcion)
ON CONFLICT ON CONSTRAINT uq_sede_bloque DO NOTHING;

-- (S2) TERR-ANTIOQUIA ------------------------------------------------
WITH sede_ref AS (SELECT id_sede FROM sede WHERE codigo = 'TERR-ANTIOQUIA')
INSERT INTO bloque_edificio (id_sede, codigo, nombre, pisos, descripcion)
SELECT id_sede, v.codigo, v.nombre, v.pisos, v.descripcion
FROM sede_ref
CROSS JOIN (VALUES
    ('BLQ-1',  'Bloque Académico',                     4, 'Aulas y auditorios de la territorial'),
    ('BLQ-2',  'Bloque Laboratorios y TIC',             2, 'Laboratorios y sala de computo'),
    ('BLQ-3',  'Bloque Administrativo',                 2, 'Oficinas coordinacion territorial y atencion al publico')
) AS v(codigo, nombre, pisos, descripcion)
ON CONFLICT ON CONSTRAINT uq_sede_bloque DO NOTHING;

-- (S3) TERR-VALLE ------------------------------------------------
WITH sede_ref AS (SELECT id_sede FROM sede WHERE codigo = 'TERR-VALLE')
INSERT INTO bloque_edificio (id_sede, codigo, nombre, pisos, descripcion)
SELECT id_sede, v.codigo, v.nombre, v.pisos, v.descripcion
FROM sede_ref
CROSS JOIN (VALUES
    ('BLQ-1',  'Edificio Principal - Aulas',            4, 'Aulas, salon de actos y rectoria de la territorial'),
    ('BLQ-2',  'Edificio LABTIC',                       2, 'Laboratorios TIC e idiomas, centro de evaluacion'),
    ('BLQ-3',  'Edificio Servicios',                    1, 'Biblioteca, cafeteria y servicios generales')
) AS v(codigo, nombre, pisos, descripcion)
ON CONFLICT ON CONSTRAINT uq_sede_bloque DO NOTHING;

-- (S4) TERR-ATLANTICO ------------------------------------------------
WITH sede_ref AS (SELECT id_sede FROM sede WHERE codigo = 'TERR-ATLANTICO')
INSERT INTO bloque_edificio (id_sede, codigo, nombre, pisos, descripcion)
SELECT id_sede, v.codigo, v.nombre, v.pisos, v.descripcion
FROM sede_ref
CROSS JOIN (VALUES
    ('BLQ-1',  'Bloque de Aulas',                      3, 'Salones de clase y auditorio'),
    ('BLQ-2',  'Bloque Tecnico - Lab y CIDET',         2, 'Laboratorios y centro de investigacion'),
    ('BLQ-3',  'Modulo Administrativo',                1, 'Oficinas y control de acceso')
) AS v(codigo, nombre, pisos, descripcion)
ON CONFLICT ON CONSTRAINT uq_sede_bloque DO NOTHING;

-- (S5) TERR-SANTANDER ------------------------------------------------
WITH sede_ref AS (SELECT id_sede FROM sede WHERE codigo = 'TERR-SANTANDER')
INSERT INTO bloque_edificio (id_sede, codigo, nombre, pisos, descripcion)
SELECT id_sede, v.codigo, v.nombre, v.pisos, v.descripcion
FROM sede_ref
CROSS JOIN (VALUES
    ('BLQ-1',  'Edificio Aulico',                      4, 'Aulas, posgrados y aula magna'),
    ('BLQ-2',  'Edificio Centro de Tecnologia',        2, 'Salas sistemas, videoconferencias y laboratorio'),
    ('BLQ-3',  'Edificio B - Comun',                   1, 'Biblioteca, zona estudiantil y servicios')
) AS v(codigo, nombre, pisos, descripcion)
ON CONFLICT ON CONSTRAINT uq_sede_bloque DO NOTHING;

-- (S6) SEDE-TEUSAQUILLO ----------------------------------------------
WITH sede_ref AS (SELECT id_sede FROM sede WHERE codigo = 'SEDE-TEUSAQUILLO')
INSERT INTO bloque_edificio (id_sede, codigo, nombre, pisos, descripcion)
SELECT id_sede, v.codigo, v.nombre, v.pisos, v.descripcion
FROM sede_ref
CROSS JOIN (VALUES
    ('BLQ-TEUS-1', 'Edificio Principal',               4, 'Oficinas, aulas de diplomados y salon de eventos'),
    ('BLQ-TEUS-2', 'Anexo - Auditorio y Comedor',      2, 'Auditorio, comedor institucional y salones pequeños'),
    ('BLQ-TEUS-3', 'Modulo Administrativo - Alas',     2, 'Oficinas de direcciones de linea y coordinaciones')
) AS v(codigo, nombre, pisos, descripcion)
ON CONFLICT ON CONSTRAINT uq_sede_bloque DO NOTHING;

-- (S7) SEDE-ROSALES ----------------------------------------------
WITH sede_ref AS (SELECT id_sede FROM sede WHERE codigo = 'SEDE-ROSALES')
INSERT INTO bloque_edificio (id_sede, codigo, nombre, pisos, descripcion)
SELECT id_sede, v.codigo, v.nombre, v.pisos, v.descripcion
FROM sede_ref
CROSS JOIN (VALUES
    ('BLQ-ROS-1',  'Casa Rosales - Edificio Principal', 3, 'Casa historica: recepcion, salones VIP y oficinas de alta direccion'),
    ('BLQ-ROS-2',  'Anexo Posgrados',                    2, 'Salones de posgrado y sala de juntas'),
    ('BLQ-ROS-3',  'Lateral Servicios',                  1, 'Servicios generales, deposito y seguridad')
) AS v(codigo, nombre, pisos, descripcion)
ON CONFLICT ON CONSTRAINT uq_sede_bloque DO NOTHING;

-- =====================================================================
-- Paso 3: SEED Espacios Físicos por cada bloque (representativo).
-- Resuelve id_bloque por par (Sede.codigo, Bloque.codigo).
-- Tipos permitidos (comentario migracion 001):
--   AULA, AUDITORIO, LABORATORIO, OFICINA, BIBLIOTECA, SALA_CONSEJO
-- =====================================================================

-- Helper / macro: una funcion temporal inline no hace falta. Por cada bloque
-- se insertan ~4 a 6 espacios con codigo unico x bloque.
-- ---------------------------------------------------------------------

-- (SEDE-CENTRAL, BLQ-A)
DO $$
DECLARE
    v_id_bloque UUID;
BEGIN
    SELECT b.id_bloque INTO v_id_bloque
      FROM bloque_edificio b
      JOIN sede s ON s.id_sede = b.id_sede
     WHERE s.codigo = 'SEDE-CENTRAL' AND b.codigo = 'BLQ-A';
    IF v_id_bloque IS NULL THEN RETURN; END IF;

    INSERT INTO espacio_fisico (id_bloque, codigo, nombre, tipo, capacidad, piso) VALUES
    (v_id_bloque, 'AULA-101', 'Aula 101',              'AULA',        50, 1),
    (v_id_bloque, 'AULA-102', 'Aula 102',              'AULA',        45, 1),
    (v_id_bloque, 'AULA-201', 'Aula 201',              'AULA',        60, 2),
    (v_id_bloque, 'AULA-301', 'Aula 301 (Posgrados)',  'AULA',        40, 3),
    (v_id_bloque, 'AUD-001',  'Auditorio Principal',   'AUDITORIO',  300, 0),
    (v_id_bloque, 'SALA-JUNTAS-BLQ-A', 'Sala de Juntas BLQ-A', 'SALA_CONSEJO', 20, 2)
    ON CONFLICT ON CONSTRAINT uq_bloque_espacio DO NOTHING;
END $$;

-- (SEDE-CENTRAL, BLQ-B)
DO $$
DECLARE
    v_id_bloque UUID;
BEGIN
    SELECT b.id_bloque INTO v_id_bloque
      FROM bloque_edificio b
      JOIN sede s ON s.id_sede = b.id_sede
     WHERE s.codigo = 'SEDE-CENTRAL' AND b.codigo = 'BLQ-B';
    IF v_id_bloque IS NULL THEN RETURN; END IF;

    INSERT INTO espacio_fisico (id_bloque, codigo, nombre, tipo, capacidad, piso, tiene_computadores, tiene_videobeam) VALUES
    (v_id_bloque, 'LAB-INFO-1',  'Laboratorio Sistemas 1',  'LABORATORIO', 30, 1, true, true),
    (v_id_bloque, 'LAB-INFO-2',  'Laboratorio Sistemas 2',  'LABORATORIO', 30, 1, true, true),
    (v_id_bloque, 'LAB-ELEC',    'Laboratorio Electronica', 'LABORATORIO', 20, 2, false, false),
    (v_id_bloque, 'LAB-QUIM',    'Laboratorio Quimica',     'LABORATORIO', 25, 2, false, false),
    (v_id_bloque, 'AULA-100-B',  'Aula 100 BLQ-B',          'AULA',        40, 3, false, true)
    ON CONFLICT ON CONSTRAINT uq_bloque_espacio DO NOTHING;
END $$;

-- (SEDE-CENTRAL, BLQ-C)
DO $$
DECLARE
    v_id_bloque UUID;
BEGIN
    SELECT b.id_bloque INTO v_id_bloque
      FROM bloque_edificio b
      JOIN sede s ON s.id_sede = b.id_sede
     WHERE s.codigo = 'SEDE-CENTRAL' AND b.codigo = 'BLQ-C';
    IF v_id_bloque IS NULL THEN RETURN; END IF;

    INSERT INTO espacio_fisico (id_bloque, codigo, nombre, tipo, capacidad, piso, tiene_computadores, tiene_aire_acondicionado) VALUES
    (v_id_bloque, 'OF-RIA-101', 'Oficina Rectoria',               'OFICINA', 10, 1, true, true),
    (v_id_bloque, 'OF-UMI-201', 'Oficina UMI (Mantenimiento)',    'OFICINA',  8, 2, true, true),
    (v_id_bloque, 'OF-VIC-202', 'Oficina Vicerrectoria Academica','OFICINA',  8, 2, true, true),
    (v_id_bloque, 'OF-RH-301',  'Oficina Talento Humano',         'OFICINA', 15, 3, true, true),
    (v_id_bloque, 'SALA-CONSEJO',  'Sala de Consejo Directivo',   'SALA_CONSEJO', 30, 4, true, true)
    ON CONFLICT ON CONSTRAINT uq_bloque_espacio DO NOTHING;
END $$;

-- (SEDE-CENTRAL, BLQ-D)
DO $$
DECLARE
    v_id_bloque UUID;
BEGIN
    SELECT b.id_bloque INTO v_id_bloque
      FROM bloque_edificio b
      JOIN sede s ON s.id_sede = b.id_sede
     WHERE s.codigo = 'SEDE-CENTRAL' AND b.codigo = 'BLQ-D';
    IF v_id_bloque IS NULL THEN RETURN; END IF;

    INSERT INTO espacio_fisico (id_bloque, codigo, nombre, tipo, capacidad, piso) VALUES
    (v_id_bloque, 'BIBLIO-01', 'Biblioteca Central',            'BIBLIOTECA', 150, 1),
    (v_id_bloque, 'SALA-EST-1','Sala de Estudio 1',             'AULA',       40, 2),
    (v_id_bloque, 'SALA-EST-2','Sala de Estudio 2',             'AULA',       30, 2),
    (v_id_bloque, 'CAF-01',    'Cafeteria y Zona Comun',        'AULA',       80, 0)
    ON CONFLICT ON CONSTRAINT uq_bloque_espacio DO NOTHING;
END $$;

-- (SEDE-CENTRAL, BLQ-E)
DO $$
DECLARE
    v_id_bloque UUID;
BEGIN
    SELECT b.id_bloque INTO v_id_bloque
      FROM bloque_edificio b
      JOIN sede s ON s.id_sede = b.id_sede
     WHERE s.codigo = 'SEDE-CENTRAL' AND b.codigo = 'BLQ-E';
    IF v_id_bloque IS NULL THEN RETURN; END IF;

    INSERT INTO espacio_fisico (id_bloque, codigo, nombre, tipo, capacidad, piso) VALUES
    (v_id_bloque, 'GIM-01',    'Gimnasio Institucional',         'AUDITORIO', 200, 0),
    (v_id_bloque, 'CANC-01',   'Cancha Cubierta / Multiusos',    'AUDITORIO', 400, 0),
    (v_id_bloque, 'ENF-01',    'Enfermeria',                     'OFICINA',     8, 1),
    (v_id_bloque, 'EVT-01',    'Salon de Eventos',               'AUDITORIO', 150, 1)
    ON CONFLICT ON CONSTRAINT uq_bloque_espacio DO NOTHING;
END $$;

-- (TERRITORIALES Y SEDES ALTE: 3 espacios tipo por bloque, menos volumen)
-- Se usa una rutina generica con parametros.

-- TERR-ANTIOQUIA
DO $$
DECLARE
    v_id_bloque UUID;
BEGIN
    -- BLQ-1
    SELECT b.id_bloque INTO v_id_bloque FROM bloque_edificio b JOIN sede s ON s.id_sede=b.id_sede WHERE s.codigo='TERR-ANTIOQUIA' AND b.codigo='BLQ-1';
    IF v_id_bloque IS NOT NULL THEN
        INSERT INTO espacio_fisico (id_bloque, codigo, nombre, tipo, capacidad, piso) VALUES
        (v_id_bloque, 'AULA-101-ANT', 'Aula 101',               'AULA', 40, 1),
        (v_id_bloque, 'AULA-102-ANT', 'Aula 102',               'AULA', 40, 1),
        (v_id_bloque, 'AUD-ANT',      'Auditorio Territorial',  'AUDITORIO', 120, 0)
        ON CONFLICT ON CONSTRAINT uq_bloque_espacio DO NOTHING;
    END IF;
    -- BLQ-2
    SELECT b.id_bloque INTO v_id_bloque FROM bloque_edificio b JOIN sede s ON s.id_sede=b.id_sede WHERE s.codigo='TERR-ANTIOQUIA' AND b.codigo='BLQ-2';
    IF v_id_bloque IS NOT NULL THEN
        INSERT INTO espacio_fisico (id_bloque, codigo, nombre, tipo, capacidad, piso, tiene_computadores) VALUES
        (v_id_bloque, 'LAB-TIC-ANT',   'Laboratorio TIC',        'LABORATORIO', 25, 1, true),
        (v_id_bloque, 'LAB-MULTI-ANT', 'Laboratorio Multiusos', 'LABORATORIO', 20, 2, false),
        (v_id_bloque, 'AULA-201-ANT',  'Aula 201',              'AULA', 30, 2, false)
        ON CONFLICT ON CONSTRAINT uq_bloque_espacio DO NOTHING;
    END IF;
    -- BLQ-3
    SELECT b.id_bloque INTO v_id_bloque FROM bloque_edificio b JOIN sede s ON s.id_sede=b.id_sede WHERE s.codigo='TERR-ANTIOQUIA' AND b.codigo='BLQ-3';
    IF v_id_bloque IS NOT NULL THEN
        INSERT INTO espacio_fisico (id_bloque, codigo, nombre, tipo, capacidad, piso) VALUES
        (v_id_bloque, 'OF-COORD-ANT', 'Oficina Coordinacion',    'OFICINA',  6, 1),
        (v_id_bloque, 'OF-ATEN-ANT',  'Atencion al Ciudadano',   'OFICINA', 15, 0),
        (v_id_bloque, 'SALA-CON-ANT', 'Sala Consejo Territorial','SALA_CONSEJO', 20, 1)
        ON CONFLICT ON CONSTRAINT uq_bloque_espacio DO NOTHING;
    END IF;
END $$;

-- TERR-VALLE
DO $$
DECLARE
    v_id_bloque UUID;
BEGIN
    SELECT b.id_bloque INTO v_id_bloque FROM bloque_edificio b JOIN sede s ON s.id_sede=b.id_sede WHERE s.codigo='TERR-VALLE' AND b.codigo='BLQ-1';
    IF v_id_bloque IS NOT NULL THEN
        INSERT INTO espacio_fisico (id_bloque, codigo, nombre, tipo, capacidad, piso) VALUES
        (v_id_bloque, 'AULA-101-VAL', 'Aula 101', 'AULA', 45, 1),
        (v_id_bloque, 'AULA-201-VAL', 'Aula 201', 'AULA', 45, 2),
        (v_id_bloque, 'AUL-MAG-VAL',  'Aula Magna','AUDITORIO', 200, 0)
        ON CONFLICT ON CONSTRAINT uq_bloque_espacio DO NOTHING;
    END IF;

    SELECT b.id_bloque INTO v_id_bloque FROM bloque_edificio b JOIN sede s ON s.id_sede=b.id_sede WHERE s.codigo='TERR-VALLE' AND b.codigo='BLQ-2';
    IF v_id_bloque IS NOT NULL THEN
        INSERT INTO espacio_fisico (id_bloque, codigo, nombre, tipo, capacidad, piso, tiene_computadores) VALUES
        (v_id_bloque, 'LAB-TIC-VAL',   'Lab TIC - Sistemas',       'LABORATORIO', 30, 1, true),
        (v_id_bloque, 'LAB-IDI-VAL',   'Sala Idiomas / EVA',       'LABORATORIO', 30, 1, true),
        (v_id_bloque, 'CENT-EVAL-VAL', 'Centro de Evaluaciones',   'AULA',        40, 2, true)
        ON CONFLICT ON CONSTRAINT uq_bloque_espacio DO NOTHING;
    END IF;

    SELECT b.id_bloque INTO v_id_bloque FROM bloque_edificio b JOIN sede s ON s.id_sede=b.id_sede WHERE s.codigo='TERR-VALLE' AND b.codigo='BLQ-3';
    IF v_id_bloque IS NOT NULL THEN
        INSERT INTO espacio_fisico (id_bloque, codigo, nombre, tipo, capacidad, piso) VALUES
        (v_id_bloque, 'BIBLIO-VAL',   'Biblioteca Territorial',    'BIBLIOTECA', 80, 0),
        (v_id_bloque, 'CAFE-VAL',     'Cafeteria',                 'AULA',       50, 0),
        (v_id_bloque, 'OF-ATEN-VAL',  'Oficina Atencion',          'OFICINA',    10, 0)
        ON CONFLICT ON CONSTRAINT uq_bloque_espacio DO NOTHING;
    END IF;
END $$;

-- TERR-ATLANTICO
DO $$
DECLARE
    v_id_bloque UUID;
BEGIN
    SELECT b.id_bloque INTO v_id_bloque FROM bloque_edificio b JOIN sede s ON s.id_sede=b.id_sede WHERE s.codigo='TERR-ATLANTICO' AND b.codigo='BLQ-1';
    IF v_id_bloque IS NOT NULL THEN
        INSERT INTO espacio_fisico (id_bloque, codigo, nombre, tipo, capacidad, piso) VALUES
        (v_id_bloque, 'AULA-101-ATL', 'Aula 101', 'AULA', 40, 1),
        (v_id_bloque, 'AULA-102-ATL', 'Aula 102', 'AULA', 40, 2),
        (v_id_bloque, 'AUD-ATL',      'Auditorio', 'AUDITORIO', 150, 0)
        ON CONFLICT ON CONSTRAINT uq_bloque_espacio DO NOTHING;
    END IF;

    SELECT b.id_bloque INTO v_id_bloque FROM bloque_edificio b JOIN sede s ON s.id_sede=b.id_sede WHERE s.codigo='TERR-ATLANTICO' AND b.codigo='BLQ-2';
    IF v_id_bloque IS NOT NULL THEN
        INSERT INTO espacio_fisico (id_bloque, codigo, nombre, tipo, capacidad, piso, tiene_computadores) VALUES
        (v_id_bloque, 'LAB-TIC-ATL',   'Lab TIC',               'LABORATORIO', 25, 1, true),
        (v_id_bloque, 'LAB-INV-ATL',   'CIDET Investigacion',   'LABORATORIO', 20, 2, false),
        (v_id_bloque, 'AULA-201-ATL',  'Aula 201',              'AULA',        30, 2, false)
        ON CONFLICT ON CONSTRAINT uq_bloque_espacio DO NOTHING;
    END IF;

    SELECT b.id_bloque INTO v_id_bloque FROM bloque_edificio b JOIN sede s ON s.id_sede=b.id_sede WHERE s.codigo='TERR-ATLANTICO' AND b.codigo='BLQ-3';
    IF v_id_bloque IS NOT NULL THEN
        INSERT INTO espacio_fisico (id_bloque, codigo, nombre, tipo, capacidad, piso) VALUES
        (v_id_bloque, 'OF-COORD-ATL',  'Coordinacion',          'OFICINA',     5, 1),
        (v_id_bloque, 'OF-SEG-ATL',    'Control y Seguridad',   'OFICINA',     4, 0),
        (v_id_bloque, 'SALA-CON-ATL',  'Sala Consejo',          'SALA_CONSEJO', 20, 1)
        ON CONFLICT ON CONSTRAINT uq_bloque_espacio DO NOTHING;
    END IF;
END $$;

-- TERR-SANTANDER
DO $$
DECLARE
    v_id_bloque UUID;
BEGIN
    SELECT b.id_bloque INTO v_id_bloque FROM bloque_edificio b JOIN sede s ON s.id_sede=b.id_sede WHERE s.codigo='TERR-SANTANDER' AND b.codigo='BLQ-1';
    IF v_id_bloque IS NOT NULL THEN
        INSERT INTO espacio_fisico (id_bloque, codigo, nombre, tipo, capacidad, piso) VALUES
        (v_id_bloque, 'AULA-101-SAN', 'Aula 101', 'AULA', 40, 1),
        (v_id_bloque, 'POSGRADO-SAN', 'Aula Posgrados', 'AULA', 30, 3),
        (v_id_bloque, 'AUL-MAG-SAN',  'Aula Magna','AUDITORIO', 180, 0)
        ON CONFLICT ON CONSTRAINT uq_bloque_espacio DO NOTHING;
    END IF;

    SELECT b.id_bloque INTO v_id_bloque FROM bloque_edificio b JOIN sede s ON s.id_sede=b.id_sede WHERE s.codigo='TERR-SANTANDER' AND b.codigo='BLQ-2';
    IF v_id_bloque IS NOT NULL THEN
        INSERT INTO espacio_fisico (id_bloque, codigo, nombre, tipo, capacidad, piso, tiene_computadores, tiene_videobeam) VALUES
        (v_id_bloque, 'TELECONF-SAN', 'Salas Videoconferencias', 'LABORATORIO', 12, 1, true, true),
        (v_id_bloque, 'SALA-SIS-SAN', 'Sala Computo',             'LABORATORIO', 25, 1, true, false),
        (v_id_bloque, 'LAB-ESP-SAN',  'Laboratorio Especializado','LABORATORIO', 15, 2, false, false)
        ON CONFLICT ON CONSTRAINT uq_bloque_espacio DO NOTHING;
    END IF;

    SELECT b.id_bloque INTO v_id_bloque FROM bloque_edificio b JOIN sede s ON s.id_sede=b.id_sede WHERE s.codigo='TERR-SANTANDER' AND b.codigo='BLQ-3';
    IF v_id_bloque IS NOT NULL THEN
        INSERT INTO espacio_fisico (id_bloque, codigo, nombre, tipo, capacidad, piso) VALUES
        (v_id_bloque, 'BIBLIO-SAN',  'Biblioteca',         'BIBLIOTECA', 60, 0),
        (v_id_bloque, 'EST-SAN',     'Zona Estudiantil',   'AULA',       60, 0),
        (v_id_bloque, 'OF-COORD-SAN','Oficina Coordinacion','OFICINA',   6, 1)
        ON CONFLICT ON CONSTRAINT uq_bloque_espacio DO NOTHING;
    END IF;
END $$;

-- SEDE-TEUSAQUILLO
DO $$
DECLARE
    v_id_bloque UUID;
BEGIN
    SELECT b.id_bloque INTO v_id_bloque FROM bloque_edificio b JOIN sede s ON s.id_sede=b.id_sede WHERE s.codigo='SEDE-TEUSAQUILLO' AND b.codigo='BLQ-TEUS-1';
    IF v_id_bloque IS NOT NULL THEN
        INSERT INTO espacio_fisico (id_bloque, codigo, nombre, tipo, capacidad, piso, tiene_computadores) VALUES
        (v_id_bloque, 'OF-PRINC-TEUS',  'Oficina Principal',     'OFICINA',    10, 3, true),
        (v_id_bloque, 'AULA-DIPLOM-1',  'Aula Diplomado 1',      'AULA',       30, 2, true),
        (v_id_bloque, 'AULA-DIPLOM-2',  'Aula Diplomado 2',      'AULA',       30, 2, true),
        (v_id_bloque, 'EVENTOS-TEUS',   'Salon Eventos',         'AUDITORIO', 100, 0, false)
        ON CONFLICT ON CONSTRAINT uq_bloque_espacio DO NOTHING;
    END IF;

    SELECT b.id_bloque INTO v_id_bloque FROM bloque_edificio b JOIN sede s ON s.id_sede=b.id_sede WHERE s.codigo='SEDE-TEUSAQUILLO' AND b.codigo='BLQ-TEUS-2';
    IF v_id_bloque IS NOT NULL THEN
        INSERT INTO espacio_fisico (id_bloque, codigo, nombre, tipo, capacidad, piso, tiene_aire_acondicionado) VALUES
        (v_id_bloque, 'AUD-TEUS',       'Auditorio Anexo',       'AUDITORIO', 150, 0, true),
        (v_id_bloque, 'COMEDOR-TEUS',   'Comedor Institucional', 'AULA',      100, 0, false),
        (v_id_bloque, 'AULA-MINI-TEUS', 'Salon Pequeño',         'AULA',       20, 1, true)
        ON CONFLICT ON CONSTRAINT uq_bloque_espacio DO NOTHING;
    END IF;

    SELECT b.id_bloque INTO v_id_bloque FROM bloque_edificio b JOIN sede s ON s.id_sede=b.id_sede WHERE s.codigo='SEDE-TEUSAQUILLO' AND b.codigo='BLQ-TEUS-3';
    IF v_id_bloque IS NOT NULL THEN
        INSERT INTO espacio_fisico (id_bloque, codigo, nombre, tipo, capacidad, piso, tiene_computadores) VALUES
        (v_id_bloque, 'OF-DIR-1-TEUS', 'Oficina Dirección 1',    'OFICINA',    6, 1, true),
        (v_id_bloque, 'OF-DIR-2-TEUS', 'Oficina Dirección 2',    'OFICINA',    6, 1, true),
        (v_id_bloque, 'OF-COORD-TEUS', 'Oficina Coordinaciones', 'OFICINA',    8, 2, true),
        (v_id_bloque, 'SALA-CON-TEUS', 'Sala Juntas Alas',       'SALA_CONSEJO', 16, 2, true)
        ON CONFLICT ON CONSTRAINT uq_bloque_espacio DO NOTHING;
    END IF;
END $$;

-- SEDE-ROSALES
DO $$
DECLARE
    v_id_bloque UUID;
BEGIN
    SELECT b.id_bloque INTO v_id_bloque FROM bloque_edificio b JOIN sede s ON s.id_sede=b.id_sede WHERE s.codigo='SEDE-ROSALES' AND b.codigo='BLQ-ROS-1';
    IF v_id_bloque IS NOT NULL THEN
        INSERT INTO espacio_fisico (id_bloque, codigo, nombre, tipo, capacidad, piso, tiene_computadores, tiene_aire_acondicionado) VALUES
        (v_id_bloque, 'REC-ROS-01',   'Recepcion Casa Rosales',        'OFICINA',       4, 0, true, true),
        (v_id_bloque, 'SALA-VIP-1',   'Salon VIP / Presidente',        'SALA_CONSEJO', 16, 1, false, true),
        (v_id_bloque, 'SALA-VIP-2',   'Salon Protocolar Alto Nivel',   'SALA_CONSEJO', 30, 2, false, true),
        (v_id_bloque, 'OF-ALTA-DIR',  'Oficinas Alta Direccion',       'OFICINA',       8, 3, true, true)
        ON CONFLICT ON CONSTRAINT uq_bloque_espacio DO NOTHING;
    END IF;

    SELECT b.id_bloque INTO v_id_bloque FROM bloque_edificio b JOIN sede s ON s.id_sede=b.id_sede WHERE s.codigo='SEDE-ROSALES' AND b.codigo='BLQ-ROS-2';
    IF v_id_bloque IS NOT NULL THEN
        INSERT INTO espacio_fisico (id_bloque, codigo, nombre, tipo, capacidad, piso, tiene_computadores) VALUES
        (v_id_bloque, 'POS-ROS-101', 'Aula Posgrado 101',   'AULA',       30, 1, true),
        (v_id_bloque, 'POS-ROS-102', 'Aula Posgrado 102',   'AULA',       30, 2, true),
        (v_id_bloque, 'JUNTAS-ROS',  'Sala de Juntas',      'SALA_CONSEJO', 20, 2, true)
        ON CONFLICT ON CONSTRAINT uq_bloque_espacio DO NOTHING;
    END IF;

    SELECT b.id_bloque INTO v_id_bloque FROM bloque_edificio b JOIN sede s ON s.id_sede=b.id_sede WHERE s.codigo='SEDE-ROSALES' AND b.codigo='BLQ-ROS-3';
    IF v_id_bloque IS NOT NULL THEN
        INSERT INTO espacio_fisico (id_bloque, codigo, nombre, tipo, capacidad, piso) VALUES
        (v_id_bloque, 'SEG-ROS',      'Seguridad y Porteria', 'OFICINA',   4, 0),
        (v_id_bloque, 'DEP-ROS',      'Deposito General',     'AULA',      20, 0),
        (v_id_bloque, 'SERV-ROS',     'Servicios Generales',  'OFICINA',   6, 0)
        ON CONFLICT ON CONSTRAINT uq_bloque_espacio DO NOTHING;
    END IF;
END $$;
