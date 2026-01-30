-- =====================================================
-- MIGRACIÓN: Agregar fecha de expedición de cédula
-- =====================================================

-- Agregar campo id_issue_date a la tabla graduates
ALTER TABLE academic_registration.graduates
ADD COLUMN id_issue_date DATE;

-- Crear índice para búsquedas por fecha de expedición
CREATE INDEX idx_graduates_id_issue_date ON academic_registration.graduates(id_issue_date);

-- Comentario explicativo
COMMENT ON COLUMN academic_registration.graduates.id_issue_date IS 'Fecha de expedición de la cédula de ciudadanía';

-- Actualizar datos de prueba existentes con fechas de expedición de ejemplo
UPDATE academic_registration.graduates
SET id_issue_date = '2010-05-15'
WHERE id_number = '1012345678';

UPDATE academic_registration.graduates
SET id_issue_date = '1995-08-22'
WHERE id_number = '79123456';

UPDATE academic_registration.graduates
SET id_issue_date = '1998-03-10'
WHERE id_number = '52987654';

UPDATE academic_registration.graduates
SET id_issue_date = '2008-11-18'
WHERE id_number = '1023456789';
