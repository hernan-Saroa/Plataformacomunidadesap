-- Migration 337: Crear tabla legal_management.solicitudes_insumos
--
-- Contexto: la entidad TypeORM `SolicitudInsumo`
-- (backend/legal-management-service/src/entities/solicitud-insumo.entity.ts) está
-- registrada en database.config.ts y la usa requerimientos-oc.service.ts, pero la
-- tabla NO aparece en el dump actual del schema. Esto provocaría errores de runtime
-- en el flujo de solicitudes de insumos de Órganos de Control.
--
-- Esta migración crea la tabla alineada 1:1 con la entidad. Es idempotente
-- (CREATE ... IF NOT EXISTS): si la tabla ya existe en algún ambiente, no hace nada.
--
-- NO EJECUTAR AUTOMÁTICAMENTE. Aplicar manualmente.

BEGIN;

CREATE TABLE IF NOT EXISTS legal_management.solicitudes_insumos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    requerimiento_id uuid NOT NULL,
    area_destino character varying(150) NOT NULL,
    funcionario_destino character varying(200),
    email_destino character varying(150),
    descripcion_solicitud text NOT NULL,
    documentos_solicitados text,
    fecha_solicitud timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fecha_vencimiento_interna timestamp without time zone NOT NULL,
    fecha_respuesta timestamp without time zone,
    estado character varying(25) DEFAULT 'PENDIENTE'::character varying NOT NULL,
    documentos_entregados_url text,
    comentario_respuesta text,
    solicitado_por character varying(150),
    respondido_por character varying(150),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT solicitudes_insumos_pkey PRIMARY KEY (id)
);

-- FK al requerimiento de órgano de control (borra en cascada con el requerimiento)
ALTER TABLE legal_management.solicitudes_insumos
    DROP CONSTRAINT IF EXISTS solicitudes_insumos_requerimiento_id_fkey;
ALTER TABLE legal_management.solicitudes_insumos
    ADD CONSTRAINT solicitudes_insumos_requerimiento_id_fkey
    FOREIGN KEY (requerimiento_id)
    REFERENCES legal_management.requerimientos_oc(id) ON DELETE CASCADE;

-- Índice por requerimiento (consistente con el resto de tablas satélite de OC)
CREATE INDEX IF NOT EXISTS idx_solicitudes_insumos_req
    ON legal_management.solicitudes_insumos USING btree (requerimiento_id);

COMMIT;
