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
-- Name: certification; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA certification;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: certificate_requests; Type: TABLE; Schema: certification; Owner: -
--

CREATE TABLE certification.certificate_requests (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    request_number character varying(50) NOT NULL,
    person_id uuid,
    full_name character varying(255) NOT NULL,
    id_number character varying(50) NOT NULL,
    document_type character varying(10),
    career_category character varying(100) NOT NULL,
    hiring_date date NOT NULL,
    position_category character varying(100) NOT NULL,
    position_location character varying(150),
    monthly_salary numeric(12,2) NOT NULL,
    salary_text character varying(255),
    department character varying(255),
    campus character varying(100),
    email character varying(100),
    phone character varying(20),
    status character varying(50) DEFAULT 'PENDING'::character varying NOT NULL,
    request_date timestamp without time zone DEFAULT now(),
    observations text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    validation_code character varying(10),
    validation_expires_at timestamp without time zone,
    cod_cargo character varying(255),
    cod_grade character varying(255)
);


--
-- Name: TABLE certificate_requests; Type: COMMENT; Schema: certification; Owner: -
--

COMMENT ON TABLE certification.certificate_requests IS 'Labor certificate requests made by employees';


--
-- Name: COLUMN certificate_requests.request_number; Type: COMMENT; Schema: certification; Owner: -
--

COMMENT ON COLUMN certification.certificate_requests.request_number IS 'Unique request number format: 12_620_700_20_CD 001';


--
-- Name: COLUMN certificate_requests.career_category; Type: COMMENT; Schema: certification; Owner: -
--

COMMENT ON COLUMN certification.certificate_requests.career_category IS 'DATA3: Administrative Career, Free Appointment, etc.';


--
-- Name: COLUMN certificate_requests.position_category; Type: COMMENT; Schema: certification; Owner: -
--

COMMENT ON COLUMN certification.certificate_requests.position_category IS 'DATA5: TITULAR Teacher, OCCASIONAL, CHAIR';


--
-- Name: COLUMN certificate_requests.monthly_salary; Type: COMMENT; Schema: certification; Owner: -
--

COMMENT ON COLUMN certification.certificate_requests.monthly_salary IS 'DATA7: Monthly salary in number';


--
-- Name: COLUMN certificate_requests.salary_text; Type: COMMENT; Schema: certification; Owner: -
--

COMMENT ON COLUMN certification.certificate_requests.salary_text IS 'DATA8: Salary in text (forty forty-five pesos m/cte)';


--
-- Name: certificate_template_config; Type: TABLE; Schema: certification; Owner: -
--

CREATE TABLE certification.certificate_template_config (
    id integer NOT NULL,
    firmante_id uuid,
    entity_logo_url text,
    entity_logo_filename character varying(255),
    entity_logo_size character varying(50),
    typography_font character varying(100) DEFAULT 'Times New Roman'::character varying,
    cargo_title text,
    certificate_content_html text,
    version character varying(20) DEFAULT '1.0.0'::character varying,
    status character varying(50) DEFAULT 'draft'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(255),
    updated_by character varying(255),
    is_active boolean DEFAULT true,
    template_type character varying(30) DEFAULT 'docente'::character varying NOT NULL,
    signature_url text,
    signature_filename text,
    signature_size text,
    signer_name_override text
);


--
-- Name: TABLE certificate_template_config; Type: COMMENT; Schema: certification; Owner: -
--

COMMENT ON TABLE certification.certificate_template_config IS 'Configuración de plantilla para certificados laborales';


--
-- Name: COLUMN certificate_template_config.firmante_id; Type: COMMENT; Schema: certification; Owner: -
--

COMMENT ON COLUMN certification.certificate_template_config.firmante_id IS 'Referencia al firmante principal (tabla firmantes)';


--
-- Name: COLUMN certificate_template_config.entity_logo_url; Type: COMMENT; Schema: certification; Owner: -
--

COMMENT ON COLUMN certification.certificate_template_config.entity_logo_url IS 'URL del logo institucional de ESAP';


--
-- Name: COLUMN certificate_template_config.typography_font; Type: COMMENT; Schema: certification; Owner: -
--

COMMENT ON COLUMN certification.certificate_template_config.typography_font IS 'Fuente tipográfica aplicada al certificado';


--
-- Name: COLUMN certificate_template_config.cargo_title; Type: COMMENT; Schema: certification; Owner: -
--

COMMENT ON COLUMN certification.certificate_template_config.cargo_title IS 'Título del cargo que aparece en el encabezado del certificado';


--
-- Name: COLUMN certificate_template_config.certificate_content_html; Type: COMMENT; Schema: certification; Owner: -
--

COMMENT ON COLUMN certification.certificate_template_config.certificate_content_html IS 'Contenido HTML del certificado con variables dinámicas';


--
-- Name: COLUMN certificate_template_config.is_active; Type: COMMENT; Schema: certification; Owner: -
--

COMMENT ON COLUMN certification.certificate_template_config.is_active IS 'Solo debe haber una configuración activa a la vez';


--
-- Name: certificate_template_config_id_seq; Type: SEQUENCE; Schema: certification; Owner: -
--

CREATE SEQUENCE certification.certificate_template_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: certificate_template_config_id_seq; Type: SEQUENCE OWNED BY; Schema: certification; Owner: -
--

ALTER SEQUENCE certification.certificate_template_config_id_seq OWNED BY certification.certificate_template_config.id;


--
-- Name: certificate_templates; Type: TABLE; Schema: certification; Owner: -
--

CREATE TABLE certification.certificate_templates (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    html_content text NOT NULL,
    certificate_type character varying(100) DEFAULT 'LABOR_TEACHER'::character varying,
    is_active boolean DEFAULT true,
    version integer DEFAULT 1,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE certificate_templates; Type: COMMENT; Schema: certification; Owner: -
--

COMMENT ON TABLE certification.certificate_templates IS 'HTML templates for generating PDF certificates';


--
-- Name: certificate_validations; Type: TABLE; Schema: certification; Owner: -
--

CREATE TABLE certification.certificate_validations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    certificate_id uuid NOT NULL,
    validation_date timestamp without time zone DEFAULT now() NOT NULL,
    ip_address character varying(50),
    user_agent text,
    location character varying(255),
    result character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    country character varying(100),
    region character varying(120),
    city character varying(120),
    latitude double precision,
    longitude double precision,
    isp character varying(255)
);


--
-- Name: TABLE certificate_validations; Type: COMMENT; Schema: certification; Owner: -
--

COMMENT ON TABLE certification.certificate_validations IS 'Historial de validaciones de certificados laborales';


--
-- Name: COLUMN certificate_validations.certificate_id; Type: COMMENT; Schema: certification; Owner: -
--

COMMENT ON COLUMN certification.certificate_validations.certificate_id IS 'Referencia al certificado validado';


--
-- Name: COLUMN certificate_validations.result; Type: COMMENT; Schema: certification; Owner: -
--

COMMENT ON COLUMN certification.certificate_validations.result IS 'Resultado de la validación (válido, inválido, expirado, etc.)';


--
-- Name: COLUMN certificate_validations.country; Type: COMMENT; Schema: certification; Owner: -
--

COMMENT ON COLUMN certification.certificate_validations.country IS 'Country detected by IP';


--
-- Name: COLUMN certificate_validations.region; Type: COMMENT; Schema: certification; Owner: -
--

COMMENT ON COLUMN certification.certificate_validations.region IS 'Region detected by IP';


--
-- Name: COLUMN certificate_validations.city; Type: COMMENT; Schema: certification; Owner: -
--

COMMENT ON COLUMN certification.certificate_validations.city IS 'City detected by IP';


--
-- Name: COLUMN certificate_validations.latitude; Type: COMMENT; Schema: certification; Owner: -
--

COMMENT ON COLUMN certification.certificate_validations.latitude IS 'Latitude detected by IP';


--
-- Name: COLUMN certificate_validations.longitude; Type: COMMENT; Schema: certification; Owner: -
--

COMMENT ON COLUMN certification.certificate_validations.longitude IS 'Longitude detected by IP';


--
-- Name: COLUMN certificate_validations.isp; Type: COMMENT; Schema: certification; Owner: -
--

COMMENT ON COLUMN certification.certificate_validations.isp IS 'Internet service provider';


--
-- Name: certificates; Type: TABLE; Schema: certification; Owner: -
--

CREATE TABLE certification.certificates (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    verification_code character varying(100) NOT NULL,
    certificate_number character varying(50) NOT NULL,
    request_id uuid NOT NULL,
    full_name character varying(255) NOT NULL,
    id_number character varying(50) NOT NULL,
    document_type character varying(10),
    career_category character varying(100) NOT NULL,
    hiring_date date NOT NULL,
    position_category character varying(100) NOT NULL,
    position_location character varying(150),
    monthly_salary numeric(12,2) NOT NULL,
    salary_text character varying(255),
    department character varying(255),
    campus character varying(100),
    issue_date date NOT NULL,
    issuance_timestamp timestamp without time zone DEFAULT now() NOT NULL,
    signer_name character varying(255),
    signer_position character varying(255),
    signer_department character varying(255),
    pdf_url character varying(500),
    status character varying(50) DEFAULT 'VALID'::character varying NOT NULL,
    validation_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    cod_cargo character varying(255),
    technical_bonus numeric(12,2) DEFAULT 0,
    include_salary boolean DEFAULT true,
    include_technical_bonus boolean DEFAULT false,
    cod_grade character varying(255)
);


--
-- Name: TABLE certificates; Type: COMMENT; Schema: certification; Owner: -
--

COMMENT ON TABLE certification.certificates IS 'Generated and valid certificates with QR code';


--
-- Name: firmantes; Type: TABLE; Schema: certification; Owner: -
--

CREATE TABLE certification.firmantes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre_completo character varying(255) NOT NULL,
    cargo character varying(150) NOT NULL,
    dependencia character varying(255) NOT NULL,
    activo boolean DEFAULT true,
    es_principal boolean DEFAULT false,
    firma_digital_url text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE firmantes; Type: COMMENT; Schema: certification; Owner: -
--

COMMENT ON TABLE certification.firmantes IS 'Firmantes autorizados para certificados laborales';


--
-- Name: COLUMN firmantes.es_principal; Type: COMMENT; Schema: certification; Owner: -
--

COMMENT ON COLUMN certification.firmantes.es_principal IS 'Indica si es el firmante principal por defecto';


--
-- Name: COLUMN firmantes.firma_digital_url; Type: COMMENT; Schema: certification; Owner: -
--

COMMENT ON COLUMN certification.firmantes.firma_digital_url IS 'URL de la imagen de la firma digital (grafo)';


--
-- Name: signers; Type: TABLE; Schema: certification; Owner: -
--

CREATE TABLE certification.signers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    full_name character varying(255) NOT NULL,
    "position" character varying(255) NOT NULL,
    department character varying(255),
    signature_url character varying(500),
    is_active boolean DEFAULT true,
    is_primary boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE signers; Type: COMMENT; Schema: certification; Owner: -
--

COMMENT ON TABLE certification.signers IS 'Authorized persons to sign certificates (Human Talent Director)';


--
-- Name: stage_configuration; Type: TABLE; Schema: certification; Owner: -
--

CREATE TABLE certification.stage_configuration (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    etapa character varying NOT NULL,
    "diasHabiles" integer DEFAULT 30 NOT NULL,
    descripcion text,
    activo boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: system_configuration; Type: TABLE; Schema: certification; Owner: -
--

CREATE TABLE certification.system_configuration (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "roleCapacities" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "notificationSettings" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "alertSettings" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "securitySettings" jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: template_config_changes; Type: TABLE; Schema: certification; Owner: -
--

CREATE TABLE certification.template_config_changes (
    id integer NOT NULL,
    template_config_id integer,
    change_type character varying(50) NOT NULL,
    field_name character varying(100) NOT NULL,
    old_value text,
    new_value text,
    metadata jsonb,
    changed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    changed_by character varying(255)
);


--
-- Name: TABLE template_config_changes; Type: COMMENT; Schema: certification; Owner: -
--

COMMENT ON TABLE certification.template_config_changes IS 'Historial de cambios en la configuración de plantillas de certificados';


--
-- Name: COLUMN template_config_changes.change_type; Type: COMMENT; Schema: certification; Owner: -
--

COMMENT ON COLUMN certification.template_config_changes.change_type IS 'Tipo de cambio: logo, firma, nombre, tipografia, contenido, titulo_cargo, multiple';


--
-- Name: COLUMN template_config_changes.field_name; Type: COMMENT; Schema: certification; Owner: -
--

COMMENT ON COLUMN certification.template_config_changes.field_name IS 'Campo específico modificado en la entidad';


--
-- Name: COLUMN template_config_changes.old_value; Type: COMMENT; Schema: certification; Owner: -
--

COMMENT ON COLUMN certification.template_config_changes.old_value IS 'Valor anterior del campo';


--
-- Name: COLUMN template_config_changes.new_value; Type: COMMENT; Schema: certification; Owner: -
--

COMMENT ON COLUMN certification.template_config_changes.new_value IS 'Nuevo valor del campo';


--
-- Name: COLUMN template_config_changes.metadata; Type: COMMENT; Schema: certification; Owner: -
--

COMMENT ON COLUMN certification.template_config_changes.metadata IS 'Información adicional en formato JSON';


--
-- Name: template_config_changes_id_seq; Type: SEQUENCE; Schema: certification; Owner: -
--

CREATE SEQUENCE certification.template_config_changes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: template_config_changes_id_seq; Type: SEQUENCE OWNED BY; Schema: certification; Owner: -
--

ALTER SEQUENCE certification.template_config_changes_id_seq OWNED BY certification.template_config_changes.id;


--
-- Name: certificate_template_config id; Type: DEFAULT; Schema: certification; Owner: -
--

ALTER TABLE ONLY certification.certificate_template_config ALTER COLUMN id SET DEFAULT nextval('certification.certificate_template_config_id_seq'::regclass);


--
-- Name: template_config_changes id; Type: DEFAULT; Schema: certification; Owner: -
--

ALTER TABLE ONLY certification.template_config_changes ALTER COLUMN id SET DEFAULT nextval('certification.template_config_changes_id_seq'::regclass);


--
-- Name: stage_configuration PK_stage_configuration; Type: CONSTRAINT; Schema: certification; Owner: -
--

ALTER TABLE ONLY certification.stage_configuration
    ADD CONSTRAINT "PK_stage_configuration" PRIMARY KEY (id);


--
-- Name: system_configuration PK_system_configuration; Type: CONSTRAINT; Schema: certification; Owner: -
--

ALTER TABLE ONLY certification.system_configuration
    ADD CONSTRAINT "PK_system_configuration" PRIMARY KEY (id);


--
-- Name: certificate_requests certificate_requests_pkey; Type: CONSTRAINT; Schema: certification; Owner: -
--

ALTER TABLE ONLY certification.certificate_requests
    ADD CONSTRAINT certificate_requests_pkey PRIMARY KEY (id);


--
-- Name: certificate_requests certificate_requests_request_number_key; Type: CONSTRAINT; Schema: certification; Owner: -
--

ALTER TABLE ONLY certification.certificate_requests
    ADD CONSTRAINT certificate_requests_request_number_key UNIQUE (request_number);


--
-- Name: certificate_template_config certificate_template_config_pkey; Type: CONSTRAINT; Schema: certification; Owner: -
--

ALTER TABLE ONLY certification.certificate_template_config
    ADD CONSTRAINT certificate_template_config_pkey PRIMARY KEY (id);


--
-- Name: certificate_templates certificate_templates_pkey; Type: CONSTRAINT; Schema: certification; Owner: -
--

ALTER TABLE ONLY certification.certificate_templates
    ADD CONSTRAINT certificate_templates_pkey PRIMARY KEY (id);


--
-- Name: certificate_validations certificate_validations_pkey; Type: CONSTRAINT; Schema: certification; Owner: -
--

ALTER TABLE ONLY certification.certificate_validations
    ADD CONSTRAINT certificate_validations_pkey PRIMARY KEY (id);


--
-- Name: certificates certificates_certificate_number_key; Type: CONSTRAINT; Schema: certification; Owner: -
--

ALTER TABLE ONLY certification.certificates
    ADD CONSTRAINT certificates_certificate_number_key UNIQUE (certificate_number);


--
-- Name: certificates certificates_pkey; Type: CONSTRAINT; Schema: certification; Owner: -
--

ALTER TABLE ONLY certification.certificates
    ADD CONSTRAINT certificates_pkey PRIMARY KEY (id);


--
-- Name: certificates certificates_verification_code_key; Type: CONSTRAINT; Schema: certification; Owner: -
--

ALTER TABLE ONLY certification.certificates
    ADD CONSTRAINT certificates_verification_code_key UNIQUE (verification_code);


--
-- Name: firmantes firmantes_pkey; Type: CONSTRAINT; Schema: certification; Owner: -
--

ALTER TABLE ONLY certification.firmantes
    ADD CONSTRAINT firmantes_pkey PRIMARY KEY (id);


--
-- Name: signers signers_pkey; Type: CONSTRAINT; Schema: certification; Owner: -
--

ALTER TABLE ONLY certification.signers
    ADD CONSTRAINT signers_pkey PRIMARY KEY (id);


--
-- Name: template_config_changes template_config_changes_pkey; Type: CONSTRAINT; Schema: certification; Owner: -
--

ALTER TABLE ONLY certification.template_config_changes
    ADD CONSTRAINT template_config_changes_pkey PRIMARY KEY (id);


--
-- Name: idx_certificate_requests_validation_expires; Type: INDEX; Schema: certification; Owner: -
--

CREATE INDEX idx_certificate_requests_validation_expires ON certification.certificate_requests USING btree (validation_expires_at);


--
-- Name: idx_certificate_template_config_active; Type: INDEX; Schema: certification; Owner: -
--

CREATE INDEX idx_certificate_template_config_active ON certification.certificate_template_config USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_certificate_template_config_template_type; Type: INDEX; Schema: certification; Owner: -
--

CREATE INDEX idx_certificate_template_config_template_type ON certification.certificate_template_config USING btree (template_type);


--
-- Name: idx_certificate_validations_certificate_id; Type: INDEX; Schema: certification; Owner: -
--

CREATE INDEX idx_certificate_validations_certificate_id ON certification.certificate_validations USING btree (certificate_id);


--
-- Name: idx_certificate_validations_validation_date; Type: INDEX; Schema: certification; Owner: -
--

CREATE INDEX idx_certificate_validations_validation_date ON certification.certificate_validations USING btree (validation_date DESC);


--
-- Name: idx_certificates_code; Type: INDEX; Schema: certification; Owner: -
--

CREATE INDEX idx_certificates_code ON certification.certificates USING btree (verification_code);


--
-- Name: idx_certificates_id_number; Type: INDEX; Schema: certification; Owner: -
--

CREATE INDEX idx_certificates_id_number ON certification.certificates USING btree (id_number);


--
-- Name: idx_certificates_number; Type: INDEX; Schema: certification; Owner: -
--

CREATE INDEX idx_certificates_number ON certification.certificates USING btree (certificate_number);


--
-- Name: idx_certificates_request; Type: INDEX; Schema: certification; Owner: -
--

CREATE INDEX idx_certificates_request ON certification.certificates USING btree (request_id);


--
-- Name: idx_certificates_status; Type: INDEX; Schema: certification; Owner: -
--

CREATE INDEX idx_certificates_status ON certification.certificates USING btree (status);


--
-- Name: idx_firmantes_principal; Type: INDEX; Schema: certification; Owner: -
--

CREATE INDEX idx_firmantes_principal ON certification.firmantes USING btree (es_principal) WHERE (es_principal = true);


--
-- Name: idx_requests_date; Type: INDEX; Schema: certification; Owner: -
--

CREATE INDEX idx_requests_date ON certification.certificate_requests USING btree (request_date);


--
-- Name: idx_requests_id_number; Type: INDEX; Schema: certification; Owner: -
--

CREATE INDEX idx_requests_id_number ON certification.certificate_requests USING btree (id_number);


--
-- Name: idx_requests_person; Type: INDEX; Schema: certification; Owner: -
--

CREATE INDEX idx_requests_person ON certification.certificate_requests USING btree (person_id);


--
-- Name: idx_requests_status; Type: INDEX; Schema: certification; Owner: -
--

CREATE INDEX idx_requests_status ON certification.certificate_requests USING btree (status);


--
-- Name: idx_template_config_changes_config_id; Type: INDEX; Schema: certification; Owner: -
--

CREATE INDEX idx_template_config_changes_config_id ON certification.template_config_changes USING btree (template_config_id);


--
-- Name: idx_template_config_changes_date; Type: INDEX; Schema: certification; Owner: -
--

CREATE INDEX idx_template_config_changes_date ON certification.template_config_changes USING btree (changed_at DESC);


--
-- Name: idx_template_config_changes_type; Type: INDEX; Schema: certification; Owner: -
--

CREATE INDEX idx_template_config_changes_type ON certification.template_config_changes USING btree (change_type);


--
-- Name: idx_validations_certificate; Type: INDEX; Schema: certification; Owner: -
--

CREATE INDEX idx_validations_certificate ON certification.certificate_validations USING btree (certificate_id);


--
-- Name: idx_validations_date; Type: INDEX; Schema: certification; Owner: -
--

CREATE INDEX idx_validations_date ON certification.certificate_validations USING btree (validation_date);


--
-- Name: certificate_template_config certificate_template_config_firmante_id_fkey; Type: FK CONSTRAINT; Schema: certification; Owner: -
--

ALTER TABLE ONLY certification.certificate_template_config
    ADD CONSTRAINT certificate_template_config_firmante_id_fkey FOREIGN KEY (firmante_id) REFERENCES certification.firmantes(id) ON DELETE SET NULL;


--
-- Name: certificate_validations certificate_validations_certificate_id_fkey; Type: FK CONSTRAINT; Schema: certification; Owner: -
--

ALTER TABLE ONLY certification.certificate_validations
    ADD CONSTRAINT certificate_validations_certificate_id_fkey FOREIGN KEY (certificate_id) REFERENCES certification.certificates(id);


--
-- Name: certificates certificates_request_id_fkey; Type: FK CONSTRAINT; Schema: certification; Owner: -
--

ALTER TABLE ONLY certification.certificates
    ADD CONSTRAINT certificates_request_id_fkey FOREIGN KEY (request_id) REFERENCES certification.certificate_requests(id);


--
-- Name: template_config_changes template_config_changes_template_config_id_fkey; Type: FK CONSTRAINT; Schema: certification; Owner: -
--

ALTER TABLE ONLY certification.template_config_changes
    ADD CONSTRAINT template_config_changes_template_config_id_fkey FOREIGN KEY (template_config_id) REFERENCES certification.certificate_template_config(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

