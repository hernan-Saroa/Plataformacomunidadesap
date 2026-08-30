-- ============================================================================
-- EFDS-1642 — franja_horaria referencia el catálogo real (bigint + FK)
--
-- La migración 001 declaró id_programa e id_asignatura como UUID sin FK, pero el
-- catálogo autoritativo usa bigint:
--     academic_work_plan.programa.id      -> bigint
--     academic_work_plan."Asignatura".id  -> bigint
-- Así, esas columnas no referenciaban nada y además impedían la FK.
--
-- Ambos servicios comparten instancia (DB_NAME=esap_db, ver docker-compose), por
-- lo que la FK entre esquemas es posible y se declara real. No se replica el
-- catálogo: RN-01/RN-02 lo declaran autoritativo del SNIES y una segunda fuente
-- de verdad es justo lo que causó EFDS-1536 / EFDS-1539.
--
-- Forward-only e idempotente. Seguro de aplicar: la tabla se creó en esta misma
-- entrega y no tiene datos productivos.
--
-- NO edita la migración 001 (rama ajena sin mergear): la corrige hacia adelante.
-- ============================================================================

-- 1) Tipo correcto. Se recrean las columnas porque no hay conversión sensata de
--    uuid a bigint y la tabla está vacía.
ALTER TABLE "academic-schedule".franja_horaria
    DROP COLUMN IF EXISTS id_programa,
    DROP COLUMN IF EXISTS id_asignatura;

ALTER TABLE "academic-schedule".franja_horaria
    ADD COLUMN IF NOT EXISTS id_programa BIGINT,
    ADD COLUMN IF NOT EXISTS id_asignatura BIGINT;

-- 2) FK reales contra el catálogo. Se usa ON DELETE RESTRICT: el catálogo no debe
--    poder borrar un programa/asignatura que ya está programado.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_franja_programa') THEN
        ALTER TABLE "academic-schedule".franja_horaria
            ADD CONSTRAINT fk_franja_programa
            FOREIGN KEY (id_programa)
            REFERENCES academic_work_plan.programa(id)
            ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_franja_asignatura') THEN
        ALTER TABLE "academic-schedule".franja_horaria
            ADD CONSTRAINT fk_franja_asignatura
            FOREIGN KEY (id_asignatura)
            REFERENCES academic_work_plan."Asignatura"(id)
            ON DELETE RESTRICT;
    END IF;
END $$;

-- 3) Índices de consulta. El de (docente, día, rango) se adelanta aquí porque es
--    el que hará viable el bloqueo transversal de franjas (RN-07, EFDS-1374) sin
--    rediseñar la tabla más adelante.
CREATE INDEX IF NOT EXISTS idx_franja_programa
    ON "academic-schedule".franja_horaria (id_programa);

CREATE INDEX IF NOT EXISTS idx_franja_asignatura
    ON "academic-schedule".franja_horaria (id_asignatura);

CREATE INDEX IF NOT EXISTS idx_franja_docente_dia_horario
    ON "academic-schedule".franja_horaria (id_docente, dia_semana, hora_inicio, hora_fin);

COMMENT ON COLUMN "academic-schedule".franja_horaria.id_programa
    IS 'FK a academic_work_plan.programa. El catálogo es autoritativo (SNIES): aquí solo se referencia, nunca se copia.';
COMMENT ON COLUMN "academic-schedule".franja_horaria.id_asignatura
    IS 'FK a academic_work_plan."Asignatura". Ver nota de id_programa.';
