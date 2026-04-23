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
-- Name: auth; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA auth;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.actualizado_en = NOW();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: acreditaciones_programa; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.acreditaciones_programa (
    id bigint NOT NULL,
    programa_id bigint NOT NULL,
    tipo text NOT NULL,
    vigencia date NOT NULL,
    creado_en timestamp without time zone DEFAULT now(),
    actualizado_en timestamp without time zone DEFAULT now()
);


--
-- Name: acreditaciones_programa_id_seq; Type: SEQUENCE; Schema: auth; Owner: -
--

CREATE SEQUENCE auth.acreditaciones_programa_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: acreditaciones_programa_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: -
--

ALTER SEQUENCE auth.acreditaciones_programa_id_seq OWNED BY auth.acreditaciones_programa.id;


--
-- Name: geopolitica; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.geopolitica (
    id_geopolitica bigint NOT NULL,
    cod_geopolitica character varying(20) NOT NULL,
    cod_pais smallint,
    cod_departamento smallint,
    cod_ciudad smallint,
    nom_div_geopolitica character varying(250),
    num_habitantes bigint,
    tip_division character varying(6),
    cod_division character varying(6),
    cod_zon_geografica character varying(6),
    fec_ult_act date,
    fec_creacion date,
    usu_creacion character varying(20),
    usu_actualizacion character varying(20),
    cod_intl_pais character varying(3),
    cod_unso character varying(3),
    cod_dian character varying(3),
    cod_lat numeric(11,8),
    cod_lon numeric(11,8),
    id_padre bigint,
    cod_idioma character varying(3),
    nom_idioma character varying(250),
    cod_idm character varying(3),
    nom_div_geopolitica_tot character varying(200),
    cod_are_tel character varying(6),
    cod_pais_defecto character varying(3),
    ind_oculto smallint NOT NULL
);


--
-- Name: migrations_db_log; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.migrations_db_log (
    filename text NOT NULL,
    executed_at timestamp without time zone DEFAULT now()
);


--
-- Name: module; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.module (
    id_module uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    icon character varying(50) DEFAULT 'Shield'::character varying,
    color character varying(20) DEFAULT '#003DA5'::character varying,
    display_order integer DEFAULT 0,
    category character varying(30) DEFAULT 'backoffice'::character varying NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: permission; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.permission (
    id_permission uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(100) NOT NULL,
    name character varying(150) NOT NULL,
    description text,
    id_module uuid NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: personas; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.personas (
    id_tercero bigint NOT NULL,
    num_identificacion character varying(30) NOT NULL,
    tip_identificacion character varying(6) NOT NULL,
    nom_largo character varying(1000) NOT NULL,
    nom_tercero character varying(250) NOT NULL,
    pri_apellido character varying(250),
    seg_apellido character varying(250),
    gen_tercero character varying(6) NOT NULL,
    fec_nacimiento date,
    dir_residencia character varying(250),
    dir_email character varying(100),
    tel_celular character varying(20),
    fec_creacion date,
    fec_modificacion date,
    usu_creacion character varying(20),
    usu_modificacion character varying(20),
    id_seccional bigint,
    id_sede bigint
);


--
-- Name: programas_academicos; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.programas_academicos (
    id bigint NOT NULL,
    codigo text NOT NULL,
    nombre text NOT NULL,
    nivel_formacion text NOT NULL,
    modalidad text NOT NULL,
    jornada text NOT NULL,
    duracion_semestres integer NOT NULL,
    creditos integer NOT NULL,
    sede_id integer NOT NULL,
    facultad text,
    estado text DEFAULT 'Activo'::text NOT NULL,
    descripcion text,
    perfil_egresado text,
    requisitos_ingreso text[],
    costo_matricula numeric(14,2),
    estudiantes_activos integer DEFAULT 0,
    graduados integer DEFAULT 0,
    docentes_asignados integer DEFAULT 0,
    fecha_creacion date,
    ultima_actualizacion date DEFAULT CURRENT_DATE,
    creado_en timestamp without time zone DEFAULT now(),
    actualizado_en timestamp without time zone DEFAULT now()
);


--
-- Name: programas_academicos_id_seq; Type: SEQUENCE; Schema: auth; Owner: -
--

CREATE SEQUENCE auth.programas_academicos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: programas_academicos_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: -
--

ALTER SEQUENCE auth.programas_academicos_id_seq OWNED BY auth.programas_academicos.id;


--
-- Name: registros_calificados; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.registros_calificados (
    id bigint NOT NULL,
    programa_id bigint NOT NULL,
    numero text NOT NULL,
    fecha_emision date NOT NULL,
    vigencia date NOT NULL,
    creado_en timestamp without time zone DEFAULT now(),
    actualizado_en timestamp without time zone DEFAULT now()
);


--
-- Name: registros_calificados_id_seq; Type: SEQUENCE; Schema: auth; Owner: -
--

CREATE SEQUENCE auth.registros_calificados_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: registros_calificados_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: -
--

ALTER SEQUENCE auth.registros_calificados_id_seq OWNED BY auth.registros_calificados.id;


--
-- Name: role; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.role (
    id uuid NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    category character varying(20) NOT NULL,
    icon character varying(50) DEFAULT 'Shield'::character varying,
    color character varying(20) DEFAULT '#003DA5'::character varying,
    type character varying(20) DEFAULT 'personalizado'::character varying,
    is_active boolean DEFAULT true,
    requires_2fa boolean DEFAULT false,
    created_by character varying(100),
    updated_by character varying(100),
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: role_permissions; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.role_permissions (
    id_rol uuid NOT NULL,
    id_permission uuid NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: seccionales; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.seccionales (
    id_seccional bigint NOT NULL,
    nom_seccional character varying(100) NOT NULL,
    dir_seccional character varying(250),
    id_ubi_seccional bigint,
    fec_creacion date,
    fec_ult_act date,
    usu_creacion character varying(20),
    usu_actualizacion character varying(20),
    cod_seccional character varying(5),
    id_empresa bigint,
    nit_seccional character varying(15),
    fir_seccional1 bigint,
    fir_seccional2 bigint,
    fir_seccional3 bigint,
    fir_seccional4 bigint,
    id_dep_fir_cer1 bigint,
    id_dep_fir_cer2 bigint,
    id_dep_fir_cer3 bigint,
    id_dep_fir_cer4 bigint
);


--
-- Name: sedes; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sedes (
    id_sede bigint NOT NULL,
    id_empresa bigint NOT NULL,
    cod_sede character varying(5) NOT NULL,
    nom_sede character varying(50) NOT NULL,
    id_geopolitica bigint NOT NULL,
    dir_sede character varying(250),
    fec_ult_act date,
    fec_creacion date,
    usu_creacion character varying(20),
    usu_actualizacion character varying(20),
    cod_atributo character varying(10),
    id_seccional bigint,
    sede_act character varying(30),
    num_latitud numeric(32,29),
    num_longitud numeric(32,29),
    tel_sede character varying(50),
    email_sede character varying(100),
    capacidad_estudiantes integer,
    capacidad_docentes integer,
    permite_inscripciones boolean DEFAULT true,
    permite_matriculas boolean DEFAULT true,
    visible_portal boolean DEFAULT true,
    observaciones text
);


--
-- Name: user; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth."user" (
    id_user uuid NOT NULL,
    public_id uuid DEFAULT gen_random_uuid() NOT NULL,
    username character varying(100) NOT NULL,
    password_hash character varying(255) NOT NULL,
    id_tercero bigint,
    is_active boolean DEFAULT true,
    token integer,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: user_roles; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.user_roles (
    id_user uuid NOT NULL,
    id_rol uuid NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: acreditaciones_programa id; Type: DEFAULT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.acreditaciones_programa ALTER COLUMN id SET DEFAULT nextval('auth.acreditaciones_programa_id_seq'::regclass);


--
-- Name: programas_academicos id; Type: DEFAULT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.programas_academicos ALTER COLUMN id SET DEFAULT nextval('auth.programas_academicos_id_seq'::regclass);


--
-- Name: registros_calificados id; Type: DEFAULT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.registros_calificados ALTER COLUMN id SET DEFAULT nextval('auth.registros_calificados_id_seq'::regclass);


--
-- Name: acreditaciones_programa acreditaciones_programa_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.acreditaciones_programa
    ADD CONSTRAINT acreditaciones_programa_pkey PRIMARY KEY (id);


--
-- Name: geopolitica geopolitica_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.geopolitica
    ADD CONSTRAINT geopolitica_pkey PRIMARY KEY (id_geopolitica);


--
-- Name: migrations_db_log migrations_db_log_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.migrations_db_log
    ADD CONSTRAINT migrations_db_log_pkey PRIMARY KEY (filename);


--
-- Name: module module_code_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.module
    ADD CONSTRAINT module_code_key UNIQUE (code);


--
-- Name: module module_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.module
    ADD CONSTRAINT module_pkey PRIMARY KEY (id_module);


--
-- Name: permission permission_code_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.permission
    ADD CONSTRAINT permission_code_key UNIQUE (code);


--
-- Name: permission permission_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.permission
    ADD CONSTRAINT permission_pkey PRIMARY KEY (id_permission);


--
-- Name: personas personas_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.personas
    ADD CONSTRAINT personas_pkey PRIMARY KEY (id_tercero);


--
-- Name: programas_academicos programas_academicos_codigo_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.programas_academicos
    ADD CONSTRAINT programas_academicos_codigo_key UNIQUE (codigo);


--
-- Name: programas_academicos programas_academicos_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.programas_academicos
    ADD CONSTRAINT programas_academicos_pkey PRIMARY KEY (id);


--
-- Name: registros_calificados registros_calificados_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.registros_calificados
    ADD CONSTRAINT registros_calificados_pkey PRIMARY KEY (id);


--
-- Name: role role_code_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.role
    ADD CONSTRAINT role_code_key UNIQUE (code);


--
-- Name: role role_name_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.role
    ADD CONSTRAINT role_name_key UNIQUE (name);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id_rol, id_permission);


--
-- Name: role role_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.role
    ADD CONSTRAINT role_pkey PRIMARY KEY (id);


--
-- Name: seccionales seccionales_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.seccionales
    ADD CONSTRAINT seccionales_pkey PRIMARY KEY (id_seccional);


--
-- Name: sedes sedes_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sedes
    ADD CONSTRAINT sedes_pkey PRIMARY KEY (id_sede);


--
-- Name: registros_calificados uk_registro_programa; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.registros_calificados
    ADD CONSTRAINT uk_registro_programa UNIQUE (programa_id);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id_user);


--
-- Name: user user_public_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth."user"
    ADD CONSTRAINT user_public_id_key UNIQUE (public_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id_user, id_rol);


--
-- Name: idx_acreditaciones_programa; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_acreditaciones_programa ON auth.acreditaciones_programa USING btree (programa_id);


--
-- Name: idx_programas_estado; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_programas_estado ON auth.programas_academicos USING btree (estado);


--
-- Name: idx_programas_sede; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_programas_sede ON auth.programas_academicos USING btree (sede_id);


--
-- Name: acreditaciones_programa trg_acreditaciones_programa_updated_at; Type: TRIGGER; Schema: auth; Owner: -
--

CREATE TRIGGER trg_acreditaciones_programa_updated_at BEFORE UPDATE ON auth.acreditaciones_programa FOR EACH ROW EXECUTE FUNCTION auth.set_updated_at();


--
-- Name: programas_academicos trg_programas_academicos_updated_at; Type: TRIGGER; Schema: auth; Owner: -
--

CREATE TRIGGER trg_programas_academicos_updated_at BEFORE UPDATE ON auth.programas_academicos FOR EACH ROW EXECUTE FUNCTION auth.set_updated_at();


--
-- Name: registros_calificados trg_registros_calificados_updated_at; Type: TRIGGER; Schema: auth; Owner: -
--

CREATE TRIGGER trg_registros_calificados_updated_at BEFORE UPDATE ON auth.registros_calificados FOR EACH ROW EXECUTE FUNCTION auth.set_updated_at();


--
-- Name: acreditaciones_programa acreditaciones_programa_programa_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.acreditaciones_programa
    ADD CONSTRAINT acreditaciones_programa_programa_id_fkey FOREIGN KEY (programa_id) REFERENCES auth.programas_academicos(id) ON DELETE CASCADE;


--
-- Name: geopolitica fk_geopolitica_padre; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.geopolitica
    ADD CONSTRAINT fk_geopolitica_padre FOREIGN KEY (id_padre) REFERENCES auth.geopolitica(id_geopolitica);


--
-- Name: permission fk_permission_module; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.permission
    ADD CONSTRAINT fk_permission_module FOREIGN KEY (id_module) REFERENCES auth.module(id_module);


--
-- Name: personas fk_personas_seccional; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.personas
    ADD CONSTRAINT fk_personas_seccional FOREIGN KEY (id_seccional) REFERENCES auth.seccionales(id_seccional);


--
-- Name: personas fk_personas_sede; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.personas
    ADD CONSTRAINT fk_personas_sede FOREIGN KEY (id_sede) REFERENCES auth.sedes(id_sede);


--
-- Name: seccionales fk_seccional_geopolitica; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.seccionales
    ADD CONSTRAINT fk_seccional_geopolitica FOREIGN KEY (id_ubi_seccional) REFERENCES auth.geopolitica(id_geopolitica);


--
-- Name: sedes fk_sedes_geopolitica; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sedes
    ADD CONSTRAINT fk_sedes_geopolitica FOREIGN KEY (id_geopolitica) REFERENCES auth.geopolitica(id_geopolitica);


--
-- Name: sedes fk_sedes_seccional; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sedes
    ADD CONSTRAINT fk_sedes_seccional FOREIGN KEY (id_seccional) REFERENCES auth.seccionales(id_seccional);


--
-- Name: user fk_user_personas; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth."user"
    ADD CONSTRAINT fk_user_personas FOREIGN KEY (id_tercero) REFERENCES auth.personas(id_tercero);


--
-- Name: programas_academicos programas_academicos_sede_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.programas_academicos
    ADD CONSTRAINT programas_academicos_sede_id_fkey FOREIGN KEY (sede_id) REFERENCES auth.sedes(id_sede) ON DELETE RESTRICT;


--
-- Name: registros_calificados registros_calificados_programa_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.registros_calificados
    ADD CONSTRAINT registros_calificados_programa_id_fkey FOREIGN KEY (programa_id) REFERENCES auth.programas_academicos(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_id_permission_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.role_permissions
    ADD CONSTRAINT role_permissions_id_permission_fkey FOREIGN KEY (id_permission) REFERENCES auth.permission(id_permission) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_id_rol_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.role_permissions
    ADD CONSTRAINT role_permissions_id_rol_fkey FOREIGN KEY (id_rol) REFERENCES auth.role(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_id_rol_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.user_roles
    ADD CONSTRAINT user_roles_id_rol_fkey FOREIGN KEY (id_rol) REFERENCES auth.role(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_id_user_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.user_roles
    ADD CONSTRAINT user_roles_id_user_fkey FOREIGN KEY (id_user) REFERENCES auth."user"(id_user) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

