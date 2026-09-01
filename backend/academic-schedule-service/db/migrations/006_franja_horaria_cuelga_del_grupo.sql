-- ============================================================================
-- EFDS-1370 — Reencauce: asignatura -> grupo -> franja_horaria
--
-- La migración 001 enlazó franja_horaria.id_asignatura DIRECTAMENTE, sin `grupo`
-- de por medio. Eso impide que cada grupo tenga su propio horario (AC-02/RN-11):
-- con dos grupos de la misma asignatura, sus franjas serían indistinguibles.
--
-- Se corrige hacia adelante, sin editar la 001 (rama del enabler, aún sin
-- mergear): se agrega id_grupo y la franja pasa a colgar del grupo.
--
-- `id_asignatura` se CONSERVA como denormalización de solo consulta: permite
-- filtrar franjas por asignatura sin join, y el trigger de abajo garantiza que
-- nunca contradiga al grupo. Sin esa garantía sería una segunda fuente de verdad,
-- que es justo el patrón que causó EFDS-1536 / EFDS-1539.
--
-- Forward-only e idempotente. La tabla se creó en esta misma entrega y no tiene
-- datos productivos.
-- ============================================================================

ALTER TABLE "academic-schedule".franja_horaria
    ADD COLUMN IF NOT EXISTS id_grupo UUID;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_franja_grupo') THEN
        ALTER TABLE "academic-schedule".franja_horaria
            ADD CONSTRAINT fk_franja_grupo
            FOREIGN KEY (id_grupo)
            REFERENCES "academic-schedule".grupo(id_grupo)
            ON DELETE CASCADE;   -- al borrar el grupo se van sus franjas: son suyas
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_franja_grupo ON "academic-schedule".franja_horaria (id_grupo);

-- Mantiene id_asignatura sincronizada con la del grupo. Se rellena sola, de modo
-- que el cliente no puede escribir una asignatura distinta a la del grupo.
CREATE OR REPLACE FUNCTION "academic-schedule".fn_franja_sincroniza_asignatura()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.id_grupo IS NOT NULL THEN
        SELECT g.id_asignatura INTO NEW.id_asignatura
        FROM "academic-schedule".grupo g
        WHERE g.id_grupo = NEW.id_grupo;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_franja_sincroniza_asignatura ON "academic-schedule".franja_horaria;
CREATE TRIGGER trg_franja_sincroniza_asignatura
    BEFORE INSERT OR UPDATE OF id_grupo ON "academic-schedule".franja_horaria
    FOR EACH ROW
    EXECUTE FUNCTION "academic-schedule".fn_franja_sincroniza_asignatura();

COMMENT ON COLUMN "academic-schedule".franja_horaria.id_grupo IS
    'Dueño de la franja (RN-11). El horario y las fechas cuelgan del grupo, no de la asignatura.';
COMMENT ON COLUMN "academic-schedule".franja_horaria.id_asignatura IS
    'Denormalización de consulta, sincronizada por trigger desde el grupo. No escribir directamente.';
