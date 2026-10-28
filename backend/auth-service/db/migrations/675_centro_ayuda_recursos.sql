SET client_encoding = 'UTF8';

-- ============================================================================
-- 675: Secciones y recursos del Centro de Ayuda (EFDS-2399)
-- ============================================================================
-- La pestaña Recursos del Centro de Ayuda mostraba seis opciones que no hacían
-- nada: el contenido nunca existió. Esta migración crea:
--
--   * El módulo `centro-ayuda`. Desde Gestión de módulos se apaga el Centro de
--     Ayuda completo: el botón de ayuda, la administración y sus endpoints.
--   * Los permisos, uno por acción, que se asignan desde Roles y Permisos.
--     Aquí solo se le dan al Super Administrador para que alguien pueda empezar.
--   * Las secciones (las opciones de la pestaña Recursos). Ya no son fijas: se
--     crean, editan, ordenan, ocultan y eliminan desde la administración.
--   * Los recursos de cada sección.
--
-- Eliminar no borra filas: marca `eliminado_en` y el registro queda en la
-- papelera de la administración, de donde se puede restaurar.
--
-- El `tipo` de una sección define qué pide el formulario y cómo se muestra:
--   general  Archivo, enlace o texto; se agrupa por módulo si se indica
--   manual   PDF con la versión del sistema; solo uno vigente por sección,
--            y la opción lo descarga directamente
--   videos   Archivo de video o enlace
--   atajos   Combinación de teclas
-- ============================================================================

DO $$
DECLARE
  v_module_id UUID;
  v_permiso RECORD;
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
        description = EXCLUDED.description;

  SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'centro-ayuda';

  FOR v_permiso IN
    SELECT * FROM (VALUES
      ('centro-ayuda.administracion.ver', 'Ver la administración del Centro de Ayuda',
       'Entrar a Configuración General > Centro de Ayuda y ver las secciones y recursos, incluidos los ocultos y la papelera'),
      ('centro-ayuda.secciones.crear', 'Crear secciones del Centro de Ayuda',
       'Agregar opciones nuevas a la pestaña Recursos del Centro de Ayuda'),
      ('centro-ayuda.secciones.editar', 'Editar secciones del Centro de Ayuda',
       'Cambiar el nombre, el icono y el orden de las secciones, y ocultarlas o mostrarlas'),
      ('centro-ayuda.secciones.eliminar', 'Eliminar secciones del Centro de Ayuda',
       'Enviar secciones vacías a la papelera y restaurarlas'),
      ('centro-ayuda.recursos.crear', 'Cargar recursos del Centro de Ayuda',
       'Publicar manuales, videos, documentos, enlaces, textos y atajos'),
      ('centro-ayuda.recursos.editar', 'Editar recursos del Centro de Ayuda',
       'Modificar recursos, reemplazar sus archivos y ocultarlos o mostrarlos'),
      ('centro-ayuda.recursos.eliminar', 'Eliminar recursos del Centro de Ayuda',
       'Enviar recursos a la papelera y restaurarlos')
    ) AS p(code, name, description)
  LOOP
    INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
    VALUES (gen_random_uuid(), v_permiso.code, v_permiso.name, v_permiso.description, v_module_id, true)
    ON CONFLICT (code) DO UPDATE
      SET name = EXCLUDED.name,
          description = EXCLUDED.description,
          id_module = EXCLUDED.id_module,
          is_active = true;

    INSERT INTO auth.role_permissions (id_rol, id_permission, is_active, created_at, updated_at)
    SELECT r.id, p.id_permission, true, NOW(), NOW()
      FROM auth.role r
      JOIN auth.permission p ON p.code = v_permiso.code
     WHERE UPPER(r.code) = 'SUPER_ADMIN'
       AND NOT EXISTS (
         SELECT 1
           FROM auth.role_permissions rp
          WHERE rp.id_rol = r.id
            AND rp.id_permission = p.id_permission
       );
  END LOOP;
END $$;

CREATE TABLE IF NOT EXISTS auth.centro_ayuda_seccion (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  descripcion VARCHAR(300),
  icono VARCHAR(40) NOT NULL DEFAULT 'BookOpen',
  tipo VARCHAR(20) NOT NULL DEFAULT 'general'
    CHECK (tipo IN ('general', 'manual', 'videos', 'atajos')),
  orden INTEGER NOT NULL DEFAULT 0,
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_por VARCHAR(150),
  actualizado_por VARCHAR(150),
  eliminado_por VARCHAR(150),
  creado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  eliminado_en TIMESTAMP WITH TIME ZONE
);

-- Dos secciones vigentes no pueden llamarse igual; las de la papelera no cuentan.
CREATE UNIQUE INDEX IF NOT EXISTS uq_centro_ayuda_seccion_nombre
  ON auth.centro_ayuda_seccion (LOWER(nombre))
  WHERE eliminado_en IS NULL;

CREATE TABLE IF NOT EXISTS auth.centro_ayuda_recurso (
  id SERIAL PRIMARY KEY,
  id_seccion INTEGER NOT NULL REFERENCES auth.centro_ayuda_seccion (id),
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
  eliminado_por VARCHAR(150),
  creado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  eliminado_en TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_centro_ayuda_recurso_seccion
  ON auth.centro_ayuda_recurso (id_seccion, activo, orden)
  WHERE eliminado_en IS NULL;

-- Las seis opciones que ya mostraba el Centro de Ayuda, ahora como datos.
INSERT INTO auth.centro_ayuda_seccion (nombre, descripcion, icono, tipo, orden, creado_por)
SELECT v.nombre, v.descripcion, v.icono, v.tipo, v.orden, 'migracion-675'
  FROM (VALUES
    ('Documentación completa', 'Guías detalladas de todos los módulos del sistema', 'Book', 'general', 1),
    ('Video tutoriales', 'Aprende con videos paso a paso', 'Video', 'videos', 2),
    ('Atajos de teclado', 'Trabaja más rápido con estos atajos', 'Keyboard', 'atajos', 3),
    ('Manual de usuario', 'Descarga el manual completo en PDF', 'FileText', 'manual', 4),
    ('Cursos de capacitación', 'Programas de entrenamiento para administradores', 'GraduationCap', 'general', 5),
    ('Mejores prácticas', 'Consejos y recomendaciones de uso', 'Lightbulb', 'general', 6)
  ) AS v(nombre, descripcion, icono, tipo, orden)
 WHERE NOT EXISTS (SELECT 1 FROM auth.centro_ayuda_seccion);

-- Atajos probados en el backoffice (SidebarPremium y el propio Centro de Ayuda).
-- Ctrl + K no se incluye: el buscador global (GlobalSearch) no está montado en
-- la barra superior y el atajo no hace nada.
INSERT INTO auth.centro_ayuda_recurso (id_seccion, titulo, descripcion, contenido, orden, creado_por)
SELECT s.id, v.titulo, v.descripcion, v.contenido, v.orden, 'migracion-675'
  FROM (VALUES
    ('Contraer o expandir el menú lateral', 'Muestra u oculta los nombres del menú de módulos. En Mac: ⌘ + B', 'Ctrl + B', 1),
    ('Cerrar el Centro de Ayuda', 'Cierra el panel de ayuda y las ventanas que se abren desde él, como el visor de documentos', 'Esc', 2)
  ) AS v(titulo, descripcion, contenido, orden)
  JOIN auth.centro_ayuda_seccion s ON s.tipo = 'atajos' AND s.creado_por = 'migracion-675'
 WHERE NOT EXISTS (
   SELECT 1 FROM auth.centro_ayuda_recurso r
    WHERE r.id_seccion = s.id AND r.titulo = v.titulo
 );
