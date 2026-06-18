-- Elimina la columna fecha_admision de la tabla expedientes.
-- El campo nunca fue utilizado en el flujo de creación de procesos judiciales;
-- la fecha relevante es fecha_notificacion (paso 6 del wizard).

ALTER TABLE legal_management.expedientes
  DROP COLUMN IF EXISTS fecha_admision;
