-- ============================================================================
-- 667 · EFDS-2315 — Decisiones de concertación de la docencia recibidas de
-- Programación Académica (contrato PROG↔PTA v1).
--
-- Tabla PROPIA del PTA donde el contrato REGISTRA cada decisión aprobada en
-- Programación Académica: la docencia concertada del docente (asignaturas y
-- horas), las firmas y la huella de lo firmado. Programación Académica nunca
-- escribe aquí directamente: llama al endpoint del contrato, cuyo dueño es el PTA.
--
-- ⚠️ SOLO REGISTRO. Aplicar la decisión al componente de Docencia del PTA (y
-- dejar de aprobarla aquí) es la integración, que va como propuesta de cambio.
-- Esta tabla no toca PtaComponentApproval ni ningún PTA.
--
-- Idempotente por id_concertacion: un reintento de la misma decisión actualiza
-- la fila, no la duplica.
--
-- Forward-only e idempotente. SQL puro.
-- ============================================================================

CREATE TABLE IF NOT EXISTS academic_work_plan.docencia_concertada (
    id_concertacion   UUID PRIMARY KEY,
    documento_docente VARCHAR(40) NOT NULL,
    periodo           VARCHAR(40),
    nivel             VARCHAR(10) NOT NULL
                      CONSTRAINT chk_docencia_concertada_nivel CHECK (nivel IN ('pregrado', 'posgrado')),
    horas             NUMERIC(8,1) NOT NULL,
    huella            CHAR(64) NOT NULL,
    asignaturas       JSONB NOT NULL,
    firmas            JSONB NOT NULL,
    registrada_por    VARCHAR(80),
    -- Cuándo la aplicó el PTA a su componente de Docencia (integración pendiente).
    aplicada_en       TIMESTAMPTZ,
    recibida_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizada_en    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_docencia_concertada_docente_periodo
    ON academic_work_plan.docencia_concertada (documento_docente, periodo);
