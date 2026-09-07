-- ============================================================================
-- EFDS-1375 - Ofertas académicas (5 tipos)
--
-- La oferta académica es el periodo de programación, que ya existía en el
-- esquema del enabler (periodo_programacion). Se le agrega el TIPO para
-- distinguir las cinco ofertas:
--   dos periodos regulares, dos de créditos con estrategia virtual, un
--   interperiodo.
--
-- ⚠️ C-5: el calendario oficial no está confirmado. Las FECHAS quedan
-- parametrizables (se siembran valores de referencia); cuando llegue el
-- calendario, es carga de datos, no cambio de modelo.
--
-- El acumulado de EFDS-1373 ya agrupa por periodo (oferta): esta migración solo
-- puebla la dimensión, no rehace nada.
-- ============================================================================

ALTER TABLE "academic-schedule".periodo_programacion
    ADD COLUMN IF NOT EXISTS tipo VARCHAR(30);

-- CHECK de los tipos válidos. Se agrega por separado y con guardas para ser
-- idempotente ante reejecución.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'periodo_tipo_check'
  ) THEN
    ALTER TABLE "academic-schedule".periodo_programacion
      ADD CONSTRAINT periodo_tipo_check
      CHECK (tipo IS NULL OR tipo IN ('periodo_regular', 'creditos_virtual', 'interperiodo'));
  END IF;
END $$;

COMMENT ON COLUMN "academic-schedule".periodo_programacion.tipo IS
  'Tipo de oferta académica (EFDS-1375): periodo_regular, creditos_virtual o interperiodo.';

-- Semilla de las 5 ofertas. Fechas de referencia (C-5): parametrizables cuando
-- llegue el calendario oficial. Idempotente por codigo.
INSERT INTO "academic-schedule".periodo_programacion (id_periodo, codigo, nombre, tipo, fecha_inicio, fecha_fin, is_activo)
SELECT gen_random_uuid(), v.codigo, v.nombre, v.tipo, v.fi::date, v.ff::date, TRUE
  FROM (VALUES
    ('2026-1',   'Periodo Regular 2026-1',        'periodo_regular',  '2026-02-01', '2026-06-15'),
    ('2026-2',   'Periodo Regular 2026-2',        'periodo_regular',  '2026-07-15', '2026-11-30'),
    ('2026-V1',  'Créditos Virtual 2026-1',       'creditos_virtual', '2026-02-01', '2026-06-15'),
    ('2026-V2',  'Créditos Virtual 2026-2',       'creditos_virtual', '2026-07-15', '2026-11-30'),
    ('2026-INT', 'Interperiodo 2026',             'interperiodo',     '2026-06-16', '2026-07-14')
  ) AS v(codigo, nombre, tipo, fi, ff)
 WHERE NOT EXISTS (
   SELECT 1 FROM "academic-schedule".periodo_programacion pp WHERE pp.codigo = v.codigo);
