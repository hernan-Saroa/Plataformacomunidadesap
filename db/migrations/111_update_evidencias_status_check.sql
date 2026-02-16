-- Drop existing constraint
ALTER TABLE legal_management.evidencias DROP CONSTRAINT IF EXISTS evidencias_estado_check;

-- Add new constraint with broader values and standard 'Pendiente'
ALTER TABLE legal_management.evidencias 
ADD CONSTRAINT evidencias_estado_check 
CHECK (estado IN ('Pendiente', 'En Revisión', 'Admitida', 'Rechazada', 'Valida'));

-- Update default value
ALTER TABLE legal_management.evidencias 
ALTER COLUMN estado SET DEFAULT 'Pendiente';
