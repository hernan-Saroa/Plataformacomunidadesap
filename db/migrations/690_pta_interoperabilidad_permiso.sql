-- ============================================================================
-- 690 · EFDS-2435 — Permiso para encender/apagar la interoperabilidad PTA ↔ Programación Académica.
--
-- El estado vive en academic_work_plan."ConfiguracionSistema" (clave
-- 'interoperabilidad_programacion'); el servicio del PTA lo siembra al arrancar
-- desde PROG_CONCERTACION_HABILITADA solo si no hay fila. Aquí solo se crea el permiso.
--
-- Roles que lo reciben: SUPER_ADMIN y los roles que YA administran la Configuración del PTA
-- (pta.backoffice.config_reglas). Cualquier otro rol se asigna desde Roles y Permisos.
-- Forward-only e idempotente.
-- ============================================================================
DO $$
DECLARE
  v_module_id UUID;
BEGIN
  SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'pta';
  IF v_module_id IS NULL THEN
    RAISE EXCEPTION 'No existe el módulo PTA en auth.module';
  END IF;

  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
  VALUES (
    gen_random_uuid(),
    'pta.backoffice.interoperabilidad',
    'Interoperabilidad con Programación Académica',
    'Permite ver y cambiar si la Docencia Directa del PTA llega de Programación Académica (encendido) o se registra a mano (apagado). Cada cambio exige motivo y queda auditado',
    v_module_id,
    true
  )
  ON CONFLICT (code) DO UPDATE
    SET name = EXCLUDED.name, description = EXCLUDED.description, id_module = EXCLUDED.id_module, is_active = true;

  INSERT INTO auth.role_permissions (id_rol, id_permission, is_active)
  SELECT DISTINCT r.id, p.id_permission, TRUE
    FROM auth.role r
    JOIN auth.permission p ON p.code = 'pta.backoffice.interoperabilidad'
   WHERE (r.code IN ('SUPER_ADMIN', 'super_admin')
          OR EXISTS (SELECT 1 FROM auth.role_permissions rp
                       JOIN auth.permission pc ON pc.id_permission = rp.id_permission AND pc.code = 'pta.backoffice.config_reglas'
                      WHERE rp.id_rol = r.id AND COALESCE(rp.is_active, true)))
     AND NOT EXISTS (SELECT 1 FROM auth.role_permissions x WHERE x.id_rol = r.id AND x.id_permission = p.id_permission);
END $$;
