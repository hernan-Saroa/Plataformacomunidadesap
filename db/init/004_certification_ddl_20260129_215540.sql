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
    position_code character varying(255),
    grade_code character varying(255)
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
    signer_id uuid,
    entity_logo_url text,
    entity_logo_filename character varying(255),
    entity_logo_size character varying(50),
    typography_font character varying(100) DEFAULT 'Times New Roman'::character varying,
    signer_title text,
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

COMMENT ON TABLE certification.certificate_template_config IS 'Labor-certificate template configuration';


--
-- Name: COLUMN certificate_template_config.signer_id; Type: COMMENT; Schema: certification; Owner: -
--

COMMENT ON COLUMN certification.certificate_template_config.signer_id IS 'Reference to the signer assigned to this template';


--
-- Name: COLUMN certificate_template_config.entity_logo_url; Type: COMMENT; Schema: certification; Owner: -
--

COMMENT ON COLUMN certification.certificate_template_config.entity_logo_url IS 'URL of the institutional ESAP logo';


--
-- Name: COLUMN certificate_template_config.typography_font; Type: COMMENT; Schema: certification; Owner: -
--

COMMENT ON COLUMN certification.certificate_template_config.typography_font IS 'Font family applied to the certificate';


--
-- Name: COLUMN certificate_template_config.signer_title; Type: COMMENT; Schema: certification; Owner: -
--

COMMENT ON COLUMN certification.certificate_template_config.signer_title IS 'Signer title displayed in the certificate heading';


--
-- Name: COLUMN certificate_template_config.certificate_content_html; Type: COMMENT; Schema: certification; Owner: -
--

COMMENT ON COLUMN certification.certificate_template_config.certificate_content_html IS 'Certificate HTML content with dynamic placeholders';


--
-- Name: COLUMN certificate_template_config.is_active; Type: COMMENT; Schema: certification; Owner: -
--

COMMENT ON COLUMN certification.certificate_template_config.is_active IS 'Indicates whether this configuration is active';


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

COMMENT ON TABLE certification.certificate_validations IS 'Labor-certificate validation history';


--
-- Name: COLUMN certificate_validations.certificate_id; Type: COMMENT; Schema: certification; Owner: -
--

COMMENT ON COLUMN certification.certificate_validations.certificate_id IS 'Reference to the validated certificate';


--
-- Name: COLUMN certificate_validations.result; Type: COMMENT; Schema: certification; Owner: -
--

COMMENT ON COLUMN certification.certificate_validations.result IS 'Certificate validation result';


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
    position_code character varying(255),
    technical_bonus numeric(12,2) DEFAULT 0,
    include_salary boolean DEFAULT true,
    include_technical_bonus boolean DEFAULT false,
    grade_code character varying(255)
);


--
-- Name: TABLE certificates; Type: COMMENT; Schema: certification; Owner: -
--

COMMENT ON TABLE certification.certificates IS 'Generated and valid certificates with QR code';


--
-- Name: template_signers; Type: TABLE; Schema: certification; Owner: -
--

CREATE TABLE certification.template_signers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    full_name character varying(255) NOT NULL,
    "position" character varying(150) NOT NULL,
    department character varying(255) NOT NULL,
    is_active boolean DEFAULT true,
    is_primary boolean DEFAULT false,
    signature_url text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE template_signers; Type: COMMENT; Schema: certification; Owner: -
--

COMMENT ON TABLE certification.template_signers IS 'Signers available for labor-certificate templates';


--
-- Name: COLUMN template_signers.is_primary; Type: COMMENT; Schema: certification; Owner: -
--

COMMENT ON COLUMN certification.template_signers.is_primary IS 'Indicates whether this is the default template signer';


--
-- Name: COLUMN template_signers.signature_url; Type: COMMENT; Schema: certification; Owner: -
--

COMMENT ON COLUMN certification.template_signers.signature_url IS 'URL of the signer signature image';


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

COMMENT ON TABLE certification.template_config_changes IS 'Certificate-template configuration change history';


--
-- Name: COLUMN template_config_changes.change_type; Type: COMMENT; Schema: certification; Owner: -
--

COMMENT ON COLUMN certification.template_config_changes.change_type IS 'Template configuration change category';


--
-- Name: COLUMN template_config_changes.field_name; Type: COMMENT; Schema: certification; Owner: -
--

COMMENT ON COLUMN certification.template_config_changes.field_name IS 'Physical configuration field modified by the change';


--
-- Name: COLUMN template_config_changes.old_value; Type: COMMENT; Schema: certification; Owner: -
--

COMMENT ON COLUMN certification.template_config_changes.old_value IS 'Field value before the change';


--
-- Name: COLUMN template_config_changes.new_value; Type: COMMENT; Schema: certification; Owner: -
--

COMMENT ON COLUMN certification.template_config_changes.new_value IS 'Field value after the change';


--
-- Name: COLUMN template_config_changes.metadata; Type: COMMENT; Schema: certification; Owner: -
--

COMMENT ON COLUMN certification.template_config_changes.metadata IS 'Additional change metadata stored as JSON';


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
-- Name: template_signers template_signers_pkey; Type: CONSTRAINT; Schema: certification; Owner: -
--

ALTER TABLE ONLY certification.template_signers
    ADD CONSTRAINT template_signers_pkey PRIMARY KEY (id);


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
-- Name: idx_template_signers_primary; Type: INDEX; Schema: certification; Owner: -
--

CREATE INDEX idx_template_signers_primary ON certification.template_signers USING btree (is_primary) WHERE (is_primary = true);


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
-- Name: certificate_template_config certificate_template_config_signer_id_fkey; Type: FK CONSTRAINT; Schema: certification; Owner: -
--

ALTER TABLE ONLY certification.certificate_template_config
    ADD CONSTRAINT certificate_template_config_signer_id_fkey FOREIGN KEY (signer_id) REFERENCES certification.template_signers(id) ON DELETE SET NULL;


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

