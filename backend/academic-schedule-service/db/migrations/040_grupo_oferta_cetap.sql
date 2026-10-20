-- ============================================================================
-- 040 · EFDS-2315 — El grupo sabe dónde se dicta: su oferta CETAP.
--
-- El PTA decide quién aprueba la Docencia por la territorial de CADA asignatura.
-- Programación Académica no guardaba dónde se dicta un grupo. El dato ya existe:
-- la carga masiva crea las ofertas de programa por CETAP y periodo
-- (academic_work_plan.oferta_cetap_programa). El grupo se asocia a una de ellas
-- y su territorial sale del CETAP de la oferta (direccion_territorial.codigo,
-- igual a auth.seccionales.cod_seccional que escribe la carga de estructura).
--
-- Nada se llena aquí: los grupos existentes quedan sin oferta (NULL) y no se
-- concertan hasta que se les asigne (falla cerrado). Las reglas (mismo programa,
-- mismo periodo, oferta activa, aula del mismo CETAP) viven en el servicio.
--
-- Forward-only e idempotente. SQL puro.
-- ============================================================================

ALTER TABLE "academic-schedule".grupo
  ADD COLUMN IF NOT EXISTS id_oferta_cetap BIGINT
    REFERENCES academic_work_plan.oferta_cetap_programa(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_grupo_oferta_cetap
  ON "academic-schedule".grupo (id_oferta_cetap);
