-- ============================================================================
-- 651 · Permisos del trámite sancionatorio
--
-- EFDS-1181 (RF-INC-02): el área jurídica tramita las resoluciones y las
-- audiencias sancionatorias del presunto incumplimiento, incluida la caducidad.
--
-- Sigue el criterio de la 650: los permisos son del código y los roles son
-- datos. Aditiva —solo agrega códigos al catálogo— y no le asigna permisos a
-- ningún rol, que es configuración de la entidad.
--
-- **Dos y no uno.** Instruir el trámite y decidirlo no son la misma
-- competencia: citar audiencias y llevar la instrucción es del abogado que
-- lleva el caso, mientras que declarar el incumplimiento o la caducidad es un
-- acto administrativo que compromete a la entidad frente al contratista.
-- Reunirlos en un solo permiso obligaría a darle a quien instruye la facultad
-- de sancionar.
-- ============================================================================

DO $$
DECLARE
  v_module_id UUID;
BEGIN
  SELECT id_module INTO v_module_id
  FROM auth.permission
  WHERE code LIKE 'contratacion.%'
  LIMIT 1;

  IF v_module_id IS NULL THEN
    SELECT id_module INTO v_module_id
    FROM auth.module
    WHERE code = 'contratacion';
  END IF;

  IF v_module_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró el módulo de contratación en auth.module ni permisos previos suyos en auth.permission: siembra primero el catálogo de módulos.';
  END IF;

  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
  VALUES
    -- Presunto Incumplimiento · Instrucción del trámite (EFDS-1181)
    (gen_random_uuid(), 'contratacion.incumplimiento.tramitar',
     'Tramitar el proceso sancionatorio',
     'Abrir el trámite sancionatorio de un caso reportado, citar y registrar las audiencias, y notificar las resoluciones',
     v_module_id, true, NOW(), NOW()),

    -- Presunto Incumplimiento · Decisión (EFDS-1181)
    (gen_random_uuid(), 'contratacion.incumplimiento.decidir',
     'Decidir el proceso sancionatorio',
     'Expedir la resolución que archiva el caso, declara el incumplimiento o declara la caducidad del contrato, y revocarla',
     v_module_id, true, NOW(), NOW())
  ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

  RAISE NOTICE 'Permisos del trámite sancionatorio sembrados (módulo %)', v_module_id;
END $$;
