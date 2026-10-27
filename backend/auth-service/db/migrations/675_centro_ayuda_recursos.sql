SET client_encoding = 'UTF8';

-- ============================================================================
-- 675: Recursos del Centro de Ayuda (EFDS-2399)
-- ============================================================================
-- La pestaña Recursos del Centro de Ayuda mostraba seis opciones que no hacían
-- nada: el contenido nunca existió. Esta migración crea el catálogo donde se
-- cargan esos recursos y el permiso para administrarlo sin intervención de
-- desarrollo.
--
-- Categorías (una por opción de la pestaña):
--   documentacion  Guías por módulo del sistema
--   videos         Video tutoriales (archivo de video o enlace)
--   atajos         Atajos de teclado (en `contenido` va la combinación de teclas)
--   manual         Manual de usuario en PDF; solo uno activo, el vigente
--   cursos         Programas de capacitación para administradores
--   practicas      Recomendaciones de uso
--
-- El permiso se asigna desde Roles y Permisos. Aquí solo se le da al
-- Super Administrador para que alguien pueda empezar a cargar contenido.
-- ============================================================================

DO $$
DECLARE
  v_module_id UUID;
  v_permission_id UUID;
BEGIN
  INSERT INTO auth.module (code, name, description, icon, color, display_order, category, is_active)
  VALUES (
    'centro-ayuda',
    'Centro de Ayuda',
    'Manuales, videos, documentación, cursos y demás recursos del Centro de Ayuda',
    'LifeBuoy',
    '#003DA5',
    22,
    'backoffice',
    true
  )
  ON CONFLICT (code) DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description,
        is_active = true;

  SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'centro-ayuda';

  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
  VALUES (
    gen_random_uuid(),
    'centro-ayuda.recursos.gestionar',
    'Gestionar recursos del Centro de Ayuda',
    'Permite cargar, editar, activar y eliminar manuales, videos, documentación, cursos, atajos y mejores prácticas del Centro de Ayuda',
    v_module_id,
    true
  )
  ON CONFLICT (code) DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description,
        id_module = EXCLUDED.id_module,
        is_active = true;

  SELECT id_permission INTO v_permission_id
    FROM auth.permission
   WHERE code = 'centro-ayuda.recursos.gestionar';

  INSERT INTO auth.role_permissions (id_rol, id_permission, is_active, created_at, updated_at)
  SELECT r.id, v_permission_id, true, NOW(), NOW()
    FROM auth.role r
   WHERE UPPER(r.code) = 'SUPER_ADMIN'
     AND NOT EXISTS (
       SELECT 1
         FROM auth.role_permissions rp
        WHERE rp.id_rol = r.id
          AND rp.id_permission = v_permission_id
     );
END $$;

CREATE TABLE IF NOT EXISTS auth.centro_ayuda_recurso (
  id SERIAL PRIMARY KEY,
  categoria VARCHAR(20) NOT NULL
    CHECK (categoria IN ('documentacion', 'videos', 'atajos', 'manual', 'cursos', 'practicas')),
  titulo VARCHAR(200) NOT NULL,
  descripcion TEXT,
  modulo VARCHAR(100),
  contenido TEXT,
  enlace TEXT,
  version VARCHAR(30),
  archivo_ruta VARCHAR(255),
  archivo_nombre VARCHAR(255),
  archivo_mime VARCHAR(150),
  archivo_tamano BIGINT,
  orden INTEGER NOT NULL DEFAULT 0,
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_por VARCHAR(150),
  actualizado_por VARCHAR(150),
  creado_en TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_centro_ayuda_recurso_categoria
  ON auth.centro_ayuda_recurso (categoria, activo, orden);

-- Atajos que de verdad existen hoy en el backoffice (SidebarPremium y GlobalSearch).
INSERT INTO auth.centro_ayuda_recurso (categoria, titulo, descripcion, contenido, orden, creado_por)
SELECT v.categoria, v.titulo, v.descripcion, v.contenido, v.orden, 'migracion-675'
  FROM (VALUES
    ('atajos', 'Búsqueda global', 'Abre el buscador de la barra superior desde cualquier pantalla. En Mac: ⌘ + K', 'Ctrl + K', 1),
    ('atajos', 'Contraer o expandir el menú lateral', 'Muestra u oculta los nombres del menú de módulos. En Mac: ⌘ + B', 'Ctrl + B', 2),
    ('atajos', 'Cerrar el buscador', 'Cierra la búsqueda global abierta', 'Esc', 3)
  ) AS v(categoria, titulo, descripcion, contenido, orden)
 WHERE NOT EXISTS (
   SELECT 1 FROM auth.centro_ayuda_recurso r
    WHERE r.categoria = v.categoria AND r.titulo = v.titulo
 );
