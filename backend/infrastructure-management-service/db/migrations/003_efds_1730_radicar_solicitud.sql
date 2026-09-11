-- ============================================================================
-- Migration: EFDS-1730 Radicar solicitud de mantenimiento UMI
-- Description: Amplia el modelo de solicitud_mantenimiento para cubrir RF-INF-001:
--              area solicitante, piso, salon, ubicacion detalle, tipo atencion,
--              categoria, fecha radicacion, usuario autenticado solicitante.
--              Cambia el estado inicial de PENDIENTE a RECIBIDA.
--              Agrega sedes alternas Teusaquillo y Rosales (alcance UMI).
--              Agrega permisos granulares: create, read_own, read_all de solicitud.
-- ============================================================================

-- 1. Agregar columnas nuevas a solicitud_mantenimiento
ALTER TABLE "infrastructure-management".solicitud_mantenimiento
    ADD COLUMN IF NOT EXISTS id_area_solicitante UUID;

COMMENT ON COLUMN "infrastructure-management".solicitud_mantenimiento.id_area_solicitante IS 'FK (opcional por ahora) a la dependencia/area solicitante en auth.dependencias';

ALTER TABLE "infrastructure-management".solicitud_mantenimiento
    ADD COLUMN IF NOT EXISTS nombre_area_solicitante VARCHAR(150);

COMMENT ON COLUMN "infrastructure-management".solicitud_mantenimiento.nombre_area_solicitante IS 'Nombre descriptivo del area solicitante, redundante para auditoria';

ALTER TABLE "infrastructure-management".solicitud_mantenimiento
    ADD COLUMN IF NOT EXISTS piso VARCHAR(20);

COMMENT ON COLUMN "infrastructure-management".solicitud_mantenimiento.piso IS 'Piso o nivel de la ubicacion de la solicitud';

ALTER TABLE "infrastructure-management".solicitud_mantenimiento
    ADD COLUMN IF NOT EXISTS salon VARCHAR(100);

COMMENT ON COLUMN "infrastructure-management".solicitud_mantenimiento.salon IS 'Salon, oficina o ubicacion especifica';

ALTER TABLE "infrastructure-management".solicitud_mantenimiento
    ADD COLUMN IF NOT EXISTS ubicacion_detalle TEXT;

COMMENT ON COLUMN "infrastructure-management".solicitud_mantenimiento.ubicacion_detalle IS 'Detalle adicional de ubicacion cuando piso/salon no son suficientes';

ALTER TABLE "infrastructure-management".solicitud_mantenimiento
    ADD COLUMN IF NOT EXISTS tipo_atencion VARCHAR(20) NOT NULL DEFAULT 'FISICA';

COMMENT ON COLUMN "infrastructure-management".solicitud_mantenimiento.tipo_atencion IS 'FISICA (UMI) o TECNOLOGICA (TI). Para EFDS-1730 siempre FISICA, en EFDS-1731 se habilita la eleccion';

ALTER TABLE "infrastructure-management".solicitud_mantenimiento
    ADD COLUMN IF NOT EXISTS id_categoria UUID;

COMMENT ON COLUMN "infrastructure-management".solicitud_mantenimiento.id_categoria IS 'FK futura a umi_categoria_servicio (EFDS-1732). Por ahora nullable';

ALTER TABLE "infrastructure-management".solicitud_mantenimiento
    ADD COLUMN IF NOT EXISTS fecha_radicacion TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN "infrastructure-management".solicitud_mantenimiento.fecha_radicacion IS 'Fecha y hora oficial de radicacion generada en backend';

ALTER TABLE "infrastructure-management".solicitud_mantenimiento
    ADD COLUMN IF NOT EXISTS usuario_solicitante_id UUID;

COMMENT ON COLUMN "infrastructure-management".solicitud_mantenimiento.usuario_solicitante_id IS 'Identificador del usuario autenticado que radico la solicitud (auth.user.id_user)';

ALTER TABLE "infrastructure-management".solicitud_mantenimiento
    ADD COLUMN IF NOT EXISTS usuario_solicitante_email VARCHAR(150);

COMMENT ON COLUMN "infrastructure-management".solicitud_mantenimiento.usuario_solicitante_email IS 'Email del usuario autenticado que radico, redundante para trazabilidad';

-- 2. Ajustar valor por defecto del estado: PENDIENTE -> RECIBIDA
ALTER TABLE "infrastructure-management".solicitud_mantenimiento
    ALTER COLUMN estado SET DEFAULT 'RECIBIDA';

COMMENT ON COLUMN "infrastructure-management".solicitud_mantenimiento.estado IS 'Estado de la solicitud: RECIBIDA, EN_ANALISIS, RECHAZADA, ASIGNADA, EN_VALORACION, EN_ESPERA_DE_INSUMOS, EN_EJECUCION, COMPLETADA, PENDIENTE_CONFORMIDAD, CERRADA_CONFIRMADA, CERRADA_SIN_RESPUESTA, REABIERTA';

-- Migrar registros existentes con estado PENDIENTE al nuevo estado inicial
UPDATE "infrastructure-management".solicitud_mantenimiento
SET estado = 'RECIBIDA'
WHERE estado = 'PENDIENTE';

-- Migrar fecha_radicacion con created_at para los registros existentes
UPDATE "infrastructure-management".solicitud_mantenimiento
SET fecha_radicacion = created_at
WHERE fecha_radicacion IS NULL;

-- 3. Crear indices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_solicitud_mantenimiento_usuario_solicitante
    ON "infrastructure-management".solicitud_mantenimiento (usuario_solicitante_id);

CREATE INDEX IF NOT EXISTS idx_solicitud_mantenimiento_estado
    ON "infrastructure-management".solicitud_mantenimiento (estado);

CREATE INDEX IF NOT EXISTS idx_solicitud_mantenimiento_id_sede
    ON "infrastructure-management".solicitud_mantenimiento (id_sede);

CREATE INDEX IF NOT EXISTS idx_solicitud_mantenimiento_fecha_radicacion
    ON "infrastructure-management".solicitud_mantenimiento (fecha_radicacion DESC);

CREATE INDEX IF NOT EXISTS idx_solicitud_mantenimiento_tipo_atencion
    ON "infrastructure-management".solicitud_mantenimiento (tipo_atencion);

-- 4. Insertar sedes alternas en alcance UMI (Teusaquillo y Rosales)
INSERT INTO "infrastructure-management".sede (codigo, nombre, tipo, departamento, municipio, direccion, email_contacto)
VALUES
    ('SEDE-TEUSAQUILLO', 'Sede Alterna Teusaquillo', 'SEDE_ALTERNA', 'Bogotá D.C.', 'Bogotá', 'Carrera 13 # 32 - 59', 'sede.teusaquillo@esap.edu.co'),
    ('SEDE-ROSALES', 'Sede Alterna Rosales', 'SEDE_ALTERNA', 'Bogotá D.C.', 'Bogotá', 'Carrera 7 # 106 - 31', 'sede.rosales@esap.edu.co')
ON CONFLICT (codigo) DO NOTHING;

-- 5. Agregar permisos granulares de solicitud de mantenimiento y asignarlos a roles
DO $$
DECLARE
    v_module_id UUID;
    v_admin_role_id UUID;
    v_perm_solicitud_create UUID := gen_random_uuid();
    v_perm_solicitud_read_own UUID := gen_random_uuid();
    v_perm_solicitud_read_all UUID := gen_random_uuid();
BEGIN
    SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'gestion-infraestructura';

    IF v_module_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM auth.permission WHERE code = 'infraestructura.solicitud.create') THEN
            INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
            VALUES (v_perm_solicitud_create, 'infraestructura.solicitud.create', 'Crear solicitud de mantenimiento', 'Permite radicar nuevas solicitudes de mantenimiento UMI', v_module_id, true, NOW(), NOW());
        END IF;

        IF NOT EXISTS (SELECT 1 FROM auth.permission WHERE code = 'infraestructura.solicitud.read_own') THEN
            INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
            VALUES (v_perm_solicitud_read_own, 'infraestructura.solicitud.read_own', 'Ver mis solicitudes', 'Permite consultar las solicitudes radicadas por el propio usuario', v_module_id, true, NOW(), NOW());
        END IF;

        IF NOT EXISTS (SELECT 1 FROM auth.permission WHERE code = 'infraestructura.solicitud.read_all') THEN
            INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active, created_at, updated_at)
            VALUES (v_perm_solicitud_read_all, 'infraestructura.solicitud.read_all', 'Ver todas las solicitudes', 'Permite consultar la bandeja general de solicitudes para UMI/Administrador', v_module_id, true, NOW(), NOW());
        END IF;

        FOR v_admin_role_id IN (
            SELECT id FROM auth.role
            WHERE code IN ('SUPER_ADMIN', 'ADMIN', 'ADMINISTRADOR', 'DIRECTOR_INFRAESTRUCTURA', 'ADMIN_SISTEMA', 'GESTOR_UMI', 'TECNICO_UMI')
               OR name ILIKE '%admin%'
               OR name ILIKE '%infraestructura%'
        ) LOOP
            INSERT INTO auth.role_permissions (id_rol, id_permission)
            SELECT v_admin_role_id, p.id_permission
            FROM auth.permission p
            WHERE p.code IN ('infraestructura.solicitud.create', 'infraestructura.solicitud.read_own', 'infraestructura.solicitud.read_all')
            ON CONFLICT DO NOTHING;
        END LOOP;

        -- Asignar read_own y create a todos los usuarios autenticados de areas solicitantes
        -- (tambien quedan en SUPER_ADMIN)
        RAISE NOTICE 'Permisos granulares de solicitud de mantenimiento registrados y asignados';
    END IF;
END $$;
