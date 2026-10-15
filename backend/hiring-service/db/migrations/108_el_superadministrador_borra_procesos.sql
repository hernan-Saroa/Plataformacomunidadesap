-- ============================================================================
-- 108 · El superadministrador puede borrar un proceso
--
-- Juan lo pidió el 2026-10-15: hace falta limpiar procesos que nunca debieron
-- existir —de prueba, duplicados, creados contra la línea equivocada del PAA—.
-- Cancelar, negar o declarar desierto los terminan pero los dejan; borrar los
-- quita con todo lo suyo, trazabilidad incluida. Por eso es solo del
-- superadministrador, con el mismo criterio que terminar un plazo (082).
--
-- Dos cosas:
--
--   1. El permiso `contratacion.proceso.delete`, solo para SUPER_ADMIN. Ya
--      existía en el catálogo viejo y la 084 lo apagó; aquí se reactiva con
--      su nuevo sentido y se le quita a cualquier otro rol que lo tuviera.
--   2. Las cinco tablas que apuntaban al proceso sin `ON DELETE CASCADE`
--      —cdp, publicaciones y observaciones del pliego, manifestaciones y
--      limitaciones MiPyme— pasan a tenerlo, como las otras veintitrés. Sin
--      eso el borrado se detenía en la primera. Las referencias internas que
--      quedan sin cascada (documentos, oferentes, resultados…) apuntan a filas
--      que el mismo borrado se lleva, y Postgres las revisa al final de la
--      sentencia, así que no estorban.
--
-- Probado en local: con estas FK, borrar los ocho procesos de la base (hasta
-- la etapa 5) no deja nada colgado.
--
-- Idempotente: correrla otra vez deja lo mismo.
-- ============================================================================

BEGIN;

INSERT INTO auth.permission (code, name, description, id_module, is_active)
SELECT v.code, v.name, v.description, m.id_module, true
FROM auth.module m
CROSS JOIN (VALUES
  ('contratacion.proceso.delete',
   'Borrar un proceso',
   'Borrar un proceso con sus actividades, documentos y trazabilidad. No se puede deshacer.')
) AS v(code, name, description)
WHERE m.code = 'contratacion'
ON CONFLICT (code) DO UPDATE
   SET name = EXCLUDED.name,
       description = EXCLUDED.description,
       is_active = true;

DELETE FROM auth.role_permissions rp
 USING auth.role r, auth.permission p
 WHERE rp.id_rol = r.id
   AND rp.id_permission = p.id_permission
   AND p.code = 'contratacion.proceso.delete'
   AND r.code <> 'SUPER_ADMIN';

INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
SELECT r.id, p.id_permission, true
FROM auth.role r
JOIN auth.permission p ON p.code = 'contratacion.proceso.delete'
WHERE r.code = 'SUPER_ADMIN'
ON CONFLICT (id_rol, id_permission) DO UPDATE SET is_active = true;

ALTER TABLE hiring.cdp
  DROP CONSTRAINT IF EXISTS cdp_proceso_id_fkey,
  ADD CONSTRAINT cdp_proceso_id_fkey
    FOREIGN KEY (proceso_id) REFERENCES hiring.procesos(id) ON DELETE CASCADE;

ALTER TABLE hiring.publicaciones_pliego
  DROP CONSTRAINT IF EXISTS publicaciones_pliego_proceso_id_fkey,
  ADD CONSTRAINT publicaciones_pliego_proceso_id_fkey
    FOREIGN KEY (proceso_id) REFERENCES hiring.procesos(id) ON DELETE CASCADE;

ALTER TABLE hiring.observaciones_pliego
  DROP CONSTRAINT IF EXISTS observaciones_pliego_proceso_id_fkey,
  ADD CONSTRAINT observaciones_pliego_proceso_id_fkey
    FOREIGN KEY (proceso_id) REFERENCES hiring.procesos(id) ON DELETE CASCADE;

ALTER TABLE hiring.manifestaciones_mipyme
  DROP CONSTRAINT IF EXISTS manifestaciones_mipyme_proceso_id_fkey,
  ADD CONSTRAINT manifestaciones_mipyme_proceso_id_fkey
    FOREIGN KEY (proceso_id) REFERENCES hiring.procesos(id) ON DELETE CASCADE;

ALTER TABLE hiring.limitaciones_mipyme
  DROP CONSTRAINT IF EXISTS limitaciones_mipyme_proceso_id_fkey,
  ADD CONSTRAINT limitaciones_mipyme_proceso_id_fkey
    FOREIGN KEY (proceso_id) REFERENCES hiring.procesos(id) ON DELETE CASCADE;

COMMIT;
