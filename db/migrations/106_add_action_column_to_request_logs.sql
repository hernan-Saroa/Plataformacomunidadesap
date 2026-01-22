-- Migración: Agregar columna action a audit.request_logs
-- Fecha: 2024
-- Descripción: Agrega la columna action para almacenar la acción legible de cada petición
--               (ej: "crear auditoria", "iniciar sesión", "actualizar hallazgo", etc.)

-- Agregar columna action
ALTER TABLE audit.request_logs 
ADD COLUMN IF NOT EXISTS action VARCHAR(100);

-- Agregar comentario a la columna
COMMENT ON COLUMN audit.request_logs.action IS 'Acción legible realizada en la petición (ej: "crear auditoria", "iniciar sesión", "actualizar hallazgo")';

-- Crear índice para mejorar búsquedas por acción
CREATE INDEX IF NOT EXISTS idx_request_logs_action ON audit.request_logs(action);

-- Crear índice compuesto para búsquedas comunes
CREATE INDEX IF NOT EXISTS idx_request_logs_action_module ON audit.request_logs(action, module);
CREATE INDEX IF NOT EXISTS idx_request_logs_action_timestamp ON audit.request_logs(action, timestamp DESC);

