-- ============================================================================
-- 062 · EFDS-2347 — Festivos, recesos y sesiones reales de cada franja.
--
-- Decisiones del negocio (ronda 3b): las horas de un festivo SE DESCUENTAN (no
-- entran al acumulado ni al PTA); los recesos son los mismos para todos, por
-- periodo; los fines de semana cuentan; cargar los festivos de 2026 y 2027.
--
--   · festivo                — un día festivo nacional (Ley 51 de 1983).
--   · periodo_receso         — receso de un periodo (plataforma o legado), igual
--                              para todos sus grupos.
--   · sesiones_de_franja(id) — LA regla única: cuántas sesiones tiene la franja en
--                              el ciclo efectivo de su grupo (el suyo o el de su
--                              periodo), cuántas caen en festivo o receso, y las
--                              horas de clase reales (sesiones válidas × duración).
--                              Avisa los años del ciclo sin festivos cargados.
--
-- Forward-only e idempotente. SQL puro.
-- ============================================================================

CREATE TABLE IF NOT EXISTS "academic-schedule".festivo (
    fecha   DATE PRIMARY KEY,
    nombre  VARCHAR(120) NOT NULL,
    fuente  VARCHAR(60)  NOT NULL DEFAULT 'Ley 51 de 1983'
);

COMMENT ON TABLE "academic-schedule".festivo IS
  'Festivos nacionales (EFDS-2347). Una sesión que cae en festivo no se dicta: sus horas no cuentan.';

INSERT INTO "academic-schedule".festivo (fecha, nombre) VALUES
  -- 2026 (Pascua: 5 de abril)
  ('2026-01-01', 'Año Nuevo'),
  ('2026-01-12', 'Día de los Reyes Magos'),
  ('2026-03-23', 'Día de San José'),
  ('2026-04-02', 'Jueves Santo'),
  ('2026-04-03', 'Viernes Santo'),
  ('2026-05-01', 'Día del Trabajo'),
  ('2026-05-18', 'Ascensión del Señor'),
  ('2026-06-08', 'Corpus Christi'),
  ('2026-06-15', 'Sagrado Corazón'),
  ('2026-06-29', 'San Pedro y San Pablo'),
  ('2026-07-20', 'Día de la Independencia'),
  ('2026-08-07', 'Batalla de Boyacá'),
  ('2026-08-17', 'Asunción de la Virgen'),
  ('2026-10-12', 'Día de la Raza'),
  ('2026-11-02', 'Todos los Santos'),
  ('2026-11-16', 'Independencia de Cartagena'),
  ('2026-12-08', 'Inmaculada Concepción'),
  ('2026-12-25', 'Navidad'),
  -- 2027 (Pascua: 28 de marzo)
  ('2027-01-01', 'Año Nuevo'),
  ('2027-01-11', 'Día de los Reyes Magos'),
  ('2027-03-22', 'Día de San José'),
  ('2027-03-25', 'Jueves Santo'),
  ('2027-03-26', 'Viernes Santo'),
  ('2027-05-01', 'Día del Trabajo'),
  ('2027-05-10', 'Ascensión del Señor'),
  ('2027-05-31', 'Corpus Christi'),
  ('2027-06-07', 'Sagrado Corazón'),
  ('2027-07-05', 'San Pedro y San Pablo'),
  ('2027-07-20', 'Día de la Independencia'),
  ('2027-08-07', 'Batalla de Boyacá'),
  ('2027-08-16', 'Asunción de la Virgen'),
  ('2027-10-18', 'Día de la Raza'),
  ('2027-11-01', 'Todos los Santos'),
  ('2027-11-15', 'Independencia de Cartagena'),
  ('2027-12-08', 'Inmaculada Concepción'),
  ('2027-12-25', 'Navidad')
ON CONFLICT (fecha) DO NOTHING;

CREATE TABLE IF NOT EXISTS "academic-schedule".periodo_receso (
    id_receso            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Periodo de plataforma o legado: exactamente uno.
    id_periodo_academico BIGINT REFERENCES academic_work_plan.periodo_academico(id) ON DELETE CASCADE,
    id_periodo           UUID   REFERENCES "academic-schedule".periodo_programacion(id_periodo) ON DELETE CASCADE,
    fecha_inicio         DATE NOT NULL,
    fecha_fin            DATE NOT NULL,
    motivo               VARCHAR(200) NOT NULL,
    creado_por           VARCHAR(120),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_receso_un_periodo CHECK ((id_periodo_academico IS NULL) <> (id_periodo IS NULL)),
    CONSTRAINT chk_receso_fechas CHECK (fecha_fin >= fecha_inicio)
);

CREATE INDEX IF NOT EXISTS idx_receso_periodo_academico ON "academic-schedule".periodo_receso (id_periodo_academico);
CREATE INDEX IF NOT EXISTS idx_receso_periodo ON "academic-schedule".periodo_receso (id_periodo);

COMMENT ON TABLE "academic-schedule".periodo_receso IS
  'Recesos de un periodo (EFDS-2347), iguales para todos sus grupos. Las sesiones que caen en un receso no cuentan.';

-- ── La regla única de sesiones ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION "academic-schedule".sesiones_de_franja(p_id_franja uuid)
RETURNS TABLE (
    sesiones_ciclo  int,       -- días del ciclo con el día de la semana de la franja
    festivos        int,       -- de esas, las que caen en festivo
    recesos         int,       -- las que caen en receso (y no en festivo)
    sesiones        int,       -- las que se dictan
    horas_sesion    numeric,   -- duración de una sesión, en horas
    horas           numeric,   -- horas de clase reales: sesiones × duración
    anios_sin_festivos int[]   -- años del ciclo sin festivos cargados (aviso)
) LANGUAGE sql STABLE AS $$
  WITH f AS (
    SELECT fh.id_franja, g.id_periodo_academico, g.id_periodo,
           COALESCE(g.fecha_inicio, pa.fecha_inicio, pp.fecha_inicio)::date AS ini,
           COALESCE(g.fecha_fin, pa.fecha_fin, pp.fecha_fin)::date AS fin,
           CASE upper(fh.dia_semana)
             WHEN 'LUNES' THEN 1 WHEN 'MARTES' THEN 2 WHEN 'MIERCOLES' THEN 3 WHEN 'MIÉRCOLES' THEN 3
             WHEN 'JUEVES' THEN 4 WHEN 'VIERNES' THEN 5 WHEN 'SABADO' THEN 6 WHEN 'SÁBADO' THEN 6
             WHEN 'DOMINGO' THEN 7 END AS dow,
           EXTRACT(EPOCH FROM (fh.hora_fin - fh.hora_inicio)) / 3600.0 AS duracion
      FROM "academic-schedule".franja_horaria fh
      LEFT JOIN "academic-schedule".grupo g ON g.id_grupo = fh.id_grupo
      LEFT JOIN academic_work_plan.periodo_academico pa ON pa.id = g.id_periodo_academico
      LEFT JOIN "academic-schedule".periodo_programacion pp ON pp.id_periodo = g.id_periodo
     WHERE fh.id_franja = p_id_franja
  ), dias AS (
    SELECT d::date AS dia,
           EXISTS (SELECT 1 FROM "academic-schedule".festivo fe WHERE fe.fecha = d::date) AS es_festivo,
           EXISTS (SELECT 1 FROM "academic-schedule".periodo_receso r
                    WHERE (r.id_periodo_academico = f.id_periodo_academico OR r.id_periodo = f.id_periodo)
                      AND d::date BETWEEN r.fecha_inicio AND r.fecha_fin) AS es_receso
      FROM f, generate_series(f.ini, f.fin, interval '1 day') AS d
     WHERE f.ini IS NOT NULL AND f.fin IS NOT NULL AND EXTRACT(ISODOW FROM d) = f.dow
  )
  SELECT CASE WHEN f.ini IS NULL OR f.fin IS NULL OR f.dow IS NULL THEN NULL ELSE (SELECT count(*)::int FROM dias) END,
         CASE WHEN f.ini IS NULL OR f.fin IS NULL OR f.dow IS NULL THEN NULL ELSE (SELECT count(*) FILTER (WHERE es_festivo)::int FROM dias) END,
         CASE WHEN f.ini IS NULL OR f.fin IS NULL OR f.dow IS NULL THEN NULL ELSE (SELECT count(*) FILTER (WHERE es_receso AND NOT es_festivo)::int FROM dias) END,
         CASE WHEN f.ini IS NULL OR f.fin IS NULL OR f.dow IS NULL THEN NULL ELSE (SELECT count(*) FILTER (WHERE NOT es_festivo AND NOT es_receso)::int FROM dias) END,
         round(f.duracion::numeric, 4),
         CASE WHEN f.ini IS NULL OR f.fin IS NULL OR f.dow IS NULL THEN NULL
              ELSE round(((SELECT count(*) FILTER (WHERE NOT es_festivo AND NOT es_receso) FROM dias) * f.duracion)::numeric, 2) END,
         CASE WHEN f.ini IS NULL OR f.fin IS NULL THEN '{}'::int[]
              ELSE ARRAY(SELECT y::int FROM generate_series(EXTRACT(YEAR FROM f.ini)::int, EXTRACT(YEAR FROM f.fin)::int) AS y
                          WHERE NOT EXISTS (SELECT 1 FROM "academic-schedule".festivo fe WHERE EXTRACT(YEAR FROM fe.fecha) = y)) END
    FROM f;
$$;

COMMENT ON FUNCTION "academic-schedule".sesiones_de_franja(uuid) IS
  'Sesiones reales de la franja en el ciclo efectivo de su grupo (EFDS-2347): festivos y recesos no cuentan; fines de semana sí. NULL sin ciclo.';

-- ── Canario ─────────────────────────────────────────────────────────────────────
DO $$
DECLARE v_2026 INT; v_2027 INT; v_mal INT;
BEGIN
  SELECT count(*) INTO v_2026 FROM "academic-schedule".festivo WHERE EXTRACT(YEAR FROM fecha) = 2026;
  SELECT count(*) INTO v_2027 FROM "academic-schedule".festivo WHERE EXTRACT(YEAR FROM fecha) = 2027;
  IF v_2026 <> 18 OR v_2027 <> 18 THEN
    RAISE EXCEPTION '062: se esperaban 18 festivos por año (2026: %, 2027: %)', v_2026, v_2027;
  END IF;
  -- Los trasladables (Ley Emiliani) caen en lunes.
  SELECT count(*) INTO v_mal FROM "academic-schedule".festivo
   WHERE EXTRACT(YEAR FROM fecha) IN (2026, 2027)
     AND nombre IN ('Día de los Reyes Magos', 'Día de San José', 'Ascensión del Señor', 'Corpus Christi', 'Sagrado Corazón',
                    'San Pedro y San Pablo', 'Asunción de la Virgen', 'Día de la Raza', 'Todos los Santos', 'Independencia de Cartagena')
     AND EXTRACT(ISODOW FROM fecha) <> 1;
  IF v_mal > 0 THEN
    RAISE EXCEPTION '062: % festivos trasladables no caen en lunes', v_mal;
  END IF;
END $$;
