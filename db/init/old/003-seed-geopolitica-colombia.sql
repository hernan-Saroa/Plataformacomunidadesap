-- =====================================================
-- SEED DATA: GEOPOLÍTICA DE COLOMBIA
-- 32 Departamentos y 1122 Municipios
-- Adaptado a la estructura de auth.geopolitica
-- =====================================================


-- ============================================
-- AMAZONAS (Código 91)
-- 11 municipios
-- ============================================

-- Departamento: Amazonas
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento,
    nom_div_geopolitica, tip_division, ind_oculto, fec_creacion, usu_creacion
) VALUES (
    1, '91', 170, 91,
    'Amazonas', 'DEPTO', 0, CURRENT_DATE, 'SYSTEM'
);

-- Municipios de Amazonas
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    2, '91001', 170, 91, 1,
    'Leticia', 'CIUDAD', 0, 1, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    3, '91263', 170, 91, 263,
    'El Encanto', 'CIUDAD', 0, 1, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    4, '91405', 170, 91, 405,
    'La Chorrera', 'CIUDAD', 0, 1, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    5, '91407', 170, 91, 407,
    'La Pedrera', 'CIUDAD', 0, 1, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    6, '91430', 170, 91, 430,
    'La Victoria', 'CIUDAD', 0, 1, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    7, '91460', 170, 91, 460,
    'Miriti - Paraná', 'CIUDAD', 0, 1, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    8, '91530', 170, 91, 530,
    'Puerto Alegría', 'CIUDAD', 0, 1, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    9, '91536', 170, 91, 536,
    'Puerto Arica', 'CIUDAD', 0, 1, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    10, '91540', 170, 91, 540,
    'Puerto Nariño', 'CIUDAD', 0, 1, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    11, '91669', 170, 91, 669,
    'Puerto Santander', 'CIUDAD', 0, 1, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    12, '91798', 170, 91, 798,
    'Tarapacá', 'CIUDAD', 0, 1, CURRENT_DATE, 'SYSTEM'
);


-- ============================================
-- ANTIOQUIA (Código 05)
-- 125 municipios
-- ============================================

-- Departamento: Antioquia
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento,
    nom_div_geopolitica, tip_division, ind_oculto, fec_creacion, usu_creacion
) VALUES (
    13, '05', 170, 5,
    'Antioquia', 'DEPTO', 0, CURRENT_DATE, 'SYSTEM'
);

-- Municipios de Antioquia
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    14, '05001', 170, 5, 1,
    'Medellín', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    15, '05002', 170, 5, 2,
    'Abejorral', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    16, '05004', 170, 5, 4,
    'Abriaquí', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    17, '05021', 170, 5, 21,
    'Alejandría', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    18, '05030', 170, 5, 30,
    'Amagá', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    19, '05031', 170, 5, 31,
    'Amalfi', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    20, '05034', 170, 5, 34,
    'Andes', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    21, '05036', 170, 5, 36,
    'Angelópolis', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    22, '05038', 170, 5, 38,
    'Angostura', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    23, '05040', 170, 5, 40,
    'Anorí', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    24, '05042', 170, 5, 42,
    'Santafé de Antioquia', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    25, '05044', 170, 5, 44,
    'Anza', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    26, '05045', 170, 5, 45,
    'Apartadó', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    27, '05051', 170, 5, 51,
    'Arboletes', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    28, '05055', 170, 5, 55,
    'Argelia', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    29, '05059', 170, 5, 59,
    'Armenia', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    30, '05079', 170, 5, 79,
    'Barbosa', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    31, '05086', 170, 5, 86,
    'Belmira', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    32, '05088', 170, 5, 88,
    'Bello', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    33, '05091', 170, 5, 91,
    'Betania', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    34, '05093', 170, 5, 93,
    'Betulia', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    35, '05101', 170, 5, 101,
    'Ciudad Bolívar', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    36, '05107', 170, 5, 107,
    'Briceño', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    37, '05113', 170, 5, 113,
    'Buriticá', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    38, '05120', 170, 5, 120,
    'Cáceres', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    39, '05125', 170, 5, 125,
    'Caicedo', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    40, '05129', 170, 5, 129,
    'Caldas', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    41, '05134', 170, 5, 134,
    'Campamento', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    42, '05138', 170, 5, 138,
    'Cañasgordas', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    43, '05142', 170, 5, 142,
    'Caracolí', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    44, '05145', 170, 5, 145,
    'Caramanta', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    45, '05147', 170, 5, 147,
    'Carepa', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    46, '05148', 170, 5, 148,
    'El Carmen de Viboral', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    47, '05150', 170, 5, 150,
    'Carolina', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    48, '05154', 170, 5, 154,
    'Caucasia', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    49, '05172', 170, 5, 172,
    'Chigorodó', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    50, '05190', 170, 5, 190,
    'Cisneros', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    51, '05197', 170, 5, 197,
    'Cocorná', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    52, '05206', 170, 5, 206,
    'Concepción', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    53, '05209', 170, 5, 209,
    'Concordia', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    54, '05212', 170, 5, 212,
    'Copacabana', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    55, '05234', 170, 5, 234,
    'Dabeiba', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    56, '05237', 170, 5, 237,
    'Donmatías', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    57, '05240', 170, 5, 240,
    'Ebéjico', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    58, '05250', 170, 5, 250,
    'El Bagre', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    59, '05264', 170, 5, 264,
    'Entrerríos', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    60, '05266', 170, 5, 266,
    'Envigado', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    61, '05282', 170, 5, 282,
    'Fredonia', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    62, '05284', 170, 5, 284,
    'Frontino', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    63, '05306', 170, 5, 306,
    'Giraldo', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    64, '05308', 170, 5, 308,
    'Girardota', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    65, '05310', 170, 5, 310,
    'Gómez Plata', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    66, '05313', 170, 5, 313,
    'Granada', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    67, '05315', 170, 5, 315,
    'Guadalupe', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    68, '05318', 170, 5, 318,
    'Guarne', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    69, '05321', 170, 5, 321,
    'Guatapé', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    70, '05347', 170, 5, 347,
    'Heliconia', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    71, '05353', 170, 5, 353,
    'Hispania', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    72, '05360', 170, 5, 360,
    'Itagüí', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    73, '05361', 170, 5, 361,
    'Ituango', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    74, '05364', 170, 5, 364,
    'Jardín', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    75, '05368', 170, 5, 368,
    'Jericó', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    76, '05376', 170, 5, 376,
    'La Ceja', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    77, '05380', 170, 5, 380,
    'La Estrella', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    78, '05390', 170, 5, 390,
    'La Pintada', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    79, '05400', 170, 5, 400,
    'La Unión', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    80, '05411', 170, 5, 411,
    'Liborina', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    81, '05425', 170, 5, 425,
    'Maceo', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    82, '05440', 170, 5, 440,
    'Marinilla', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    83, '05467', 170, 5, 467,
    'Montebello', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    84, '05475', 170, 5, 475,
    'Murindó', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    85, '05480', 170, 5, 480,
    'Mutatá', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    86, '05483', 170, 5, 483,
    'Nariño', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    87, '05490', 170, 5, 490,
    'Necoclí', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    88, '05495', 170, 5, 495,
    'Nechí', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    89, '05501', 170, 5, 501,
    'Olaya', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    90, '05541', 170, 5, 541,
    'Peñol', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    91, '05543', 170, 5, 543,
    'Peque', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    92, '05576', 170, 5, 576,
    'Pueblorrico', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    93, '05579', 170, 5, 579,
    'Puerto Berrío', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    94, '05585', 170, 5, 585,
    'Puerto Nare', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    95, '05591', 170, 5, 591,
    'Puerto Triunfo', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    96, '05604', 170, 5, 604,
    'Remedios', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    97, '05607', 170, 5, 607,
    'Retiro', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    98, '05615', 170, 5, 615,
    'Rionegro', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    99, '05628', 170, 5, 628,
    'Sabanalarga', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    100, '05631', 170, 5, 631,
    'Sabaneta', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    101, '05642', 170, 5, 642,
    'Salgar', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    102, '05647', 170, 5, 647,
    'San Andrés de Cuerquia', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    103, '05649', 170, 5, 649,
    'San Carlos', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    104, '05652', 170, 5, 652,
    'San Francisco', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    105, '05656', 170, 5, 656,
    'San Jerónimo', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    106, '05658', 170, 5, 658,
    'San José de La Montaña', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    107, '05659', 170, 5, 659,
    'San Juan de Urabá', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    108, '05660', 170, 5, 660,
    'San Luis', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    109, '05664', 170, 5, 664,
    'San Pedro de Los Milagros', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    110, '05665', 170, 5, 665,
    'San Pedro de Urabá', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    111, '05667', 170, 5, 667,
    'San Rafael', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    112, '05670', 170, 5, 670,
    'San Roque', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    113, '05674', 170, 5, 674,
    'San Vicente Ferrer', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    114, '05679', 170, 5, 679,
    'Santa Bárbara', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    115, '05686', 170, 5, 686,
    'Santa Rosa de Osos', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    116, '05690', 170, 5, 690,
    'Santo Domingo', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    117, '05697', 170, 5, 697,
    'El Santuario', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    118, '05736', 170, 5, 736,
    'Segovia', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    119, '05756', 170, 5, 756,
    'Sonsón', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    120, '05761', 170, 5, 761,
    'Sopetrán', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    121, '05789', 170, 5, 789,
    'Támesis', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    122, '05790', 170, 5, 790,
    'Tarazá', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    123, '05792', 170, 5, 792,
    'Tarso', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    124, '05809', 170, 5, 809,
    'Titiribí', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    125, '05819', 170, 5, 819,
    'Toledo', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    126, '05837', 170, 5, 837,
    'Turbo', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    127, '05842', 170, 5, 842,
    'Uramita', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    128, '05847', 170, 5, 847,
    'Urrao', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    129, '05854', 170, 5, 854,
    'Valdivia', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    130, '05856', 170, 5, 856,
    'Valparaíso', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    131, '05858', 170, 5, 858,
    'Vegachí', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    132, '05861', 170, 5, 861,
    'Venecia', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    133, '05873', 170, 5, 873,
    'Vigía del Fuerte', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    134, '05885', 170, 5, 885,
    'Yalí', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    135, '05887', 170, 5, 887,
    'Yarumal', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    136, '05890', 170, 5, 890,
    'Yolombó', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    137, '05893', 170, 5, 893,
    'Yondó', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    138, '05895', 170, 5, 895,
    'Zaragoza', 'CIUDAD', 0, 13, CURRENT_DATE, 'SYSTEM'
);


-- ============================================
-- ARAUCA (Código 81)
-- 7 municipios
-- ============================================

-- Departamento: Arauca
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento,
    nom_div_geopolitica, tip_division, ind_oculto, fec_creacion, usu_creacion
) VALUES (
    139, '81', 170, 81,
    'Arauca', 'DEPTO', 0, CURRENT_DATE, 'SYSTEM'
);

-- Municipios de Arauca
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    140, '81001', 170, 81, 1,
    'Arauca', 'CIUDAD', 0, 139, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    141, '81065', 170, 81, 65,
    'Arauquita', 'CIUDAD', 0, 139, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    142, '81220', 170, 81, 220,
    'Cravo Norte', 'CIUDAD', 0, 139, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    143, '81300', 170, 81, 300,
    'Fortul', 'CIUDAD', 0, 139, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    144, '81591', 170, 81, 591,
    'Puerto Rondón', 'CIUDAD', 0, 139, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    145, '81736', 170, 81, 736,
    'Saravena', 'CIUDAD', 0, 139, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    146, '81794', 170, 81, 794,
    'Tame', 'CIUDAD', 0, 139, CURRENT_DATE, 'SYSTEM'
);


-- ============================================
-- ATLÁNTICO (Código 08)
-- 23 municipios
-- ============================================

-- Departamento: Atlántico
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento,
    nom_div_geopolitica, tip_division, ind_oculto, fec_creacion, usu_creacion
) VALUES (
    147, '08', 170, 8,
    'Atlántico', 'DEPTO', 0, CURRENT_DATE, 'SYSTEM'
);

-- Municipios de Atlántico
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    148, '08001', 170, 8, 1,
    'Barranquilla', 'CIUDAD', 0, 147, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    149, '08078', 170, 8, 78,
    'Baranoa', 'CIUDAD', 0, 147, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    150, '08137', 170, 8, 137,
    'Campo de La Cruz', 'CIUDAD', 0, 147, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    151, '08141', 170, 8, 141,
    'Candelaria', 'CIUDAD', 0, 147, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    152, '08296', 170, 8, 296,
    'Galapa', 'CIUDAD', 0, 147, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    153, '08372', 170, 8, 372,
    'Juan de Acosta', 'CIUDAD', 0, 147, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    154, '08421', 170, 8, 421,
    'Luruaco', 'CIUDAD', 0, 147, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    155, '08433', 170, 8, 433,
    'Malambo', 'CIUDAD', 0, 147, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    156, '08436', 170, 8, 436,
    'Manatí', 'CIUDAD', 0, 147, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    157, '08520', 170, 8, 520,
    'Palmar de Varela', 'CIUDAD', 0, 147, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    158, '08549', 170, 8, 549,
    'Piojó', 'CIUDAD', 0, 147, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    159, '08558', 170, 8, 558,
    'Polonuevo', 'CIUDAD', 0, 147, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    160, '08560', 170, 8, 560,
    'Ponedera', 'CIUDAD', 0, 147, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    161, '08573', 170, 8, 573,
    'Puerto Colombia', 'CIUDAD', 0, 147, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    162, '08606', 170, 8, 606,
    'Repelón', 'CIUDAD', 0, 147, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    163, '08634', 170, 8, 634,
    'Sabanagrande', 'CIUDAD', 0, 147, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    164, '08638', 170, 8, 638,
    'Sabanalarga', 'CIUDAD', 0, 147, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    165, '08675', 170, 8, 675,
    'Santa Lucía', 'CIUDAD', 0, 147, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    166, '08685', 170, 8, 685,
    'Santo Tomás', 'CIUDAD', 0, 147, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    167, '08758', 170, 8, 758,
    'Soledad', 'CIUDAD', 0, 147, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    168, '08770', 170, 8, 770,
    'Suan', 'CIUDAD', 0, 147, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    169, '08832', 170, 8, 832,
    'Tubará', 'CIUDAD', 0, 147, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    170, '08849', 170, 8, 849,
    'Usiacurí', 'CIUDAD', 0, 147, CURRENT_DATE, 'SYSTEM'
);


-- ============================================
-- BOGOTÁ D.C. (Código 11)
-- 1 municipios
-- ============================================

-- Departamento: Bogotá D.C.
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento,
    nom_div_geopolitica, tip_division, ind_oculto, fec_creacion, usu_creacion
) VALUES (
    171, '11', 170, 11,
    'Bogotá D.C.', 'DEPTO', 0, CURRENT_DATE, 'SYSTEM'
);

-- Municipios de Bogotá D.C.
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    172, '11001', 170, 11, 1,
    'Bogotá D.C.', 'CIUDAD', 0, 171, CURRENT_DATE, 'SYSTEM'
);


-- ============================================
-- BOLÍVAR (Código 13)
-- 46 municipios
-- ============================================

-- Departamento: Bolívar
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento,
    nom_div_geopolitica, tip_division, ind_oculto, fec_creacion, usu_creacion
) VALUES (
    173, '13', 170, 13,
    'Bolívar', 'DEPTO', 0, CURRENT_DATE, 'SYSTEM'
);

-- Municipios de Bolívar
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    174, '13001', 170, 13, 1,
    'Cartagena de Indias', 'CIUDAD', 0, 173, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    175, '13006', 170, 13, 6,
    'Achí', 'CIUDAD', 0, 173, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    176, '13030', 170, 13, 30,
    'Altos del Rosario', 'CIUDAD', 0, 173, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    177, '13042', 170, 13, 42,
    'Arenal', 'CIUDAD', 0, 173, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    178, '13052', 170, 13, 52,
    'Arjona', 'CIUDAD', 0, 173, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    179, '13062', 170, 13, 62,
    'Arroyohondo', 'CIUDAD', 0, 173, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    180, '13074', 170, 13, 74,
    'Barranco de Loba', 'CIUDAD', 0, 173, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    181, '13140', 170, 13, 140,
    'Calamar', 'CIUDAD', 0, 173, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    182, '13160', 170, 13, 160,
    'Cantagallo', 'CIUDAD', 0, 173, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    183, '13188', 170, 13, 188,
    'Cicuco', 'CIUDAD', 0, 173, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    184, '13212', 170, 13, 212,
    'Córdoba', 'CIUDAD', 0, 173, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    185, '13222', 170, 13, 222,
    'Clemencia', 'CIUDAD', 0, 173, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    186, '13244', 170, 13, 244,
    'El Carmen de Bolívar', 'CIUDAD', 0, 173, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    187, '13248', 170, 13, 248,
    'El Guamo', 'CIUDAD', 0, 173, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    188, '13268', 170, 13, 268,
    'El Peñón', 'CIUDAD', 0, 173, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    189, '13300', 170, 13, 300,
    'Hatillo de Loba', 'CIUDAD', 0, 173, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    190, '13430', 170, 13, 430,
    'Magangué', 'CIUDAD', 0, 173, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    191, '13433', 170, 13, 433,
    'Mahates', 'CIUDAD', 0, 173, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    192, '13440', 170, 13, 440,
    'Margarita', 'CIUDAD', 0, 173, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    193, '13442', 170, 13, 442,
    'María La Baja', 'CIUDAD', 0, 173, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    194, '13468', 170, 13, 468,
    'Montecristo', 'CIUDAD', 0, 173, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    195, '13468', 170, 13, 468,
    'Mompós', 'CIUDAD', 0, 173, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    196, '13490', 170, 13, 490,
    'Morales', 'CIUDAD', 0, 173, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    197, '13490', 170, 13, 490,
    'Norosí', 'CIUDAD', 0, 173, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    198, '13549', 170, 13, 549,
    'Pinillos', 'CIUDAD', 0, 173, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    199, '13580', 170, 13, 580,
    'Regidor', 'CIUDAD', 0, 173, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    200, '13600', 170, 13, 600,
    'Río Viejo', 'CIUDAD', 0, 173, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    201, '13620', 170, 13, 620,
    'San Cristóbal', 'CIUDAD', 0, 173, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    202, '13647', 170, 13, 647,
    'San Estanislao', 'CIUDAD', 0, 173, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    203, '13650', 170, 13, 650,
    'San Fernando', 'CIUDAD', 0, 173, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    204, '13654', 170, 13, 654,
    'San Jacinto', 'CIUDAD', 0, 173, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    205, '13655', 170, 13, 655,
    'San Jacinto del Cauca', 'CIUDAD', 0, 173, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    206, '13657', 170, 13, 657,
    'San Juan Nepomuceno', 'CIUDAD', 0, 173, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    207, '13667', 170, 13, 667,
    'San Martín de Loba', 'CIUDAD', 0, 173, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    208, '13670', 170, 13, 670,
    'San Pablo', 'CIUDAD', 0, 173, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    209, '13673', 170, 13, 673,
    'Santa Catalina', 'CIUDAD', 0, 173, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    210, '13683', 170, 13, 683,
    'Santa Rosa', 'CIUDAD', 0, 173, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    211, '13688', 170, 13, 688,
    'Santa Rosa del Sur', 'CIUDAD', 0, 173, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    212, '13744', 170, 13, 744,
    'Simití', 'CIUDAD', 0, 173, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    213, '13760', 170, 13, 760,
    'Soplaviento', 'CIUDAD', 0, 173, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    214, '13780', 170, 13, 780,
    'Talaigua Nuevo', 'CIUDAD', 0, 173, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    215, '13810', 170, 13, 810,
    'Tiquisio', 'CIUDAD', 0, 173, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    216, '13836', 170, 13, 836,
    'Turbaco', 'CIUDAD', 0, 173, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    217, '13838', 170, 13, 838,
    'Turbaná', 'CIUDAD', 0, 173, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    218, '13873', 170, 13, 873,
    'Villanueva', 'CIUDAD', 0, 173, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    219, '13894', 170, 13, 894,
    'Zambrano', 'CIUDAD', 0, 173, CURRENT_DATE, 'SYSTEM'
);


-- ============================================
-- BOYACÁ (Código 15)
-- 123 municipios
-- ============================================

-- Departamento: Boyacá
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento,
    nom_div_geopolitica, tip_division, ind_oculto, fec_creacion, usu_creacion
) VALUES (
    220, '15', 170, 15,
    'Boyacá', 'DEPTO', 0, CURRENT_DATE, 'SYSTEM'
);

-- Municipios de Boyacá
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    221, '15001', 170, 15, 1,
    'Tunja', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    222, '15022', 170, 15, 22,
    'Almeida', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    223, '15047', 170, 15, 47,
    'Aquitania', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    224, '15051', 170, 15, 51,
    'Arcabuco', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    225, '15087', 170, 15, 87,
    'Belén', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    226, '15090', 170, 15, 90,
    'Berbeo', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    227, '15092', 170, 15, 92,
    'Betéitiva', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    228, '15097', 170, 15, 97,
    'Boavita', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    229, '15104', 170, 15, 104,
    'Boyacá', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    230, '15106', 170, 15, 106,
    'Briceño', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    231, '15109', 170, 15, 109,
    'Buenavista', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    232, '15114', 170, 15, 114,
    'Busbanzá', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    233, '15131', 170, 15, 131,
    'Caldas', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    234, '15135', 170, 15, 135,
    'Campohermoso', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    235, '15162', 170, 15, 162,
    'Cerinza', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    236, '15172', 170, 15, 172,
    'Chinavita', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    237, '15176', 170, 15, 176,
    'Chiquinquirá', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    238, '15180', 170, 15, 180,
    'Chiscas', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    239, '15183', 170, 15, 183,
    'Chita', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    240, '15185', 170, 15, 185,
    'Chitaraque', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    241, '15187', 170, 15, 187,
    'Chivatá', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    242, '15189', 170, 15, 189,
    'Ciénega', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    243, '15204', 170, 15, 204,
    'Cómbita', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    244, '15212', 170, 15, 212,
    'Coper', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    245, '15215', 170, 15, 215,
    'Corrales', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    246, '15218', 170, 15, 218,
    'Covarachía', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    247, '15223', 170, 15, 223,
    'Cubará', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    248, '15224', 170, 15, 224,
    'Cucaita', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    249, '15226', 170, 15, 226,
    'Cuítiva', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    250, '15232', 170, 15, 232,
    'Chíquiza', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    251, '15236', 170, 15, 236,
    'Chivor', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    252, '15238', 170, 15, 238,
    'Duitama', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    253, '15244', 170, 15, 244,
    'El Cocuy', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    254, '15248', 170, 15, 248,
    'El Espino', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    255, '15272', 170, 15, 272,
    'Firavitoba', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    256, '15276', 170, 15, 276,
    'Floresta', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    257, '15293', 170, 15, 293,
    'Gachantivá', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    258, '15296', 170, 15, 296,
    'Gámeza', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    259, '15299', 170, 15, 299,
    'Garagoa', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    260, '15317', 170, 15, 317,
    'Guacamayas', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    261, '15322', 170, 15, 322,
    'Guateque', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    262, '15325', 170, 15, 325,
    'Guayatá', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    263, '15332', 170, 15, 332,
    'Güicán de la Sierra', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    264, '15362', 170, 15, 362,
    'Iza', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    265, '15367', 170, 15, 367,
    'Jenesano', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    266, '15368', 170, 15, 368,
    'Jericó', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    267, '15377', 170, 15, 377,
    'Labranzagrande', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    268, '15380', 170, 15, 380,
    'La Capilla', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    269, '15401', 170, 15, 401,
    'La Victoria', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    270, '15403', 170, 15, 403,
    'La Uvita', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    271, '15407', 170, 15, 407,
    'Villa de Leyva', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    272, '15425', 170, 15, 425,
    'Macanal', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    273, '15442', 170, 15, 442,
    'Maripí', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    274, '15455', 170, 15, 455,
    'Miraflores', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    275, '15464', 170, 15, 464,
    'Mongua', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    276, '15466', 170, 15, 466,
    'Monguí', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    277, '15469', 170, 15, 469,
    'Moniquirá', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    278, '15476', 170, 15, 476,
    'Motavita', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    279, '15480', 170, 15, 480,
    'Muzo', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    280, '15491', 170, 15, 491,
    'Nobsa', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    281, '15494', 170, 15, 494,
    'Nuevo Colón', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    282, '15500', 170, 15, 500,
    'Oicatá', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    283, '15507', 170, 15, 507,
    'Otanche', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    284, '15511', 170, 15, 511,
    'Pachavita', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    285, '15514', 170, 15, 514,
    'Páez', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    286, '15516', 170, 15, 516,
    'Paipa', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    287, '15518', 170, 15, 518,
    'Pajarito', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    288, '15522', 170, 15, 522,
    'Panqueba', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    289, '15531', 170, 15, 531,
    'Pauna', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    290, '15533', 170, 15, 533,
    'Paya', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    291, '15537', 170, 15, 537,
    'Paz de Río', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    292, '15542', 170, 15, 542,
    'Pesca', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    293, '15550', 170, 15, 550,
    'Pisba', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    294, '15572', 170, 15, 572,
    'Puerto Boyacá', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    295, '15580', 170, 15, 580,
    'Quípama', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    296, '15599', 170, 15, 599,
    'Ramiriquí', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    297, '15600', 170, 15, 600,
    'Ráquira', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    298, '15621', 170, 15, 621,
    'Rondón', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    299, '15632', 170, 15, 632,
    'Saboyá', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    300, '15638', 170, 15, 638,
    'Sáchica', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    301, '15646', 170, 15, 646,
    'Samacá', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    302, '15660', 170, 15, 660,
    'San Eduardo', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    303, '15664', 170, 15, 664,
    'San José de Pare', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    304, '15667', 170, 15, 667,
    'San Luis de Gaceno', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    305, '15673', 170, 15, 673,
    'San Mateo', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    306, '15676', 170, 15, 676,
    'San Miguel de Sema', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    307, '15681', 170, 15, 681,
    'San Pablo de Borbur', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    308, '15686', 170, 15, 686,
    'Santana', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    309, '15690', 170, 15, 690,
    'Santa María', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    310, '15693', 170, 15, 693,
    'Santa Rosa de Viterbo', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    311, '15696', 170, 15, 696,
    'Santa Sofía', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    312, '15720', 170, 15, 720,
    'Sativanorte', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    313, '15723', 170, 15, 723,
    'Sativasur', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    314, '15740', 170, 15, 740,
    'Siachoque', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    315, '15753', 170, 15, 753,
    'Soatá', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    316, '15755', 170, 15, 755,
    'Socotá', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    317, '15757', 170, 15, 757,
    'Socha', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    318, '15759', 170, 15, 759,
    'Sogamoso', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    319, '15761', 170, 15, 761,
    'Somondoco', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    320, '15762', 170, 15, 762,
    'Sora', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    321, '15763', 170, 15, 763,
    'Sotaquirá', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    322, '15764', 170, 15, 764,
    'Soraca', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    323, '15774', 170, 15, 774,
    'Susacón', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    324, '15776', 170, 15, 776,
    'Sutamarchán', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    325, '15778', 170, 15, 778,
    'Sutatenza', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    326, '15790', 170, 15, 790,
    'Tasco', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    327, '15798', 170, 15, 798,
    'Tenza', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    328, '15804', 170, 15, 804,
    'Tibaná', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    329, '15806', 170, 15, 806,
    'Tibasosa', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    330, '15808', 170, 15, 808,
    'Tinjacá', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    331, '15810', 170, 15, 810,
    'Tipacoque', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    332, '15814', 170, 15, 814,
    'Toca', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    333, '15816', 170, 15, 816,
    'Togüí', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    334, '15820', 170, 15, 820,
    'Tópaga', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    335, '15822', 170, 15, 822,
    'Tota', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    336, '15832', 170, 15, 832,
    'Tununguá', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    337, '15835', 170, 15, 835,
    'Turmequé', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    338, '15837', 170, 15, 837,
    'Tuta', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    339, '15839', 170, 15, 839,
    'Tutazá', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    340, '15842', 170, 15, 842,
    'Umbita', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    341, '15861', 170, 15, 861,
    'Ventaquemada', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    342, '15879', 170, 15, 879,
    'Viracachá', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    343, '15897', 170, 15, 897,
    'Zetaquira', 'CIUDAD', 0, 220, CURRENT_DATE, 'SYSTEM'
);


-- ============================================
-- CALDAS (Código 17)
-- 27 municipios
-- ============================================

-- Departamento: Caldas
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento,
    nom_div_geopolitica, tip_division, ind_oculto, fec_creacion, usu_creacion
) VALUES (
    344, '17', 170, 17,
    'Caldas', 'DEPTO', 0, CURRENT_DATE, 'SYSTEM'
);

-- Municipios de Caldas
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    345, '17001', 170, 17, 1,
    'Manizales', 'CIUDAD', 0, 344, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    346, '17013', 170, 17, 13,
    'Aguadas', 'CIUDAD', 0, 344, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    347, '17042', 170, 17, 42,
    'Anserma', 'CIUDAD', 0, 344, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    348, '17050', 170, 17, 50,
    'Aranzazu', 'CIUDAD', 0, 344, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    349, '17088', 170, 17, 88,
    'Belalcázar', 'CIUDAD', 0, 344, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    350, '17174', 170, 17, 174,
    'Chinchiná', 'CIUDAD', 0, 344, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    351, '17272', 170, 17, 272,
    'Filadelfia', 'CIUDAD', 0, 344, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    352, '17380', 170, 17, 380,
    'La Dorada', 'CIUDAD', 0, 344, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    353, '17388', 170, 17, 388,
    'La Merced', 'CIUDAD', 0, 344, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    354, '17433', 170, 17, 433,
    'Manzanares', 'CIUDAD', 0, 344, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    355, '17442', 170, 17, 442,
    'Marmato', 'CIUDAD', 0, 344, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    356, '17444', 170, 17, 444,
    'Marquetalia', 'CIUDAD', 0, 344, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    357, '17446', 170, 17, 446,
    'Marulanda', 'CIUDAD', 0, 344, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    358, '17486', 170, 17, 486,
    'Neira', 'CIUDAD', 0, 344, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    359, '17495', 170, 17, 495,
    'Norcasia', 'CIUDAD', 0, 344, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    360, '17513', 170, 17, 513,
    'Pácora', 'CIUDAD', 0, 344, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    361, '17524', 170, 17, 524,
    'Palestina', 'CIUDAD', 0, 344, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    362, '17541', 170, 17, 541,
    'Pensilvania', 'CIUDAD', 0, 344, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    363, '17614', 170, 17, 614,
    'Riosucio', 'CIUDAD', 0, 344, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    364, '17616', 170, 17, 616,
    'Risaralda', 'CIUDAD', 0, 344, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    365, '17653', 170, 17, 653,
    'Salamina', 'CIUDAD', 0, 344, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    366, '17662', 170, 17, 662,
    'Samaná', 'CIUDAD', 0, 344, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    367, '17665', 170, 17, 665,
    'San José', 'CIUDAD', 0, 344, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    368, '17777', 170, 17, 777,
    'Supía', 'CIUDAD', 0, 344, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    369, '17867', 170, 17, 867,
    'Victoria', 'CIUDAD', 0, 344, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    370, '17873', 170, 17, 873,
    'Villamaría', 'CIUDAD', 0, 344, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    371, '17877', 170, 17, 877,
    'Viterbo', 'CIUDAD', 0, 344, CURRENT_DATE, 'SYSTEM'
);


-- ============================================
-- CAQUETÁ (Código 18)
-- 16 municipios
-- ============================================

-- Departamento: Caquetá
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento,
    nom_div_geopolitica, tip_division, ind_oculto, fec_creacion, usu_creacion
) VALUES (
    372, '18', 170, 18,
    'Caquetá', 'DEPTO', 0, CURRENT_DATE, 'SYSTEM'
);

-- Municipios de Caquetá
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    373, '18001', 170, 18, 1,
    'Florencia', 'CIUDAD', 0, 372, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    374, '18029', 170, 18, 29,
    'Albania', 'CIUDAD', 0, 372, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    375, '18094', 170, 18, 94,
    'Belén de Los Andaquíes', 'CIUDAD', 0, 372, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    376, '18150', 170, 18, 150,
    'Cartagena del Chairá', 'CIUDAD', 0, 372, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    377, '18205', 170, 18, 205,
    'Curillo', 'CIUDAD', 0, 372, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    378, '18247', 170, 18, 247,
    'El Doncello', 'CIUDAD', 0, 372, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    379, '18256', 170, 18, 256,
    'El Paujil', 'CIUDAD', 0, 372, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    380, '18410', 170, 18, 410,
    'La Montañita', 'CIUDAD', 0, 372, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    381, '18460', 170, 18, 460,
    'Milán', 'CIUDAD', 0, 372, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    382, '18479', 170, 18, 479,
    'Morelia', 'CIUDAD', 0, 372, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    383, '18592', 170, 18, 592,
    'Puerto Rico', 'CIUDAD', 0, 372, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    384, '18610', 170, 18, 610,
    'San José del Fragua', 'CIUDAD', 0, 372, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    385, '18753', 170, 18, 753,
    'San Vicente del Caguán', 'CIUDAD', 0, 372, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    386, '18756', 170, 18, 756,
    'Solano', 'CIUDAD', 0, 372, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    387, '18785', 170, 18, 785,
    'Solita', 'CIUDAD', 0, 372, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    388, '18860', 170, 18, 860,
    'Valparaíso', 'CIUDAD', 0, 372, CURRENT_DATE, 'SYSTEM'
);


-- ============================================
-- CASANARE (Código 85)
-- 19 municipios
-- ============================================

-- Departamento: Casanare
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento,
    nom_div_geopolitica, tip_division, ind_oculto, fec_creacion, usu_creacion
) VALUES (
    389, '85', 170, 85,
    'Casanare', 'DEPTO', 0, CURRENT_DATE, 'SYSTEM'
);

-- Municipios de Casanare
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    390, '85001', 170, 85, 1,
    'Yopal', 'CIUDAD', 0, 389, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    391, '85010', 170, 85, 10,
    'Aguazul', 'CIUDAD', 0, 389, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    392, '85015', 170, 85, 15,
    'Chámeza', 'CIUDAD', 0, 389, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    393, '85125', 170, 85, 125,
    'Hato Corozal', 'CIUDAD', 0, 389, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    394, '85136', 170, 85, 136,
    'La Salina', 'CIUDAD', 0, 389, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    395, '85139', 170, 85, 139,
    'Maní', 'CIUDAD', 0, 389, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    396, '85162', 170, 85, 162,
    'Monterrey', 'CIUDAD', 0, 389, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    397, '85225', 170, 85, 225,
    'Nunchía', 'CIUDAD', 0, 389, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    398, '85230', 170, 85, 230,
    'Orocué', 'CIUDAD', 0, 389, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    399, '85250', 170, 85, 250,
    'Paz de Ariporo', 'CIUDAD', 0, 389, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    400, '85263', 170, 85, 263,
    'Pore', 'CIUDAD', 0, 389, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    401, '85279', 170, 85, 279,
    'Recetor', 'CIUDAD', 0, 389, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    402, '85300', 170, 85, 300,
    'Sabanalarga', 'CIUDAD', 0, 389, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    403, '85315', 170, 85, 315,
    'Sácama', 'CIUDAD', 0, 389, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    404, '85325', 170, 85, 325,
    'San Luis de Palenque', 'CIUDAD', 0, 389, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    405, '85400', 170, 85, 400,
    'Támara', 'CIUDAD', 0, 389, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    406, '85410', 170, 85, 410,
    'Tauramena', 'CIUDAD', 0, 389, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    407, '85430', 170, 85, 430,
    'Trinidad', 'CIUDAD', 0, 389, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    408, '85440', 170, 85, 440,
    'Villanueva', 'CIUDAD', 0, 389, CURRENT_DATE, 'SYSTEM'
);


-- ============================================
-- CAUCA (Código 19)
-- 42 municipios
-- ============================================

-- Departamento: Cauca
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento,
    nom_div_geopolitica, tip_division, ind_oculto, fec_creacion, usu_creacion
) VALUES (
    409, '19', 170, 19,
    'Cauca', 'DEPTO', 0, CURRENT_DATE, 'SYSTEM'
);

-- Municipios de Cauca
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    410, '19001', 170, 19, 1,
    'Popayán', 'CIUDAD', 0, 409, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    411, '19022', 170, 19, 22,
    'Almaguer', 'CIUDAD', 0, 409, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    412, '19050', 170, 19, 50,
    'Argelia', 'CIUDAD', 0, 409, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    413, '19075', 170, 19, 75,
    'Balboa', 'CIUDAD', 0, 409, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    414, '19100', 170, 19, 100,
    'Bolívar', 'CIUDAD', 0, 409, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    415, '19110', 170, 19, 110,
    'Buenos Aires', 'CIUDAD', 0, 409, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    416, '19130', 170, 19, 130,
    'Cajibío', 'CIUDAD', 0, 409, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    417, '19137', 170, 19, 137,
    'Caldono', 'CIUDAD', 0, 409, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    418, '19142', 170, 19, 142,
    'Caloto', 'CIUDAD', 0, 409, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    419, '19212', 170, 19, 212,
    'Corinto', 'CIUDAD', 0, 409, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    420, '19256', 170, 19, 256,
    'El Tambo', 'CIUDAD', 0, 409, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    421, '19290', 170, 19, 290,
    'Florencia', 'CIUDAD', 0, 409, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    422, '19300', 170, 19, 300,
    'Guachené', 'CIUDAD', 0, 409, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    423, '19318', 170, 19, 318,
    'Guapi', 'CIUDAD', 0, 409, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    424, '19355', 170, 19, 355,
    'Inzá', 'CIUDAD', 0, 409, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    425, '19364', 170, 19, 364,
    'Jambaló', 'CIUDAD', 0, 409, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    426, '19392', 170, 19, 392,
    'La Sierra', 'CIUDAD', 0, 409, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    427, '19397', 170, 19, 397,
    'La Vega', 'CIUDAD', 0, 409, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    428, '19418', 170, 19, 418,
    'López de Micay', 'CIUDAD', 0, 409, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    429, '19450', 170, 19, 450,
    'Mercaderes', 'CIUDAD', 0, 409, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    430, '19455', 170, 19, 455,
    'Miranda', 'CIUDAD', 0, 409, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    431, '19473', 170, 19, 473,
    'Morales', 'CIUDAD', 0, 409, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    432, '19513', 170, 19, 513,
    'Padilla', 'CIUDAD', 0, 409, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    433, '19517', 170, 19, 517,
    'Páez', 'CIUDAD', 0, 409, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    434, '19532', 170, 19, 532,
    'Patía', 'CIUDAD', 0, 409, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    435, '19533', 170, 19, 533,
    'Piamonte', 'CIUDAD', 0, 409, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    436, '19548', 170, 19, 548,
    'Piendamó - Tunía', 'CIUDAD', 0, 409, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    437, '19573', 170, 19, 573,
    'Puerto Tejada', 'CIUDAD', 0, 409, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    438, '19585', 170, 19, 585,
    'Puracé', 'CIUDAD', 0, 409, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    439, '19622', 170, 19, 622,
    'Rosas', 'CIUDAD', 0, 409, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    440, '19693', 170, 19, 693,
    'San Sebastián', 'CIUDAD', 0, 409, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    441, '19698', 170, 19, 698,
    'Santander de Quilichao', 'CIUDAD', 0, 409, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    442, '19701', 170, 19, 701,
    'Santa Rosa', 'CIUDAD', 0, 409, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    443, '19743', 170, 19, 743,
    'Silvia', 'CIUDAD', 0, 409, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    444, '19760', 170, 19, 760,
    'Sotará', 'CIUDAD', 0, 409, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    445, '19780', 170, 19, 780,
    'Suárez', 'CIUDAD', 0, 409, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    446, '19785', 170, 19, 785,
    'Sucre', 'CIUDAD', 0, 409, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    447, '19807', 170, 19, 807,
    'Timbío', 'CIUDAD', 0, 409, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    448, '19809', 170, 19, 809,
    'Timbiquí', 'CIUDAD', 0, 409, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    449, '19821', 170, 19, 821,
    'Toribío', 'CIUDAD', 0, 409, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    450, '19824', 170, 19, 824,
    'Totoró', 'CIUDAD', 0, 409, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    451, '19845', 170, 19, 845,
    'Villa Rica', 'CIUDAD', 0, 409, CURRENT_DATE, 'SYSTEM'
);


-- ============================================
-- CESAR (Código 20)
-- 25 municipios
-- ============================================

-- Departamento: Cesar
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento,
    nom_div_geopolitica, tip_division, ind_oculto, fec_creacion, usu_creacion
) VALUES (
    452, '20', 170, 20,
    'Cesar', 'DEPTO', 0, CURRENT_DATE, 'SYSTEM'
);

-- Municipios de Cesar
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    453, '20001', 170, 20, 1,
    'Valledupar', 'CIUDAD', 0, 452, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    454, '20011', 170, 20, 11,
    'Aguachica', 'CIUDAD', 0, 452, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    455, '20013', 170, 20, 13,
    'Agustín Codazzi', 'CIUDAD', 0, 452, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    456, '20032', 170, 20, 32,
    'Astrea', 'CIUDAD', 0, 452, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    457, '20045', 170, 20, 45,
    'Becerril', 'CIUDAD', 0, 452, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    458, '20060', 170, 20, 60,
    'Bosconia', 'CIUDAD', 0, 452, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    459, '20175', 170, 20, 175,
    'Chimichagua', 'CIUDAD', 0, 452, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    460, '20178', 170, 20, 178,
    'Chiriguaná', 'CIUDAD', 0, 452, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    461, '20228', 170, 20, 228,
    'Curumaní', 'CIUDAD', 0, 452, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    462, '20238', 170, 20, 238,
    'El Copey', 'CIUDAD', 0, 452, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    463, '20250', 170, 20, 250,
    'El Paso', 'CIUDAD', 0, 452, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    464, '20295', 170, 20, 295,
    'Gamarra', 'CIUDAD', 0, 452, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    465, '20310', 170, 20, 310,
    'González', 'CIUDAD', 0, 452, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    466, '20383', 170, 20, 383,
    'La Gloria', 'CIUDAD', 0, 452, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    467, '20400', 170, 20, 400,
    'La Jagua de Ibirico', 'CIUDAD', 0, 452, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    468, '20621', 170, 20, 621,
    'La Paz', 'CIUDAD', 0, 452, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    469, '20443', 170, 20, 443,
    'Manaure Balcón del Cesar', 'CIUDAD', 0, 452, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    470, '20517', 170, 20, 517,
    'Pailitas', 'CIUDAD', 0, 452, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    471, '20550', 170, 20, 550,
    'Pelaya', 'CIUDAD', 0, 452, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    472, '20570', 170, 20, 570,
    'Pueblo Bello', 'CIUDAD', 0, 452, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    473, '20614', 170, 20, 614,
    'Río de Oro', 'CIUDAD', 0, 452, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    474, '20621', 170, 20, 621,
    'San Alberto', 'CIUDAD', 0, 452, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    475, '20710', 170, 20, 710,
    'San Diego', 'CIUDAD', 0, 452, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    476, '20750', 170, 20, 750,
    'San Martín', 'CIUDAD', 0, 452, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    477, '20787', 170, 20, 787,
    'Tamalameque', 'CIUDAD', 0, 452, CURRENT_DATE, 'SYSTEM'
);


-- ============================================
-- CHOCÓ (Código 27)
-- 30 municipios
-- ============================================

-- Departamento: Chocó
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento,
    nom_div_geopolitica, tip_division, ind_oculto, fec_creacion, usu_creacion
) VALUES (
    478, '27', 170, 27,
    'Chocó', 'DEPTO', 0, CURRENT_DATE, 'SYSTEM'
);

-- Municipios de Chocó
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    479, '27001', 170, 27, 1,
    'Quibdó', 'CIUDAD', 0, 478, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    480, '27006', 170, 27, 6,
    'Acandí', 'CIUDAD', 0, 478, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    481, '27025', 170, 27, 25,
    'Alto Baudó', 'CIUDAD', 0, 478, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    482, '27050', 170, 27, 50,
    'Atrato', 'CIUDAD', 0, 478, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    483, '27073', 170, 27, 73,
    'Bagadó', 'CIUDAD', 0, 478, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    484, '27075', 170, 27, 75,
    'Bahía Solano', 'CIUDAD', 0, 478, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    485, '27077', 170, 27, 77,
    'Bajo Baudó', 'CIUDAD', 0, 478, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    486, '27099', 170, 27, 99,
    'Bojayá', 'CIUDAD', 0, 478, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    487, '27135', 170, 27, 135,
    'El Cantón del San Pablo', 'CIUDAD', 0, 478, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    488, '27150', 170, 27, 150,
    'Cértegui', 'CIUDAD', 0, 478, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    489, '27160', 170, 27, 160,
    'Condoto', 'CIUDAD', 0, 478, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    490, '27205', 170, 27, 205,
    'El Carmen de Atrato', 'CIUDAD', 0, 478, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    491, '27245', 170, 27, 245,
    'El Litoral del San Juan', 'CIUDAD', 0, 478, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    492, '27361', 170, 27, 361,
    'Istmina', 'CIUDAD', 0, 478, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    493, '27372', 170, 27, 372,
    'Juradó', 'CIUDAD', 0, 478, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    494, '27413', 170, 27, 413,
    'Lloró', 'CIUDAD', 0, 478, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    495, '27425', 170, 27, 425,
    'Medio Atrato', 'CIUDAD', 0, 478, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    496, '27430', 170, 27, 430,
    'Medio Baudó', 'CIUDAD', 0, 478, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    497, '27450', 170, 27, 450,
    'Medio San Juan', 'CIUDAD', 0, 478, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    498, '27491', 170, 27, 491,
    'Nóvita', 'CIUDAD', 0, 478, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    499, '27495', 170, 27, 495,
    'Nuquí', 'CIUDAD', 0, 478, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    500, '27580', 170, 27, 580,
    'Río Iró', 'CIUDAD', 0, 478, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    501, '27600', 170, 27, 600,
    'Río Quito', 'CIUDAD', 0, 478, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    502, '27615', 170, 27, 615,
    'Riosucio', 'CIUDAD', 0, 478, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    503, '27660', 170, 27, 660,
    'San José del Palmar', 'CIUDAD', 0, 478, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    504, '27745', 170, 27, 745,
    'Sipí', 'CIUDAD', 0, 478, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    505, '27787', 170, 27, 787,
    'Tadó', 'CIUDAD', 0, 478, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    506, '27800', 170, 27, 800,
    'Unguía', 'CIUDAD', 0, 478, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    507, '27810', 170, 27, 810,
    'Unión Panamericana', 'CIUDAD', 0, 478, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    508, '27850', 170, 27, 850,
    'Carmen del Darién', 'CIUDAD', 0, 478, CURRENT_DATE, 'SYSTEM'
);


-- ============================================
-- CÓRDOBA (Código 23)
-- 30 municipios
-- ============================================

-- Departamento: Córdoba
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento,
    nom_div_geopolitica, tip_division, ind_oculto, fec_creacion, usu_creacion
) VALUES (
    509, '23', 170, 23,
    'Córdoba', 'DEPTO', 0, CURRENT_DATE, 'SYSTEM'
);

-- Municipios de Córdoba
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    510, '23001', 170, 23, 1,
    'Montería', 'CIUDAD', 0, 509, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    511, '23068', 170, 23, 68,
    'Ayapel', 'CIUDAD', 0, 509, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    512, '23079', 170, 23, 79,
    'Buenavista', 'CIUDAD', 0, 509, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    513, '23090', 170, 23, 90,
    'Canalete', 'CIUDAD', 0, 509, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    514, '23162', 170, 23, 162,
    'Cereté', 'CIUDAD', 0, 509, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    515, '23168', 170, 23, 168,
    'Chimá', 'CIUDAD', 0, 509, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    516, '23182', 170, 23, 182,
    'Chinú', 'CIUDAD', 0, 509, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    517, '23189', 170, 23, 189,
    'Ciénaga de Oro', 'CIUDAD', 0, 509, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    518, '23300', 170, 23, 300,
    'Cotorra', 'CIUDAD', 0, 509, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    519, '23350', 170, 23, 350,
    'La Apartada', 'CIUDAD', 0, 509, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    520, '23417', 170, 23, 417,
    'Lorica', 'CIUDAD', 0, 509, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    521, '23419', 170, 23, 419,
    'Los Córdobas', 'CIUDAD', 0, 509, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    522, '23464', 170, 23, 464,
    'Momil', 'CIUDAD', 0, 509, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    523, '23466', 170, 23, 466,
    'Moñitos', 'CIUDAD', 0, 509, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    524, '23500', 170, 23, 500,
    'Montelíbano', 'CIUDAD', 0, 509, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    525, '23555', 170, 23, 555,
    'Planeta Rica', 'CIUDAD', 0, 509, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    526, '23570', 170, 23, 570,
    'Pueblo Nuevo', 'CIUDAD', 0, 509, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    527, '23574', 170, 23, 574,
    'Puerto Escondido', 'CIUDAD', 0, 509, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    528, '23580', 170, 23, 580,
    'Puerto Libertador', 'CIUDAD', 0, 509, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    529, '23586', 170, 23, 586,
    'Purísima de la Concepción', 'CIUDAD', 0, 509, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    530, '23660', 170, 23, 660,
    'Sahagún', 'CIUDAD', 0, 509, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    531, '23670', 170, 23, 670,
    'San Andrés de Sotavento', 'CIUDAD', 0, 509, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    532, '23672', 170, 23, 672,
    'San Antero', 'CIUDAD', 0, 509, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    533, '23675', 170, 23, 675,
    'San Bernardo del Viento', 'CIUDAD', 0, 509, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    534, '23678', 170, 23, 678,
    'San Carlos', 'CIUDAD', 0, 509, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    535, '23682', 170, 23, 682,
    'San José de Uré', 'CIUDAD', 0, 509, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    536, '23686', 170, 23, 686,
    'San Pelayo', 'CIUDAD', 0, 509, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    537, '23807', 170, 23, 807,
    'Tierralta', 'CIUDAD', 0, 509, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    538, '23815', 170, 23, 815,
    'Tuchín', 'CIUDAD', 0, 509, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    539, '23855', 170, 23, 855,
    'Valencia', 'CIUDAD', 0, 509, CURRENT_DATE, 'SYSTEM'
);


-- ============================================
-- CUNDINAMARCA (Código 25)
-- 116 municipios
-- ============================================

-- Departamento: Cundinamarca
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento,
    nom_div_geopolitica, tip_division, ind_oculto, fec_creacion, usu_creacion
) VALUES (
    540, '25', 170, 25,
    'Cundinamarca', 'DEPTO', 0, CURRENT_DATE, 'SYSTEM'
);

-- Municipios de Cundinamarca
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    541, '25001', 170, 25, 1,
    'Agua de Dios', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    542, '25019', 170, 25, 19,
    'Albán', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    543, '25035', 170, 25, 35,
    'Anapoima', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    544, '25040', 170, 25, 40,
    'Anolaima', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    545, '25053', 170, 25, 53,
    'Arbeláez', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    546, '25086', 170, 25, 86,
    'Beltrán', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    547, '25095', 170, 25, 95,
    'Bituima', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    548, '25099', 170, 25, 99,
    'Bojacá', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    549, '25120', 170, 25, 120,
    'Cabrera', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    550, '25123', 170, 25, 123,
    'Cachipay', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    551, '25126', 170, 25, 126,
    'Cajicá', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    552, '25148', 170, 25, 148,
    'Caparrapí', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    553, '25151', 170, 25, 151,
    'Cáqueza', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    554, '25154', 170, 25, 154,
    'Carmen de Carupa', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    555, '25168', 170, 25, 168,
    'Chaguaní', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    556, '25175', 170, 25, 175,
    'Chía', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    557, '25178', 170, 25, 178,
    'Chipaque', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    558, '25181', 170, 25, 181,
    'Choachí', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    559, '25183', 170, 25, 183,
    'Chocontá', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    560, '25200', 170, 25, 200,
    'Cogua', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    561, '25214', 170, 25, 214,
    'Cota', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    562, '25224', 170, 25, 224,
    'Cucunubá', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    563, '25245', 170, 25, 245,
    'El Colegio', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    564, '25258', 170, 25, 258,
    'El Peñón', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    565, '25260', 170, 25, 260,
    'El Rosal', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    566, '25269', 170, 25, 269,
    'Facatativá', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    567, '25279', 170, 25, 279,
    'Fómeque', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    568, '25281', 170, 25, 281,
    'Fosca', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    569, '25286', 170, 25, 286,
    'Funza', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    570, '25288', 170, 25, 288,
    'Fúquene', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    571, '25290', 170, 25, 290,
    'Fusagasugá', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    572, '25293', 170, 25, 293,
    'Gachalá', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    573, '25295', 170, 25, 295,
    'Gachancipá', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    574, '25297', 170, 25, 297,
    'Gachetá', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    575, '25299', 170, 25, 299,
    'Gama', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    576, '25307', 170, 25, 307,
    'Girardot', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    577, '25312', 170, 25, 312,
    'Granada', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    578, '25317', 170, 25, 317,
    'Guachetá', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    579, '25320', 170, 25, 320,
    'Guaduas', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    580, '25322', 170, 25, 322,
    'Guasca', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    581, '25324', 170, 25, 324,
    'Guataquí', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    582, '25326', 170, 25, 326,
    'Guatavita', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    583, '25328', 170, 25, 328,
    'Guayabal de Síquima', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    584, '25335', 170, 25, 335,
    'Guayabetal', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    585, '25339', 170, 25, 339,
    'Gutiérrez', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    586, '25368', 170, 25, 368,
    'Jerusalén', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    587, '25372', 170, 25, 372,
    'Junín', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    588, '25377', 170, 25, 377,
    'La Calera', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    589, '25386', 170, 25, 386,
    'La Mesa', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    590, '25394', 170, 25, 394,
    'La Palma', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    591, '25398', 170, 25, 398,
    'La Peña', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    592, '25402', 170, 25, 402,
    'La Vega', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    593, '25407', 170, 25, 407,
    'Lenguazaque', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    594, '25426', 170, 25, 426,
    'Machetá', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    595, '25430', 170, 25, 430,
    'Madrid', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    596, '25436', 170, 25, 436,
    'Manta', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    597, '25438', 170, 25, 438,
    'Medina', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    598, '25473', 170, 25, 473,
    'Mosquera', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    599, '25483', 170, 25, 483,
    'Nariño', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    600, '25486', 170, 25, 486,
    'Nemocón', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    601, '25488', 170, 25, 488,
    'Nilo', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    602, '25489', 170, 25, 489,
    'Nimaima', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    603, '25491', 170, 25, 491,
    'Nocaima', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    604, '25506', 170, 25, 506,
    'Venecia', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    605, '25513', 170, 25, 513,
    'Pacho', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    606, '25518', 170, 25, 518,
    'Paime', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    607, '25524', 170, 25, 524,
    'Pandi', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    608, '25530', 170, 25, 530,
    'Paratebueno', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    609, '25535', 170, 25, 535,
    'Pasca', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    610, '25572', 170, 25, 572,
    'Puerto Salgar', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    611, '25580', 170, 25, 580,
    'Pulí', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    612, '25592', 170, 25, 592,
    'Quebradanegra', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    613, '25594', 170, 25, 594,
    'Quetame', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    614, '25596', 170, 25, 596,
    'Quipile', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    615, '25599', 170, 25, 599,
    'Apulo', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    616, '25612', 170, 25, 612,
    'Ricaurte', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    617, '25645', 170, 25, 645,
    'San Antonio del Tequendama', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    618, '25649', 170, 25, 649,
    'San Bernardo', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    619, '25653', 170, 25, 653,
    'San Cayetano', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    620, '25658', 170, 25, 658,
    'San Francisco', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    621, '25662', 170, 25, 662,
    'San Juan de Rioseco', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    622, '25718', 170, 25, 718,
    'Sasaima', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    623, '25736', 170, 25, 736,
    'Sesquilé', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    624, '25740', 170, 25, 740,
    'Sibaté', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    625, '25743', 170, 25, 743,
    'Silvania', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    626, '25745', 170, 25, 745,
    'Simijaca', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    627, '25754', 170, 25, 754,
    'Soacha', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    628, '25758', 170, 25, 758,
    'Sopó', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    629, '25769', 170, 25, 769,
    'Subachoque', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    630, '25772', 170, 25, 772,
    'Suesca', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    631, '25777', 170, 25, 777,
    'Supatá', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    632, '25779', 170, 25, 779,
    'Susa', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    633, '25781', 170, 25, 781,
    'Sutatausa', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    634, '25785', 170, 25, 785,
    'Tabio', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    635, '25793', 170, 25, 793,
    'Tausa', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    636, '25797', 170, 25, 797,
    'Tena', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    637, '25799', 170, 25, 799,
    'Tenjo', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    638, '25805', 170, 25, 805,
    'Tibacuy', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    639, '25807', 170, 25, 807,
    'Tibirita', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    640, '25815', 170, 25, 815,
    'Tocaima', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    641, '25817', 170, 25, 817,
    'Tocancipá', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    642, '25823', 170, 25, 823,
    'Topaipí', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    643, '25841', 170, 25, 841,
    'Ubalá', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    644, '25843', 170, 25, 843,
    'Ubaque', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    645, '25845', 170, 25, 845,
    'Villa de San Diego de Ubaté', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    646, '25851', 170, 25, 851,
    'Une', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    647, '25862', 170, 25, 862,
    'Útica', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    648, '25867', 170, 25, 867,
    'Vergara', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    649, '25871', 170, 25, 871,
    'Vianí', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    650, '25873', 170, 25, 873,
    'Villagómez', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    651, '25875', 170, 25, 875,
    'Villapinzón', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    652, '25878', 170, 25, 878,
    'Villeta', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    653, '25885', 170, 25, 885,
    'Viotá', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    654, '25898', 170, 25, 898,
    'Yacopí', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    655, '25899', 170, 25, 899,
    'Zipacón', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    656, '25899', 170, 25, 899,
    'Zipaquirá', 'CIUDAD', 0, 540, CURRENT_DATE, 'SYSTEM'
);


-- ============================================
-- GUAINÍA (Código 94)
-- 9 municipios
-- ============================================

-- Departamento: Guainía
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento,
    nom_div_geopolitica, tip_division, ind_oculto, fec_creacion, usu_creacion
) VALUES (
    657, '94', 170, 94,
    'Guainía', 'DEPTO', 0, CURRENT_DATE, 'SYSTEM'
);

-- Municipios de Guainía
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    658, '94001', 170, 94, 1,
    'Inírida', 'CIUDAD', 0, 657, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    659, '94343', 170, 94, 343,
    'Barranco Minas', 'CIUDAD', 0, 657, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    660, '94663', 170, 94, 663,
    'Mapiripana', 'CIUDAD', 0, 657, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    661, '94883', 170, 94, 883,
    'San Felipe', 'CIUDAD', 0, 657, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    662, '94884', 170, 94, 884,
    'Puerto Colombia', 'CIUDAD', 0, 657, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    663, '94885', 170, 94, 885,
    'La Guadalupe', 'CIUDAD', 0, 657, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    664, '94886', 170, 94, 886,
    'Cacahual', 'CIUDAD', 0, 657, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    665, '94887', 170, 94, 887,
    'Pana Pana', 'CIUDAD', 0, 657, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    666, '94888', 170, 94, 888,
    'Morichal', 'CIUDAD', 0, 657, CURRENT_DATE, 'SYSTEM'
);


-- ============================================
-- GUAVIARE (Código 95)
-- 4 municipios
-- ============================================

-- Departamento: Guaviare
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento,
    nom_div_geopolitica, tip_division, ind_oculto, fec_creacion, usu_creacion
) VALUES (
    667, '95', 170, 95,
    'Guaviare', 'DEPTO', 0, CURRENT_DATE, 'SYSTEM'
);

-- Municipios de Guaviare
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    668, '95001', 170, 95, 1,
    'San José del Guaviare', 'CIUDAD', 0, 667, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    669, '95015', 170, 95, 15,
    'Calamar', 'CIUDAD', 0, 667, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    670, '95025', 170, 95, 25,
    'El Retorno', 'CIUDAD', 0, 667, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    671, '95200', 170, 95, 200,
    'Miraflores', 'CIUDAD', 0, 667, CURRENT_DATE, 'SYSTEM'
);


-- ============================================
-- HUILA (Código 41)
-- 37 municipios
-- ============================================

-- Departamento: Huila
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento,
    nom_div_geopolitica, tip_division, ind_oculto, fec_creacion, usu_creacion
) VALUES (
    672, '41', 170, 41,
    'Huila', 'DEPTO', 0, CURRENT_DATE, 'SYSTEM'
);

-- Municipios de Huila
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    673, '41001', 170, 41, 1,
    'Neiva', 'CIUDAD', 0, 672, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    674, '41006', 170, 41, 6,
    'Acevedo', 'CIUDAD', 0, 672, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    675, '41013', 170, 41, 13,
    'Agrado', 'CIUDAD', 0, 672, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    676, '41016', 170, 41, 16,
    'Aipe', 'CIUDAD', 0, 672, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    677, '41020', 170, 41, 20,
    'Algeciras', 'CIUDAD', 0, 672, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    678, '41026', 170, 41, 26,
    'Altamira', 'CIUDAD', 0, 672, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    679, '41078', 170, 41, 78,
    'Baraya', 'CIUDAD', 0, 672, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    680, '41132', 170, 41, 132,
    'Campoalegre', 'CIUDAD', 0, 672, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    681, '41206', 170, 41, 206,
    'Colombia', 'CIUDAD', 0, 672, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    682, '41244', 170, 41, 244,
    'Elías', 'CIUDAD', 0, 672, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    683, '41298', 170, 41, 298,
    'Garzón', 'CIUDAD', 0, 672, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    684, '41306', 170, 41, 306,
    'Gigante', 'CIUDAD', 0, 672, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    685, '41319', 170, 41, 319,
    'Guadalupe', 'CIUDAD', 0, 672, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    686, '41349', 170, 41, 349,
    'Hobo', 'CIUDAD', 0, 672, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    687, '41357', 170, 41, 357,
    'Íquira', 'CIUDAD', 0, 672, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    688, '41359', 170, 41, 359,
    'Isnos', 'CIUDAD', 0, 672, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    689, '41378', 170, 41, 378,
    'La Argentina', 'CIUDAD', 0, 672, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    690, '41396', 170, 41, 396,
    'La Plata', 'CIUDAD', 0, 672, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    691, '41483', 170, 41, 483,
    'Nátaga', 'CIUDAD', 0, 672, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    692, '41503', 170, 41, 503,
    'Oporapa', 'CIUDAD', 0, 672, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    693, '41518', 170, 41, 518,
    'Paicol', 'CIUDAD', 0, 672, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    694, '41524', 170, 41, 524,
    'Palermo', 'CIUDAD', 0, 672, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    695, '41530', 170, 41, 530,
    'Palestina', 'CIUDAD', 0, 672, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    696, '41548', 170, 41, 548,
    'Pital', 'CIUDAD', 0, 672, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    697, '41551', 170, 41, 551,
    'Pitalito', 'CIUDAD', 0, 672, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    698, '41615', 170, 41, 615,
    'Rivera', 'CIUDAD', 0, 672, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    699, '41660', 170, 41, 660,
    'Saladoblanco', 'CIUDAD', 0, 672, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    700, '41668', 170, 41, 668,
    'San Agustín', 'CIUDAD', 0, 672, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    701, '41676', 170, 41, 676,
    'Santa María', 'CIUDAD', 0, 672, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    702, '41770', 170, 41, 770,
    'Suaza', 'CIUDAD', 0, 672, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    703, '41791', 170, 41, 791,
    'Tarqui', 'CIUDAD', 0, 672, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    704, '41799', 170, 41, 799,
    'Tesalia', 'CIUDAD', 0, 672, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    705, '41801', 170, 41, 801,
    'Tello', 'CIUDAD', 0, 672, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    706, '41797', 170, 41, 797,
    'Teruel', 'CIUDAD', 0, 672, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    707, '41807', 170, 41, 807,
    'Timaná', 'CIUDAD', 0, 672, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    708, '41872', 170, 41, 872,
    'Villavieja', 'CIUDAD', 0, 672, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    709, '41885', 170, 41, 885,
    'Yaguará', 'CIUDAD', 0, 672, CURRENT_DATE, 'SYSTEM'
);


-- ============================================
-- LA GUAJIRA (Código 44)
-- 15 municipios
-- ============================================

-- Departamento: La Guajira
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento,
    nom_div_geopolitica, tip_division, ind_oculto, fec_creacion, usu_creacion
) VALUES (
    710, '44', 170, 44,
    'La Guajira', 'DEPTO', 0, CURRENT_DATE, 'SYSTEM'
);

-- Municipios de La Guajira
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    711, '44001', 170, 44, 1,
    'Riohacha', 'CIUDAD', 0, 710, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    712, '44035', 170, 44, 35,
    'Albania', 'CIUDAD', 0, 710, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    713, '44078', 170, 44, 78,
    'Barrancas', 'CIUDAD', 0, 710, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    714, '44090', 170, 44, 90,
    'Dibulla', 'CIUDAD', 0, 710, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    715, '44098', 170, 44, 98,
    'Distracción', 'CIUDAD', 0, 710, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    716, '44110', 170, 44, 110,
    'El Molino', 'CIUDAD', 0, 710, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    717, '44279', 170, 44, 279,
    'Fonseca', 'CIUDAD', 0, 710, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    718, '44378', 170, 44, 378,
    'Hatonuevo', 'CIUDAD', 0, 710, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    719, '44420', 170, 44, 420,
    'La Jagua del Pilar', 'CIUDAD', 0, 710, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    720, '44430', 170, 44, 430,
    'Maicao', 'CIUDAD', 0, 710, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    721, '44560', 170, 44, 560,
    'Manaure', 'CIUDAD', 0, 710, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    722, '44650', 170, 44, 650,
    'San Juan del Cesar', 'CIUDAD', 0, 710, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    723, '44847', 170, 44, 847,
    'Uribia', 'CIUDAD', 0, 710, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    724, '44855', 170, 44, 855,
    'Urumita', 'CIUDAD', 0, 710, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    725, '44874', 170, 44, 874,
    'Villanueva', 'CIUDAD', 0, 710, CURRENT_DATE, 'SYSTEM'
);


-- ============================================
-- MAGDALENA (Código 47)
-- 30 municipios
-- ============================================

-- Departamento: Magdalena
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento,
    nom_div_geopolitica, tip_division, ind_oculto, fec_creacion, usu_creacion
) VALUES (
    726, '47', 170, 47,
    'Magdalena', 'DEPTO', 0, CURRENT_DATE, 'SYSTEM'
);

-- Municipios de Magdalena
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    727, '47001', 170, 47, 1,
    'Santa Marta', 'CIUDAD', 0, 726, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    728, '47030', 170, 47, 30,
    'Algarrobo', 'CIUDAD', 0, 726, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    729, '47053', 170, 47, 53,
    'Aracataca', 'CIUDAD', 0, 726, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    730, '47058', 170, 47, 58,
    'Ariguaní', 'CIUDAD', 0, 726, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    731, '47161', 170, 47, 161,
    'Cerro de San Antonio', 'CIUDAD', 0, 726, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    732, '47170', 170, 47, 170,
    'Chivolo', 'CIUDAD', 0, 726, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    733, '47189', 170, 47, 189,
    'Ciénaga', 'CIUDAD', 0, 726, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    734, '47205', 170, 47, 205,
    'Concordia', 'CIUDAD', 0, 726, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    735, '47245', 170, 47, 245,
    'El Banco', 'CIUDAD', 0, 726, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    736, '47258', 170, 47, 258,
    'El Piñón', 'CIUDAD', 0, 726, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    737, '47268', 170, 47, 268,
    'El Retén', 'CIUDAD', 0, 726, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    738, '47288', 170, 47, 288,
    'Fundación', 'CIUDAD', 0, 726, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    739, '47318', 170, 47, 318,
    'Guamal', 'CIUDAD', 0, 726, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    740, '47460', 170, 47, 460,
    'Nueva Granada', 'CIUDAD', 0, 726, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    741, '47541', 170, 47, 541,
    'Pedraza', 'CIUDAD', 0, 726, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    742, '47545', 170, 47, 545,
    'Pijiño del Carmen', 'CIUDAD', 0, 726, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    743, '47551', 170, 47, 551,
    'Pivijay', 'CIUDAD', 0, 726, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    744, '47555', 170, 47, 555,
    'Plato', 'CIUDAD', 0, 726, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    745, '47570', 170, 47, 570,
    'Pueblo Viejo', 'CIUDAD', 0, 726, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    746, '47605', 170, 47, 605,
    'Remolino', 'CIUDAD', 0, 726, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    747, '47660', 170, 47, 660,
    'Sabanas de San Ángel', 'CIUDAD', 0, 726, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    748, '47675', 170, 47, 675,
    'Salamina', 'CIUDAD', 0, 726, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    749, '47692', 170, 47, 692,
    'San Sebastián de Buenavista', 'CIUDAD', 0, 726, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    750, '47703', 170, 47, 703,
    'San Zenón', 'CIUDAD', 0, 726, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    751, '47707', 170, 47, 707,
    'Santa Ana', 'CIUDAD', 0, 726, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    752, '47720', 170, 47, 720,
    'Santa Bárbara de Pinto', 'CIUDAD', 0, 726, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    753, '47745', 170, 47, 745,
    'Sitionuevo', 'CIUDAD', 0, 726, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    754, '47798', 170, 47, 798,
    'Tenerife', 'CIUDAD', 0, 726, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    755, '47960', 170, 47, 960,
    'Zapayán', 'CIUDAD', 0, 726, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    756, '47980', 170, 47, 980,
    'Zona Bananera', 'CIUDAD', 0, 726, CURRENT_DATE, 'SYSTEM'
);


-- ============================================
-- META (Código 50)
-- 29 municipios
-- ============================================

-- Departamento: Meta
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento,
    nom_div_geopolitica, tip_division, ind_oculto, fec_creacion, usu_creacion
) VALUES (
    757, '50', 170, 50,
    'Meta', 'DEPTO', 0, CURRENT_DATE, 'SYSTEM'
);

-- Municipios de Meta
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    758, '50001', 170, 50, 1,
    'Villavicencio', 'CIUDAD', 0, 757, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    759, '50006', 170, 50, 6,
    'Acacías', 'CIUDAD', 0, 757, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    760, '50110', 170, 50, 110,
    'Barranca de Upía', 'CIUDAD', 0, 757, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    761, '50124', 170, 50, 124,
    'Cabuyaro', 'CIUDAD', 0, 757, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    762, '50150', 170, 50, 150,
    'Castilla la Nueva', 'CIUDAD', 0, 757, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    763, '50223', 170, 50, 223,
    'Cubarral', 'CIUDAD', 0, 757, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    764, '50226', 170, 50, 226,
    'Cumaral', 'CIUDAD', 0, 757, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    765, '50245', 170, 50, 245,
    'El Calvario', 'CIUDAD', 0, 757, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    766, '50251', 170, 50, 251,
    'El Castillo', 'CIUDAD', 0, 757, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    767, '50270', 170, 50, 270,
    'El Dorado', 'CIUDAD', 0, 757, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    768, '50287', 170, 50, 287,
    'Fuente de Oro', 'CIUDAD', 0, 757, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    769, '50313', 170, 50, 313,
    'Granada', 'CIUDAD', 0, 757, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    770, '50318', 170, 50, 318,
    'Guamal', 'CIUDAD', 0, 757, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    771, '50325', 170, 50, 325,
    'Mapiripán', 'CIUDAD', 0, 757, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    772, '50330', 170, 50, 330,
    'Mesetas', 'CIUDAD', 0, 757, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    773, '50350', 170, 50, 350,
    'La Macarena', 'CIUDAD', 0, 757, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    774, '50370', 170, 50, 370,
    'Uribe', 'CIUDAD', 0, 757, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    775, '50400', 170, 50, 400,
    'Lejanías', 'CIUDAD', 0, 757, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    776, '50450', 170, 50, 450,
    'Puerto Concordia', 'CIUDAD', 0, 757, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    777, '50568', 170, 50, 568,
    'Puerto Gaitán', 'CIUDAD', 0, 757, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    778, '50573', 170, 50, 573,
    'Puerto López', 'CIUDAD', 0, 757, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    779, '50577', 170, 50, 577,
    'Puerto Lleras', 'CIUDAD', 0, 757, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    780, '50590', 170, 50, 590,
    'Puerto Rico', 'CIUDAD', 0, 757, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    781, '50606', 170, 50, 606,
    'Restrepo', 'CIUDAD', 0, 757, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    782, '50680', 170, 50, 680,
    'San Carlos de Guaroa', 'CIUDAD', 0, 757, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    783, '50683', 170, 50, 683,
    'San Juan de Arama', 'CIUDAD', 0, 757, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    784, '50686', 170, 50, 686,
    'San Juanito', 'CIUDAD', 0, 757, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    785, '50689', 170, 50, 689,
    'San Martín', 'CIUDAD', 0, 757, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    786, '50711', 170, 50, 711,
    'Vistahermosa', 'CIUDAD', 0, 757, CURRENT_DATE, 'SYSTEM'
);


-- ============================================
-- NARIÑO (Código 52)
-- 64 municipios
-- ============================================

-- Departamento: Nariño
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento,
    nom_div_geopolitica, tip_division, ind_oculto, fec_creacion, usu_creacion
) VALUES (
    787, '52', 170, 52,
    'Nariño', 'DEPTO', 0, CURRENT_DATE, 'SYSTEM'
);

-- Municipios de Nariño
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    788, '52001', 170, 52, 1,
    'Pasto', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    789, '52019', 170, 52, 19,
    'Albán', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    790, '52022', 170, 52, 22,
    'Aldana', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    791, '52036', 170, 52, 36,
    'Ancuyá', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    792, '52051', 170, 52, 51,
    'Arboleda', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    793, '52079', 170, 52, 79,
    'Barbacoas', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    794, '52083', 170, 52, 83,
    'Belén', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    795, '52110', 170, 52, 110,
    'Buesaco', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    796, '52203', 170, 52, 203,
    'Colón', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    797, '52207', 170, 52, 207,
    'Consacá', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    798, '52210', 170, 52, 210,
    'Contadero', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    799, '52215', 170, 52, 215,
    'Córdoba', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    800, '52224', 170, 52, 224,
    'Cuaspud', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    801, '52227', 170, 52, 227,
    'Cumbal', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    802, '52233', 170, 52, 233,
    'Cumbitara', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    803, '52240', 170, 52, 240,
    'Chachagüí', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    804, '52250', 170, 52, 250,
    'El Charco', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    805, '52254', 170, 52, 254,
    'El Peñol', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    806, '52256', 170, 52, 256,
    'El Rosario', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    807, '52258', 170, 52, 258,
    'El Tablón de Gómez', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    808, '52260', 170, 52, 260,
    'El Tambo', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    809, '52287', 170, 52, 287,
    'Funes', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    810, '52317', 170, 52, 317,
    'Guachucal', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    811, '52320', 170, 52, 320,
    'Guaitarilla', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    812, '52323', 170, 52, 323,
    'Gualmatán', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    813, '52352', 170, 52, 352,
    'Iles', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    814, '52354', 170, 52, 354,
    'Imués', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    815, '52356', 170, 52, 356,
    'Ipiales', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    816, '52378', 170, 52, 378,
    'La Cruz', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    817, '52381', 170, 52, 381,
    'La Florida', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    818, '52385', 170, 52, 385,
    'La Llanada', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    819, '52390', 170, 52, 390,
    'La Tola', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    820, '52399', 170, 52, 399,
    'La Unión', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    821, '52405', 170, 52, 405,
    'Leiva', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    822, '52411', 170, 52, 411,
    'Linares', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    823, '52418', 170, 52, 418,
    'Los Andes', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    824, '52427', 170, 52, 427,
    'Magüí', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    825, '52435', 170, 52, 435,
    'Mallama', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    826, '52473', 170, 52, 473,
    'Mosquera', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    827, '52480', 170, 52, 480,
    'Nariño', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    828, '52490', 170, 52, 490,
    'Olaya Herrera', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    829, '52506', 170, 52, 506,
    'Ospina', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    830, '52520', 170, 52, 520,
    'Francisco Pizarro', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    831, '52540', 170, 52, 540,
    'Policarpa', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    832, '52560', 170, 52, 560,
    'Potosí', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    833, '52565', 170, 52, 565,
    'Providencia', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    834, '52573', 170, 52, 573,
    'Puerres', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    835, '52585', 170, 52, 585,
    'Pupiales', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    836, '52612', 170, 52, 612,
    'Ricaurte', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    837, '52621', 170, 52, 621,
    'Roberto Payán', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    838, '52678', 170, 52, 678,
    'Samaniego', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    839, '52683', 170, 52, 683,
    'Sandoná', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    840, '52685', 170, 52, 685,
    'San Bernardo', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    841, '52687', 170, 52, 687,
    'San Lorenzo', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    842, '52693', 170, 52, 693,
    'San Pablo', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    843, '52694', 170, 52, 694,
    'San Pedro de Cartago', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    844, '52696', 170, 52, 696,
    'Santa Bárbara', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    845, '52699', 170, 52, 699,
    'Santacruz', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    846, '52720', 170, 52, 720,
    'Sapuyes', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    847, '52786', 170, 52, 786,
    'Taminango', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    848, '52788', 170, 52, 788,
    'Tangua', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    849, '52835', 170, 52, 835,
    'San Andrés de Tumaco', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    850, '52838', 170, 52, 838,
    'Túquerres', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    851, '52885', 170, 52, 885,
    'Yacuanquer', 'CIUDAD', 0, 787, CURRENT_DATE, 'SYSTEM'
);


-- ============================================
-- NORTE DE SANTANDER (Código 54)
-- 40 municipios
-- ============================================

-- Departamento: Norte de Santander
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento,
    nom_div_geopolitica, tip_division, ind_oculto, fec_creacion, usu_creacion
) VALUES (
    852, '54', 170, 54,
    'Norte de Santander', 'DEPTO', 0, CURRENT_DATE, 'SYSTEM'
);

-- Municipios de Norte de Santander
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    853, '54001', 170, 54, 1,
    'Cúcuta', 'CIUDAD', 0, 852, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    854, '54003', 170, 54, 3,
    'Ábrego', 'CIUDAD', 0, 852, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    855, '54051', 170, 54, 51,
    'Arboledas', 'CIUDAD', 0, 852, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    856, '54099', 170, 54, 99,
    'Bochalema', 'CIUDAD', 0, 852, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    857, '54109', 170, 54, 109,
    'Bucarasica', 'CIUDAD', 0, 852, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    858, '54125', 170, 54, 125,
    'Cáchira', 'CIUDAD', 0, 852, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    859, '54128', 170, 54, 128,
    'Cácota', 'CIUDAD', 0, 852, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    860, '54172', 170, 54, 172,
    'Chinácota', 'CIUDAD', 0, 852, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    861, '54174', 170, 54, 174,
    'Chitagá', 'CIUDAD', 0, 852, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    862, '54206', 170, 54, 206,
    'Convención', 'CIUDAD', 0, 852, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    863, '54223', 170, 54, 223,
    'Cúcutilla', 'CIUDAD', 0, 852, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    864, '54239', 170, 54, 239,
    'Durania', 'CIUDAD', 0, 852, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    865, '54245', 170, 54, 245,
    'El Carmen', 'CIUDAD', 0, 852, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    866, '54250', 170, 54, 250,
    'El Tarra', 'CIUDAD', 0, 852, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    867, '54261', 170, 54, 261,
    'El Zulia', 'CIUDAD', 0, 852, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    868, '54313', 170, 54, 313,
    'Gramalote', 'CIUDAD', 0, 852, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    869, '54344', 170, 54, 344,
    'Hacarí', 'CIUDAD', 0, 852, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    870, '54347', 170, 54, 347,
    'Herrán', 'CIUDAD', 0, 852, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    871, '54385', 170, 54, 385,
    'Labateca', 'CIUDAD', 0, 852, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    872, '54398', 170, 54, 398,
    'La Esperanza', 'CIUDAD', 0, 852, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    873, '54405', 170, 54, 405,
    'La Playa', 'CIUDAD', 0, 852, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    874, '54418', 170, 54, 418,
    'Los Patios', 'CIUDAD', 0, 852, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    875, '54480', 170, 54, 480,
    'Lourdes', 'CIUDAD', 0, 852, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    876, '54498', 170, 54, 498,
    'Mutiscua', 'CIUDAD', 0, 852, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    877, '54498', 170, 54, 498,
    'Ocaña', 'CIUDAD', 0, 852, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    878, '54518', 170, 54, 518,
    'Pamplona', 'CIUDAD', 0, 852, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    879, '54520', 170, 54, 520,
    'Pamplonita', 'CIUDAD', 0, 852, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    880, '54553', 170, 54, 553,
    'Puerto Santander', 'CIUDAD', 0, 852, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    881, '54599', 170, 54, 599,
    'Ragonvalia', 'CIUDAD', 0, 852, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    882, '54660', 170, 54, 660,
    'Salazar', 'CIUDAD', 0, 852, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    883, '54670', 170, 54, 670,
    'San Calixto', 'CIUDAD', 0, 852, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    884, '54673', 170, 54, 673,
    'San Cayetano', 'CIUDAD', 0, 852, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    885, '54680', 170, 54, 680,
    'Santiago', 'CIUDAD', 0, 852, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    886, '54720', 170, 54, 720,
    'Sardinata', 'CIUDAD', 0, 852, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    887, '54743', 170, 54, 743,
    'Silos', 'CIUDAD', 0, 852, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    888, '54800', 170, 54, 800,
    'Teorama', 'CIUDAD', 0, 852, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    889, '54810', 170, 54, 810,
    'Tibú', 'CIUDAD', 0, 852, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    890, '54820', 170, 54, 820,
    'Toledo', 'CIUDAD', 0, 852, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    891, '54871', 170, 54, 871,
    'Villa Caro', 'CIUDAD', 0, 852, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    892, '54874', 170, 54, 874,
    'Villa del Rosario', 'CIUDAD', 0, 852, CURRENT_DATE, 'SYSTEM'
);


-- ============================================
-- PUTUMAYO (Código 86)
-- 13 municipios
-- ============================================

-- Departamento: Putumayo
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento,
    nom_div_geopolitica, tip_division, ind_oculto, fec_creacion, usu_creacion
) VALUES (
    893, '86', 170, 86,
    'Putumayo', 'DEPTO', 0, CURRENT_DATE, 'SYSTEM'
);

-- Municipios de Putumayo
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    894, '86001', 170, 86, 1,
    'Mocoa', 'CIUDAD', 0, 893, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    895, '86219', 170, 86, 219,
    'Colón', 'CIUDAD', 0, 893, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    896, '86320', 170, 86, 320,
    'Orito', 'CIUDAD', 0, 893, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    897, '86568', 170, 86, 568,
    'Puerto Asís', 'CIUDAD', 0, 893, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    898, '86569', 170, 86, 569,
    'Puerto Caicedo', 'CIUDAD', 0, 893, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    899, '86571', 170, 86, 571,
    'Puerto Guzmán', 'CIUDAD', 0, 893, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    900, '86573', 170, 86, 573,
    'Puerto Leguízamo', 'CIUDAD', 0, 893, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    901, '86749', 170, 86, 749,
    'Sibundoy', 'CIUDAD', 0, 893, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    902, '86755', 170, 86, 755,
    'San Francisco', 'CIUDAD', 0, 893, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    903, '86757', 170, 86, 757,
    'San Miguel', 'CIUDAD', 0, 893, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    904, '86760', 170, 86, 760,
    'Santiago', 'CIUDAD', 0, 893, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    905, '86865', 170, 86, 865,
    'Valle del Guamuez', 'CIUDAD', 0, 893, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    906, '86885', 170, 86, 885,
    'Villagarzón', 'CIUDAD', 0, 893, CURRENT_DATE, 'SYSTEM'
);


-- ============================================
-- QUINDÍO (Código 63)
-- 12 municipios
-- ============================================

-- Departamento: Quindío
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento,
    nom_div_geopolitica, tip_division, ind_oculto, fec_creacion, usu_creacion
) VALUES (
    907, '63', 170, 63,
    'Quindío', 'DEPTO', 0, CURRENT_DATE, 'SYSTEM'
);

-- Municipios de Quindío
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    908, '63001', 170, 63, 1,
    'Armenia', 'CIUDAD', 0, 907, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    909, '63111', 170, 63, 111,
    'Buenavista', 'CIUDAD', 0, 907, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    910, '63130', 170, 63, 130,
    'Calarcá', 'CIUDAD', 0, 907, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    911, '63190', 170, 63, 190,
    'Circasia', 'CIUDAD', 0, 907, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    912, '63212', 170, 63, 212,
    'Córdoba', 'CIUDAD', 0, 907, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    913, '63272', 170, 63, 272,
    'Filandia', 'CIUDAD', 0, 907, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    914, '63302', 170, 63, 302,
    'Génova', 'CIUDAD', 0, 907, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    915, '63401', 170, 63, 401,
    'La Tebaida', 'CIUDAD', 0, 907, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    916, '63470', 170, 63, 470,
    'Montenegro', 'CIUDAD', 0, 907, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    917, '63548', 170, 63, 548,
    'Pijao', 'CIUDAD', 0, 907, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    918, '63594', 170, 63, 594,
    'Quimbaya', 'CIUDAD', 0, 907, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    919, '63690', 170, 63, 690,
    'Salento', 'CIUDAD', 0, 907, CURRENT_DATE, 'SYSTEM'
);


-- ============================================
-- RISARALDA (Código 66)
-- 14 municipios
-- ============================================

-- Departamento: Risaralda
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento,
    nom_div_geopolitica, tip_division, ind_oculto, fec_creacion, usu_creacion
) VALUES (
    920, '66', 170, 66,
    'Risaralda', 'DEPTO', 0, CURRENT_DATE, 'SYSTEM'
);

-- Municipios de Risaralda
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    921, '66001', 170, 66, 1,
    'Pereira', 'CIUDAD', 0, 920, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    922, '66045', 170, 66, 45,
    'Apía', 'CIUDAD', 0, 920, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    923, '66075', 170, 66, 75,
    'Balboa', 'CIUDAD', 0, 920, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    924, '66088', 170, 66, 88,
    'Belén de Umbría', 'CIUDAD', 0, 920, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    925, '66170', 170, 66, 170,
    'Dosquebradas', 'CIUDAD', 0, 920, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    926, '66318', 170, 66, 318,
    'Guática', 'CIUDAD', 0, 920, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    927, '66383', 170, 66, 383,
    'La Celia', 'CIUDAD', 0, 920, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    928, '66400', 170, 66, 400,
    'La Virginia', 'CIUDAD', 0, 920, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    929, '66440', 170, 66, 440,
    'Marsella', 'CIUDAD', 0, 920, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    930, '66456', 170, 66, 456,
    'Mistrató', 'CIUDAD', 0, 920, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    931, '66572', 170, 66, 572,
    'Pueblo Rico', 'CIUDAD', 0, 920, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    932, '66594', 170, 66, 594,
    'Quinchía', 'CIUDAD', 0, 920, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    933, '66682', 170, 66, 682,
    'Santa Rosa de Cabal', 'CIUDAD', 0, 920, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    934, '66687', 170, 66, 687,
    'Santuario', 'CIUDAD', 0, 920, CURRENT_DATE, 'SYSTEM'
);


-- ============================================
-- SAN ANDRÉS Y PROVIDENCIA (Código 88)
-- 2 municipios
-- ============================================

-- Departamento: San Andrés y Providencia
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento,
    nom_div_geopolitica, tip_division, ind_oculto, fec_creacion, usu_creacion
) VALUES (
    935, '88', 170, 88,
    'San Andrés y Providencia', 'DEPTO', 0, CURRENT_DATE, 'SYSTEM'
);

-- Municipios de San Andrés y Providencia
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    936, '88001', 170, 88, 1,
    'San Andrés', 'CIUDAD', 0, 935, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    937, '88564', 170, 88, 564,
    'Providencia', 'CIUDAD', 0, 935, CURRENT_DATE, 'SYSTEM'
);


-- ============================================
-- SANTANDER (Código 68)
-- 87 municipios
-- ============================================

-- Departamento: Santander
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento,
    nom_div_geopolitica, tip_division, ind_oculto, fec_creacion, usu_creacion
) VALUES (
    938, '68', 170, 68,
    'Santander', 'DEPTO', 0, CURRENT_DATE, 'SYSTEM'
);

-- Municipios de Santander
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    939, '68001', 170, 68, 1,
    'Bucaramanga', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    940, '68013', 170, 68, 13,
    'Aguada', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    941, '68020', 170, 68, 20,
    'Albania', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    942, '68051', 170, 68, 51,
    'Aratoca', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    943, '68077', 170, 68, 77,
    'Barbosa', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    944, '68079', 170, 68, 79,
    'Barichara', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    945, '68081', 170, 68, 81,
    'Barrancabermeja', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    946, '68092', 170, 68, 92,
    'Betulia', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    947, '68101', 170, 68, 101,
    'Bolívar', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    948, '68121', 170, 68, 121,
    'Cabrera', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    949, '68132', 170, 68, 132,
    'California', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    950, '68147', 170, 68, 147,
    'Capitanejo', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    951, '68152', 170, 68, 152,
    'Carcasí', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    952, '68160', 170, 68, 160,
    'Cepitá', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    953, '68162', 170, 68, 162,
    'Cerrito', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    954, '68167', 170, 68, 167,
    'Charalá', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    955, '68169', 170, 68, 169,
    'Charta', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    956, '68176', 170, 68, 176,
    'Chima', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    957, '68179', 170, 68, 179,
    'Chipatá', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    958, '68190', 170, 68, 190,
    'Cimitarra', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    959, '68207', 170, 68, 207,
    'Concepción', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    960, '68209', 170, 68, 209,
    'Confines', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    961, '68211', 170, 68, 211,
    'Contratación', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    962, '68217', 170, 68, 217,
    'Coromoro', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    963, '68229', 170, 68, 229,
    'Curití', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    964, '68235', 170, 68, 235,
    'El Carmen de Chucurí', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    965, '68245', 170, 68, 245,
    'El Guacamayo', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    966, '68250', 170, 68, 250,
    'El Peñón', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    967, '68255', 170, 68, 255,
    'El Playón', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    968, '68264', 170, 68, 264,
    'Encino', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    969, '68266', 170, 68, 266,
    'Enciso', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    970, '68271', 170, 68, 271,
    'Florián', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    971, '68276', 170, 68, 276,
    'Floridablanca', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    972, '68296', 170, 68, 296,
    'Galán', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    973, '68298', 170, 68, 298,
    'Gámbita', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    974, '68307', 170, 68, 307,
    'Girón', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    975, '68318', 170, 68, 318,
    'Guaca', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    976, '68320', 170, 68, 320,
    'Guadalupe', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    977, '68322', 170, 68, 322,
    'Guapotá', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    978, '68324', 170, 68, 324,
    'Guavatá', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    979, '68327', 170, 68, 327,
    'Güepsa', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    980, '68344', 170, 68, 344,
    'Hato', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    981, '68368', 170, 68, 368,
    'Jesús María', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    982, '68370', 170, 68, 370,
    'Jordán', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    983, '68377', 170, 68, 377,
    'La Belleza', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    984, '68385', 170, 68, 385,
    'Landázuri', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    985, '68397', 170, 68, 397,
    'La Paz', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    986, '68406', 170, 68, 406,
    'Lebríja', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    987, '68418', 170, 68, 418,
    'Los Santos', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    988, '68425', 170, 68, 425,
    'Macaravita', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    989, '68432', 170, 68, 432,
    'Málaga', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    990, '68444', 170, 68, 444,
    'Matanza', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    991, '68464', 170, 68, 464,
    'Mogotes', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    992, '68468', 170, 68, 468,
    'Molagavita', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    993, '68498', 170, 68, 498,
    'Ocamonte', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    994, '68500', 170, 68, 500,
    'Oiba', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    995, '68502', 170, 68, 502,
    'Onzaga', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    996, '68522', 170, 68, 522,
    'Palmar', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    997, '68524', 170, 68, 524,
    'Palmas del Socorro', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    998, '68533', 170, 68, 533,
    'Páramo', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    999, '68547', 170, 68, 547,
    'Piedecuesta', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1000, '68549', 170, 68, 549,
    'Pinchote', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1001, '68572', 170, 68, 572,
    'Puente Nacional', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1002, '68573', 170, 68, 573,
    'Puerto Parra', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1003, '68575', 170, 68, 575,
    'Puerto Wilches', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1004, '68615', 170, 68, 615,
    'Rionegro', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1005, '68655', 170, 68, 655,
    'Sabana de Torres', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1006, '68669', 170, 68, 669,
    'San Andrés', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1007, '68673', 170, 68, 673,
    'San Benito', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1008, '68679', 170, 68, 679,
    'San Gil', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1009, '68682', 170, 68, 682,
    'San Joaquín', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1010, '68684', 170, 68, 684,
    'San José de Miranda', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1011, '68686', 170, 68, 686,
    'San Miguel', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1012, '68689', 170, 68, 689,
    'San Vicente de Chucurí', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1013, '68705', 170, 68, 705,
    'Santa Bárbara', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1014, '68720', 170, 68, 720,
    'Santa Helena del Opón', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1015, '68745', 170, 68, 745,
    'Simacota', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1016, '68755', 170, 68, 755,
    'Socorro', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1017, '68770', 170, 68, 770,
    'Suaita', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1018, '68773', 170, 68, 773,
    'Sucre', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1019, '68780', 170, 68, 780,
    'Suratá', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1020, '68820', 170, 68, 820,
    'Tona', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1021, '68855', 170, 68, 855,
    'Valle de San José', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1022, '68861', 170, 68, 861,
    'Vélez', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1023, '68867', 170, 68, 867,
    'Vetas', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1024, '68872', 170, 68, 872,
    'Villanueva', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1025, '68895', 170, 68, 895,
    'Zapatoca', 'CIUDAD', 0, 938, CURRENT_DATE, 'SYSTEM'
);


-- ============================================
-- SUCRE (Código 70)
-- 26 municipios
-- ============================================

-- Departamento: Sucre
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento,
    nom_div_geopolitica, tip_division, ind_oculto, fec_creacion, usu_creacion
) VALUES (
    1026, '70', 170, 70,
    'Sucre', 'DEPTO', 0, CURRENT_DATE, 'SYSTEM'
);

-- Municipios de Sucre
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1027, '70001', 170, 70, 1,
    'Sincelejo', 'CIUDAD', 0, 1026, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1028, '70110', 170, 70, 110,
    'Buenavista', 'CIUDAD', 0, 1026, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1029, '70124', 170, 70, 124,
    'Caimito', 'CIUDAD', 0, 1026, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1030, '70230', 170, 70, 230,
    'Chalán', 'CIUDAD', 0, 1026, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1031, '70204', 170, 70, 204,
    'Coloso', 'CIUDAD', 0, 1026, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1032, '70215', 170, 70, 215,
    'Corozal', 'CIUDAD', 0, 1026, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1033, '70221', 170, 70, 221,
    'Coveñas', 'CIUDAD', 0, 1026, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1034, '70230', 170, 70, 230,
    'El Roble', 'CIUDAD', 0, 1026, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1035, '70265', 170, 70, 265,
    'Galeras', 'CIUDAD', 0, 1026, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1036, '70265', 170, 70, 265,
    'Guaranda', 'CIUDAD', 0, 1026, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1037, '70400', 170, 70, 400,
    'La Unión', 'CIUDAD', 0, 1026, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1038, '70418', 170, 70, 418,
    'Los Palmitos', 'CIUDAD', 0, 1026, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1039, '70429', 170, 70, 429,
    'Majagual', 'CIUDAD', 0, 1026, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1040, '70473', 170, 70, 473,
    'Morroa', 'CIUDAD', 0, 1026, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1041, '70508', 170, 70, 508,
    'Ovejas', 'CIUDAD', 0, 1026, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1042, '70523', 170, 70, 523,
    'Palmito', 'CIUDAD', 0, 1026, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1043, '70670', 170, 70, 670,
    'Sampués', 'CIUDAD', 0, 1026, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1044, '70678', 170, 70, 678,
    'San Benito Abad', 'CIUDAD', 0, 1026, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1045, '70702', 170, 70, 702,
    'San Juan de Betulia', 'CIUDAD', 0, 1026, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1046, '70708', 170, 70, 708,
    'San Marcos', 'CIUDAD', 0, 1026, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1047, '70713', 170, 70, 713,
    'San Onofre', 'CIUDAD', 0, 1026, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1048, '70717', 170, 70, 717,
    'San Pedro', 'CIUDAD', 0, 1026, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1049, '70742', 170, 70, 742,
    'San Luis de Sincé', 'CIUDAD', 0, 1026, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1050, '70771', 170, 70, 771,
    'Sucre', 'CIUDAD', 0, 1026, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1051, '70820', 170, 70, 820,
    'Santiago de Tolú', 'CIUDAD', 0, 1026, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1052, '70823', 170, 70, 823,
    'Tolú Viejo', 'CIUDAD', 0, 1026, CURRENT_DATE, 'SYSTEM'
);


-- ============================================
-- TOLIMA (Código 73)
-- 47 municipios
-- ============================================

-- Departamento: Tolima
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento,
    nom_div_geopolitica, tip_division, ind_oculto, fec_creacion, usu_creacion
) VALUES (
    1053, '73', 170, 73,
    'Tolima', 'DEPTO', 0, CURRENT_DATE, 'SYSTEM'
);

-- Municipios de Tolima
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1054, '73001', 170, 73, 1,
    'Ibagué', 'CIUDAD', 0, 1053, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1055, '73024', 170, 73, 24,
    'Alpujarra', 'CIUDAD', 0, 1053, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1056, '73026', 170, 73, 26,
    'Alvarado', 'CIUDAD', 0, 1053, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1057, '73030', 170, 73, 30,
    'Ambalema', 'CIUDAD', 0, 1053, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1058, '73043', 170, 73, 43,
    'Anzoátegui', 'CIUDAD', 0, 1053, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1059, '73055', 170, 73, 55,
    'Armero', 'CIUDAD', 0, 1053, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1060, '73067', 170, 73, 67,
    'Ataco', 'CIUDAD', 0, 1053, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1061, '73124', 170, 73, 124,
    'Cajamarca', 'CIUDAD', 0, 1053, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1062, '73148', 170, 73, 148,
    'Carmen de Apicalá', 'CIUDAD', 0, 1053, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1063, '73152', 170, 73, 152,
    'Casabianca', 'CIUDAD', 0, 1053, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1064, '73168', 170, 73, 168,
    'Chaparral', 'CIUDAD', 0, 1053, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1065, '73200', 170, 73, 200,
    'Coello', 'CIUDAD', 0, 1053, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1066, '73217', 170, 73, 217,
    'Coyaima', 'CIUDAD', 0, 1053, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1067, '73226', 170, 73, 226,
    'Cunday', 'CIUDAD', 0, 1053, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1068, '73236', 170, 73, 236,
    'Dolores', 'CIUDAD', 0, 1053, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1069, '73268', 170, 73, 268,
    'Espinal', 'CIUDAD', 0, 1053, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1070, '73270', 170, 73, 270,
    'Falan', 'CIUDAD', 0, 1053, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1071, '73275', 170, 73, 275,
    'Flandes', 'CIUDAD', 0, 1053, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1072, '73283', 170, 73, 283,
    'Fresno', 'CIUDAD', 0, 1053, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1073, '73319', 170, 73, 319,
    'Guamo', 'CIUDAD', 0, 1053, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1074, '73347', 170, 73, 347,
    'Herveo', 'CIUDAD', 0, 1053, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1075, '73349', 170, 73, 349,
    'Honda', 'CIUDAD', 0, 1053, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1076, '73352', 170, 73, 352,
    'Icononzo', 'CIUDAD', 0, 1053, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1077, '73408', 170, 73, 408,
    'Lérida', 'CIUDAD', 0, 1053, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1078, '73411', 170, 73, 411,
    'Líbano', 'CIUDAD', 0, 1053, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1079, '73443', 170, 73, 443,
    'Mariquita', 'CIUDAD', 0, 1053, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1080, '73449', 170, 73, 449,
    'Melgar', 'CIUDAD', 0, 1053, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1081, '73483', 170, 73, 483,
    'Murillo', 'CIUDAD', 0, 1053, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1082, '73483', 170, 73, 483,
    'Natagaima', 'CIUDAD', 0, 1053, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1083, '73504', 170, 73, 504,
    'Ortega', 'CIUDAD', 0, 1053, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1084, '73520', 170, 73, 520,
    'Palocabildo', 'CIUDAD', 0, 1053, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1085, '73547', 170, 73, 547,
    'Piedras', 'CIUDAD', 0, 1053, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1086, '73555', 170, 73, 555,
    'Planadas', 'CIUDAD', 0, 1053, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1087, '73563', 170, 73, 563,
    'Prado', 'CIUDAD', 0, 1053, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1088, '73585', 170, 73, 585,
    'Purificación', 'CIUDAD', 0, 1053, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1089, '73616', 170, 73, 616,
    'Rioblanco', 'CIUDAD', 0, 1053, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1090, '73622', 170, 73, 622,
    'Roncesvalles', 'CIUDAD', 0, 1053, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1091, '73624', 170, 73, 624,
    'Rovira', 'CIUDAD', 0, 1053, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1092, '73671', 170, 73, 671,
    'Saldaña', 'CIUDAD', 0, 1053, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1093, '73675', 170, 73, 675,
    'San Antonio', 'CIUDAD', 0, 1053, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1094, '73678', 170, 73, 678,
    'San Luis', 'CIUDAD', 0, 1053, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1095, '73686', 170, 73, 686,
    'Santa Isabel', 'CIUDAD', 0, 1053, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1096, '73770', 170, 73, 770,
    'Suárez', 'CIUDAD', 0, 1053, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1097, '73854', 170, 73, 854,
    'Valle de San Juan', 'CIUDAD', 0, 1053, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1098, '73861', 170, 73, 861,
    'Venadillo', 'CIUDAD', 0, 1053, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1099, '73870', 170, 73, 870,
    'Villahermosa', 'CIUDAD', 0, 1053, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1100, '73873', 170, 73, 873,
    'Villarrica', 'CIUDAD', 0, 1053, CURRENT_DATE, 'SYSTEM'
);


-- ============================================
-- VALLE DEL CAUCA (Código 76)
-- 42 municipios
-- ============================================

-- Departamento: Valle del Cauca
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento,
    nom_div_geopolitica, tip_division, ind_oculto, fec_creacion, usu_creacion
) VALUES (
    1101, '76', 170, 76,
    'Valle del Cauca', 'DEPTO', 0, CURRENT_DATE, 'SYSTEM'
);

-- Municipios de Valle del Cauca
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1102, '76001', 170, 76, 1,
    'Cali', 'CIUDAD', 0, 1101, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1103, '76020', 170, 76, 20,
    'Alcalá', 'CIUDAD', 0, 1101, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1104, '76036', 170, 76, 36,
    'Andalucía', 'CIUDAD', 0, 1101, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1105, '76041', 170, 76, 41,
    'Ansermanuevo', 'CIUDAD', 0, 1101, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1106, '76054', 170, 76, 54,
    'Argelia', 'CIUDAD', 0, 1101, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1107, '76100', 170, 76, 100,
    'Bolívar', 'CIUDAD', 0, 1101, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1108, '76109', 170, 76, 109,
    'Buenaventura', 'CIUDAD', 0, 1101, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1109, '76111', 170, 76, 111,
    'Guadalajara de Buga', 'CIUDAD', 0, 1101, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1110, '76113', 170, 76, 113,
    'Bugalagrande', 'CIUDAD', 0, 1101, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1111, '76122', 170, 76, 122,
    'Caicedonia', 'CIUDAD', 0, 1101, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1112, '76126', 170, 76, 126,
    'Calima', 'CIUDAD', 0, 1101, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1113, '76130', 170, 76, 130,
    'Candelaria', 'CIUDAD', 0, 1101, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1114, '76147', 170, 76, 147,
    'Cartago', 'CIUDAD', 0, 1101, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1115, '76233', 170, 76, 233,
    'Dagua', 'CIUDAD', 0, 1101, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1116, '76243', 170, 76, 243,
    'El Águila', 'CIUDAD', 0, 1101, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1117, '76246', 170, 76, 246,
    'El Cairo', 'CIUDAD', 0, 1101, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1118, '76248', 170, 76, 248,
    'El Cerrito', 'CIUDAD', 0, 1101, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1119, '76250', 170, 76, 250,
    'El Dovio', 'CIUDAD', 0, 1101, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1120, '76275', 170, 76, 275,
    'Florida', 'CIUDAD', 0, 1101, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1121, '76306', 170, 76, 306,
    'Ginebra', 'CIUDAD', 0, 1101, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1122, '76318', 170, 76, 318,
    'Guacarí', 'CIUDAD', 0, 1101, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1123, '76364', 170, 76, 364,
    'Jamundí', 'CIUDAD', 0, 1101, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1124, '76377', 170, 76, 377,
    'La Cumbre', 'CIUDAD', 0, 1101, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1125, '76400', 170, 76, 400,
    'La Unión', 'CIUDAD', 0, 1101, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1126, '76403', 170, 76, 403,
    'La Victoria', 'CIUDAD', 0, 1101, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1127, '76497', 170, 76, 497,
    'Obando', 'CIUDAD', 0, 1101, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1128, '76520', 170, 76, 520,
    'Palmira', 'CIUDAD', 0, 1101, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1129, '76563', 170, 76, 563,
    'Pradera', 'CIUDAD', 0, 1101, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1130, '76606', 170, 76, 606,
    'Restrepo', 'CIUDAD', 0, 1101, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1131, '76616', 170, 76, 616,
    'Riofrío', 'CIUDAD', 0, 1101, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1132, '76622', 170, 76, 622,
    'Roldanillo', 'CIUDAD', 0, 1101, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1133, '76670', 170, 76, 670,
    'San Pedro', 'CIUDAD', 0, 1101, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1134, '76736', 170, 76, 736,
    'Sevilla', 'CIUDAD', 0, 1101, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1135, '76823', 170, 76, 823,
    'Toro', 'CIUDAD', 0, 1101, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1136, '76828', 170, 76, 828,
    'Trujillo', 'CIUDAD', 0, 1101, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1137, '76834', 170, 76, 834,
    'Tuluá', 'CIUDAD', 0, 1101, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1138, '76845', 170, 76, 845,
    'Ulloa', 'CIUDAD', 0, 1101, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1139, '76863', 170, 76, 863,
    'Versalles', 'CIUDAD', 0, 1101, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1140, '76869', 170, 76, 869,
    'Vijes', 'CIUDAD', 0, 1101, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1141, '76890', 170, 76, 890,
    'Yotoco', 'CIUDAD', 0, 1101, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1142, '76892', 170, 76, 892,
    'Yumbo', 'CIUDAD', 0, 1101, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1143, '76895', 170, 76, 895,
    'Zarzal', 'CIUDAD', 0, 1101, CURRENT_DATE, 'SYSTEM'
);


-- ============================================
-- VAUPÉS (Código 97)
-- 6 municipios
-- ============================================

-- Departamento: Vaupés
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento,
    nom_div_geopolitica, tip_division, ind_oculto, fec_creacion, usu_creacion
) VALUES (
    1144, '97', 170, 97,
    'Vaupés', 'DEPTO', 0, CURRENT_DATE, 'SYSTEM'
);

-- Municipios de Vaupés
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1145, '97001', 170, 97, 1,
    'Mitú', 'CIUDAD', 0, 1144, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1146, '97161', 170, 97, 161,
    'Caruru', 'CIUDAD', 0, 1144, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1147, '97511', 170, 97, 511,
    'Pacoa', 'CIUDAD', 0, 1144, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1148, '97777', 170, 97, 777,
    'Taraira', 'CIUDAD', 0, 1144, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1149, '97889', 170, 97, 889,
    'Papunaua', 'CIUDAD', 0, 1144, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1150, '97666', 170, 97, 666,
    'Yavaraté', 'CIUDAD', 0, 1144, CURRENT_DATE, 'SYSTEM'
);


-- ============================================
-- VICHADA (Código 99)
-- 4 municipios
-- ============================================

-- Departamento: Vichada
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento,
    nom_div_geopolitica, tip_division, ind_oculto, fec_creacion, usu_creacion
) VALUES (
    1151, '99', 170, 99,
    'Vichada', 'DEPTO', 0, CURRENT_DATE, 'SYSTEM'
);

-- Municipios de Vichada
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1152, '99001', 170, 99, 1,
    'Puerto Carreño', 'CIUDAD', 0, 1151, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1153, '99524', 170, 99, 524,
    'La Primavera', 'CIUDAD', 0, 1151, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1154, '99624', 170, 99, 624,
    'Santa Rosalía', 'CIUDAD', 0, 1151, CURRENT_DATE, 'SYSTEM'
);
INSERT INTO auth.geopolitica (
    id_geopolitica, cod_geopolitica, cod_pais, cod_departamento, cod_ciudad,
    nom_div_geopolitica, tip_division, ind_oculto, id_padre, fec_creacion, usu_creacion
) VALUES (
    1155, '99773', 170, 99, 773,
    'Cumaribo', 'CIUDAD', 0, 1151, CURRENT_DATE, 'SYSTEM'
);


-- =====================================================
-- VERIFICACIÓN
-- =====================================================
SELECT
    tip_division,
    COUNT(*) as cantidad
FROM auth.geopolitica
GROUP BY tip_division;

-- Esperado: 33 DEPTO, 1122 CIUDAD
