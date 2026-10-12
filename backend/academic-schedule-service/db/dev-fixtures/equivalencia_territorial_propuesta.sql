-- ============================================================================
-- SOLO PARA DESARROLLO LOCAL. NO ES UNA MIGRACIÓN.
--
-- Propuesta de equivalencia territorial RUND ↔ auth.seccionales (EFDS-2315),
-- PENDIENTE DE REVISIÓN DEL NEGOCIO. Todas las filas van con revisada = FALSE.
-- Se mapea a las seccionales "reales" (ids 1–18, códigos ANT, HUI…), que son
-- las que usan las personas (`auth.personas.id_seccional`).
--
-- ⚠️ FILAS DUDOSAS (marcadas en `nota`):
--   · DT-003 BOLÍVAR → 4 BOL. Existe también 900004 'BCS' (Bolívar-Córdoba-Sucre).
--   · DT-012 NORTE DE SANTANDER → 12 NDS. Existe también 900013 'NSA'.
--   · DT-010 META → 18 MET. Id fuera de la secuencia (alta posterior).
--   · SC SEDE_CENTRAL → 1 SCENT. Existe también 900001 'SC'.
-- ⚠️ SIN TERRITORIAL EN EL RUND: 13 QUI (Quindío). No tiene fila.
-- ⚠️ CATÁLOGO DUPLICADO: auth.seccionales tiene además ids 900014–900029 cuyos
--   códigos son IGUALES a los del RUND (DT-001…DT-016). Las sedes se reparten
--   entre los dos juegos. Reportado a sus dueños; aquí no se usan.
--
-- Por CÓDIGO: el RUND por `direccion_territorial.codigo`, auth por
-- `seccionales.cod_seccional`. Si un código no existe, la fila no se inserta.
-- ============================================================================

INSERT INTO "academic-schedule".equivalencia_territorial (codigo_territorial, id_seccional, revisada, nota)
SELECT v.dt, s.id_seccional, FALSE, v.nota
  FROM (VALUES
    ('SC',     'SCENT', 'DUDOSA: también existe 900001 SC'),
    ('DT-001', 'ANT',   NULL),
    ('DT-002', 'ATL',   NULL),
    ('DT-003', 'BOL',   'DUDOSA: también existe 900004 BCS (Bolívar-Córdoba-Sucre)'),
    ('DT-004', 'BOY',   NULL),
    ('DT-005', 'CAL',   NULL),
    ('DT-006', 'CAU',   NULL),
    ('DT-007', 'CHO',   NULL),
    ('DT-008', 'CUN',   NULL),
    ('DT-009', 'HUI',   NULL),
    ('DT-010', 'MET',   'DUDOSA: id 18, fuera de la secuencia'),
    ('DT-011', 'NAR',   NULL),
    ('DT-012', 'NDS',   'DUDOSA: también existe 900013 NSA'),
    ('DT-013', 'RIS',   NULL),
    ('DT-014', 'SAN',   NULL),
    ('DT-015', 'TOL',   NULL),
    ('DT-016', 'VAL',   NULL)
  ) AS v(dt, cod, nota)
  JOIN auth.seccionales s ON s.cod_seccional = v.cod AND s.id_seccional < 900000
  JOIN academic_work_plan.direccion_territorial d ON d.codigo = v.dt
ON CONFLICT (codigo_territorial) DO NOTHING;

SELECT e.codigo_territorial, d.nombre AS territorial_rund, s.cod_seccional, s.nom_seccional, e.revisada, e.nota
  FROM "academic-schedule".equivalencia_territorial e
  JOIN academic_work_plan.direccion_territorial d ON d.codigo = e.codigo_territorial
  JOIN auth.seccionales s ON s.id_seccional = e.id_seccional
 ORDER BY e.codigo_territorial;
