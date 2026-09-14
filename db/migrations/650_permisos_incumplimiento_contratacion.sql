-- ============================================================================
-- 650 · Permisos del bloque de Presunto Incumplimiento
--
-- EFDS-1180 (RF-INC-01): el supervisor reporta el presunto incumplimiento.
--
-- Los permisos son del código y los roles son datos. El administrador crea,
-- renombra y combina roles desde la plataforma, así que un endpoint que nombra
-- un rol deja de funcionar cuando alguien lo renombra o crea otro equivalente.
-- Estos códigos, en cambio, significan siempre lo mismo, y qué rol los otorga
-- lo decide quien administra.
--
-- Aditiva: solo agrega códigos nuevos al catálogo. No asigna permisos a ningún
-- rol —eso es configuración de la entidad— ni toca los de contratación que ya
-- existen.
-- ============================================================================

DO $$
DECLARE
  v_module_id UUID;
BEGIN
  -- Se toma del propio catálogo en vez de fijar el código del módulo: los
  -- permisos de contratación ya existen y apuntan al módulo correcto, así que
  -- preguntarles a ellos evita fallar si el módulo se llama de otra forma.
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
    -- Presunto Incumplimiento · Reporte del supervisor (EFDS-1180)
    (gen_random_uuid(), 'contratacion.incumplimiento.reportar',
     'Reportar presunto incumplimiento',
     'Constatar y reportar el presunto incumplimiento de un contrato en ejecución, con lo que queda abierto el caso',
     v_module_id, true, NOW(), NOW()),

    (gen_random_uuid(), 'contratacion.incumplimiento.ver',
     'Consultar presuntos incumplimientos',
     'Consultar los reportes de presunto incumplimiento de un contrato y su estado',
     v_module_id, true, NOW(), NOW())
  ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

  RAISE NOTICE 'Permisos de presunto incumplimiento sembrados (módulo %)', v_module_id;
END $$;
