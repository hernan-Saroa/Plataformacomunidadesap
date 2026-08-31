-- ============================================================
-- Migration 418: Permisos granulares del Macro Docente
-- (REQ-RUND-F020/F022), mismo esquema que la aprobación por
-- componente del PTA (326/362): permiso en auth.permission,
-- asignado a roles vía auth.role_permissions. Quién tiene acceso
-- se administra desde el panel de Roles y Permisos, sin tocar
-- código ni redeployar.
-- ============================================================

DO $$
DECLARE
  v_module_id UUID;
BEGIN
  SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'pta';
  IF v_module_id IS NULL THEN
    RAISE EXCEPTION 'No existe el módulo PTA en auth.module';
  END IF;

  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
  VALUES
    (gen_random_uuid(), 'pta.macro_docente.consultar', 'Consultar Macro Docente',
     'Ver el historial nacional de asignaturas dictadas por docente y responder consultas puntuales de control (REQ-RUND-F020/F022)',
     v_module_id, true),
    (gen_random_uuid(), 'pta.macro_docente.gestionar_accesos_externos', 'Gestionar accesos externos al Macro Docente',
     'Otorgar y revocar accesos temporales de entes externos al Macro Docente (REQ-RUND-F022)',
     v_module_id, true)
  ON CONFLICT (code) DO NOTHING;
END $$;

-- Asignación inicial. No es exhaustiva ni definitiva: el equipo de QA/GGP
-- puede ajustar qué roles tienen cada permiso desde el panel de Roles y
-- Permisos sin necesidad de una nueva migración.
DO $$
BEGIN
  INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
  SELECT r.id, p.id_permission, true
  FROM (
    VALUES
      -- GGP: consulta y además administra los accesos externos.
      ('GESTION_PROFESORAL', 'pta.macro_docente.consultar'),
      ('GESTION_PROFESORAL', 'pta.macro_docente.gestionar_accesos_externos'),

      -- Dirección institucional (no existe un rol "DIRECCION"; el equivalente
      -- real en el sistema es RECTOR — ver 191_seed_comite_institucional_ley_648.sql).
      ('RECTOR', 'pta.macro_docente.consultar'),
      ('RECTOR', 'pta.macro_docente.gestionar_accesos_externos'),

      -- Control Interno: rol genérico + variantes granulares que usa en la
      -- práctica internal-institutional-control-service (JEFE_CONTROL_INTERNO,
      -- JEFE_OCI, AUDITOR_LIDER, PROFESIONAL_AUDITOR).
      ('CONTROL_INTERNO', 'pta.macro_docente.consultar'),
      ('JEFE_CONTROL_INTERNO', 'pta.macro_docente.consultar'),
      ('JEFE_OCI', 'pta.macro_docente.consultar'),
      ('AUDITOR_LIDER', 'pta.macro_docente.consultar'),
      ('PROFESIONAL_AUDITOR', 'pta.macro_docente.consultar'),

      -- Control Disciplinario: rol genérico + jefatura de la OCID.
      ('CONTROL_DISCIPLINARIO', 'pta.macro_docente.consultar'),
      ('JEFE_DE_LA_OCID', 'pta.macro_docente.consultar')
  ) AS cfg(role_code, permission_code)
  JOIN auth.role r ON r.code = cfg.role_code
  JOIN auth.permission p ON p.code = cfg.permission_code
  ON CONFLICT (id_rol, id_permission) DO UPDATE
    SET is_active = true;
END $$;
