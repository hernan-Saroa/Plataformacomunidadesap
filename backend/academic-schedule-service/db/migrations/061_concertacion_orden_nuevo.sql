-- ============================================================================
-- 061 · EFDS-2374 — Concertación en el orden nuevo (HU EFDS-2371).
--
-- Antes: el docente enviaba su docencia → revisión → aprobación.
-- Ahora: el programador envía lo asignado → revisión y aprobación internas (firma
-- del aprobador) → el docente ACEPTA (firma) o reporta una NOVEDAD justificada,
-- que vuelve al programador. Lo aceptado alimenta el PTA.
-- Diagrama de estados: INTEGRACION-claude.md §23.1.
--
--   · estados nuevos: POR_ACEPTAR, ACEPTADA, NOVEDAD. APROBADA queda para las
--     filas del orden anterior.
--   · concertacion_novedad: lo que reporta el docente (tipo + justificación) y
--     cuándo la atiende el programador (al reenviar).
--   · enviada_por: quién la envió (el programador), para la trazabilidad.
--
-- Todo sigue detrás de PROG_CONCERTACION_HABILITADA: apagada, nada cambia.
-- Forward-only e idempotente. SQL puro.
-- ============================================================================

ALTER TABLE "academic-schedule".concertacion_docencia
    DROP CONSTRAINT IF EXISTS chk_concertacion_estado;
ALTER TABLE "academic-schedule".concertacion_docencia
    ADD CONSTRAINT chk_concertacion_estado
    CHECK (estado IN ('ENVIADA', 'REVISADA', 'POR_ACEPTAR', 'ACEPTADA', 'NOVEDAD', 'DEVUELTA', 'APROBADA'));

ALTER TABLE "academic-schedule".concertacion_docencia
    ADD COLUMN IF NOT EXISTS enviada_por UUID;

CREATE TABLE IF NOT EXISTS "academic-schedule".concertacion_novedad (
    id_novedad      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_concertacion UUID NOT NULL
                    REFERENCES "academic-schedule".concertacion_docencia(id_concertacion) ON DELETE CASCADE,
    tipo            VARCHAR(20) NOT NULL
                    CONSTRAINT chk_concertacion_novedad_tipo CHECK (tipo IN ('investigacion', 'movilidad', 'perfil', 'otra')),
    justificacion   TEXT NOT NULL
                    CONSTRAINT chk_concertacion_novedad_justificacion CHECK (length(btrim(justificacion)) >= 10),
    -- La foto sobre la que se reportó (la huella enviada).
    huella          CHAR(64) NOT NULL,
    id_user         UUID NOT NULL,
    creada_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Se atiende cuando el programador vuelve a enviar.
    atendida_en     TIMESTAMPTZ,
    atendida_por    UUID
);

CREATE INDEX IF NOT EXISTS idx_concertacion_novedad_concertacion
    ON "academic-schedule".concertacion_novedad (id_concertacion, creada_en DESC);

COMMENT ON TABLE "academic-schedule".concertacion_novedad IS
  'Novedad que reporta el docente sobre la programación aprobada por dentro (EFDS-2374): tipo y justificación obligatoria. Vuelve al programador.';
