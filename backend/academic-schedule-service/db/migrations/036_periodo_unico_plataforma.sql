-- ============================================================================
-- 036 · EFDS-2328 — Periodo único de plataforma.
--
-- El periodo de Programación Académica pasa a ser el de la plataforma
-- (`academic_work_plan.periodo_academico`, el del PTA). Este servicio NO crea
-- periodos ni escribe en ese esquema: solo lo REFERENCIA por llave foránea,
-- igual que ya referencia el catálogo de asignaturas.
--
-- Lo que hace:
--   1. `programacion_periodo`: extensión 1 a 1 de periodo_academico con el
--      estado PROPIO de la programación. "Cerrar" en este módulo cierra la
--      programación, no el periodo de la plataforma (decisión de la ronda v2).
--      Sin fila = programación abierta.
--   2. `equivalencia_periodo`: tabla EXPLÍCITA de los periodos viejos a los de
--      plataforma. Nada se empareja por nombre ni por fechas. El interperiodo
--      queda SIN destino hasta que el negocio diga a qué semestre pertenece.
--   3. `grupo.id_periodo_academico` + `grupo.tipo_oferta`: la oferta (regular,
--      créditos virtuales, interperiodo) deja de ser un periodo y pasa a ser un
--      atributo del grupo.
--   4. `reapuntar_grupos_por_equivalencia()`: reapunta los grupos cuyo periodo
--      viejo tiene destino YA EXISTENTE en la plataforma. Idempotente: se puede
--      volver a correr cuando el PTA cree 2026-1 o 2026-2.
--
-- ⚠️ La tabla vieja `periodo_programacion` y `grupo.id_periodo` NO se borran:
-- los periodos sin equivalencia (2026-INT, pruebas) siguen operando sobre ellos.
--
-- Forward-only e idempotente. SQL puro.
-- ============================================================================

-- 1) Estado propio de la programación, 1 a 1 con el periodo de plataforma.
CREATE TABLE IF NOT EXISTS "academic-schedule".programacion_periodo (
    id_periodo_academico BIGINT PRIMARY KEY
                         REFERENCES academic_work_plan.periodo_academico(id) ON DELETE RESTRICT,
    estado               VARCHAR(20) NOT NULL DEFAULT 'abierta'
                         CONSTRAINT chk_programacion_periodo_estado CHECK (estado IN ('abierta', 'cerrada')),
    cerrada_en           TIMESTAMPTZ,
    cerrada_por          UUID,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2) Equivalencias explícitas, revisables. destino NULL = fuera de la migración.
CREATE TABLE IF NOT EXISTS "academic-schedule".equivalencia_periodo (
    codigo_programacion      VARCHAR(20) PRIMARY KEY
                             REFERENCES "academic-schedule".periodo_programacion(codigo) ON DELETE RESTRICT,
    codigo_periodo_academico VARCHAR(10),
    tipo_oferta              VARCHAR(30) NOT NULL
                             CONSTRAINT chk_equivalencia_tipo_oferta
                             CHECK (tipo_oferta IN ('periodo_regular', 'creditos_virtual', 'interperiodo')),
    motivo                   TEXT NOT NULL
);

INSERT INTO "academic-schedule".equivalencia_periodo (codigo_programacion, codigo_periodo_academico, tipo_oferta, motivo)
SELECT v.origen, v.destino, v.tipo, v.motivo
  FROM (VALUES
    ('2026-1',   '2026-1', 'periodo_regular',  'Oferta regular del primer semestre de 2026.'),
    ('2026-V1',  '2026-1', 'creditos_virtual', 'Créditos virtuales: mismas fechas que 2026-1; la oferta pasa al grupo.'),
    ('2026-2',   '2026-2', 'periodo_regular',  'Oferta regular del segundo semestre de 2026.'),
    ('2026-V2',  '2026-2', 'creditos_virtual', 'Créditos virtuales: mismas fechas que 2026-2; la oferta pasa al grupo.'),
    ('2026-INT', NULL,     'interperiodo',     'Fuera de la migración hasta que el negocio defina a qué semestre pertenece.')
  ) AS v(origen, destino, tipo, motivo)
 WHERE EXISTS (SELECT 1 FROM "academic-schedule".periodo_programacion pp WHERE pp.codigo = v.origen)
ON CONFLICT (codigo_programacion) DO NOTHING;

-- 3) El grupo apunta al periodo de plataforma y lleva su tipo de oferta.
ALTER TABLE "academic-schedule".grupo
  ADD COLUMN IF NOT EXISTS id_periodo_academico BIGINT
      REFERENCES academic_work_plan.periodo_academico(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS tipo_oferta VARCHAR(30);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_grupo_tipo_oferta') THEN
    ALTER TABLE "academic-schedule".grupo
      ADD CONSTRAINT chk_grupo_tipo_oferta
      CHECK (tipo_oferta IS NULL OR tipo_oferta IN ('periodo_regular', 'creditos_virtual', 'interperiodo'));
  END IF;
  -- Un grupo de plataforma necesita su tipo de oferta.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_grupo_plataforma_con_oferta') THEN
    ALTER TABLE "academic-schedule".grupo
      ADD CONSTRAINT chk_grupo_plataforma_con_oferta
      CHECK (id_periodo_academico IS NULL OR tipo_oferta IS NOT NULL);
  END IF;
END $$;

-- La numeración es por asignatura, periodo y OFERTA: un grupo 1 regular y un
-- grupo 1 virtual de la misma asignatura en el mismo semestre son distintos
-- (antes vivían en periodos distintos).
CREATE UNIQUE INDEX IF NOT EXISTS uq_grupo_numero_plataforma
    ON "academic-schedule".grupo (id_asignatura, id_periodo_academico, tipo_oferta, numero_grupo)
 WHERE id_periodo_academico IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_grupo_periodo_academico
    ON "academic-schedule".grupo (id_periodo_academico);

-- 4) Reapuntar por la tabla de equivalencias, solo hacia periodos que existan.
CREATE OR REPLACE FUNCTION "academic-schedule".reapuntar_grupos_por_equivalencia()
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE
  v_n INTEGER;
BEGIN
  UPDATE "academic-schedule".grupo g
     SET id_periodo_academico = pa.id,
         tipo_oferta          = e.tipo_oferta,
         updated_at           = NOW()
    FROM "academic-schedule".periodo_programacion pp
    JOIN "academic-schedule".equivalencia_periodo e ON e.codigo_programacion = pp.codigo
    JOIN academic_work_plan.periodo_academico pa    ON pa.codigo = e.codigo_periodo_academico
   WHERE g.id_periodo = pp.id_periodo
     AND g.id_periodo_academico IS NULL;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END $$;

DO $$
DECLARE
  v_reapuntados INTEGER;
  v_pendientes  INTEGER;
BEGIN
  v_reapuntados := "academic-schedule".reapuntar_grupos_por_equivalencia();
  SELECT COUNT(*) INTO v_pendientes
    FROM "academic-schedule".grupo g
    JOIN "academic-schedule".periodo_programacion pp ON pp.id_periodo = g.id_periodo
    JOIN "academic-schedule".equivalencia_periodo e ON e.codigo_programacion = pp.codigo
   WHERE g.id_periodo_academico IS NULL AND e.codigo_periodo_academico IS NOT NULL;
  RAISE NOTICE '036: grupos reapuntados=% · con destino que aún no existe en la plataforma=%',
    v_reapuntados, v_pendientes;
END $$;
