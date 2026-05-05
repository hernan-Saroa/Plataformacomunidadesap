-- Normaliza el estado de docentes existentes que no tengan valor asignado
UPDATE academic_work_plan."Docente"
SET "estado" = 'ACTIVO'
WHERE "estado" IS NULL OR "estado" = '';
