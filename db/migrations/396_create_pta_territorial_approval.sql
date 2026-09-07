-- Aprobación parcial por territorial del componente "academica_territorial".
--
-- Bug: cuando un PTA tenía asignaturas de Docencia dictadas en 2+ Direcciones
-- Territoriales distintas (ej. Antioquia y Bolívar), assertAlcanceTerritorial
-- (pta.service.ts) bloqueaba CUALQUIER aprobación o devolución del componente,
-- porque exigía que el aprobador fuera dueño de TODAS las territoriales
-- presentes. Ningún aprobador de una sola territorial podía actuar.
--
-- Esta tabla guarda la decisión (pendiente | aprobado | devuelto) de CADA
-- territorial por separado. La fila única existente en
-- academic_work_plan."PtaComponentApproval" para 'academica_territorial' sigue
-- siendo la que consolida el estado del componente: solo pasa a 'aprobado'
-- cuando TODAS las filas de esta tabla para el PTA están en 'aprobado'.
--
-- NOTA: academic_work_plan."PlanTrabajoAcademico".id es TEXT (no UUID), por eso
-- pta_id es TEXT (mismo error histórico que 327/340/387).
--
-- Idempotente.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS academic_work_plan."PtaTerritorialApproval" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pta_id TEXT NOT NULL REFERENCES academic_work_plan."PlanTrabajoAcademico"(id) ON DELETE CASCADE,
    territorial_id TEXT NOT NULL,
    territorial_nombre TEXT NULL,
    estado VARCHAR(50) NOT NULL DEFAULT 'pendiente', -- 'pendiente', 'aprobado', 'devuelto'
    actor_id VARCHAR(100) NULL,
    actor_nombre VARCHAR(200) NULL,
    actor_rol VARCHAR(100) NULL,
    comentarios TEXT NULL,
    fecha_decision TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_pta_territorial UNIQUE (pta_id, territorial_id)
);

CREATE INDEX IF NOT EXISTS idx_pta_territorial_approval_pta
    ON academic_work_plan."PtaTerritorialApproval" (pta_id);
