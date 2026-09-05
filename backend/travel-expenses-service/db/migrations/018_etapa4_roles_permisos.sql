-- ============================================================================
-- Migration: 018_etapa4_roles_permisos.sql
-- Created: 2026-09-04
-- Description: RF-REC-001 (Etapa 4 — Revisar solicitud y definir prioridad).
--              Crea rol SECRETARIO y permisos específicos del módulo.
--              Idempotente: usa CREATE TABLE IF NOT EXISTS y
--              INSERT ... ON CONFLICT DO NOTHING.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS auth;

-- ============================================================================
-- 1. Estructura de roles y permisos del módulo de seguridad (auth)
-- ============================================================================

CREATE TABLE IF NOT EXISTS auth.roles (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre          VARCHAR(100) NOT NULL UNIQUE,
    codigo          VARCHAR(50)  NOT NULL UNIQUE,
    descripcion     TEXT,
    activo          BOOLEAN      NOT NULL DEFAULT TRUE,
    creado_en       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auth.permisos (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo          VARCHAR(100) NOT NULL UNIQUE,
    nombre          VARCHAR(150) NOT NULL,
    modulo          VARCHAR(100),
    descripcion     TEXT,
    activo          BOOLEAN      NOT NULL DEFAULT TRUE,
    creado_en       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auth.rol_permisos (
    rol_id      UUID NOT NULL REFERENCES auth.roles(id) ON DELETE CASCADE,
    permiso_id  UUID NOT NULL REFERENCES auth.permisos(id) ON DELETE CASCADE,
    creado_en   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (rol_id, permiso_id)
);

CREATE INDEX IF NOT EXISTS idx_rol_permisos_rol
    ON auth.rol_permisos (rol_id);

CREATE INDEX IF NOT EXISTS idx_rol_permisos_permiso
    ON auth.rol_permisos (permiso_id);

-- ============================================================================
-- 2. Insertar permisos específicos de la Etapa 4 (RF-REC-001)
-- ============================================================================

INSERT INTO auth.permisos (codigo, nombre, modulo, descripcion)
VALUES
    ('travel_expenses:read_inbox',     'Ver bandeja de solicitudes entrantes',        'travel_expenses', 'Acceso a la bandeja de entrada de viáticos para revisión de solicitudes en estado SOLICITADA.')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO auth.permisos (codigo, nombre, modulo, descripcion)
VALUES
    ('travel_expenses:set_priority',   'Modificar prioridad de solicitudes',          'travel_expenses', 'Permite actualizar la prioridad (Alta/Media/Baja) de una solicitud de comisión.')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO auth.permisos (codigo, nombre, modulo, descripcion)
VALUES
    ('travel_expenses:return_request', 'Devolver solicitud con motivo',               'travel_expenses', 'Permite devolver una solicitud al estado DEVUELTA con un motivo obligatorio.')
ON CONFLICT (codigo) DO NOTHING;

-- Comodín para Super Admin (elude cualquier control de SoD o inmutabilidad).
INSERT INTO auth.permisos (codigo, nombre, modulo, descripcion)
VALUES
    ('travel_expenses:*', 'Comodín total de Viáticos y Comisiones', 'travel_expenses', 'Otorga control absoluto sobre el módulo de viáticos; bypassea SoD e inmutabilidad por diseño.')
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================================
-- 3. Crear rol SECRETARIO y asignar permisos
-- ============================================================================

INSERT INTO auth.roles (codigo, nombre, descripcion)
VALUES ('SECRETARIO', 'Secretario/a', 'Rol encargado de revisar la bandeja de solicitudes entrantes, definir prioridad y devolver expedientes con observaciones.')
ON CONFLICT (codigo) DO NOTHING;

-- Asignar permisos específicos a SECRETARIO.
INSERT INTO auth.rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM auth.roles r, auth.permisos p
WHERE r.codigo = 'SECRETARIO' AND p.codigo = 'travel_expenses:read_inbox'
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

INSERT INTO auth.rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM auth.roles r, auth.permisos p
WHERE r.codigo = 'SECRETARIO' AND p.codigo = 'travel_expenses:set_priority'
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

INSERT INTO auth.rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM auth.roles r, auth.permisos p
WHERE r.codigo = 'SECRETARIO' AND p.codigo = 'travel_expenses:return_request'
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- ============================================================================
-- 4. Asegurar que SUPER_ADMIN tenga el comodín travel_expenses:*
-- ============================================================================

INSERT INTO auth.rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM auth.roles r, auth.permisos p
WHERE UPPER(r.codigo) IN ('SUPER_ADMIN', 'ADMIN', 'ADMINISTRATIVO', 'SUPER_ADMINISTRADOR')
  AND p.codigo = 'travel_expenses:*'
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- ============================================================================
-- 5. Comentarios de documentación
-- ============================================================================

COMMENT ON TABLE auth.roles IS 'Catálogo de roles de la aplicación ESAP.';
COMMENT ON TABLE auth.permisos IS 'Catálogo de permisos granulares del sistema.';
COMMENT ON TABLE auth.rol_permisos IS 'Relación muchos a muchos entre roles y permisos.';

RESET search_path;
