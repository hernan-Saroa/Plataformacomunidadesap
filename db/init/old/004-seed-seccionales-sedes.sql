-- =====================================================
-- SEED DATA: SECCIONALES Y SEDES DE LA ESAP
-- Relacionadas con la tabla de geopolitica
-- =====================================================
--
-- Este script crea:
-- - 18 Seccionales (una por cada territorial + Sede Central)
-- - 18 Sedes principales (una por cada seccional)
--
-- IMPORTANTE: Este script depende de:
-- - 003-seed-geopolitica-colombia.sql (debe ejecutarse primero)
-- =====================================================

-- =====================================================
-- 1. SECCIONALES
-- =====================================================

-- Sede Central - Bogotá D.C.
INSERT INTO auth.seccionales (
    id_seccional, nom_seccional, cod_seccional, dir_seccional,
    id_ubi_seccional, id_empresa, fec_creacion, usu_creacion
) VALUES (
    1, 'Sede Central', 'SCENT', 'Calle 44 No. 53-37 CAN',
    (SELECT id_geopolitica FROM auth.geopolitica WHERE nom_div_geopolitica = 'Bogotá D.C.' AND tip_division = 'CIUDAD' LIMIT 1),
    1, CURRENT_DATE, 'SYSTEM'
) ON CONFLICT (id_seccional) DO NOTHING;

-- Seccional Antioquia - Medellín
INSERT INTO auth.seccionales (
    id_seccional, nom_seccional, cod_seccional, dir_seccional,
    id_ubi_seccional, id_empresa, fec_creacion, usu_creacion
) VALUES (
    2, 'Seccional Antioquia', 'ANT', 'Calle 51 No. 45-56',
    14, -- Medellín (id_geopolitica = 14)
    1, CURRENT_DATE, 'SYSTEM'
) ON CONFLICT (id_seccional) DO NOTHING;

-- Seccional Atlántico - Barranquilla
INSERT INTO auth.seccionales (
    id_seccional, nom_seccional, cod_seccional, dir_seccional,
    id_ubi_seccional, id_empresa, fec_creacion, usu_creacion
) VALUES (
    3, 'Seccional Atlántico', 'ATL', 'Carrera 54 No. 68-196',
    148, -- Barranquilla (id_geopolitica = 148)
    1, CURRENT_DATE, 'SYSTEM'
) ON CONFLICT (id_seccional) DO NOTHING;

-- Seccional Bolívar - Cartagena
INSERT INTO auth.seccionales (
    id_seccional, nom_seccional, cod_seccional, dir_seccional,
    id_ubi_seccional, id_empresa, fec_creacion, usu_creacion
) VALUES (
    4, 'Seccional Bolívar', 'BOL', 'Centro Histórico Calle del Arsenal',
    174, -- Cartagena de Indias (id_geopolitica = 174)
    1, CURRENT_DATE, 'SYSTEM'
) ON CONFLICT (id_seccional) DO NOTHING;

-- Seccional Boyacá - Tunja
INSERT INTO auth.seccionales (
    id_seccional, nom_seccional, cod_seccional, dir_seccional,
    id_ubi_seccional, id_empresa, fec_creacion, usu_creacion
) VALUES (
    5, 'Seccional Boyacá', 'BOY', 'Calle 22 No. 10-38',
    221, -- Tunja (id_geopolitica = 221)
    1, CURRENT_DATE, 'SYSTEM'
) ON CONFLICT (id_seccional) DO NOTHING;

-- Seccional Caldas - Manizales
INSERT INTO auth.seccionales (
    id_seccional, nom_seccional, cod_seccional, dir_seccional,
    id_ubi_seccional, id_empresa, fec_creacion, usu_creacion
) VALUES (
    6, 'Seccional Caldas', 'CAL', 'Carrera 23 No. 26-45',
    345, -- Manizales (id_geopolitica = 345)
    1, CURRENT_DATE, 'SYSTEM'
) ON CONFLICT (id_seccional) DO NOTHING;

-- Seccional Cauca - Popayán
INSERT INTO auth.seccionales (
    id_seccional, nom_seccional, cod_seccional, dir_seccional,
    id_ubi_seccional, id_empresa, fec_creacion, usu_creacion
) VALUES (
    7, 'Seccional Cauca', 'CAU', 'Calle 4 No. 3-56',
    410, -- Popayán (id_geopolitica = 410)
    1, CURRENT_DATE, 'SYSTEM'
) ON CONFLICT (id_seccional) DO NOTHING;

-- Seccional Chocó - Quibdó
INSERT INTO auth.seccionales (
    id_seccional, nom_seccional, cod_seccional, dir_seccional,
    id_ubi_seccional, id_empresa, fec_creacion, usu_creacion
) VALUES (
    8, 'Seccional Chocó', 'CHO', 'Carrera 2 No. 24-30',
    479, -- Quibdó (id_geopolitica = 479)
    1, CURRENT_DATE, 'SYSTEM'
) ON CONFLICT (id_seccional) DO NOTHING;

-- Seccional Cundinamarca - Bogotá D.C.
INSERT INTO auth.seccionales (
    id_seccional, nom_seccional, cod_seccional, dir_seccional,
    id_ubi_seccional, id_empresa, fec_creacion, usu_creacion
) VALUES (
    9, 'Seccional Cundinamarca', 'CUN', 'Calle 44 No. 53-37 CAN',
    (SELECT id_geopolitica FROM auth.geopolitica WHERE nom_div_geopolitica = 'Bogotá D.C.' AND tip_division = 'CIUDAD' LIMIT 1),
    1, CURRENT_DATE, 'SYSTEM'
) ON CONFLICT (id_seccional) DO NOTHING;

-- Seccional Huila - Neiva
INSERT INTO auth.seccionales (
    id_seccional, nom_seccional, cod_seccional, dir_seccional,
    id_ubi_seccional, id_empresa, fec_creacion, usu_creacion
) VALUES (
    10, 'Seccional Huila', 'HUI', 'Carrera 5 No. 10-38',
    673, -- Neiva (id_geopolitica = 673)
    1, CURRENT_DATE, 'SYSTEM'
) ON CONFLICT (id_seccional) DO NOTHING;

-- Seccional Nariño - Pasto
INSERT INTO auth.seccionales (
    id_seccional, nom_seccional, cod_seccional, dir_seccional,
    id_ubi_seccional, id_empresa, fec_creacion, usu_creacion
) VALUES (
    11, 'Seccional Nariño', 'NAR', 'Calle 18 No. 25-37',
    788, -- Pasto (id_geopolitica = 788)
    1, CURRENT_DATE, 'SYSTEM'
) ON CONFLICT (id_seccional) DO NOTHING;

-- Seccional Norte de Santander - Cúcuta
INSERT INTO auth.seccionales (
    id_seccional, nom_seccional, cod_seccional, dir_seccional,
    id_ubi_seccional, id_empresa, fec_creacion, usu_creacion
) VALUES (
    12, 'Seccional Norte de Santander', 'NDS', 'Avenida 0 No. 12-65',
    853, -- Cúcuta (id_geopolitica = 853)
    1, CURRENT_DATE, 'SYSTEM'
) ON CONFLICT (id_seccional) DO NOTHING;

-- Seccional Quindío - Armenia
INSERT INTO auth.seccionales (
    id_seccional, nom_seccional, cod_seccional, dir_seccional,
    id_ubi_seccional, id_empresa, fec_creacion, usu_creacion
) VALUES (
    13, 'Seccional Quindío', 'QUI', 'Carrera 14 No. 20-30',
    908, -- Armenia (id_geopolitica = 908)
    1, CURRENT_DATE, 'SYSTEM'
) ON CONFLICT (id_seccional) DO NOTHING;

-- Seccional Risaralda - Pereira
INSERT INTO auth.seccionales (
    id_seccional, nom_seccional, cod_seccional, dir_seccional,
    id_ubi_seccional, id_empresa, fec_creacion, usu_creacion
) VALUES (
    14, 'Seccional Risaralda', 'RIS', 'Calle 19 No. 8-50',
    921, -- Pereira (id_geopolitica = 921)
    1, CURRENT_DATE, 'SYSTEM'
) ON CONFLICT (id_seccional) DO NOTHING;

-- Seccional Santander - Bucaramanga
INSERT INTO auth.seccionales (
    id_seccional, nom_seccional, cod_seccional, dir_seccional,
    id_ubi_seccional, id_empresa, fec_creacion, usu_creacion
) VALUES (
    15, 'Seccional Santander', 'SAN', 'Carrera 27 No. 42-43',
    939, -- Bucaramanga (id_geopolitica = 939)
    1, CURRENT_DATE, 'SYSTEM'
) ON CONFLICT (id_seccional) DO NOTHING;

-- Seccional Tolima - Ibagué
INSERT INTO auth.seccionales (
    id_seccional, nom_seccional, cod_seccional, dir_seccional,
    id_ubi_seccional, id_empresa, fec_creacion, usu_creacion
) VALUES (
    16, 'Seccional Tolima', 'TOL', 'Calle 10 No. 3-56',
    1054, -- Ibagué (id_geopolitica = 1054)
    1, CURRENT_DATE, 'SYSTEM'
) ON CONFLICT (id_seccional) DO NOTHING;

-- Seccional Valle del Cauca - Cali
INSERT INTO auth.seccionales (
    id_seccional, nom_seccional, cod_seccional, dir_seccional,
    id_ubi_seccional, id_empresa, fec_creacion, usu_creacion
) VALUES (
    17, 'Seccional Valle del Cauca', 'VAL', 'Calle 5 No. 6-63',
    1102, -- Cali (id_geopolitica = 1102)
    1, CURRENT_DATE, 'SYSTEM'
) ON CONFLICT (id_seccional) DO NOTHING;

-- Seccional Meta - Villavicencio
INSERT INTO auth.seccionales (
    id_seccional, nom_seccional, cod_seccional, dir_seccional,
    id_ubi_seccional, id_empresa, fec_creacion, usu_creacion
) VALUES (
    18, 'Seccional Meta', 'MET', 'Carrera 33 No. 37-25',
    758, -- Villavicencio (id_geopolitica = 758)
    1, CURRENT_DATE, 'SYSTEM'
) ON CONFLICT (id_seccional) DO NOTHING;


-- =====================================================
-- 2. SEDES PRINCIPALES (Territoriales)
-- =====================================================

-- Sede Principal - Bogotá D.C.
INSERT INTO auth.sedes (
    id_sede, id_empresa, cod_sede, nom_sede, id_geopolitica,
    dir_sede, id_seccional, fec_creacion, usu_creacion
) VALUES (
    1, 1, 'SCENT', 'Sede Principal ESAP',
    (SELECT id_geopolitica FROM auth.geopolitica WHERE nom_div_geopolitica = 'Bogotá D.C.' AND tip_division = 'CIUDAD' LIMIT 1),
    'Calle 44 No. 53-37 CAN',
    1, CURRENT_DATE, 'SYSTEM'
) ON CONFLICT (id_sede) DO NOTHING;

-- Sede Antioquia - Medellín
INSERT INTO auth.sedes (
    id_sede, id_empresa, cod_sede, nom_sede, id_geopolitica,
    dir_sede, id_seccional, fec_creacion, usu_creacion
) VALUES (
    2, 1, 'ANT', 'Sede Territorial Antioquia',
    14, -- Medellín
    'Calle 51 No. 45-56',
    2, CURRENT_DATE, 'SYSTEM'
) ON CONFLICT (id_sede) DO NOTHING;

-- Sede Atlántico - Barranquilla
INSERT INTO auth.sedes (
    id_sede, id_empresa, cod_sede, nom_sede, id_geopolitica,
    dir_sede, id_seccional, fec_creacion, usu_creacion
) VALUES (
    3, 1, 'ATL', 'Sede Territorial Atlántico',
    148, -- Barranquilla
    'Carrera 54 No. 68-196',
    3, CURRENT_DATE, 'SYSTEM'
) ON CONFLICT (id_sede) DO NOTHING;

-- Sede Bolívar - Cartagena
INSERT INTO auth.sedes (
    id_sede, id_empresa, cod_sede, nom_sede, id_geopolitica,
    dir_sede, id_seccional, fec_creacion, usu_creacion
) VALUES (
    4, 1, 'BOL', 'Sede Territorial Bolívar',
    174, -- Cartagena de Indias
    'Centro Histórico Calle del Arsenal',
    4, CURRENT_DATE, 'SYSTEM'
) ON CONFLICT (id_sede) DO NOTHING;

-- Sede Boyacá - Tunja
INSERT INTO auth.sedes (
    id_sede, id_empresa, cod_sede, nom_sede, id_geopolitica,
    dir_sede, id_seccional, fec_creacion, usu_creacion
) VALUES (
    5, 1, 'BOY', 'Sede Territorial Boyacá',
    221, -- Tunja
    'Calle 22 No. 10-38',
    5, CURRENT_DATE, 'SYSTEM'
) ON CONFLICT (id_sede) DO NOTHING;

-- Sede Caldas - Manizales
INSERT INTO auth.sedes (
    id_sede, id_empresa, cod_sede, nom_sede, id_geopolitica,
    dir_sede, id_seccional, fec_creacion, usu_creacion
) VALUES (
    6, 1, 'CAL', 'Sede Territorial Caldas',
    345, -- Manizales
    'Carrera 23 No. 26-45',
    6, CURRENT_DATE, 'SYSTEM'
) ON CONFLICT (id_sede) DO NOTHING;

-- Sede Cauca - Popayán
INSERT INTO auth.sedes (
    id_sede, id_empresa, cod_sede, nom_sede, id_geopolitica,
    dir_sede, id_seccional, fec_creacion, usu_creacion
) VALUES (
    7, 1, 'CAU', 'Sede Territorial Cauca',
    410, -- Popayán
    'Calle 4 No. 3-56',
    7, CURRENT_DATE, 'SYSTEM'
) ON CONFLICT (id_sede) DO NOTHING;

-- Sede Chocó - Quibdó
INSERT INTO auth.sedes (
    id_sede, id_empresa, cod_sede, nom_sede, id_geopolitica,
    dir_sede, id_seccional, fec_creacion, usu_creacion
) VALUES (
    8, 1, 'CHO', 'Sede Territorial Chocó',
    479, -- Quibdó
    'Carrera 2 No. 24-30',
    8, CURRENT_DATE, 'SYSTEM'
) ON CONFLICT (id_sede) DO NOTHING;

-- Sede Cundinamarca - Bogotá D.C.
INSERT INTO auth.sedes (
    id_sede, id_empresa, cod_sede, nom_sede, id_geopolitica,
    dir_sede, id_seccional, fec_creacion, usu_creacion
) VALUES (
    9, 1, 'CUN', 'Sede Territorial Cundinamarca',
    (SELECT id_geopolitica FROM auth.geopolitica WHERE nom_div_geopolitica = 'Bogotá D.C.' AND tip_division = 'CIUDAD' LIMIT 1),
    'Calle 44 No. 53-37 CAN',
    9, CURRENT_DATE, 'SYSTEM'
) ON CONFLICT (id_sede) DO NOTHING;

-- Sede Huila - Neiva
INSERT INTO auth.sedes (
    id_sede, id_empresa, cod_sede, nom_sede, id_geopolitica,
    dir_sede, id_seccional, fec_creacion, usu_creacion
) VALUES (
    10, 1, 'HUI', 'Sede Territorial Huila',
    673, -- Neiva
    'Carrera 5 No. 10-38',
    10, CURRENT_DATE, 'SYSTEM'
) ON CONFLICT (id_sede) DO NOTHING;

-- Sede Nariño - Pasto
INSERT INTO auth.sedes (
    id_sede, id_empresa, cod_sede, nom_sede, id_geopolitica,
    dir_sede, id_seccional, fec_creacion, usu_creacion
) VALUES (
    11, 1, 'NAR', 'Sede Territorial Nariño',
    788, -- Pasto
    'Calle 18 No. 25-37',
    11, CURRENT_DATE, 'SYSTEM'
) ON CONFLICT (id_sede) DO NOTHING;

-- Sede Norte de Santander - Cúcuta
INSERT INTO auth.sedes (
    id_sede, id_empresa, cod_sede, nom_sede, id_geopolitica,
    dir_sede, id_seccional, fec_creacion, usu_creacion
) VALUES (
    12, 1, 'NDS', 'Sede Territorial Norte de Santander',
    853, -- Cúcuta
    'Avenida 0 No. 12-65',
    12, CURRENT_DATE, 'SYSTEM'
) ON CONFLICT (id_sede) DO NOTHING;

-- Sede Quindío - Armenia
INSERT INTO auth.sedes (
    id_sede, id_empresa, cod_sede, nom_sede, id_geopolitica,
    dir_sede, id_seccional, fec_creacion, usu_creacion
) VALUES (
    13, 1, 'QUI', 'Sede Territorial Quindío',
    908, -- Armenia
    'Carrera 14 No. 20-30',
    13, CURRENT_DATE, 'SYSTEM'
) ON CONFLICT (id_sede) DO NOTHING;

-- Sede Risaralda - Pereira
INSERT INTO auth.sedes (
    id_sede, id_empresa, cod_sede, nom_sede, id_geopolitica,
    dir_sede, id_seccional, fec_creacion, usu_creacion
) VALUES (
    14, 1, 'RIS', 'Sede Territorial Risaralda',
    921, -- Pereira
    'Calle 19 No. 8-50',
    14, CURRENT_DATE, 'SYSTEM'
) ON CONFLICT (id_sede) DO NOTHING;

-- Sede Santander - Bucaramanga
INSERT INTO auth.sedes (
    id_sede, id_empresa, cod_sede, nom_sede, id_geopolitica,
    dir_sede, id_seccional, fec_creacion, usu_creacion
) VALUES (
    15, 1, 'SAN', 'Sede Territorial Santander',
    939, -- Bucaramanga
    'Carrera 27 No. 42-43',
    15, CURRENT_DATE, 'SYSTEM'
) ON CONFLICT (id_sede) DO NOTHING;

-- Sede Tolima - Ibagué
INSERT INTO auth.sedes (
    id_sede, id_empresa, cod_sede, nom_sede, id_geopolitica,
    dir_sede, id_seccional, fec_creacion, usu_creacion
) VALUES (
    16, 1, 'TOL', 'Sede Territorial Tolima',
    1054, -- Ibagué
    'Calle 10 No. 3-56',
    16, CURRENT_DATE, 'SYSTEM'
) ON CONFLICT (id_sede) DO NOTHING;

-- Sede Valle del Cauca - Cali
INSERT INTO auth.sedes (
    id_sede, id_empresa, cod_sede, nom_sede, id_geopolitica,
    dir_sede, id_seccional, fec_creacion, usu_creacion
) VALUES (
    17, 1, 'VAL', 'Sede Territorial Valle del Cauca',
    1102, -- Cali
    'Calle 5 No. 6-63',
    17, CURRENT_DATE, 'SYSTEM'
) ON CONFLICT (id_sede) DO NOTHING;

-- Sede Meta - Villavicencio
INSERT INTO auth.sedes (
    id_sede, id_empresa, cod_sede, nom_sede, id_geopolitica,
    dir_sede, id_seccional, fec_creacion, usu_creacion
) VALUES (
    18, 1, 'MET', 'Sede Territorial Meta',
    758, -- Villavicencio
    'Carrera 33 No. 37-25',
    18, CURRENT_DATE, 'SYSTEM'
) ON CONFLICT (id_sede) DO NOTHING;


-- =====================================================
-- RESUMEN DE DATOS CREADOS:
-- - 18 Seccionales (territoriales)
-- - 18 Sedes principales (una por seccional)
--
-- La estructura es:
-- Seccional (territorial) -> Sedes (ubicaciones físicas)
--
-- Cada sede tiene:
-- - id_geopolitica: Relación con la ubicación geográfica
-- - id_seccional: Relación con la seccional a la que pertenece
-- =====================================================
