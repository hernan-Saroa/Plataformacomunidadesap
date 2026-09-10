-- ============================================================================
-- 068 · El abogado ve los procesos que le repartieron, no todos
--
-- EFDS-1183. La 060 le dio `contratacion.proceso.view-all` al revisor, y con
-- ese permiso el listado le devuelve el expediente de toda la entidad: un
-- abogado que tiene tres procesos asignados abre la pantalla y ve los sesenta
-- de la Dirección.
--
-- No fue un descuido de la 060: cuando se sembró, el reparto no existía. Sin
-- «ver todos», el revisor no habría alcanzado los expedientes que tenía que
-- revisar, porque no había ninguna otra vía que lo llevara hasta ellos. La 064
-- creó esa vía —`participaciones_proceso`— y desde entonces el abogado llega a
-- los suyos por su participación, así que el permiso dejó de sostener nada y
-- quedó enseñando de más.
--
-- La Hoja1 del formato marca «Visualizar todos los procesos» con una sola X, la
-- del Jefe de Oficina, que aquí es el Director de Contratación. Se queda con
-- ella, y con SUPER_ADMIN, que los tiene todos.
--
-- ------------------------------------------- por qué desactiva y no borra ----
--
-- `is_active = false` y no `DELETE`: la lectura de permisos ya filtra por esa
-- columna (`rp.is_active = true`), la fila conserva quién y cuándo la creó, y
-- devolver el permiso es volver a ponerla en true desde el backoffice. Borrarla
-- perdería el rastro de que alguna vez estuvo concedido, que es justo lo que
-- una auditoría de accesos pregunta.
--
-- Reaplicarla no hace nada nuevo: la fila ya está en false.
-- ============================================================================

UPDATE auth.role_permissions rp
   SET is_active = false
  FROM auth.role r, auth.permission p
 WHERE rp.id_rol = r.id
   AND rp.id_permission = p.id_permission
   AND r.code = 'REVISOR_CONTRATACION'
   AND p.code = 'contratacion.proceso.view-all'
   AND rp.is_active = true;

-- El permiso de consultar los procesos propios NO se toca: es el que le deja
-- abrir los que sí le repartieron.
