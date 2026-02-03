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
-- Name: legal_management; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA legal_management;


--
-- Name: estado_proceso_coactivo; Type: TYPE; Schema: legal_management; Owner: -
--

CREATE TYPE legal_management.estado_proceso_coactivo AS ENUM (
    'IDENTIFICADO',
    'PERSUASIVO',
    'PREJURIDICO',
    'MANDAMIENTO',
    'EMBARGO',
    'FINALIZADO'
);


--
-- Name: generar_numero_concepto(); Type: FUNCTION; Schema: legal_management; Owner: -
--

CREATE FUNCTION legal_management.generar_numero_concepto() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.numero_concepto IS NULL OR NEW.numero_concepto = '' THEN
        NEW.numero_concepto := 'CONCEPTO-OJ-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || 
                               LPAD(nextval('seq_concepto_numero')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: generar_radicado_consulta(); Type: FUNCTION; Schema: legal_management; Owner: -
--

CREATE FUNCTION legal_management.generar_radicado_consulta() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.numero_radicado IS NULL OR NEW.numero_radicado = '' THEN
        NEW.numero_radicado := 'CONS-OJ-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || 
                               LPAD(nextval('seq_consulta_radicado')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: registrar_historial_oc(); Type: FUNCTION; Schema: legal_management; Owner: -
--

CREATE FUNCTION legal_management.registrar_historial_oc() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO legal_management.historial_requerimientos_oc (requerimiento_id, accion, estado_nuevo, descripcion)
        VALUES (NEW.id, 'CREACION', NEW.estado, 'Requerimiento creado');
    ELSIF TG_OP = 'UPDATE' AND OLD.estado != NEW.estado THEN
        INSERT INTO legal_management.historial_requerimientos_oc (requerimiento_id, accion, estado_anterior, estado_nuevo, descripcion)
        VALUES (NEW.id, 'CAMBIO_ESTADO', OLD.estado, NEW.estado, 'Cambio de estado automático');
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: update_documentos_consulta_updated_at(); Type: FUNCTION; Schema: legal_management; Owner: -
--

CREATE FUNCTION legal_management.update_documentos_consulta_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_documentos_updated_at(); Type: FUNCTION; Schema: legal_management; Owner: -
--

CREATE FUNCTION legal_management.update_documentos_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_oc_comentarios_timestamp(); Type: FUNCTION; Schema: legal_management; Owner: -
--

CREATE FUNCTION legal_management.update_oc_comentarios_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_riesgos_timestamp(); Type: FUNCTION; Schema: legal_management; Owner: -
--

CREATE FUNCTION legal_management.update_riesgos_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_tareas_notas_timestamp(); Type: FUNCTION; Schema: legal_management; Owner: -
--

CREATE FUNCTION legal_management.update_tareas_notas_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: abogados; Type: TABLE; Schema: legal_management; Owner: -
--

CREATE TABLE legal_management.abogados (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre_completo character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    telefono character varying(50),
    especialidad character varying(100),
    fecha_ingreso date NOT NULL,
    estado character varying(50) DEFAULT 'ACTIVO'::character varying,
    foto_url text,
    auditoria_created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    auditoria_updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    cedula character varying(20)
);


--
-- Name: actas; Type: TABLE; Schema: legal_management; Owner: -
--

CREATE TABLE legal_management.actas (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    expediente_id uuid NOT NULL,
    numero_acta character varying(100),
    fecha date,
    horario character varying(50),
    duracion character varying(50),
    lugar character varying(255),
    presidente character varying(255),
    participantes text,
    resumen text,
    decisiones_tomadas text,
    estado character varying(50) DEFAULT 'Programada'::character varying,
    archivo_nombre character varying(255),
    archivo_url text,
    archivo_tamano integer,
    tipo character varying(100),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT actas_estado_check CHECK (((estado)::text = ANY ((ARRAY['Programada'::character varying, 'Firmada'::character varying])::text[])))
);


--
-- Name: actuaciones; Type: TABLE; Schema: legal_management; Owner: -
--

CREATE TABLE legal_management.actuaciones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    expediente_id uuid NOT NULL,
    tipo_actuacion character varying(100) NOT NULL,
    descripcion text,
    fecha_actuacion timestamp without time zone NOT NULL,
    documento_url character varying(255),
    documento_nombre character varying(255),
    usuario_responsable character varying(100) DEFAULT 'Sistema'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    origen character varying(50) DEFAULT 'MANUAL'::character varying,
    referencia_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb
);


--
-- Name: adjuntos_correo; Type: TABLE; Schema: legal_management; Owner: -
--

CREATE TABLE legal_management.adjuntos_correo (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    correo_id uuid NOT NULL,
    graph_message_id character varying(500) NOT NULL,
    graph_attachment_id character varying(500) NOT NULL,
    nombre character varying(500) NOT NULL,
    content_type character varying(255),
    tamanio integer DEFAULT 0,
    archivo_local_url text,
    descargado boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE adjuntos_correo; Type: COMMENT; Schema: legal_management; Owner: -
--

COMMENT ON TABLE legal_management.adjuntos_correo IS 'Adjuntos de correos electrónicos sincronizados desde Microsoft Graph';


--
-- Name: COLUMN adjuntos_correo.graph_attachment_id; Type: COMMENT; Schema: legal_management; Owner: -
--

COMMENT ON COLUMN legal_management.adjuntos_correo.graph_attachment_id IS 'ID del adjunto en Graph API, usado para descarga bajo demanda';


--
-- Name: COLUMN adjuntos_correo.archivo_local_url; Type: COMMENT; Schema: legal_management; Owner: -
--

COMMENT ON COLUMN legal_management.adjuntos_correo.archivo_local_url IS 'Ruta local si el archivo fue descargado al servidor';


--
-- Name: audiencias; Type: TABLE; Schema: legal_management; Owner: -
--

CREATE TABLE legal_management.audiencias (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    expediente_id uuid NOT NULL,
    abogado_id uuid NOT NULL,
    titulo character varying(255) NOT NULL,
    fecha_hora_inicio timestamp without time zone NOT NULL,
    duracion_minutos integer NOT NULL,
    modalidad character varying(50) NOT NULL,
    ubicacion character varying(255),
    link_reunion text,
    estado character varying(50) DEFAULT 'PROGRAMADA'::character varying,
    notas_preparacion text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: autos; Type: TABLE; Schema: legal_management; Owner: -
--

CREATE TABLE legal_management.autos (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    expediente_id uuid NOT NULL,
    numero character varying NOT NULL,
    tipo character varying NOT NULL,
    fecha_auto timestamp without time zone NOT NULL,
    juzgado character varying DEFAULT 'Juzgado Interno Disciplinario'::character varying NOT NULL,
    resumen text,
    estado character varying DEFAULT 'Pendiente'::character varying NOT NULL,
    fecha_notificacion timestamp without time zone,
    archivo_url character varying NOT NULL,
    archivo_nombre character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: avances_hallazgo; Type: TABLE; Schema: legal_management; Owner: -
--

CREATE TABLE legal_management.avances_hallazgo (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hallazgo_id uuid NOT NULL,
    fecha_reporte timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    porcentaje_avance integer,
    descripcion_avance text NOT NULL,
    documento_adjunto_url text,
    reportado_a_sireci boolean DEFAULT false,
    fecha_reporte_sireci timestamp without time zone,
    reportado_por character varying(150),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT avances_hallazgo_porcentaje_avance_check CHECK (((porcentaje_avance >= 0) AND (porcentaje_avance <= 100)))
);


--
-- Name: coactivos_historial; Type: TABLE; Schema: legal_management; Owner: -
--

CREATE TABLE legal_management.coactivos_historial (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    proceso_id uuid NOT NULL,
    tipo_evento character varying(50) NOT NULL,
    campo_modificado character varying(100),
    valor_anterior text,
    valor_nuevo text,
    usuario character varying(100),
    detalles text,
    fecha_evento timestamp without time zone DEFAULT now()
);


--
-- Name: comentarios; Type: TABLE; Schema: legal_management; Owner: -
--

CREATE TABLE legal_management.comentarios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    expediente_id uuid NOT NULL,
    contenido text NOT NULL,
    usuario_id character varying(255),
    usuario_nombre character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: comentarios_consulta; Type: TABLE; Schema: legal_management; Owner: -
--

CREATE TABLE legal_management.comentarios_consulta (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    consulta_id uuid NOT NULL,
    mensaje text NOT NULL,
    usuario character varying(255) NOT NULL,
    cargo character varying(255),
    fecha timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: comentarios_oc; Type: TABLE; Schema: legal_management; Owner: -
--

CREATE TABLE legal_management.comentarios_oc (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    requerimiento_id uuid NOT NULL,
    contenido text NOT NULL,
    tipo character varying(30) DEFAULT 'general'::character varying,
    autor_id uuid,
    autor_nombre character varying(200),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT comentarios_oc_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['general'::character varying, 'importante'::character varying, 'seguimiento'::character varying, 'interno'::character varying, 'respuesta'::character varying, 'actuacion'::character varying, 'alerta'::character varying, 'COMENTARIO'::character varying, 'ACTUACION'::character varying, 'ALERTA'::character varying])::text[])))
);


--
-- Name: conceptos_juridicos; Type: TABLE; Schema: legal_management; Owner: -
--

CREATE TABLE legal_management.conceptos_juridicos (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    consulta_id uuid NOT NULL,
    numero_concepto character varying(50) NOT NULL,
    tipo_documento character varying(30) DEFAULT 'CONCEPTO'::character varying,
    titulo character varying(300) NOT NULL,
    resumen text,
    analisis_juridico text NOT NULL,
    normatividad_aplicable text,
    conclusion text NOT NULL,
    recomendaciones text,
    documento_pdf_url character varying(500),
    estado character varying(20) DEFAULT 'BORRADOR'::character varying,
    abogado_redactor_id uuid,
    abogado_redactor_nombre character varying(150),
    revisor_id uuid,
    revisor_nombre character varying(150),
    fecha_revision timestamp without time zone,
    comentarios_revision text,
    aprobado_por character varying(150),
    fecha_aprobacion timestamp without time zone,
    fecha_emision timestamp without time zone,
    notificado_a character varying(300),
    visible_banco boolean DEFAULT true,
    etiquetas text[],
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT conceptos_juridicos_estado_check CHECK (((estado)::text = ANY ((ARRAY['BORRADOR'::character varying, 'EN_REVISION'::character varying, 'DEVUELTO'::character varying, 'APROBADO'::character varying, 'EMITIDO'::character varying])::text[]))),
    CONSTRAINT conceptos_juridicos_tipo_documento_check CHECK (((tipo_documento)::text = ANY ((ARRAY['CONCEPTO'::character varying, 'MEMORANDO'::character varying, 'VIABILIDAD'::character varying, 'REVISION'::character varying])::text[])))
);


--
-- Name: consulta_juridica_historial; Type: TABLE; Schema: legal_management; Owner: -
--

CREATE TABLE legal_management.consulta_juridica_historial (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    consulta_id uuid NOT NULL,
    tipo_evento character varying NOT NULL,
    descripcion text NOT NULL,
    detalle text,
    usuario character varying,
    fecha timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: consultas_juridicas; Type: TABLE; Schema: legal_management; Owner: -
--

CREATE TABLE legal_management.consultas_juridicas (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    numero_radicado character varying(50) NOT NULL,
    tipo_solicitud character varying(30),
    area_solicitante character varying(100),
    funcionario_solicitante character varying(150),
    cargo_solicitante character varying(100),
    email_solicitante character varying(150),
    telefono_solicitante character varying(20),
    asunto character varying(300),
    descripcion text,
    antecedentes text,
    documentos_soporte_urls text[],
    tema_principal character varying(100),
    palabras_clave text[],
    abogado_asignado_id uuid,
    abogado_asignado_nombre character varying(150),
    fecha_asignacion timestamp without time zone,
    estado character varying(30) DEFAULT 'RADICADA'::character varying,
    fecha_radicacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_vencimiento timestamp without time zone,
    dias_termino integer DEFAULT 30,
    dias_transcurridos integer DEFAULT 0,
    suspendida boolean DEFAULT false,
    fecha_suspension timestamp without time zone,
    motivo_suspension text,
    confidencial boolean DEFAULT false,
    areas_con_acceso text[],
    prioridad character varying(20) DEFAULT 'NORMAL'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(150),
    updated_by character varying(150),
    fecha_recepcion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    termino_legal_dias integer DEFAULT 30,
    fecha_maxima_respuesta timestamp without time zone,
    fecha_respuesta timestamp without time zone,
    observaciones text,
    canal_entrada character varying(30),
    dependencia_solicitante character varying(200),
    nombre_solicitante character varying(200),
    tipo_usuario character varying(20) DEFAULT 'interno'::character varying,
    materia_juridica character varying(30),
    complejidad character varying(10),
    numero_oficio_respuesta character varying(50),
    tipo_respuesta character varying(30),
    documento_respuesta_url text,
    respuesta text
);


--
-- Name: TABLE consultas_juridicas; Type: COMMENT; Schema: legal_management; Owner: -
--

COMMENT ON TABLE legal_management.consultas_juridicas IS 'Registro de consultas y asesorías jurídicas internas de ESAP';


--
-- Name: COLUMN consultas_juridicas.termino_legal_dias; Type: COMMENT; Schema: legal_management; Owner: -
--

COMMENT ON COLUMN legal_management.consultas_juridicas.termino_legal_dias IS 'Término legal de 30 días hábiles según CPACA Art. 50';


--
-- Name: correos_juridicos; Type: TABLE; Schema: legal_management; Owner: -
--

CREATE TABLE legal_management.correos_juridicos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    graph_message_id character varying(500) NOT NULL,
    asunto character varying(500) NOT NULL,
    remitente_email character varying(255) NOT NULL,
    remitente_nombre character varying(255),
    destinatarios text,
    fecha_recepcion timestamp without time zone NOT NULL,
    cuerpo_html text,
    cuerpo_texto text,
    tiene_adjuntos boolean DEFAULT false,
    leido boolean DEFAULT false,
    archivado boolean DEFAULT false,
    urgente boolean DEFAULT false,
    tipo character varying(20) DEFAULT 'CORREO'::character varying,
    categoria character varying(100),
    modulo_sugerido character varying(100),
    confianza_clasificacion integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: decisiones_disciplinarias; Type: TABLE; Schema: legal_management; Owner: -
--

CREATE TABLE legal_management.decisiones_disciplinarias (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tipo_decision character varying(100) NOT NULL,
    tipo_fallo character varying(100) NOT NULL,
    sancion character varying(255),
    consideraciones text NOT NULL,
    fundamentos_juridicos text,
    responsable character varying(255) NOT NULL,
    cargo_responsable character varying(255),
    fecha date DEFAULT CURRENT_DATE NOT NULL,
    expediente_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE decisiones_disciplinarias; Type: COMMENT; Schema: legal_management; Owner: -
--

COMMENT ON TABLE legal_management.decisiones_disciplinarias IS 'Tabla para almacenar decisiones de procesos disciplinarios en el módulo de juzgamiento';


--
-- Name: COLUMN decisiones_disciplinarias.tipo_decision; Type: COMMENT; Schema: legal_management; Owner: -
--

COMMENT ON COLUMN legal_management.decisiones_disciplinarias.tipo_decision IS 'Tipo de decisión: AUTO_DE_FALLO, ARCHIVO, SUSPENSION, etc.';


--
-- Name: COLUMN decisiones_disciplinarias.tipo_fallo; Type: COMMENT; Schema: legal_management; Owner: -
--

COMMENT ON COLUMN legal_management.decisiones_disciplinarias.tipo_fallo IS 'Tipo de fallo: ABSOLUTORIO, CONDENATORIO, INHIBITORIO';


--
-- Name: documentos; Type: TABLE; Schema: legal_management; Owner: -
--

CREATE TABLE legal_management.documentos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    expediente_id uuid NOT NULL,
    nombre character varying(500) NOT NULL,
    tipo character varying(100) NOT NULL,
    descripcion text,
    archivo_url text,
    archivo_nombre_original character varying(500),
    archivo_tamano integer,
    archivo_mime_type character varying(100),
    fecha_documento date,
    numero_folios integer,
    confidencial boolean DEFAULT false,
    subido_por character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE documentos; Type: COMMENT; Schema: legal_management; Owner: -
--

COMMENT ON TABLE legal_management.documentos IS 'Documentos asociados a expedientes judiciales';


--
-- Name: COLUMN documentos.tipo; Type: COMMENT; Schema: legal_management; Owner: -
--

COMMENT ON COLUMN legal_management.documentos.tipo IS 'Tipo de documento: DEMANDA, AUTO, MEMORIAL, PRUEBA, SENTENCIA, NOTIFICACION, OTRO';


--
-- Name: COLUMN documentos.archivo_url; Type: COMMENT; Schema: legal_management; Owner: -
--

COMMENT ON COLUMN legal_management.documentos.archivo_url IS 'URL o ruta al archivo físico o en storage';


--
-- Name: documentos_consulta; Type: TABLE; Schema: legal_management; Owner: -
--

CREATE TABLE legal_management.documentos_consulta (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    consulta_id uuid NOT NULL,
    nombre character varying(255) NOT NULL,
    tipo_documento character varying(50) DEFAULT 'otro'::character varying,
    descripcion text,
    archivo_url text,
    archivo_nombre_original character varying(255),
    tamano_bytes bigint,
    mime_type character varying(100),
    subido_por character varying(200),
    fecha_documento date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE documentos_consulta; Type: COMMENT; Schema: legal_management; Owner: -
--

COMMENT ON TABLE legal_management.documentos_consulta IS 'Documentos adjuntos a consultas jurídicas';


--
-- Name: COLUMN documentos_consulta.consulta_id; Type: COMMENT; Schema: legal_management; Owner: -
--

COMMENT ON COLUMN legal_management.documentos_consulta.consulta_id IS 'Referencia a la consulta jurídica';


--
-- Name: COLUMN documentos_consulta.tipo_documento; Type: COMMENT; Schema: legal_management; Owner: -
--

COMMENT ON COLUMN legal_management.documentos_consulta.tipo_documento IS 'Tipo: solicitud, normativa, concepto, respuesta, otro';


--
-- Name: documentos_oc; Type: TABLE; Schema: legal_management; Owner: -
--

CREATE TABLE legal_management.documentos_oc (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    requerimiento_id uuid NOT NULL,
    nombre character varying(255) NOT NULL,
    tipo_documento character varying(50) DEFAULT 'otro'::character varying,
    descripcion text,
    archivo_url text,
    tamano_bytes bigint,
    mime_type character varying(100),
    subido_por character varying(200),
    fecha_documento date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT documentos_oc_tipo_documento_check CHECK (((tipo_documento)::text = ANY ((ARRAY['oficio'::character varying, 'respuesta'::character varying, 'anexo'::character varying, 'acuse'::character varying, 'informe'::character varying, 'evidencia'::character varying, 'otro'::character varying])::text[])))
);


--
-- Name: evidencias; Type: TABLE; Schema: legal_management; Owner: -
--

CREATE TABLE legal_management.evidencias (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    expediente_id uuid NOT NULL,
    descripcion text,
    aportado_por character varying(255),
    fecha_presentacion timestamp with time zone DEFAULT now(),
    archivo_nombre character varying(255),
    archivo_url text,
    archivo_tamano integer,
    tipo character varying(100),
    prioridad character varying(20),
    estado character varying(50) DEFAULT 'En Revisión'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tipo_archivo character varying(50),
    CONSTRAINT evidencias_estado_check CHECK (((estado)::text = ANY ((ARRAY['En Revisión'::character varying, 'Admitida'::character varying])::text[]))),
    CONSTRAINT evidencias_prioridad_check CHECK (((prioridad)::text = ANY ((ARRAY['Alta'::character varying, 'Media'::character varying, 'Baja'::character varying])::text[])))
);


--
-- Name: COLUMN evidencias.tipo_archivo; Type: COMMENT; Schema: legal_management; Owner: -
--

COMMENT ON COLUMN legal_management.evidencias.tipo_archivo IS 'File extension (e.g., jpg, pdf, png) for correct icon display';


--
-- Name: excepciones_procesales; Type: TABLE; Schema: legal_management; Owner: -
--

CREATE TABLE legal_management.excepciones_procesales (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tipo character varying(50) NOT NULL,
    descripcion text NOT NULL,
    fundamento text,
    estado character varying(20) DEFAULT 'PENDIENTE'::character varying NOT NULL,
    resolucion text,
    fecha_presentacion date DEFAULT CURRENT_DATE NOT NULL,
    fecha_resolucion date,
    presentado_por character varying(255),
    expediente_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT excepciones_procesales_estado_check CHECK (((estado)::text = ANY ((ARRAY['PENDIENTE'::character varying, 'RESUELTA'::character varying, 'RECHAZADA'::character varying])::text[]))),
    CONSTRAINT excepciones_procesales_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['NULIDAD'::character varying, 'RECUSACION'::character varying, 'PRESCRIPCION'::character varying, 'IMPEDIMENTO'::character varying, 'OTRA'::character varying])::text[])))
);


--
-- Name: TABLE excepciones_procesales; Type: COMMENT; Schema: legal_management; Owner: -
--

COMMENT ON TABLE legal_management.excepciones_procesales IS 'Excepciones procesales del módulo de Juzgamiento Disciplinario';


--
-- Name: COLUMN excepciones_procesales.tipo; Type: COMMENT; Schema: legal_management; Owner: -
--

COMMENT ON COLUMN legal_management.excepciones_procesales.tipo IS 'Tipo de excepción: NULIDAD, RECUSACION, PRESCRIPCION, IMPEDIMENTO, OTRA';


--
-- Name: COLUMN excepciones_procesales.estado; Type: COMMENT; Schema: legal_management; Owner: -
--

COMMENT ON COLUMN legal_management.excepciones_procesales.estado IS 'Estado de la excepción: PENDIENTE, RESUELTA, RECHAZADA';


--
-- Name: expedientes; Type: TABLE; Schema: legal_management; Owner: -
--

CREATE TABLE legal_management.expedientes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    radicado character varying(50) NOT NULL,
    jurisdiccion character varying(50) NOT NULL,
    tipo_proceso character varying(100) NOT NULL,
    demandante character varying(255) NOT NULL,
    demandado character varying(255) DEFAULT 'ESAP'::character varying NOT NULL,
    estado character varying(50) NOT NULL,
    fecha_radicacion timestamp without time zone NOT NULL,
    cuantia numeric(15,2),
    abogado_sustanciador character varying(255),
    fecha_prescripcion timestamp without time zone,
    riesgo_prescripcion boolean DEFAULT false,
    termino_procesal_dias integer,
    ultima_actuacion character varying(255),
    ubicacion_fisica character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    sancion_proyectada character varying,
    medio_control character varying(255),
    juzgado_conocimiento character varying(255),
    pretension_demandante text,
    acto_administrativo_demandado text,
    fecha_notificacion timestamp without time zone,
    fecha_admision timestamp without time zone,
    fecha_vencimiento_termino timestamp without time zone,
    tipo_id_demandante character varying(10),
    numero_id_demandante character varying(20),
    tipo_id_demandado character varying(10),
    numero_id_demandado character varying(20),
    etapa_procesal character varying(100) DEFAULT 'RADICACION'::character varying,
    documentos_iniciales_urls text[],
    etapa character varying(50),
    cargo_investigado character varying(255),
    ley_aplicable character varying(100),
    hechos text,
    fecha_limite_etapa timestamp without time zone,
    tipo_solicitud character varying(100),
    radicado_externo character varying(50),
    asunto character varying(255),
    datos_requeridos text,
    tipo_falta character varying(50),
    dependencia_investigado character varying(150),
    demandante_direccion character varying(500),
    demandante_telefono character varying(50),
    demandante_email character varying(255),
    demandante_apoderado character varying(255),
    demandado_direccion character varying(500),
    demandado_telefono character varying(50),
    demandado_email character varying(255)
);


--
-- Name: COLUMN expedientes.etapa; Type: COMMENT; Schema: legal_management; Owner: -
--

COMMENT ON COLUMN legal_management.expedientes.etapa IS 'Stage of the process: AVOCAMIENTO, PRUEBAS, ALEGATOS, etc.';


--
-- Name: COLUMN expedientes.cargo_investigado; Type: COMMENT; Schema: legal_management; Owner: -
--

COMMENT ON COLUMN legal_management.expedientes.cargo_investigado IS 'Job title of the investigated person';


--
-- Name: COLUMN expedientes.ley_aplicable; Type: COMMENT; Schema: legal_management; Owner: -
--

COMMENT ON COLUMN legal_management.expedientes.ley_aplicable IS 'Applicable law, e.g., Ley 1952/2019';


--
-- Name: COLUMN expedientes.tipo_solicitud; Type: COMMENT; Schema: legal_management; Owner: -
--

COMMENT ON COLUMN legal_management.expedientes.tipo_solicitud IS 'Type of report/request, e.g. Informe Pormenorizado';


--
-- Name: COLUMN expedientes.radicado_externo; Type: COMMENT; Schema: legal_management; Owner: -
--

COMMENT ON COLUMN legal_management.expedientes.radicado_externo IS 'External ID from the requesting entity';


--
-- Name: COLUMN expedientes.asunto; Type: COMMENT; Schema: legal_management; Owner: -
--

COMMENT ON COLUMN legal_management.expedientes.asunto IS 'Short title or subject of the request';


--
-- Name: COLUMN expedientes.datos_requeridos; Type: COMMENT; Schema: legal_management; Owner: -
--

COMMENT ON COLUMN legal_management.expedientes.datos_requeridos IS 'JSON or text listing required data points';


--
-- Name: COLUMN expedientes.tipo_falta; Type: COMMENT; Schema: legal_management; Owner: -
--

COMMENT ON COLUMN legal_management.expedientes.tipo_falta IS 'Severity: Leve, Grave, Gravísima';


--
-- Name: COLUMN expedientes.dependencia_investigado; Type: COMMENT; Schema: legal_management; Owner: -
--

COMMENT ON COLUMN legal_management.expedientes.dependencia_investigado IS 'Department of the investigated person';


--
-- Name: COLUMN expedientes.demandante_direccion; Type: COMMENT; Schema: legal_management; Owner: -
--

COMMENT ON COLUMN legal_management.expedientes.demandante_direccion IS 'Dirección de notificaciones del demandante';


--
-- Name: COLUMN expedientes.demandante_telefono; Type: COMMENT; Schema: legal_management; Owner: -
--

COMMENT ON COLUMN legal_management.expedientes.demandante_telefono IS 'Teléfono de contacto del demandante';


--
-- Name: COLUMN expedientes.demandante_email; Type: COMMENT; Schema: legal_management; Owner: -
--

COMMENT ON COLUMN legal_management.expedientes.demandante_email IS 'Correo electrónico del demandante';


--
-- Name: COLUMN expedientes.demandante_apoderado; Type: COMMENT; Schema: legal_management; Owner: -
--

COMMENT ON COLUMN legal_management.expedientes.demandante_apoderado IS 'Nombre del apoderado del demandante';


--
-- Name: hallazgos; Type: TABLE; Schema: legal_management; Owner: -
--

CREATE TABLE legal_management.hallazgos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    requerimiento_id uuid,
    codigo_hallazgo character varying(50) NOT NULL,
    numero_interno character varying(50),
    tipo_hallazgo character varying(30) DEFAULT 'ADMINISTRATIVO'::character varying,
    titulo character varying(300) NOT NULL,
    descripcion text NOT NULL,
    causa_raiz text,
    efecto text,
    area_responsable character varying(150),
    funcionario_responsable character varying(200),
    accion_correctiva text NOT NULL,
    fecha_compromiso date NOT NULL,
    indicador_cumplimiento text,
    meta_indicador character varying(100),
    estado character varying(30) DEFAULT 'ABIERTO'::character varying,
    porcentaje_avance integer DEFAULT 0,
    fecha_ultimo_reporte timestamp without time zone,
    fecha_proximo_reporte date,
    periodicidad_reporte character varying(20) DEFAULT 'TRIMESTRAL'::character varying,
    documento_plan_url text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(150),
    CONSTRAINT hallazgos_estado_check CHECK (((estado)::text = ANY ((ARRAY['ABIERTO'::character varying, 'EN_CURSO'::character varying, 'EN_REVISION'::character varying, 'CERRADO'::character varying, 'RECHAZADO'::character varying])::text[]))),
    CONSTRAINT hallazgos_periodicidad_reporte_check CHECK (((periodicidad_reporte)::text = ANY ((ARRAY['MENSUAL'::character varying, 'TRIMESTRAL'::character varying, 'SEMESTRAL'::character varying, 'ANUAL'::character varying])::text[]))),
    CONSTRAINT hallazgos_porcentaje_avance_check CHECK (((porcentaje_avance >= 0) AND (porcentaje_avance <= 100))),
    CONSTRAINT hallazgos_tipo_hallazgo_check CHECK (((tipo_hallazgo)::text = ANY ((ARRAY['ADMINISTRATIVO'::character varying, 'FISCAL'::character varying, 'DISCIPLINARIO'::character varying, 'PENAL'::character varying])::text[])))
);


--
-- Name: historial_consultas; Type: TABLE; Schema: legal_management; Owner: -
--

CREATE TABLE legal_management.historial_consultas (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    consulta_id uuid NOT NULL,
    accion character varying(100) NOT NULL,
    descripcion text,
    estado_anterior character varying(30),
    estado_nuevo character varying(30),
    usuario_nombre character varying(150),
    fecha timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: historial_requerimientos_oc; Type: TABLE; Schema: legal_management; Owner: -
--

CREATE TABLE legal_management.historial_requerimientos_oc (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    requerimiento_id uuid NOT NULL,
    accion character varying(50) NOT NULL,
    descripcion text,
    estado_anterior character varying(30),
    estado_nuevo character varying(30),
    usuario_nombre character varying(150),
    area_usuario character varying(100),
    fecha timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: notas_expediente; Type: TABLE; Schema: legal_management; Owner: -
--

CREATE TABLE legal_management.notas_expediente (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    expediente_id uuid NOT NULL,
    contenido text NOT NULL,
    tipo character varying(30) DEFAULT 'general'::character varying,
    autor_id uuid,
    autor_nombre character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT notas_expediente_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['importante'::character varying, 'seguimiento'::character varying, 'informacion'::character varying, 'general'::character varying, 'alerta'::character varying])::text[])))
);


--
-- Name: TABLE notas_expediente; Type: COMMENT; Schema: legal_management; Owner: -
--

COMMENT ON TABLE legal_management.notas_expediente IS 'Notas internas de los abogados sobre el expediente';


--
-- Name: COLUMN notas_expediente.tipo; Type: COMMENT; Schema: legal_management; Owner: -
--

COMMENT ON COLUMN legal_management.notas_expediente.tipo IS 'Tipo de nota: importante, seguimiento, informacion, general, alerta';


--
-- Name: organismos_control; Type: TABLE; Schema: legal_management; Owner: -
--

CREATE TABLE legal_management.organismos_control (
    id integer NOT NULL,
    sigla character varying(20) NOT NULL,
    nombre character varying(200) NOT NULL,
    descripcion text,
    activo boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: organismos_control_id_seq; Type: SEQUENCE; Schema: legal_management; Owner: -
--

CREATE SEQUENCE legal_management.organismos_control_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: organismos_control_id_seq; Type: SEQUENCE OWNED BY; Schema: legal_management; Owner: -
--

ALTER SEQUENCE legal_management.organismos_control_id_seq OWNED BY legal_management.organismos_control.id;


--
-- Name: pagos_coactivos; Type: TABLE; Schema: legal_management; Owner: -
--

CREATE TABLE legal_management.pagos_coactivos (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    proceso_id uuid NOT NULL,
    valor numeric(15,2) NOT NULL,
    fecha_pago timestamp without time zone DEFAULT now() NOT NULL,
    soporte_url text,
    origen character varying(50) DEFAULT 'MANUAL'::character varying,
    observaciones text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: pei_indicadores; Type: TABLE; Schema: legal_management; Owner: -
--

CREATE TABLE legal_management.pei_indicadores (
    id integer NOT NULL,
    nombre character varying(255) NOT NULL,
    descripcion text,
    eje_estrategico character varying(50) NOT NULL,
    meta_objetivo numeric(10,2) NOT NULL,
    unidad_medida character varying(20) DEFAULT 'PORCENTAJE'::character varying,
    fecha_inicio date NOT NULL,
    fecha_fin date NOT NULL,
    frecuencia_medicion character varying(20) DEFAULT 'MENSUAL'::character varying,
    responsable_id uuid,
    responsable_nombre character varying(200),
    estado character varying(20) DEFAULT 'ACTIVO'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    prioridad character varying(20) DEFAULT 'MEDIA'::character varying,
    tipo_indicador character varying(50) DEFAULT 'GESTION'::character varying
);


--
-- Name: pei_indicadores_id_seq; Type: SEQUENCE; Schema: legal_management; Owner: -
--

CREATE SEQUENCE legal_management.pei_indicadores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pei_indicadores_id_seq; Type: SEQUENCE OWNED BY; Schema: legal_management; Owner: -
--

ALTER SEQUENCE legal_management.pei_indicadores_id_seq OWNED BY legal_management.pei_indicadores.id;


--
-- Name: pei_registros_avance; Type: TABLE; Schema: legal_management; Owner: -
--

CREATE TABLE legal_management.pei_registros_avance (
    id integer NOT NULL,
    indicador_id integer,
    valor_reportado numeric(10,2) NOT NULL,
    porcentaje_avance numeric(5,2),
    observaciones text,
    evidencia_url text,
    fecha_registro timestamp without time zone DEFAULT now(),
    usuario_registra_id uuid
);


--
-- Name: pei_registros_avance_id_seq; Type: SEQUENCE; Schema: legal_management; Owner: -
--

CREATE SEQUENCE legal_management.pei_registros_avance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pei_registros_avance_id_seq; Type: SEQUENCE OWNED BY; Schema: legal_management; Owner: -
--

ALTER SEQUENCE legal_management.pei_registros_avance_id_seq OWNED BY legal_management.pei_registros_avance.id;


--
-- Name: planes_comentarios; Type: TABLE; Schema: legal_management; Owner: -
--

CREATE TABLE legal_management.planes_comentarios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_id uuid,
    mensaje text NOT NULL,
    usuario_id uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: planes_evidencias; Type: TABLE; Schema: legal_management; Owner: -
--

CREATE TABLE legal_management.planes_evidencias (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_id uuid,
    titulo character varying(150) NOT NULL,
    url_archivo text NOT NULL,
    tipo_archivo character varying(50),
    uploaded_by uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: planes_mejoramiento; Type: TABLE; Schema: legal_management; Owner: -
--

CREATE TABLE legal_management.planes_mejoramiento (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codigo character varying(50) NOT NULL,
    titulo character varying(255) NOT NULL,
    descripcion text,
    origen character varying(50) NOT NULL,
    origen_id uuid,
    responsable_id uuid,
    fecha_inicio date NOT NULL,
    fecha_fin_estimada date NOT NULL,
    fecha_cierre_real date,
    avance_porcentaje numeric(5,2) DEFAULT 0,
    presupuesto numeric(15,2) DEFAULT 0,
    estado character varying(20) DEFAULT 'ABIERTO'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    documento_origen character varying(255),
    area_responsable character varying(255),
    fecha_recepcion date,
    fecha_respuesta date,
    severidad character varying(50),
    responsable_nombre character varying(255),
    CONSTRAINT planes_mejoramiento_avance_porcentaje_check CHECK (((avance_porcentaje >= (0)::numeric) AND (avance_porcentaje <= (100)::numeric))),
    CONSTRAINT planes_mejoramiento_estado_check CHECK (((estado)::text = ANY ((ARRAY['ABIERTO'::character varying, 'EN_EJECUCION'::character varying, 'VENCIDO'::character varying, 'CERRADO'::character varying])::text[]))),
    CONSTRAINT planes_mejoramiento_origen_check CHECK (((origen)::text = ANY ((ARRAY['RIESGO'::character varying, 'HALLAZGO_AUDITORIA'::character varying, 'AUTOEVALUACION'::character varying, 'CONTRALORIA'::character varying, 'PROCURADURIA'::character varying, 'OCI'::character varying, 'AUDITORIA_EXTERNA'::character varying, 'OTRO'::character varying])::text[])))
);


--
-- Name: COLUMN planes_mejoramiento.documento_origen; Type: COMMENT; Schema: legal_management; Owner: -
--

COMMENT ON COLUMN legal_management.planes_mejoramiento.documento_origen IS 'Identificador o nombre del documento base (ej: Informe de Auditoría)';


--
-- Name: COLUMN planes_mejoramiento.area_responsable; Type: COMMENT; Schema: legal_management; Owner: -
--

COMMENT ON COLUMN legal_management.planes_mejoramiento.area_responsable IS 'Nombre del área encargada dentro de la entidad';


--
-- Name: COLUMN planes_mejoramiento.severidad; Type: COMMENT; Schema: legal_management; Owner: -
--

COMMENT ON COLUMN legal_management.planes_mejoramiento.severidad IS 'Nivel de criticidad: CRITICO, ALTO, MEDIO, BAJO';


--
-- Name: COLUMN planes_mejoramiento.responsable_nombre; Type: COMMENT; Schema: legal_management; Owner: -
--

COMMENT ON COLUMN legal_management.planes_mejoramiento.responsable_nombre IS 'Text name of responsible person when no abogado is linked';


--
-- Name: planes_seguimientos; Type: TABLE; Schema: legal_management; Owner: -
--

CREATE TABLE legal_management.planes_seguimientos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_id uuid,
    descripcion_avance text NOT NULL,
    porcentaje_reportado numeric(5,2),
    fecha_reporte timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    usuario_id uuid
);


--
-- Name: procesos_coactivos; Type: TABLE; Schema: legal_management; Owner: -
--

CREATE TABLE legal_management.procesos_coactivos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    radicado character varying(50) NOT NULL,
    deudor jsonb DEFAULT '{}'::jsonb NOT NULL,
    obligacion jsonb DEFAULT '{}'::jsonb NOT NULL,
    estado legal_management.estado_proceso_coactivo DEFAULT 'IDENTIFICADO'::legal_management.estado_proceso_coactivo,
    responsable character varying(255),
    documentos_adjuntos integer DEFAULT 0,
    notificaciones_enviadas integer DEFAULT 0,
    observaciones text,
    ultima_actuacion timestamp without time zone,
    fecha_creacion timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    valor_pagado numeric(15,2) DEFAULT 0,
    saldo_pendiente numeric(15,2) DEFAULT 0
);


--
-- Name: TABLE procesos_coactivos; Type: COMMENT; Schema: legal_management; Owner: -
--

COMMENT ON TABLE legal_management.procesos_coactivos IS 'Tabla de procesos de cobro coactivo - Módulo Gestión Legal';


--
-- Name: COLUMN procesos_coactivos.deudor; Type: COMMENT; Schema: legal_management; Owner: -
--

COMMENT ON COLUMN legal_management.procesos_coactivos.deudor IS 'Información del deudor en formato JSON (nombre, identificacion, telefono, email, direccion)';


--
-- Name: COLUMN procesos_coactivos.obligacion; Type: COMMENT; Schema: legal_management; Owner: -
--

COMMENT ON COLUMN legal_management.procesos_coactivos.obligacion IS 'Información de la obligación en formato JSON (concepto, valor, fechaVencimiento)';


--
-- Name: procesos_coactivos_adjuntos; Type: TABLE; Schema: legal_management; Owner: -
--

CREATE TABLE legal_management.procesos_coactivos_adjuntos (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    proceso_id uuid NOT NULL,
    nombre_original character varying NOT NULL,
    nombre_archivo character varying NOT NULL,
    mime_type character varying NOT NULL,
    tamano integer NOT NULL,
    fecha_creacion timestamp without time zone DEFAULT now() NOT NULL,
    tipo character varying(100),
    archivo_url character varying(500)
);


--
-- Name: requerimientos_oc; Type: TABLE; Schema: legal_management; Owner: -
--

CREATE TABLE legal_management.requerimientos_oc (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    radicado_externo character varying(100) NOT NULL,
    radicado_interno character varying(30) NOT NULL,
    organismo_id integer,
    tipo_requerimiento character varying(50) NOT NULL,
    asunto text NOT NULL,
    descripcion text,
    fecha_recepcion timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    unidad_tiempo character varying(20) DEFAULT 'DIAS_HABILES'::character varying,
    plazo_otorgado integer DEFAULT 15 NOT NULL,
    fecha_vencimiento timestamp without time zone NOT NULL,
    funcionario_responsable character varying(200),
    area_responsable character varying(150),
    abogado_asignado_id uuid,
    estado character varying(30) DEFAULT 'RECIBIDO'::character varying,
    prioridad character varying(15) DEFAULT 'NORMAL'::character varying,
    archivo_adjunto_url text,
    oficio_respuesta_url text,
    acuse_recibo_url text,
    fecha_respuesta timestamp without time zone,
    observaciones text,
    created_by character varying(150),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT requerimientos_oc_estado_check CHECK (((estado)::text = ANY ((ARRAY['RECIBIDO'::character varying, 'EN_ANALISIS'::character varying, 'EN_RESPUESTA'::character varying, 'ENVIADO'::character varying, 'CERRADO'::character varying, 'VENCIDO'::character varying])::text[]))),
    CONSTRAINT requerimientos_oc_prioridad_check CHECK (((prioridad)::text = ANY ((ARRAY['CRITICA'::character varying, 'ALTA'::character varying, 'NORMAL'::character varying, 'BAJA'::character varying])::text[]))),
    CONSTRAINT requerimientos_oc_tipo_requerimiento_check CHECK (((tipo_requerimiento)::text = ANY ((ARRAY['SOLICITUD_INFORMACION'::character varying, 'APERTURA_AUDITORIA'::character varying, 'NOTIFICACION_HALLAZGO'::character varying, 'PLAN_MEJORAMIENTO'::character varying, 'OTRO'::character varying])::text[]))),
    CONSTRAINT requerimientos_oc_unidad_tiempo_check CHECK (((unidad_tiempo)::text = ANY ((ARRAY['HORAS'::character varying, 'DIAS_CALENDARIO'::character varying, 'DIAS_HABILES'::character varying])::text[])))
);


--
-- Name: riesgo_historial; Type: TABLE; Schema: legal_management; Owner: -
--

CREATE TABLE legal_management.riesgo_historial (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    riesgo_id uuid NOT NULL,
    tipo_evento character varying(50) NOT NULL,
    descripcion text NOT NULL,
    campo_modificado character varying(100),
    valor_anterior text,
    valor_nuevo text,
    usuario character varying(200) DEFAULT 'Sistema'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE riesgo_historial; Type: COMMENT; Schema: legal_management; Owner: -
--

COMMENT ON TABLE legal_management.riesgo_historial IS 'Historial de cambios y eventos de riesgos para trazabilidad';


--
-- Name: COLUMN riesgo_historial.tipo_evento; Type: COMMENT; Schema: legal_management; Owner: -
--

COMMENT ON COLUMN legal_management.riesgo_historial.tipo_evento IS 'Tipo: CREACION, ACTUALIZACION, CAMBIO_ETAPA, CAMBIO_ZONA, ARCHIVADO, CONTROL_AGREGADO, etc.';


--
-- Name: COLUMN riesgo_historial.campo_modificado; Type: COMMENT; Schema: legal_management; Owner: -
--

COMMENT ON COLUMN legal_management.riesgo_historial.campo_modificado IS 'Campo que fue modificado (e.g. etapa, probabilidad, impacto)';


--
-- Name: COLUMN riesgo_historial.valor_anterior; Type: COMMENT; Schema: legal_management; Owner: -
--

COMMENT ON COLUMN legal_management.riesgo_historial.valor_anterior IS 'Valor antes del cambio';


--
-- Name: COLUMN riesgo_historial.valor_nuevo; Type: COMMENT; Schema: legal_management; Owner: -
--

COMMENT ON COLUMN legal_management.riesgo_historial.valor_nuevo IS 'Valor después del cambio';


--
-- Name: riesgos; Type: TABLE; Schema: legal_management; Owner: -
--

CREATE TABLE legal_management.riesgos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codigo character varying(30) NOT NULL,
    nombre character varying(255) NOT NULL,
    descripcion text NOT NULL,
    proceso character varying(100) NOT NULL,
    tipo_riesgo character varying(30) NOT NULL,
    etapa character varying(30) DEFAULT 'IDENTIFICADO'::character varying,
    probabilidad_inherente integer DEFAULT 3,
    impacto_inherente integer DEFAULT 3,
    zona_inherente character varying(20) DEFAULT 'MODERADO'::character varying,
    probabilidad_residual integer DEFAULT 3,
    impacto_residual integer DEFAULT 3,
    zona_residual character varying(20) DEFAULT 'MODERADO'::character varying,
    causas jsonb DEFAULT '[]'::jsonb,
    consecuencias jsonb DEFAULT '[]'::jsonb,
    controles_existentes jsonb DEFAULT '[]'::jsonb,
    plan_tratamiento jsonb DEFAULT '[]'::jsonb,
    responsable character varying(200) NOT NULL,
    responsable_id uuid,
    estado character varying(20) DEFAULT 'ACTIVO'::character varying,
    created_by character varying(200),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    cuantia_estimada numeric(15,2) DEFAULT 0,
    provision_contable numeric(15,2) DEFAULT 0,
    porcentaje_provision integer DEFAULT 0,
    fecha_calculo_provision timestamp without time zone,
    modulo_origen character varying(50),
    proceso_id uuid,
    proceso_radicado character varying(100),
    CONSTRAINT riesgos_estado_check CHECK (((estado)::text = ANY ((ARRAY['ACTIVO'::character varying, 'ARCHIVADO'::character varying, 'CERRADO'::character varying])::text[]))),
    CONSTRAINT riesgos_etapa_check CHECK (((etapa)::text = ANY ((ARRAY['IDENTIFICADO'::character varying, 'ANALIZADO'::character varying, 'VALORADO'::character varying, 'TRATAMIENTO'::character varying, 'MONITOREO'::character varying, 'CERRADO'::character varying, 'MATERIALIZADO'::character varying])::text[]))),
    CONSTRAINT riesgos_impacto_inherente_check CHECK (((impacto_inherente >= 1) AND (impacto_inherente <= 5))),
    CONSTRAINT riesgos_impacto_residual_check CHECK (((impacto_residual >= 1) AND (impacto_residual <= 5))),
    CONSTRAINT riesgos_probabilidad_inherente_check CHECK (((probabilidad_inherente >= 1) AND (probabilidad_inherente <= 5))),
    CONSTRAINT riesgos_probabilidad_residual_check CHECK (((probabilidad_residual >= 1) AND (probabilidad_residual <= 5))),
    CONSTRAINT riesgos_tipo_riesgo_check CHECK (((tipo_riesgo)::text = ANY ((ARRAY['GESTION'::character varying, 'CORRUPCION'::character varying, 'SEGURIDAD_DIGITAL'::character varying, 'FISCAL'::character varying])::text[]))),
    CONSTRAINT riesgos_zona_inherente_check CHECK (((zona_inherente)::text = ANY ((ARRAY['EXTREMO'::character varying, 'ALTO'::character varying, 'MODERADO'::character varying, 'BAJO'::character varying])::text[]))),
    CONSTRAINT riesgos_zona_residual_check CHECK (((zona_residual)::text = ANY ((ARRAY['EXTREMO'::character varying, 'ALTO'::character varying, 'MODERADO'::character varying, 'BAJO'::character varying])::text[])))
);


--
-- Name: COLUMN riesgos.cuantia_estimada; Type: COMMENT; Schema: legal_management; Owner: -
--

COMMENT ON COLUMN legal_management.riesgos.cuantia_estimada IS 'Valor monetario estimado del riesgo';


--
-- Name: COLUMN riesgos.provision_contable; Type: COMMENT; Schema: legal_management; Owner: -
--

COMMENT ON COLUMN legal_management.riesgos.provision_contable IS 'Provisión contable calculada = cuantía × porcentaje';


--
-- Name: COLUMN riesgos.porcentaje_provision; Type: COMMENT; Schema: legal_management; Owner: -
--

COMMENT ON COLUMN legal_management.riesgos.porcentaje_provision IS 'Porcentaje aplicado según zona: EXTREMO=100, ALTO=75, MODERADO=50, BAJO=25';


--
-- Name: COLUMN riesgos.fecha_calculo_provision; Type: COMMENT; Schema: legal_management; Owner: -
--

COMMENT ON COLUMN legal_management.riesgos.fecha_calculo_provision IS 'Fecha del último cálculo de provisión';


--
-- Name: COLUMN riesgos.modulo_origen; Type: COMMENT; Schema: legal_management; Owner: -
--

COMMENT ON COLUMN legal_management.riesgos.modulo_origen IS 'Módulo fuente: DEFENSA_JUDICIAL, JUZGAMIENTO, ASESORIA_JURIDICA, COACTIVOS, ORGANOS_CONTROL';


--
-- Name: COLUMN riesgos.proceso_id; Type: COMMENT; Schema: legal_management; Owner: -
--

COMMENT ON COLUMN legal_management.riesgos.proceso_id IS 'UUID del proceso asociado en el módulo correspondiente';


--
-- Name: COLUMN riesgos.proceso_radicado; Type: COMMENT; Schema: legal_management; Owner: -
--

COMMENT ON COLUMN legal_management.riesgos.proceso_radicado IS 'Radicado o número del proceso para referencia rápida';


--
-- Name: riesgos_historial; Type: TABLE; Schema: legal_management; Owner: -
--

CREATE TABLE legal_management.riesgos_historial (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    riesgo_id uuid NOT NULL,
    probabilidad integer NOT NULL,
    impacto integer NOT NULL,
    zona character varying(20) NOT NULL,
    motivo text,
    hito_procesal character varying(255),
    usuario character varying(200),
    fecha_evaluacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: seq_concepto_numero; Type: SEQUENCE; Schema: legal_management; Owner: -
--

CREATE SEQUENCE legal_management.seq_concepto_numero
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: seq_consulta_radicado; Type: SEQUENCE; Schema: legal_management; Owner: -
--

CREATE SEQUENCE legal_management.seq_consulta_radicado
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: seq_radicado_oc; Type: SEQUENCE; Schema: legal_management; Owner: -
--

CREATE SEQUENCE legal_management.seq_radicado_oc
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: solicitudes_insumos; Type: TABLE; Schema: legal_management; Owner: -
--

CREATE TABLE legal_management.solicitudes_insumos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    requerimiento_id uuid NOT NULL,
    area_destino character varying(150) NOT NULL,
    funcionario_destino character varying(200),
    email_destino character varying(150),
    descripcion_solicitud text NOT NULL,
    documentos_solicitados text,
    fecha_solicitud timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_vencimiento_interna timestamp without time zone NOT NULL,
    fecha_respuesta timestamp without time zone,
    estado character varying(25) DEFAULT 'PENDIENTE'::character varying,
    documentos_entregados_url text,
    comentario_respuesta text,
    solicitado_por character varying(150),
    respondido_por character varying(150),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT solicitudes_insumos_estado_check CHECK (((estado)::text = ANY ((ARRAY['PENDIENTE'::character varying, 'EN_PROCESO'::character varying, 'ENTREGADO'::character varying, 'RECHAZADO'::character varying, 'VENCIDO'::character varying])::text[])))
);


--
-- Name: system_configurations; Type: TABLE; Schema: legal_management; Owner: -
--

CREATE TABLE legal_management.system_configurations (
    key character varying NOT NULL,
    module character varying NOT NULL,
    value jsonb NOT NULL,
    description text,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: tareas_expediente; Type: TABLE; Schema: legal_management; Owner: -
--

CREATE TABLE legal_management.tareas_expediente (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    expediente_id uuid NOT NULL,
    titulo character varying(255) NOT NULL,
    descripcion text,
    fecha_vencimiento timestamp without time zone,
    prioridad character varying(20) DEFAULT 'media'::character varying,
    estado character varying(30) DEFAULT 'pendiente'::character varying,
    responsable_id uuid,
    responsable_nombre character varying(255),
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_completada timestamp without time zone,
    creado_por character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT tareas_expediente_estado_check CHECK (((estado)::text = ANY ((ARRAY['pendiente'::character varying, 'en_proceso'::character varying, 'completada'::character varying, 'cancelada'::character varying])::text[]))),
    CONSTRAINT tareas_expediente_prioridad_check CHECK (((prioridad)::text = ANY ((ARRAY['alta'::character varying, 'media'::character varying, 'baja'::character varying])::text[])))
);


--
-- Name: TABLE tareas_expediente; Type: COMMENT; Schema: legal_management; Owner: -
--

COMMENT ON TABLE legal_management.tareas_expediente IS 'Tareas asociadas a expedientes judiciales para control de actividades';


--
-- Name: COLUMN tareas_expediente.prioridad; Type: COMMENT; Schema: legal_management; Owner: -
--

COMMENT ON COLUMN legal_management.tareas_expediente.prioridad IS 'Nivel de prioridad: alta, media, baja';


--
-- Name: COLUMN tareas_expediente.estado; Type: COMMENT; Schema: legal_management; Owner: -
--

COMMENT ON COLUMN legal_management.tareas_expediente.estado IS 'Estado de la tarea: pendiente, en_proceso, completada, cancelada';


--
-- Name: terminos_procesales; Type: TABLE; Schema: legal_management; Owner: -
--

CREATE TABLE legal_management.terminos_procesales (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    origen_modulo character varying(50) NOT NULL,
    referencia_id uuid NOT NULL,
    numero_radicado character varying(100),
    nombre_actuacion character varying(255) NOT NULL,
    fecha_base timestamp with time zone NOT NULL,
    dias_termino integer NOT NULL,
    tipo_dias character varying(20) DEFAULT 'HABILES'::character varying,
    fecha_vencimiento timestamp with time zone NOT NULL,
    fecha_alerta_preventiva timestamp with time zone,
    fecha_alerta_critica timestamp with time zone,
    estado character varying(20) DEFAULT 'PENDIENTE'::character varying,
    prioridad character varying(10) DEFAULT 'MEDIA'::character varying,
    responsable_id uuid,
    observaciones text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    closed_at timestamp with time zone,
    responsable_nombre character varying(255),
    CONSTRAINT terminos_procesales_estado_check CHECK (((estado)::text = ANY ((ARRAY['PENDIENTE'::character varying, 'CUMPLIDO'::character varying, 'VENCIDO'::character varying, 'SUSPENDIDO'::character varying])::text[]))),
    CONSTRAINT terminos_procesales_origen_modulo_check CHECK (((origen_modulo)::text = ANY ((ARRAY['DEFENSA'::character varying, 'JUZGAMIENTO'::character varying, 'ASESORIA'::character varying, 'MANUAL'::character varying, 'ORGANOS_CONTROL'::character varying, 'PROCESOS_COACTIVOS'::character varying])::text[]))),
    CONSTRAINT terminos_procesales_prioridad_check CHECK (((prioridad)::text = ANY ((ARRAY['ALTA'::character varying, 'MEDIA'::character varying, 'BAJA'::character varying])::text[])))
);


--
-- Name: TABLE terminos_procesales; Type: COMMENT; Schema: legal_management; Owner: -
--

COMMENT ON TABLE legal_management.terminos_procesales IS 'Torre de control transversal para vencimientos de términos procesales de todos los módulos';


--
-- Name: organismos_control id; Type: DEFAULT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.organismos_control ALTER COLUMN id SET DEFAULT nextval('legal_management.organismos_control_id_seq'::regclass);


--
-- Name: pei_indicadores id; Type: DEFAULT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.pei_indicadores ALTER COLUMN id SET DEFAULT nextval('legal_management.pei_indicadores_id_seq'::regclass);


--
-- Name: pei_registros_avance id; Type: DEFAULT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.pei_registros_avance ALTER COLUMN id SET DEFAULT nextval('legal_management.pei_registros_avance_id_seq'::regclass);


--
-- Name: consulta_juridica_historial PK_consulta_juridica_historial; Type: CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.consulta_juridica_historial
    ADD CONSTRAINT "PK_consulta_juridica_historial" PRIMARY KEY (id);


--
-- Name: procesos_coactivos_adjuntos PK_procesos_coactivos_adjuntos; Type: CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.procesos_coactivos_adjuntos
    ADD CONSTRAINT "PK_procesos_coactivos_adjuntos" PRIMARY KEY (id);


--
-- Name: system_configurations PK_system_configurations; Type: CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.system_configurations
    ADD CONSTRAINT "PK_system_configurations" PRIMARY KEY (key);


--
-- Name: abogados abogados_email_key; Type: CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.abogados
    ADD CONSTRAINT abogados_email_key UNIQUE (email);


--
-- Name: abogados abogados_pkey; Type: CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.abogados
    ADD CONSTRAINT abogados_pkey PRIMARY KEY (id);


--
-- Name: actas actas_pkey; Type: CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.actas
    ADD CONSTRAINT actas_pkey PRIMARY KEY (id);


--
-- Name: actuaciones actuaciones_pkey; Type: CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.actuaciones
    ADD CONSTRAINT actuaciones_pkey PRIMARY KEY (id);


--
-- Name: adjuntos_correo adjuntos_correo_pkey; Type: CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.adjuntos_correo
    ADD CONSTRAINT adjuntos_correo_pkey PRIMARY KEY (id);


--
-- Name: audiencias audiencias_pkey; Type: CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.audiencias
    ADD CONSTRAINT audiencias_pkey PRIMARY KEY (id);


--
-- Name: autos autos_pkey; Type: CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.autos
    ADD CONSTRAINT autos_pkey PRIMARY KEY (id);


--
-- Name: avances_hallazgo avances_hallazgo_pkey; Type: CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.avances_hallazgo
    ADD CONSTRAINT avances_hallazgo_pkey PRIMARY KEY (id);


--
-- Name: coactivos_historial coactivos_historial_pkey; Type: CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.coactivos_historial
    ADD CONSTRAINT coactivos_historial_pkey PRIMARY KEY (id);


--
-- Name: comentarios_consulta comentarios_consulta_pkey; Type: CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.comentarios_consulta
    ADD CONSTRAINT comentarios_consulta_pkey PRIMARY KEY (id);


--
-- Name: comentarios_oc comentarios_oc_pkey; Type: CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.comentarios_oc
    ADD CONSTRAINT comentarios_oc_pkey PRIMARY KEY (id);


--
-- Name: comentarios comentarios_pkey; Type: CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.comentarios
    ADD CONSTRAINT comentarios_pkey PRIMARY KEY (id);


--
-- Name: conceptos_juridicos conceptos_juridicos_numero_concepto_key; Type: CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.conceptos_juridicos
    ADD CONSTRAINT conceptos_juridicos_numero_concepto_key UNIQUE (numero_concepto);


--
-- Name: conceptos_juridicos conceptos_juridicos_pkey; Type: CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.conceptos_juridicos
    ADD CONSTRAINT conceptos_juridicos_pkey PRIMARY KEY (id);


--
-- Name: consultas_juridicas consultas_juridicas_numero_radicado_key; Type: CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.consultas_juridicas
    ADD CONSTRAINT consultas_juridicas_numero_radicado_key UNIQUE (numero_radicado);


--
-- Name: consultas_juridicas consultas_juridicas_pkey; Type: CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.consultas_juridicas
    ADD CONSTRAINT consultas_juridicas_pkey PRIMARY KEY (id);


--
-- Name: correos_juridicos correos_juridicos_graph_message_id_key; Type: CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.correos_juridicos
    ADD CONSTRAINT correos_juridicos_graph_message_id_key UNIQUE (graph_message_id);


--
-- Name: correos_juridicos correos_juridicos_pkey; Type: CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.correos_juridicos
    ADD CONSTRAINT correos_juridicos_pkey PRIMARY KEY (id);


--
-- Name: decisiones_disciplinarias decisiones_disciplinarias_pkey; Type: CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.decisiones_disciplinarias
    ADD CONSTRAINT decisiones_disciplinarias_pkey PRIMARY KEY (id);


--
-- Name: documentos_consulta documentos_consulta_pkey; Type: CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.documentos_consulta
    ADD CONSTRAINT documentos_consulta_pkey PRIMARY KEY (id);


--
-- Name: documentos_oc documentos_oc_pkey; Type: CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.documentos_oc
    ADD CONSTRAINT documentos_oc_pkey PRIMARY KEY (id);


--
-- Name: documentos documentos_pkey; Type: CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.documentos
    ADD CONSTRAINT documentos_pkey PRIMARY KEY (id);


--
-- Name: evidencias evidencias_pkey; Type: CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.evidencias
    ADD CONSTRAINT evidencias_pkey PRIMARY KEY (id);


--
-- Name: excepciones_procesales excepciones_procesales_pkey; Type: CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.excepciones_procesales
    ADD CONSTRAINT excepciones_procesales_pkey PRIMARY KEY (id);


--
-- Name: expedientes expedientes_pkey; Type: CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.expedientes
    ADD CONSTRAINT expedientes_pkey PRIMARY KEY (id);


--
-- Name: expedientes expedientes_radicado_key; Type: CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.expedientes
    ADD CONSTRAINT expedientes_radicado_key UNIQUE (radicado);


--
-- Name: hallazgos hallazgos_codigo_hallazgo_key; Type: CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.hallazgos
    ADD CONSTRAINT hallazgos_codigo_hallazgo_key UNIQUE (codigo_hallazgo);


--
-- Name: hallazgos hallazgos_pkey; Type: CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.hallazgos
    ADD CONSTRAINT hallazgos_pkey PRIMARY KEY (id);


--
-- Name: historial_consultas historial_consultas_pkey; Type: CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.historial_consultas
    ADD CONSTRAINT historial_consultas_pkey PRIMARY KEY (id);


--
-- Name: historial_requerimientos_oc historial_requerimientos_oc_pkey; Type: CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.historial_requerimientos_oc
    ADD CONSTRAINT historial_requerimientos_oc_pkey PRIMARY KEY (id);


--
-- Name: notas_expediente notas_expediente_pkey; Type: CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.notas_expediente
    ADD CONSTRAINT notas_expediente_pkey PRIMARY KEY (id);


--
-- Name: organismos_control organismos_control_pkey; Type: CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.organismos_control
    ADD CONSTRAINT organismos_control_pkey PRIMARY KEY (id);


--
-- Name: organismos_control organismos_control_sigla_key; Type: CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.organismos_control
    ADD CONSTRAINT organismos_control_sigla_key UNIQUE (sigla);


--
-- Name: pagos_coactivos pagos_coactivos_pkey; Type: CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.pagos_coactivos
    ADD CONSTRAINT pagos_coactivos_pkey PRIMARY KEY (id);


--
-- Name: pei_indicadores pei_indicadores_pkey; Type: CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.pei_indicadores
    ADD CONSTRAINT pei_indicadores_pkey PRIMARY KEY (id);


--
-- Name: pei_registros_avance pei_registros_avance_pkey; Type: CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.pei_registros_avance
    ADD CONSTRAINT pei_registros_avance_pkey PRIMARY KEY (id);


--
-- Name: planes_comentarios planes_comentarios_pkey; Type: CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.planes_comentarios
    ADD CONSTRAINT planes_comentarios_pkey PRIMARY KEY (id);


--
-- Name: planes_evidencias planes_evidencias_pkey; Type: CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.planes_evidencias
    ADD CONSTRAINT planes_evidencias_pkey PRIMARY KEY (id);


--
-- Name: planes_mejoramiento planes_mejoramiento_codigo_key; Type: CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.planes_mejoramiento
    ADD CONSTRAINT planes_mejoramiento_codigo_key UNIQUE (codigo);


--
-- Name: planes_mejoramiento planes_mejoramiento_pkey; Type: CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.planes_mejoramiento
    ADD CONSTRAINT planes_mejoramiento_pkey PRIMARY KEY (id);


--
-- Name: planes_seguimientos planes_seguimientos_pkey; Type: CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.planes_seguimientos
    ADD CONSTRAINT planes_seguimientos_pkey PRIMARY KEY (id);


--
-- Name: procesos_coactivos procesos_coactivos_pkey; Type: CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.procesos_coactivos
    ADD CONSTRAINT procesos_coactivos_pkey PRIMARY KEY (id);


--
-- Name: procesos_coactivos procesos_coactivos_radicado_key; Type: CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.procesos_coactivos
    ADD CONSTRAINT procesos_coactivos_radicado_key UNIQUE (radicado);


--
-- Name: requerimientos_oc requerimientos_oc_pkey; Type: CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.requerimientos_oc
    ADD CONSTRAINT requerimientos_oc_pkey PRIMARY KEY (id);


--
-- Name: requerimientos_oc requerimientos_oc_radicado_interno_key; Type: CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.requerimientos_oc
    ADD CONSTRAINT requerimientos_oc_radicado_interno_key UNIQUE (radicado_interno);


--
-- Name: riesgo_historial riesgo_historial_pkey; Type: CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.riesgo_historial
    ADD CONSTRAINT riesgo_historial_pkey PRIMARY KEY (id);


--
-- Name: riesgos riesgos_codigo_key; Type: CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.riesgos
    ADD CONSTRAINT riesgos_codigo_key UNIQUE (codigo);


--
-- Name: riesgos_historial riesgos_historial_pkey; Type: CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.riesgos_historial
    ADD CONSTRAINT riesgos_historial_pkey PRIMARY KEY (id);


--
-- Name: riesgos riesgos_pkey; Type: CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.riesgos
    ADD CONSTRAINT riesgos_pkey PRIMARY KEY (id);


--
-- Name: solicitudes_insumos solicitudes_insumos_pkey; Type: CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.solicitudes_insumos
    ADD CONSTRAINT solicitudes_insumos_pkey PRIMARY KEY (id);


--
-- Name: tareas_expediente tareas_expediente_pkey; Type: CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.tareas_expediente
    ADD CONSTRAINT tareas_expediente_pkey PRIMARY KEY (id);


--
-- Name: terminos_procesales terminos_procesales_pkey; Type: CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.terminos_procesales
    ADD CONSTRAINT terminos_procesales_pkey PRIMARY KEY (id);


--
-- Name: IDX_documento_consulta_id; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX "IDX_documento_consulta_id" ON legal_management.documentos_consulta USING btree (consulta_id);


--
-- Name: IDX_procesos_coactivos_adjuntos_proceso_id; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX "IDX_procesos_coactivos_adjuntos_proceso_id" ON legal_management.procesos_coactivos_adjuntos USING btree (proceso_id);


--
-- Name: idx_actas_expediente_id; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_actas_expediente_id ON legal_management.actas USING btree (expediente_id);


--
-- Name: idx_actuaciones_expediente; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_actuaciones_expediente ON legal_management.actuaciones USING btree (expediente_id);


--
-- Name: idx_actuaciones_referencia; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_actuaciones_referencia ON legal_management.actuaciones USING btree (referencia_id);


--
-- Name: idx_adjuntos_correo_id; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_adjuntos_correo_id ON legal_management.adjuntos_correo USING btree (correo_id);


--
-- Name: idx_adjuntos_graph_message; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_adjuntos_graph_message ON legal_management.adjuntos_correo USING btree (graph_message_id);


--
-- Name: idx_autos_expediente_id; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_autos_expediente_id ON legal_management.autos USING btree (expediente_id);


--
-- Name: idx_coactivos_historial_proceso; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_coactivos_historial_proceso ON legal_management.coactivos_historial USING btree (proceso_id);


--
-- Name: idx_comentarios_consulta_id; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_comentarios_consulta_id ON legal_management.comentarios_consulta USING btree (consulta_id);


--
-- Name: idx_comentarios_expediente; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_comentarios_expediente ON legal_management.comentarios USING btree (expediente_id);


--
-- Name: idx_comentarios_oc_fecha; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_comentarios_oc_fecha ON legal_management.comentarios_oc USING btree (created_at DESC);


--
-- Name: idx_comentarios_oc_req; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_comentarios_oc_req ON legal_management.comentarios_oc USING btree (requerimiento_id);


--
-- Name: idx_conceptos_banco; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_conceptos_banco ON legal_management.conceptos_juridicos USING btree (visible_banco) WHERE (visible_banco = true);


--
-- Name: idx_conceptos_consulta; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_conceptos_consulta ON legal_management.conceptos_juridicos USING btree (consulta_id);


--
-- Name: idx_conceptos_estado; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_conceptos_estado ON legal_management.conceptos_juridicos USING btree (estado);


--
-- Name: idx_consultas_abogado; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_consultas_abogado ON legal_management.consultas_juridicas USING btree (abogado_asignado_id);


--
-- Name: idx_consultas_area; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_consultas_area ON legal_management.consultas_juridicas USING btree (area_solicitante);


--
-- Name: idx_consultas_estado; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_consultas_estado ON legal_management.consultas_juridicas USING btree (estado);


--
-- Name: idx_consultas_fecha; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_consultas_fecha ON legal_management.consultas_juridicas USING btree (fecha_radicacion);


--
-- Name: idx_consultas_fecha_maxima; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_consultas_fecha_maxima ON legal_management.consultas_juridicas USING btree (fecha_maxima_respuesta);


--
-- Name: idx_consultas_materia; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_consultas_materia ON legal_management.consultas_juridicas USING btree (materia_juridica);


--
-- Name: idx_consultas_tema; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_consultas_tema ON legal_management.consultas_juridicas USING btree (tema_principal);


--
-- Name: idx_correos_juridicos_archivado; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_correos_juridicos_archivado ON legal_management.correos_juridicos USING btree (archivado);


--
-- Name: idx_correos_juridicos_fecha; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_correos_juridicos_fecha ON legal_management.correos_juridicos USING btree (fecha_recepcion DESC);


--
-- Name: idx_correos_juridicos_leido; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_correos_juridicos_leido ON legal_management.correos_juridicos USING btree (leido);


--
-- Name: idx_correos_juridicos_tipo; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_correos_juridicos_tipo ON legal_management.correos_juridicos USING btree (tipo);


--
-- Name: idx_correos_juridicos_urgente; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_correos_juridicos_urgente ON legal_management.correos_juridicos USING btree (urgente);


--
-- Name: idx_decisiones_expediente_id; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_decisiones_expediente_id ON legal_management.decisiones_disciplinarias USING btree (expediente_id);


--
-- Name: idx_decisiones_fecha; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_decisiones_fecha ON legal_management.decisiones_disciplinarias USING btree (fecha DESC);


--
-- Name: idx_decisiones_tipo; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_decisiones_tipo ON legal_management.decisiones_disciplinarias USING btree (tipo_decision);


--
-- Name: idx_documentos_consulta_consulta; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_documentos_consulta_consulta ON legal_management.documentos_consulta USING btree (consulta_id);


--
-- Name: idx_documentos_consulta_tipo; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_documentos_consulta_tipo ON legal_management.documentos_consulta USING btree (tipo_documento);


--
-- Name: idx_documentos_expediente; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_documentos_expediente ON legal_management.documentos USING btree (expediente_id);


--
-- Name: idx_documentos_fecha; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_documentos_fecha ON legal_management.documentos USING btree (fecha_documento);


--
-- Name: idx_documentos_oc_req; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_documentos_oc_req ON legal_management.documentos_oc USING btree (requerimiento_id);


--
-- Name: idx_documentos_oc_tipo; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_documentos_oc_tipo ON legal_management.documentos_oc USING btree (tipo_documento);


--
-- Name: idx_documentos_tipo; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_documentos_tipo ON legal_management.documentos USING btree (tipo);


--
-- Name: idx_evidencias_expediente_id; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_evidencias_expediente_id ON legal_management.evidencias USING btree (expediente_id);


--
-- Name: idx_excepciones_estado; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_excepciones_estado ON legal_management.excepciones_procesales USING btree (estado);


--
-- Name: idx_excepciones_expediente; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_excepciones_expediente ON legal_management.excepciones_procesales USING btree (expediente_id);


--
-- Name: idx_excepciones_tipo; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_excepciones_tipo ON legal_management.excepciones_procesales USING btree (tipo);


--
-- Name: idx_hallazgos_estado; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_hallazgos_estado ON legal_management.hallazgos USING btree (estado);


--
-- Name: idx_hallazgos_fecha; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_hallazgos_fecha ON legal_management.hallazgos USING btree (fecha_compromiso);


--
-- Name: idx_hallazgos_req; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_hallazgos_req ON legal_management.hallazgos USING btree (requerimiento_id);


--
-- Name: idx_historial_oc_fecha; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_historial_oc_fecha ON legal_management.historial_requerimientos_oc USING btree (fecha);


--
-- Name: idx_historial_oc_req; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_historial_oc_req ON legal_management.historial_requerimientos_oc USING btree (requerimiento_id);


--
-- Name: idx_insumos_area; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_insumos_area ON legal_management.solicitudes_insumos USING btree (area_destino);


--
-- Name: idx_insumos_estado; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_insumos_estado ON legal_management.solicitudes_insumos USING btree (estado);


--
-- Name: idx_insumos_req; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_insumos_req ON legal_management.solicitudes_insumos USING btree (requerimiento_id);


--
-- Name: idx_notas_created; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_notas_created ON legal_management.notas_expediente USING btree (created_at DESC);


--
-- Name: idx_notas_expediente_id; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_notas_expediente_id ON legal_management.notas_expediente USING btree (expediente_id);


--
-- Name: idx_notas_tipo; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_notas_tipo ON legal_management.notas_expediente USING btree (tipo);


--
-- Name: idx_pagos_coactivos_proceso; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_pagos_coactivos_proceso ON legal_management.pagos_coactivos USING btree (proceso_id);


--
-- Name: idx_pei_eje; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_pei_eje ON legal_management.pei_indicadores USING btree (eje_estrategico);


--
-- Name: idx_pei_estado; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_pei_estado ON legal_management.pei_indicadores USING btree (estado);


--
-- Name: idx_planes_estado; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_planes_estado ON legal_management.planes_mejoramiento USING btree (estado);


--
-- Name: idx_planes_origen_id; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_planes_origen_id ON legal_management.planes_mejoramiento USING btree (origen_id);


--
-- Name: idx_procesos_coactivos_deudor; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_procesos_coactivos_deudor ON legal_management.procesos_coactivos USING gin (deudor);


--
-- Name: idx_procesos_coactivos_estado; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_procesos_coactivos_estado ON legal_management.procesos_coactivos USING btree (estado);


--
-- Name: idx_procesos_coactivos_fecha; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_procesos_coactivos_fecha ON legal_management.procesos_coactivos USING btree (fecha_creacion DESC);


--
-- Name: idx_procesos_coactivos_radicado; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_procesos_coactivos_radicado ON legal_management.procesos_coactivos USING btree (radicado);


--
-- Name: idx_req_oc_abogado; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_req_oc_abogado ON legal_management.requerimientos_oc USING btree (abogado_asignado_id);


--
-- Name: idx_req_oc_estado; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_req_oc_estado ON legal_management.requerimientos_oc USING btree (estado);


--
-- Name: idx_req_oc_organismo; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_req_oc_organismo ON legal_management.requerimientos_oc USING btree (organismo_id);


--
-- Name: idx_req_oc_vencimiento; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_req_oc_vencimiento ON legal_management.requerimientos_oc USING btree (fecha_vencimiento);


--
-- Name: idx_riesgo_historial_created_at; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_riesgo_historial_created_at ON legal_management.riesgo_historial USING btree (created_at DESC);


--
-- Name: idx_riesgo_historial_riesgo_id; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_riesgo_historial_riesgo_id ON legal_management.riesgo_historial USING btree (riesgo_id);


--
-- Name: idx_riesgos_codigo; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_riesgos_codigo ON legal_management.riesgos USING btree (codigo);


--
-- Name: idx_riesgos_estado; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_riesgos_estado ON legal_management.riesgos USING btree (estado);


--
-- Name: idx_riesgos_etapa; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_riesgos_etapa ON legal_management.riesgos USING btree (etapa);


--
-- Name: idx_riesgos_historial_fecha; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_riesgos_historial_fecha ON legal_management.riesgos_historial USING btree (fecha_evaluacion DESC);


--
-- Name: idx_riesgos_historial_riesgo; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_riesgos_historial_riesgo ON legal_management.riesgos_historial USING btree (riesgo_id);


--
-- Name: idx_riesgos_modulo_origen; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_riesgos_modulo_origen ON legal_management.riesgos USING btree (modulo_origen);


--
-- Name: idx_riesgos_proceso; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_riesgos_proceso ON legal_management.riesgos USING btree (proceso);


--
-- Name: idx_riesgos_proceso_id; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_riesgos_proceso_id ON legal_management.riesgos USING btree (proceso_id);


--
-- Name: idx_riesgos_proceso_radicado; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_riesgos_proceso_radicado ON legal_management.riesgos USING btree (proceso_radicado);


--
-- Name: idx_riesgos_tipo; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_riesgos_tipo ON legal_management.riesgos USING btree (tipo_riesgo);


--
-- Name: idx_riesgos_zona; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_riesgos_zona ON legal_management.riesgos USING btree (zona_residual);


--
-- Name: idx_tareas_estado; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_tareas_estado ON legal_management.tareas_expediente USING btree (estado);


--
-- Name: idx_tareas_expediente_id; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_tareas_expediente_id ON legal_management.tareas_expediente USING btree (expediente_id);


--
-- Name: idx_tareas_responsable; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_tareas_responsable ON legal_management.tareas_expediente USING btree (responsable_id);


--
-- Name: idx_tareas_vencimiento; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_tareas_vencimiento ON legal_management.tareas_expediente USING btree (fecha_vencimiento);


--
-- Name: idx_terminos_estado; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_terminos_estado ON legal_management.terminos_procesales USING btree (estado);


--
-- Name: idx_terminos_origen; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_terminos_origen ON legal_management.terminos_procesales USING btree (origen_modulo);


--
-- Name: idx_terminos_referencia; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_terminos_referencia ON legal_management.terminos_procesales USING btree (referencia_id);


--
-- Name: idx_terminos_responsable; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_terminos_responsable ON legal_management.terminos_procesales USING btree (responsable_id);


--
-- Name: idx_terminos_vencimiento; Type: INDEX; Schema: legal_management; Owner: -
--

CREATE INDEX idx_terminos_vencimiento ON legal_management.terminos_procesales USING btree (fecha_vencimiento);


--
-- Name: comentarios_oc trg_comentarios_oc_updated; Type: TRIGGER; Schema: legal_management; Owner: -
--

CREATE TRIGGER trg_comentarios_oc_updated BEFORE UPDATE ON legal_management.comentarios_oc FOR EACH ROW EXECUTE FUNCTION legal_management.update_oc_comentarios_timestamp();


--
-- Name: documentos_oc trg_documentos_oc_updated; Type: TRIGGER; Schema: legal_management; Owner: -
--

CREATE TRIGGER trg_documentos_oc_updated BEFORE UPDATE ON legal_management.documentos_oc FOR EACH ROW EXECUTE FUNCTION legal_management.update_oc_comentarios_timestamp();


--
-- Name: conceptos_juridicos trg_generar_numero_concepto; Type: TRIGGER; Schema: legal_management; Owner: -
--

CREATE TRIGGER trg_generar_numero_concepto BEFORE INSERT ON legal_management.conceptos_juridicos FOR EACH ROW EXECUTE FUNCTION legal_management.generar_numero_concepto();


--
-- Name: consultas_juridicas trg_generar_radicado; Type: TRIGGER; Schema: legal_management; Owner: -
--

CREATE TRIGGER trg_generar_radicado BEFORE INSERT ON legal_management.consultas_juridicas FOR EACH ROW EXECUTE FUNCTION legal_management.generar_radicado_consulta();


--
-- Name: requerimientos_oc trg_historial_oc; Type: TRIGGER; Schema: legal_management; Owner: -
--

CREATE TRIGGER trg_historial_oc AFTER INSERT OR UPDATE ON legal_management.requerimientos_oc FOR EACH ROW EXECUTE FUNCTION legal_management.registrar_historial_oc();


--
-- Name: notas_expediente trg_notas_updated_at; Type: TRIGGER; Schema: legal_management; Owner: -
--

CREATE TRIGGER trg_notas_updated_at BEFORE UPDATE ON legal_management.notas_expediente FOR EACH ROW EXECUTE FUNCTION legal_management.update_tareas_notas_timestamp();


--
-- Name: riesgos trg_riesgos_updated; Type: TRIGGER; Schema: legal_management; Owner: -
--

CREATE TRIGGER trg_riesgos_updated BEFORE UPDATE ON legal_management.riesgos FOR EACH ROW EXECUTE FUNCTION legal_management.update_riesgos_timestamp();


--
-- Name: tareas_expediente trg_tareas_updated_at; Type: TRIGGER; Schema: legal_management; Owner: -
--

CREATE TRIGGER trg_tareas_updated_at BEFORE UPDATE ON legal_management.tareas_expediente FOR EACH ROW EXECUTE FUNCTION legal_management.update_tareas_notas_timestamp();


--
-- Name: documentos_consulta trg_update_documentos_consulta; Type: TRIGGER; Schema: legal_management; Owner: -
--

CREATE TRIGGER trg_update_documentos_consulta BEFORE UPDATE ON legal_management.documentos_consulta FOR EACH ROW EXECUTE FUNCTION legal_management.update_documentos_consulta_updated_at();


--
-- Name: documentos trigger_documentos_updated_at; Type: TRIGGER; Schema: legal_management; Owner: -
--

CREATE TRIGGER trigger_documentos_updated_at BEFORE UPDATE ON legal_management.documentos FOR EACH ROW EXECUTE FUNCTION legal_management.update_documentos_updated_at();


--
-- Name: consulta_juridica_historial FK_consulta_juridica_historial_consulta; Type: FK CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.consulta_juridica_historial
    ADD CONSTRAINT "FK_consulta_juridica_historial_consulta" FOREIGN KEY (consulta_id) REFERENCES legal_management.consultas_juridicas(id) ON DELETE CASCADE;


--
-- Name: procesos_coactivos_adjuntos FK_procesos_coactivos_adjuntos_proceso; Type: FK CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.procesos_coactivos_adjuntos
    ADD CONSTRAINT "FK_procesos_coactivos_adjuntos_proceso" FOREIGN KEY (proceso_id) REFERENCES legal_management.procesos_coactivos(id) ON DELETE CASCADE;


--
-- Name: actas actas_expediente_id_fkey; Type: FK CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.actas
    ADD CONSTRAINT actas_expediente_id_fkey FOREIGN KEY (expediente_id) REFERENCES legal_management.expedientes(id) ON DELETE CASCADE;


--
-- Name: adjuntos_correo adjuntos_correo_correo_id_fkey; Type: FK CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.adjuntos_correo
    ADD CONSTRAINT adjuntos_correo_correo_id_fkey FOREIGN KEY (correo_id) REFERENCES legal_management.correos_juridicos(id) ON DELETE CASCADE;


--
-- Name: audiencias audiencias_abogado_id_fkey; Type: FK CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.audiencias
    ADD CONSTRAINT audiencias_abogado_id_fkey FOREIGN KEY (abogado_id) REFERENCES legal_management.abogados(id);


--
-- Name: audiencias audiencias_expediente_id_fkey; Type: FK CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.audiencias
    ADD CONSTRAINT audiencias_expediente_id_fkey FOREIGN KEY (expediente_id) REFERENCES legal_management.expedientes(id);


--
-- Name: avances_hallazgo avances_hallazgo_hallazgo_id_fkey; Type: FK CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.avances_hallazgo
    ADD CONSTRAINT avances_hallazgo_hallazgo_id_fkey FOREIGN KEY (hallazgo_id) REFERENCES legal_management.hallazgos(id) ON DELETE CASCADE;


--
-- Name: coactivos_historial coactivos_historial_proceso_id_fkey; Type: FK CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.coactivos_historial
    ADD CONSTRAINT coactivos_historial_proceso_id_fkey FOREIGN KEY (proceso_id) REFERENCES legal_management.procesos_coactivos(id) ON DELETE CASCADE;


--
-- Name: comentarios_consulta comentarios_consulta_consulta_id_fkey; Type: FK CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.comentarios_consulta
    ADD CONSTRAINT comentarios_consulta_consulta_id_fkey FOREIGN KEY (consulta_id) REFERENCES legal_management.consultas_juridicas(id) ON DELETE CASCADE;


--
-- Name: comentarios comentarios_expediente_id_fkey; Type: FK CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.comentarios
    ADD CONSTRAINT comentarios_expediente_id_fkey FOREIGN KEY (expediente_id) REFERENCES legal_management.expedientes(id) ON DELETE CASCADE;


--
-- Name: comentarios_oc comentarios_oc_autor_id_fkey; Type: FK CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.comentarios_oc
    ADD CONSTRAINT comentarios_oc_autor_id_fkey FOREIGN KEY (autor_id) REFERENCES legal_management.abogados(id);


--
-- Name: comentarios_oc comentarios_oc_requerimiento_id_fkey; Type: FK CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.comentarios_oc
    ADD CONSTRAINT comentarios_oc_requerimiento_id_fkey FOREIGN KEY (requerimiento_id) REFERENCES legal_management.requerimientos_oc(id) ON DELETE CASCADE;


--
-- Name: conceptos_juridicos conceptos_juridicos_abogado_redactor_id_fkey; Type: FK CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.conceptos_juridicos
    ADD CONSTRAINT conceptos_juridicos_abogado_redactor_id_fkey FOREIGN KEY (abogado_redactor_id) REFERENCES legal_management.abogados(id);


--
-- Name: conceptos_juridicos conceptos_juridicos_consulta_id_fkey; Type: FK CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.conceptos_juridicos
    ADD CONSTRAINT conceptos_juridicos_consulta_id_fkey FOREIGN KEY (consulta_id) REFERENCES legal_management.consultas_juridicas(id) ON DELETE CASCADE;


--
-- Name: consultas_juridicas consultas_juridicas_abogado_asignado_id_fkey; Type: FK CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.consultas_juridicas
    ADD CONSTRAINT consultas_juridicas_abogado_asignado_id_fkey FOREIGN KEY (abogado_asignado_id) REFERENCES legal_management.abogados(id);


--
-- Name: documentos_consulta documentos_consulta_consulta_id_fkey; Type: FK CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.documentos_consulta
    ADD CONSTRAINT documentos_consulta_consulta_id_fkey FOREIGN KEY (consulta_id) REFERENCES legal_management.consultas_juridicas(id) ON DELETE CASCADE;


--
-- Name: documentos documentos_expediente_id_fkey; Type: FK CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.documentos
    ADD CONSTRAINT documentos_expediente_id_fkey FOREIGN KEY (expediente_id) REFERENCES legal_management.expedientes(id) ON DELETE CASCADE;


--
-- Name: documentos_oc documentos_oc_requerimiento_id_fkey; Type: FK CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.documentos_oc
    ADD CONSTRAINT documentos_oc_requerimiento_id_fkey FOREIGN KEY (requerimiento_id) REFERENCES legal_management.requerimientos_oc(id) ON DELETE CASCADE;


--
-- Name: evidencias evidencias_expediente_id_fkey; Type: FK CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.evidencias
    ADD CONSTRAINT evidencias_expediente_id_fkey FOREIGN KEY (expediente_id) REFERENCES legal_management.expedientes(id) ON DELETE CASCADE;


--
-- Name: autos fk_autos_expediente; Type: FK CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.autos
    ADD CONSTRAINT fk_autos_expediente FOREIGN KEY (expediente_id) REFERENCES legal_management.expedientes(id) ON DELETE CASCADE;


--
-- Name: decisiones_disciplinarias fk_decisiones_expediente; Type: FK CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.decisiones_disciplinarias
    ADD CONSTRAINT fk_decisiones_expediente FOREIGN KEY (expediente_id) REFERENCES legal_management.expedientes(id) ON DELETE CASCADE;


--
-- Name: excepciones_procesales fk_excepcion_expediente; Type: FK CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.excepciones_procesales
    ADD CONSTRAINT fk_excepcion_expediente FOREIGN KEY (expediente_id) REFERENCES legal_management.expedientes(id) ON DELETE CASCADE;


--
-- Name: actuaciones fk_expediente; Type: FK CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.actuaciones
    ADD CONSTRAINT fk_expediente FOREIGN KEY (expediente_id) REFERENCES legal_management.expedientes(id) ON DELETE CASCADE;


--
-- Name: hallazgos hallazgos_requerimiento_id_fkey; Type: FK CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.hallazgos
    ADD CONSTRAINT hallazgos_requerimiento_id_fkey FOREIGN KEY (requerimiento_id) REFERENCES legal_management.requerimientos_oc(id) ON DELETE SET NULL;


--
-- Name: historial_consultas historial_consultas_consulta_id_fkey; Type: FK CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.historial_consultas
    ADD CONSTRAINT historial_consultas_consulta_id_fkey FOREIGN KEY (consulta_id) REFERENCES legal_management.consultas_juridicas(id) ON DELETE CASCADE;


--
-- Name: historial_requerimientos_oc historial_requerimientos_oc_requerimiento_id_fkey; Type: FK CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.historial_requerimientos_oc
    ADD CONSTRAINT historial_requerimientos_oc_requerimiento_id_fkey FOREIGN KEY (requerimiento_id) REFERENCES legal_management.requerimientos_oc(id) ON DELETE CASCADE;


--
-- Name: notas_expediente notas_expediente_autor_id_fkey; Type: FK CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.notas_expediente
    ADD CONSTRAINT notas_expediente_autor_id_fkey FOREIGN KEY (autor_id) REFERENCES legal_management.abogados(id);


--
-- Name: notas_expediente notas_expediente_expediente_id_fkey; Type: FK CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.notas_expediente
    ADD CONSTRAINT notas_expediente_expediente_id_fkey FOREIGN KEY (expediente_id) REFERENCES legal_management.expedientes(id) ON DELETE CASCADE;


--
-- Name: pagos_coactivos pagos_coactivos_proceso_id_fkey; Type: FK CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.pagos_coactivos
    ADD CONSTRAINT pagos_coactivos_proceso_id_fkey FOREIGN KEY (proceso_id) REFERENCES legal_management.procesos_coactivos(id) ON DELETE CASCADE;


--
-- Name: pei_registros_avance pei_registros_avance_indicador_id_fkey; Type: FK CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.pei_registros_avance
    ADD CONSTRAINT pei_registros_avance_indicador_id_fkey FOREIGN KEY (indicador_id) REFERENCES legal_management.pei_indicadores(id) ON DELETE CASCADE;


--
-- Name: planes_comentarios planes_comentarios_plan_id_fkey; Type: FK CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.planes_comentarios
    ADD CONSTRAINT planes_comentarios_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES legal_management.planes_mejoramiento(id) ON DELETE CASCADE;


--
-- Name: planes_evidencias planes_evidencias_plan_id_fkey; Type: FK CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.planes_evidencias
    ADD CONSTRAINT planes_evidencias_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES legal_management.planes_mejoramiento(id) ON DELETE CASCADE;


--
-- Name: planes_mejoramiento planes_mejoramiento_responsable_id_fkey; Type: FK CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.planes_mejoramiento
    ADD CONSTRAINT planes_mejoramiento_responsable_id_fkey FOREIGN KEY (responsable_id) REFERENCES legal_management.abogados(id);


--
-- Name: planes_seguimientos planes_seguimientos_plan_id_fkey; Type: FK CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.planes_seguimientos
    ADD CONSTRAINT planes_seguimientos_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES legal_management.planes_mejoramiento(id) ON DELETE CASCADE;


--
-- Name: requerimientos_oc requerimientos_oc_abogado_asignado_id_fkey; Type: FK CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.requerimientos_oc
    ADD CONSTRAINT requerimientos_oc_abogado_asignado_id_fkey FOREIGN KEY (abogado_asignado_id) REFERENCES legal_management.abogados(id);


--
-- Name: requerimientos_oc requerimientos_oc_organismo_id_fkey; Type: FK CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.requerimientos_oc
    ADD CONSTRAINT requerimientos_oc_organismo_id_fkey FOREIGN KEY (organismo_id) REFERENCES legal_management.organismos_control(id);


--
-- Name: riesgo_historial riesgo_historial_riesgo_id_fkey; Type: FK CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.riesgo_historial
    ADD CONSTRAINT riesgo_historial_riesgo_id_fkey FOREIGN KEY (riesgo_id) REFERENCES legal_management.riesgos(id) ON DELETE CASCADE;


--
-- Name: riesgos_historial riesgos_historial_riesgo_id_fkey; Type: FK CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.riesgos_historial
    ADD CONSTRAINT riesgos_historial_riesgo_id_fkey FOREIGN KEY (riesgo_id) REFERENCES legal_management.riesgos(id) ON DELETE CASCADE;


--
-- Name: riesgos riesgos_responsable_id_fkey; Type: FK CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.riesgos
    ADD CONSTRAINT riesgos_responsable_id_fkey FOREIGN KEY (responsable_id) REFERENCES legal_management.abogados(id);


--
-- Name: solicitudes_insumos solicitudes_insumos_requerimiento_id_fkey; Type: FK CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.solicitudes_insumos
    ADD CONSTRAINT solicitudes_insumos_requerimiento_id_fkey FOREIGN KEY (requerimiento_id) REFERENCES legal_management.requerimientos_oc(id) ON DELETE CASCADE;


--
-- Name: tareas_expediente tareas_expediente_expediente_id_fkey; Type: FK CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.tareas_expediente
    ADD CONSTRAINT tareas_expediente_expediente_id_fkey FOREIGN KEY (expediente_id) REFERENCES legal_management.expedientes(id) ON DELETE CASCADE;


--
-- Name: tareas_expediente tareas_expediente_responsable_id_fkey; Type: FK CONSTRAINT; Schema: legal_management; Owner: -
--

ALTER TABLE ONLY legal_management.tareas_expediente
    ADD CONSTRAINT tareas_expediente_responsable_id_fkey FOREIGN KEY (responsable_id) REFERENCES legal_management.abogados(id);


--
-- PostgreSQL database dump complete
--

