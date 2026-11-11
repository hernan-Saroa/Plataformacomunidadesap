-- RUND-002: configuración de carpetas por tipo de vinculación + permiso propio.
-- Aditiva e idempotente. La ausencia de fila significa "carpeta activa", así que no cambia
-- el comportamiento de ningún ambiente hasta que alguien desactive una carpeta desde Configuración.
-- Prerrequisitos: 423 (permisos RUND, módulo gestion-profesoral) y 333 (esquema academic_work_plan).
BEGIN;

CREATE TABLE IF NOT EXISTS academic_work_plan."RundCarpetaConfiguracion" (
  tipo_vinculacion TEXT NOT NULL,
  bloque TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  actualizado_por TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tipo_vinculacion, bloque)
);

-- Permiso único para ver y editar la configuración de carpetas.
-- No concede cargar, validar ni aprobar. La asignación a roles se hace desde Roles y Permisos.
INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
SELECT gen_random_uuid(), 'banco-docentes.rund.configure', 'RUND · Configurar carpetas',
  'Habilita la pestaña Configuración del Banco de Docentes y permite definir qué carpetas del expediente aplican a cada tipo de vinculación. No concede cargar, validar ni aprobar.',
  m.id_module, true
FROM auth.module m WHERE m.code = 'gestion-profesoral'
ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name, description = EXCLUDED.description, id_module = EXCLUDED.id_module, is_active = true;

COMMIT;
