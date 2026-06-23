-- Migración 356: Agrega columna nombre_usuario a historial_auditoria
-- Propósito: Almacenar el nombre del usuario directamente en el historial
-- para evitar depender del JOIN con auth.personas (que puede fallar para superadmin
-- o usuarios sin registro en auth.personas).

ALTER TABLE control_interno.historial_auditoria
  ADD COLUMN IF NOT EXISTS nombre_usuario VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS user_email     VARCHAR(255) NULL;

COMMENT ON COLUMN control_interno.historial_auditoria.nombre_usuario
  IS 'Nombre completo del usuario que realizó la acción (desnormalizado para auditoría)';

COMMENT ON COLUMN control_interno.historial_auditoria.user_email
  IS 'Email del usuario que realizó la acción (desnormalizado para auditoría)';
