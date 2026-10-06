-- ============================================================================
-- Migración: 454_reversion_revision_legalizacion.sql
-- Historia de Usuario: EFDS-1310 — Reversión de una revisión aprobada.
--
-- El analista que revisa puede pedir que se revierta la aprobación de la
-- revisión, y otra persona, con un permiso propio, la aprueba o la rechaza.
-- Solo antes del registro en SIIF: una legalización cerrada sigue inmutable
-- (migración 451) y no admite solicitudes.
--
-- Aprobarla deshace la aprobación de la revisión y la exportación a SIIF; la
-- legalización vuelve a revisión, sin estado nuevo (C-2).
--
-- 1. legalizacion_reversiones: una solicitud por fila. Quien solicita y quien
--    resuelve deben ser personas distintas (CHECK). Una sola pendiente por
--    legalización (índice único parcial). Resuelta, es inmutable (trigger).
-- 2. Acciones nuevas en el historial de revisión.
-- 3. Permiso travel_expenses:legalizations.revert_approval, SIN asignar a
--    ningún rol: el rol que aprueba aún no está confirmado.
--
-- Idempotente.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Solicitudes de reversión.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS travel_expenses.legalizacion_reversiones (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legalizacion_id         UUID        NOT NULL
        REFERENCES travel_expenses.legalizaciones_comision (id) ON DELETE RESTRICT,
    estado                  VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    motivo                  TEXT        NOT NULL,
    solicitada_por_id       UUID        NOT NULL,
    solicitada_en           TIMESTAMPTZ NOT NULL DEFAULT now(),
    resuelta_por_id         UUID        NULL,
    resuelta_en             TIMESTAMPTZ NULL,
    observacion_resolucion  TEXT        NULL,
    CONSTRAINT chk_legalizacion_reversiones_estado
        CHECK (estado IN ('PENDIENTE', 'APROBADA', 'RECHAZADA')),
    CONSTRAINT chk_legalizacion_reversiones_motivo
        CHECK (length(trim(motivo)) >= 10),
    CONSTRAINT chk_legalizacion_reversiones_resolucion
        CHECK ((estado = 'PENDIENTE') = (resuelta_por_id IS NULL)
               AND (resuelta_por_id IS NULL) = (resuelta_en IS NULL)
               AND (estado <> 'RECHAZADA' OR length(trim(observacion_resolucion)) >= 10)),
    CONSTRAINT chk_legalizacion_reversiones_personas_distintas
        CHECK (resuelta_por_id IS NULL OR resuelta_por_id <> solicitada_por_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_legalizacion_reversiones_una_pendiente
    ON travel_expenses.legalizacion_reversiones (legalizacion_id)
    WHERE estado = 'PENDIENTE';

CREATE INDEX IF NOT EXISTS idx_legalizacion_reversiones_pendientes
    ON travel_expenses.legalizacion_reversiones (solicitada_en)
    WHERE estado = 'PENDIENTE';

COMMENT ON TABLE travel_expenses.legalizacion_reversiones IS
    'EFDS-1310 — Solicitudes de reversión de una revisión de legalización aprobada. La solicita el analista y la resuelve otra persona; solo antes del registro en SIIF.';

CREATE OR REPLACE FUNCTION travel_expenses.fn_reversion_resuelta_inmutable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF travel_expenses.fn_purga_pruebas_activa() THEN
        RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
    END IF;
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'EFDS-1310: las solicitudes de reversión no se borran.'
            USING ERRCODE = 'check_violation';
    END IF;
    IF OLD.estado <> 'PENDIENTE' THEN
        RAISE EXCEPTION 'EFDS-1310: la solicitud de reversión % ya fue resuelta (%); es inmutable.', OLD.id, OLD.estado
            USING ERRCODE = 'check_violation';
    END IF;
    IF (NEW.legalizacion_id, NEW.motivo, NEW.solicitada_por_id, NEW.solicitada_en)
       IS DISTINCT FROM (OLD.legalizacion_id, OLD.motivo, OLD.solicitada_por_id, OLD.solicitada_en) THEN
        RAISE EXCEPTION 'EFDS-1310: de una solicitud de reversión solo se registra su resolución.'
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_reversion_resuelta_inmutable ON travel_expenses.legalizacion_reversiones;
CREATE TRIGGER trg_reversion_resuelta_inmutable
    BEFORE UPDATE OR DELETE ON travel_expenses.legalizacion_reversiones
    FOR EACH ROW EXECUTE FUNCTION travel_expenses.fn_reversion_resuelta_inmutable();

-- ----------------------------------------------------------------------------
-- 2. Acciones de reversión en el historial de revisión.
-- ----------------------------------------------------------------------------
ALTER TABLE travel_expenses.legalizacion_revisiones
    DROP CONSTRAINT IF EXISTS chk_legalizacion_revisiones_accion;
ALTER TABLE travel_expenses.legalizacion_revisiones
    ADD CONSTRAINT chk_legalizacion_revisiones_accion CHECK (accion IN (
        'SOPORTE_APROBADO', 'SOPORTE_RECHAZADO', 'DEVOLUCION',
        'APROBACION', 'EXPORTACION_SIIF', 'REGISTRO_SIIF_Y_CIERRE',
        'REVERSION_SOLICITADA', 'REVERSION_APROBADA', 'REVERSION_RECHAZADA'));

-- ----------------------------------------------------------------------------
-- 3. Permiso de quien aprueba la reversión. Sin asignar a ningún rol.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    v_module_id UUID;
BEGIN
    SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'viaticos';
    IF v_module_id IS NULL THEN
        RAISE EXCEPTION 'Módulo viaticos no encontrado en auth.module: no se puede registrar travel_expenses:legalizations.revert_approval.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM auth.permission WHERE code = 'travel_expenses:legalizations.revert_approval') THEN
        INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
        VALUES (gen_random_uuid(), 'travel_expenses:legalizations.revert_approval',
                'Aprobar reversiones de revisión de legalizaciones',
                'Aprobar o rechazar la solicitud de un analista para revertir una revisión de legalización aprobada, antes del registro en SIIF (EFDS-1310).',
                v_module_id, TRUE, NOW(), NOW());
    END IF;
END $$;
