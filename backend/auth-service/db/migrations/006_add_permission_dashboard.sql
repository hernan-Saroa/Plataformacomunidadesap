-- ============================================================================
-- Migración 021 — EFDS-1740 RF-INF-011 Alineación Roles y Permisos Tabla 5.2 ERS
-- Idempotente: todos los INSERT usan IF NOT EXISTS / ON CONFLICT DO NOTHING.
-- Se puede ejecutar N veces sin mutar datos existentes.
-- Dependencia: módulo auth.permission / auth.role / auth.role_permissions.
-- ============================================================================
BEGIN;
SET LOCAL search_path TO auth, public;

DO $$
DECLARE
  v_mod_id UUID;
BEGIN

SELECT id_module INTO STRICT v_mod_id
  FROM auth.module
  WHERE code = 'dashboard';

-- ====== PARTE 1: PERMISOS ATÓMICOS 27 = 11 gestión + 5 param + 1 aprob + 10 report/futuro ======

INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'dashboard.panel_seguimiento.view', 'Ver dashboard de panel seguimiento', 'Permite acceder al dashboard de panel seguimiento', v_mod_id, true, now(), now()),
  (gen_random_uuid(), 'dashboard.panel_seguimiento.edit', 'Editar dashboard de panel seguimiento', 'Permite editar el dashboard de panel seguimiento', v_mod_id, true, now(), now()),
  (gen_random_uuid(), 'dashboard.desarrollo_otic.view', 'Ver dashboard del Portafolio desarrollo OTIC', 'Permite acceder al dashboard del Portafolio de desarrollo OTIC', v_mod_id, true, now(), now()),
  (gen_random_uuid(), 'dashboard.desarrollo_otic.edit', 'Editar dashboard del Portafolio desarrollo OTIC', 'Permite editar el dashboard del Portafolio de desarrollo OTIC', v_mod_id, true, now(), now())
ON CONFLICT (code) DO NOTHING;

END $$;

COMMIT;
