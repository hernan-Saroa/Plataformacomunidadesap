-- ============================================================================
-- 084 · Retirar los permisos que la 083 reemplazó
--
-- Desde la 083 ningún endpoint del módulo pregunta por estos treinta y un
-- códigos: los 225 se autorizan con `@Puede(acción, lugar)` —las cuatro
-- acciones y el alcance de `hiring.alcances_permiso`— o con uno de los cinco
-- permisos transversales que conservan su código (`proceso.view-all`,
-- `proceso.assign`, `config.manage`, `reporte.view`, `plazo.terminar`). Lo fija
-- `puede-todo-el-modulo.spec.ts`, que falla si un endpoint vuelve a nombrar uno.
--
-- Mientras sigan activos, el backoffice de roles los ofrece como casillas que
-- no hacen nada: quien administra marcaría «Aprobar actividad» a un rol y no
-- vería ningún efecto, porque lo que ahora aprueba es `contratacion.aprobar`
-- con su alcance.
--
-- ------------------------------------------- por qué desactiva y no borra ----
--
-- El criterio de la 068: `is_active = false` y no `DELETE`. La lectura de
-- permisos ya filtra por esa columna —`PermisosService`, `AlcanceService`, el
-- backoffice—, las filas de `auth.role_permissions` conservan quién tuvo qué y
-- desde cuándo, y es lo que pregunta una auditoría de accesos. Borrar el
-- permiso se llevaría esas filas en cascada.
--
-- Reaplicarla no hace nada nuevo.
-- ============================================================================

UPDATE auth.permission
   SET is_active = false,
       updated_at = now()
 WHERE is_active = true
   AND code IN (
     -- Del proceso: ver y crear pasan a `ver` y `editar 3.1`; tomar, a
     -- `editar 3.3`; editar, archivar y borrar no protegían ningún endpoint.
     'contratacion.proceso.create',
     'contratacion.proceso.edit',
     'contratacion.proceso.view',
     'contratacion.proceso.take',
     'contratacion.proceso.archive',
     'contratacion.proceso.delete',
     -- El trámite corriente: editar, enviar y adjuntar son `editar` en el
     -- punto; aprobar es `aprobar` en el punto.
     'contratacion.actividad.edit',
     'contratacion.actividad.send',
     'contratacion.actividad.approve',
     'contratacion.documento.upload',
     'contratacion.documento.delete',
     -- La lectura: `ver` con su alcance, y la auditoría es `ver` en todo.
     'contratacion.expediente.view',
     'contratacion.expediente.auditar',
     'contratacion.alerta.ver',
     'contratacion.seguimiento.ver',
     'contratacion.modificacion.ver',
     'contratacion.incumplimiento.ver',
     -- La ejecución y el cierre, punto por punto.
     'contratacion.acta-inicio.suscribir',   -- editar 9.1 (y radicar, editar 9.4)
     'contratacion.seguimiento.cargar',      -- editar 9.2
     'contratacion.supervision.reasignar',   -- decidir 9.3
     'contratacion.supervision.avalar',      -- aprobar 9.4 y editar 10.1
     'contratacion.modificacion.solicitar',  -- editar 9.5
     'contratacion.modificacion.aprobar',    -- decidir 9.5
     'contratacion.expediente.archivar',     -- editar y decidir 10.4
     -- Las competencias que no son del gestor.
     'contratacion.presupuesto.gestionar',   -- editar 4.2-4.4 y 10.3, aprobar 9.5, decidir 8.3 y 9.4
     'contratacion.designacion.ordenar',     -- decidir 6.2, 8.1 (firma) y 8.2
     'contratacion.adjudicacion.decidir',    -- decidir 7.4
     'contratacion.evaluacion.registrar',    -- editar 6.3
     -- El incumplimiento: INC.1 y INC.2.
     'contratacion.incumplimiento.reportar',
     'contratacion.incumplimiento.tramitar',
     'contratacion.incumplimiento.decidir'
   );

-- ---------------------------------------------- el selector de aprobadores --
--
-- La vista de la 061 lista los roles con algún permiso del módulo, pero no
-- miraba si el permiso sigue activo: un rol que solo tuviera códigos retirados
-- seguiría ofreciéndose como aprobador sin poder aprobar nada. Hoy no cambia
-- el resultado —la 083 les dio las acciones nuevas a todos los roles
-- funcionales—, pero sin el filtro volvería a pasar con el primer rol que el
-- área deje de usar.
CREATE OR REPLACE VIEW hiring.roles_del_modulo AS
SELECT DISTINCT r.code, r.name, r.type
  FROM auth.role r
  JOIN auth.role_permissions rp ON rp.id_rol = r.id
  JOIN auth.permission p ON p.id_permission = rp.id_permission
  JOIN auth.module m ON m.id_module = p.id_module
 WHERE m.code = 'contratacion'
   AND r.is_active = true
   AND rp.is_active = true
   AND p.is_active = true;
