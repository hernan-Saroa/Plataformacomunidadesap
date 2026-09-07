-- ============================================================================
-- EFDS-1366 - Alinear el prefijo de los permisos con el código del módulo
--
-- BUG (pantalla huérfana): el backoffice deriva los módulos visibles del PREFIJO
-- del permiso (auth.service.ts): permission.code.split('.')[0].replace(/_/g,'-').
-- Los permisos eran 'programacion.*' → prefijo 'programacion', pero el sidebar
-- acepta 'programacion-academica' | 'academic-schedule'. No coincide → el módulo
-- no aparece para PROGRAMADOR_PREGRADO/POSGRADO. Verificado por navegador.
--
-- ARREGLO: renombrar 'programacion.*' → 'programacion-academica.*'. El prefijo
-- resultante ('programacion-academica') es CARÁCTER POR CARÁCTER igual al código
-- aceptado, y no depende del reemplazo _→- (se usa guion directo, no guion bajo).
--   Verificado: 'programacion-academica.x'.split('.')[0] === 'programacion-academica'.
--
-- SIN PÉRDIDA DE ASIGNACIONES (evita repetir EFDS-1643): se hace UPDATE EN SITIO
-- del code, preservando id_permission. auth.role_permissions referencia por
-- id_permission (FK role_permissions_id_permission_fkey), no por code, así que
-- las asignaciones de PROGRAMADOR_PREGRADO, PROGRAMADOR_POSGRADO y
-- SUBDIRECTOR_ACADEMICO quedan intactas sin moverlas.
--
-- FORWARD-ONLY e IDEMPOTENTE: al renombrar, ningún code empieza ya por
-- 'programacion.' (ahora es 'programacion-academica.'), así que una segunda
-- corrida no afecta filas. El RBAC del microservicio (programacion-permissions.ts)
-- se actualiza a los mismos códigos en el mismo cambio.
-- ============================================================================

UPDATE auth.permission
   SET code = regexp_replace(code, '^programacion\.', 'programacion-academica.'),
       updated_at = NOW()
 WHERE code ~ '^programacion\.';

-- Constancia del resultado esperado (no falla el deploy; es verificación):
DO $$
DECLARE
  viejos INT;
  nuevos INT;
BEGIN
  SELECT count(*) INTO viejos FROM auth.permission WHERE code ~ '^programacion\.';
  SELECT count(*) INTO nuevos FROM auth.permission WHERE code ~ '^programacion-academica\.';
  RAISE NOTICE 'permisos con prefijo viejo (programacion.): % (esperado 0)', viejos;
  RAISE NOTICE 'permisos con prefijo nuevo (programacion-academica.): % (esperado 4)', nuevos;
END $$;
