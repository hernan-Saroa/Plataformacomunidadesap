-- ============================================================================
-- 672 · EFDS-2346 — Periodo personalizado y periodo extraordinario.
--
-- Decisiones del negocio (ronda 3b):
--   · un tipo de periodo personalizado (p. ej. interperiodo) es un periodo más,
--     con las mismas reglas que los semestrales;
--   · un segundo periodo activo es una EXCEPCIÓN: «activar como extraordinario»,
--     acción aparte del administrador del módulo, con motivo y permiso propio
--     (pta.periodos.activar_extraordinario); de cualquier tipo; uno a la vez;
--     no cierra el periodo activo ni termina sus PTA;
--   · «el periodo activo» es el PRINCIPAL: el en curso que no es extraordinario.
--
--   · tipo: 'semestral' (AAAA-1 / AAAA-2) o 'personalizado' (código y nombre
--     propios, sin semestre).
--   · extraordinario + motivo, quién y cuándo.
--   · La BASE garantiza un solo principal en curso y un solo extraordinario en
--     curso (antes lo garantizaba solo el controlador).
--
-- Forward-only e idempotente. SQL puro. Los periodos existentes quedan
-- semestrales y no extraordinarios: nada cambia para ellos.
-- ============================================================================

ALTER TABLE academic_work_plan.periodo_academico
  ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) NOT NULL DEFAULT 'semestral',
  ADD COLUMN IF NOT EXISTS nombre VARCHAR(120),
  ADD COLUMN IF NOT EXISTS extraordinario BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS motivo_extraordinario TEXT,
  ADD COLUMN IF NOT EXISTS extraordinario_por VARCHAR(120),
  ADD COLUMN IF NOT EXISTS extraordinario_en TIMESTAMPTZ;

ALTER TABLE academic_work_plan.periodo_academico ALTER COLUMN semestre DROP NOT NULL;

ALTER TABLE academic_work_plan.periodo_academico DROP CONSTRAINT IF EXISTS periodo_academico_semestre_check;
ALTER TABLE academic_work_plan.periodo_academico DROP CONSTRAINT IF EXISTS chk_periodo_tipo;
ALTER TABLE academic_work_plan.periodo_academico DROP CONSTRAINT IF EXISTS chk_periodo_tipo_semestre;
ALTER TABLE academic_work_plan.periodo_academico DROP CONSTRAINT IF EXISTS chk_periodo_extraordinario_motivo;

ALTER TABLE academic_work_plan.periodo_academico
  ADD CONSTRAINT chk_periodo_tipo CHECK (tipo IN ('semestral', 'personalizado')),
  -- Semestral ⇔ tiene semestre 1 o 2; personalizado ⇔ sin semestre y con nombre.
  ADD CONSTRAINT chk_periodo_tipo_semestre CHECK (
    (tipo = 'semestral' AND semestre IN (1, 2))
    OR (tipo = 'personalizado' AND semestre IS NULL AND nombre IS NOT NULL)),
  ADD CONSTRAINT chk_periodo_extraordinario_motivo CHECK (
    NOT extraordinario OR length(btrim(coalesce(motivo_extraordinario, ''))) >= 10);

-- Un solo principal en curso y un solo extraordinario en curso.
CREATE UNIQUE INDEX IF NOT EXISTS uq_periodo_principal_en_curso
  ON academic_work_plan.periodo_academico ((TRUE)) WHERE estado = 'en_curso' AND NOT extraordinario;
CREATE UNIQUE INDEX IF NOT EXISTS uq_periodo_extraordinario_en_curso
  ON academic_work_plan.periodo_academico ((TRUE)) WHERE estado = 'en_curso' AND extraordinario;

COMMENT ON COLUMN academic_work_plan.periodo_academico.extraordinario IS
  'EFDS-2346: activado como segundo periodo en curso (excepción). El periodo activo de la plataforma es el principal: en curso y no extraordinario.';

-- Permiso propio de la acción (lo asigna el administrador a los roles que corresponda).
INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
SELECT gen_random_uuid(), 'pta.periodos.activar_extraordinario',
       'Periodos — Activar periodo extraordinario',
       'Activar un periodo como segundo periodo en curso (extraordinario), con motivo. No cierra el periodo activo ni termina sus PTA.',
       (SELECT id_module FROM auth.module WHERE code = 'pta'), TRUE
 WHERE NOT EXISTS (SELECT 1 FROM auth.permission WHERE code = 'pta.periodos.activar_extraordinario');

-- SUPER_ADMIN lo tiene; los demás roles, cuando el administrador lo decida.
INSERT INTO auth.role_permissions (id_rol, id_permission, is_active, created_at)
SELECT r.id, p.id_permission, TRUE, NOW()
  FROM auth.role r, auth.permission p
 WHERE r.code = 'SUPER_ADMIN' AND p.code = 'pta.periodos.activar_extraordinario'
   AND NOT EXISTS (SELECT 1 FROM auth.role_permissions rp WHERE rp.id_rol = r.id AND rp.id_permission = p.id_permission);
