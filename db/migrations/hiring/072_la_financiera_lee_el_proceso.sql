-- ============================================================================
-- 072 · La Financiera lee el proceso que tiene que certificar
--
-- La 069 le dio a la Dirección Financiera su papel en la etapa 4 y la 060 le
-- había dado `contratacion.presupuesto.gestionar`, que es lo que la habilita a
-- verificar, expedir y rechazar. Con eso puede **escribir** las cuatro
-- actividades del CDP, pero no puede **leer** nada del proceso al que se las
-- escribe: `contratacion.proceso.view` no lo tiene.
--
-- El resultado es un rol que entra y no puede trabajar:
--
--   · el panel de la 4.1 pide a la vez el estado del CDP y quién lleva la
--     solicitud. Lo primero pasa —el endpoint acepta `presupuesto.gestionar`—,
--     lo segundo no, y como van juntas el panel se cae entero. El botón de
--     hacerse cargo, que es toda la actividad, no llega a dibujarse.
--
--   · cualquier otra actividad que abra —el estudio previo que justifica el
--     gasto, los documentos del proceso, la apertura— le responde que no tiene
--     el permiso necesario.
--
-- No es que la Financiera no debiera entrar: el módulo ya la había dejado. El
-- listado le muestra los procesos cuya solicitud de CDP nadie ha atendido y
-- `obtenerProceso` la deja abrirlos por esa misma vía (la cuarta que enumera
-- `listarProcesos`). Se la invitaba a pasar y luego se le negaba cada lectura.
--
-- --------------------------------------------- por qué view y no view-all ----
--
-- `contratacion.proceso.view` no enseña la entidad entera: el listado y el
-- detalle siguen filtrando por dato —lo que radiqué, lo que me repartieron, lo
-- que está en mi bandeja—, y para la Financiera esa bandeja son las solicitudes
-- de CDP sin atender. Ver todos es `view-all`, que la 068 dejó en una sola X y
-- aquí no se toca.
--
-- ------------------------------------------------ qué sigue sin poder hacer --
--
-- Nada de escribir en el trámite: `actividad.edit`, `actividad.send`,
-- `actividad.approve`, `documento.upload` y `proceso.edit` se quedan fuera. Es
-- la separación de siempre —quien certifica la disponibilidad no diligencia el
-- estudio previo que la pide—, y es lo que hace que esto sea leer y no entrar.
--
-- Reaplicarla no hace nada: el ON CONFLICT deja la fila como está.
-- ============================================================================

INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
SELECT r.id, p.id_permission, true
FROM auth.role r
JOIN auth.permission p ON p.code = 'contratacion.proceso.view'
WHERE r.code = 'ESTRUCTURADOR_FINANCIERO'
ON CONFLICT (id_rol, id_permission) DO NOTHING;

-- Y si alguien la había desactivado alguna vez, se vuelve a conceder: el
-- ON CONFLICT de arriba no toca la fila existente, así que sin esto la
-- migración no haría nada justo en el caso en que hace falta.
UPDATE auth.role_permissions rp
   SET is_active = true, updated_at = now()
  FROM auth.role r, auth.permission p
 WHERE rp.id_rol = r.id
   AND rp.id_permission = p.id_permission
   AND r.code = 'ESTRUCTURADOR_FINANCIERO'
   AND p.code = 'contratacion.proceso.view'
   AND rp.is_active = false;
