-- Revisión (preaprobación) parcial por territorial y nivel del componente
-- "academica_territorial".
--
-- Bug: a diferencia de la aprobación (que ya soporta partición por territorial
-- desde la migración 396), la etapa de Revisión no tenía ninguna fila por
-- territorial: revisarComponente (pta.service.ts) exigía que el revisor tuviera
-- alcance sobre TODAS las territoriales (y, tras 397/398, sobre ambos niveles)
-- presentes en el PTA antes de dejarlo marcar el componente como "revisado".
-- Un revisor de una sola territorial/nivel no podía actuar en absoluto cuando
-- el PTA mezclaba varias.
--
-- Esta tabla guarda la decisión de revisión (pendiente | revisado | devuelto)
-- de cada combinación (territorial, nivel) por separado, espejando
-- academic_work_plan."PtaTerritorialApproval" (396/398). La fila única en
-- academic_work_plan."PtaComponentReview" para 'academica_territorial' sigue
-- existiendo y solo se considera "revisado" en su totalidad cuando TODAS las
-- filas de esta tabla para el PTA están en 'revisado'.
--
-- NOTA: academic_work_plan."PlanTrabajoAcademico".id es TEXT (no UUID), por eso
-- pta_id es TEXT (mismo criterio que 327/340/387/396).
--
-- Idempotente.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS academic_work_plan."PtaTerritorialReview" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pta_id TEXT NOT NULL REFERENCES academic_work_plan."PlanTrabajoAcademico"(id) ON DELETE CASCADE,
    territorial_id TEXT NOT NULL,
    territorial_nombre TEXT NULL,
    nivel VARCHAR(20) NOT NULL DEFAULT 'pregrado',
    estado VARCHAR(50) NOT NULL DEFAULT 'pendiente', -- 'pendiente', 'revisado', 'devuelto'
    revisor_id VARCHAR(100) NULL,
    revisor_nombre VARCHAR(200) NULL,
    revisor_rol VARCHAR(100) NULL,
    comentarios TEXT NULL,
    fecha_revision TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_pta_territorial_review UNIQUE (pta_id, territorial_id, nivel)
);

CREATE INDEX IF NOT EXISTS idx_pta_territorial_review_pta
    ON academic_work_plan."PtaTerritorialReview" (pta_id);
