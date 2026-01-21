-- ============================================
-- MIGRACION 100: Limpiar placeholders de dependencias
-- Descripcion: Deja en blanco department_parent y department_son cuando tienen valores por defecto
-- ============================================

SET search_path TO certification, public;

UPDATE certificate_requests
SET department_parent = NULL
WHERE department_parent IS NOT NULL
  AND TRIM(department_parent) = 'Registro padre';

UPDATE certificates
SET department_parent = NULL
WHERE department_parent IS NOT NULL
  AND TRIM(department_parent) = 'Registro padre';

UPDATE certificate_requests
SET department_son = NULL
WHERE department_son IS NOT NULL
  AND TRIM(department_son) = 'Registro hijo';

UPDATE certificates
SET department_son = NULL
WHERE department_son IS NOT NULL
  AND TRIM(department_son) = 'Registro hijo';
