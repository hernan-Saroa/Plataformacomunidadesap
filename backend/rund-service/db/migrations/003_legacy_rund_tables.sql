-- ============================================================================
-- Migration: 003_legacy_rund_tables.sql
-- Description: Replica en el esquema 'rund' las tablas del RUND que vivian en
--              academic_work_plan (modulo PTA / Banco de Docentes), con los
--              MISMOS nombres de tabla y de columna, para que el codigo legacy
--              (src/legacy/pta/**) funcione cambiando unicamente el esquema.
--
-- Estado reproducido: ESTADO FINAL tras aplicar las migraciones originales
--   (db/migrations): 190, 209, 315, 328, 330, 331, 333, 335, 336, 348, 353,
--   354, 366, 367, 416, 417, 422, 426, 428, 429, 430, 656, 657 (y 663, que solo
--   toca una funcion sobre auth.personas).
--
-- IMPORTANTE (colision de nombres):
--   En el esquema rund YA existe la tabla rund.docente (minusculas, creada en
--   001: perfil del docente del nuevo modelo). La tabla creada aqui,
--   rund."Docente" (CON COMILLAS Y MAYUSCULA INICIAL), es OTRA tabla distinta:
--   es el "banco de docentes" legacy de PTA/RUND (PK text, columnas camelCase).
--   PostgreSQL distingue ambas porque un identificador entre comillas conserva
--   mayusculas. Referenciarla SIEMPRE como rund."Docente".
--
-- Reglas aplicadas:
--   * Idempotente: CREATE ... IF NOT EXISTS, ADD COLUMN IF NOT EXISTS.
--   * Sin FKs entre esquemas (auth.*, academic_work_plan.*): referencias
--     logicas documentadas con "-- sin FK".
--   * Sin DROP/DELETE/TRUNCATE de datos. Solo DROP TRIGGER IF EXISTS sobre
--     triggers de las propias tablas nuevas, para poder recrearlos.
--   * No se crean GRANT.
--   * No se replica el trigger trg_auth_personas_rund_document_immutable
--     (migraciones 426/663): vive sobre auth.personas, fuera de este esquema.
--   * No se replica el back-fill de datos de 422 (soportes historicos ->
--     RundDocumentoPerfil) ni los UPDATE de datos de 353/430: son datos, no
--     estructura. Los registros de docentes se cargan despues; aqui solo van las tablas.
--   * Colision de indice: el indice idx_rund_invitacion_token ya existe en
--     rund (001, sobre rund.invitacion_docente). El indice equivalente de
--     "RundInvitacionDocente" se llama aqui idx_rund_invitacion_docente_token.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS rund;

-- gen_random_uuid() es nativa desde PostgreSQL 13 (no requiere pgcrypto).

-- ============================================================================
-- 1. SECUENCIA de numeros RUND (333) -- usada como nextval('rund.docente_id_rund_seq')
-- ============================================================================
CREATE SEQUENCE IF NOT EXISTS rund.docente_id_rund_seq
    START WITH 1
    INCREMENT BY 1;

-- ============================================================================
-- 2. TABLA: rund."Docente"  (NO confundir con rund.docente)
--    Origen: academic_work_plan."Docente" (190 + 209 + 315 + 331 + 335 + 353 +
--    366 + 429; indices 367 y 416).
--    Estado final: "personaId" es UUID (315). Las FKs originales a Persona,
--    Territorial, Sede y auth.personas (315) NO se replican (sin FK).
-- ============================================================================
CREATE TABLE IF NOT EXISTS rund."Docente" (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    "personaId" uuid NOT NULL,                       -- sin FK: referencia logica a auth.personas(id_person)
    "territorialId" text NOT NULL,                   -- sin FK: referencia logica a auth.seccionales(id_seccional)::text
    "tipoVinculacion" text NOT NULL,
    dedicacion text NOT NULL,
    estado text DEFAULT 'ACTIVO'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    escalafon text,
    "horasAsignables" integer DEFAULT 0 NOT NULL,
    "sedeId" text,                                   -- sin FK: referencia logica a auth.sedes(id_sede)::text
    "ordenListado" integer,
    "vinculacionDisplay" text,
    "dedicacionDisplay" text,
    "nucleoTematico" text,
    "nivelFormacion" text,
    "perfilAcademicoPro" text,
    "perfilAcademico" text,
    pregrado text,
    especializacion text,
    maestria text,
    doctorado text,
    "posDoctorado" text,
    investigacion text,
    "origenVinculacion" text,
    "actoAdministrativoVinculacion" text,
    "correoInstitucional" text,
    "ultimaEvaluacion" text,
    "situacionAdministrativa" text,
    "fechaInicioVinculacion" timestamp without time zone,
    "fechaFinVinculacion" timestamp without time zone,
    "puntajeSalarial" double precision,
    "edadReferencia" integer,
    "rangoEdad" text,
    -- 331
    "regimenNormativo" text,
    "periodoCarga" text,
    observaciones text,
    "idRund" text,
    "estadoAprobacion" text DEFAULT 'PENDIENTE_APROBACION',
    completitud jsonb DEFAULT '{}'::jsonb,
    canal_origen text DEFAULT 'MASIVO',
    -- 335
    "cetapId" text,                                  -- sin FK: referencia logica a academic_work_plan.cetap
    "correoAlternativo" text,
    -- 353
    acepta_habeas_data boolean DEFAULT false,
    fecha_aceptacion_habeas_data timestamp without time zone,
    ip_creacion varchar(50),
    -- 366
    "sexoBiologico" text,
    "dedicacionHorasSemana" integer,
    "situacionCategoria" text,
    -- 429
    "territorialReportada" text,
    "datosCargaMasiva" jsonb,
    CONSTRAINT "Docente_pkey" PRIMARY KEY (id)
);

-- Reparacion idempotente si la tabla ya existia con una forma anterior
ALTER TABLE rund."Docente"
    ADD COLUMN IF NOT EXISTS escalafon text,
    ADD COLUMN IF NOT EXISTS "origenVinculacion" text,
    ADD COLUMN IF NOT EXISTS "actoAdministrativoVinculacion" text,
    ADD COLUMN IF NOT EXISTS "situacionAdministrativa" text,
    ADD COLUMN IF NOT EXISTS "ultimaEvaluacion" text,
    ADD COLUMN IF NOT EXISTS "puntajeSalarial" double precision,
    ADD COLUMN IF NOT EXISTS "fechaInicioVinculacion" timestamp without time zone,
    ADD COLUMN IF NOT EXISTS "fechaFinVinculacion" timestamp without time zone,
    ADD COLUMN IF NOT EXISTS "edadReferencia" integer,
    ADD COLUMN IF NOT EXISTS "rangoEdad" text,
    ADD COLUMN IF NOT EXISTS "regimenNormativo" text,
    ADD COLUMN IF NOT EXISTS "periodoCarga" text,
    ADD COLUMN IF NOT EXISTS observaciones text,
    ADD COLUMN IF NOT EXISTS "idRund" text,
    ADD COLUMN IF NOT EXISTS "estadoAprobacion" text DEFAULT 'PENDIENTE_APROBACION',
    ADD COLUMN IF NOT EXISTS completitud jsonb DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS canal_origen text DEFAULT 'MASIVO',
    ADD COLUMN IF NOT EXISTS "cetapId" text,
    ADD COLUMN IF NOT EXISTS "correoAlternativo" text,
    ADD COLUMN IF NOT EXISTS acepta_habeas_data boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS fecha_aceptacion_habeas_data timestamp without time zone,
    ADD COLUMN IF NOT EXISTS ip_creacion varchar(50),
    ADD COLUMN IF NOT EXISTS "sexoBiologico" text,
    ADD COLUMN IF NOT EXISTS "dedicacionHorasSemana" integer,
    ADD COLUMN IF NOT EXISTS "situacionCategoria" text,
    ADD COLUMN IF NOT EXISTS "territorialReportada" text,
    ADD COLUMN IF NOT EXISTS "datosCargaMasiva" jsonb;

COMMENT ON TABLE rund."Docente" IS
    'Banco de docentes legacy (PTA/RUND), equivalente a academic_work_plan."Docente". Distinta de rund.docente (minusculas).';
COMMENT ON COLUMN rund."Docente"."cetapId" IS
    'Identificador opcional del CETAP asociado al docente.';
COMMENT ON COLUMN rund."Docente"."correoAlternativo" IS
    'Correo personal o alternativo del docente para flujos RUND.';
COMMENT ON COLUMN rund."Docente"."territorialReportada" IS
    'Nombre informativo reportado en RUND; no concede acceso ni asigna una territorial PTA.';
COMMENT ON COLUMN rund."Docente"."datosCargaMasiva" IS
    'Valores originales de las 38 columnas RUND de la ultima carga; protegidos por RBAC al consultar.';

-- 367: banco independiente por periodo (reemplaza al unico por personaId de 190/315)
CREATE UNIQUE INDEX IF NOT EXISTS "Docente_personaId_periodoCarga_key"
    ON rund."Docente" ("personaId", COALESCE("periodoCarga", ''));

-- 416: indices de reportes de planta docente
CREATE INDEX IF NOT EXISTS "idx_docente_escalafon" ON rund."Docente" ("escalafon");
CREATE INDEX IF NOT EXISTS "idx_docente_nucleoTematico" ON rund."Docente" ("nucleoTematico");
CREATE INDEX IF NOT EXISTS "idx_docente_nivelFormacion" ON rund."Docente" ("nivelFormacion");
CREATE INDEX IF NOT EXISTS "idx_docente_tipoVinculacion" ON rund."Docente" ("tipoVinculacion");
CREATE INDEX IF NOT EXISTS "idx_docente_periodoCarga" ON rund."Docente" ("periodoCarga");
CREATE INDEX IF NOT EXISTS "idx_docente_territorialId" ON rund."Docente" ("territorialId");

-- ============================================================================
-- 3. TABLA: rund.validacion_documental  (328 + 336)
--    Estado final: docente_id TEXT (Docente.id es text -> 336 elige TEXT),
--    id_documento_carpeta TEXT, FK a "Docente"(id) ON DELETE CASCADE (misma
--    tabla del conjunto, FK dentro del esquema rund).
-- ============================================================================
CREATE TABLE IF NOT EXISTS rund.validacion_documental (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    docente_id TEXT NOT NULL,
    campo_rund VARCHAR(100) NOT NULL,
    tipo_documento_soporte VARCHAR(100) NOT NULL,
    id_documento_carpeta TEXT,
    estado_documento VARCHAR(30) NOT NULL DEFAULT 'Sin cargar',
    fecha_carga TIMESTAMP,
    fecha_validacion TIMESTAMP,
    validado_por VARCHAR(150),
    observacion TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'validacion_documental_estado_documento_check'
          AND conrelid = 'rund.validacion_documental'::regclass
    ) THEN
        ALTER TABLE rund.validacion_documental
            ADD CONSTRAINT validacion_documental_estado_documento_check
            CHECK (estado_documento IN ('Sin cargar', 'Pendiente', 'Aceptado', 'Rechazado', 'No aplica'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'validacion_documental_docente_id_fkey'
          AND conrelid = 'rund.validacion_documental'::regclass
    ) THEN
        ALTER TABLE rund.validacion_documental
            ADD CONSTRAINT validacion_documental_docente_id_fkey
            FOREIGN KEY (docente_id) REFERENCES rund."Docente"(id) ON DELETE CASCADE;
    END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_docente_campo
    ON rund.validacion_documental (docente_id, campo_rund);
CREATE INDEX IF NOT EXISTS idx_val_docente
    ON rund.validacion_documental (docente_id);

-- ============================================================================
-- 4. TABLA: rund."RundCampoEstado"  (333)
--    Estado de aprobacion de cada bloque RUND por docente.
--    NOTA: docente_id es VARCHAR(255) en la migracion (la entidad TypeORM lo
--    declara uuid; el codigo hace docente_id::text). Se conserva VARCHAR(255).
-- ============================================================================
CREATE TABLE IF NOT EXISTS rund."RundCampoEstado" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    docente_id VARCHAR(255) NOT NULL,                -- sin FK: referencia logica a rund."Docente"(id)
    bloque VARCHAR(50) NOT NULL,
    estado VARCHAR(50) NOT NULL DEFAULT 'Pendiente',
    cargado_por VARCHAR(255),
    revisado_por VARCHAR(255),
    observacion TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    canal_origen VARCHAR(50),
    soporte_ids JSONB NOT NULL DEFAULT '[]',
    fecha_revision TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rund_campo_estado_docente
    ON rund."RundCampoEstado" (docente_id);

-- ============================================================================
-- 5. TABLA: rund."RundSoporteCampo"  (333 + 330 + 422 + 430)
--    330: documento_carpeta_id pasa a TEXT. 422: documento_perfil_id.
--    430: revisiones_campos.
-- ============================================================================
CREATE TABLE IF NOT EXISTS rund."RundSoporteCampo" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    docente_id UUID,                                 -- sin FK: referencia logica a rund."Docente"(id) (text; el codigo castea)
    bloque TEXT,
    tipo_soporte TEXT,
    documento_carpeta_id TEXT,                       -- sin FK: referencia logica a Carpeta Digital / ruta de almacenamiento
    nombre_archivo TEXT,
    estado VARCHAR(50) NOT NULL DEFAULT 'Pendiente',
    cargado_por VARCHAR(255),
    observacion TEXT,
    fecha_vencimiento TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    documento_perfil_id UUID,                        -- referencia logica a rund."RundDocumentoPerfil"(id) (sin FK en el original)
    revisiones_campos JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE rund."RundSoporteCampo"
    ADD COLUMN IF NOT EXISTS documento_perfil_id UUID,
    ADD COLUMN IF NOT EXISTS revisiones_campos JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_rund_soporte_campo_docente
    ON rund."RundSoporteCampo" (docente_id);
CREATE INDEX IF NOT EXISTS idx_rund_soporte_campo_bloque
    ON rund."RundSoporteCampo" (docente_id, bloque);

-- ============================================================================
-- 6. TABLA: rund."BancoDocentesInvitaciones"  (348 + 428)
--    Invitaciones de autogestion (Canal 3) + OTP.
-- ============================================================================
CREATE TABLE IF NOT EXISTS rund."BancoDocentesInvitaciones" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    correo_institucional TEXT NOT NULL,
    token_acceso TEXT NOT NULL UNIQUE,
    otp_codigo TEXT,
    otp_expira_en TIMESTAMP,
    intentos_otp INTEGER NOT NULL DEFAULT 0,
    estado TEXT NOT NULL DEFAULT 'Enviada',
    fecha_expiracion TIMESTAMP NOT NULL,
    borrador_json JSONB,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    sesion_token_hash TEXT,
    sesion_expira_en TIMESTAMPTZ
);

ALTER TABLE rund."BancoDocentesInvitaciones"
    ADD COLUMN IF NOT EXISTS sesion_token_hash TEXT,
    ADD COLUMN IF NOT EXISTS sesion_expira_en TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_banco_invitaciones_correo
    ON rund."BancoDocentesInvitaciones" (correo_institucional);
CREATE INDEX IF NOT EXISTS idx_banco_invitaciones_token
    ON rund."BancoDocentesInvitaciones" (token_acceso);
-- 428 (el nombre original idx_rund_invitacion_session_hash se conserva; no colisiona con 001)
CREATE UNIQUE INDEX IF NOT EXISTS idx_rund_invitacion_session_hash
    ON rund."BancoDocentesInvitaciones" (sesion_token_hash)
    WHERE sesion_token_hash IS NOT NULL;

COMMENT ON TABLE rund."BancoDocentesInvitaciones" IS
    'Invitaciones de autogestion RUND (Canal 3): link publico + OTP por correo. Estados: Enviada, Abierta, OTP validado, En proceso, Gestionada, Vencida.';

-- ============================================================================
-- 7. TABLA: rund."RundAprobacionLog"  (348 + 426: inmutable)
-- ============================================================================
CREATE TABLE IF NOT EXISTS rund."RundAprobacionLog" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    docente_id UUID NOT NULL,                        -- sin FK: referencia logica a rund."Docente"(id) (text; el codigo castea)
    bloque TEXT,
    accion TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    canal_origen TEXT,
    campo_afectado TEXT,
    dato_previo TEXT,
    dato_nuevo TEXT,
    observacion TEXT,
    soporte_id TEXT,
    ip TEXT,
    metadata JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rund_aprobacion_log_docente
    ON rund."RundAprobacionLog" (docente_id);

COMMENT ON TABLE rund."RundAprobacionLog" IS
    'Log de auditoria inmutable del RUND (BR-056). Solo INSERT: registra crear/aprobar/devolver/editar/vincular soporte.';

-- ============================================================================
-- 8. TABLA: rund."RundInvitacionDocente"  (354)
--    Sin entidad TypeORM en el codigo legacy copiado, pero existe en BD.
-- ============================================================================
CREATE TABLE IF NOT EXISTS rund."RundInvitacionDocente" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    correo_institucional VARCHAR(255) NOT NULL,
    documento_identidad VARCHAR(100),
    token_invitacion VARCHAR(255) UNIQUE NOT NULL,
    otp_hash VARCHAR(255),
    estado_invitacion VARCHAR(50) NOT NULL DEFAULT 'Enviada',
    caducidad_token TIMESTAMP NOT NULL,
    intentos_otp INTEGER DEFAULT 0,
    bloqueo_hasta TIMESTAMP,
    fecha_envio TIMESTAMP DEFAULT NOW(),
    fecha_apertura TIMESTAMP,
    ultima_actividad TIMESTAMP,
    docente_id TEXT,                                 -- sin FK: referencia logica a rund."Docente"(id)
    operador_id VARCHAR(255),
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rund_invitacion_docente_correo
    ON rund."RundInvitacionDocente" (correo_institucional);
-- Original: idx_rund_invitacion_token (colisiona con 001 en rund.invitacion_docente) -> renombrado
CREATE INDEX IF NOT EXISTS idx_rund_invitacion_docente_token
    ON rund."RundInvitacionDocente" (token_invitacion);

-- ============================================================================
-- 9. TABLAS: rund."RundAccesoExterno" y rund."RundMacroDocenteConsultaLog"  (417)
-- ============================================================================
CREATE TABLE IF NOT EXISTS rund."RundAccesoExterno" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ente_nombre TEXT NOT NULL,
    ente_contacto TEXT,
    token TEXT UNIQUE NOT NULL,
    -- Cada acceso externo se limita siempre a UN docente puntual (F022).
    docente_id TEXT NOT NULL,                        -- sin FK: referencia logica a rund."Docente"(id)
    motivo TEXT,
    fecha_inicio TIMESTAMPTZ NOT NULL,
    fecha_fin TIMESTAMPTZ NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    otorgado_por TEXT NOT NULL,
    revoked_at TIMESTAMPTZ,
    revoked_by TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_rund_acceso_externo_vigencia CHECK (fecha_fin > fecha_inicio)
);

CREATE INDEX IF NOT EXISTS idx_rund_acceso_externo_token
    ON rund."RundAccesoExterno" (token);
CREATE INDEX IF NOT EXISTS idx_rund_acceso_externo_vigencia
    ON rund."RundAccesoExterno" (activo, fecha_fin);

CREATE TABLE IF NOT EXISTS rund."RundMacroDocenteConsultaLog" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_consulta TEXT NOT NULL,                     -- MACRO_DOCENTE | CONSULTA_PUNTUAL | EXTERNA
    actor_id TEXT NOT NULL,
    roles TEXT[],
    acceso_externo_id UUID REFERENCES rund."RundAccesoExterno"(id),
    docente_id TEXT,                                 -- sin FK: referencia logica a rund."Docente"(id)
    periodo TEXT,
    filtros JSONB,
    total_resultados INTEGER,
    ip TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rund_macro_docente_log_fecha
    ON rund."RundMacroDocenteConsultaLog" ("createdAt");
CREATE INDEX IF NOT EXISTS idx_rund_macro_docente_log_docente
    ON rund."RundMacroDocenteConsultaLog" (docente_id);
CREATE INDEX IF NOT EXISTS idx_rund_macro_docente_log_acceso_externo
    ON rund."RundMacroDocenteConsultaLog" (acceso_externo_id);

-- ============================================================================
-- 10. TABLAS: rund."RundDocumentoCategoria" y rund."RundDocumentoPerfil"  (422)
-- ============================================================================
CREATE TABLE IF NOT EXISTS rund."RundDocumentoCategoria" (
    codigo TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    mime_permitidos TEXT[] NOT NULL DEFAULT ARRAY['application/pdf']::TEXT[],
    tamano_maximo_bytes BIGINT NOT NULL DEFAULT 10485760,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Semilla de categorias (identica a 422)
INSERT INTO rund."RundDocumentoCategoria" (codigo, nombre, descripcion, orden)
VALUES
    ('IDENTIDAD', 'Identidad', 'Documentos que acreditan la identidad del docente.', 10),
    ('TITULOS', 'Títulos', 'Diplomas, actas de grado y convalidaciones.', 20),
    ('CONTRATOS', 'Contratos', 'Contratos y documentos de vinculación.', 30),
    ('CERTIFICADOS', 'Certificados', 'Certificados académicos, laborales o de evaluación.', 40),
    ('RESOLUCIONES', 'Resoluciones', 'Resoluciones y actos administrativos.', 50),
    ('AUTORIZACIONES', 'Autorizaciones', 'Autorizaciones y formatos firmados.', 60),
    ('OTROS', 'Otros', 'Otros documentos PDF relacionados con el perfil.', 99)
ON CONFLICT (codigo) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    orden = EXCLUDED.orden,
    "updatedAt" = NOW();

CREATE TABLE IF NOT EXISTS rund."RundDocumentoPerfil" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    documento_logico_id UUID NOT NULL,
    docente_id UUID NOT NULL,                        -- sin FK: referencia logica a rund."Docente"(id) (text; el codigo castea)
    categoria_codigo TEXT NOT NULL REFERENCES rund."RundDocumentoCategoria"(codigo),
    bloque TEXT,
    tipo_soporte TEXT,
    descripcion TEXT,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
    nombre_archivo TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    tamano_bytes BIGINT NOT NULL CHECK (tamano_bytes >= 0),
    checksum_sha256 TEXT NOT NULL,
    proveedor_almacenamiento TEXT NOT NULL,
    almacenamiento_id TEXT,
    almacenamiento_ruta TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'REEMPLAZADO', 'ELIMINADO')),
    reemplaza_id UUID REFERENCES rund."RundDocumentoPerfil"(id),
    rund_soporte_id UUID,                            -- sin FK (en el original tampoco): referencia logica a rund."RundSoporteCampo"(id)
    creado_por TEXT NOT NULL,
    eliminado_por TEXT,
    eliminado_en TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (documento_logico_id, version)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_rund_documento_perfil_vigente
    ON rund."RundDocumentoPerfil" (documento_logico_id)
    WHERE estado = 'ACTIVO';
CREATE INDEX IF NOT EXISTS idx_rund_documento_perfil_docente_categoria
    ON rund."RundDocumentoPerfil" (docente_id, categoria_codigo, "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_rund_documento_perfil_soporte
    ON rund."RundDocumentoPerfil" (rund_soporte_id);

COMMENT ON TABLE rund."RundDocumentoPerfil" IS
    'REQ-RUND-F010: documentos PDF versionados del perfil docente, almacenados en OpenKM o proveedor local de desarrollo.';

-- ============================================================================
-- 11. TABLA: rund."RundCargaMasiva"  (426)  + trigger de inmutabilidad
-- ============================================================================
CREATE TABLE IF NOT EXISTS rund."RundCargaMasiva" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_archivo TEXT NOT NULL,
    tipo_mime TEXT NOT NULL,
    tamano_bytes BIGINT NOT NULL CHECK (tamano_bytes >= 0),
    sha256 VARCHAR(64) NOT NULL,
    contenido BYTEA NOT NULL,
    actor_id TEXT NOT NULL,
    justificacion TEXT NOT NULL,
    ip TEXT,
    estado TEXT NOT NULL DEFAULT 'PROCESANDO'
        CHECK (estado IN ('PROCESANDO', 'COMPLETADA', 'COMPLETADA_CON_ERRORES', 'FALLIDA')),
    resumen JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rund_carga_masiva_created_at
    ON rund."RundCargaMasiva" ("createdAt" DESC);

COMMENT ON TABLE rund."RundCargaMasiva" IS
    'Soporte documental inmutable de cada importacion masiva de perfiles RUND.';

-- ============================================================================
-- 12. TABLA: rund."RundAccesoDatosLog"  (428)  + triggers de inmutabilidad
--     NOTA: la migracion original (428) estaba en BEGIN/COMMIT; aqui no se
--     anida transaccion propia.
-- ============================================================================
CREATE TABLE IF NOT EXISTS rund."RundAccesoDatosLog" (
    id UUID PRIMARY KEY,
    actor_id TEXT NOT NULL,
    roles TEXT[] NOT NULL,
    endpoint TEXT NOT NULL,
    recurso_id TEXT,
    docentes TEXT[] NOT NULL DEFAULT '{}',
    campos TEXT[] NOT NULL,
    resultado TEXT NOT NULL CHECK (resultado IN ('COMPLETO','ENMASCARADO','DENEGADO')),
    ip TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_rund_acceso_actor_fecha
    ON rund."RundAccesoDatosLog" (actor_id, "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_rund_acceso_docentes
    ON rund."RundAccesoDatosLog" USING GIN (docentes);
CREATE INDEX IF NOT EXISTS idx_rund_acceso_recurso
    ON rund."RundAccesoDatosLog" (recurso_id);

-- ============================================================================
-- 13. TABLAS: rund."RundExtraccionInicio", "RundExtraccionTrabajo",
--     "RundExtraccionSugerencia"  (656 + 657)
-- ============================================================================
CREATE TABLE IF NOT EXISTS rund."RundExtraccionInicio" (
    id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
    desde TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rund."RundExtraccionTrabajo" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    documento_id UUID NOT NULL REFERENCES rund."RundDocumentoPerfil"(id),
    docente_id UUID NOT NULL,                        -- sin FK: referencia logica a rund."Docente"(id) (text; el codigo castea)
    estado TEXT NOT NULL DEFAULT 'PENDIENTE'
        CHECK (estado IN ('PENDIENTE','PROCESANDO','COMPLETADO','ERROR','OBSOLETO')),
    intentos INTEGER NOT NULL DEFAULT 0,
    disponible_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    lease_id UUID,
    lease_hasta TIMESTAMPTZ,
    perfil_base JSONB NOT NULL DEFAULT '{}'::jsonb,
    motor JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_codigo TEXT,
    creado_por TEXT NOT NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- 657
    etapa TEXT NOT NULL DEFAULT 'EN_COLA',
    etapa_desde TIMESTAMPTZ NOT NULL DEFAULT now(),
    iniciado_en TIMESTAMPTZ,
    notificacion_id UUID NOT NULL DEFAULT gen_random_uuid(),
    notificado_en TIMESTAMPTZ,
    notificacion_proxima TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE rund."RundExtraccionTrabajo"
    ADD COLUMN IF NOT EXISTS etapa TEXT NOT NULL DEFAULT 'EN_COLA',
    ADD COLUMN IF NOT EXISTS etapa_desde TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS iniciado_en TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS notificacion_id UUID NOT NULL DEFAULT gen_random_uuid(),
    ADD COLUMN IF NOT EXISTS notificado_en TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS notificacion_proxima TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_rund_extraccion_cola
    ON rund."RundExtraccionTrabajo" (estado, disponible_en);
CREATE UNIQUE INDEX IF NOT EXISTS uq_rund_extraccion_activa
    ON rund."RundExtraccionTrabajo" (documento_id) WHERE estado IN ('PENDIENTE','PROCESANDO');
CREATE INDEX IF NOT EXISTS idx_rund_extraccion_docente
    ON rund."RundExtraccionTrabajo" (docente_id, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_rund_extraccion_aviso
    ON rund."RundExtraccionTrabajo" (notificacion_proxima)
    WHERE notificado_en IS NULL AND estado IN ('COMPLETADO','ERROR','OBSOLETO');

CREATE TABLE IF NOT EXISTS rund."RundExtraccionSugerencia" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trabajo_id UUID NOT NULL REFERENCES rund."RundExtraccionTrabajo"(id),
    campo TEXT NOT NULL,
    valor TEXT NOT NULL,
    valor_previo TEXT,
    pagina INTEGER NOT NULL CHECK (pagina > 0),
    evidencia TEXT NOT NULL,
    confianza NUMERIC NOT NULL CHECK (confianza BETWEEN 0 AND 1),
    baja_confianza BOOLEAN NOT NULL,
    estado TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE','APROBADA','CORREGIDA','DESCARTADA')),
    valor_confirmado TEXT,
    revisado_por TEXT,
    motivo TEXT,
    revisado_en TIMESTAMPTZ,
    UNIQUE (trabajo_id, campo)
);

-- ============================================================================
-- 14. FUNCIONES Y TRIGGERS de inmutabilidad (426 / 428)
--     Se crean al final para que las tablas ya existan.
--     Las funciones quedan en el esquema rund con el mismo nombre original.
-- ============================================================================
CREATE OR REPLACE FUNCTION rund.prevent_rund_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Los registros de auditoría RUND son inmutables';
END;
$$;

DROP TRIGGER IF EXISTS trg_rund_aprobacion_log_immutable ON rund."RundAprobacionLog";
CREATE TRIGGER trg_rund_aprobacion_log_immutable
BEFORE UPDATE OR DELETE ON rund."RundAprobacionLog"
FOR EACH ROW EXECUTE FUNCTION rund.prevent_rund_audit_mutation();

CREATE OR REPLACE FUNCTION rund.prevent_rund_bulk_support_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'El soporte documental de la carga masiva es inmutable';
    END IF;

    IF NEW.nombre_archivo IS DISTINCT FROM OLD.nombre_archivo
       OR NEW.tipo_mime IS DISTINCT FROM OLD.tipo_mime
       OR NEW.tamano_bytes IS DISTINCT FROM OLD.tamano_bytes
       OR NEW.sha256 IS DISTINCT FROM OLD.sha256
       OR NEW.contenido IS DISTINCT FROM OLD.contenido
       OR NEW.actor_id IS DISTINCT FROM OLD.actor_id
       OR NEW.justificacion IS DISTINCT FROM OLD.justificacion
       OR NEW.ip IS DISTINCT FROM OLD.ip
       OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt" THEN
        RAISE EXCEPTION 'El soporte documental de la carga masiva es inmutable';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rund_carga_masiva_immutable_content ON rund."RundCargaMasiva";
CREATE TRIGGER trg_rund_carga_masiva_immutable_content
BEFORE UPDATE OR DELETE ON rund."RundCargaMasiva"
FOR EACH ROW EXECUTE FUNCTION rund.prevent_rund_bulk_support_mutation();

CREATE OR REPLACE FUNCTION rund.prevent_rund_access_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Los accesos a datos sensibles son inmutables';
END;
$$;

DROP TRIGGER IF EXISTS trg_rund_access_log_immutable ON rund."RundAccesoDatosLog";
CREATE TRIGGER trg_rund_access_log_immutable
BEFORE UPDATE OR DELETE ON rund."RundAccesoDatosLog"
FOR EACH ROW EXECUTE FUNCTION rund.prevent_rund_access_log_mutation();

DROP TRIGGER IF EXISTS trg_rund_access_log_no_truncate ON rund."RundAccesoDatosLog";
CREATE TRIGGER trg_rund_access_log_no_truncate
BEFORE TRUNCATE ON rund."RundAccesoDatosLog"
FOR EACH STATEMENT EXECUTE FUNCTION rund.prevent_rund_access_log_mutation();

-- ============================================================================
-- NOTA: no se encontro ninguna columna usada por el codigo legacy
-- (banco-docentes/*.ts, macro-docente/*.ts, entities/*.entity.ts) que no este
-- creada por alguna migracion original; no se anadieron columnas extra.
-- Discrepancia conocida (se conserva el estado real de BD): las entidades
-- TypeORM declaran docente_id como uuid en RundCampoEstado, mientras la
-- migracion 333 lo crea VARCHAR(255); y "Docente".id es text mientras
-- RundSoporteCampo/RundAprobacionLog/RundDocumentoPerfil.docente_id son uuid.
-- ============================================================================
