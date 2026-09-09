-- ============================================================================
-- 649 · Permisos de la etapa 9 del módulo de Contratación
--
-- EFDS-1167, EFDS-1168 y EFDS-1169: ejecución y supervisión del contrato.
--
-- Los permisos son del código y los roles son datos. El administrador crea,
-- renombra y combina roles desde la plataforma, así que un endpoint que nombra
-- un rol deja de funcionar cuando alguien lo renombra o crea otro equivalente.
-- Estos códigos, en cambio, significan siempre lo mismo, y qué rol los otorga
-- lo decide quien administra.
--
-- Aditiva: solo agrega códigos nuevos al catálogo. No asigna permisos a ningún
-- rol —eso es configuración de la entidad— ni toca los quince de contratación
-- que ya existen.
-- ============================================================================

DO $$
DECLARE
  v_module_id UUID;
BEGIN
  -- Se toma del propio catálogo en vez de fijar el código del módulo: los
  -- quince permisos de contratación ya existen y apuntan al módulo correcto,
  -- así que preguntarles a ellos evita fallar si el módulo se llama de otra
  -- forma. Solo si no hubiera ninguno se busca por código.
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
    -- Actividad 9.1 · Reunión y acta de inicio (EFDS-1167)
    (gen_random_uuid(), 'contratacion.acta-inicio.suscribir',
     'Suscribir acta de inicio',
     'Registrar la reunión de inicio y su acta, con lo que el contrato entra en ejecución',
     v_module_id, true, NOW(), NOW()),

    -- Actividad 9.3 · Reasignación de supervisión (EFDS-1169)
    (gen_random_uuid(), 'contratacion.supervision.reasignar',
     'Reasignar supervisión',
     'Relevar al supervisor vigente y designar otro durante la ejecución del contrato',
     v_module_id, true, NOW(), NOW()),

    -- Actividad 9.2 · Seguimiento de la ejecución (EFDS-1168)
    (gen_random_uuid(), 'contratacion.seguimiento.cargar',
     'Cargar seguimiento de ejecución',
     'Adjuntar informes, actas y soportes de la ejecución al expediente del contrato',
     v_module_id, true, NOW(), NOW()),

    (gen_random_uuid(), 'contratacion.seguimiento.ver',
     'Consultar seguimiento de ejecución',
     'Consultar el estado del contrato en ejecución, sus responsables y los soportes cargados',
     v_module_id, true, NOW(), NOW())
  ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

  RAISE NOTICE 'Permisos de la etapa 9 de contratación sembrados (módulo %)', v_module_id;
END $$;
