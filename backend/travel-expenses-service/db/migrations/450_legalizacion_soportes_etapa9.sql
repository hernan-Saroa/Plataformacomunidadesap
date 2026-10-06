-- ============================================================================
-- Migración: 450_legalizacion_soportes_etapa9.sql
-- Historia de Usuario: EFDS-1309 — Etapa 9: Cargar soportes de legalización.
--
-- Crea el modelo propio de la legalización, sin alterar ninguna tabla existente:
--
--   config_legalizacion              Disparador y plazo por modalidad de pago.
--   config_legalizacion_documentos   Checklist de soportes por tipo de comisionado
--                                    (misma forma que config_tipo_comisionado_documentos
--                                    de EFDS-1258, sobre el mismo catálogo).
--   legalizaciones_comision          Una legalización por solicitud, con su plazo.
--   legalizacion_soportes            Los PDF cargados por el comisionado.
--
-- Las tablas nuevas declaran FK reales hacia solicitudes_comision y
-- tipos_documento_soporte: son restricciones sobre estas tablas, no alteran las
-- referenciadas. Todas las fechas del plazo son timestamptz: el vencimiento se
-- calcula en hora de Colombia y el contenedor no define TZ.
--
-- Idempotente (IF NOT EXISTS / ON CONFLICT).
-- ============================================================================

SET client_encoding = 'UTF8';

-- ----------------------------------------------------------------------------
-- 1. Configuración del disparador y del plazo, por modalidad de pago.
--
--    estado_disparador: estado de la solicitud a partir del cual se abre la
--    legalización. Hoy PAGADA en ambas modalidades; queda como dato porque está
--    pendiente definir si en RECONOCIMIENTO_POSTERIOR la legalización va antes
--    del pago (decisión D-1). Cambiarlo es un UPDATE, no un despliegue.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS travel_expenses.config_legalizacion (
    modalidad_pago          VARCHAR(50) PRIMARY KEY,
    estado_disparador       VARCHAR(50) NOT NULL DEFAULT 'PAGADA',
    plazo_dias_habiles      INTEGER     NOT NULL DEFAULT 5,
    dias_aviso_por_vencer   INTEGER     NOT NULL DEFAULT 2,
    hora_corte              VARCHAR(5)  NOT NULL DEFAULT '16:30',
    activo                  BOOLEAN     NOT NULL DEFAULT TRUE,
    actualizado_por_id      UUID        NULL,
    creado_en               TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_config_legalizacion_modalidad
        CHECK (modalidad_pago IN ('AVANCE', 'RECONOCIMIENTO_POSTERIOR')),
    CONSTRAINT chk_config_legalizacion_disparador
        CHECK (estado_disparador IN ('AUTORIZADA', 'COMPROMETIDA', 'OBLIGADA', 'PAGADA')),
    CONSTRAINT chk_config_legalizacion_plazo CHECK (plazo_dias_habiles > 0),
    CONSTRAINT chk_config_legalizacion_aviso CHECK (dias_aviso_por_vencer >= 0),
    CONSTRAINT chk_config_legalizacion_hora_corte
        CHECK (hora_corte ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
);

COMMENT ON TABLE travel_expenses.config_legalizacion IS
    'EFDS-1309 — Disparador, plazo (días hábiles) y aviso de la legalización por modalidad de pago.';
COMMENT ON COLUMN travel_expenses.config_legalizacion.estado_disparador IS
    'Estado de la solicitud a partir del cual se abre la legalización. Pendiente D-1 para RECONOCIMIENTO_POSTERIOR.';
COMMENT ON COLUMN travel_expenses.config_legalizacion.hora_corte IS
    'Hora (Colombia, HH:MM) en que vence el último día hábil del plazo. Alineada con el corte de jornada de 16:30.';

INSERT INTO travel_expenses.config_legalizacion
    (modalidad_pago, estado_disparador, plazo_dias_habiles, dias_aviso_por_vencer, hora_corte)
VALUES
    ('AVANCE',                   'PAGADA', 5, 2, '16:30'),
    ('RECONOCIMIENTO_POSTERIOR', 'PAGADA', 5, 2, '16:30')
ON CONFLICT (modalidad_pago) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. Checklist de soportes de legalización por tipo de comisionado.
--    Reutiliza el catálogo tipos_documento_soporte y los valores de
--    tipo_requisito de EFDS-1258. `condicion` restringe cuándo aplica el
--    soporte (NULL = siempre).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS travel_expenses.config_legalizacion_documentos (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_tipo_comisionado_id  UUID        NOT NULL
        REFERENCES travel_expenses.config_tipo_comisionado (id) ON DELETE CASCADE,
    tipo_documento_soporte_id   UUID        NOT NULL
        REFERENCES travel_expenses.tipos_documento_soporte (id) ON DELETE RESTRICT,
    tipo_requisito              VARCHAR(20) NOT NULL,
    condicion                   VARCHAR(40) NULL,
    orden                       INTEGER     NOT NULL DEFAULT 0,
    activo                      BOOLEAN     NOT NULL DEFAULT TRUE,
    creado_en                   TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en              TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_config_legalizacion_documentos
        UNIQUE (config_tipo_comisionado_id, tipo_documento_soporte_id),
    CONSTRAINT chk_config_legalizacion_documentos_requisito
        CHECK (tipo_requisito IN ('OBLIGATORIO', 'OPCIONAL')),
    CONSTRAINT chk_config_legalizacion_documentos_condicion
        CHECK (condicion IS NULL OR condicion IN ('TRANSPORTE_AEREO'))
);

COMMENT ON TABLE travel_expenses.config_legalizacion_documentos IS
    'EFDS-1309 — Soportes exigidos para legalizar, por tipo de comisionado. Configuración, no código (D-2).';
COMMENT ON COLUMN travel_expenses.config_legalizacion_documentos.condicion IS
    'NULL: aplica siempre. TRANSPORTE_AEREO: solo si la comisión requiere tiquetes o algún tramo del itinerario es aéreo.';

-- Catálogo: soportes de legalización según el levantamiento. Los nombres
-- oficiales de los formatos 031 y 032 están pendientes de confirmar (D-2).
INSERT INTO travel_expenses.tipos_documento_soporte (codigo, nombre, descripcion, activo)
VALUES
    ('LEG_GF_FO_031',        'Formato GF-FO-031',                'Soporte de legalización (formato 031 del levantamiento). Nombre oficial pendiente de confirmar con el Grupo de Viáticos.', TRUE),
    ('LEG_GF_FO_032',        'Formato GF-FO-032',                'Soporte de legalización (formato 032 del levantamiento). Nombre oficial pendiente de confirmar con el Grupo de Viáticos.', TRUE),
    ('LEG_PASABORDOS',       'Pasabordos',                       'Pasabordos de los tramos aéreos de la comisión.', TRUE),
    ('LEG_CERT_PERMANENCIA', 'Certificado de permanencia',       'Certificado de permanencia expedido en el lugar de la comisión.', TRUE),
    ('LEG_AGENDA_CUMPLIDA',  'Agenda cumplida',                  'Agenda de la comisión con las actividades efectivamente cumplidas.', TRUE)
ON CONFLICT (codigo) DO NOTHING;

-- Mapeo inicial: los cinco soportes para todo tipo de comisionado activo;
-- pasabordos solo cuando hay transporte aéreo.
INSERT INTO travel_expenses.config_legalizacion_documentos
    (config_tipo_comisionado_id, tipo_documento_soporte_id, tipo_requisito, condicion, orden)
SELECT c.id, t.id, v.tipo_requisito, v.condicion, v.orden
FROM travel_expenses.config_tipo_comisionado c
CROSS JOIN (VALUES
    ('LEG_GF_FO_031',        'OBLIGATORIO', NULL,               1),
    ('LEG_GF_FO_032',        'OBLIGATORIO', NULL,               2),
    ('LEG_PASABORDOS',       'OBLIGATORIO', 'TRANSPORTE_AEREO', 3),
    ('LEG_CERT_PERMANENCIA', 'OBLIGATORIO', NULL,               4),
    ('LEG_AGENDA_CUMPLIDA',  'OBLIGATORIO', NULL,               5)
) AS v(codigo, tipo_requisito, condicion, orden)
JOIN travel_expenses.tipos_documento_soporte t ON t.codigo = v.codigo
WHERE c.activo = TRUE
ON CONFLICT (config_tipo_comisionado_id, tipo_documento_soporte_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. Legalización de la comisión: una por solicitud.
--    Los parámetros del plazo se copian al abrirla (plazo_dias_habiles,
--    hora_corte): cambiar la configuración después no mueve plazos ya corriendo.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS travel_expenses.legalizaciones_comision (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solicitud_id                UUID        NOT NULL
        REFERENCES travel_expenses.solicitudes_comision (id) ON DELETE RESTRICT,
    modalidad_pago              VARCHAR(50) NOT NULL,
    estado_disparador           VARCHAR(50) NOT NULL,
    fecha_disparo               TIMESTAMPTZ NOT NULL,
    fecha_base_plazo            TIMESTAMPTZ NOT NULL,
    plazo_dias_habiles          INTEGER     NOT NULL,
    hora_corte                  VARCHAR(5)  NOT NULL,
    fecha_limite                TIMESTAMPTZ NOT NULL,
    calendario_incompleto       BOOLEAN     NOT NULL DEFAULT FALSE,
    fecha_envio                 TIMESTAMPTZ NULL,
    enviada_por_id              UUID        NULL,
    notificado_por_vencer_en    TIMESTAMPTZ NULL,
    notificado_vencido_en       TIMESTAMPTZ NULL,
    creado_en                   TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en              TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_legalizaciones_comision_solicitud UNIQUE (solicitud_id),
    CONSTRAINT chk_legalizaciones_plazo CHECK (plazo_dias_habiles > 0),
    CONSTRAINT chk_legalizaciones_fecha_limite CHECK (fecha_limite > fecha_base_plazo),
    CONSTRAINT chk_legalizaciones_envio
        CHECK ((fecha_envio IS NULL) = (enviada_por_id IS NULL))
);

CREATE INDEX IF NOT EXISTS idx_legalizaciones_fecha_limite_abiertas
    ON travel_expenses.legalizaciones_comision (fecha_limite)
    WHERE fecha_envio IS NULL;

COMMENT ON TABLE travel_expenses.legalizaciones_comision IS
    'EFDS-1309 — Legalización de una comisión: plazo en días hábiles y envío a revisión.';
COMMENT ON COLUMN travel_expenses.legalizaciones_comision.fecha_base_plazo IS
    'Desde cuándo corre el plazo: el más tardío entre el fin de la comisión y la apertura de la legalización.';
COMMENT ON COLUMN travel_expenses.legalizaciones_comision.calendario_incompleto IS
    'TRUE si el plazo cruzó un año sin festivos cargados en auth.festivos_colombia: la fecha límite puede adelantarse.';
COMMENT ON COLUMN travel_expenses.legalizaciones_comision.fecha_envio IS
    'Momento en que el comisionado envió la legalización completa a revisión. NULL = aún en cargue.';

-- ----------------------------------------------------------------------------
-- 4. Soportes cargados. El archivo vive en disco (TRAVEL_EXPENSES_STORAGE_PATH);
--    el nombre en disco es un UUID que nunca se expone al cliente.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS travel_expenses.legalizacion_soportes (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legalizacion_id             UUID         NOT NULL
        REFERENCES travel_expenses.legalizaciones_comision (id) ON DELETE CASCADE,
    tipo_documento_soporte_id   UUID         NOT NULL
        REFERENCES travel_expenses.tipos_documento_soporte (id) ON DELETE RESTRICT,
    nombre_archivo_original     VARCHAR(255) NOT NULL,
    ruta_relativa               VARCHAR(512) NOT NULL,
    tamano_bytes                INTEGER      NOT NULL,
    sha256                      CHAR(64)     NOT NULL,
    cargado_por_id              UUID         NOT NULL,
    creado_en                   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT chk_legalizacion_soportes_tamano CHECK (tamano_bytes > 0)
);

CREATE INDEX IF NOT EXISTS idx_legalizacion_soportes_legalizacion
    ON travel_expenses.legalizacion_soportes (legalizacion_id);

COMMENT ON TABLE travel_expenses.legalizacion_soportes IS
    'EFDS-1309 — PDF de soporte de la legalización, validados por contenido (%PDF-), no por extensión.';

-- ----------------------------------------------------------------------------
-- 5. actualizado_en automático, con la función existente del módulo (009).
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_config_legalizacion_actualizado_en ON travel_expenses.config_legalizacion;
CREATE TRIGGER trg_config_legalizacion_actualizado_en
    BEFORE UPDATE ON travel_expenses.config_legalizacion
    FOR EACH ROW EXECUTE FUNCTION travel_expenses.update_actualizado_en();

DROP TRIGGER IF EXISTS trg_config_legalizacion_documentos_actualizado_en ON travel_expenses.config_legalizacion_documentos;
CREATE TRIGGER trg_config_legalizacion_documentos_actualizado_en
    BEFORE UPDATE ON travel_expenses.config_legalizacion_documentos
    FOR EACH ROW EXECUTE FUNCTION travel_expenses.update_actualizado_en();

DROP TRIGGER IF EXISTS trg_legalizaciones_comision_actualizado_en ON travel_expenses.legalizaciones_comision;
CREATE TRIGGER trg_legalizaciones_comision_actualizado_en
    BEFORE UPDATE ON travel_expenses.legalizaciones_comision
    FOR EACH ROW EXECUTE FUNCTION travel_expenses.update_actualizado_en();

-- ----------------------------------------------------------------------------
-- 6. Permiso que el MFE ya consulta para mostrar la sección de legalizaciones
--    (travel_expenses:legalizations.view, en ViaticosModulePremium) y que no
--    existía en la base. Se asigna a los enlaces, que legalizan en nombre del
--    comisionado. El módulo se busca por su código real, 'viaticos'.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    v_module_id     UUID;
    v_permission_id UUID;
    v_role          RECORD;
BEGIN
    SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'viaticos';
    IF v_module_id IS NULL THEN
        RAISE EXCEPTION 'Módulo viaticos no encontrado en auth.module: no se puede registrar travel_expenses:legalizations.view.';
    END IF;

    SELECT id_permission INTO v_permission_id
    FROM auth.permission WHERE code = 'travel_expenses:legalizations.view';

    IF v_permission_id IS NULL THEN
        INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            'travel_expenses:legalizations.view',
            'Legalizar comisiones',
            'Consultar y cargar los soportes de legalización de las comisiones propias (EFDS-1309).',
            v_module_id, TRUE, NOW(), NOW()
        )
        RETURNING id_permission INTO v_permission_id;
    END IF;

    FOR v_role IN
        SELECT id FROM auth.role
        WHERE code IN ('ENLACE_DEPENDENCIA', 'ENLACE', 'ENLACE_VIATICOS', 'SOLICITANTE')
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM auth.role_permissions
            WHERE id_rol = v_role.id AND id_permission = v_permission_id
        ) THEN
            INSERT INTO auth.role_permissions (id_rol, id_permission)
            VALUES (v_role.id, v_permission_id);
        END IF;
    END LOOP;
END $$;
