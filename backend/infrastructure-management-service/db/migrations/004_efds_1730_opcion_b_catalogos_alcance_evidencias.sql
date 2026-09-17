-- ============================================================
-- MIGRACIÓN 004 — EFDS-1730 (HU RADICAR SOLICITUD) + OPCIÓN B
-- Catálogos parametrizables + columna alcance UMI + evidencias 1:N
-- Mantiene idempotencia (IF NOT EXISTS / ON CONFLICT DO NOTHING)
-- ============================================================

SET search_path TO "infrastructure-management", public;

-- ------------------------------------------------------------
-- 1. Tabla catálogo genérica para TIPOS_MANTENIMIENTO / PRIORIDAD / TIPO_ATENCION / ESTADO_SOLICITUD
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS catalogo_item (
    id_catalogo       SERIAL CONSTRAINT pk_catalogo_item PRIMARY KEY,
    catalogo          VARCHAR(50) NOT NULL,
    codigo            VARCHAR(40) NOT NULL,
    nombre            VARCHAR(120) NOT NULL,
    descripcion       TEXT,
    orden             INT DEFAULT 0,
    is_activo         BOOLEAN DEFAULT TRUE,
    metadata          JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT uq_catalogo_item_codigo UNIQUE (catalogo, codigo)
);
COMMENT ON TABLE  catalogo_item IS 'Catálogo genérico para listas parametrizables de infraestructura (tipos, prioridades, estados)';
COMMENT ON COLUMN catalogo_item.catalogo    IS 'Nombre lógico del catálogo: TIPO_MANTENIMIENTO, PRIORIDAD, TIPO_ATENCION, ESTADO_SOLICITUD';
COMMENT ON COLUMN catalogo_item.codigo      IS 'Valor stable que usa el frontend/backend (PK lógica visible)';
COMMENT ON COLUMN catalogo_item.metadata    IS 'JSON con estilo visual, íconos, agrupadores, SLA, etc.';

CREATE INDEX IF NOT EXISTS idx_catalogo_item_catalogo_activo ON catalogo_item (catalogo, is_activo);

-- ------------------------------------------------------------
-- 2. Inserts catálogo: TIPO_MANTENIMIENTO (4)
-- ------------------------------------------------------------
INSERT INTO catalogo_item (catalogo, codigo, nombre, orden, metadata) VALUES
('TIPO_MANTENIMIENTO', 'PREVENTIVO', 'Preventivo', 1, '{"icon": "shield-check", "descripcion_corta": "Planificado antes de falla"}'::jsonb),
('TIPO_MANTENIMIENTO', 'CORRECTIVO', 'Correctivo', 2, '{"icon": "wrench",       "descripcion_corta": "Reparar después de falla"}'::jsonb),
('TIPO_MANTENIMIENTO', 'LOCATIVO',   'Locativo',   3, '{"icon": "home",         "descripcion_corta": "Instalaciones locativas"}'::jsonb),
('TIPO_MANTENIMIENTO', 'URGENTE',    'Urgente',    4, '{"icon": "siren",        "descripcion_corta": "Atención inmediata"}'::jsonb)
ON CONFLICT (catalogo, codigo) DO NOTHING;

-- ------------------------------------------------------------
-- 3. Inserts catálogo: PRIORIDAD (4) — con colores para badge
-- ------------------------------------------------------------
INSERT INTO catalogo_item (catalogo, codigo, nombre, orden, metadata) VALUES
('PRIORIDAD', 'BAJA',     'Baja',     1, '{"color": "bg-slate-100 text-slate-700 border border-slate-200", "sla_horas": 120}'::jsonb),
('PRIORIDAD', 'MEDIA',    'Media',    2, '{"color": "bg-emerald-100 text-emerald-700 border border-emerald-200", "sla_horas": 72}'::jsonb),
('PRIORIDAD', 'ALTA',     'Alta',     3, '{"color": "bg-amber-100 text-amber-800 border border-amber-200", "sla_horas": 24}'::jsonb),
('PRIORIDAD', 'URGENTE',  'Urgente',  4, '{"color": "bg-rose-100 text-rose-800 border border-rose-200", "sla_horas": 4}'::jsonb)
ON CONFLICT (catalogo, codigo) DO NOTHING;

-- ------------------------------------------------------------
-- 4. Inserts catálogo: TIPO_ATENCION (3) — actual solo FÍSICA, abrimos espacio a la HU de tecnológica
-- ------------------------------------------------------------
INSERT INTO catalogo_item (catalogo, codigo, nombre, orden, metadata) VALUES
('TIPO_ATENCION', 'FISICA',       'Atención física en sede',          1, '{"icon": "map-pin",   "soportado_umi": true}'::jsonb),
('TIPO_ATENCION', 'TECNOLOGICA',  'Soporte TIC / tecnológico',        2, '{"icon": "monitor",   "soportado_umi": false}'::jsonb),
('TIPO_ATENCION', 'MIXTA',        'Atención mixta física + TIC',      3, '{"icon": "git-branch","soportado_umi": false}'::jsonb)
ON CONFLICT (catalogo, codigo) DO NOTHING;

-- ------------------------------------------------------------
-- 5. Inserts catálogo: ESTADO_SOLICITUD (12) — máquina de estados completa documentada
-- ------------------------------------------------------------
INSERT INTO catalogo_item (catalogo, codigo, nombre, orden, metadata) VALUES
('ESTADO_SOLICITUD', 'RECIBIDA',              'Recibida',              1,  '{"color": "bg-sky-100 text-sky-800 border border-sky-200",                    "icon": "inbox",       "grupo": "INICIALES"}'::jsonb),
('ESTADO_SOLICITUD', 'EN_ANALISIS',           'En análisis',           2,  '{"color": "bg-indigo-100 text-indigo-800 border border-indigo-200",            "icon": "search",      "grupo": "INICIALES"}'::jsonb),
('ESTADO_SOLICITUD', 'PENDIENTE_COTIZACION',  'Pendiente cotización',  3,  '{"color": "bg-violet-100 text-violet-800 border border-violet-200",            "icon": "file-search", "grupo": "GESTION_INTERNA"}'::jsonb),
('ESTADO_SOLICITUD', 'PENDIENTE_APROBACION',  'Pendiente aprobación',  4,  '{"color": "bg-violet-200 text-violet-900 border border-violet-300",            "icon": "check-circle-2","grupo": "GESTION_INTERNA"}'::jsonb),
('ESTADO_SOLICITUD', 'EN_VALORACION',         'En valoración',         5,  '{"color": "bg-amber-100 text-amber-800 border border-amber-200",               "icon": "clipboard-list","grupo":"GESTION_INTERNA"}'::jsonb),
('ESTADO_SOLICITUD', 'EN_PROCESO',            'En proceso',            6,  '{"color": "bg-amber-200 text-amber-900 border border-amber-300",               "icon": "loader-2",    "grupo": "EJECUCION"}'::jsonb),
('ESTADO_SOLICITUD', 'EN_EJECUCION',          'En ejecución',          7,  '{"color": "bg-orange-100 text-orange-800 border border-orange-200",            "icon": "hammer",      "grupo": "EJECUCION"}'::jsonb),
('ESTADO_SOLICITUD', 'PENDIENTE_RECURSO',     'Pendiente de recursos', 8,  '{"color": "bg-yellow-100 text-yellow-900 border border-yellow-300",            "icon": "package",     "grupo": "EJECUCION"}'::jsonb),
('ESTADO_SOLICITUD', 'COMPLETADA',            'Completada',            9,  '{"color": "bg-emerald-100 text-emerald-800 border border-emerald-200",         "icon": "check-circle","grupo": "FINALES"}'::jsonb),
('ESTADO_SOLICITUD', 'CERRADA',               'Cerrada',              10,  '{"color": "bg-emerald-200 text-emerald-900 border border-emerald-300",         "icon": "archive",     "grupo": "FINALES"}'::jsonb),
('ESTADO_SOLICITUD', 'CERRADA_SIN_ATENCION',  'Cerrada sin atención', 11,  '{"color": "bg-slate-300 text-slate-800 border border-slate-400",               "icon": "ban",         "grupo": "FINALES"}'::jsonb),
('ESTADO_SOLICITUD', 'RECHAZADA',             'Rechazada',            12,  '{"color": "bg-rose-100 text-rose-800 border border-rose-200",                  "icon": "x-circle",    "grupo": "FINALES"}'::jsonb)
ON CONFLICT (catalogo, codigo) DO NOTHING;

-- ------------------------------------------------------------
-- 6. Columna alcance_umi en sede (reemplaza la comparación string quemada del frontend)
-- ------------------------------------------------------------
ALTER TABLE sede ADD COLUMN IF NOT EXISTS alcance_umi BOOLEAN DEFAULT FALSE;
COMMENT ON COLUMN sede.alcance_umi IS 'TRUE si la sede pertenece al alcance directo de la UMI (central o alternas; territoriales por ahora NO)';

-- Marcar sedes del alcance UMI
UPDATE sede SET alcance_umi = TRUE  WHERE tipo IN ('SEDE_CENTRAL', 'SEDE_ALTERNA') AND alcance_umi IS NOT TRUE;
UPDATE sede SET alcance_umi = FALSE WHERE tipo = 'TERRITORIAL' AND alcance_umi IS NOT FALSE;

CREATE INDEX IF NOT EXISTS idx_sede_alcance_umi ON sede (alcance_umi, is_activo);

-- ------------------------------------------------------------
-- 7. Tabla hija 1:N de evidencias (adjuntos MinIO) por solicitud de mantenimiento
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS solicitud_evidencia (
    id_evidencia          UUID DEFAULT gen_random_uuid() CONSTRAINT pk_solicitud_evidencia PRIMARY KEY,
    id_solicitud          UUID NOT NULL,
    nombre_original       VARCHAR(255) NOT NULL,
    nombre_almacenado     VARCHAR(255) NOT NULL,
    ruta_objeto           VARCHAR(512) NOT NULL,
    bucket                VARCHAR(80)  NOT NULL DEFAULT 'infraestructura-evidencias',
    url_publica           TEXT,
    url_presigned         TEXT,
    vencimiento_presigned TIMESTAMPTZ,
    mime_type             VARCHAR(120),
    tamano_bytes          BIGINT NOT NULL,
    usuario_que_subio_id  UUID,
    usuario_que_subio_email VARCHAR(180),
    orden                 INT DEFAULT 0,
    notas                 TEXT,
    fecha_subida          TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT fk_solicitud_evidencia_solicitud
        FOREIGN KEY (id_solicitud)
        REFERENCES "infrastructure-management".solicitud_mantenimiento(id_solicitud)
        ON DELETE CASCADE,
    CONSTRAINT uq_solicitud_evidencia_ruta_objeto UNIQUE (bucket, ruta_objeto)
);
COMMENT ON TABLE  solicitud_evidencia IS 'Evidencias/adjuntos subidos por el usuario al radicar o gestionar una solicitud de mantenimiento (fotos, PDFs, planos). Almacenado en MinIO, referenciado por URL';
COMMENT ON COLUMN solicitud_evidencia.ruta_objeto IS 'key del objeto en MinIO sin protocolo (path dentro del bucket)';
COMMENT ON COLUMN solicitud_evidencia.vencimiento_presigned IS 'Fecha a partir de la cual la URL pre-firmada ya no sirve y hay que regenerarla';

CREATE INDEX IF NOT EXISTS idx_solicitud_evidencia_solicitud ON solicitud_evidencia (id_solicitud, orden);
CREATE INDEX IF NOT EXISTS idx_solicitud_evidencia_vencimiento ON solicitud_evidencia (vencimiento_presigned);

-- ------------------------------------------------------------
-- 8. Permisos de catálogo y evidencias (heredados si ya existen, idempotentes)
--    No se asumen roles pre-existentes (esap_infraestructura puede no existir).
--    El DO loop asigna SELECT solo si los roles existen.
-- ------------------------------------------------------------
DO $$DECLARE
    perm RECORD;
    v_table_catalogo TEXT := 'catalogo_item';
    v_table_evidencia TEXT := 'solicitud_evidencia';
    v_seq TEXT := 'catalogo_item_id_catalogo_seq';
BEGIN
    -- Asignar permisos de escritura a roles ESAP conocidos SOLO si existen
    FOR perm IN SELECT r.rolname AS rol
                 FROM pg_catalog.pg_roles r
                 WHERE r.rolname IN ('esap_admin', 'esap_infraestructura', 'esap_soporte') LOOP
        EXECUTE format('GRANT SELECT, INSERT, UPDATE ON TABLE %I TO %I', v_table_catalogo, perm.rol);
        EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE %I TO %I', v_table_evidencia, perm.rol);
    END LOOP;

    -- Asignar SELECT a rol de consulta si existe
    FOR perm IN SELECT r.rolname AS rol
                 FROM pg_catalog.pg_roles r
                 WHERE r.rolname IN ('esap_consulta', 'esap_admin', 'esap_infraestructura', 'esap_soporte') LOOP
        EXECUTE format('GRANT SELECT ON TABLE %I, %I TO %I', v_table_catalogo, v_table_evidencia, perm.rol);
    END LOOP;

    -- Secuencia catalogo_item
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = v_seq) THEN
        FOR perm IN SELECT r.rolname AS rol
                     FROM pg_catalog.pg_roles r
                     WHERE r.rolname IN ('esap_admin', 'esap_infraestructura', 'esap_soporte') LOOP
            EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %I TO %I', v_seq, perm.rol);
        END LOOP;
    END IF;
END$$;

-- ------------------------------------------------------------
-- FIN MIGRACIÓN 004
-- ------------------------------------------------------------
