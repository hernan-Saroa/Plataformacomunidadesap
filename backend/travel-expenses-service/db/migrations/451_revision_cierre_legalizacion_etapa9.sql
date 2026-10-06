-- ============================================================================
-- Migración: 451_revision_cierre_legalizacion_etapa9.sql
-- Historia de Usuario: EFDS-1310 — Revisar, registrar en SIIF y cerrar la legalización.
--
-- Solo altera tablas propias de la Etapa 9 (migración 450). No crea estados de
-- la solicitud: la única transición nueva es PENDIENTE_LEGALIZACION → LEGALIZADO
-- (contrato C-2). Una devolución deja la comisión en PENDIENTE_LEGALIZACION y se
-- marca en devuelta_en / observacion_devolucion.
--
-- Cierre inmutable (requisito de auditoría): una legalización con cerrada_en no
-- admite UPDATE ni DELETE, sus soportes tampoco, y el historial de revisión es
-- de solo inserción. Se exige en la base con triggers, no solo en la aplicación.
--
-- Idempotente.
-- ============================================================================

SET client_encoding = 'UTF8';

-- ----------------------------------------------------------------------------
-- 1. Revisión, registro SIIF y cierre en la legalización.
-- ----------------------------------------------------------------------------
ALTER TABLE travel_expenses.legalizaciones_comision
    ADD COLUMN IF NOT EXISTS revision_aprobada_en     TIMESTAMPTZ   NULL,
    ADD COLUMN IF NOT EXISTS revision_aprobada_por_id UUID          NULL,
    ADD COLUMN IF NOT EXISTS devuelta_en              TIMESTAMPTZ   NULL,
    ADD COLUMN IF NOT EXISTS devuelta_por_id          UUID          NULL,
    ADD COLUMN IF NOT EXISTS observacion_devolucion   TEXT          NULL,
    ADD COLUMN IF NOT EXISTS numero_devoluciones      INTEGER       NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS siif_exportado_en        TIMESTAMPTZ   NULL,
    ADD COLUMN IF NOT EXISTS siif_exportado_por_id    UUID          NULL,
    ADD COLUMN IF NOT EXISTS numero_registro_siif     VARCHAR(100)  NULL,
    ADD COLUMN IF NOT EXISTS fecha_registro_siif      DATE          NULL,
    ADD COLUMN IF NOT EXISTS registrado_siif_por_id   UUID          NULL,
    ADD COLUMN IF NOT EXISTS valor_pagado             NUMERIC(14,2) NULL,
    ADD COLUMN IF NOT EXISTS valor_legalizado         NUMERIC(14,2) NULL,
    ADD COLUMN IF NOT EXISTS valor_reintegro          NUMERIC(14,2) NULL,
    ADD COLUMN IF NOT EXISTS dias_reales              NUMERIC(6,2)  NULL,
    ADD COLUMN IF NOT EXISTS observaciones_cierre     TEXT          NULL,
    ADD COLUMN IF NOT EXISTS cerrada_en               TIMESTAMPTZ   NULL,
    ADD COLUMN IF NOT EXISTS cerrada_por_id           UUID          NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_legalizaciones_devolucion') THEN
        ALTER TABLE travel_expenses.legalizaciones_comision
            ADD CONSTRAINT chk_legalizaciones_devolucion
                CHECK ((devuelta_en IS NULL) = (devuelta_por_id IS NULL)
                       AND (devuelta_en IS NULL OR length(trim(observacion_devolucion)) > 0)
                       AND numero_devoluciones >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_legalizaciones_valores') THEN
        ALTER TABLE travel_expenses.legalizaciones_comision
            ADD CONSTRAINT chk_legalizaciones_valores
                CHECK ((valor_legalizado IS NULL OR valor_legalizado >= 0)
                       AND (valor_reintegro IS NULL OR valor_reintegro >= 0)
                       AND (dias_reales IS NULL OR dias_reales >= 0));
    END IF;
    -- Cerrar exige revisión aprobada y registro SIIF completo.
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_legalizaciones_cierre') THEN
        ALTER TABLE travel_expenses.legalizaciones_comision
            ADD CONSTRAINT chk_legalizaciones_cierre
                CHECK (cerrada_en IS NULL OR (
                    cerrada_por_id IS NOT NULL
                    AND revision_aprobada_en IS NOT NULL
                    AND numero_registro_siif IS NOT NULL
                    AND fecha_registro_siif IS NOT NULL
                    AND valor_legalizado IS NOT NULL
                    AND valor_reintegro IS NOT NULL
                    AND fecha_envio IS NOT NULL));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_legalizaciones_por_revisar
    ON travel_expenses.legalizaciones_comision (fecha_envio)
    WHERE fecha_envio IS NOT NULL AND cerrada_en IS NULL;

COMMENT ON COLUMN travel_expenses.legalizaciones_comision.devuelta_en IS
    'EFDS-1310 — Última devolución al comisionado. La solicitud sigue en PENDIENTE_LEGALIZACION (C-2).';
COMMENT ON COLUMN travel_expenses.legalizaciones_comision.valor_reintegro IS
    'EFDS-1310 — valor_pagado - valor_legalizado cuando el viaje fue menor; > 0 dispara el evento de reintegro (EFDS-1308).';
COMMENT ON COLUMN travel_expenses.legalizaciones_comision.cerrada_en IS
    'EFDS-1310 — Expediente de legalización cerrado: la fila y sus soportes quedan inmutables (triggers).';

-- ----------------------------------------------------------------------------
-- 2. Revisión soporte por soporte.
-- ----------------------------------------------------------------------------
ALTER TABLE travel_expenses.legalizacion_soportes
    ADD COLUMN IF NOT EXISTS revision             VARCHAR(20) NULL,
    ADD COLUMN IF NOT EXISTS observacion_revision TEXT        NULL,
    ADD COLUMN IF NOT EXISTS revisado_por_id      UUID        NULL,
    ADD COLUMN IF NOT EXISTS revisado_en          TIMESTAMPTZ NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_legalizacion_soportes_revision') THEN
        ALTER TABLE travel_expenses.legalizacion_soportes
            ADD CONSTRAINT chk_legalizacion_soportes_revision
                CHECK ((revision IS NULL OR revision IN ('APROBADO', 'RECHAZADO'))
                       AND (revision IS DISTINCT FROM 'RECHAZADO' OR length(trim(observacion_revision)) > 0)
                       AND ((revision IS NULL) = (revisado_en IS NULL)));
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. Historial de revisión: de solo inserción.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS travel_expenses.legalizacion_revisiones (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legalizacion_id  UUID        NOT NULL
        REFERENCES travel_expenses.legalizaciones_comision (id) ON DELETE RESTRICT,
    soporte_id       UUID        NULL,
    accion           VARCHAR(40) NOT NULL,
    observacion      TEXT        NULL,
    detalle          JSONB       NULL,
    usuario_id       UUID        NOT NULL,
    creado_en        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_legalizacion_revisiones_accion CHECK (accion IN (
        'SOPORTE_APROBADO', 'SOPORTE_RECHAZADO', 'DEVOLUCION',
        'APROBACION', 'EXPORTACION_SIIF', 'REGISTRO_SIIF_Y_CIERRE'))
);

CREATE INDEX IF NOT EXISTS idx_legalizacion_revisiones_legalizacion
    ON travel_expenses.legalizacion_revisiones (legalizacion_id, creado_en);

COMMENT ON TABLE travel_expenses.legalizacion_revisiones IS
    'EFDS-1310 — Trazabilidad de la revisión de la legalización (quién, qué, cuándo). Solo inserción.';

-- ----------------------------------------------------------------------------
-- 4. Inmutabilidad.
--
-- La única excepción es la purga de datos de prueba automatizados, que la
-- activa explícitamente en su sesión (SET LOCAL travel_expenses.purga_pruebas).
-- Quien puede fijar esa variable también podría borrar el trigger: no es una
-- puerta trasera que agregue privilegios, es la forma declarada de limpiar.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION travel_expenses.fn_purga_pruebas_activa()
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
    SELECT COALESCE(current_setting('travel_expenses.purga_pruebas', true), '') = 'on';
$$;

CREATE OR REPLACE FUNCTION travel_expenses.fn_legalizacion_cerrada_inmutable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.cerrada_en IS NOT NULL AND NOT travel_expenses.fn_purga_pruebas_activa() THEN
        RAISE EXCEPTION 'EFDS-1310: la legalización % está cerrada (%); su expediente es inmutable.',
            OLD.id, OLD.cerrada_en
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;

DROP TRIGGER IF EXISTS trg_legalizacion_cerrada_inmutable ON travel_expenses.legalizaciones_comision;
CREATE TRIGGER trg_legalizacion_cerrada_inmutable
    BEFORE UPDATE OR DELETE ON travel_expenses.legalizaciones_comision
    FOR EACH ROW EXECUTE FUNCTION travel_expenses.fn_legalizacion_cerrada_inmutable();

CREATE OR REPLACE FUNCTION travel_expenses.fn_soporte_legalizacion_cerrada_inmutable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_legalizacion UUID := CASE WHEN TG_OP = 'INSERT' THEN NEW.legalizacion_id ELSE OLD.legalizacion_id END;
    v_cerrada      TIMESTAMPTZ;
BEGIN
    SELECT cerrada_en INTO v_cerrada
      FROM travel_expenses.legalizaciones_comision WHERE id = v_legalizacion;
    IF v_cerrada IS NOT NULL AND NOT travel_expenses.fn_purga_pruebas_activa() THEN
        RAISE EXCEPTION 'EFDS-1310: la legalización % está cerrada; sus soportes son inmutables.', v_legalizacion
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;

DROP TRIGGER IF EXISTS trg_soporte_legalizacion_cerrada_inmutable ON travel_expenses.legalizacion_soportes;
CREATE TRIGGER trg_soporte_legalizacion_cerrada_inmutable
    BEFORE INSERT OR UPDATE OR DELETE ON travel_expenses.legalizacion_soportes
    FOR EACH ROW EXECUTE FUNCTION travel_expenses.fn_soporte_legalizacion_cerrada_inmutable();

CREATE OR REPLACE FUNCTION travel_expenses.fn_revision_solo_insercion()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NOT travel_expenses.fn_purga_pruebas_activa() THEN
        RAISE EXCEPTION 'EFDS-1310: el historial de revisión de legalizaciones es de solo inserción.'
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
END $$;

DROP TRIGGER IF EXISTS trg_revision_solo_insercion ON travel_expenses.legalizacion_revisiones;
CREATE TRIGGER trg_revision_solo_insercion
    BEFORE UPDATE OR DELETE ON travel_expenses.legalizacion_revisiones
    FOR EACH ROW EXECUTE FUNCTION travel_expenses.fn_revision_solo_insercion();

-- ----------------------------------------------------------------------------
-- 5. Permiso de revisión: el MFE ya consulta travel_expenses:legalizations.manage.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    v_module_id     UUID;
    v_permission_id UUID;
    v_role          RECORD;
BEGIN
    SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'viaticos';
    IF v_module_id IS NULL THEN
        RAISE EXCEPTION 'Módulo viaticos no encontrado en auth.module: no se puede registrar travel_expenses:legalizations.manage.';
    END IF;

    SELECT id_permission INTO v_permission_id
      FROM auth.permission WHERE code = 'travel_expenses:legalizations.manage';
    IF v_permission_id IS NULL THEN
        INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
        VALUES (gen_random_uuid(), 'travel_expenses:legalizations.manage', 'Revisar y cerrar legalizaciones',
                'Revisar los soportes de legalización, devolverlos, registrarlos en SIIF y cerrar el expediente (EFDS-1310).',
                v_module_id, TRUE, NOW(), NOW())
        RETURNING id_permission INTO v_permission_id;
    END IF;

    FOR v_role IN
        SELECT id FROM auth.role WHERE code IN ('ANALISTA', 'ANALISTA_VIATICOS', 'ROL_ANALISTA')
    LOOP
        IF NOT EXISTS (SELECT 1 FROM auth.role_permissions WHERE id_rol = v_role.id AND id_permission = v_permission_id) THEN
            INSERT INTO auth.role_permissions (id_rol, id_permission) VALUES (v_role.id, v_permission_id);
        END IF;
    END LOOP;
END $$;
