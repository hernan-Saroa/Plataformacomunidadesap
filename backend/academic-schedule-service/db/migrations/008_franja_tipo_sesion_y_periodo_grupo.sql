-- ============================================================================
-- EFDS-1371 — Horario y calendario del grupo
--
-- ⚠️ DISTINCIÓN CRÍTICA DE NOMENCLATURA
-- `tipo_sesion` (presencial / mediada por tecnología) es de la SESIÓN y lo define
-- el programador aquí. `asignatura.modalidad` (virtual, presencial_dia…) es dato
-- maestro del SNIES, de solo lectura, y vive en otra tabla y otro esquema.
-- Son ortogonales: una asignatura `virtual` puede tener sesiones `presencial`.
-- Confundirlos rompe el cálculo de comisiones y desplazamiento en la fase 3, así
-- que se nombran distinto a propósito y jamás se derivan uno del otro.
--
-- Forward-only e idempotente.
-- ============================================================================

-- 1) Tipo de sesión. Default 'presencial' por ser el caso mayoritario; el
--    programador lo cambia por sesión.
ALTER TABLE "academic-schedule".franja_horaria
    ADD COLUMN IF NOT EXISTS tipo_sesion VARCHAR(30) NOT NULL DEFAULT 'presencial';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_franja_tipo_sesion') THEN
        ALTER TABLE "academic-schedule".franja_horaria
            ADD CONSTRAINT chk_franja_tipo_sesion
            CHECK (tipo_sesion IN ('presencial', 'mediada_tecnologia'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_franja_jornada') THEN
        ALTER TABLE "academic-schedule".franja_horaria
            ADD CONSTRAINT chk_franja_jornada
            CHECK (jornada IS NULL OR jornada IN ('DIURNA', 'NOCTURNA', 'FIN_DE_SEMANA'));
    END IF;

    -- Sin cruce de medianoche: no hay caso de uso y complica el solapamiento.
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_franja_horas_coherentes') THEN
        ALTER TABLE "academic-schedule".franja_horaria
            ADD CONSTRAINT chk_franja_horas_coherentes
            CHECK (hora_fin > hora_inicio);
    END IF;

    -- Lunes a domingo (AC-03). Se guarda en mayúsculas sin tilde.
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_franja_dia_semana') THEN
        ALTER TABLE "academic-schedule".franja_horaria
            ADD CONSTRAINT chk_franja_dia_semana
            CHECK (dia_semana IN ('LUNES','MARTES','MIERCOLES','JUEVES','VIERNES','SABADO','DOMINGO'));
    END IF;
END $$;

-- 2) La sesión puede existir ANTES de asignarle salón: el horario se define
--    primero y el aula se asigna después (su bloqueo es de otra fase). Con estas
--    columnas en NOT NULL no se podía programar nada sin inventar un aula.
ALTER TABLE "academic-schedule".franja_horaria ALTER COLUMN sede_codigo DROP NOT NULL;
ALTER TABLE "academic-schedule".franja_horaria ALTER COLUMN aula_codigo DROP NOT NULL;

-- 3) Periodo del ciclo de clases, propio de CADA grupo (AC-01). No se toma del
--    periodo institucional: dos grupos de la misma asignatura pueden tener
--    ventanas distintas (p. ej. APT concentra 12 sesiones en un mes).
ALTER TABLE "academic-schedule".grupo
    ADD COLUMN IF NOT EXISTS fecha_inicio DATE,
    ADD COLUMN IF NOT EXISTS fecha_fin    DATE;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_grupo_periodo_coherente') THEN
        ALTER TABLE "academic-schedule".grupo
            ADD CONSTRAINT chk_grupo_periodo_coherente
            CHECK (fecha_inicio IS NULL OR fecha_fin IS NULL OR fecha_fin >= fecha_inicio);
    END IF;
END $$;

COMMENT ON COLUMN "academic-schedule".franja_horaria.tipo_sesion IS
    'Presencial o mediada por tecnologia. Es de la SESION y NO tiene relacion con asignatura.modalidad, que es dato maestro del SNIES.';
COMMENT ON COLUMN "academic-schedule".grupo.fecha_inicio IS
    'Inicio del ciclo de clases de ESTE grupo. Cada grupo tiene su ventana propia.';
