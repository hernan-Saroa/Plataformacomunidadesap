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
-- Name: academic_registration; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA academic_registration;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: academic_registration; Owner: -
--

CREATE FUNCTION academic_registration.update_updated_at_column() RETURNS trigger
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
-- Name: certificate_downloads; Type: TABLE; Schema: academic_registration; Owner: -
--

CREATE TABLE academic_registration.certificate_downloads (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    certificate_id uuid NOT NULL,
    download_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ip_address character varying(50),
    user_agent text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: certificate_template_config; Type: TABLE; Schema: academic_registration; Owner: -
--

CREATE TABLE academic_registration.certificate_template_config (
    id integer NOT NULL,
    signer_id uuid,
    institution_logo_url text,
    institution_logo_filename character varying(255),
    typography_font character varying(100) DEFAULT 'Arial Narrow, Arial, sans-serif'::character varying,
    signer_title_override character varying(255),
    certificate_content_html text NOT NULL,
    version character varying(50) DEFAULT '1.0.0'::character varying,
    status character varying(50) DEFAULT 'draft'::character varying,
    signature_url_override text,
    signature_filename_override character varying(255),
    signer_name_override character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(255),
    updated_by character varying(255),
    is_active boolean DEFAULT true,
    CONSTRAINT chk_template_status CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'published'::character varying])::text[])))
);


--
-- Name: TABLE certificate_template_config; Type: COMMENT; Schema: academic_registration; Owner: -
--

COMMENT ON TABLE academic_registration.certificate_template_config IS 'Configuración de plantillas de certificados';


--
-- Name: certificate_template_config_id_seq; Type: SEQUENCE; Schema: academic_registration; Owner: -
--

CREATE SEQUENCE academic_registration.certificate_template_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: certificate_template_config_id_seq; Type: SEQUENCE OWNED BY; Schema: academic_registration; Owner: -
--

ALTER SEQUENCE academic_registration.certificate_template_config_id_seq OWNED BY academic_registration.certificate_template_config.id;


--
-- Name: certificate_validations; Type: TABLE; Schema: academic_registration; Owner: -
--

CREATE TABLE academic_registration.certificate_validations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    certificate_id uuid NOT NULL,
    validation_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ip_address character varying(50),
    user_agent text,
    location character varying(255),
    result character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_validation_result CHECK (((result)::text = ANY ((ARRAY['VALID'::character varying, 'REVOKED'::character varying, 'EXPIRED'::character varying, 'NOT_FOUND'::character varying])::text[])))
);


--
-- Name: TABLE certificate_validations; Type: COMMENT; Schema: academic_registration; Owner: -
--

COMMENT ON TABLE academic_registration.certificate_validations IS 'Historial de validaciones públicas de certificados';


--
-- Name: graduates; Type: TABLE; Schema: academic_registration; Owner: -
--

CREATE TABLE academic_registration.graduates (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    person_id uuid NOT NULL,
    full_name character varying(255) NOT NULL,
    id_number character varying(50) NOT NULL,
    email character varying(255),
    phone character varying(50),
    program_id uuid NOT NULL,
    program_name character varying(255) NOT NULL,
    program_type character varying(50) NOT NULL,
    enrollment_date date,
    graduation_date date NOT NULL,
    ceremony_date date,
    degree_title character varying(255) NOT NULL,
    diploma_number character varying(100),
    acta_number character varying(100),
    resolution_number character varying(100),
    status character varying(50) DEFAULT 'ACTIVE'::character varying,
    is_verified boolean DEFAULT true,
    campus character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(255),
    updated_by character varying(255),
    id_issue_date date,
    seccional_name character varying(255),
    first_name character varying(255),
    last_name character varying(255),
    CONSTRAINT chk_graduate_status CHECK (((status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'REVOKED'::character varying, 'SUSPENDED'::character varying])::text[])))
);


--
-- Name: TABLE graduates; Type: COMMENT; Schema: academic_registration; Owner: -
--

COMMENT ON TABLE academic_registration.graduates IS 'Graduados de prueba con diferentes tipos de programas';


--
-- Name: COLUMN graduates.id_issue_date; Type: COMMENT; Schema: academic_registration; Owner: -
--

COMMENT ON COLUMN academic_registration.graduates.id_issue_date IS 'Fecha de expedición de la cédula de ciudadanía';


--
-- Name: COLUMN graduates.seccional_name; Type: COMMENT; Schema: academic_registration; Owner: -
--

COMMENT ON COLUMN academic_registration.graduates.seccional_name IS 'Seccional/territorial asignada al graduado';


--
-- Name: graduation_certificate_requests; Type: TABLE; Schema: academic_registration; Owner: -
--

CREATE TABLE academic_registration.graduation_certificate_requests (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    request_number character varying(100) NOT NULL,
    requester_type character varying(50) NOT NULL,
    graduate_id uuid,
    id_number character varying(50) NOT NULL,
    full_name character varying(255) NOT NULL,
    program_name character varying(255) NOT NULL,
    graduation_date date NOT NULL,
    requester_name character varying(255),
    requester_email character varying(255) NOT NULL,
    requester_phone character varying(50),
    company_name character varying(255),
    certificate_type character varying(50) DEFAULT 'STANDARD'::character varying,
    validation_code character varying(10),
    validation_expires_at timestamp without time zone,
    is_validated boolean DEFAULT false,
    status character varying(50) DEFAULT 'PENDING'::character varying,
    observations text,
    rejection_reason text,
    request_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    validation_date timestamp without time zone,
    completion_date timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    id_issue_date date,
    manual_review boolean DEFAULT false,
    reviewed_at timestamp without time zone,
    reviewed_by character varying(100),
    reviewer_name character varying(255),
    review_notes text,
    review_resolution character varying(50),
    graduate_last_name character varying(255),
    graduate_email character varying(255),
    graduate_phone character varying(50),
    CONSTRAINT chk_certificate_type CHECK (((certificate_type)::text = ANY ((ARRAY['STANDARD'::character varying, 'OFFICIAL'::character varying, 'INTERNATIONAL'::character varying])::text[]))),
    CONSTRAINT chk_request_status CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'VALIDATED'::character varying, 'PROCESSING'::character varying, 'COMPLETED'::character varying, 'REJECTED'::character varying])::text[]))),
    CONSTRAINT chk_requester_type CHECK (((requester_type)::text = ANY ((ARRAY['GRADUATE'::character varying, 'COMPANY'::character varying])::text[])))
);


--
-- Name: TABLE graduation_certificate_requests; Type: COMMENT; Schema: academic_registration; Owner: -
--

COMMENT ON TABLE academic_registration.graduation_certificate_requests IS 'Solicitudes en diferentes estados del flujo';


--
-- Name: graduation_certificates; Type: TABLE; Schema: academic_registration; Owner: -
--

CREATE TABLE academic_registration.graduation_certificates (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    request_id uuid NOT NULL,
    graduate_id uuid,
    certificate_number character varying(100) NOT NULL,
    verification_code character varying(50) NOT NULL,
    full_name character varying(255) NOT NULL,
    id_number character varying(50) NOT NULL,
    program_name character varying(255) NOT NULL,
    program_type character varying(50) NOT NULL,
    degree_title character varying(255) NOT NULL,
    graduation_date date NOT NULL,
    diploma_number character varying(100),
    acta_number character varying(100),
    campus character varying(100),
    signer_name character varying(255) NOT NULL,
    signer_position character varying(255) NOT NULL,
    signature_url text,
    pdf_url text,
    pdf_filename character varying(255),
    status character varying(50) DEFAULT 'VALID'::character varying,
    issue_date date DEFAULT CURRENT_DATE,
    expiry_date date,
    revocation_date timestamp without time zone,
    revocation_reason text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(255),
    seccional_name character varying(150),
    CONSTRAINT chk_certificate_status CHECK (((status)::text = ANY ((ARRAY['VALID'::character varying, 'REVOKED'::character varying, 'EXPIRED'::character varying])::text[])))
);


--
-- Name: TABLE graduation_certificates; Type: COMMENT; Schema: academic_registration; Owner: -
--

COMMENT ON TABLE academic_registration.graduation_certificates IS 'Certificados emitidos con códigos QR válidos';


--
-- Name: COLUMN graduation_certificates.seccional_name; Type: COMMENT; Schema: academic_registration; Owner: -
--

COMMENT ON COLUMN academic_registration.graduation_certificates.seccional_name IS 'Seccional asociada al certificado (persistida desde aprobaciones manuales)';


--
-- Name: signers; Type: TABLE; Schema: academic_registration; Owner: -
--

CREATE TABLE academic_registration.signers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    full_name character varying(255) NOT NULL,
    "position" character varying(255) NOT NULL,
    department character varying(255),
    email character varying(255),
    signature_url text,
    signature_filename character varying(255),
    is_active boolean DEFAULT true,
    is_primary boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE signers; Type: COMMENT; Schema: academic_registration; Owner: -
--

COMMENT ON TABLE academic_registration.signers IS 'Firmantes autorizados para certificados';


--
-- Name: template_config_changes; Type: TABLE; Schema: academic_registration; Owner: -
--

CREATE TABLE academic_registration.template_config_changes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    template_config_id integer NOT NULL,
    change_type character varying(50) NOT NULL,
    field_changed character varying(100),
    old_value text,
    new_value text,
    changed_by character varying(255) NOT NULL,
    change_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    observations text
);


--
-- Name: TABLE template_config_changes; Type: COMMENT; Schema: academic_registration; Owner: -
--

COMMENT ON TABLE academic_registration.template_config_changes IS 'Historial de cambios en plantillas';


--
-- Name: certificate_template_config id; Type: DEFAULT; Schema: academic_registration; Owner: -
--

ALTER TABLE ONLY academic_registration.certificate_template_config ALTER COLUMN id SET DEFAULT nextval('academic_registration.certificate_template_config_id_seq'::regclass);


--
-- Name: certificate_downloads certificate_downloads_pkey; Type: CONSTRAINT; Schema: academic_registration; Owner: -
--

ALTER TABLE ONLY academic_registration.certificate_downloads
    ADD CONSTRAINT certificate_downloads_pkey PRIMARY KEY (id);


--
-- Name: certificate_template_config certificate_template_config_pkey; Type: CONSTRAINT; Schema: academic_registration; Owner: -
--

ALTER TABLE ONLY academic_registration.certificate_template_config
    ADD CONSTRAINT certificate_template_config_pkey PRIMARY KEY (id);


--
-- Name: certificate_validations certificate_validations_pkey; Type: CONSTRAINT; Schema: academic_registration; Owner: -
--

ALTER TABLE ONLY academic_registration.certificate_validations
    ADD CONSTRAINT certificate_validations_pkey PRIMARY KEY (id);


--
-- Name: graduates graduates_diploma_number_key; Type: CONSTRAINT; Schema: academic_registration; Owner: -
--

ALTER TABLE ONLY academic_registration.graduates
    ADD CONSTRAINT graduates_diploma_number_key UNIQUE (diploma_number);


--
-- Name: graduates graduates_id_number_key; Type: CONSTRAINT; Schema: academic_registration; Owner: -
--

ALTER TABLE ONLY academic_registration.graduates
    ADD CONSTRAINT graduates_id_number_key UNIQUE (id_number);


--
-- Name: graduates graduates_pkey; Type: CONSTRAINT; Schema: academic_registration; Owner: -
--

ALTER TABLE ONLY academic_registration.graduates
    ADD CONSTRAINT graduates_pkey PRIMARY KEY (id);


--
-- Name: graduation_certificate_requests graduation_certificate_requests_pkey; Type: CONSTRAINT; Schema: academic_registration; Owner: -
--

ALTER TABLE ONLY academic_registration.graduation_certificate_requests
    ADD CONSTRAINT graduation_certificate_requests_pkey PRIMARY KEY (id);


--
-- Name: graduation_certificate_requests graduation_certificate_requests_request_number_key; Type: CONSTRAINT; Schema: academic_registration; Owner: -
--

ALTER TABLE ONLY academic_registration.graduation_certificate_requests
    ADD CONSTRAINT graduation_certificate_requests_request_number_key UNIQUE (request_number);


--
-- Name: graduation_certificates graduation_certificates_certificate_number_key; Type: CONSTRAINT; Schema: academic_registration; Owner: -
--

ALTER TABLE ONLY academic_registration.graduation_certificates
    ADD CONSTRAINT graduation_certificates_certificate_number_key UNIQUE (certificate_number);


--
-- Name: graduation_certificates graduation_certificates_pkey; Type: CONSTRAINT; Schema: academic_registration; Owner: -
--

ALTER TABLE ONLY academic_registration.graduation_certificates
    ADD CONSTRAINT graduation_certificates_pkey PRIMARY KEY (id);


--
-- Name: graduation_certificates graduation_certificates_verification_code_key; Type: CONSTRAINT; Schema: academic_registration; Owner: -
--

ALTER TABLE ONLY academic_registration.graduation_certificates
    ADD CONSTRAINT graduation_certificates_verification_code_key UNIQUE (verification_code);


--
-- Name: signers signers_pkey; Type: CONSTRAINT; Schema: academic_registration; Owner: -
--

ALTER TABLE ONLY academic_registration.signers
    ADD CONSTRAINT signers_pkey PRIMARY KEY (id);


--
-- Name: template_config_changes template_config_changes_pkey; Type: CONSTRAINT; Schema: academic_registration; Owner: -
--

ALTER TABLE ONLY academic_registration.template_config_changes
    ADD CONSTRAINT template_config_changes_pkey PRIMARY KEY (id);


--
-- Name: idx_cert_requests_date; Type: INDEX; Schema: academic_registration; Owner: -
--

CREATE INDEX idx_cert_requests_date ON academic_registration.graduation_certificate_requests USING btree (request_date);


--
-- Name: idx_cert_requests_graduate_id; Type: INDEX; Schema: academic_registration; Owner: -
--

CREATE INDEX idx_cert_requests_graduate_id ON academic_registration.graduation_certificate_requests USING btree (graduate_id);


--
-- Name: idx_cert_requests_id_number; Type: INDEX; Schema: academic_registration; Owner: -
--

CREATE INDEX idx_cert_requests_id_number ON academic_registration.graduation_certificate_requests USING btree (id_number);


--
-- Name: idx_cert_requests_number; Type: INDEX; Schema: academic_registration; Owner: -
--

CREATE INDEX idx_cert_requests_number ON academic_registration.graduation_certificate_requests USING btree (request_number);


--
-- Name: idx_cert_requests_status; Type: INDEX; Schema: academic_registration; Owner: -
--

CREATE INDEX idx_cert_requests_status ON academic_registration.graduation_certificate_requests USING btree (status);


--
-- Name: idx_certificates_graduate_id; Type: INDEX; Schema: academic_registration; Owner: -
--

CREATE INDEX idx_certificates_graduate_id ON academic_registration.graduation_certificates USING btree (graduate_id);


--
-- Name: idx_certificates_id_number; Type: INDEX; Schema: academic_registration; Owner: -
--

CREATE INDEX idx_certificates_id_number ON academic_registration.graduation_certificates USING btree (id_number);


--
-- Name: idx_certificates_number; Type: INDEX; Schema: academic_registration; Owner: -
--

CREATE INDEX idx_certificates_number ON academic_registration.graduation_certificates USING btree (certificate_number);


--
-- Name: idx_certificates_status; Type: INDEX; Schema: academic_registration; Owner: -
--

CREATE INDEX idx_certificates_status ON academic_registration.graduation_certificates USING btree (status);


--
-- Name: idx_certificates_verification; Type: INDEX; Schema: academic_registration; Owner: -
--

CREATE INDEX idx_certificates_verification ON academic_registration.graduation_certificates USING btree (verification_code);


--
-- Name: idx_downloads_certificate_id; Type: INDEX; Schema: academic_registration; Owner: -
--

CREATE INDEX idx_downloads_certificate_id ON academic_registration.certificate_downloads USING btree (certificate_id);


--
-- Name: idx_downloads_date; Type: INDEX; Schema: academic_registration; Owner: -
--

CREATE INDEX idx_downloads_date ON academic_registration.certificate_downloads USING btree (download_date);


--
-- Name: idx_graduates_diploma_number; Type: INDEX; Schema: academic_registration; Owner: -
--

CREATE INDEX idx_graduates_diploma_number ON academic_registration.graduates USING btree (diploma_number);


--
-- Name: idx_graduates_graduation_date; Type: INDEX; Schema: academic_registration; Owner: -
--

CREATE INDEX idx_graduates_graduation_date ON academic_registration.graduates USING btree (graduation_date);


--
-- Name: idx_graduates_id_issue_date; Type: INDEX; Schema: academic_registration; Owner: -
--

CREATE INDEX idx_graduates_id_issue_date ON academic_registration.graduates USING btree (id_issue_date);


--
-- Name: idx_graduates_id_number; Type: INDEX; Schema: academic_registration; Owner: -
--

CREATE INDEX idx_graduates_id_number ON academic_registration.graduates USING btree (id_number);


--
-- Name: idx_graduates_person_id; Type: INDEX; Schema: academic_registration; Owner: -
--

CREATE INDEX idx_graduates_person_id ON academic_registration.graduates USING btree (person_id);


--
-- Name: idx_graduates_program_id; Type: INDEX; Schema: academic_registration; Owner: -
--

CREATE INDEX idx_graduates_program_id ON academic_registration.graduates USING btree (program_id);


--
-- Name: idx_graduation_certificate_requests_manual_review; Type: INDEX; Schema: academic_registration; Owner: -
--

CREATE INDEX idx_graduation_certificate_requests_manual_review ON academic_registration.graduation_certificate_requests USING btree (manual_review);


--
-- Name: idx_signers_active; Type: INDEX; Schema: academic_registration; Owner: -
--

CREATE INDEX idx_signers_active ON academic_registration.signers USING btree (is_active);


--
-- Name: idx_template_changes_config_id; Type: INDEX; Schema: academic_registration; Owner: -
--

CREATE INDEX idx_template_changes_config_id ON academic_registration.template_config_changes USING btree (template_config_id);


--
-- Name: idx_template_changes_date; Type: INDEX; Schema: academic_registration; Owner: -
--

CREATE INDEX idx_template_changes_date ON academic_registration.template_config_changes USING btree (change_date);


--
-- Name: idx_template_config_active; Type: INDEX; Schema: academic_registration; Owner: -
--

CREATE INDEX idx_template_config_active ON academic_registration.certificate_template_config USING btree (is_active);


--
-- Name: idx_template_config_status; Type: INDEX; Schema: academic_registration; Owner: -
--

CREATE INDEX idx_template_config_status ON academic_registration.certificate_template_config USING btree (status);


--
-- Name: idx_validations_certificate_id; Type: INDEX; Schema: academic_registration; Owner: -
--

CREATE INDEX idx_validations_certificate_id ON academic_registration.certificate_validations USING btree (certificate_id);


--
-- Name: idx_validations_date; Type: INDEX; Schema: academic_registration; Owner: -
--

CREATE INDEX idx_validations_date ON academic_registration.certificate_validations USING btree (validation_date);


--
-- Name: unique_primary_signer; Type: INDEX; Schema: academic_registration; Owner: -
--

CREATE UNIQUE INDEX unique_primary_signer ON academic_registration.signers USING btree (is_primary) WHERE (is_primary = true);


--
-- Name: graduation_certificate_requests update_cert_requests_updated_at; Type: TRIGGER; Schema: academic_registration; Owner: -
--

CREATE TRIGGER update_cert_requests_updated_at BEFORE UPDATE ON academic_registration.graduation_certificate_requests FOR EACH ROW EXECUTE FUNCTION academic_registration.update_updated_at_column();


--
-- Name: graduation_certificates update_certificates_updated_at; Type: TRIGGER; Schema: academic_registration; Owner: -
--

CREATE TRIGGER update_certificates_updated_at BEFORE UPDATE ON academic_registration.graduation_certificates FOR EACH ROW EXECUTE FUNCTION academic_registration.update_updated_at_column();


--
-- Name: graduates update_graduates_updated_at; Type: TRIGGER; Schema: academic_registration; Owner: -
--

CREATE TRIGGER update_graduates_updated_at BEFORE UPDATE ON academic_registration.graduates FOR EACH ROW EXECUTE FUNCTION academic_registration.update_updated_at_column();


--
-- Name: signers update_signers_updated_at; Type: TRIGGER; Schema: academic_registration; Owner: -
--

CREATE TRIGGER update_signers_updated_at BEFORE UPDATE ON academic_registration.signers FOR EACH ROW EXECUTE FUNCTION academic_registration.update_updated_at_column();


--
-- Name: certificate_template_config update_template_config_updated_at; Type: TRIGGER; Schema: academic_registration; Owner: -
--

CREATE TRIGGER update_template_config_updated_at BEFORE UPDATE ON academic_registration.certificate_template_config FOR EACH ROW EXECUTE FUNCTION academic_registration.update_updated_at_column();


--
-- Name: certificate_downloads certificate_downloads_certificate_id_fkey; Type: FK CONSTRAINT; Schema: academic_registration; Owner: -
--

ALTER TABLE ONLY academic_registration.certificate_downloads
    ADD CONSTRAINT certificate_downloads_certificate_id_fkey FOREIGN KEY (certificate_id) REFERENCES academic_registration.graduation_certificates(id);


--
-- Name: certificate_template_config certificate_template_config_signer_id_fkey; Type: FK CONSTRAINT; Schema: academic_registration; Owner: -
--

ALTER TABLE ONLY academic_registration.certificate_template_config
    ADD CONSTRAINT certificate_template_config_signer_id_fkey FOREIGN KEY (signer_id) REFERENCES academic_registration.signers(id);


--
-- Name: certificate_validations certificate_validations_certificate_id_fkey; Type: FK CONSTRAINT; Schema: academic_registration; Owner: -
--

ALTER TABLE ONLY academic_registration.certificate_validations
    ADD CONSTRAINT certificate_validations_certificate_id_fkey FOREIGN KEY (certificate_id) REFERENCES academic_registration.graduation_certificates(id);


--
-- Name: graduation_certificates graduation_certificates_graduate_id_fkey; Type: FK CONSTRAINT; Schema: academic_registration; Owner: -
--

ALTER TABLE ONLY academic_registration.graduation_certificates
    ADD CONSTRAINT graduation_certificates_graduate_id_fkey FOREIGN KEY (graduate_id) REFERENCES academic_registration.graduates(id);


--
-- Name: graduation_certificates graduation_certificates_request_id_fkey; Type: FK CONSTRAINT; Schema: academic_registration; Owner: -
--

ALTER TABLE ONLY academic_registration.graduation_certificates
    ADD CONSTRAINT graduation_certificates_request_id_fkey FOREIGN KEY (request_id) REFERENCES academic_registration.graduation_certificate_requests(id);


--
-- Name: template_config_changes template_config_changes_template_config_id_fkey; Type: FK CONSTRAINT; Schema: academic_registration; Owner: -
--

ALTER TABLE ONLY academic_registration.template_config_changes
    ADD CONSTRAINT template_config_changes_template_config_id_fkey FOREIGN KEY (template_config_id) REFERENCES academic_registration.certificate_template_config(id);


--
-- PostgreSQL database dump complete
--

