-- Add sistema_destino column to auth.role table after type column
-- Default value is 'Backoffice'

ALTER TABLE auth.role
ADD COLUMN sistema_destino TEXT DEFAULT 'Backoffice';