-- ============================================================================
-- EFDS-1370 — Tabla `grupo`: instancia independiente de programación (RN-11)
--
-- Una asignatura puede ofertarse en varios grupos, y cada grupo es una unidad
-- INDEPENDIENTE con su propio docente, horario y fechas (AC-01, AC-02). Sin esta
-- tabla, el horario cuelga de la asignatura y no hay forma de expresar "grupo 1
-- en la mañana, grupo 2 en la tarde".
--
-- ⚠️ NO se declara UNIQUE(docente, asignatura). El AC-03 exige explícitamente que
-- el MISMO docente pueda dictar varios grupos de la MISMA asignatura. Lo que se
-- prohíbe es el cruce de FRANJAS, que es validación de horario (fase 3, RN-07),
-- no de la pareja docente-asignatura. Poner esa restricción aquí sería un bug.
--
-- Forward-only e idempotente. No edita migraciones de otra rama.
-- ============================================================================

CREATE TABLE IF NOT EXISTS "academic-schedule".grupo (
    id_grupo        UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- El catálogo es autoritativo (SNIES): se referencia, nunca se copia.
    id_asignatura   BIGINT NOT NULL
                    REFERENCES academic_work_plan.asignatura(id) ON DELETE RESTRICT,

    id_periodo      UUID REFERENCES "academic-schedule".periodo_programacion(id_periodo),

    -- Numeración secuencial dentro de (asignatura, periodo). La estrategia que la
    -- calcula está aislada en el servicio y es reemplazable: la regla definitiva
    -- sigue pendiente de confirmación con las decanaturas (bloqueo B-4).
    numero_grupo    SMALLINT NOT NULL CHECK (numero_grupo > 0),

    -- Docente asignado. Nullable a propósito: el grupo se crea y numera ANTES de
    -- definir jornada, horario y docente. La asignación real es de la fase 3.
    id_docente      UUID,

    cupo_maximo     INT NOT NULL DEFAULT 30 CHECK (cupo_maximo > 0),
    estado          VARCHAR(30) NOT NULL DEFAULT 'PROGRAMADO',
    observaciones   TEXT,

    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE,

    -- El número no se repite dentro de la misma asignatura y periodo, pero SÍ
    -- puede repetirse entre asignaturas distintas (todas tienen su "grupo 1").
    CONSTRAINT uq_grupo_numero_por_asignatura_periodo
        UNIQUE (id_asignatura, id_periodo, numero_grupo)
);

CREATE INDEX IF NOT EXISTS idx_grupo_asignatura ON "academic-schedule".grupo (id_asignatura);
CREATE INDEX IF NOT EXISTS idx_grupo_periodo    ON "academic-schedule".grupo (id_periodo);
CREATE INDEX IF NOT EXISTS idx_grupo_docente    ON "academic-schedule".grupo (id_docente);

COMMENT ON TABLE "academic-schedule".grupo IS
    'Instancia independiente de programación de una asignatura (RN-11). El horario y las fechas cuelgan del GRUPO, no de la asignatura.';
COMMENT ON COLUMN "academic-schedule".grupo.id_docente IS
    'Nullable: el grupo se numera antes de asignar docente y horario. Sin UNIQUE contra id_asignatura — un docente puede dictar varios grupos de la misma asignatura (AC-03).';
