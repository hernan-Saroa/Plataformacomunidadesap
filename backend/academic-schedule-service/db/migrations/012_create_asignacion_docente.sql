-- ============================================================================
-- EFDS-1372 — Asignación de docente a un grupo
--
-- ⚠️ LA LLAVE ES `auth.personas.id_person`, NO `Docente.id`.
--
-- `Docente` no tiene llave primaria y su `id` cambia por `periodoCarga`: el mismo
-- profesor tiene una fila distinta cada semestre. Referenciar ese id ataría la
-- asignación a un periodo de carga del RUND, que es un detalle de cómo se cargó
-- el dato, no la identidad de la persona.
--
-- `id_person` es estable entre periodos y ya es el destino de la FK que usa
-- `Docente`. Además coincide en tipo con `franja_horaria.id_docente` (uuid), lo
-- que permite cruzar franjas POR IDENTIFICADOR y nunca por nombre.
--
-- Esa es la regla que se aplica aquí y en el bloqueo duro: si existe un campo
-- estructurado, la decisión se toma sobre él. Comparar texto normalizado es una
-- carrera que se pierde --hoy la tilde de "Sabático", ayer NORTE DE SANTANDER--.
--
-- Forward-only e idempotente.
-- ============================================================================

CREATE TABLE IF NOT EXISTS "academic-schedule".asignacion_docente (
    id_asignacion   UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    id_grupo        UUID NOT NULL
                    REFERENCES "academic-schedule".grupo(id_grupo) ON DELETE CASCADE,

    -- Identidad estable de la persona, no la fila del RUND de un periodo.
    id_docente      UUID NOT NULL
                    REFERENCES auth.personas(id_person) ON DELETE RESTRICT,

    -- Horas que esta asignación consume del plan del docente. Se guarda el valor
    -- calculado al asignar para que el acumulado no dependa de recalcular el
    -- histórico si la parametrización cambia (RN-06: las horas de docencia son
    -- inalterables).
    horas_asignadas INT CHECK (horas_asignadas IS NULL OR horas_asignadas >= 0),

    estado          VARCHAR(30) NOT NULL DEFAULT 'ASIGNADO',
    observaciones   TEXT,

    -- Trazabilidad de quién asignó: la decisión es de una decanatura concreta.
    asignado_por    VARCHAR(120),
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE,

    -- Un grupo tiene UN docente. Reasignar es actualizar esta fila, no acumular
    -- filas que después habría que desempatar.
    CONSTRAINT uq_asignacion_por_grupo UNIQUE (id_grupo)
);

-- El índice por docente es el que sostiene el bloqueo transversal (RN-07) y el
-- acumulado de horas (RN-04/RN-05): ambos consultan "todo lo de este docente".
CREATE INDEX IF NOT EXISTS idx_asignacion_docente
    ON "academic-schedule".asignacion_docente (id_docente);
CREATE INDEX IF NOT EXISTS idx_asignacion_grupo
    ON "academic-schedule".asignacion_docente (id_grupo);

-- El docente del grupo se propaga a sus franjas, para que el cruce de horarios
-- se resuelva sin join adicional y SIEMPRE por id. Sin esto, cada verificación
-- de solapamiento tendría que reconstruir la relación y podría hacerlo distinto.
CREATE OR REPLACE FUNCTION "academic-schedule".fn_propagar_docente_a_franjas()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE "academic-schedule".franja_horaria
       SET id_docente = NEW.id_docente
     WHERE id_grupo = NEW.id_grupo;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_propagar_docente_a_franjas ON "academic-schedule".asignacion_docente;
CREATE TRIGGER trg_propagar_docente_a_franjas
    AFTER INSERT OR UPDATE OF id_docente ON "academic-schedule".asignacion_docente
    FOR EACH ROW
    EXECUTE FUNCTION "academic-schedule".fn_propagar_docente_a_franjas();

COMMENT ON TABLE "academic-schedule".asignacion_docente IS
    'Docente asignado a un grupo. La llave es auth.personas.id_person (identidad estable), no Docente.id, que cambia por periodo de carga.';
COMMENT ON COLUMN "academic-schedule".asignacion_docente.horas_asignadas IS
    'Horas consumidas por esta asignacion, congeladas al asignar (RN-06).';
