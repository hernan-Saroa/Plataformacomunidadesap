-- ============================================================================
-- 130 · Las pólizas se aprueban en SECOP II, no otra vez en la plataforma
--
-- Revisión de QA de EFDS-1164 (2026-10-16): el revisor y la Directora
-- aprobaban dentro del módulo una póliza que ya se había aprobado en SECOP.
-- Ahora el abogado registra la fecha de esa aprobación y carga la evidencia,
-- y la póliza entra APROBADA. Las que se cargaron antes del cambio conservan
-- el aprobar/devolver de siempre.
--
-- También desde esta revisión una póliza registrada puede recibir más amparos
-- (POST .../garantias/:id/amparos); la tabla `amparos` ya lo admitía.
--
-- Idempotente.
-- ============================================================================

BEGIN;

ALTER TABLE hiring.garantias
  ADD COLUMN IF NOT EXISTS fecha_aprobacion_secop date,
  ADD COLUMN IF NOT EXISTS evidencia_aprobacion_documento_id uuid REFERENCES hiring.documentos (id);

COMMENT ON COLUMN hiring.garantias.fecha_aprobacion_secop IS
  'Cuándo se aprobó la póliza en SECOP II; con ella y la evidencia la póliza entra APROBADA (130).';

COMMIT;
