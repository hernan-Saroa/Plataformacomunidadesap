-- ============================================================================
-- 082 · El permiso para terminar un plazo en pruebas
--
-- Los dos términos que bloquean el flujo —el de publicidad del pliego, que la
-- 5.3 necesita vencido para poder cerrarse sin observaciones, y el de
-- subsanaciones de la 6.5— duran días hábiles reales. Recorrer un proceso
-- completo en una sesión de QA exigía esperarlos, así que en la práctica no se
-- probaba nada de lo que viene después.
--
-- Ya había un intento: `CONTRATACION_SALTAR_PLAZOS` (EFDS-2064). Nunca llegó a
-- servir, porque además de la variable exige `NODE_ENV <> 'production'` y todos
-- los servicios del compose —incluido el de desarrollo— corren con
-- `NODE_ENV: production`. Quedaba encendible solo en un backend levantado a
-- mano.
--
-- Esto lo resuelve con lo que la plataforma ya sabe hacer: un permiso. No se
-- configura por ambiente ni hay que reiniciar nada, y quién puede usarlo se ve
-- en la misma matriz de roles que el resto.
--
-- **Solo SUPER_ADMIN**, y a propósito no se le da a ningún rol funcional:
-- acortar un término no es una competencia del negocio, es una llave de
-- pruebas. El INSERT de abajo lo nombra explícitamente en vez de dejarlo al
-- producto cartesiano de la 060, para que se lea aquí a quién se le dio.
-- ============================================================================

INSERT INTO auth.permission (code, name, description, id_module, is_active)
SELECT v.code, v.name, v.description, m.id_module, true
FROM auth.module m
CROSS JOIN (VALUES
  ('contratacion.plazo.terminar',
   'Terminar un plazo (pruebas)',
   'Dar por vencido el término de publicidad o el de subsanaciones para poder probar el flujo sin esperar los días hábiles.')
) AS v(code, name, description)
WHERE m.code = 'contratacion'
ON CONFLICT (code) DO NOTHING;

INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
SELECT r.id, p.id_permission, true
FROM auth.role r
JOIN auth.permission p ON p.code = 'contratacion.plazo.terminar'
WHERE r.code = 'SUPER_ADMIN'
ON CONFLICT (id_rol, id_permission) DO NOTHING;
