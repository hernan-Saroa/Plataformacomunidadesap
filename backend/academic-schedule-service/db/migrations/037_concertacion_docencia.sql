-- ============================================================================
-- 037 · EFDS-2315 — Concertación de la docencia.
--
-- La aprobación de la docencia vive aquí, igual a la concertación del PTA: el
-- docente envía su docencia del periodo, la revisan y la aprueban los roles del
-- PTA (pta.review/approve.academica.<nivel>), con firma de los dos lados.
--
-- ⚠️ APAGADA POR DEFECTO (PROG_CONCERTACION_HABILITADA). Hasta que el PTA deje de
-- aprobar la Docencia, encenderla deja al docente con doble aprobación. Estas
-- tablas existen, pero el servicio rechaza toda escritura mientras esté apagada.
--
-- Tablas:
--   · concertacion_docencia  — una por (docente, periodo, nivel). Guarda la foto
--     de la docencia enviada (franjas y horas) y su huella (sha256): lo firmado
--     es esa foto, no lo que haya después en las franjas.
--   · concertacion_revision  — revisiones requeridas. Hoy solo 'academica'; los
--     tipos 'investigacion' y 'extension' quedan admitidos para cuando el negocio
--     defina su papel, sin cambiar el esquema.
--   · concertacion_firma     — quién firmó, cuándo, en qué rol, con qué modo de
--     OTP (hoy 'simulado', decisión de Tomás) y sobre qué huella.
--   · concertacion_historial — cada transición, con su comentario.
--
-- Forward-only e idempotente. SQL puro.
-- ============================================================================

CREATE TABLE IF NOT EXISTS "academic-schedule".concertacion_docencia (
    id_concertacion   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_docente        UUID NOT NULL REFERENCES auth.personas(id_person) ON DELETE RESTRICT,
    -- idPeriodo efectivo: id de periodo_academico (plataforma) o UUID (legado).
    periodo_ref       VARCHAR(40) NOT NULL,
    nivel             VARCHAR(10) NOT NULL
                      CONSTRAINT chk_concertacion_nivel CHECK (nivel IN ('pregrado', 'posgrado')),
    estado            VARCHAR(20) NOT NULL
                      CONSTRAINT chk_concertacion_estado CHECK (estado IN ('ENVIADA', 'REVISADA', 'APROBADA', 'DEVUELTA')),
    horas             NUMERIC(8,1) NOT NULL DEFAULT 0,
    franjas           JSONB NOT NULL DEFAULT '[]'::jsonb,
    huella            CHAR(64) NOT NULL,
    comentario        TEXT,
    -- Entrega al PTA por el contrato (EFDS-2315). Pendiente = se reintenta.
    notificada_pta_en TIMESTAMPTZ,
    error_notificacion TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_concertacion_docente_periodo_nivel UNIQUE (id_docente, periodo_ref, nivel)
);

CREATE INDEX IF NOT EXISTS idx_concertacion_periodo_estado
    ON "academic-schedule".concertacion_docencia (periodo_ref, estado);

CREATE TABLE IF NOT EXISTS "academic-schedule".concertacion_revision (
    id_concertacion UUID NOT NULL
                    REFERENCES "academic-schedule".concertacion_docencia(id_concertacion) ON DELETE CASCADE,
    tipo            VARCHAR(20) NOT NULL
                    CONSTRAINT chk_concertacion_revision_tipo CHECK (tipo IN ('academica', 'investigacion', 'extension')),
    id_user         UUID NOT NULL,
    revisado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id_concertacion, tipo)
);

CREATE TABLE IF NOT EXISTS "academic-schedule".concertacion_firma (
    id_firma        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_concertacion UUID NOT NULL
                    REFERENCES "academic-schedule".concertacion_docencia(id_concertacion) ON DELETE CASCADE,
    rol             VARCHAR(20) NOT NULL
                    CONSTRAINT chk_concertacion_firma_rol CHECK (rol IN ('docente', 'revisor', 'aprobador')),
    id_user         UUID NOT NULL,
    firmado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    modo_otp        VARCHAR(10) NOT NULL
                    CONSTRAINT chk_concertacion_firma_modo CHECK (modo_otp IN ('simulado', 'real')),
    huella          CHAR(64) NOT NULL,
    -- Contexto del OTP: prog-docencia:<id>:<huella>:<rol> (el mismo formato que
    -- usará auth-service cuando se pase a firma real).
    contexto        VARCHAR(160) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_concertacion_firma_concertacion
    ON "academic-schedule".concertacion_firma (id_concertacion);

CREATE TABLE IF NOT EXISTS "academic-schedule".concertacion_historial (
    id              BIGSERIAL PRIMARY KEY,
    id_concertacion UUID NOT NULL
                    REFERENCES "academic-schedule".concertacion_docencia(id_concertacion) ON DELETE CASCADE,
    accion          VARCHAR(20) NOT NULL,
    estado_anterior VARCHAR(20),
    estado_nuevo    VARCHAR(20) NOT NULL,
    id_user         UUID NOT NULL,
    comentario      TEXT,
    en              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
