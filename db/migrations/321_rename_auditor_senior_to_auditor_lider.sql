-- Renombrar rol operativo legacy en configuracion_profesionales_ocig
UPDATE control_interno.configuracion_profesionales_ocig
SET rol_ocig = 'Auditor Líder',
    updated_at = NOW()
WHERE rol_ocig IN ('Auditor Sénior', 'Auditor Senior');

-- Alinear alias de jefe si quedó como "Jefe OCI"
UPDATE control_interno.configuracion_profesionales_ocig
SET rol_ocig = 'Jefe OCIG',
    updated_at = NOW()
WHERE rol_ocig = 'Jefe OCI';
