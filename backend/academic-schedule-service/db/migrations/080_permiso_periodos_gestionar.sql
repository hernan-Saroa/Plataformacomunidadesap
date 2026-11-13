-- ============================================================================
-- 080 · EFDS-2427 — Crear un periodo académico exige un permiso de Programación Académica.
--
-- Antes, el servidor del PTA (POST /pta/api/v1/periodos-academicos) lo permitía a
-- GESTION_PROFESORAL, y Programas Académicos lo ofrecía en su pantalla. Ahora el servidor exige
-- `programacion-academica.periodos.gestionar` (o `programacion-academica.all`), se llame desde la
-- pantalla que se llame. Se da a ADMIN_PROGRAMACION y SUPER_ADMIN; GESTION_PROFESORAL deja de crear.
--
-- Forward-only e idempotente. SQL puro.
-- ============================================================================
INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
SELECT gen_random_uuid(),
       'programacion-academica.periodos.gestionar',
       'Programación — Crear y gestionar periodos académicos',
       'Permite crear periodos académicos (semestrales y personalizados). La creación se hace desde Programación Académica',
       (SELECT id_module FROM auth.module WHERE code = 'programacion-academica'),
       TRUE
 WHERE NOT EXISTS (SELECT 1 FROM auth.permission WHERE code = 'programacion-academica.periodos.gestionar');

INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
SELECT r.id, p.id_permission, TRUE
  FROM auth.role r
  JOIN auth.permission p ON p.code = 'programacion-academica.periodos.gestionar'
 WHERE r.code IN ('ADMIN_PROGRAMACION', 'SUPER_ADMIN', 'super_admin')
   AND NOT EXISTS (SELECT 1 FROM auth.role_permissions x WHERE x.id_rol = r.id AND x.id_permission = p.id_permission);
