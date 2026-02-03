--
-- PostgreSQL database dump
--

-- Dumped from database version 16.0
-- Dumped by pg_dump version 16.0

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: internal_disciplinary_control; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA internal_disciplinary_control;


--
-- Name: disciplinary_news_estado_enum; Type: TYPE; Schema: internal_disciplinary_control; Owner: -
--

CREATE TYPE internal_disciplinary_control.disciplinary_news_estado_enum AS ENUM (
    'RADICADA',
    'EN_VALORACION',
    'ASIGNADA',
    'DEVUELTA',
    'ARCHIVADA'
);


--
-- Name: disciplinary_news_origen_enum; Type: TYPE; Schema: internal_disciplinary_control; Owner: -
--

CREATE TYPE internal_disciplinary_control.disciplinary_news_origen_enum AS ENUM (
    'ANONIMO',
    'QUEJOSO',
    'OFICIO',
    'REMISION'
);


--
-- Name: disciplinary_processes_estado_enum; Type: TYPE; Schema: internal_disciplinary_control; Owner: -
--

CREATE TYPE internal_disciplinary_control.disciplinary_processes_estado_enum AS ENUM (
    'ACTIVO',
    'SUSPENDIDO',
    'ARCHIVADO',
    'PRESCRITO'
);


--
-- Name: disciplinary_processes_etapaactual_enum; Type: TYPE; Schema: internal_disciplinary_control; Owner: -
--

CREATE TYPE internal_disciplinary_control.disciplinary_processes_etapaactual_enum AS ENUM (
    'EVALUACION',
    'INDAGACION_PREVIA',
    'INVESTIGACION',
    'JUZGAMIENTO',
    'RECEPCION',
    'FALLO',
    'INDAGACION',
    'VALORACION'
);


--
-- Name: estado_alerta_enum; Type: TYPE; Schema: internal_disciplinary_control; Owner: -
--

CREATE TYPE internal_disciplinary_control.estado_alerta_enum AS ENUM (
    'enviada',
    'pendiente',
    'error'
);


--
-- Name: termino_estado_enum; Type: TYPE; Schema: internal_disciplinary_control; Owner: -
--

CREATE TYPE internal_disciplinary_control.termino_estado_enum AS ENUM (
    'pendiente',
    'proximo_vencer',
    'vencido',
    'cumplido'
);


--
-- Name: tipo_alerta_enum; Type: TYPE; Schema: internal_disciplinary_control; Owner: -
--

CREATE TYPE internal_disciplinary_control.tipo_alerta_enum AS ENUM (
    'email',
    'visual',
    'sistema'
);


--
-- Name: tipo_festivo_enum; Type: TYPE; Schema: internal_disciplinary_control; Owner: -
--

CREATE TYPE internal_disciplinary_control.tipo_festivo_enum AS ENUM (
    'nacional',
    'regional',
    'institucional'
);


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: internal_disciplinary_control; Owner: -
--

CREATE FUNCTION internal_disciplinary_control.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alertas_enviadas; Type: TABLE; Schema: internal_disciplinary_control; Owner: -
--

CREATE TABLE internal_disciplinary_control.alertas_enviadas (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    termino_id uuid,
    regla_alerta_id uuid,
    tipo internal_disciplinary_control.tipo_alerta_enum NOT NULL,
    destinatario character varying(200) NOT NULL,
    asunto character varying(500),
    mensaje text,
    estado internal_disciplinary_control.estado_alerta_enum DEFAULT 'pendiente'::internal_disciplinary_control.estado_alerta_enum NOT NULL,
    fecha_envio timestamp without time zone DEFAULT now() NOT NULL,
    fecha_lectura timestamp without time zone,
    error_mensaje text,
    creado_por_id uuid,
    fecha_creacion timestamp without time zone DEFAULT now() NOT NULL,
    auto_id uuid
);


--
-- Name: auto_versions; Type: TABLE; Schema: internal_disciplinary_control; Owner: -
--

CREATE TABLE internal_disciplinary_control.auto_versions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "autoId" uuid,
    contenido text NOT NULL,
    "versionNumber" integer NOT NULL,
    "createdBy" uuid,
    "changeReason" text,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "documentUrl" text,
    "documentName" text
);


--
-- Name: COLUMN auto_versions."documentUrl"; Type: COMMENT; Schema: internal_disciplinary_control; Owner: -
--

COMMENT ON COLUMN internal_disciplinary_control.auto_versions."documentUrl" IS 'URL del archivo adjunto en esta versión (si existe)';


--
-- Name: COLUMN auto_versions."documentName"; Type: COMMENT; Schema: internal_disciplinary_control; Owner: -
--

COMMENT ON COLUMN internal_disciplinary_control.auto_versions."documentName" IS 'Nombre del archivo adjunto en esta versión';


--
-- Name: dias_festivos; Type: TABLE; Schema: internal_disciplinary_control; Owner: -
--

CREATE TABLE internal_disciplinary_control.dias_festivos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    fecha date NOT NULL,
    descripcion character varying(200) NOT NULL,
    tipo internal_disciplinary_control.tipo_festivo_enum NOT NULL,
    territorio character varying(100),
    activo boolean DEFAULT true NOT NULL,
    creado_por_id uuid NOT NULL,
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fecha_actualizacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: disciplinary_news; Type: TABLE; Schema: internal_disciplinary_control; Owner: -
--

CREATE TABLE internal_disciplinary_control.disciplinary_news (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    radicado character varying(255) NOT NULL,
    "fechaRecepcion" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    origen internal_disciplinary_control.disciplinary_news_origen_enum NOT NULL,
    territorial character varying(100),
    "dependenciaDenunciado" character varying(255),
    denunciante jsonb,
    disciplinable jsonb,
    hechos text NOT NULL,
    adjuntos text[],
    estado internal_disciplinary_control.disciplinary_news_estado_enum DEFAULT 'RADICADA'::internal_disciplinary_control.disciplinary_news_estado_enum NOT NULL,
    observaciones text,
    "updatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "historialAuditoria" jsonb DEFAULT '[]'::jsonb,
    "fechaQueja" timestamp without time zone,
    conductas text[] DEFAULT ARRAY[]::text[],
    "kanbanStage" character varying(50) DEFAULT 'RECEPCION'::character varying
);


--
-- Name: TABLE disciplinary_news; Type: COMMENT; Schema: internal_disciplinary_control; Owner: -
--

COMMENT ON TABLE internal_disciplinary_control.disciplinary_news IS 'Noticias disciplinarias recibidas';


--
-- Name: COLUMN disciplinary_news.denunciante; Type: COMMENT; Schema: internal_disciplinary_control; Owner: -
--

COMMENT ON COLUMN internal_disciplinary_control.disciplinary_news.denunciante IS 'Datos del denunciante en formato JSON';


--
-- Name: COLUMN disciplinary_news.disciplinable; Type: COMMENT; Schema: internal_disciplinary_control; Owner: -
--

COMMENT ON COLUMN internal_disciplinary_control.disciplinary_news.disciplinable IS 'Datos del disciplinable en formato JSON';


--
-- Name: COLUMN disciplinary_news.estado; Type: COMMENT; Schema: internal_disciplinary_control; Owner: -
--

COMMENT ON COLUMN internal_disciplinary_control.disciplinary_news.estado IS 'Estados: RADICADA, ASIGNADA, DEVUELTA, ARCHIVADA';


--
-- Name: COLUMN disciplinary_news."fechaQueja"; Type: COMMENT; Schema: internal_disciplinary_control; Owner: -
--

COMMENT ON COLUMN internal_disciplinary_control.disciplinary_news."fechaQueja" IS 'Fecha reportada de la queja/hechos';


--
-- Name: COLUMN disciplinary_news.conductas; Type: COMMENT; Schema: internal_disciplinary_control; Owner: -
--

COMMENT ON COLUMN internal_disciplinary_control.disciplinary_news.conductas IS 'Conductas presuntamente indisciplinarias';


--
-- Name: disciplinary_processes; Type: TABLE; Schema: internal_disciplinary_control; Owner: -
--

CREATE TABLE internal_disciplinary_control.disciplinary_processes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "radicadoProceso" character varying(255) NOT NULL,
    "newsId" uuid NOT NULL,
    abogado_asignado_id uuid,
    "etapaActual" internal_disciplinary_control.disciplinary_processes_etapaactual_enum DEFAULT 'EVALUACION'::internal_disciplinary_control.disciplinary_processes_etapaactual_enum NOT NULL,
    estado internal_disciplinary_control.disciplinary_processes_estado_enum DEFAULT 'ACTIVO'::internal_disciplinary_control.disciplinary_processes_estado_enum NOT NULL,
    "fechaPrescripcion" timestamp without time zone,
    "fechaVencimientoEtapa" timestamp without time zone,
    observaciones text,
    pruebas text[],
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "kanbanStage" character varying(50),
    "kanbanNotice" text,
    drafts_count integer DEFAULT 0,
    documents_count integer DEFAULT 0,
    time_percentage numeric(5,2) DEFAULT 0.00
);


--
-- Name: TABLE disciplinary_processes; Type: COMMENT; Schema: internal_disciplinary_control; Owner: -
--

COMMENT ON TABLE internal_disciplinary_control.disciplinary_processes IS 'Procesos disciplinarios activos';


--
-- Name: COLUMN disciplinary_processes."etapaActual"; Type: COMMENT; Schema: internal_disciplinary_control; Owner: -
--

COMMENT ON COLUMN internal_disciplinary_control.disciplinary_processes."etapaActual" IS 'Etapas: EVALUACION, INDAGACION_PREVIA, INVESTIGACION, JUZGAMIENTO';


--
-- Name: COLUMN disciplinary_processes.estado; Type: COMMENT; Schema: internal_disciplinary_control; Owner: -
--

COMMENT ON COLUMN internal_disciplinary_control.disciplinary_processes.estado IS 'Estados: ACTIVO, SUSPENDIDO, ARCHIVADO, TERMINADO';


--
-- Name: disciplinary_professional; Type: TABLE; Schema: internal_disciplinary_control; Owner: -
--

CREATE TABLE internal_disciplinary_control.disciplinary_professional (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre_completo character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    telefono character varying(50),
    cargo character varying(100) NOT NULL,
    especialidad character varying(100),
    tipo_contrato character varying(50),
    territorial character varying(100),
    capacidad_maxima integer DEFAULT 10,
    estado character varying(50) DEFAULT 'ACTIVO'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    firma_url text
);


--
-- Name: TABLE disciplinary_professional; Type: COMMENT; Schema: internal_disciplinary_control; Owner: -
--

COMMENT ON TABLE internal_disciplinary_control.disciplinary_professional IS 'Profesionales (abogados) asignados a procesos disciplinarios';


--
-- Name: COLUMN disciplinary_professional.firma_url; Type: COMMENT; Schema: internal_disciplinary_control; Owner: -
--

COMMENT ON COLUMN internal_disciplinary_control.disciplinary_professional.firma_url IS 'URL del archivo de firma mecánica/digital del profesional';


--
-- Name: evidence; Type: TABLE; Schema: internal_disciplinary_control; Owner: -
--

CREATE TABLE internal_disciplinary_control.evidence (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    url text NOT NULL,
    filename character varying(255),
    description text,
    "fileType" character varying(100),
    "fileSize" integer,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "processId" uuid NOT NULL,
    "nombreDocumento" character varying(255),
    "tipoDocumento" character varying(50),
    etapa character varying(100),
    "usuarioCarga" character varying(255),
    categoria character varying(50),
    destinatario character varying(255),
    asunto character varying(255),
    participantes integer,
    "archivoUrl" character varying,
    "nombreArchivo" character varying,
    tipo character varying DEFAULT 'DOCUMENTO'::character varying
);


--
-- Name: TABLE evidence; Type: COMMENT; Schema: internal_disciplinary_control; Owner: -
--

COMMENT ON TABLE internal_disciplinary_control.evidence IS 'Evidencias y documentos adjuntos a los procesos';


--
-- Name: COLUMN evidence."fileType"; Type: COMMENT; Schema: internal_disciplinary_control; Owner: -
--

COMMENT ON COLUMN internal_disciplinary_control.evidence."fileType" IS 'Tipo de archivo: pdf, docx, jpg, etc.';


--
-- Name: legal_autos; Type: TABLE; Schema: internal_disciplinary_control; Owner: -
--

CREATE TABLE internal_disciplinary_control.legal_autos (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "processId" uuid NOT NULL,
    tipo character varying NOT NULL,
    contenido text NOT NULL,
    estado character varying DEFAULT 'BORRADOR'::character varying NOT NULL,
    "firmaUrl" text,
    "notificationDate" timestamp without time zone,
    "notificationEvidence" text,
    comentarios text,
    rejection_comments text,
    "aprobadoPorId" uuid,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "currentVersion" integer DEFAULT 1 NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    numero character varying(150),
    "documentUrl" text,
    "documentName" text,
    "documentType" text,
    "documentSize" integer
);


--
-- Name: TABLE legal_autos; Type: COMMENT; Schema: internal_disciplinary_control; Owner: -
--

COMMENT ON TABLE internal_disciplinary_control.legal_autos IS 'Autos legales generados en los procesos';


--
-- Name: COLUMN legal_autos.tipo; Type: COMMENT; Schema: internal_disciplinary_control; Owner: -
--

COMMENT ON COLUMN internal_disciplinary_control.legal_autos.tipo IS 'Tipos: AUTO_APERTURA, AUTO_PRUEBAS, AUTO_CIERRE, etc.';


--
-- Name: COLUMN legal_autos.estado; Type: COMMENT; Schema: internal_disciplinary_control; Owner: -
--

COMMENT ON COLUMN internal_disciplinary_control.legal_autos.estado IS 'Estados: BORRADOR, EN_REVISION, APROBADO, RECHAZADO, NOTIFICADO';


--
-- Name: plantilla_auto; Type: TABLE; Schema: internal_disciplinary_control; Owner: -
--

CREATE TABLE internal_disciplinary_control.plantilla_auto (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "htmlContent" text NOT NULL,
    estado character varying(50) DEFAULT 'activo'::character varying NOT NULL,
    nombre character varying(100),
    descripcion text,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT plantilla_auto_estado_check CHECK (((estado)::text = ANY ((ARRAY['activo'::character varying, 'inactivo'::character varying])::text[])))
);


--
-- Name: reglas_alerta; Type: TABLE; Schema: internal_disciplinary_control; Owner: -
--

CREATE TABLE internal_disciplinary_control.reglas_alerta (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre character varying(200) NOT NULL,
    dias_anticipacion integer NOT NULL,
    activa boolean DEFAULT true NOT NULL,
    enviar_email boolean DEFAULT false NOT NULL,
    mostrar_panel boolean DEFAULT true NOT NULL,
    descripcion text,
    creado_por_id uuid,
    fecha_creacion timestamp without time zone DEFAULT now() NOT NULL,
    fecha_actualizacion timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT reglas_alerta_dias_anticipacion_check CHECK (((dias_anticipacion >= 0) AND (dias_anticipacion <= 30)))
);


--
-- Name: sequences; Type: TABLE; Schema: internal_disciplinary_control; Owner: -
--

CREATE TABLE internal_disciplinary_control.sequences (
    name character varying(255) NOT NULL,
    "currentValue" integer DEFAULT 0,
    "updatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE sequences; Type: COMMENT; Schema: internal_disciplinary_control; Owner: -
--

COMMENT ON TABLE internal_disciplinary_control.sequences IS 'Tabla para gestionar secuencias de radicados';


--
-- Name: stage_configuration; Type: TABLE; Schema: internal_disciplinary_control; Owner: -
--

CREATE TABLE internal_disciplinary_control.stage_configuration (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    etapa character varying(255) NOT NULL,
    "diasHabiles" integer DEFAULT 30 NOT NULL,
    descripcion text,
    activo boolean DEFAULT true,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TABLE stage_configuration; Type: COMMENT; Schema: internal_disciplinary_control; Owner: -
--

COMMENT ON TABLE internal_disciplinary_control.stage_configuration IS 'Configuración de días hábiles por etapa procesal';


--
-- Name: COLUMN stage_configuration."createdAt"; Type: COMMENT; Schema: internal_disciplinary_control; Owner: -
--

COMMENT ON COLUMN internal_disciplinary_control.stage_configuration."createdAt" IS 'Fecha de creación del registro';


--
-- Name: COLUMN stage_configuration."updatedAt"; Type: COMMENT; Schema: internal_disciplinary_control; Owner: -
--

COMMENT ON COLUMN internal_disciplinary_control.stage_configuration."updatedAt" IS 'Fecha de última actualización del registro';


--
-- Name: system_configuration; Type: TABLE; Schema: internal_disciplinary_control; Owner: -
--

CREATE TABLE internal_disciplinary_control.system_configuration (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "roleCapacities" jsonb DEFAULT '{}'::jsonb,
    "notificationSettings" jsonb DEFAULT '{}'::jsonb,
    "alertSettings" jsonb DEFAULT '{}'::jsonb,
    "securitySettings" jsonb DEFAULT '{}'::jsonb
);


--
-- Name: TABLE system_configuration; Type: COMMENT; Schema: internal_disciplinary_control; Owner: -
--

COMMENT ON TABLE internal_disciplinary_control.system_configuration IS 'Configuración global del sistema disciplinario';


--
-- Name: terminos_procesales; Type: TABLE; Schema: internal_disciplinary_control; Owner: -
--

CREATE TABLE internal_disciplinary_control.terminos_procesales (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    proceso_id uuid NOT NULL,
    numero_proceso character varying(20),
    actuacion character varying(200) NOT NULL,
    responsable_id uuid NOT NULL,
    responsable_nombre character varying(200) NOT NULL,
    email_responsable character varying(100) NOT NULL,
    fecha_inicio date NOT NULL,
    dias_habiles integer NOT NULL,
    fecha_vencimiento date NOT NULL,
    dias_restantes integer NOT NULL,
    estado internal_disciplinary_control.termino_estado_enum DEFAULT 'pendiente'::internal_disciplinary_control.termino_estado_enum NOT NULL,
    alerta_enviada boolean DEFAULT false NOT NULL,
    fecha_cumplimiento date,
    observaciones text,
    creado_por_id uuid NOT NULL,
    fecha_creacion timestamp without time zone DEFAULT now() NOT NULL,
    fecha_actualizacion timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: alertas_enviadas PK_alertas_enviadas; Type: CONSTRAINT; Schema: internal_disciplinary_control; Owner: -
--

ALTER TABLE ONLY internal_disciplinary_control.alertas_enviadas
    ADD CONSTRAINT "PK_alertas_enviadas" PRIMARY KEY (id);


--
-- Name: auto_versions PK_auto_versions; Type: CONSTRAINT; Schema: internal_disciplinary_control; Owner: -
--

ALTER TABLE ONLY internal_disciplinary_control.auto_versions
    ADD CONSTRAINT "PK_auto_versions" PRIMARY KEY (id);


--
-- Name: legal_autos PK_legal_autos; Type: CONSTRAINT; Schema: internal_disciplinary_control; Owner: -
--

ALTER TABLE ONLY internal_disciplinary_control.legal_autos
    ADD CONSTRAINT "PK_legal_autos" PRIMARY KEY (id);


--
-- Name: reglas_alerta PK_reglas_alerta; Type: CONSTRAINT; Schema: internal_disciplinary_control; Owner: -
--

ALTER TABLE ONLY internal_disciplinary_control.reglas_alerta
    ADD CONSTRAINT "PK_reglas_alerta" PRIMARY KEY (id);


--
-- Name: terminos_procesales PK_terminos_procesales; Type: CONSTRAINT; Schema: internal_disciplinary_control; Owner: -
--

ALTER TABLE ONLY internal_disciplinary_control.terminos_procesales
    ADD CONSTRAINT "PK_terminos_procesales" PRIMARY KEY (id);


--
-- Name: reglas_alerta UQ_reglas_alerta_nombre; Type: CONSTRAINT; Schema: internal_disciplinary_control; Owner: -
--

ALTER TABLE ONLY internal_disciplinary_control.reglas_alerta
    ADD CONSTRAINT "UQ_reglas_alerta_nombre" UNIQUE (nombre);


--
-- Name: dias_festivos dias_festivos_pkey; Type: CONSTRAINT; Schema: internal_disciplinary_control; Owner: -
--

ALTER TABLE ONLY internal_disciplinary_control.dias_festivos
    ADD CONSTRAINT dias_festivos_pkey PRIMARY KEY (id);


--
-- Name: disciplinary_news disciplinary_news_pkey; Type: CONSTRAINT; Schema: internal_disciplinary_control; Owner: -
--

ALTER TABLE ONLY internal_disciplinary_control.disciplinary_news
    ADD CONSTRAINT disciplinary_news_pkey PRIMARY KEY (id);


--
-- Name: disciplinary_news disciplinary_news_radicado_key; Type: CONSTRAINT; Schema: internal_disciplinary_control; Owner: -
--

ALTER TABLE ONLY internal_disciplinary_control.disciplinary_news
    ADD CONSTRAINT disciplinary_news_radicado_key UNIQUE (radicado);


--
-- Name: disciplinary_processes disciplinary_processes_pkey; Type: CONSTRAINT; Schema: internal_disciplinary_control; Owner: -
--

ALTER TABLE ONLY internal_disciplinary_control.disciplinary_processes
    ADD CONSTRAINT disciplinary_processes_pkey PRIMARY KEY (id);


--
-- Name: disciplinary_processes disciplinary_processes_radicadoProceso_key; Type: CONSTRAINT; Schema: internal_disciplinary_control; Owner: -
--

ALTER TABLE ONLY internal_disciplinary_control.disciplinary_processes
    ADD CONSTRAINT "disciplinary_processes_radicadoProceso_key" UNIQUE ("radicadoProceso");


--
-- Name: disciplinary_professional disciplinary_professional_email_key; Type: CONSTRAINT; Schema: internal_disciplinary_control; Owner: -
--

ALTER TABLE ONLY internal_disciplinary_control.disciplinary_professional
    ADD CONSTRAINT disciplinary_professional_email_key UNIQUE (email);


--
-- Name: disciplinary_professional disciplinary_professional_pkey; Type: CONSTRAINT; Schema: internal_disciplinary_control; Owner: -
--

ALTER TABLE ONLY internal_disciplinary_control.disciplinary_professional
    ADD CONSTRAINT disciplinary_professional_pkey PRIMARY KEY (id);


--
-- Name: evidence evidence_pkey; Type: CONSTRAINT; Schema: internal_disciplinary_control; Owner: -
--

ALTER TABLE ONLY internal_disciplinary_control.evidence
    ADD CONSTRAINT evidence_pkey PRIMARY KEY (id);


--
-- Name: plantilla_auto plantilla_auto_pkey; Type: CONSTRAINT; Schema: internal_disciplinary_control; Owner: -
--

ALTER TABLE ONLY internal_disciplinary_control.plantilla_auto
    ADD CONSTRAINT plantilla_auto_pkey PRIMARY KEY (id);


--
-- Name: sequences sequences_pkey; Type: CONSTRAINT; Schema: internal_disciplinary_control; Owner: -
--

ALTER TABLE ONLY internal_disciplinary_control.sequences
    ADD CONSTRAINT sequences_pkey PRIMARY KEY (name);


--
-- Name: stage_configuration stage_configuration_pkey; Type: CONSTRAINT; Schema: internal_disciplinary_control; Owner: -
--

ALTER TABLE ONLY internal_disciplinary_control.stage_configuration
    ADD CONSTRAINT stage_configuration_pkey PRIMARY KEY (id);


--
-- Name: system_configuration system_configuration_pkey; Type: CONSTRAINT; Schema: internal_disciplinary_control; Owner: -
--

ALTER TABLE ONLY internal_disciplinary_control.system_configuration
    ADD CONSTRAINT system_configuration_pkey PRIMARY KEY (id);


--
-- Name: IDX_alertas_auto_id; Type: INDEX; Schema: internal_disciplinary_control; Owner: -
--

CREATE INDEX "IDX_alertas_auto_id" ON internal_disciplinary_control.alertas_enviadas USING btree (auto_id);


--
-- Name: IDX_alertas_estado; Type: INDEX; Schema: internal_disciplinary_control; Owner: -
--

CREATE INDEX "IDX_alertas_estado" ON internal_disciplinary_control.alertas_enviadas USING btree (estado);


--
-- Name: IDX_alertas_fecha_envio; Type: INDEX; Schema: internal_disciplinary_control; Owner: -
--

CREATE INDEX "IDX_alertas_fecha_envio" ON internal_disciplinary_control.alertas_enviadas USING btree (fecha_envio);


--
-- Name: IDX_alertas_regla_alerta_id; Type: INDEX; Schema: internal_disciplinary_control; Owner: -
--

CREATE INDEX "IDX_alertas_regla_alerta_id" ON internal_disciplinary_control.alertas_enviadas USING btree (regla_alerta_id);


--
-- Name: IDX_alertas_termino_id; Type: INDEX; Schema: internal_disciplinary_control; Owner: -
--

CREATE INDEX "IDX_alertas_termino_id" ON internal_disciplinary_control.alertas_enviadas USING btree (termino_id);


--
-- Name: IDX_auto_versions_autoId; Type: INDEX; Schema: internal_disciplinary_control; Owner: -
--

CREATE INDEX "IDX_auto_versions_autoId" ON internal_disciplinary_control.auto_versions USING btree ("autoId");


--
-- Name: IDX_legal_autos_processId; Type: INDEX; Schema: internal_disciplinary_control; Owner: -
--

CREATE INDEX "IDX_legal_autos_processId" ON internal_disciplinary_control.legal_autos USING btree ("processId");


--
-- Name: IDX_reglas_alerta_activa; Type: INDEX; Schema: internal_disciplinary_control; Owner: -
--

CREATE INDEX "IDX_reglas_alerta_activa" ON internal_disciplinary_control.reglas_alerta USING btree (activa);


--
-- Name: IDX_terminos_dias_restantes; Type: INDEX; Schema: internal_disciplinary_control; Owner: -
--

CREATE INDEX "IDX_terminos_dias_restantes" ON internal_disciplinary_control.terminos_procesales USING btree (dias_restantes);


--
-- Name: IDX_terminos_estado; Type: INDEX; Schema: internal_disciplinary_control; Owner: -
--

CREATE INDEX "IDX_terminos_estado" ON internal_disciplinary_control.terminos_procesales USING btree (estado);


--
-- Name: IDX_terminos_fecha_vencimiento; Type: INDEX; Schema: internal_disciplinary_control; Owner: -
--

CREATE INDEX "IDX_terminos_fecha_vencimiento" ON internal_disciplinary_control.terminos_procesales USING btree (fecha_vencimiento);


--
-- Name: IDX_terminos_proceso_id; Type: INDEX; Schema: internal_disciplinary_control; Owner: -
--

CREATE INDEX "IDX_terminos_proceso_id" ON internal_disciplinary_control.terminos_procesales USING btree (proceso_id);


--
-- Name: IDX_terminos_responsable_id; Type: INDEX; Schema: internal_disciplinary_control; Owner: -
--

CREATE INDEX "IDX_terminos_responsable_id" ON internal_disciplinary_control.terminos_procesales USING btree (responsable_id);


--
-- Name: idx_alertas_estado; Type: INDEX; Schema: internal_disciplinary_control; Owner: -
--

CREATE INDEX idx_alertas_estado ON internal_disciplinary_control.alertas_enviadas USING btree (estado);


--
-- Name: idx_alertas_fecha_envio; Type: INDEX; Schema: internal_disciplinary_control; Owner: -
--

CREATE INDEX idx_alertas_fecha_envio ON internal_disciplinary_control.alertas_enviadas USING btree (fecha_envio);


--
-- Name: idx_alertas_regla; Type: INDEX; Schema: internal_disciplinary_control; Owner: -
--

CREATE INDEX idx_alertas_regla ON internal_disciplinary_control.alertas_enviadas USING btree (regla_alerta_id);


--
-- Name: idx_alertas_termino; Type: INDEX; Schema: internal_disciplinary_control; Owner: -
--

CREATE INDEX idx_alertas_termino ON internal_disciplinary_control.alertas_enviadas USING btree (termino_id);


--
-- Name: idx_auto_estado; Type: INDEX; Schema: internal_disciplinary_control; Owner: -
--

CREATE INDEX idx_auto_estado ON internal_disciplinary_control.legal_autos USING btree (estado);


--
-- Name: idx_auto_process; Type: INDEX; Schema: internal_disciplinary_control; Owner: -
--

CREATE INDEX idx_auto_process ON internal_disciplinary_control.legal_autos USING btree ("processId");


--
-- Name: idx_auto_tipo; Type: INDEX; Schema: internal_disciplinary_control; Owner: -
--

CREATE INDEX idx_auto_tipo ON internal_disciplinary_control.legal_autos USING btree (tipo);


--
-- Name: idx_auto_versions_auto; Type: INDEX; Schema: internal_disciplinary_control; Owner: -
--

CREATE INDEX idx_auto_versions_auto ON internal_disciplinary_control.auto_versions USING btree ("autoId");


--
-- Name: idx_auto_versions_number; Type: INDEX; Schema: internal_disciplinary_control; Owner: -
--

CREATE INDEX idx_auto_versions_number ON internal_disciplinary_control.auto_versions USING btree ("versionNumber");


--
-- Name: idx_disciplinary_news_estado; Type: INDEX; Schema: internal_disciplinary_control; Owner: -
--

CREATE INDEX idx_disciplinary_news_estado ON internal_disciplinary_control.disciplinary_news USING btree (estado);


--
-- Name: idx_disciplinary_news_radicado; Type: INDEX; Schema: internal_disciplinary_control; Owner: -
--

CREATE INDEX idx_disciplinary_news_radicado ON internal_disciplinary_control.disciplinary_news USING btree (radicado);


--
-- Name: idx_disciplinary_processes_abogado; Type: INDEX; Schema: internal_disciplinary_control; Owner: -
--

CREATE INDEX idx_disciplinary_processes_abogado ON internal_disciplinary_control.disciplinary_processes USING btree (abogado_asignado_id);


--
-- Name: idx_disciplinary_processes_etapa; Type: INDEX; Schema: internal_disciplinary_control; Owner: -
--

CREATE INDEX idx_disciplinary_processes_etapa ON internal_disciplinary_control.disciplinary_processes USING btree ("etapaActual");


--
-- Name: idx_disciplinary_processes_radicado; Type: INDEX; Schema: internal_disciplinary_control; Owner: -
--

CREATE INDEX idx_disciplinary_processes_radicado ON internal_disciplinary_control.disciplinary_processes USING btree ("radicadoProceso");


--
-- Name: idx_disciplinary_professional_email; Type: INDEX; Schema: internal_disciplinary_control; Owner: -
--

CREATE INDEX idx_disciplinary_professional_email ON internal_disciplinary_control.disciplinary_professional USING btree (email);


--
-- Name: idx_disciplinary_professional_estado; Type: INDEX; Schema: internal_disciplinary_control; Owner: -
--

CREATE INDEX idx_disciplinary_professional_estado ON internal_disciplinary_control.disciplinary_professional USING btree (estado);


--
-- Name: idx_evidence_filetype; Type: INDEX; Schema: internal_disciplinary_control; Owner: -
--

CREATE INDEX idx_evidence_filetype ON internal_disciplinary_control.evidence USING btree ("fileType");


--
-- Name: idx_evidence_process; Type: INDEX; Schema: internal_disciplinary_control; Owner: -
--

CREATE INDEX idx_evidence_process ON internal_disciplinary_control.evidence USING btree ("processId");


--
-- Name: idx_evidence_tipo_documento; Type: INDEX; Schema: internal_disciplinary_control; Owner: -
--

CREATE INDEX idx_evidence_tipo_documento ON internal_disciplinary_control.evidence USING btree ("tipoDocumento");


--
-- Name: idx_festivos_activo; Type: INDEX; Schema: internal_disciplinary_control; Owner: -
--

CREATE INDEX idx_festivos_activo ON internal_disciplinary_control.dias_festivos USING btree (activo) WHERE (activo = true);


--
-- Name: idx_festivos_fecha; Type: INDEX; Schema: internal_disciplinary_control; Owner: -
--

CREATE INDEX idx_festivos_fecha ON internal_disciplinary_control.dias_festivos USING btree (fecha);


--
-- Name: idx_festivos_tipo; Type: INDEX; Schema: internal_disciplinary_control; Owner: -
--

CREATE INDEX idx_festivos_tipo ON internal_disciplinary_control.dias_festivos USING btree (tipo);


--
-- Name: idx_legal_autos_estado; Type: INDEX; Schema: internal_disciplinary_control; Owner: -
--

CREATE INDEX idx_legal_autos_estado ON internal_disciplinary_control.legal_autos USING btree (estado);


--
-- Name: idx_legal_autos_process; Type: INDEX; Schema: internal_disciplinary_control; Owner: -
--

CREATE INDEX idx_legal_autos_process ON internal_disciplinary_control.legal_autos USING btree ("processId");


--
-- Name: idx_news_estado; Type: INDEX; Schema: internal_disciplinary_control; Owner: -
--

CREATE INDEX idx_news_estado ON internal_disciplinary_control.disciplinary_news USING btree (estado);


--
-- Name: idx_news_fecha; Type: INDEX; Schema: internal_disciplinary_control; Owner: -
--

CREATE INDEX idx_news_fecha ON internal_disciplinary_control.disciplinary_news USING btree ("fechaRecepcion");


--
-- Name: idx_news_radicado; Type: INDEX; Schema: internal_disciplinary_control; Owner: -
--

CREATE INDEX idx_news_radicado ON internal_disciplinary_control.disciplinary_news USING btree (radicado);


--
-- Name: idx_news_territorial; Type: INDEX; Schema: internal_disciplinary_control; Owner: -
--

CREATE INDEX idx_news_territorial ON internal_disciplinary_control.disciplinary_news USING btree (territorial);


--
-- Name: idx_plantilla_auto_created_at; Type: INDEX; Schema: internal_disciplinary_control; Owner: -
--

CREATE INDEX idx_plantilla_auto_created_at ON internal_disciplinary_control.plantilla_auto USING btree ("createdAt");


--
-- Name: idx_plantilla_auto_estado; Type: INDEX; Schema: internal_disciplinary_control; Owner: -
--

CREATE INDEX idx_plantilla_auto_estado ON internal_disciplinary_control.plantilla_auto USING btree (estado);


--
-- Name: idx_process_abogado; Type: INDEX; Schema: internal_disciplinary_control; Owner: -
--

CREATE INDEX idx_process_abogado ON internal_disciplinary_control.disciplinary_processes USING btree (abogado_asignado_id);


--
-- Name: idx_process_estado; Type: INDEX; Schema: internal_disciplinary_control; Owner: -
--

CREATE INDEX idx_process_estado ON internal_disciplinary_control.disciplinary_processes USING btree (estado);


--
-- Name: idx_process_etapa; Type: INDEX; Schema: internal_disciplinary_control; Owner: -
--

CREATE INDEX idx_process_etapa ON internal_disciplinary_control.disciplinary_processes USING btree ("etapaActual");


--
-- Name: idx_process_news; Type: INDEX; Schema: internal_disciplinary_control; Owner: -
--

CREATE INDEX idx_process_news ON internal_disciplinary_control.disciplinary_processes USING btree ("newsId");


--
-- Name: idx_process_radicado; Type: INDEX; Schema: internal_disciplinary_control; Owner: -
--

CREATE INDEX idx_process_radicado ON internal_disciplinary_control.disciplinary_processes USING btree ("radicadoProceso");


--
-- Name: idx_professional_email; Type: INDEX; Schema: internal_disciplinary_control; Owner: -
--

CREATE INDEX idx_professional_email ON internal_disciplinary_control.disciplinary_professional USING btree (email);


--
-- Name: idx_professional_estado; Type: INDEX; Schema: internal_disciplinary_control; Owner: -
--

CREATE INDEX idx_professional_estado ON internal_disciplinary_control.disciplinary_professional USING btree (estado);


--
-- Name: idx_reglas_activa; Type: INDEX; Schema: internal_disciplinary_control; Owner: -
--

CREATE INDEX idx_reglas_activa ON internal_disciplinary_control.reglas_alerta USING btree (activa) WHERE (activa = true);


--
-- Name: idx_terminos_dias_restantes; Type: INDEX; Schema: internal_disciplinary_control; Owner: -
--

CREATE INDEX idx_terminos_dias_restantes ON internal_disciplinary_control.terminos_procesales USING btree (dias_restantes);


--
-- Name: idx_terminos_estado; Type: INDEX; Schema: internal_disciplinary_control; Owner: -
--

CREATE INDEX idx_terminos_estado ON internal_disciplinary_control.terminos_procesales USING btree (estado);


--
-- Name: idx_terminos_fecha_vencimiento; Type: INDEX; Schema: internal_disciplinary_control; Owner: -
--

CREATE INDEX idx_terminos_fecha_vencimiento ON internal_disciplinary_control.terminos_procesales USING btree (fecha_vencimiento);


--
-- Name: idx_terminos_proceso; Type: INDEX; Schema: internal_disciplinary_control; Owner: -
--

CREATE INDEX idx_terminos_proceso ON internal_disciplinary_control.terminos_procesales USING btree (proceso_id);


--
-- Name: idx_terminos_responsable; Type: INDEX; Schema: internal_disciplinary_control; Owner: -
--

CREATE INDEX idx_terminos_responsable ON internal_disciplinary_control.terminos_procesales USING btree (responsable_id);


--
-- Name: idx_unique_festivo_fecha_tipo_territorio; Type: INDEX; Schema: internal_disciplinary_control; Owner: -
--

CREATE UNIQUE INDEX idx_unique_festivo_fecha_tipo_territorio ON internal_disciplinary_control.dias_festivos USING btree (fecha, tipo, COALESCE(territorio, ''::character varying));


--
-- Name: legal_autos update_auto_timestamp; Type: TRIGGER; Schema: internal_disciplinary_control; Owner: -
--

CREATE TRIGGER update_auto_timestamp BEFORE UPDATE ON internal_disciplinary_control.legal_autos FOR EACH ROW EXECUTE FUNCTION internal_disciplinary_control.update_updated_at_column();


--
-- Name: disciplinary_news update_news_timestamp; Type: TRIGGER; Schema: internal_disciplinary_control; Owner: -
--

CREATE TRIGGER update_news_timestamp BEFORE UPDATE ON internal_disciplinary_control.disciplinary_news FOR EACH ROW EXECUTE FUNCTION internal_disciplinary_control.update_updated_at_column();


--
-- Name: plantilla_auto update_plantilla_auto_updated_at; Type: TRIGGER; Schema: internal_disciplinary_control; Owner: -
--

CREATE TRIGGER update_plantilla_auto_updated_at BEFORE UPDATE ON internal_disciplinary_control.plantilla_auto FOR EACH ROW EXECUTE FUNCTION internal_disciplinary_control.update_updated_at_column();


--
-- Name: disciplinary_processes update_process_timestamp; Type: TRIGGER; Schema: internal_disciplinary_control; Owner: -
--

CREATE TRIGGER update_process_timestamp BEFORE UPDATE ON internal_disciplinary_control.disciplinary_processes FOR EACH ROW EXECUTE FUNCTION internal_disciplinary_control.update_updated_at_column();


--
-- Name: sequences update_sequence_timestamp; Type: TRIGGER; Schema: internal_disciplinary_control; Owner: -
--

CREATE TRIGGER update_sequence_timestamp BEFORE UPDATE ON internal_disciplinary_control.sequences FOR EACH ROW EXECUTE FUNCTION internal_disciplinary_control.update_updated_at_column();


--
-- Name: stage_configuration update_stage_configuration_timestamp; Type: TRIGGER; Schema: internal_disciplinary_control; Owner: -
--

CREATE TRIGGER update_stage_configuration_timestamp BEFORE UPDATE ON internal_disciplinary_control.stage_configuration FOR EACH ROW EXECUTE FUNCTION internal_disciplinary_control.update_updated_at_column();


--
-- Name: alertas_enviadas FK_alertas_auto; Type: FK CONSTRAINT; Schema: internal_disciplinary_control; Owner: -
--

ALTER TABLE ONLY internal_disciplinary_control.alertas_enviadas
    ADD CONSTRAINT "FK_alertas_auto" FOREIGN KEY (auto_id) REFERENCES internal_disciplinary_control.legal_autos(id) ON DELETE SET NULL;


--
-- Name: alertas_enviadas FK_alertas_regla; Type: FK CONSTRAINT; Schema: internal_disciplinary_control; Owner: -
--

ALTER TABLE ONLY internal_disciplinary_control.alertas_enviadas
    ADD CONSTRAINT "FK_alertas_regla" FOREIGN KEY (regla_alerta_id) REFERENCES internal_disciplinary_control.reglas_alerta(id);


--
-- Name: alertas_enviadas FK_alertas_termino; Type: FK CONSTRAINT; Schema: internal_disciplinary_control; Owner: -
--

ALTER TABLE ONLY internal_disciplinary_control.alertas_enviadas
    ADD CONSTRAINT "FK_alertas_termino" FOREIGN KEY (termino_id) REFERENCES internal_disciplinary_control.terminos_procesales(id);


--
-- Name: auto_versions FK_auto_versions_auto; Type: FK CONSTRAINT; Schema: internal_disciplinary_control; Owner: -
--

ALTER TABLE ONLY internal_disciplinary_control.auto_versions
    ADD CONSTRAINT "FK_auto_versions_auto" FOREIGN KEY ("autoId") REFERENCES internal_disciplinary_control.legal_autos(id) ON DELETE CASCADE;


--
-- Name: legal_autos FK_legal_autos_process; Type: FK CONSTRAINT; Schema: internal_disciplinary_control; Owner: -
--

ALTER TABLE ONLY internal_disciplinary_control.legal_autos
    ADD CONSTRAINT "FK_legal_autos_process" FOREIGN KEY ("processId") REFERENCES internal_disciplinary_control.disciplinary_processes(id) ON DELETE CASCADE;


--
-- Name: terminos_procesales FK_terminos_proceso; Type: FK CONSTRAINT; Schema: internal_disciplinary_control; Owner: -
--

ALTER TABLE ONLY internal_disciplinary_control.terminos_procesales
    ADD CONSTRAINT "FK_terminos_proceso" FOREIGN KEY (proceso_id) REFERENCES internal_disciplinary_control.disciplinary_processes(id);


--
-- Name: evidence fk_evidence_process; Type: FK CONSTRAINT; Schema: internal_disciplinary_control; Owner: -
--

ALTER TABLE ONLY internal_disciplinary_control.evidence
    ADD CONSTRAINT fk_evidence_process FOREIGN KEY ("processId") REFERENCES internal_disciplinary_control.disciplinary_processes(id) ON DELETE CASCADE;


--
-- Name: disciplinary_processes fk_process_news; Type: FK CONSTRAINT; Schema: internal_disciplinary_control; Owner: -
--

ALTER TABLE ONLY internal_disciplinary_control.disciplinary_processes
    ADD CONSTRAINT fk_process_news FOREIGN KEY ("newsId") REFERENCES internal_disciplinary_control.disciplinary_news(id) ON DELETE RESTRICT;


--
-- Name: disciplinary_processes fk_process_professional; Type: FK CONSTRAINT; Schema: internal_disciplinary_control; Owner: -
--

ALTER TABLE ONLY internal_disciplinary_control.disciplinary_processes
    ADD CONSTRAINT fk_process_professional FOREIGN KEY (abogado_asignado_id) REFERENCES internal_disciplinary_control.disciplinary_professional(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

