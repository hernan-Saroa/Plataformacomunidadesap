--
-- PostgreSQL database dump
--

\restrict nokX9VJPHjm2zaYv4ltdvCtRd27gg9GsMIPLTiP3d7rA7LLeLHkcapY3C8jZ2WO

-- Dumped from database version 16.11 (Debian 16.11-1.pgdg13+1)
-- Dumped by pg_dump version 16.11 (Debian 16.11-1.pgdg13+1)

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
-- Name: academic_registration; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA academic_registration;


ALTER SCHEMA academic_registration OWNER TO postgres;

--
-- Name: academic_work_plan; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA academic_work_plan;


ALTER SCHEMA academic_work_plan OWNER TO postgres;

--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA auth;


ALTER SCHEMA auth OWNER TO postgres;

--
-- Name: certification; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA certification;


ALTER SCHEMA certification OWNER TO postgres;

--
-- Name: internal_disciplinary_control; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA internal_disciplinary_control;


ALTER SCHEMA internal_disciplinary_control OWNER TO postgres;

--
-- Name: internal_institutional_control; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA internal_institutional_control;


ALTER SCHEMA internal_institutional_control OWNER TO postgres;

--
-- Name: interoperability; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA interoperability;


ALTER SCHEMA interoperability OWNER TO postgres;

--
-- Name: legal_management; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA legal_management;


ALTER SCHEMA legal_management OWNER TO postgres;

--
-- Name: notifications; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA notifications;


ALTER SCHEMA notifications OWNER TO postgres;

--
-- Name: travel_expenses; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA travel_expenses;


ALTER SCHEMA travel_expenses OWNER TO postgres;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: test_data; Type: TABLE; Schema: academic_registration; Owner: postgres
--

CREATE TABLE academic_registration.test_data (
    id integer NOT NULL,
    name character varying(250),
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE academic_registration.test_data OWNER TO postgres;

--
-- Name: test_data_id_seq; Type: SEQUENCE; Schema: academic_registration; Owner: postgres
--

CREATE SEQUENCE academic_registration.test_data_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE academic_registration.test_data_id_seq OWNER TO postgres;

--
-- Name: test_data_id_seq; Type: SEQUENCE OWNED BY; Schema: academic_registration; Owner: postgres
--

ALTER SEQUENCE academic_registration.test_data_id_seq OWNED BY academic_registration.test_data.id;


--
-- Name: test_data; Type: TABLE; Schema: academic_work_plan; Owner: postgres
--

CREATE TABLE academic_work_plan.test_data (
    id integer NOT NULL,
    name character varying(250),
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE academic_work_plan.test_data OWNER TO postgres;

--
-- Name: test_data_id_seq; Type: SEQUENCE; Schema: academic_work_plan; Owner: postgres
--

CREATE SEQUENCE academic_work_plan.test_data_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE academic_work_plan.test_data_id_seq OWNER TO postgres;

--
-- Name: test_data_id_seq; Type: SEQUENCE OWNED BY; Schema: academic_work_plan; Owner: postgres
--

ALTER SEQUENCE academic_work_plan.test_data_id_seq OWNED BY academic_work_plan.test_data.id;


--
-- Name: CARGOS; Type: TABLE; Schema: auth; Owner: postgres
--

CREATE TABLE auth."CARGOS" (
    "ID_CARGO" numeric(11,0) NOT NULL,
    "COD_CARGO" character varying(20) NOT NULL,
    "ID_CARGO01" character varying(20) NOT NULL,
    "NOM_CARGO" character varying(250) NOT NULL,
    "FEC_ULT_ACT" date,
    "FEC_CREACION" date,
    "NOM_DES_CARGO" character varying(200),
    "USU_CREACION" character varying(20),
    "USU_ACTUALIZACION" character varying(20),
    "COD_EQUIVALE" character varying(20),
    "TIP_JER_CARGO" character varying(6),
    "COD_JER_CARGO" character varying(6),
    "EMP_JER_CARGO" numeric(11,0)
);


ALTER TABLE auth."CARGOS" OWNER TO postgres;

--
-- Name: CENTROS_COSTO; Type: TABLE; Schema: auth; Owner: postgres
--

CREATE TABLE auth."CENTROS_COSTO" (
    "ID_CEN_COSTO" numeric(11,0) NOT NULL,
    "ID_EMPRESA" numeric(11,0) NOT NULL,
    "COD_CEN_COSTO" character varying(20) NOT NULL,
    "NOM_CEN_COSTO" character varying(250) NOT NULL,
    "COD_CEN_PADRE" numeric(11,0) NOT NULL,
    "FEC_ULT_ACT" date,
    "FEC_CREACION" date,
    "USU_CREACION" character varying(20),
    "USU_ACTUALIZACION" character varying(20),
    "EST_CENTRO" numeric(1,0) DEFAULT 1 NOT NULL,
    "ID_GEOPOLITICA" numeric(11,0),
    "IND_MOVIMIENTO" numeric(5,0) NOT NULL
);


ALTER TABLE auth."CENTROS_COSTO" OWNER TO postgres;

--
-- Name: DEPENDENCIAS; Type: TABLE; Schema: auth; Owner: postgres
--

CREATE TABLE auth."DEPENDENCIAS" (
    "ID_DEPENDENCIA" numeric(11,0) NOT NULL,
    "ID_EMPRESA" numeric(11,0) NOT NULL,
    "COD_DEPENDENCIA" character varying(20) NOT NULL,
    "ID_CEN_COSTO" numeric(11,0) NOT NULL,
    "ID_DEPENDENCIA1" numeric(11,0) NOT NULL,
    "NOM_DEPENDENCIA" character varying(250),
    "NOM_RESPONSABLE" character varying(40),
    "TIP_UNIDAD" numeric(1,0),
    "FEC_ULT_ACT" date,
    "FEC_CREACION" date,
    "USU_CREACION" character varying(20),
    "USU_ACTUALIZACION" character varying(20),
    "ID_TERCERO" numeric(11,0),
    "ID_SEDE" numeric(11,0),
    "COD_TIP_UNIDAD" character varying(6),
    "COD_PAI_TELEFONO" numeric(6,0),
    "COD_ARE_TELEFONO" numeric(6,0),
    "NUM_TELEFONO" character varying(30),
    "COD_PAI_NUM_FAX" numeric(6,0),
    "COD_ARE_NUM_FAX" numeric(6,0),
    "NUM_APARTADO" character varying(20),
    "URL_DEPENDENCIA" character varying(250),
    "DIR_EMAIL" character varying(250),
    "ID_GEOPOLITICA" numeric(11,0),
    "ID_CARGO" numeric(11,0),
    "TEL_EXT" character varying(5),
    "DIR_DEPENDENCIA" character varying(250),
    "NUM_FAX" character varying(30),
    "GEN_TIP_UNIDAD" character varying(6) DEFAULT 'TIUORG'::character varying,
    "EMP_COD_TIP_UNIDAD" numeric(11,0) DEFAULT 0,
    "DIR_EMAIL2" character varying(250),
    "FIR_DEPENDENCIA1" numeric(11,0),
    "FIR_DEPENDENCIA2" numeric(11,0),
    "FIR_DEPENDENCIA3" numeric(11,0),
    "FIR_DEPENDENCIA4" numeric(11,0),
    "ID_DEP_FIR_CER1" numeric(11,0),
    "ID_DEP_FIR_CER2" numeric(11,0),
    "ID_DEP_FIR_CER3" numeric(11,0),
    "ID_DEP_FIR_CER4" numeric(11,0)
);


ALTER TABLE auth."DEPENDENCIAS" OWNER TO postgres;

--
-- Name: GENERICA; Type: TABLE; Schema: auth; Owner: postgres
--

CREATE TABLE auth."GENERICA" (
    "TIP_TABLA" character varying(6) NOT NULL,
    "COD_TABLA" character varying(6) NOT NULL,
    "NOM_TABLA" character varying(20),
    "COD_AUXILIAR1" character varying(250),
    "COD_AUXILIAR2" character varying(250),
    "NOM_ALIAS" character varying(1000),
    "FEC_ULI_ACT" date,
    "FEC_CREACION" date,
    "USU_CREACION" character varying(20),
    "USU_ACTUALIZACION" character varying(20),
    "COD_SNIES" character varying(10),
    "NOM_ESTRUCTURA" character varying(30),
    "IND_PRIVADA" numeric(1,0) NOT NULL,
    "IND_VISIBLE" numeric(1,0) DEFAULT 1,
    "DES_TABLA" character varying(1000),
    "COD_DIRECTORIO" character varying(256),
    "ID_EMPRESA" numeric(11,0) NOT NULL
);


ALTER TABLE auth."GENERICA" OWNER TO postgres;

--
-- Name: GEOPOLITICA; Type: TABLE; Schema: auth; Owner: postgres
--

CREATE TABLE auth."GEOPOLITICA" (
    "ID_GEOPOLITICA" numeric(11,0) NOT NULL,
    "COD_GEOPOLITICA" character varying(20) NOT NULL,
    "COD_PAIS" numeric(4,0),
    "COD_DEPARTAMENTO" numeric(3,0),
    "COD_CIUDAD" numeric(3,0),
    "NOM_DIV_GEOPOLITICA" character varying(250),
    "NUM_HABITANTES" numeric(11,0),
    "TIP_DIVISION" character varying(6),
    "COD_DIVISION" character varying(6),
    "COD_ZON_GEOGRAFICA" character varying(6),
    "FEC_ULT_ACT" date,
    "FEC_CREACION" date,
    "USU_CREACION" character varying(20),
    "USU_ACTUALIZACION" character varying(20),
    "COD_INTL_PAIS" character varying(3),
    "COD_UNSO" character varying(3),
    "COD_DIAN" character varying(3),
    "COD_LAT" numeric(11,8),
    "COD_LON" numeric(11,8),
    "ID_PADRE" numeric(11,0),
    "COD_IDIOMA" character varying(3),
    "NOM_IDIOMA" character varying(250),
    "COD_IDM" character varying(3),
    "NOM_DIV_GEOPOLITICA_TOT" character varying(200),
    "COD_ARE_TEL" character varying(6),
    "COD_PAIS_DEFECTO" character varying(3),
    "IND_OCULTO" numeric(1,0) NOT NULL
);


ALTER TABLE auth."GEOPOLITICA" OWNER TO postgres;

--
-- Name: INFORMACION_ADICIONAL_PERSONAS; Type: TABLE; Schema: auth; Owner: postgres
--

CREATE TABLE auth."INFORMACION_ADICIONAL_PERSONAS" (
    "ID_TERCERO" numeric(11,0) NOT NULL,
    "OBS_TERCERO" character varying(1000),
    "NUM_VISA" character varying(20),
    "CLA_VISA" character varying(20),
    "CLA_LIBRETA" character varying(20),
    "GRU_SANGUINEO" character varying(2),
    "FRH_SANGUINEO" character varying(2),
    "ZON_ORIGEN" character varying(6),
    "COD_RAZA" character varying(6),
    "COD_GRU_ETNICO" character varying(6),
    "COD_RELIGION" character varying(6),
    "COD_ESTATURA" numeric(5,0),
    "FEC_ULT_ACT" date,
    "FEC_CREACION" date,
    "USU_CREACION" character varying(20),
    "USU_ACTUALIZACION" character varying(20),
    "CLA_TERCERO" character varying(20),
    "IND_GRU_VULNERABLE" numeric(1,0),
    "IND_VIC_ARMADO" numeric(1,0),
    "ID_LUG_DESPLAZADO" numeric(11,0),
    "IND_ORI_SECTOR" numeric(1,0),
    "IND_POL_ESPECIAL" numeric(1,0),
    "NUM_PER_GRUPO" numeric(4,0),
    "NUM_PER_APORTAN" numeric(4,0),
    "VAL_ING_FAMILIAR" numeric(14,2),
    "IND_TIP_VIVIENDA" numeric(1,0),
    "IND_DEU_VIVIENDA" numeric(1,0),
    "POS_HERMANOS" numeric(2,0),
    "COD_PAI_FRONTERIZO" character varying(6),
    "COD_CAPACIDAD" character varying(6),
    "COD_RESGUARDO" character varying(6),
    "CAM_FOTO" text,
    "NOM_RESGUARDO" character varying(200),
    "NIV_ESTUDIO" character varying(6),
    "TIP_OCUPACION" character varying(6),
    "IND_APORTANTE" numeric(1,0) NOT NULL,
    "COD_GRU_SANGUINEO" character varying(6) DEFAULT 'GRUSAN'::character varying,
    "EMP_GRU_SANGUINEO" numeric(11,0) DEFAULT 0,
    "COD_FRH_SANGUINEO" character varying(6) DEFAULT 'FACHR'::character varying,
    "EMP_FRH_SANGUINEO" numeric(11,0) DEFAULT 0,
    "GEN_RAZA" character varying(6) DEFAULT 'CODRAZ'::character varying,
    "EMP_COD_RAZA" numeric(11,0) DEFAULT 0,
    "GEN_GRU_ETNICO" character varying(6) DEFAULT 'GRUETN'::character varying,
    "EMP_COD_GRU_ETNICO" numeric(11,0) DEFAULT 0,
    "GEN_RELIGION" character varying(6) DEFAULT 'CODREL'::character varying,
    "EMP_COD_RELIGION" numeric(11,0) DEFAULT 0,
    "GEN_CAPACIDAD" character varying(6) DEFAULT 'GRUCAP'::character varying,
    "EMP_COD_CAPACIDAD" numeric(11,0) DEFAULT 0,
    "GEN_RESGUARDO" character varying(6) DEFAULT 'GRURES'::character varying,
    "EMP_COD_RESGUARDO" numeric(11,0) DEFAULT 0,
    "COD_NIV_ESTUDIO" character varying(6) DEFAULT 'NIVFOR'::character varying,
    "EMP_NIV_ESTUDIO" numeric(11,0) DEFAULT 0,
    "COD_TIP_OCUPACION" character varying(6) DEFAULT 'TIPOCU'::character varying,
    "EMP_TIP_OCUPACION" numeric(11,0) DEFAULT 0,
    "TIP_SISPEN" character varying(6),
    "COD_SIPEN" character varying(6),
    "EMP_SISPEN" numeric(11,0),
    "FEC_AFILIA_SISPEN" date,
    "TIP_AFP" character varying(6),
    "COD_AFP" character varying(6),
    "EMP_AFP" numeric(11,0),
    "CODIGO_AFP" character varying(120),
    "URBANIZACION" character varying(4000),
    "TELEFONO_2" character varying(20),
    "TIP_APELATIVO" character varying(6),
    "COD_APELATIVO" character varying(6),
    "EMP_APELATIVO" numeric(11,0),
    "TEL_OFICINA" character varying(20),
    "NUM_CUENTA_1" character varying(100),
    "ID_BANCO_1" numeric(11,0),
    "TIP_CUENTA_1" character varying(6),
    "COD_CUENTA_1" character varying(6),
    "EMP_CUENTA_1" numeric(11,0),
    "NUM_CUENTA_2" character varying(100),
    "ID_BANCO_2" numeric(11,0),
    "TIP_CUENTA_2" character varying(6),
    "COD_CUENTA_2" character varying(6),
    "EMP_CUENTA_2" numeric(11,0),
    "TIP_TABVIA" character varying(6),
    "COD_TABVIA" character varying(6),
    "EMP_TABVIA" numeric(11,0),
    "TEL_EMERGENCIA" character varying(20),
    "CONTACTO_EMERGENCIA" character varying(1000),
    "TIP_SIT_PADRES" character varying(6),
    "COD_SIT_PADRES" character varying(6),
    "EMP_SIT_PADRES" numeric(11,0),
    "NUM_PER_TRABAJAN" numeric(6,0),
    "NUMERO_HERMANOS" numeric(6,0),
    "NUM_HERMANOS_EDUC_SUPERIOR" numeric(2,0),
    "TIP_COSTEO_ESTUDIOS" character varying(6),
    "COD_COSTEO_ESTUDIOS" character varying(6),
    "EMP_COSTEO_ESTUDIOS" numeric(11,0),
    "NUMERO_HIJOS" numeric(2,0),
    "PERFIL_PROFESIONAL" character varying(4000),
    "ANIOS_EXPERIENCIA" numeric(2,0),
    "TIP_PUE_INDG" character varying(6) DEFAULT 'CODPUE'::character varying,
    "COD_PUE_INDG" character varying(6) DEFAULT 'CODZON'::character varying,
    "EMP_PUE_INDG" numeric(11,0),
    "TIP_ZONA_RES" character varying(6),
    "COD_ZONA_RES" character varying(6),
    "EMP_ZONA_RES" numeric(11,0),
    "TIP_COM_NEGRA" character varying(6) DEFAULT 'CODCOM'::character varying,
    "COD_COM_NEGRA" character varying(6),
    "EMP_COM_NEGRA" numeric(11,0),
    "IND_REL_FAMILIAR" numeric(1,0) DEFAULT 0,
    "TIP_REL_FAMILIAR" character varying(6) DEFAULT 'TIPREL'::character varying,
    "COD_REL_FAMILIAR" character varying(6),
    "EMP_REL_FAMILIAR" numeric(11,0),
    "TIP_DISCAPACIDAD" character varying(6) DEFAULT 'CODDIS'::character varying,
    "COD_DISCAPACIDAD" character varying(6),
    "EMP_DISCAPACIDAD" numeric(11,0),
    "ID_REGIMEN_ESPECIAL" numeric(11,0),
    "TIP_REGIMEN" character varying(6) DEFAULT 'REGESP'::character varying,
    "COD_REGIMEN" character varying(6),
    "EMP_REGIMEN" numeric(11,0),
    "TIP_LEY_BENEFICIO" character varying(6) DEFAULT 'BENLEY'::character varying,
    "COD_LEY_BENEFICIO" character varying(6),
    "EMP_LEY_BENEFICIO" numeric(11,0)
);


ALTER TABLE auth."INFORMACION_ADICIONAL_PERSONAS" OWNER TO postgres;

--
-- Name: PERMISSION; Type: TABLE; Schema: auth; Owner: postgres
--

CREATE TABLE auth."PERMISSION" (
    "ID_PERMISSION" uuid NOT NULL,
    "NAME" character varying(100) NOT NULL,
    "DESCRIPTION" text,
    "IS_ACTIVE" boolean DEFAULT true,
    "CREATED_AT" timestamp with time zone,
    "UPDATED_AT" timestamp with time zone
);


ALTER TABLE auth."PERMISSION" OWNER TO postgres;

--
-- Name: PERSONAS; Type: TABLE; Schema: auth; Owner: postgres
--

CREATE TABLE auth."PERSONAS" (
    "ID_TERCERO" numeric(11,0) NOT NULL,
    "NUM_IDENTIFICACION" character varying(30) NOT NULL,
    "TIP_IDENTIFICACION" character varying(6) NOT NULL,
    "NOM_LARGO" character varying(1000) NOT NULL,
    "SIG_TERCERO" character varying(10),
    "NOM_TERCERO" character varying(250) NOT NULL,
    "PRI_APELLIDO" character varying(250),
    "SEG_APELLIDO" character varying(250),
    "GEN_TERCERO" character varying(6) NOT NULL,
    "EST_CIVIL" character varying(6),
    "FEC_NACIMIENTO" date,
    "COD_NACIONALIDAD" character varying(6),
    "IND_VIVE" numeric(1,0) DEFAULT 1,
    "DIR_RESIDENCIA" character varying(250),
    "DIR_EMAIL" character varying(100),
    "TEL_RESIDENCIA" character varying(20),
    "TEL_CELULAR" character varying(20),
    "ID_UBI_RES" numeric(11,0),
    "ID_UBI_NAC" numeric(11,0),
    "NUM_TARJETA_MILITAR" character varying(20),
    "DIS_TARJETA_MILITAR" character varying(8),
    "COD_ANTERIOR" character varying(30),
    "COD_TERCERO" character varying(12),
    "FEC_CREACION" date,
    "FEC_MODIFICACION" date,
    "USU_CREACION" character varying(20),
    "USU_MODIFICACION" character varying(20),
    "GRU_SANGUINEO" character varying(2),
    "FRH_SANGUINEO" character varying(2),
    "ZON_ORIGEN" character varying(6),
    "ID_UBI_DOCUMENTO" numeric(11,0),
    "DIG_CHEQUEO" character(1),
    "IND_SORDERA" numeric(6,0),
    "IND_PROB_MOTORES" numeric(1,0),
    "IND_INVIDENTE" numeric(1,0),
    "IND_VISION_PARCIAL" numeric(1,0),
    "FEC_EXP_DOCUMENTO" date,
    "FEC_ULT_ACT_LABORAL" date,
    "IND_ACT_LABORAL" numeric(1,0),
    "COD_CAT_TERCERO" character varying(5),
    "ATR_TERCERO" character varying(6),
    "NOM_ARC_FOTO" character varying(60),
    "NIV_ING_FAMILIAR" numeric(6,0),
    "NOM_BARRIO" character varying(100),
    "DEP_ECONOMICA" character varying(6),
    "NUM_PER_FAMILIAR" numeric(3,0),
    "NUM_PER_A_CARGO" numeric(6,0),
    "ID_BARRIO" numeric(6,0),
    "SEG_NOMBRE" character varying(250),
    "COD_PAI_TEL" character varying(5),
    "COD_ARE_TEL" character varying(5),
    "COD_ARE_NUM_FAX" character varying(6),
    "COD_ARE_TEL_RESIDENCIA" character varying(6),
    "COD_PAI_NUM_FAX" character varying(6),
    "COD_PAI_TEL_RESIDENCIA" character varying(6),
    "ID_EMPRESA" numeric(11,0),
    "NUM_FAX" character varying(12),
    "IND_ACT_DAT_TERCERO" numeric(1,0) DEFAULT 0,
    "COD_USUARIO_LDAP" character varying(200),
    "DIR_EMAIL_PER" character varying(100),
    "COD_TIP_IDENTIFICACION" character varying(6) DEFAULT 'TIPIDE'::character varying NOT NULL,
    "EMP_TIP_IDENTIFICACION" numeric(11,0) DEFAULT 0 NOT NULL,
    "TIP_GEN_TERCERO" character varying(6) DEFAULT 'TIPGEN'::character varying NOT NULL,
    "EMP_GEN_TERCERO" numeric(11,0) DEFAULT 0 NOT NULL,
    "NUM_EST_ECONOMICO" character varying(6),
    "TIP_EST_ECONOMICO" character varying(6) DEFAULT 'ESTRAT'::character varying,
    "EMP_EST_ECONOMICO" numeric(11,0) DEFAULT 0,
    "EPS_TERCERO" character varying(6),
    "TIP_EPS_TERCERO" character varying(6) DEFAULT 'CODEPS'::character varying,
    "EMP_EPS_TERCERO" numeric(11,0) DEFAULT 0,
    "TIP_EST_CIVIL" character varying(6) DEFAULT 'ESTCIV'::character varying,
    "EMP_EST_CIVIL" numeric(11,0) DEFAULT 0,
    "NAT_TERCERO" character varying(6),
    "TIP_NAT_TERCERO" character varying(6) DEFAULT 'NATTER'::character varying,
    "EMP_NAT_TERCERO" numeric(11,0) DEFAULT 0,
    "TIP_COD_NACIONALIDAD" character varying(6) DEFAULT 'TIPNAC'::character varying,
    "EMP_COD_NACIONALIDAD" numeric(11,0) DEFAULT 0,
    "FEC_ACT_DAT_TERCERO" date,
    "FACEBOOK" character varying(100),
    "TWITTER" character varying(200),
    "LINKEDIN" character varying(200),
    "SKYPE" character varying(100),
    "WHATSAPP" character varying(100),
    "IND_CON_LEGALES" numeric(1,0),
    "IND_HOJA_VIDA" numeric(1,0),
    "IND_HABEAS_DATA" numeric(1,0),
    "FEC_HABEAS_DATA" date,
    "IP_HABEAS_DATA" character varying(4000),
    "NUM_PASAPORTE" character varying(200),
    "FEC_VIG_PASAPORTE" date,
    "NOM_DOC_FIRMA" character varying(250),
    "EXT_DOC_FIRMA" character varying(10),
    "DOC_FIRMA" bytea,
    "TAM_DOC_FIRMA" numeric(32,0),
    "IND_EXP_LABORAR" numeric(1,0),
    "IND_HABEAS_DATA_EGRE" numeric(1,0) DEFAULT 0,
    "FEC_HABEAS_DATA_EGRE" date,
    "IP_HABEAS_DATA_EGRE" character varying(4000),
    "PWD_CVLAC" character varying(4000),
    "NACIONALIDAD_CVLAC" character varying(200),
    "NOMBRES_CVLAC" character varying(4000),
    "NUM_IDENTI_CVLAC" character varying(20)
);


ALTER TABLE auth."PERSONAS" OWNER TO postgres;

--
-- Name: ROLE; Type: TABLE; Schema: auth; Owner: postgres
--

CREATE TABLE auth."ROLE" (
    "ID_ROL" uuid NOT NULL,
    "NAME" character varying(100) NOT NULL,
    "DESCRIPTION" text,
    "IS_ACTIVE" boolean DEFAULT true,
    "CREATED_AT" timestamp with time zone,
    "UPDATED_AT" timestamp with time zone
);


ALTER TABLE auth."ROLE" OWNER TO postgres;

--
-- Name: ROLE_PERMISSIONS; Type: TABLE; Schema: auth; Owner: postgres
--

CREATE TABLE auth."ROLE_PERMISSIONS" (
    "ID_ROL" uuid NOT NULL,
    "ID_PERMISSION" uuid NOT NULL,
    "IS_ACTIVE" boolean DEFAULT true,
    "CREATED_AT" timestamp with time zone,
    "UPDATED_AT" timestamp with time zone
);


ALTER TABLE auth."ROLE_PERMISSIONS" OWNER TO postgres;

--
-- Name: SECCIONALES; Type: TABLE; Schema: auth; Owner: postgres
--

CREATE TABLE auth."SECCIONALES" (
    "ID_SECCIONAL" numeric(11,0) NOT NULL,
    "NOM_SECCIONAL" character varying(100) NOT NULL,
    "DIR_SECCIONAL" character varying(250),
    "ID_UBI_SECCIONAL" numeric(11,0),
    "FEC_CREACION" date,
    "FEC_ULT_ACT" date,
    "USU_CREACION" character varying(20),
    "USU_ACTUALIZACION" character varying(20),
    "COD_SECCIONAL" character varying(5),
    "ID_EMPRESA" numeric(11,0),
    "NIT_SECCIONAL" character varying(15),
    "FIR_SECCIONAL1" numeric(11,0),
    "FIR_SECCIONAL2" numeric(11,0),
    "FIR_SECCIONAL3" numeric(11,0),
    "FIR_SECCIONAL4" numeric(11,0),
    "ID_DEP_FIR_CER1" numeric(11,0),
    "ID_DEP_FIR_CER2" numeric(11,0),
    "ID_DEP_FIR_CER3" numeric(11,0),
    "ID_DEP_FIR_CER4" numeric(11,0)
);


ALTER TABLE auth."SECCIONALES" OWNER TO postgres;

--
-- Name: SEDES; Type: TABLE; Schema: auth; Owner: postgres
--

CREATE TABLE auth."SEDES" (
    "ID_SEDE" numeric(11,0) NOT NULL,
    "ID_EMPRESA" numeric(11,0) NOT NULL,
    "COD_SEDE" character varying(5) NOT NULL,
    "NOM_SEDE" character varying(50) NOT NULL,
    "ID_GEOPOLITICA" numeric(11,0) NOT NULL,
    "DIR_SEDE" character varying(250),
    "FEC_ULT_ACT" date,
    "FEC_CREACION" date,
    "USU_CREACION" character varying(20),
    "USU_ACTUALIZACION" character varying(20),
    "COD_ATRIBUTO" character varying(10),
    "ID_SECCIONAL" numeric(11,0),
    "SEDE_ACT" character varying(30),
    "NUM_LATITUD" numeric(32,29),
    "NUM_LONGITUD" numeric(32,29),
    "COD_IAC_INSCRIPCIONES" character varying(250),
    "COD_IAC_MATRICULA" character varying(250),
    "COD_IAC_OTROS_CONCEPTOS" character varying(250),
    "FIR_SEDE1" numeric(11,0),
    "FIR_SEDE2" numeric(11,0),
    "FIR_SEDE3" numeric(11,0),
    "FIR_SEDE4" numeric(11,0),
    "ID_DEP_FIR_CER1" numeric(11,0),
    "ID_DEP_FIR_CER2" numeric(11,0),
    "ID_DEP_FIR_CER3" numeric(11,0),
    "ID_DEP_FIR_CER4" numeric(11,0)
);


ALTER TABLE auth."SEDES" OWNER TO postgres;

--
-- Name: TIPOS_TERCERO; Type: TABLE; Schema: auth; Owner: postgres
--

CREATE TABLE auth."TIPOS_TERCERO" (
    "ID_TIP_TERCERO" numeric(11,0) NOT NULL,
    "ID_TERCERO" numeric(11,0) NOT NULL,
    "TIP_TABLA" character varying(6) NOT NULL,
    "COD_TABLA" character varying(6) NOT NULL,
    "EMP_TABLA" numeric(11,0) DEFAULT 1 NOT NULL,
    "NOM_TIPO_TERCERO" character varying(30),
    "FEC_ULT_ACT" date,
    "FEC_CREACION" date,
    "USU_CREACION" character varying(20),
    "USU_ACTUALIZACION" character varying(20),
    "CLA_TERCERO" character varying(64),
    "GRA_EST_ALUMNO" character varying(10),
    "IND_ACTIVO" numeric(1,0) NOT NULL,
    "IND_RESTAURA" numeric(1,0) NOT NULL,
    "IND_DEFECTO" numeric(1,0) NOT NULL,
    "ID_EMPRESA" numeric(11,0) NOT NULL,
    "FEC_FIN" date,
    "FEC_CLA_TERCERO" date
);


ALTER TABLE auth."TIPOS_TERCERO" OWNER TO postgres;

--
-- Name: USER; Type: TABLE; Schema: auth; Owner: postgres
--

CREATE TABLE auth."USER" (
    "ID_USER" uuid NOT NULL,
    "USERNAME" character varying(100) NOT NULL,
    "PASSWORD" character varying(255) NOT NULL,
    "ID_TERCERO" numeric(11,0),
    "IS_ACTIVE" boolean DEFAULT true,
    "TOKEN" numeric(6,0),
    "CREATED_AT" timestamp with time zone,
    "UPDATED_AT" timestamp with time zone
);


ALTER TABLE auth."USER" OWNER TO postgres;

--
-- Name: USER_ROLES; Type: TABLE; Schema: auth; Owner: postgres
--

CREATE TABLE auth."USER_ROLES" (
    "ID_USER" uuid NOT NULL,
    "ID_ROL" uuid NOT NULL,
    "IS_ACTIVE" boolean DEFAULT true,
    "CREATED_AT" timestamp with time zone,
    "UPDATED_AT" timestamp with time zone
);


ALTER TABLE auth."USER_ROLES" OWNER TO postgres;

--
-- Name: permission; Type: TABLE; Schema: auth; Owner: postgres
--

CREATE TABLE auth.permission (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying NOT NULL,
    description character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE auth.permission OWNER TO postgres;

--
-- Name: person; Type: TABLE; Schema: auth; Owner: postgres
--

CREATE TABLE auth.person (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    first_name character varying NOT NULL,
    last_name character varying NOT NULL,
    email character varying NOT NULL,
    phone character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE auth.person OWNER TO postgres;

--
-- Name: role; Type: TABLE; Schema: auth; Owner: postgres
--

CREATE TABLE auth.role (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying NOT NULL,
    description character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE auth.role OWNER TO postgres;

--
-- Name: role_permissions; Type: TABLE; Schema: auth; Owner: postgres
--

CREATE TABLE auth.role_permissions (
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL
);


ALTER TABLE auth.role_permissions OWNER TO postgres;

--
-- Name: user; Type: TABLE; Schema: auth; Owner: postgres
--

CREATE TABLE auth."user" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    username character varying NOT NULL,
    password_hash character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    person_id uuid
);


ALTER TABLE auth."user" OWNER TO postgres;

--
-- Name: user_roles; Type: TABLE; Schema: auth; Owner: postgres
--

CREATE TABLE auth.user_roles (
    user_id uuid NOT NULL,
    role_id uuid NOT NULL
);


ALTER TABLE auth.user_roles OWNER TO postgres;

--
-- Name: test_data; Type: TABLE; Schema: certification; Owner: postgres
--

CREATE TABLE certification.test_data (
    id integer NOT NULL,
    name character varying(250),
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE certification.test_data OWNER TO postgres;

--
-- Name: test_data_id_seq; Type: SEQUENCE; Schema: certification; Owner: postgres
--

CREATE SEQUENCE certification.test_data_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE certification.test_data_id_seq OWNER TO postgres;

--
-- Name: test_data_id_seq; Type: SEQUENCE OWNED BY; Schema: certification; Owner: postgres
--

ALTER SEQUENCE certification.test_data_id_seq OWNED BY certification.test_data.id;


--
-- Name: test_data; Type: TABLE; Schema: internal_disciplinary_control; Owner: postgres
--

CREATE TABLE internal_disciplinary_control.test_data (
    id integer NOT NULL,
    name character varying(250),
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE internal_disciplinary_control.test_data OWNER TO postgres;

--
-- Name: test_data_id_seq; Type: SEQUENCE; Schema: internal_disciplinary_control; Owner: postgres
--

CREATE SEQUENCE internal_disciplinary_control.test_data_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE internal_disciplinary_control.test_data_id_seq OWNER TO postgres;

--
-- Name: test_data_id_seq; Type: SEQUENCE OWNED BY; Schema: internal_disciplinary_control; Owner: postgres
--

ALTER SEQUENCE internal_disciplinary_control.test_data_id_seq OWNED BY internal_disciplinary_control.test_data.id;


--
-- Name: test_data; Type: TABLE; Schema: internal_institutional_control; Owner: postgres
--

CREATE TABLE internal_institutional_control.test_data (
    id integer NOT NULL,
    name character varying(250),
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE internal_institutional_control.test_data OWNER TO postgres;

--
-- Name: test_data_id_seq; Type: SEQUENCE; Schema: internal_institutional_control; Owner: postgres
--

CREATE SEQUENCE internal_institutional_control.test_data_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE internal_institutional_control.test_data_id_seq OWNER TO postgres;

--
-- Name: test_data_id_seq; Type: SEQUENCE OWNED BY; Schema: internal_institutional_control; Owner: postgres
--

ALTER SEQUENCE internal_institutional_control.test_data_id_seq OWNED BY internal_institutional_control.test_data.id;


--
-- Name: test_data; Type: TABLE; Schema: interoperability; Owner: postgres
--

CREATE TABLE interoperability.test_data (
    id integer NOT NULL,
    name character varying(250),
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE interoperability.test_data OWNER TO postgres;

--
-- Name: test_data_id_seq; Type: SEQUENCE; Schema: interoperability; Owner: postgres
--

CREATE SEQUENCE interoperability.test_data_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE interoperability.test_data_id_seq OWNER TO postgres;

--
-- Name: test_data_id_seq; Type: SEQUENCE OWNED BY; Schema: interoperability; Owner: postgres
--

ALTER SEQUENCE interoperability.test_data_id_seq OWNED BY interoperability.test_data.id;


--
-- Name: test_data; Type: TABLE; Schema: legal_management; Owner: postgres
--

CREATE TABLE legal_management.test_data (
    id integer NOT NULL,
    name character varying(250),
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE legal_management.test_data OWNER TO postgres;

--
-- Name: test_data_id_seq; Type: SEQUENCE; Schema: legal_management; Owner: postgres
--

CREATE SEQUENCE legal_management.test_data_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE legal_management.test_data_id_seq OWNER TO postgres;

--
-- Name: test_data_id_seq; Type: SEQUENCE OWNED BY; Schema: legal_management; Owner: postgres
--

ALTER SEQUENCE legal_management.test_data_id_seq OWNED BY legal_management.test_data.id;


--
-- Name: test_data; Type: TABLE; Schema: notifications; Owner: postgres
--

CREATE TABLE notifications.test_data (
    id integer NOT NULL,
    name character varying(250),
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE notifications.test_data OWNER TO postgres;

--
-- Name: test_data_id_seq; Type: SEQUENCE; Schema: notifications; Owner: postgres
--

CREATE SEQUENCE notifications.test_data_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE notifications.test_data_id_seq OWNER TO postgres;

--
-- Name: test_data_id_seq; Type: SEQUENCE OWNED BY; Schema: notifications; Owner: postgres
--

ALTER SEQUENCE notifications.test_data_id_seq OWNED BY notifications.test_data.id;


--
-- Name: test_data; Type: TABLE; Schema: travel_expenses; Owner: postgres
--

CREATE TABLE travel_expenses.test_data (
    id integer NOT NULL,
    name character varying(250),
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE travel_expenses.test_data OWNER TO postgres;

--
-- Name: test_data_id_seq; Type: SEQUENCE; Schema: travel_expenses; Owner: postgres
--

CREATE SEQUENCE travel_expenses.test_data_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE travel_expenses.test_data_id_seq OWNER TO postgres;

--
-- Name: test_data_id_seq; Type: SEQUENCE OWNED BY; Schema: travel_expenses; Owner: postgres
--

ALTER SEQUENCE travel_expenses.test_data_id_seq OWNED BY travel_expenses.test_data.id;


--
-- Name: test_data id; Type: DEFAULT; Schema: academic_registration; Owner: postgres
--

ALTER TABLE ONLY academic_registration.test_data ALTER COLUMN id SET DEFAULT nextval('academic_registration.test_data_id_seq'::regclass);


--
-- Name: test_data id; Type: DEFAULT; Schema: academic_work_plan; Owner: postgres
--

ALTER TABLE ONLY academic_work_plan.test_data ALTER COLUMN id SET DEFAULT nextval('academic_work_plan.test_data_id_seq'::regclass);


--
-- Name: test_data id; Type: DEFAULT; Schema: certification; Owner: postgres
--

ALTER TABLE ONLY certification.test_data ALTER COLUMN id SET DEFAULT nextval('certification.test_data_id_seq'::regclass);


--
-- Name: test_data id; Type: DEFAULT; Schema: internal_disciplinary_control; Owner: postgres
--

ALTER TABLE ONLY internal_disciplinary_control.test_data ALTER COLUMN id SET DEFAULT nextval('internal_disciplinary_control.test_data_id_seq'::regclass);


--
-- Name: test_data id; Type: DEFAULT; Schema: internal_institutional_control; Owner: postgres
--

ALTER TABLE ONLY internal_institutional_control.test_data ALTER COLUMN id SET DEFAULT nextval('internal_institutional_control.test_data_id_seq'::regclass);


--
-- Name: test_data id; Type: DEFAULT; Schema: interoperability; Owner: postgres
--

ALTER TABLE ONLY interoperability.test_data ALTER COLUMN id SET DEFAULT nextval('interoperability.test_data_id_seq'::regclass);


--
-- Name: test_data id; Type: DEFAULT; Schema: legal_management; Owner: postgres
--

ALTER TABLE ONLY legal_management.test_data ALTER COLUMN id SET DEFAULT nextval('legal_management.test_data_id_seq'::regclass);


--
-- Name: test_data id; Type: DEFAULT; Schema: notifications; Owner: postgres
--

ALTER TABLE ONLY notifications.test_data ALTER COLUMN id SET DEFAULT nextval('notifications.test_data_id_seq'::regclass);


--
-- Name: test_data id; Type: DEFAULT; Schema: travel_expenses; Owner: postgres
--

ALTER TABLE ONLY travel_expenses.test_data ALTER COLUMN id SET DEFAULT nextval('travel_expenses.test_data_id_seq'::regclass);


--
-- Data for Name: test_data; Type: TABLE DATA; Schema: academic_registration; Owner: postgres
--

COPY academic_registration.test_data (id, name, description, created_at, updated_at) FROM stdin;
1	Test 1	Dato de prueba para Academic Registration	2025-12-03 13:07:39.080639+00	2025-12-03 13:07:39.080639+00
2	Test 2	Otro dato de prueba	2025-12-03 13:07:39.080639+00	2025-12-03 13:07:39.080639+00
\.


--
-- Data for Name: test_data; Type: TABLE DATA; Schema: academic_work_plan; Owner: postgres
--

COPY academic_work_plan.test_data (id, name, description, created_at, updated_at) FROM stdin;
1	Test Plan 1	Dato de prueba para Academic Work Plan	2025-12-03 13:07:39.143784+00	2025-12-03 13:07:39.143784+00
2	Test Plan 2	Otro dato de prueba	2025-12-03 13:07:39.143784+00	2025-12-03 13:07:39.143784+00
\.


--
-- Data for Name: CARGOS; Type: TABLE DATA; Schema: auth; Owner: postgres
--

COPY auth."CARGOS" ("ID_CARGO", "COD_CARGO", "ID_CARGO01", "NOM_CARGO", "FEC_ULT_ACT", "FEC_CREACION", "NOM_DES_CARGO", "USU_CREACION", "USU_ACTUALIZACION", "COD_EQUIVALE", "TIP_JER_CARGO", "COD_JER_CARGO", "EMP_JER_CARGO") FROM stdin;
\.


--
-- Data for Name: CENTROS_COSTO; Type: TABLE DATA; Schema: auth; Owner: postgres
--

COPY auth."CENTROS_COSTO" ("ID_CEN_COSTO", "ID_EMPRESA", "COD_CEN_COSTO", "NOM_CEN_COSTO", "COD_CEN_PADRE", "FEC_ULT_ACT", "FEC_CREACION", "USU_CREACION", "USU_ACTUALIZACION", "EST_CENTRO", "ID_GEOPOLITICA", "IND_MOVIMIENTO") FROM stdin;
\.


--
-- Data for Name: DEPENDENCIAS; Type: TABLE DATA; Schema: auth; Owner: postgres
--

COPY auth."DEPENDENCIAS" ("ID_DEPENDENCIA", "ID_EMPRESA", "COD_DEPENDENCIA", "ID_CEN_COSTO", "ID_DEPENDENCIA1", "NOM_DEPENDENCIA", "NOM_RESPONSABLE", "TIP_UNIDAD", "FEC_ULT_ACT", "FEC_CREACION", "USU_CREACION", "USU_ACTUALIZACION", "ID_TERCERO", "ID_SEDE", "COD_TIP_UNIDAD", "COD_PAI_TELEFONO", "COD_ARE_TELEFONO", "NUM_TELEFONO", "COD_PAI_NUM_FAX", "COD_ARE_NUM_FAX", "NUM_APARTADO", "URL_DEPENDENCIA", "DIR_EMAIL", "ID_GEOPOLITICA", "ID_CARGO", "TEL_EXT", "DIR_DEPENDENCIA", "NUM_FAX", "GEN_TIP_UNIDAD", "EMP_COD_TIP_UNIDAD", "DIR_EMAIL2", "FIR_DEPENDENCIA1", "FIR_DEPENDENCIA2", "FIR_DEPENDENCIA3", "FIR_DEPENDENCIA4", "ID_DEP_FIR_CER1", "ID_DEP_FIR_CER2", "ID_DEP_FIR_CER3", "ID_DEP_FIR_CER4") FROM stdin;
\.


--
-- Data for Name: GENERICA; Type: TABLE DATA; Schema: auth; Owner: postgres
--

COPY auth."GENERICA" ("TIP_TABLA", "COD_TABLA", "NOM_TABLA", "COD_AUXILIAR1", "COD_AUXILIAR2", "NOM_ALIAS", "FEC_ULI_ACT", "FEC_CREACION", "USU_CREACION", "USU_ACTUALIZACION", "COD_SNIES", "NOM_ESTRUCTURA", "IND_PRIVADA", "IND_VISIBLE", "DES_TABLA", "COD_DIRECTORIO", "ID_EMPRESA") FROM stdin;
\.


--
-- Data for Name: GEOPOLITICA; Type: TABLE DATA; Schema: auth; Owner: postgres
--

COPY auth."GEOPOLITICA" ("ID_GEOPOLITICA", "COD_GEOPOLITICA", "COD_PAIS", "COD_DEPARTAMENTO", "COD_CIUDAD", "NOM_DIV_GEOPOLITICA", "NUM_HABITANTES", "TIP_DIVISION", "COD_DIVISION", "COD_ZON_GEOGRAFICA", "FEC_ULT_ACT", "FEC_CREACION", "USU_CREACION", "USU_ACTUALIZACION", "COD_INTL_PAIS", "COD_UNSO", "COD_DIAN", "COD_LAT", "COD_LON", "ID_PADRE", "COD_IDIOMA", "NOM_IDIOMA", "COD_IDM", "NOM_DIV_GEOPOLITICA_TOT", "COD_ARE_TEL", "COD_PAIS_DEFECTO", "IND_OCULTO") FROM stdin;
\.


--
-- Data for Name: INFORMACION_ADICIONAL_PERSONAS; Type: TABLE DATA; Schema: auth; Owner: postgres
--

COPY auth."INFORMACION_ADICIONAL_PERSONAS" ("ID_TERCERO", "OBS_TERCERO", "NUM_VISA", "CLA_VISA", "CLA_LIBRETA", "GRU_SANGUINEO", "FRH_SANGUINEO", "ZON_ORIGEN", "COD_RAZA", "COD_GRU_ETNICO", "COD_RELIGION", "COD_ESTATURA", "FEC_ULT_ACT", "FEC_CREACION", "USU_CREACION", "USU_ACTUALIZACION", "CLA_TERCERO", "IND_GRU_VULNERABLE", "IND_VIC_ARMADO", "ID_LUG_DESPLAZADO", "IND_ORI_SECTOR", "IND_POL_ESPECIAL", "NUM_PER_GRUPO", "NUM_PER_APORTAN", "VAL_ING_FAMILIAR", "IND_TIP_VIVIENDA", "IND_DEU_VIVIENDA", "POS_HERMANOS", "COD_PAI_FRONTERIZO", "COD_CAPACIDAD", "COD_RESGUARDO", "CAM_FOTO", "NOM_RESGUARDO", "NIV_ESTUDIO", "TIP_OCUPACION", "IND_APORTANTE", "COD_GRU_SANGUINEO", "EMP_GRU_SANGUINEO", "COD_FRH_SANGUINEO", "EMP_FRH_SANGUINEO", "GEN_RAZA", "EMP_COD_RAZA", "GEN_GRU_ETNICO", "EMP_COD_GRU_ETNICO", "GEN_RELIGION", "EMP_COD_RELIGION", "GEN_CAPACIDAD", "EMP_COD_CAPACIDAD", "GEN_RESGUARDO", "EMP_COD_RESGUARDO", "COD_NIV_ESTUDIO", "EMP_NIV_ESTUDIO", "COD_TIP_OCUPACION", "EMP_TIP_OCUPACION", "TIP_SISPEN", "COD_SIPEN", "EMP_SISPEN", "FEC_AFILIA_SISPEN", "TIP_AFP", "COD_AFP", "EMP_AFP", "CODIGO_AFP", "URBANIZACION", "TELEFONO_2", "TIP_APELATIVO", "COD_APELATIVO", "EMP_APELATIVO", "TEL_OFICINA", "NUM_CUENTA_1", "ID_BANCO_1", "TIP_CUENTA_1", "COD_CUENTA_1", "EMP_CUENTA_1", "NUM_CUENTA_2", "ID_BANCO_2", "TIP_CUENTA_2", "COD_CUENTA_2", "EMP_CUENTA_2", "TIP_TABVIA", "COD_TABVIA", "EMP_TABVIA", "TEL_EMERGENCIA", "CONTACTO_EMERGENCIA", "TIP_SIT_PADRES", "COD_SIT_PADRES", "EMP_SIT_PADRES", "NUM_PER_TRABAJAN", "NUMERO_HERMANOS", "NUM_HERMANOS_EDUC_SUPERIOR", "TIP_COSTEO_ESTUDIOS", "COD_COSTEO_ESTUDIOS", "EMP_COSTEO_ESTUDIOS", "NUMERO_HIJOS", "PERFIL_PROFESIONAL", "ANIOS_EXPERIENCIA", "TIP_PUE_INDG", "COD_PUE_INDG", "EMP_PUE_INDG", "TIP_ZONA_RES", "COD_ZONA_RES", "EMP_ZONA_RES", "TIP_COM_NEGRA", "COD_COM_NEGRA", "EMP_COM_NEGRA", "IND_REL_FAMILIAR", "TIP_REL_FAMILIAR", "COD_REL_FAMILIAR", "EMP_REL_FAMILIAR", "TIP_DISCAPACIDAD", "COD_DISCAPACIDAD", "EMP_DISCAPACIDAD", "ID_REGIMEN_ESPECIAL", "TIP_REGIMEN", "COD_REGIMEN", "EMP_REGIMEN", "TIP_LEY_BENEFICIO", "COD_LEY_BENEFICIO", "EMP_LEY_BENEFICIO") FROM stdin;
\.


--
-- Data for Name: PERMISSION; Type: TABLE DATA; Schema: auth; Owner: postgres
--

COPY auth."PERMISSION" ("ID_PERMISSION", "NAME", "DESCRIPTION", "IS_ACTIVE", "CREATED_AT", "UPDATED_AT") FROM stdin;
550e8400-e29b-41d4-a716-446655440002	users.create	Crear usuarios	t	\N	\N
550e8400-e29b-41d4-a716-446655440003	users.read	Ver usuarios	t	\N	\N
550e8400-e29b-41d4-a716-446655440004	users.update	Actualizar usuarios	t	\N	\N
550e8400-e29b-41d4-a716-446655440005	users.delete	Eliminar usuarios	t	\N	\N
550e8400-e29b-41d4-a716-446655440006	roles.manage	Gestionar roles	t	\N	\N
550e8400-e29b-41d4-a716-446655440007	permissions.manage	Gestionar permisos	t	\N	\N
\.


--
-- Data for Name: PERSONAS; Type: TABLE DATA; Schema: auth; Owner: postgres
--

COPY auth."PERSONAS" ("ID_TERCERO", "NUM_IDENTIFICACION", "TIP_IDENTIFICACION", "NOM_LARGO", "SIG_TERCERO", "NOM_TERCERO", "PRI_APELLIDO", "SEG_APELLIDO", "GEN_TERCERO", "EST_CIVIL", "FEC_NACIMIENTO", "COD_NACIONALIDAD", "IND_VIVE", "DIR_RESIDENCIA", "DIR_EMAIL", "TEL_RESIDENCIA", "TEL_CELULAR", "ID_UBI_RES", "ID_UBI_NAC", "NUM_TARJETA_MILITAR", "DIS_TARJETA_MILITAR", "COD_ANTERIOR", "COD_TERCERO", "FEC_CREACION", "FEC_MODIFICACION", "USU_CREACION", "USU_MODIFICACION", "GRU_SANGUINEO", "FRH_SANGUINEO", "ZON_ORIGEN", "ID_UBI_DOCUMENTO", "DIG_CHEQUEO", "IND_SORDERA", "IND_PROB_MOTORES", "IND_INVIDENTE", "IND_VISION_PARCIAL", "FEC_EXP_DOCUMENTO", "FEC_ULT_ACT_LABORAL", "IND_ACT_LABORAL", "COD_CAT_TERCERO", "ATR_TERCERO", "NOM_ARC_FOTO", "NIV_ING_FAMILIAR", "NOM_BARRIO", "DEP_ECONOMICA", "NUM_PER_FAMILIAR", "NUM_PER_A_CARGO", "ID_BARRIO", "SEG_NOMBRE", "COD_PAI_TEL", "COD_ARE_TEL", "COD_ARE_NUM_FAX", "COD_ARE_TEL_RESIDENCIA", "COD_PAI_NUM_FAX", "COD_PAI_TEL_RESIDENCIA", "ID_EMPRESA", "NUM_FAX", "IND_ACT_DAT_TERCERO", "COD_USUARIO_LDAP", "DIR_EMAIL_PER", "COD_TIP_IDENTIFICACION", "EMP_TIP_IDENTIFICACION", "TIP_GEN_TERCERO", "EMP_GEN_TERCERO", "NUM_EST_ECONOMICO", "TIP_EST_ECONOMICO", "EMP_EST_ECONOMICO", "EPS_TERCERO", "TIP_EPS_TERCERO", "EMP_EPS_TERCERO", "TIP_EST_CIVIL", "EMP_EST_CIVIL", "NAT_TERCERO", "TIP_NAT_TERCERO", "EMP_NAT_TERCERO", "TIP_COD_NACIONALIDAD", "EMP_COD_NACIONALIDAD", "FEC_ACT_DAT_TERCERO", "FACEBOOK", "TWITTER", "LINKEDIN", "SKYPE", "WHATSAPP", "IND_CON_LEGALES", "IND_HOJA_VIDA", "IND_HABEAS_DATA", "FEC_HABEAS_DATA", "IP_HABEAS_DATA", "NUM_PASAPORTE", "FEC_VIG_PASAPORTE", "NOM_DOC_FIRMA", "EXT_DOC_FIRMA", "DOC_FIRMA", "TAM_DOC_FIRMA", "IND_EXP_LABORAR", "IND_HABEAS_DATA_EGRE", "FEC_HABEAS_DATA_EGRE", "IP_HABEAS_DATA_EGRE", "PWD_CVLAC", "NACIONALIDAD_CVLAC", "NOMBRES_CVLAC", "NUM_IDENTI_CVLAC") FROM stdin;
1	123456789	CC	Super User	\N	Super	Usuario	\N	M	\N	\N	\N	1	\N	superuser@esap.edu.co	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	\N	\N	TIPIDE	0	TIPGEN	0	\N	ESTRAT	0	\N	CODEPS	0	ESTCIV	0	\N	NATTER	0	TIPNAC	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	\N	\N	\N	\N	\N	\N
2	123456789	CC	Admin Sistema	\N	Admin	Sistema	\N	M	\N	\N	\N	1	\N	admin@esap.edu.co	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	\N	\N	TIPIDE	0	TIPGEN	0	\N	ESTRAT	0	\N	CODEPS	0	ESTCIV	0	\N	NATTER	0	TIPNAC	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	\N	\N	\N	\N	\N	\N
3	123456790	CC	Estudiante Prueba	\N	Estudiante	Prueba	\N	M	\N	\N	\N	1	\N	estudiante@esap.edu.co	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	\N	\N	TIPIDE	0	TIPGEN	0	\N	ESTRAT	0	\N	CODEPS	0	ESTCIV	0	\N	NATTER	0	TIPNAC	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	\N	\N	\N	\N	\N	\N
4	123456791	CC	Docente Planta	\N	Docente	Planta	\N	F	\N	\N	\N	1	\N	planta@esap.edu.co	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	\N	\N	TIPIDE	0	TIPGEN	0	\N	ESTRAT	0	\N	CODEPS	0	ESTCIV	0	\N	NATTER	0	TIPNAC	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	\N	\N	\N	\N	\N	\N
5	123456792	CC	Docente Cátedra	\N	Docente	Cátedra	\N	M	\N	\N	\N	1	\N	catedra@esap.edu.co	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	\N	\N	TIPIDE	0	TIPGEN	0	\N	ESTRAT	0	\N	CODEPS	0	ESTCIV	0	\N	NATTER	0	TIPNAC	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	\N	\N	\N	\N	\N	\N
6	123456793	CC	Gestor Certificados	\N	Gestor	Certificados	\N	F	\N	\N	\N	1	\N	cerlaboral@esap.edu.co	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	\N	\N	TIPIDE	0	TIPGEN	0	\N	ESTRAT	0	\N	CODEPS	0	ESTCIV	0	\N	NATTER	0	TIPNAC	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: ROLE; Type: TABLE DATA; Schema: auth; Owner: postgres
--

COPY auth."ROLE" ("ID_ROL", "NAME", "DESCRIPTION", "IS_ACTIVE", "CREATED_AT", "UPDATED_AT") FROM stdin;
660e8400-e29b-41d4-a716-446655440001	SUPER	Super User	t	\N	\N
660e8400-e29b-41d4-a716-446655440002	ADMIN	Administrador del sistema	t	\N	\N
660e8400-e29b-41d4-a716-446655440003	USER	Usuario regular	t	\N	\N
\.


--
-- Data for Name: ROLE_PERMISSIONS; Type: TABLE DATA; Schema: auth; Owner: postgres
--

COPY auth."ROLE_PERMISSIONS" ("ID_ROL", "ID_PERMISSION", "IS_ACTIVE", "CREATED_AT", "UPDATED_AT") FROM stdin;
660e8400-e29b-41d4-a716-446655440001	550e8400-e29b-41d4-a716-446655440002	t	\N	\N
660e8400-e29b-41d4-a716-446655440001	550e8400-e29b-41d4-a716-446655440003	t	\N	\N
660e8400-e29b-41d4-a716-446655440001	550e8400-e29b-41d4-a716-446655440004	t	\N	\N
660e8400-e29b-41d4-a716-446655440001	550e8400-e29b-41d4-a716-446655440005	t	\N	\N
660e8400-e29b-41d4-a716-446655440001	550e8400-e29b-41d4-a716-446655440006	t	\N	\N
660e8400-e29b-41d4-a716-446655440001	550e8400-e29b-41d4-a716-446655440007	t	\N	\N
660e8400-e29b-41d4-a716-446655440002	550e8400-e29b-41d4-a716-446655440002	t	\N	\N
660e8400-e29b-41d4-a716-446655440002	550e8400-e29b-41d4-a716-446655440003	t	\N	\N
660e8400-e29b-41d4-a716-446655440002	550e8400-e29b-41d4-a716-446655440004	t	\N	\N
660e8400-e29b-41d4-a716-446655440002	550e8400-e29b-41d4-a716-446655440005	t	\N	\N
660e8400-e29b-41d4-a716-446655440002	550e8400-e29b-41d4-a716-446655440006	t	\N	\N
660e8400-e29b-41d4-a716-446655440002	550e8400-e29b-41d4-a716-446655440007	t	\N	\N
\.


--
-- Data for Name: SECCIONALES; Type: TABLE DATA; Schema: auth; Owner: postgres
--

COPY auth."SECCIONALES" ("ID_SECCIONAL", "NOM_SECCIONAL", "DIR_SECCIONAL", "ID_UBI_SECCIONAL", "FEC_CREACION", "FEC_ULT_ACT", "USU_CREACION", "USU_ACTUALIZACION", "COD_SECCIONAL", "ID_EMPRESA", "NIT_SECCIONAL", "FIR_SECCIONAL1", "FIR_SECCIONAL2", "FIR_SECCIONAL3", "FIR_SECCIONAL4", "ID_DEP_FIR_CER1", "ID_DEP_FIR_CER2", "ID_DEP_FIR_CER3", "ID_DEP_FIR_CER4") FROM stdin;
\.


--
-- Data for Name: SEDES; Type: TABLE DATA; Schema: auth; Owner: postgres
--

COPY auth."SEDES" ("ID_SEDE", "ID_EMPRESA", "COD_SEDE", "NOM_SEDE", "ID_GEOPOLITICA", "DIR_SEDE", "FEC_ULT_ACT", "FEC_CREACION", "USU_CREACION", "USU_ACTUALIZACION", "COD_ATRIBUTO", "ID_SECCIONAL", "SEDE_ACT", "NUM_LATITUD", "NUM_LONGITUD", "COD_IAC_INSCRIPCIONES", "COD_IAC_MATRICULA", "COD_IAC_OTROS_CONCEPTOS", "FIR_SEDE1", "FIR_SEDE2", "FIR_SEDE3", "FIR_SEDE4", "ID_DEP_FIR_CER1", "ID_DEP_FIR_CER2", "ID_DEP_FIR_CER3", "ID_DEP_FIR_CER4") FROM stdin;
\.


--
-- Data for Name: TIPOS_TERCERO; Type: TABLE DATA; Schema: auth; Owner: postgres
--

COPY auth."TIPOS_TERCERO" ("ID_TIP_TERCERO", "ID_TERCERO", "TIP_TABLA", "COD_TABLA", "EMP_TABLA", "NOM_TIPO_TERCERO", "FEC_ULT_ACT", "FEC_CREACION", "USU_CREACION", "USU_ACTUALIZACION", "CLA_TERCERO", "GRA_EST_ALUMNO", "IND_ACTIVO", "IND_RESTAURA", "IND_DEFECTO", "ID_EMPRESA", "FEC_FIN", "FEC_CLA_TERCERO") FROM stdin;
\.


--
-- Data for Name: USER; Type: TABLE DATA; Schema: auth; Owner: postgres
--

COPY auth."USER" ("ID_USER", "USERNAME", "PASSWORD", "ID_TERCERO", "IS_ACTIVE", "TOKEN", "CREATED_AT", "UPDATED_AT") FROM stdin;
770e8400-e29b-41d4-a716-446655440001	superuser@esap.edu.co	$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi	1	t	\N	\N	\N
770e8400-e29b-41d4-a716-446655440002	admin@esap.edu.co	$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi	2	t	\N	\N	\N
770e8400-e29b-41d4-a716-446655440003	estudiante@esap.edu.co	$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi	3	t	\N	\N	\N
770e8400-e29b-41d4-a716-446655440004	planta@esap.edu.co	$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi	4	t	\N	\N	\N
770e8400-e29b-41d4-a716-446655440005	catedra@esap.edu.co	$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi	5	t	\N	\N	\N
770e8400-e29b-41d4-a716-446655440006	cerlaboral@esap.edu.co	$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi	6	t	\N	\N	\N
\.


--
-- Data for Name: USER_ROLES; Type: TABLE DATA; Schema: auth; Owner: postgres
--

COPY auth."USER_ROLES" ("ID_USER", "ID_ROL", "IS_ACTIVE", "CREATED_AT", "UPDATED_AT") FROM stdin;
770e8400-e29b-41d4-a716-446655440001	660e8400-e29b-41d4-a716-446655440001	t	\N	\N
770e8400-e29b-41d4-a716-446655440002	660e8400-e29b-41d4-a716-446655440002	t	\N	\N
770e8400-e29b-41d4-a716-446655440003	660e8400-e29b-41d4-a716-446655440003	t	\N	\N
770e8400-e29b-41d4-a716-446655440004	660e8400-e29b-41d4-a716-446655440003	t	\N	\N
770e8400-e29b-41d4-a716-446655440005	660e8400-e29b-41d4-a716-446655440003	t	\N	\N
770e8400-e29b-41d4-a716-446655440006	660e8400-e29b-41d4-a716-446655440003	t	\N	\N
\.


--
-- Data for Name: permission; Type: TABLE DATA; Schema: auth; Owner: postgres
--

COPY auth.permission (id, name, description, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: person; Type: TABLE DATA; Schema: auth; Owner: postgres
--

COPY auth.person (id, first_name, last_name, email, phone, created_at, updated_at) FROM stdin;
11111111-1111-1111-1111-111111111111	Super	User	superuser@esap.edu.co	3001234567	2025-12-04 06:13:14.825977	2025-12-04 06:13:14.825977
22222222-2222-2222-2222-222222222222	Admin	Sistema	admin@esap.edu.co	3001234568	2025-12-04 06:13:14.825977	2025-12-04 06:13:14.825977
33333333-3333-3333-3333-333333333333	Estudiante	Prueba	estudiante@esap.edu.co	3001234569	2025-12-04 06:13:14.825977	2025-12-04 06:13:14.825977
44444444-4444-4444-4444-444444444444	Docente	Planta	planta@esap.edu.co	3001234570	2025-12-04 06:13:14.825977	2025-12-04 06:13:14.825977
55555555-5555-5555-5555-555555555555	Docente	Cátedra	catedra@esap.edu.co	3001234571	2025-12-04 06:13:14.825977	2025-12-04 06:13:14.825977
66666666-6666-6666-6666-666666666666	Gestor	Certificados	cerlaboral@esap.edu.co	3001234572	2025-12-04 06:13:14.825977	2025-12-04 06:13:14.825977
\.


--
-- Data for Name: role; Type: TABLE DATA; Schema: auth; Owner: postgres
--

COPY auth.role (id, name, description, created_at, updated_at) FROM stdin;
10000000-0000-0000-0000-000000000001	SUPER	Super User con acceso completo	2025-12-04 06:14:33.61674	2025-12-04 06:14:33.61674
20000000-0000-0000-0000-000000000002	ADMIN	Administrador del sistema	2025-12-04 06:14:33.61674	2025-12-04 06:14:33.61674
30000000-0000-0000-0000-000000000003	USER	Usuario regular	2025-12-04 06:14:33.61674	2025-12-04 06:14:33.61674
40000000-0000-0000-0000-000000000004	ESTUDIANTE	Estudiante de la ESAP	2025-12-04 06:14:33.61674	2025-12-04 06:14:33.61674
50000000-0000-0000-0000-000000000005	DOCENTE	Docente de la ESAP	2025-12-04 06:14:33.61674	2025-12-04 06:14:33.61674
60000000-0000-0000-0000-000000000006	CERTIFICADOS	Gestor de Certificados Laborales	2025-12-04 06:14:33.61674	2025-12-04 06:14:33.61674
\.


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: auth; Owner: postgres
--

COPY auth.role_permissions (role_id, permission_id) FROM stdin;
\.


--
-- Data for Name: user; Type: TABLE DATA; Schema: auth; Owner: postgres
--

COPY auth."user" (id, username, password_hash, is_active, created_at, updated_at, person_id) FROM stdin;
aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa	superuser@esap.edu.co	$2b$10$ofMAn3BaPnChEIFM0ms/6uXwBFMeQKJZsOAVW02spi7oj1gnhKDAa	t	2025-12-04 06:13:14.846671	2025-12-04 06:13:14.846671	11111111-1111-1111-1111-111111111111
bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb	admin@esap.edu.co	$2b$10$ofMAn3BaPnChEIFM0ms/6uXwBFMeQKJZsOAVW02spi7oj1gnhKDAa	t	2025-12-04 06:13:14.846671	2025-12-04 06:13:14.846671	22222222-2222-2222-2222-222222222222
cccccccc-cccc-cccc-cccc-cccccccccccc	estudiante@esap.edu.co	$2b$10$ofMAn3BaPnChEIFM0ms/6uXwBFMeQKJZsOAVW02spi7oj1gnhKDAa	t	2025-12-04 06:13:14.846671	2025-12-04 06:13:14.846671	33333333-3333-3333-3333-333333333333
dddddddd-dddd-dddd-dddd-dddddddddddd	planta@esap.edu.co	$2b$10$ofMAn3BaPnChEIFM0ms/6uXwBFMeQKJZsOAVW02spi7oj1gnhKDAa	t	2025-12-04 06:13:14.846671	2025-12-04 06:13:14.846671	44444444-4444-4444-4444-444444444444
eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee	catedra@esap.edu.co	$2b$10$ofMAn3BaPnChEIFM0ms/6uXwBFMeQKJZsOAVW02spi7oj1gnhKDAa	t	2025-12-04 06:13:14.846671	2025-12-04 06:13:14.846671	55555555-5555-5555-5555-555555555555
ffffffff-ffff-ffff-ffff-ffffffffffff	cerlaboral@esap.edu.co	$2b$10$ofMAn3BaPnChEIFM0ms/6uXwBFMeQKJZsOAVW02spi7oj1gnhKDAa	t	2025-12-04 06:13:14.846671	2025-12-04 06:13:14.846671	66666666-6666-6666-6666-666666666666
\.


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: auth; Owner: postgres
--

COPY auth.user_roles (user_id, role_id) FROM stdin;
aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa	10000000-0000-0000-0000-000000000001
aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa	20000000-0000-0000-0000-000000000002
bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb	20000000-0000-0000-0000-000000000002
cccccccc-cccc-cccc-cccc-cccccccccccc	30000000-0000-0000-0000-000000000003
cccccccc-cccc-cccc-cccc-cccccccccccc	40000000-0000-0000-0000-000000000004
dddddddd-dddd-dddd-dddd-dddddddddddd	30000000-0000-0000-0000-000000000003
dddddddd-dddd-dddd-dddd-dddddddddddd	50000000-0000-0000-0000-000000000005
eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee	30000000-0000-0000-0000-000000000003
eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee	50000000-0000-0000-0000-000000000005
ffffffff-ffff-ffff-ffff-ffffffffffff	20000000-0000-0000-0000-000000000002
ffffffff-ffff-ffff-ffff-ffffffffffff	60000000-0000-0000-0000-000000000006
\.


--
-- Data for Name: test_data; Type: TABLE DATA; Schema: certification; Owner: postgres
--

COPY certification.test_data (id, name, description, created_at, updated_at) FROM stdin;
1	Test Certificate 1	Dato de prueba para Certification	2025-12-03 13:07:39.203169+00	2025-12-03 13:07:39.203169+00
2	Test Certificate 2	Otro dato de prueba	2025-12-03 13:07:39.203169+00	2025-12-03 13:07:39.203169+00
\.


--
-- Data for Name: test_data; Type: TABLE DATA; Schema: internal_disciplinary_control; Owner: postgres
--

COPY internal_disciplinary_control.test_data (id, name, description, created_at, updated_at) FROM stdin;
1	Test Control 1	Dato de prueba para Internal Disciplinary Control	2025-12-03 13:07:39.266029+00	2025-12-03 13:07:39.266029+00
2	Test Control 2	Otro dato de prueba	2025-12-03 13:07:39.266029+00	2025-12-03 13:07:39.266029+00
\.


--
-- Data for Name: test_data; Type: TABLE DATA; Schema: internal_institutional_control; Owner: postgres
--

COPY internal_institutional_control.test_data (id, name, description, created_at, updated_at) FROM stdin;
1	Test Institutional 1	Dato de prueba para Internal Institutional Control	2025-12-03 13:07:39.370512+00	2025-12-03 13:07:39.370512+00
2	Test Institutional 2	Otro dato de prueba	2025-12-03 13:07:39.370512+00	2025-12-03 13:07:39.370512+00
\.


--
-- Data for Name: test_data; Type: TABLE DATA; Schema: interoperability; Owner: postgres
--

COPY interoperability.test_data (id, name, description, created_at, updated_at) FROM stdin;
1	Test Integration 1	Dato de prueba para Interoperability	2025-12-03 13:07:39.321539+00	2025-12-03 13:07:39.321539+00
2	Test Integration 2	Otro dato de prueba	2025-12-03 13:07:39.321539+00	2025-12-03 13:07:39.321539+00
\.


--
-- Data for Name: test_data; Type: TABLE DATA; Schema: legal_management; Owner: postgres
--

COPY legal_management.test_data (id, name, description, created_at, updated_at) FROM stdin;
1	Test Legal 1	Dato de prueba para Legal Management	2025-12-03 13:07:39.425032+00	2025-12-03 13:07:39.425032+00
2	Test Legal 2	Otro dato de prueba	2025-12-03 13:07:39.425032+00	2025-12-03 13:07:39.425032+00
\.


--
-- Data for Name: test_data; Type: TABLE DATA; Schema: notifications; Owner: postgres
--

COPY notifications.test_data (id, name, description, created_at, updated_at) FROM stdin;
1	Test Notification 1	Dato de prueba para Notifications	2025-12-03 13:07:39.477451+00	2025-12-03 13:07:39.477451+00
2	Test Notification 2	Otro dato de prueba	2025-12-03 13:07:39.477451+00	2025-12-03 13:07:39.477451+00
\.


--
-- Data for Name: test_data; Type: TABLE DATA; Schema: travel_expenses; Owner: postgres
--

COPY travel_expenses.test_data (id, name, description, created_at, updated_at) FROM stdin;
1	Test Travel 1	Dato de prueba para Travel Expenses	2025-12-03 13:07:39.53471+00	2025-12-03 13:07:39.53471+00
2	Test Travel 2	Otro dato de prueba	2025-12-03 13:07:39.53471+00	2025-12-03 13:07:39.53471+00
\.


--
-- Name: test_data_id_seq; Type: SEQUENCE SET; Schema: academic_registration; Owner: postgres
--

SELECT pg_catalog.setval('academic_registration.test_data_id_seq', 2, true);


--
-- Name: test_data_id_seq; Type: SEQUENCE SET; Schema: academic_work_plan; Owner: postgres
--

SELECT pg_catalog.setval('academic_work_plan.test_data_id_seq', 2, true);


--
-- Name: test_data_id_seq; Type: SEQUENCE SET; Schema: certification; Owner: postgres
--

SELECT pg_catalog.setval('certification.test_data_id_seq', 2, true);


--
-- Name: test_data_id_seq; Type: SEQUENCE SET; Schema: internal_disciplinary_control; Owner: postgres
--

SELECT pg_catalog.setval('internal_disciplinary_control.test_data_id_seq', 2, true);


--
-- Name: test_data_id_seq; Type: SEQUENCE SET; Schema: internal_institutional_control; Owner: postgres
--

SELECT pg_catalog.setval('internal_institutional_control.test_data_id_seq', 2, true);


--
-- Name: test_data_id_seq; Type: SEQUENCE SET; Schema: interoperability; Owner: postgres
--

SELECT pg_catalog.setval('interoperability.test_data_id_seq', 2, true);


--
-- Name: test_data_id_seq; Type: SEQUENCE SET; Schema: legal_management; Owner: postgres
--

SELECT pg_catalog.setval('legal_management.test_data_id_seq', 2, true);


--
-- Name: test_data_id_seq; Type: SEQUENCE SET; Schema: notifications; Owner: postgres
--

SELECT pg_catalog.setval('notifications.test_data_id_seq', 2, true);


--
-- Name: test_data_id_seq; Type: SEQUENCE SET; Schema: travel_expenses; Owner: postgres
--

SELECT pg_catalog.setval('travel_expenses.test_data_id_seq', 2, true);


--
-- Name: test_data test_data_pkey; Type: CONSTRAINT; Schema: academic_registration; Owner: postgres
--

ALTER TABLE ONLY academic_registration.test_data
    ADD CONSTRAINT test_data_pkey PRIMARY KEY (id);


--
-- Name: test_data test_data_pkey; Type: CONSTRAINT; Schema: academic_work_plan; Owner: postgres
--

ALTER TABLE ONLY academic_work_plan.test_data
    ADD CONSTRAINT test_data_pkey PRIMARY KEY (id);


--
-- Name: CARGOS CARGOS_pkey; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth."CARGOS"
    ADD CONSTRAINT "CARGOS_pkey" PRIMARY KEY ("ID_CARGO");


--
-- Name: CENTROS_COSTO CENTROS_COSTO_pkey; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth."CENTROS_COSTO"
    ADD CONSTRAINT "CENTROS_COSTO_pkey" PRIMARY KEY ("ID_CEN_COSTO");


--
-- Name: DEPENDENCIAS DEPENDENCIAS_pkey; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth."DEPENDENCIAS"
    ADD CONSTRAINT "DEPENDENCIAS_pkey" PRIMARY KEY ("ID_DEPENDENCIA");


--
-- Name: GENERICA GENERICA_pkey; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth."GENERICA"
    ADD CONSTRAINT "GENERICA_pkey" PRIMARY KEY ("TIP_TABLA", "COD_TABLA", "ID_EMPRESA");


--
-- Name: GEOPOLITICA GEOPOLITICA_pkey; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth."GEOPOLITICA"
    ADD CONSTRAINT "GEOPOLITICA_pkey" PRIMARY KEY ("ID_GEOPOLITICA");


--
-- Name: INFORMACION_ADICIONAL_PERSONAS INFORMACION_ADICIONAL_PERSONAS_pkey; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth."INFORMACION_ADICIONAL_PERSONAS"
    ADD CONSTRAINT "INFORMACION_ADICIONAL_PERSONAS_pkey" PRIMARY KEY ("ID_TERCERO");


--
-- Name: PERMISSION PERMISSION_NAME_key; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth."PERMISSION"
    ADD CONSTRAINT "PERMISSION_NAME_key" UNIQUE ("NAME");


--
-- Name: PERMISSION PERMISSION_pkey; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth."PERMISSION"
    ADD CONSTRAINT "PERMISSION_pkey" PRIMARY KEY ("ID_PERMISSION");


--
-- Name: PERSONAS PERSONAS_pkey; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth."PERSONAS"
    ADD CONSTRAINT "PERSONAS_pkey" PRIMARY KEY ("ID_TERCERO");


--
-- Name: user_roles PK_23ed6f04fe43066df08379fd034; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.user_roles
    ADD CONSTRAINT "PK_23ed6f04fe43066df08379fd034" PRIMARY KEY (user_id, role_id);


--
-- Name: role_permissions PK_25d24010f53bb80b78e412c9656; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.role_permissions
    ADD CONSTRAINT "PK_25d24010f53bb80b78e412c9656" PRIMARY KEY (role_id, permission_id);


--
-- Name: permission PK_3b8b97af9d9d8807e41e6f48362; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.permission
    ADD CONSTRAINT "PK_3b8b97af9d9d8807e41e6f48362" PRIMARY KEY (id);


--
-- Name: person PK_5fdaf670315c4b7e70cce85daa3; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.person
    ADD CONSTRAINT "PK_5fdaf670315c4b7e70cce85daa3" PRIMARY KEY (id);


--
-- Name: role PK_b36bcfe02fc8de3c57a8b2391c2; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.role
    ADD CONSTRAINT "PK_b36bcfe02fc8de3c57a8b2391c2" PRIMARY KEY (id);


--
-- Name: user PK_cace4a159ff9f2512dd42373760; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth."user"
    ADD CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY (id);


--
-- Name: user REL_a4cee7e601d219733b064431fb; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth."user"
    ADD CONSTRAINT "REL_a4cee7e601d219733b064431fb" UNIQUE (person_id);


--
-- Name: ROLE ROLE_NAME_key; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth."ROLE"
    ADD CONSTRAINT "ROLE_NAME_key" UNIQUE ("NAME");


--
-- Name: ROLE_PERMISSIONS ROLE_PERMISSIONS_pkey; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth."ROLE_PERMISSIONS"
    ADD CONSTRAINT "ROLE_PERMISSIONS_pkey" PRIMARY KEY ("ID_ROL", "ID_PERMISSION");


--
-- Name: ROLE ROLE_pkey; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth."ROLE"
    ADD CONSTRAINT "ROLE_pkey" PRIMARY KEY ("ID_ROL");


--
-- Name: SECCIONALES SECCIONALES_pkey; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth."SECCIONALES"
    ADD CONSTRAINT "SECCIONALES_pkey" PRIMARY KEY ("ID_SECCIONAL");


--
-- Name: SEDES SEDES_pkey; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth."SEDES"
    ADD CONSTRAINT "SEDES_pkey" PRIMARY KEY ("ID_SEDE");


--
-- Name: TIPOS_TERCERO TIPOS_TERCERO_pkey; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth."TIPOS_TERCERO"
    ADD CONSTRAINT "TIPOS_TERCERO_pkey" PRIMARY KEY ("ID_TIP_TERCERO");


--
-- Name: permission UQ_240853a0c3353c25fb12434ad33; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.permission
    ADD CONSTRAINT "UQ_240853a0c3353c25fb12434ad33" UNIQUE (name);


--
-- Name: user UQ_78a916df40e02a9deb1c4b75edb; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth."user"
    ADD CONSTRAINT "UQ_78a916df40e02a9deb1c4b75edb" UNIQUE (username);


--
-- Name: role UQ_ae4578dcaed5adff96595e61660; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.role
    ADD CONSTRAINT "UQ_ae4578dcaed5adff96595e61660" UNIQUE (name);


--
-- Name: person UQ_d2d717efd90709ebd3cb26b936c; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.person
    ADD CONSTRAINT "UQ_d2d717efd90709ebd3cb26b936c" UNIQUE (email);


--
-- Name: USER_ROLES USER_ROLES_pkey; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth."USER_ROLES"
    ADD CONSTRAINT "USER_ROLES_pkey" PRIMARY KEY ("ID_USER", "ID_ROL");


--
-- Name: USER USER_pkey; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth."USER"
    ADD CONSTRAINT "USER_pkey" PRIMARY KEY ("ID_USER");


--
-- Name: test_data test_data_pkey; Type: CONSTRAINT; Schema: certification; Owner: postgres
--

ALTER TABLE ONLY certification.test_data
    ADD CONSTRAINT test_data_pkey PRIMARY KEY (id);


--
-- Name: test_data test_data_pkey; Type: CONSTRAINT; Schema: internal_disciplinary_control; Owner: postgres
--

ALTER TABLE ONLY internal_disciplinary_control.test_data
    ADD CONSTRAINT test_data_pkey PRIMARY KEY (id);


--
-- Name: test_data test_data_pkey; Type: CONSTRAINT; Schema: internal_institutional_control; Owner: postgres
--

ALTER TABLE ONLY internal_institutional_control.test_data
    ADD CONSTRAINT test_data_pkey PRIMARY KEY (id);


--
-- Name: test_data test_data_pkey; Type: CONSTRAINT; Schema: interoperability; Owner: postgres
--

ALTER TABLE ONLY interoperability.test_data
    ADD CONSTRAINT test_data_pkey PRIMARY KEY (id);


--
-- Name: test_data test_data_pkey; Type: CONSTRAINT; Schema: legal_management; Owner: postgres
--

ALTER TABLE ONLY legal_management.test_data
    ADD CONSTRAINT test_data_pkey PRIMARY KEY (id);


--
-- Name: test_data test_data_pkey; Type: CONSTRAINT; Schema: notifications; Owner: postgres
--

ALTER TABLE ONLY notifications.test_data
    ADD CONSTRAINT test_data_pkey PRIMARY KEY (id);


--
-- Name: test_data test_data_pkey; Type: CONSTRAINT; Schema: travel_expenses; Owner: postgres
--

ALTER TABLE ONLY travel_expenses.test_data
    ADD CONSTRAINT test_data_pkey PRIMARY KEY (id);


--
-- Name: IDX_17022daf3f885f7d35423e9971; Type: INDEX; Schema: auth; Owner: postgres
--

CREATE INDEX "IDX_17022daf3f885f7d35423e9971" ON auth.role_permissions USING btree (permission_id);


--
-- Name: IDX_178199805b901ccd220ab7740e; Type: INDEX; Schema: auth; Owner: postgres
--

CREATE INDEX "IDX_178199805b901ccd220ab7740e" ON auth.role_permissions USING btree (role_id);


--
-- Name: IDX_87b8888186ca9769c960e92687; Type: INDEX; Schema: auth; Owner: postgres
--

CREATE INDEX "IDX_87b8888186ca9769c960e92687" ON auth.user_roles USING btree (user_id);


--
-- Name: IDX_b23c65e50a758245a33ee35fda; Type: INDEX; Schema: auth; Owner: postgres
--

CREATE INDEX "IDX_b23c65e50a758245a33ee35fda" ON auth.user_roles USING btree (role_id);


--
-- Name: role_permissions FK_17022daf3f885f7d35423e9971e; Type: FK CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.role_permissions
    ADD CONSTRAINT "FK_17022daf3f885f7d35423e9971e" FOREIGN KEY (permission_id) REFERENCES auth.permission(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: role_permissions FK_178199805b901ccd220ab7740ec; Type: FK CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.role_permissions
    ADD CONSTRAINT "FK_178199805b901ccd220ab7740ec" FOREIGN KEY (role_id) REFERENCES auth.role(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_roles FK_87b8888186ca9769c960e926870; Type: FK CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.user_roles
    ADD CONSTRAINT "FK_87b8888186ca9769c960e926870" FOREIGN KEY (user_id) REFERENCES auth."user"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CENTROS_COSTO FK_CCOSTO_GEOPOLITICA; Type: FK CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth."CENTROS_COSTO"
    ADD CONSTRAINT "FK_CCOSTO_GEOPOLITICA" FOREIGN KEY ("ID_GEOPOLITICA") REFERENCES auth."GEOPOLITICA"("ID_GEOPOLITICA");


--
-- Name: CENTROS_COSTO FK_CCOSTO_PADRE; Type: FK CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth."CENTROS_COSTO"
    ADD CONSTRAINT "FK_CCOSTO_PADRE" FOREIGN KEY ("COD_CEN_PADRE") REFERENCES auth."CENTROS_COSTO"("ID_CEN_COSTO");


--
-- Name: DEPENDENCIAS FK_DEP_CARGO; Type: FK CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth."DEPENDENCIAS"
    ADD CONSTRAINT "FK_DEP_CARGO" FOREIGN KEY ("ID_CARGO") REFERENCES auth."CARGOS"("ID_CARGO");


--
-- Name: DEPENDENCIAS FK_DEP_CCOSTO; Type: FK CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth."DEPENDENCIAS"
    ADD CONSTRAINT "FK_DEP_CCOSTO" FOREIGN KEY ("ID_CEN_COSTO") REFERENCES auth."CENTROS_COSTO"("ID_CEN_COSTO");


--
-- Name: DEPENDENCIAS FK_DEP_GEOPOLITICA; Type: FK CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth."DEPENDENCIAS"
    ADD CONSTRAINT "FK_DEP_GEOPOLITICA" FOREIGN KEY ("ID_GEOPOLITICA") REFERENCES auth."GEOPOLITICA"("ID_GEOPOLITICA");


--
-- Name: DEPENDENCIAS FK_DEP_PADRE; Type: FK CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth."DEPENDENCIAS"
    ADD CONSTRAINT "FK_DEP_PADRE" FOREIGN KEY ("ID_DEPENDENCIA1") REFERENCES auth."DEPENDENCIAS"("ID_DEPENDENCIA");


--
-- Name: DEPENDENCIAS FK_DEP_RESPONSABLE; Type: FK CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth."DEPENDENCIAS"
    ADD CONSTRAINT "FK_DEP_RESPONSABLE" FOREIGN KEY ("ID_TERCERO") REFERENCES auth."PERSONAS"("ID_TERCERO");


--
-- Name: DEPENDENCIAS FK_DEP_SEDE; Type: FK CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth."DEPENDENCIAS"
    ADD CONSTRAINT "FK_DEP_SEDE" FOREIGN KEY ("ID_SEDE") REFERENCES auth."SEDES"("ID_SEDE");


--
-- Name: GEOPOLITICA FK_GEOPOLITICA_PADRE; Type: FK CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth."GEOPOLITICA"
    ADD CONSTRAINT "FK_GEOPOLITICA_PADRE" FOREIGN KEY ("ID_PADRE") REFERENCES auth."GEOPOLITICA"("ID_GEOPOLITICA");


--
-- Name: INFORMACION_ADICIONAL_PERSONAS FK_INFOPER_LUG_DESPLAZADO; Type: FK CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth."INFORMACION_ADICIONAL_PERSONAS"
    ADD CONSTRAINT "FK_INFOPER_LUG_DESPLAZADO" FOREIGN KEY ("ID_LUG_DESPLAZADO") REFERENCES auth."GEOPOLITICA"("ID_GEOPOLITICA");


--
-- Name: INFORMACION_ADICIONAL_PERSONAS FK_INFOPER_PERSONAS; Type: FK CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth."INFORMACION_ADICIONAL_PERSONAS"
    ADD CONSTRAINT "FK_INFOPER_PERSONAS" FOREIGN KEY ("ID_TERCERO") REFERENCES auth."PERSONAS"("ID_TERCERO");


--
-- Name: PERSONAS FK_PERSONAS_UBI_DOC; Type: FK CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth."PERSONAS"
    ADD CONSTRAINT "FK_PERSONAS_UBI_DOC" FOREIGN KEY ("ID_UBI_DOCUMENTO") REFERENCES auth."GEOPOLITICA"("ID_GEOPOLITICA");


--
-- Name: PERSONAS FK_PERSONAS_UBI_NAC; Type: FK CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth."PERSONAS"
    ADD CONSTRAINT "FK_PERSONAS_UBI_NAC" FOREIGN KEY ("ID_UBI_NAC") REFERENCES auth."GEOPOLITICA"("ID_GEOPOLITICA");


--
-- Name: PERSONAS FK_PERSONAS_UBI_RES; Type: FK CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth."PERSONAS"
    ADD CONSTRAINT "FK_PERSONAS_UBI_RES" FOREIGN KEY ("ID_UBI_RES") REFERENCES auth."GEOPOLITICA"("ID_GEOPOLITICA");


--
-- Name: SECCIONALES FK_SECCIONAL_GEOPOLITICA; Type: FK CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth."SECCIONALES"
    ADD CONSTRAINT "FK_SECCIONAL_GEOPOLITICA" FOREIGN KEY ("ID_UBI_SECCIONAL") REFERENCES auth."GEOPOLITICA"("ID_GEOPOLITICA");


--
-- Name: SEDES FK_SEDES_GEOPOLITICA; Type: FK CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth."SEDES"
    ADD CONSTRAINT "FK_SEDES_GEOPOLITICA" FOREIGN KEY ("ID_GEOPOLITICA") REFERENCES auth."GEOPOLITICA"("ID_GEOPOLITICA");


--
-- Name: SEDES FK_SEDES_SECCIONAL; Type: FK CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth."SEDES"
    ADD CONSTRAINT "FK_SEDES_SECCIONAL" FOREIGN KEY ("ID_SECCIONAL") REFERENCES auth."SECCIONALES"("ID_SECCIONAL");


--
-- Name: TIPOS_TERCERO FK_TIPOS_TERCERO_PERSONAS; Type: FK CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth."TIPOS_TERCERO"
    ADD CONSTRAINT "FK_TIPOS_TERCERO_PERSONAS" FOREIGN KEY ("ID_TERCERO") REFERENCES auth."PERSONAS"("ID_TERCERO");


--
-- Name: USER FK_USER_PERSONAS; Type: FK CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth."USER"
    ADD CONSTRAINT "FK_USER_PERSONAS" FOREIGN KEY ("ID_TERCERO") REFERENCES auth."PERSONAS"("ID_TERCERO");


--
-- Name: user FK_a4cee7e601d219733b064431fba; Type: FK CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth."user"
    ADD CONSTRAINT "FK_a4cee7e601d219733b064431fba" FOREIGN KEY (person_id) REFERENCES auth.person(id);


--
-- Name: user_roles FK_b23c65e50a758245a33ee35fda1; Type: FK CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.user_roles
    ADD CONSTRAINT "FK_b23c65e50a758245a33ee35fda1" FOREIGN KEY (role_id) REFERENCES auth.role(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ROLE_PERMISSIONS ROLE_PERMISSIONS_ID_PERMISSION_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth."ROLE_PERMISSIONS"
    ADD CONSTRAINT "ROLE_PERMISSIONS_ID_PERMISSION_fkey" FOREIGN KEY ("ID_PERMISSION") REFERENCES auth."PERMISSION"("ID_PERMISSION") ON DELETE CASCADE;


--
-- Name: ROLE_PERMISSIONS ROLE_PERMISSIONS_ID_ROL_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth."ROLE_PERMISSIONS"
    ADD CONSTRAINT "ROLE_PERMISSIONS_ID_ROL_fkey" FOREIGN KEY ("ID_ROL") REFERENCES auth."ROLE"("ID_ROL") ON DELETE CASCADE;


--
-- Name: USER_ROLES USER_ROLES_ID_ROL_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth."USER_ROLES"
    ADD CONSTRAINT "USER_ROLES_ID_ROL_fkey" FOREIGN KEY ("ID_ROL") REFERENCES auth."ROLE"("ID_ROL") ON DELETE CASCADE;


--
-- Name: USER_ROLES USER_ROLES_ID_USER_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth."USER_ROLES"
    ADD CONSTRAINT "USER_ROLES_ID_USER_fkey" FOREIGN KEY ("ID_USER") REFERENCES auth."USER"("ID_USER") ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict nokX9VJPHjm2zaYv4ltdvCtRd27gg9GsMIPLTiP3d7rA7LLeLHkcapY3C8jZ2WO

