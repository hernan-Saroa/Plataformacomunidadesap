-- 328_seed_tableros_kanban_control_interno.sql
-- Sincroniza los datos base del seed de:
-- backend/internal-institutional-control-service/src/esap/tableros-kanban/seed-tableros-kanban.ts

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS control_interno;

CREATE TABLE IF NOT EXISTS control_interno.tablero_kanban (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('auditorias', 'planes_mejoramiento')),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    configuracion_visual JSONB NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS control_interno.etapa_kanban (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tablero_kanban_id UUID NOT NULL REFERENCES control_interno.tablero_kanban(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    orden INTEGER NOT NULL,
    color VARCHAR(7) NOT NULL,
    tiempo_sla INTEGER NOT NULL DEFAULT 0,
    limite_wip INTEGER,
    visible BOOLEAN NOT NULL DEFAULT TRUE,
    notificar_vencimiento BOOLEAN NOT NULL DEFAULT FALSE,
    dias_anticipacion_alerta INTEGER NOT NULL DEFAULT 0,
    estado VARCHAR(20) NOT NULL DEFAULT 'intermedia' CHECK (estado IN ('inicial', 'intermedia', 'final')),
    permitir_retroceso BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE control_interno.tablero_kanban
    ADD COLUMN IF NOT EXISTS configuracion_visual JSONB NULL;

CREATE INDEX IF NOT EXISTS idx_tablero_kanban_tipo
    ON control_interno.tablero_kanban(tipo);

CREATE INDEX IF NOT EXISTS idx_tablero_kanban_activo
    ON control_interno.tablero_kanban(activo);

CREATE INDEX IF NOT EXISTS idx_tablero_kanban_deleted_at
    ON control_interno.tablero_kanban(deleted_at)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_etapa_kanban_tablero_orden
    ON control_interno.etapa_kanban(tablero_kanban_id, orden);

CREATE INDEX IF NOT EXISTS idx_etapa_kanban_deleted_at
    ON control_interno.etapa_kanban(deleted_at)
    WHERE deleted_at IS NULL;

ALTER TABLE IF EXISTS control_interno.auditoria
    DROP CONSTRAINT IF EXISTS auditoria_estado_kanban_check;

DO $$
DECLARE
    v_tablero_auditorias_id UUID;
    v_tablero_pm_id UUID;
    v_config_visual JSONB := '{
        "mostrarContadores": true,
        "mostrarTiempos": true,
        "alertasSLA": true,
        "alertasWIP": true,
        "transicionesAutomaticas": true,
        "compactarVista": false,
        "mostrarAvatar": true,
        "permitirDragDrop": true
    }'::jsonb;
BEGIN
    SELECT id
      INTO v_tablero_auditorias_id
      FROM control_interno.tablero_kanban
     WHERE tipo = 'auditorias'
       AND activo IS TRUE
       AND deleted_at IS NULL
     ORDER BY created_at NULLS LAST, id
     LIMIT 1;

    IF v_tablero_auditorias_id IS NULL THEN
        INSERT INTO control_interno.tablero_kanban (
            id,
            tipo,
            nombre,
            descripcion,
            activo,
            configuracion_visual,
            created_at,
            updated_at
        )
        VALUES (
            gen_random_uuid(),
            'auditorias',
            'Tablero de Auditorías OCI',
            'Tablero principal para la gestión y seguimiento de auditorías institucionales',
            true,
            v_config_visual,
            NOW(),
            NOW()
        )
        RETURNING id INTO v_tablero_auditorias_id;
    ELSE
        UPDATE control_interno.tablero_kanban
           SET configuracion_visual = v_config_visual,
               updated_at = NOW()
         WHERE id = v_tablero_auditorias_id
           AND configuracion_visual IS NULL;
    END IF;

    INSERT INTO control_interno.etapa_kanban (
        id,
        tablero_kanban_id,
        nombre,
        descripcion,
        orden,
        color,
        tiempo_sla,
        limite_wip,
        visible,
        notificar_vencimiento,
        dias_anticipacion_alerta,
        estado,
        permitir_retroceso,
        created_at,
        updated_at
    )
    SELECT
        gen_random_uuid(),
        v_tablero_auditorias_id,
        seed.nombre,
        seed.descripcion,
        seed.orden,
        seed.color,
        seed.tiempo_sla,
        seed.limite_wip,
        true,
        seed.notificar_vencimiento,
        seed.dias_anticipacion_alerta,
        seed.estado,
        false,
        NOW(),
        NOW()
    FROM (
        VALUES
            ('Programa Anual', 'Auditoría programada en plan anual', 1, '#3B82F6', 15, 999, true, 3, 'inicial'),
            ('Planeación', 'Definición de objetivos y alcance', 2, '#8B5CF6', 15, 5, true, 3, 'intermedia'),
            ('Ejecución', 'Recopilación de evidencias y pruebas', 3, '#10B981', 30, 5, true, 5, 'intermedia'),
            ('Comunicación', 'Elaboración y envío de informes', 4, '#F59E0B', 10, 999, true, 2, 'intermedia'),
            ('Finalizada', 'Auditoría completada (requiere documento de cierre)', 5, '#6B7280', 0, 999, false, 0, 'final')
    ) AS seed(nombre, descripcion, orden, color, tiempo_sla, limite_wip, notificar_vencimiento, dias_anticipacion_alerta, estado)
    WHERE NOT EXISTS (
        SELECT 1
          FROM control_interno.etapa_kanban existente
         WHERE existente.tablero_kanban_id = v_tablero_auditorias_id
           AND existente.nombre = seed.nombre
           AND existente.deleted_at IS NULL
    );

    UPDATE control_interno.etapa_kanban
       SET visible = false,
           updated_at = NOW()
     WHERE tablero_kanban_id = v_tablero_auditorias_id
       AND deleted_at IS NULL
       AND nombre NOT IN (
           'Programa Anual',
           'Planeación',
           'Ejecución',
           'Comunicación',
           'Finalizada'
       );

    SELECT id
      INTO v_tablero_pm_id
      FROM control_interno.tablero_kanban
     WHERE tipo = 'planes_mejoramiento'
       AND activo IS TRUE
       AND deleted_at IS NULL
     ORDER BY created_at NULLS LAST, id
     LIMIT 1;

    IF v_tablero_pm_id IS NULL THEN
        INSERT INTO control_interno.tablero_kanban (
            id,
            tipo,
            nombre,
            descripcion,
            activo,
            created_at,
            updated_at
        )
        VALUES (
            gen_random_uuid(),
            'planes_mejoramiento',
            'Tablero de Planes de Mejoramiento',
            'Seguimiento a acciones correctivas y de mejora',
            true,
            NOW(),
            NOW()
        )
        RETURNING id INTO v_tablero_pm_id;
    END IF;

    INSERT INTO control_interno.etapa_kanban (
        id,
        tablero_kanban_id,
        nombre,
        descripcion,
        orden,
        color,
        tiempo_sla,
        limite_wip,
        visible,
        notificar_vencimiento,
        dias_anticipacion_alerta,
        estado,
        permitir_retroceso,
        created_at,
        updated_at
    )
    SELECT
        gen_random_uuid(),
        v_tablero_pm_id,
        seed.nombre,
        seed.descripcion,
        seed.orden,
        seed.color,
        seed.tiempo_sla,
        seed.limite_wip,
        true,
        seed.notificar_vencimiento,
        seed.dias_anticipacion_alerta,
        seed.estado,
        false,
        NOW(),
        NOW()
    FROM (
        VALUES
            ('Suscripción y Formulación', 'Definición del plan de mejoramiento', 1, '#3B82F6', 10, 999, true, 2, 'inicial'),
            ('Ejecución de Acciones', 'Implementación de acciones correctivas', 2, '#F59E0B', 60, 999, true, 10, 'intermedia'),
            ('Verificación', 'Verificación de cumplimiento por parte de OCI', 3, '#8B5CF6', 15, 999, true, 3, 'intermedia'),
            ('Cerrado', 'Plan completado exitosamente', 4, '#10B981', 0, 999, false, 0, 'final')
    ) AS seed(nombre, descripcion, orden, color, tiempo_sla, limite_wip, notificar_vencimiento, dias_anticipacion_alerta, estado)
    WHERE NOT EXISTS (
        SELECT 1
          FROM control_interno.etapa_kanban existente
         WHERE existente.tablero_kanban_id = v_tablero_pm_id
           AND existente.nombre = seed.nombre
           AND existente.deleted_at IS NULL
    );
END $$;

COMMIT;
