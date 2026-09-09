-- ============================================================================
-- 065 · El permiso de tomar un proceso de la bandeja
--
-- EFDS-1183. Los procesos que el área envía llegan a la Dirección sin dueño, y
-- el reparto entre el equipo es una bandeja compartida: quien abre la 3.3 se
-- queda con el proceso. Nadie los entrega uno a uno.
--
-- Se descartó que un coordinador repartiera porque convierte a esa persona en
-- un cuello de botella —si no está, no entra nada— y obliga a decidir quién
-- reparte cuando falta, que es la misma pregunta otra vez.
--
-- ------------------------------------ por qué no reusa `proceso.assign` ----
--
-- `assign` es entregarle un proceso a otro, y la matriz se lo da solo al
-- Director. Tomar es quedarse con uno que nadie ha cogido. Si fueran el mismo
-- permiso, dejar que el equipo tome de la bandeja les daría de paso la
-- facultad de repartirse trabajo entre ellos, que es una decisión de la
-- Dirección y no de cada quien.
--
-- Idempotente y aditiva, como la 060 y la 061: solo inserta lo que falta, no
-- desactiva ni borra nada, y lo que la entidad haya ajustado desde el
-- backoffice de roles sobrevive a reaplicarla.
-- ============================================================================

-- `id_module` es NOT NULL y apunta a auth.module: los permisos cuelgan del
-- módulo, así que se resuelve por su código en vez de escribir el uuid.
INSERT INTO auth.permission (code, name, description, id_module, is_active)
SELECT v.code, v.name, v.description, m.id_module, true
FROM auth.module m
CROSS JOIN (VALUES
  ('contratacion.proceso.take',
   'Tomar proceso de la bandeja',
   'Quedarse con un proceso que llegó a la Dirección y que nadie ha radicado todavía.')
) AS v(code, name, description)
WHERE m.code = 'contratacion'
ON CONFLICT (code) DO NOTHING;

-- ------------------------------------------ qué rol otorga cada permiso ----
--
-- Copiado de ROLES_QUE_OTORGAN, como el resto de la 060. Todo el equipo de la
-- Dirección, que es lo que significa «bandeja compartida».
--
-- El estructurador técnico NO entra, aunque pueda crear y editar procesos: es
-- de las áreas que radican hacia la Dirección, no de quien las recibe. Darle
-- este permiso le dejaría tomar su propio proceso y revisárselo.
INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
SELECT r.id, p.id_permission, true
FROM (VALUES
  ('contratacion.proceso.take', 'GESTOR_CONTRATACION'),
  ('contratacion.proceso.take', 'DIRECTOR_CONTRATACION')
) AS par(permiso, rol)
JOIN auth.role r       ON r.code = par.rol
JOIN auth.permission p ON p.code = par.permiso
ON CONFLICT (id_rol, id_permission) DO NOTHING;

-- ---------------------------------------------------------- SUPER_ADMIN ----
--
-- Mismo criterio de la 060: el rol transversal los tiene todos, y el catálogo
-- es cerrado, así que «todos» se expresa con el producto cartesiano. Aquí basta
-- con el permiso nuevo, que es el único que la 060 no pudo darle.
INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
SELECT r.id, p.id_permission, true
FROM auth.role r
CROSS JOIN auth.permission p
WHERE r.code = 'SUPER_ADMIN'
  AND p.code = 'contratacion.proceso.take'
ON CONFLICT (id_rol, id_permission) DO NOTHING;
