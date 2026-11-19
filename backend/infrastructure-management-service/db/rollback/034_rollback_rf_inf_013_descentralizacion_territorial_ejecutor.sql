-- Rollback Migración 034: RF-INF-013 & RF-INF-005 Descentralización Territorial, Modalidad de Ejecutor y VoBo DT

BEGIN;

DROP TABLE IF EXISTS "infrastructure-management".solicitud_ejecucion_territorial CASCADE;

DELETE FROM auth.role_permissions
WHERE id_rol = (SELECT id FROM auth.role WHERE code = 'JEFATURA_TERRITORIAL')
  AND id_permission IN (
      SELECT id_permission FROM auth.permission 
      WHERE code IN (
          'infraestructura.view',
          'infraestructura.solicitud.read_all',
          'infraestructura.mantenimiento',
          'infraestructura.solicitud.assign'
      )
  );

COMMIT;
