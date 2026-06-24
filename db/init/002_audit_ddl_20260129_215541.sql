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
-- Name: audit; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA audit;


--
-- Name: SCHEMA audit; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA audit IS 'Schema para almacenar logs de auditoría de todas las peticiones HTTP del sistema';


--
-- Name: cleanup_old_logs(integer); Type: FUNCTION; Schema: audit; Owner: -
--

CREATE FUNCTION audit.cleanup_old_logs(months_to_keep integer DEFAULT 6) RETURNS integer
    LANGUAGE plpgsql
    AS $_$
DECLARE
    deleted_partitions INTEGER := 0;
    partition_record RECORD;
    cutoff_date DATE;
BEGIN
    cutoff_date := DATE_TRUNC('month', CURRENT_DATE) - (months_to_keep || ' months')::INTERVAL;
    
    FOR partition_record IN
        SELECT schemaname, tablename
        FROM pg_tables
        WHERE schemaname = 'audit'
        AND tablename LIKE 'request_logs_%'
        AND tablename ~ '^request_logs_\d{4}_\d{2}$'
    LOOP
        DECLARE
            partition_date DATE;
            date_str TEXT;
        BEGIN
            date_str := SUBSTRING(partition_record.tablename FROM 'request_logs_(\d{4}_\d{2})');
            IF date_str IS NOT NULL THEN
                partition_date := TO_DATE(date_str, 'YYYY_MM');
                
                IF partition_date < cutoff_date THEN
                    EXECUTE format('DROP TABLE IF EXISTS audit.%I', partition_record.tablename);
                    deleted_partitions := deleted_partitions + 1;
                END IF;
            END IF;
        END;
    END LOOP;
    
    RETURN deleted_partitions;
END;
$_$;


--
-- Name: create_monthly_partition(); Type: FUNCTION; Schema: audit; Owner: -
--

CREATE FUNCTION audit.create_monthly_partition() RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
BEGIN
    start_date := DATE_TRUNC('month', CURRENT_DATE);
    end_date := start_date + INTERVAL '1 month';
    partition_name := 'request_logs_' || TO_CHAR(start_date, 'YYYY_MM');
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_class WHERE relname = partition_name
    ) THEN
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS audit.%I PARTITION OF audit.request_logs FOR VALUES FROM (%L) TO (%L)',
            partition_name,
            start_date,
            end_date
        );
    END IF;
    
    start_date := DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month';
    end_date := start_date + INTERVAL '1 month';
    partition_name := 'request_logs_' || TO_CHAR(start_date, 'YYYY_MM');
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_class WHERE relname = partition_name
    ) THEN
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS audit.%I PARTITION OF audit.request_logs FOR VALUES FROM (%L) TO (%L)',
            partition_name,
            start_date,
            end_date
        );
    END IF;
END;
$$;


--
-- Name: request_logs_partition_trigger(); Type: FUNCTION; Schema: audit; Owner: -
--

CREATE FUNCTION audit.request_logs_partition_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    PERFORM audit.create_monthly_partition();
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

--
-- Name: request_logs; Type: TABLE; Schema: audit; Owner: -
--

CREATE TABLE audit.request_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    method character varying(10) NOT NULL,
    url text NOT NULL,
    path text NOT NULL,
    query_params jsonb,
    module character varying(100),
    submodule character varying(100),
    version character varying(10),
    ip_address character varying(45),
    user_agent text,
    origin text,
    referer text,
    user_id bigint,
    user_email character varying(255),
    user_role character varying(100),
    status_code integer NOT NULL,
    response_time_ms integer NOT NULL,
    response_size_bytes integer DEFAULT 0,
    request_body jsonb,
    request_body_size integer DEFAULT 0,
    has_large_body boolean DEFAULT false,
    response_body jsonb,
    response_body_size integer DEFAULT 0,
    has_large_response boolean DEFAULT false,
    error_message text,
    error_stack text,
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    action character varying(100)
)
PARTITION BY RANGE ("timestamp");


--
-- Name: TABLE request_logs; Type: COMMENT; Schema: audit; Owner: -
--

COMMENT ON TABLE audit.request_logs IS 'Registro de todas las peticiones HTTP del sistema para auditoría. Tabla particionada por mes.';


--
-- Name: COLUMN request_logs.module; Type: COMMENT; Schema: audit; Owner: -
--

COMMENT ON COLUMN audit.request_logs.module IS 'Módulo del sistema: auth, certificados, control-interno, legal, etc.';


--
-- Name: COLUMN request_logs.submodule; Type: COMMENT; Schema: audit; Owner: -
--

COMMENT ON COLUMN audit.request_logs.submodule IS 'Submódulo o recurso específico dentro del módulo: expedientes, juzgamiento, users, roles, etc.';


--
-- Name: COLUMN request_logs.action; Type: COMMENT; Schema: audit; Owner: -
--

COMMENT ON COLUMN audit.request_logs.action IS 'Acción legible realizada en la petición (ej: "crear auditoria", "iniciar sesión", "actualizar hallazgo")';


SET default_table_access_method = heap;

--
-- Name: request_logs_current; Type: TABLE; Schema: audit; Owner: -
--

CREATE TABLE audit.request_logs_current (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    method character varying(10) NOT NULL,
    url text NOT NULL,
    path text NOT NULL,
    query_params jsonb,
    module character varying(100),
    submodule character varying(100),
    version character varying(10),
    ip_address character varying(45),
    user_agent text,
    origin text,
    referer text,
    user_id bigint,
    user_email character varying(255),
    user_role character varying(100),
    status_code integer NOT NULL,
    response_time_ms integer NOT NULL,
    response_size_bytes integer DEFAULT 0,
    request_body jsonb,
    request_body_size integer DEFAULT 0,
    has_large_body boolean DEFAULT false,
    response_body jsonb,
    response_body_size integer DEFAULT 0,
    has_large_response boolean DEFAULT false,
    error_message text,
    error_stack text,
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    action character varying(100)
);


--
-- Name: request_logs_next_month; Type: TABLE; Schema: audit; Owner: -
--

CREATE TABLE audit.request_logs_next_month (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    method character varying(10) NOT NULL,
    url text NOT NULL,
    path text NOT NULL,
    query_params jsonb,
    module character varying(100),
    submodule character varying(100),
    version character varying(10),
    ip_address character varying(45),
    user_agent text,
    origin text,
    referer text,
    user_id bigint,
    user_email character varying(255),
    user_role character varying(100),
    status_code integer NOT NULL,
    response_time_ms integer NOT NULL,
    response_size_bytes integer DEFAULT 0,
    request_body jsonb,
    request_body_size integer DEFAULT 0,
    has_large_body boolean DEFAULT false,
    response_body jsonb,
    response_body_size integer DEFAULT 0,
    has_large_response boolean DEFAULT false,
    error_message text,
    error_stack text,
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    action character varying(100)
);


--
-- Name: request_logs_prev_month; Type: TABLE; Schema: audit; Owner: -
--

CREATE TABLE audit.request_logs_prev_month (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    method character varying(10) NOT NULL,
    url text NOT NULL,
    path text NOT NULL,
    query_params jsonb,
    module character varying(100),
    submodule character varying(100),
    version character varying(10),
    ip_address character varying(45),
    user_agent text,
    origin text,
    referer text,
    user_id bigint,
    user_email character varying(255),
    user_role character varying(100),
    status_code integer NOT NULL,
    response_time_ms integer NOT NULL,
    response_size_bytes integer DEFAULT 0,
    request_body jsonb,
    request_body_size integer DEFAULT 0,
    has_large_body boolean DEFAULT false,
    response_body jsonb,
    response_body_size integer DEFAULT 0,
    has_large_response boolean DEFAULT false,
    error_message text,
    error_stack text,
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    action character varying(100)
);


--
-- Name: request_logs_stats; Type: VIEW; Schema: audit; Owner: -
--

CREATE VIEW audit.request_logs_stats AS
 SELECT date_trunc('day'::text, "timestamp") AS date,
    method,
    module,
    submodule,
    status_code,
    count(*) AS request_count,
    avg(response_time_ms) AS avg_response_time,
    percentile_cont((0.5)::double precision) WITHIN GROUP (ORDER BY ((response_time_ms)::double precision)) AS median_response_time,
    max(response_time_ms) AS max_response_time,
    min(response_time_ms) AS min_response_time
   FROM audit.request_logs
  GROUP BY (date_trunc('day'::text, "timestamp")), method, module, submodule, status_code
  ORDER BY (date_trunc('day'::text, "timestamp")) DESC, module, method;


--
-- Name: request_logs_current; Type: TABLE ATTACH; Schema: audit; Owner: -
--

ALTER TABLE ONLY audit.request_logs ATTACH PARTITION audit.request_logs_current FOR VALUES FROM ('2026-01-01 00:00:00') TO ('2026-02-01 00:00:00');


--
-- Name: request_logs_next_month; Type: TABLE ATTACH; Schema: audit; Owner: -
--

ALTER TABLE ONLY audit.request_logs ATTACH PARTITION audit.request_logs_next_month FOR VALUES FROM ('2026-02-01 00:00:00') TO ('2026-03-01 00:00:00');


--
-- Name: request_logs_prev_month; Type: TABLE ATTACH; Schema: audit; Owner: -
--

ALTER TABLE ONLY audit.request_logs ATTACH PARTITION audit.request_logs_prev_month FOR VALUES FROM ('2025-12-01 00:00:00') TO ('2026-01-01 00:00:00');


--
-- Name: request_logs request_logs_pkey; Type: CONSTRAINT; Schema: audit; Owner: -
--

ALTER TABLE ONLY audit.request_logs
    ADD CONSTRAINT request_logs_pkey PRIMARY KEY (id, "timestamp");


--
-- Name: request_logs_current request_logs_current_pkey; Type: CONSTRAINT; Schema: audit; Owner: -
--

ALTER TABLE ONLY audit.request_logs_current
    ADD CONSTRAINT request_logs_current_pkey PRIMARY KEY (id, "timestamp");


--
-- Name: request_logs_next_month request_logs_next_month_pkey; Type: CONSTRAINT; Schema: audit; Owner: -
--

ALTER TABLE ONLY audit.request_logs_next_month
    ADD CONSTRAINT request_logs_next_month_pkey PRIMARY KEY (id, "timestamp");


--
-- Name: request_logs_prev_month request_logs_prev_month_pkey; Type: CONSTRAINT; Schema: audit; Owner: -
--

ALTER TABLE ONLY audit.request_logs_prev_month
    ADD CONSTRAINT request_logs_prev_month_pkey PRIMARY KEY (id, "timestamp");


--
-- Name: idx_request_logs_action; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX idx_request_logs_action ON ONLY audit.request_logs USING btree (action);


--
-- Name: idx_request_logs_action_module; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX idx_request_logs_action_module ON ONLY audit.request_logs USING btree (action, module);


--
-- Name: idx_request_logs_action_timestamp; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX idx_request_logs_action_timestamp ON ONLY audit.request_logs USING btree (action, "timestamp" DESC);


--
-- Name: idx_request_logs_ip; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX idx_request_logs_ip ON ONLY audit.request_logs USING btree (ip_address);


--
-- Name: idx_request_logs_method; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX idx_request_logs_method ON ONLY audit.request_logs USING btree (method);


--
-- Name: idx_request_logs_module; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX idx_request_logs_module ON ONLY audit.request_logs USING btree (module);


--
-- Name: idx_request_logs_module_status; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX idx_request_logs_module_status ON ONLY audit.request_logs USING btree (module, status_code);


--
-- Name: idx_request_logs_module_submodule; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX idx_request_logs_module_submodule ON ONLY audit.request_logs USING btree (module, submodule);


--
-- Name: idx_request_logs_query_params; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX idx_request_logs_query_params ON ONLY audit.request_logs USING gin (query_params);


--
-- Name: idx_request_logs_request_body; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX idx_request_logs_request_body ON ONLY audit.request_logs USING gin (request_body);


--
-- Name: idx_request_logs_response_body; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX idx_request_logs_response_body ON ONLY audit.request_logs USING gin (response_body);


--
-- Name: idx_request_logs_status; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX idx_request_logs_status ON ONLY audit.request_logs USING btree (status_code);


--
-- Name: idx_request_logs_submodule; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX idx_request_logs_submodule ON ONLY audit.request_logs USING btree (submodule);


--
-- Name: idx_request_logs_timestamp; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX idx_request_logs_timestamp ON ONLY audit.request_logs USING btree ("timestamp" DESC);


--
-- Name: idx_request_logs_timestamp_module; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX idx_request_logs_timestamp_module ON ONLY audit.request_logs USING btree ("timestamp" DESC, module);


--
-- Name: idx_request_logs_user_id; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX idx_request_logs_user_id ON ONLY audit.request_logs USING btree (user_id);


--
-- Name: request_logs_current_action_idx; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX request_logs_current_action_idx ON audit.request_logs_current USING btree (action);


--
-- Name: request_logs_current_action_module_idx; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX request_logs_current_action_module_idx ON audit.request_logs_current USING btree (action, module);


--
-- Name: request_logs_current_action_timestamp_idx; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX request_logs_current_action_timestamp_idx ON audit.request_logs_current USING btree (action, "timestamp" DESC);


--
-- Name: request_logs_current_ip_address_idx; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX request_logs_current_ip_address_idx ON audit.request_logs_current USING btree (ip_address);


--
-- Name: request_logs_current_method_idx; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX request_logs_current_method_idx ON audit.request_logs_current USING btree (method);


--
-- Name: request_logs_current_module_idx; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX request_logs_current_module_idx ON audit.request_logs_current USING btree (module);


--
-- Name: request_logs_current_module_status_code_idx; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX request_logs_current_module_status_code_idx ON audit.request_logs_current USING btree (module, status_code);


--
-- Name: request_logs_current_module_submodule_idx; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX request_logs_current_module_submodule_idx ON audit.request_logs_current USING btree (module, submodule);


--
-- Name: request_logs_current_query_params_idx; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX request_logs_current_query_params_idx ON audit.request_logs_current USING gin (query_params);


--
-- Name: request_logs_current_request_body_idx; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX request_logs_current_request_body_idx ON audit.request_logs_current USING gin (request_body);


--
-- Name: request_logs_current_response_body_idx; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX request_logs_current_response_body_idx ON audit.request_logs_current USING gin (response_body);


--
-- Name: request_logs_current_status_code_idx; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX request_logs_current_status_code_idx ON audit.request_logs_current USING btree (status_code);


--
-- Name: request_logs_current_submodule_idx; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX request_logs_current_submodule_idx ON audit.request_logs_current USING btree (submodule);


--
-- Name: request_logs_current_timestamp_idx; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX request_logs_current_timestamp_idx ON audit.request_logs_current USING btree ("timestamp" DESC);


--
-- Name: request_logs_current_timestamp_module_idx; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX request_logs_current_timestamp_module_idx ON audit.request_logs_current USING btree ("timestamp" DESC, module);


--
-- Name: request_logs_current_user_id_idx; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX request_logs_current_user_id_idx ON audit.request_logs_current USING btree (user_id);


--
-- Name: request_logs_next_month_action_idx; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX request_logs_next_month_action_idx ON audit.request_logs_next_month USING btree (action);


--
-- Name: request_logs_next_month_action_module_idx; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX request_logs_next_month_action_module_idx ON audit.request_logs_next_month USING btree (action, module);


--
-- Name: request_logs_next_month_action_timestamp_idx; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX request_logs_next_month_action_timestamp_idx ON audit.request_logs_next_month USING btree (action, "timestamp" DESC);


--
-- Name: request_logs_next_month_ip_address_idx; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX request_logs_next_month_ip_address_idx ON audit.request_logs_next_month USING btree (ip_address);


--
-- Name: request_logs_next_month_method_idx; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX request_logs_next_month_method_idx ON audit.request_logs_next_month USING btree (method);


--
-- Name: request_logs_next_month_module_idx; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX request_logs_next_month_module_idx ON audit.request_logs_next_month USING btree (module);


--
-- Name: request_logs_next_month_module_status_code_idx; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX request_logs_next_month_module_status_code_idx ON audit.request_logs_next_month USING btree (module, status_code);


--
-- Name: request_logs_next_month_module_submodule_idx; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX request_logs_next_month_module_submodule_idx ON audit.request_logs_next_month USING btree (module, submodule);


--
-- Name: request_logs_next_month_query_params_idx; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX request_logs_next_month_query_params_idx ON audit.request_logs_next_month USING gin (query_params);


--
-- Name: request_logs_next_month_request_body_idx; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX request_logs_next_month_request_body_idx ON audit.request_logs_next_month USING gin (request_body);


--
-- Name: request_logs_next_month_response_body_idx; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX request_logs_next_month_response_body_idx ON audit.request_logs_next_month USING gin (response_body);


--
-- Name: request_logs_next_month_status_code_idx; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX request_logs_next_month_status_code_idx ON audit.request_logs_next_month USING btree (status_code);


--
-- Name: request_logs_next_month_submodule_idx; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX request_logs_next_month_submodule_idx ON audit.request_logs_next_month USING btree (submodule);


--
-- Name: request_logs_next_month_timestamp_idx; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX request_logs_next_month_timestamp_idx ON audit.request_logs_next_month USING btree ("timestamp" DESC);


--
-- Name: request_logs_next_month_timestamp_module_idx; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX request_logs_next_month_timestamp_module_idx ON audit.request_logs_next_month USING btree ("timestamp" DESC, module);


--
-- Name: request_logs_next_month_user_id_idx; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX request_logs_next_month_user_id_idx ON audit.request_logs_next_month USING btree (user_id);


--
-- Name: request_logs_prev_month_action_idx; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX request_logs_prev_month_action_idx ON audit.request_logs_prev_month USING btree (action);


--
-- Name: request_logs_prev_month_action_module_idx; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX request_logs_prev_month_action_module_idx ON audit.request_logs_prev_month USING btree (action, module);


--
-- Name: request_logs_prev_month_action_timestamp_idx; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX request_logs_prev_month_action_timestamp_idx ON audit.request_logs_prev_month USING btree (action, "timestamp" DESC);


--
-- Name: request_logs_prev_month_ip_address_idx; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX request_logs_prev_month_ip_address_idx ON audit.request_logs_prev_month USING btree (ip_address);


--
-- Name: request_logs_prev_month_method_idx; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX request_logs_prev_month_method_idx ON audit.request_logs_prev_month USING btree (method);


--
-- Name: request_logs_prev_month_module_idx; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX request_logs_prev_month_module_idx ON audit.request_logs_prev_month USING btree (module);


--
-- Name: request_logs_prev_month_module_status_code_idx; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX request_logs_prev_month_module_status_code_idx ON audit.request_logs_prev_month USING btree (module, status_code);


--
-- Name: request_logs_prev_month_module_submodule_idx; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX request_logs_prev_month_module_submodule_idx ON audit.request_logs_prev_month USING btree (module, submodule);


--
-- Name: request_logs_prev_month_query_params_idx; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX request_logs_prev_month_query_params_idx ON audit.request_logs_prev_month USING gin (query_params);


--
-- Name: request_logs_prev_month_request_body_idx; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX request_logs_prev_month_request_body_idx ON audit.request_logs_prev_month USING gin (request_body);


--
-- Name: request_logs_prev_month_response_body_idx; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX request_logs_prev_month_response_body_idx ON audit.request_logs_prev_month USING gin (response_body);


--
-- Name: request_logs_prev_month_status_code_idx; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX request_logs_prev_month_status_code_idx ON audit.request_logs_prev_month USING btree (status_code);


--
-- Name: request_logs_prev_month_submodule_idx; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX request_logs_prev_month_submodule_idx ON audit.request_logs_prev_month USING btree (submodule);


--
-- Name: request_logs_prev_month_timestamp_idx; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX request_logs_prev_month_timestamp_idx ON audit.request_logs_prev_month USING btree ("timestamp" DESC);


--
-- Name: request_logs_prev_month_timestamp_module_idx; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX request_logs_prev_month_timestamp_module_idx ON audit.request_logs_prev_month USING btree ("timestamp" DESC, module);


--
-- Name: request_logs_prev_month_user_id_idx; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX request_logs_prev_month_user_id_idx ON audit.request_logs_prev_month USING btree (user_id);


--
-- Name: request_logs_current_action_idx; Type: INDEX ATTACH; Schema: audit; Owner: -
--

ALTER INDEX audit.idx_request_logs_action ATTACH PARTITION audit.request_logs_current_action_idx;


--
-- Name: request_logs_current_action_module_idx; Type: INDEX ATTACH; Schema: audit; Owner: -
--

ALTER INDEX audit.idx_request_logs_action_module ATTACH PARTITION audit.request_logs_current_action_module_idx;


--
-- Name: request_logs_current_action_timestamp_idx; Type: INDEX ATTACH; Schema: audit; Owner: -
--

ALTER INDEX audit.idx_request_logs_action_timestamp ATTACH PARTITION audit.request_logs_current_action_timestamp_idx;


--
-- Name: request_logs_current_ip_address_idx; Type: INDEX ATTACH; Schema: audit; Owner: -
--

ALTER INDEX audit.idx_request_logs_ip ATTACH PARTITION audit.request_logs_current_ip_address_idx;


--
-- Name: request_logs_current_method_idx; Type: INDEX ATTACH; Schema: audit; Owner: -
--

ALTER INDEX audit.idx_request_logs_method ATTACH PARTITION audit.request_logs_current_method_idx;


--
-- Name: request_logs_current_module_idx; Type: INDEX ATTACH; Schema: audit; Owner: -
--

ALTER INDEX audit.idx_request_logs_module ATTACH PARTITION audit.request_logs_current_module_idx;


--
-- Name: request_logs_current_module_status_code_idx; Type: INDEX ATTACH; Schema: audit; Owner: -
--

ALTER INDEX audit.idx_request_logs_module_status ATTACH PARTITION audit.request_logs_current_module_status_code_idx;


--
-- Name: request_logs_current_module_submodule_idx; Type: INDEX ATTACH; Schema: audit; Owner: -
--

ALTER INDEX audit.idx_request_logs_module_submodule ATTACH PARTITION audit.request_logs_current_module_submodule_idx;


--
-- Name: request_logs_current_pkey; Type: INDEX ATTACH; Schema: audit; Owner: -
--

ALTER INDEX audit.request_logs_pkey ATTACH PARTITION audit.request_logs_current_pkey;


--
-- Name: request_logs_current_query_params_idx; Type: INDEX ATTACH; Schema: audit; Owner: -
--

ALTER INDEX audit.idx_request_logs_query_params ATTACH PARTITION audit.request_logs_current_query_params_idx;


--
-- Name: request_logs_current_request_body_idx; Type: INDEX ATTACH; Schema: audit; Owner: -
--

ALTER INDEX audit.idx_request_logs_request_body ATTACH PARTITION audit.request_logs_current_request_body_idx;


--
-- Name: request_logs_current_response_body_idx; Type: INDEX ATTACH; Schema: audit; Owner: -
--

ALTER INDEX audit.idx_request_logs_response_body ATTACH PARTITION audit.request_logs_current_response_body_idx;


--
-- Name: request_logs_current_status_code_idx; Type: INDEX ATTACH; Schema: audit; Owner: -
--

ALTER INDEX audit.idx_request_logs_status ATTACH PARTITION audit.request_logs_current_status_code_idx;


--
-- Name: request_logs_current_submodule_idx; Type: INDEX ATTACH; Schema: audit; Owner: -
--

ALTER INDEX audit.idx_request_logs_submodule ATTACH PARTITION audit.request_logs_current_submodule_idx;


--
-- Name: request_logs_current_timestamp_idx; Type: INDEX ATTACH; Schema: audit; Owner: -
--

ALTER INDEX audit.idx_request_logs_timestamp ATTACH PARTITION audit.request_logs_current_timestamp_idx;


--
-- Name: request_logs_current_timestamp_module_idx; Type: INDEX ATTACH; Schema: audit; Owner: -
--

ALTER INDEX audit.idx_request_logs_timestamp_module ATTACH PARTITION audit.request_logs_current_timestamp_module_idx;


--
-- Name: request_logs_current_user_id_idx; Type: INDEX ATTACH; Schema: audit; Owner: -
--

ALTER INDEX audit.idx_request_logs_user_id ATTACH PARTITION audit.request_logs_current_user_id_idx;


--
-- Name: request_logs_next_month_action_idx; Type: INDEX ATTACH; Schema: audit; Owner: -
--

ALTER INDEX audit.idx_request_logs_action ATTACH PARTITION audit.request_logs_next_month_action_idx;


--
-- Name: request_logs_next_month_action_module_idx; Type: INDEX ATTACH; Schema: audit; Owner: -
--

ALTER INDEX audit.idx_request_logs_action_module ATTACH PARTITION audit.request_logs_next_month_action_module_idx;


--
-- Name: request_logs_next_month_action_timestamp_idx; Type: INDEX ATTACH; Schema: audit; Owner: -
--

ALTER INDEX audit.idx_request_logs_action_timestamp ATTACH PARTITION audit.request_logs_next_month_action_timestamp_idx;


--
-- Name: request_logs_next_month_ip_address_idx; Type: INDEX ATTACH; Schema: audit; Owner: -
--

ALTER INDEX audit.idx_request_logs_ip ATTACH PARTITION audit.request_logs_next_month_ip_address_idx;


--
-- Name: request_logs_next_month_method_idx; Type: INDEX ATTACH; Schema: audit; Owner: -
--

ALTER INDEX audit.idx_request_logs_method ATTACH PARTITION audit.request_logs_next_month_method_idx;


--
-- Name: request_logs_next_month_module_idx; Type: INDEX ATTACH; Schema: audit; Owner: -
--

ALTER INDEX audit.idx_request_logs_module ATTACH PARTITION audit.request_logs_next_month_module_idx;


--
-- Name: request_logs_next_month_module_status_code_idx; Type: INDEX ATTACH; Schema: audit; Owner: -
--

ALTER INDEX audit.idx_request_logs_module_status ATTACH PARTITION audit.request_logs_next_month_module_status_code_idx;


--
-- Name: request_logs_next_month_module_submodule_idx; Type: INDEX ATTACH; Schema: audit; Owner: -
--

ALTER INDEX audit.idx_request_logs_module_submodule ATTACH PARTITION audit.request_logs_next_month_module_submodule_idx;


--
-- Name: request_logs_next_month_pkey; Type: INDEX ATTACH; Schema: audit; Owner: -
--

ALTER INDEX audit.request_logs_pkey ATTACH PARTITION audit.request_logs_next_month_pkey;


--
-- Name: request_logs_next_month_query_params_idx; Type: INDEX ATTACH; Schema: audit; Owner: -
--

ALTER INDEX audit.idx_request_logs_query_params ATTACH PARTITION audit.request_logs_next_month_query_params_idx;


--
-- Name: request_logs_next_month_request_body_idx; Type: INDEX ATTACH; Schema: audit; Owner: -
--

ALTER INDEX audit.idx_request_logs_request_body ATTACH PARTITION audit.request_logs_next_month_request_body_idx;


--
-- Name: request_logs_next_month_response_body_idx; Type: INDEX ATTACH; Schema: audit; Owner: -
--

ALTER INDEX audit.idx_request_logs_response_body ATTACH PARTITION audit.request_logs_next_month_response_body_idx;


--
-- Name: request_logs_next_month_status_code_idx; Type: INDEX ATTACH; Schema: audit; Owner: -
--

ALTER INDEX audit.idx_request_logs_status ATTACH PARTITION audit.request_logs_next_month_status_code_idx;


--
-- Name: request_logs_next_month_submodule_idx; Type: INDEX ATTACH; Schema: audit; Owner: -
--

ALTER INDEX audit.idx_request_logs_submodule ATTACH PARTITION audit.request_logs_next_month_submodule_idx;


--
-- Name: request_logs_next_month_timestamp_idx; Type: INDEX ATTACH; Schema: audit; Owner: -
--

ALTER INDEX audit.idx_request_logs_timestamp ATTACH PARTITION audit.request_logs_next_month_timestamp_idx;


--
-- Name: request_logs_next_month_timestamp_module_idx; Type: INDEX ATTACH; Schema: audit; Owner: -
--

ALTER INDEX audit.idx_request_logs_timestamp_module ATTACH PARTITION audit.request_logs_next_month_timestamp_module_idx;


--
-- Name: request_logs_next_month_user_id_idx; Type: INDEX ATTACH; Schema: audit; Owner: -
--

ALTER INDEX audit.idx_request_logs_user_id ATTACH PARTITION audit.request_logs_next_month_user_id_idx;


--
-- Name: request_logs_prev_month_action_idx; Type: INDEX ATTACH; Schema: audit; Owner: -
--

ALTER INDEX audit.idx_request_logs_action ATTACH PARTITION audit.request_logs_prev_month_action_idx;


--
-- Name: request_logs_prev_month_action_module_idx; Type: INDEX ATTACH; Schema: audit; Owner: -
--

ALTER INDEX audit.idx_request_logs_action_module ATTACH PARTITION audit.request_logs_prev_month_action_module_idx;


--
-- Name: request_logs_prev_month_action_timestamp_idx; Type: INDEX ATTACH; Schema: audit; Owner: -
--

ALTER INDEX audit.idx_request_logs_action_timestamp ATTACH PARTITION audit.request_logs_prev_month_action_timestamp_idx;


--
-- Name: request_logs_prev_month_ip_address_idx; Type: INDEX ATTACH; Schema: audit; Owner: -
--

ALTER INDEX audit.idx_request_logs_ip ATTACH PARTITION audit.request_logs_prev_month_ip_address_idx;


--
-- Name: request_logs_prev_month_method_idx; Type: INDEX ATTACH; Schema: audit; Owner: -
--

ALTER INDEX audit.idx_request_logs_method ATTACH PARTITION audit.request_logs_prev_month_method_idx;


--
-- Name: request_logs_prev_month_module_idx; Type: INDEX ATTACH; Schema: audit; Owner: -
--

ALTER INDEX audit.idx_request_logs_module ATTACH PARTITION audit.request_logs_prev_month_module_idx;


--
-- Name: request_logs_prev_month_module_status_code_idx; Type: INDEX ATTACH; Schema: audit; Owner: -
--

ALTER INDEX audit.idx_request_logs_module_status ATTACH PARTITION audit.request_logs_prev_month_module_status_code_idx;


--
-- Name: request_logs_prev_month_module_submodule_idx; Type: INDEX ATTACH; Schema: audit; Owner: -
--

ALTER INDEX audit.idx_request_logs_module_submodule ATTACH PARTITION audit.request_logs_prev_month_module_submodule_idx;


--
-- Name: request_logs_prev_month_pkey; Type: INDEX ATTACH; Schema: audit; Owner: -
--

ALTER INDEX audit.request_logs_pkey ATTACH PARTITION audit.request_logs_prev_month_pkey;


--
-- Name: request_logs_prev_month_query_params_idx; Type: INDEX ATTACH; Schema: audit; Owner: -
--

ALTER INDEX audit.idx_request_logs_query_params ATTACH PARTITION audit.request_logs_prev_month_query_params_idx;


--
-- Name: request_logs_prev_month_request_body_idx; Type: INDEX ATTACH; Schema: audit; Owner: -
--

ALTER INDEX audit.idx_request_logs_request_body ATTACH PARTITION audit.request_logs_prev_month_request_body_idx;


--
-- Name: request_logs_prev_month_response_body_idx; Type: INDEX ATTACH; Schema: audit; Owner: -
--

ALTER INDEX audit.idx_request_logs_response_body ATTACH PARTITION audit.request_logs_prev_month_response_body_idx;


--
-- Name: request_logs_prev_month_status_code_idx; Type: INDEX ATTACH; Schema: audit; Owner: -
--

ALTER INDEX audit.idx_request_logs_status ATTACH PARTITION audit.request_logs_prev_month_status_code_idx;


--
-- Name: request_logs_prev_month_submodule_idx; Type: INDEX ATTACH; Schema: audit; Owner: -
--

ALTER INDEX audit.idx_request_logs_submodule ATTACH PARTITION audit.request_logs_prev_month_submodule_idx;


--
-- Name: request_logs_prev_month_timestamp_idx; Type: INDEX ATTACH; Schema: audit; Owner: -
--

ALTER INDEX audit.idx_request_logs_timestamp ATTACH PARTITION audit.request_logs_prev_month_timestamp_idx;


--
-- Name: request_logs_prev_month_timestamp_module_idx; Type: INDEX ATTACH; Schema: audit; Owner: -
--

ALTER INDEX audit.idx_request_logs_timestamp_module ATTACH PARTITION audit.request_logs_prev_month_timestamp_module_idx;


--
-- Name: request_logs_prev_month_user_id_idx; Type: INDEX ATTACH; Schema: audit; Owner: -
--

ALTER INDEX audit.idx_request_logs_user_id ATTACH PARTITION audit.request_logs_prev_month_user_id_idx;


--
-- Name: request_logs trigger_create_partition_before_insert; Type: TRIGGER; Schema: audit; Owner: -
--

CREATE TRIGGER trigger_create_partition_before_insert
    BEFORE INSERT ON audit.request_logs
    FOR EACH STATEMENT
    EXECUTE FUNCTION audit.request_logs_partition_trigger();


--
-- PostgreSQL database dump complete
--

