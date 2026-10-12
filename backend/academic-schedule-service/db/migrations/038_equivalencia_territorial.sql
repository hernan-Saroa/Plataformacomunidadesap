-- ============================================================================
-- 038 · EFDS-2315 / EFDS-2304 — Equivalencia territorial RUND ↔ auth.
--
-- La territorial del docente viene del RUND (`Docente.territorialId`, código de
-- `academic_work_plan.direccion_territorial`, p. ej. 'DT-009'). La del usuario
-- que decide (jefatura, aprobador) viene de su persona en auth
-- (`auth.personas.id_seccional`, p. ej. 10 = 'HUI'). No hay vínculo estructurado
-- entre los dos catálogos: esta tabla lo crea, EXPLÍCITA y por código, igual que
-- `equivalencia_periodo`. Nada se empareja por nombre en tiempo de ejecución.
--
-- ⚠️ ESTA MIGRACIÓN CREA LA TABLA VACÍA. Las 17 filas propuestas están en
-- `db/dev-fixtures/equivalencia_territorial_propuesta.sql`, SOLO PARA LOCAL,
-- hasta que el negocio las revise. Sin filas, toda decisión con alcance
-- territorial falla cerrado (nadie decide sobre una territorial no mapeada).
--
-- Forward-only e idempotente. SQL puro.
-- ============================================================================

CREATE TABLE IF NOT EXISTS "academic-schedule".equivalencia_territorial (
    codigo_territorial VARCHAR(10) PRIMARY KEY
                       REFERENCES academic_work_plan.direccion_territorial(codigo) ON DELETE RESTRICT,
    id_seccional       BIGINT NOT NULL
                       REFERENCES auth.seccionales(id_seccional) ON DELETE RESTRICT,
    -- Marcada por quien la revisa. Las filas sin revisar se reportan.
    revisada           BOOLEAN NOT NULL DEFAULT FALSE,
    nota               TEXT,
    CONSTRAINT uq_equivalencia_territorial_seccional UNIQUE (id_seccional)
);
