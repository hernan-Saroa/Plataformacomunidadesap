-- Reactivar Subdirector(a) Alto Gobierno en configuracion_profesionales_ocig
UPDATE control_interno.configuracion_profesionales_ocig 
SET activo = true, updated_at = NOW()
WHERE id_tercero = 'd0000005-0000-0000-0000-000000000005';

-- Verificar
SELECT id, id_tercero, rol_ocig, activo 
FROM control_interno.configuracion_profesionales_ocig 
WHERE id_tercero = 'd0000005-0000-0000-0000-000000000005';
