-- Migración 216: Workflow de revisión del jefe en asesoría jurídica
-- El abogado ya no envía directamente al solicitante; envía al jefe para revisión.
-- El jefe aprueba y envía, o devuelve con comentarios al abogado.

ALTER TABLE legal_management.consultas_juridicas
  ADD COLUMN IF NOT EXISTS comentario_devolucion_jefe TEXT;
