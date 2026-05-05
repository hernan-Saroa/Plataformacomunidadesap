-- Migración 215: Agregar columna abogado_asignado_nombre a consultas_juridicas
-- Necesaria porque abogado_asignado_id ahora guarda UUIDs del auth-service,
-- no de la tabla legal_management.abogados. El nombre se guarda directamente.

ALTER TABLE legal_management.consultas_juridicas
  ADD COLUMN IF NOT EXISTS abogado_asignado_nombre VARCHAR(500);
