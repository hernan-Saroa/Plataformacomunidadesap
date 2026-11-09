-- ============================================================================
-- 063 · Grupo virtual con horario opcional que define el docente.
--
-- Pedido de Tomás (nov-2026): un grupo VIRTUAL (mediado por tecnologías) no tiene
-- aula y su horario es opcional al crearlo. Se le puede asignar docente sin
-- franjas; luego el docente, en «Mi programación», define el horario con las
-- mismas reglas de siempre (choques, horas del grupo, tope).
--
--   · grupo.modalidad              — 'presencial' (por defecto, como hasta hoy) o
--                                    'virtual'. En un grupo virtual las sesiones son
--                                    mediadas por tecnología y sin aula.
--   · franja_horaria.definida_por  — 'programador' (por defecto) o 'docente': quién
--                                    creó la franja. El docente solo quita las suyas.
--
-- Forward-only e idempotente. SQL puro.
-- ============================================================================

ALTER TABLE "academic-schedule".grupo
  ADD COLUMN IF NOT EXISTS modalidad VARCHAR(20) NOT NULL DEFAULT 'presencial';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_grupo_modalidad') THEN
    ALTER TABLE "academic-schedule".grupo
      ADD CONSTRAINT chk_grupo_modalidad CHECK (modalidad IN ('presencial', 'virtual'));
  END IF;
END $$;

COMMENT ON COLUMN "academic-schedule".grupo.modalidad IS
  'presencial | virtual. Virtual: sesiones mediadas por tecnología, sin aula; el horario es opcional y lo puede definir el docente asignado.';

ALTER TABLE "academic-schedule".franja_horaria
  ADD COLUMN IF NOT EXISTS definida_por VARCHAR(20) NOT NULL DEFAULT 'programador';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_franja_definida_por') THEN
    ALTER TABLE "academic-schedule".franja_horaria
      ADD CONSTRAINT chk_franja_definida_por CHECK (definida_por IN ('programador', 'docente'));
  END IF;
END $$;

COMMENT ON COLUMN "academic-schedule".franja_horaria.definida_por IS
  'Quién creó la franja: programador (backoffice) o docente (grupo virtual, desde «Mi programación»).';
