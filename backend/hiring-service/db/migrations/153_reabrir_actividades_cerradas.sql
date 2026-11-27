-- ============================================================================
-- 153 · Reabrir actividades ya cerradas
--
-- Juan lo pidió el 2026-11-27: un error humano en una actividad ya aprobada
-- —un dato mal transcrito, un soporte equivocado— no tenía por dónde
-- corregirse, y si lo que sigue depende de esa actividad el proceso entero se
-- queda quieto. Hasta ahora solo el comité (3.7) reabría, y solo la 3.1 y la 3.6.
--
-- El permiso `contratacion.actividad.reabrir` deja escoger, de una etapa, una
-- o más actividades en APROBADO y devolverlas (DEVUELTO) con un motivo, como
-- hace el comité: quien la trabajó corrige y vuelve a pasar por su
-- aprobación. Lo que vino después no se toca. Si la reapertura sobró, el mismo
-- permiso la deshace mientras la actividad siga devuelta.
--
-- Por defecto lo tienen la Directora y el superadministrador, como borrar y
-- terminar plazos; se asigna a otros roles desde la plataforma.
--
-- Idempotente: correrla otra vez deja lo mismo.
-- ============================================================================

BEGIN;

INSERT INTO auth.permission (code, name, description, id_module, is_active)
SELECT v.code, v.name, v.description, m.id_module, true
FROM auth.module m
CROSS JOIN (VALUES
  ('contratacion.actividad.reabrir',
   'Reabrir actividades cerradas',
   'Devolver una actividad ya aprobada para corregir un error, con motivo y sin tocar lo que vino después.')
) AS v(code, name, description)
WHERE m.code = 'contratacion'
ON CONFLICT (code) DO UPDATE
   SET name = EXCLUDED.name,
       description = EXCLUDED.description,
       is_active = true;

INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
SELECT r.id, p.id_permission, true
FROM auth.role r
JOIN auth.permission p ON p.code = 'contratacion.actividad.reabrir'
WHERE r.code IN ('SUPER_ADMIN', 'DIRECTORA_DE_CONTRATACION')
ON CONFLICT (id_rol, id_permission) DO UPDATE SET is_active = true;

COMMIT;
