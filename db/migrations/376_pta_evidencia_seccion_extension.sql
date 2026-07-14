-- =============================================================================
-- 376: Agrega la sección de extensión a las evidencias de seguimiento del PTA
-- =============================================================================
-- El modelo de aprobación del PTA es POR COMPONENTE. La extensión, además, se
-- aprueba POR SECCIÓN (pta.approve.extension.capacitacion / procesos_seleccion /
-- fortalecimiento / alto_gobierno). Hasta ahora la evidencia solo guardaba
-- `componentePta` (docencia|investigacion|extension|complementarias), sin poder
-- distinguir la sección de extensión, por lo que la revisión (aprobar/rechazar)
-- por sección era imposible.
--
-- Esta migración agrega `seccionExtension` a PtaEvidencia. Solo aplica cuando
-- `componentePta = 'extension'`; para el resto queda NULL. Valores esperados
-- (nivel permiso): 'capacitacion' | 'seleccion' | 'fortalecimiento' | 'alto_gobierno'.
--
-- Sin backfill: las evidencias de extensión ya existentes quedan con sección NULL
-- y (por decisión de negocio) serán visibles/aprobables por CUALQUIER aprobador de
-- extensión. La gating por sección aplica a las evidencias nuevas que sí traen sección.
-- Idempotente.
-- =============================================================================

ALTER TABLE academic_work_plan."PtaEvidencia"
  ADD COLUMN IF NOT EXISTS "seccionExtension" text;
