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
-- Name: requerimientos_oc; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA requerimientos_oc;


--
-- Name: generar_numero_hallazgo(); Type: FUNCTION; Schema: requerimientos_oc; Owner: -
--

CREATE FUNCTION requerimientos_oc.generar_numero_hallazgo() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.numero_interno IS NULL OR NEW.numero_interno = '' THEN
        NEW.numero_interno := 'HAL-ESAP-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || 
                              LPAD(nextval('seq_hallazgo_interno')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: registrar_historial_requerimiento(); Type: FUNCTION; Schema: requerimientos_oc; Owner: -
--

CREATE FUNCTION requerimientos_oc.registrar_historial_requerimiento() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.estado != NEW.estado THEN
        INSERT INTO historial_requerimientos (requerimiento_id, accion, descripcion, estado_anterior, estado_nuevo)
        VALUES (NEW.id, 'CAMBIO_ESTADO', 'Cambio de estado automático', OLD.estado, NEW.estado);
    END IF;
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: avances_hallazgo; Type: TABLE; Schema: requerimientos_oc; Owner: -
--

CREATE TABLE requerimientos_oc.avances_hallazgo (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    hallazgo_id uuid NOT NULL,
    fecha_reporte timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    porcentaje_avance integer,
    descripcion_avance text NOT NULL,
    documentos_adjuntos_urls text[],
    reportado_a_sireci boolean DEFAULT false,
    fecha_reporte_sireci timestamp without time zone,
    reportado_por character varying(150),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT avances_hallazgo_porcentaje_avance_check CHECK (((porcentaje_avance >= 0) AND (porcentaje_avance <= 100)))
);


--
-- Name: cat_organismos_control; Type: TABLE; Schema: requerimientos_oc; Owner: -
--

CREATE TABLE requerimientos_oc.cat_organismos_control (
    id integer NOT NULL,
    nombre character varying(255) NOT NULL,
    sigla character varying(50) NOT NULL,
    tipo character varying(50) NOT NULL,
    nivel character varying(50) NOT NULL,
    activo boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE cat_organismos_control; Type: COMMENT; Schema: requerimientos_oc; Owner: -
--

COMMENT ON TABLE requerimientos_oc.cat_organismos_control IS 'Catálogo maestro de organismos de control que pueden generar requerimientos a la ESAP';


--
-- Name: cat_organismos_control_id_seq; Type: SEQUENCE; Schema: requerimientos_oc; Owner: -
--

CREATE SEQUENCE requerimientos_oc.cat_organismos_control_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cat_organismos_control_id_seq; Type: SEQUENCE OWNED BY; Schema: requerimientos_oc; Owner: -
--

ALTER SEQUENCE requerimientos_oc.cat_organismos_control_id_seq OWNED BY requerimientos_oc.cat_organismos_control.id;


--
-- Name: hallazgos; Type: TABLE; Schema: requerimientos_oc; Owner: -
--

CREATE TABLE requerimientos_oc.hallazgos (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    requerimiento_id uuid,
    codigo_hallazgo character varying(50) NOT NULL,
    numero_interno character varying(50),
    tipo_hallazgo character varying(30) DEFAULT 'ADMINISTRATIVO'::character varying,
    titulo character varying(300) NOT NULL,
    descripcion text NOT NULL,
    causa_raiz text,
    efecto text,
    area_responsable character varying(100),
    funcionario_responsable character varying(150),
    accion_correctiva text NOT NULL,
    fecha_compromiso date NOT NULL,
    indicador_cumplimiento text,
    meta_indicador character varying(100),
    estado character varying(30) DEFAULT 'ABIERTO'::character varying,
    porcentaje_avance integer DEFAULT 0,
    fecha_ultimo_reporte timestamp without time zone,
    fecha_proximo_reporte date,
    periodicidad_reporte character varying(20) DEFAULT 'SEMESTRAL'::character varying,
    documento_plan_url character varying(500),
    documentos_evidencia_urls text[],
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(150),
    CONSTRAINT hallazgos_estado_check CHECK (((estado)::text = ANY ((ARRAY['ABIERTO'::character varying, 'EN_CURSO'::character varying, 'EN_REVISION'::character varying, 'CERRADO'::character varying, 'RECHAZADO'::character varying])::text[]))),
    CONSTRAINT hallazgos_periodicidad_reporte_check CHECK (((periodicidad_reporte)::text = ANY ((ARRAY['MENSUAL'::character varying, 'TRIMESTRAL'::character varying, 'SEMESTRAL'::character varying, 'ANUAL'::character varying])::text[]))),
    CONSTRAINT hallazgos_porcentaje_avance_check CHECK (((porcentaje_avance >= 0) AND (porcentaje_avance <= 100))),
    CONSTRAINT hallazgos_tipo_hallazgo_check CHECK (((tipo_hallazgo)::text = ANY ((ARRAY['ADMINISTRATIVO'::character varying, 'FISCAL'::character varying, 'DISCIPLINARIO'::character varying, 'PENAL'::character varying])::text[])))
);


--
-- Name: historial_requerimientos; Type: TABLE; Schema: requerimientos_oc; Owner: -
--

CREATE TABLE requerimientos_oc.historial_requerimientos (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
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
-- Name: requerimientos; Type: TABLE; Schema: requerimientos_oc; Owner: -
--

CREATE TABLE requerimientos_oc.requerimientos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    radicado_externo character varying(50) NOT NULL,
    radicado_interno character varying(20) NOT NULL,
    entidad_id integer NOT NULL,
    asunto text NOT NULL,
    tipo_requerimiento character varying(50) NOT NULL,
    fecha_recepcion date NOT NULL,
    fecha_vencimiento date NOT NULL,
    estado character varying(50) DEFAULT 'EN_PREPARACION'::character varying NOT NULL,
    prioridad_calculada character varying(20) DEFAULT 'NORMAL'::character varying,
    archivo_adjunto_url character varying(500),
    usuario_asignado_id integer,
    auditoria_created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    unidad_tiempo character varying(20) DEFAULT 'DIAS_HABILES'::character varying,
    dias_plazo_otorgado integer DEFAULT 15,
    referencia_externa character varying(100),
    descripcion text,
    funcionario_responsable character varying(150),
    area_responsable character varying(100),
    fecha_respuesta timestamp without time zone,
    oficio_respuesta_url character varying(500),
    acuse_recibo_url character varying(500),
    observaciones text,
    created_by character varying(150),
    CONSTRAINT chk_estado CHECK (((estado)::text = ANY ((ARRAY['EN_PREPARACION'::character varying, 'EN_REVISION'::character varying, 'APROBADO'::character varying, 'ENVIADO'::character varying, 'CERRADO'::character varying])::text[]))),
    CONSTRAINT chk_prioridad CHECK (((prioridad_calculada)::text = ANY ((ARRAY['CRITICA'::character varying, 'ALTA'::character varying, 'NORMAL'::character varying, 'BAJA'::character varying])::text[]))),
    CONSTRAINT chk_tipo_requerimiento CHECK (((tipo_requerimiento)::text = ANY ((ARRAY['INFORMACION'::character varying, 'AUDITORIA'::character varying, 'HALLAZGO'::character varying, 'AJUSTE'::character varying])::text[]))),
    CONSTRAINT requerimientos_unidad_tiempo_check CHECK (((unidad_tiempo)::text = ANY ((ARRAY['HORAS'::character varying, 'DIAS_CALENDARIO'::character varying, 'DIAS_HABILES'::character varying])::text[])))
);


--
-- Name: TABLE requerimientos; Type: COMMENT; Schema: requerimientos_oc; Owner: -
--

COMMENT ON TABLE requerimientos_oc.requerimientos IS 'Gestión de requerimientos de órganos de control con radicado automático y cálculo de vencimiento';


--
-- Name: COLUMN requerimientos.radicado_interno; Type: COMMENT; Schema: requerimientos_oc; Owner: -
--

COMMENT ON COLUMN requerimientos_oc.requerimientos.radicado_interno IS 'Formato: OC-YYYY-NNNNN (generado automáticamente)';


--
-- Name: COLUMN requerimientos.fecha_vencimiento; Type: COMMENT; Schema: requerimientos_oc; Owner: -
--

COMMENT ON COLUMN requerimientos_oc.requerimientos.fecha_vencimiento IS 'Calculada automáticamente sumando días hábiles (sin sábados/domingos) a fecha_recepcion';


--
-- Name: COLUMN requerimientos.prioridad_calculada; Type: COMMENT; Schema: requerimientos_oc; Owner: -
--

COMMENT ON COLUMN requerimientos_oc.requerimientos.prioridad_calculada IS 'Calculada dinámicamente basada en días restantes y tipo de requerimiento';


--
-- Name: seq_hallazgo_interno; Type: SEQUENCE; Schema: requerimientos_oc; Owner: -
--

CREATE SEQUENCE requerimientos_oc.seq_hallazgo_interno
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: solicitudes_insumos; Type: TABLE; Schema: requerimientos_oc; Owner: -
--

CREATE TABLE requerimientos_oc.solicitudes_insumos (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    requerimiento_id uuid NOT NULL,
    area_destino character varying(100) NOT NULL,
    funcionario_destino character varying(150),
    email_destino character varying(150),
    descripcion_solicitud text NOT NULL,
    documentos_solicitados text,
    fecha_solicitud timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_vencimiento timestamp without time zone NOT NULL,
    fecha_respuesta timestamp without time zone,
    estado character varying(20) DEFAULT 'PENDIENTE'::character varying,
    documentos_entregados_urls text[],
    comentario_respuesta text,
    solicitado_por character varying(150),
    respondido_por character varying(150),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT solicitudes_insumos_estado_check CHECK (((estado)::text = ANY ((ARRAY['PENDIENTE'::character varying, 'EN_PROCESO'::character varying, 'ENTREGADO'::character varying, 'RECHAZADO'::character varying, 'VENCIDO'::character varying])::text[])))
);


--
-- Name: cat_organismos_control id; Type: DEFAULT; Schema: requerimientos_oc; Owner: -
--

ALTER TABLE ONLY requerimientos_oc.cat_organismos_control ALTER COLUMN id SET DEFAULT nextval('requerimientos_oc.cat_organismos_control_id_seq'::regclass);


--
-- Name: avances_hallazgo avances_hallazgo_pkey; Type: CONSTRAINT; Schema: requerimientos_oc; Owner: -
--

ALTER TABLE ONLY requerimientos_oc.avances_hallazgo
    ADD CONSTRAINT avances_hallazgo_pkey PRIMARY KEY (id);


--
-- Name: cat_organismos_control cat_organismos_control_nombre_key; Type: CONSTRAINT; Schema: requerimientos_oc; Owner: -
--

ALTER TABLE ONLY requerimientos_oc.cat_organismos_control
    ADD CONSTRAINT cat_organismos_control_nombre_key UNIQUE (nombre);


--
-- Name: cat_organismos_control cat_organismos_control_pkey; Type: CONSTRAINT; Schema: requerimientos_oc; Owner: -
--

ALTER TABLE ONLY requerimientos_oc.cat_organismos_control
    ADD CONSTRAINT cat_organismos_control_pkey PRIMARY KEY (id);


--
-- Name: hallazgos hallazgos_codigo_hallazgo_key; Type: CONSTRAINT; Schema: requerimientos_oc; Owner: -
--

ALTER TABLE ONLY requerimientos_oc.hallazgos
    ADD CONSTRAINT hallazgos_codigo_hallazgo_key UNIQUE (codigo_hallazgo);


--
-- Name: hallazgos hallazgos_pkey; Type: CONSTRAINT; Schema: requerimientos_oc; Owner: -
--

ALTER TABLE ONLY requerimientos_oc.hallazgos
    ADD CONSTRAINT hallazgos_pkey PRIMARY KEY (id);


--
-- Name: historial_requerimientos historial_requerimientos_pkey; Type: CONSTRAINT; Schema: requerimientos_oc; Owner: -
--

ALTER TABLE ONLY requerimientos_oc.historial_requerimientos
    ADD CONSTRAINT historial_requerimientos_pkey PRIMARY KEY (id);


--
-- Name: requerimientos requerimientos_pkey; Type: CONSTRAINT; Schema: requerimientos_oc; Owner: -
--

ALTER TABLE ONLY requerimientos_oc.requerimientos
    ADD CONSTRAINT requerimientos_pkey PRIMARY KEY (id);


--
-- Name: requerimientos requerimientos_radicado_interno_key; Type: CONSTRAINT; Schema: requerimientos_oc; Owner: -
--

ALTER TABLE ONLY requerimientos_oc.requerimientos
    ADD CONSTRAINT requerimientos_radicado_interno_key UNIQUE (radicado_interno);


--
-- Name: solicitudes_insumos solicitudes_insumos_pkey; Type: CONSTRAINT; Schema: requerimientos_oc; Owner: -
--

ALTER TABLE ONLY requerimientos_oc.solicitudes_insumos
    ADD CONSTRAINT solicitudes_insumos_pkey PRIMARY KEY (id);


--
-- Name: idx_avances_fecha; Type: INDEX; Schema: requerimientos_oc; Owner: -
--

CREATE INDEX idx_avances_fecha ON requerimientos_oc.avances_hallazgo USING btree (fecha_reporte);


--
-- Name: idx_avances_hallazgo; Type: INDEX; Schema: requerimientos_oc; Owner: -
--

CREATE INDEX idx_avances_hallazgo ON requerimientos_oc.avances_hallazgo USING btree (hallazgo_id);


--
-- Name: idx_hallazgos_estado; Type: INDEX; Schema: requerimientos_oc; Owner: -
--

CREATE INDEX idx_hallazgos_estado ON requerimientos_oc.hallazgos USING btree (estado);


--
-- Name: idx_hallazgos_fecha_compromiso; Type: INDEX; Schema: requerimientos_oc; Owner: -
--

CREATE INDEX idx_hallazgos_fecha_compromiso ON requerimientos_oc.hallazgos USING btree (fecha_compromiso);


--
-- Name: idx_hallazgos_requerimiento; Type: INDEX; Schema: requerimientos_oc; Owner: -
--

CREATE INDEX idx_hallazgos_requerimiento ON requerimientos_oc.hallazgos USING btree (requerimiento_id);


--
-- Name: idx_historial_fecha; Type: INDEX; Schema: requerimientos_oc; Owner: -
--

CREATE INDEX idx_historial_fecha ON requerimientos_oc.historial_requerimientos USING btree (fecha);


--
-- Name: idx_historial_requerimiento; Type: INDEX; Schema: requerimientos_oc; Owner: -
--

CREATE INDEX idx_historial_requerimiento ON requerimientos_oc.historial_requerimientos USING btree (requerimiento_id);


--
-- Name: idx_insumos_area; Type: INDEX; Schema: requerimientos_oc; Owner: -
--

CREATE INDEX idx_insumos_area ON requerimientos_oc.solicitudes_insumos USING btree (area_destino);


--
-- Name: idx_insumos_estado; Type: INDEX; Schema: requerimientos_oc; Owner: -
--

CREATE INDEX idx_insumos_estado ON requerimientos_oc.solicitudes_insumos USING btree (estado);


--
-- Name: idx_insumos_requerimiento; Type: INDEX; Schema: requerimientos_oc; Owner: -
--

CREATE INDEX idx_insumos_requerimiento ON requerimientos_oc.solicitudes_insumos USING btree (requerimiento_id);


--
-- Name: idx_requerimientos_entidad; Type: INDEX; Schema: requerimientos_oc; Owner: -
--

CREATE INDEX idx_requerimientos_entidad ON requerimientos_oc.requerimientos USING btree (entidad_id);


--
-- Name: idx_requerimientos_estado; Type: INDEX; Schema: requerimientos_oc; Owner: -
--

CREATE INDEX idx_requerimientos_estado ON requerimientos_oc.requerimientos USING btree (estado);


--
-- Name: idx_requerimientos_fecha_vencimiento; Type: INDEX; Schema: requerimientos_oc; Owner: -
--

CREATE INDEX idx_requerimientos_fecha_vencimiento ON requerimientos_oc.requerimientos USING btree (fecha_vencimiento);


--
-- Name: idx_requerimientos_radicado_interno; Type: INDEX; Schema: requerimientos_oc; Owner: -
--

CREATE INDEX idx_requerimientos_radicado_interno ON requerimientos_oc.requerimientos USING btree (radicado_interno);


--
-- Name: idx_requerimientos_usuario_asignado; Type: INDEX; Schema: requerimientos_oc; Owner: -
--

CREATE INDEX idx_requerimientos_usuario_asignado ON requerimientos_oc.requerimientos USING btree (usuario_asignado_id);


--
-- Name: hallazgos trg_generar_numero_hallazgo; Type: TRIGGER; Schema: requerimientos_oc; Owner: -
--

CREATE TRIGGER trg_generar_numero_hallazgo BEFORE INSERT ON requerimientos_oc.hallazgos FOR EACH ROW EXECUTE FUNCTION requerimientos_oc.generar_numero_hallazgo();


--
-- Name: requerimientos trg_historial_requerimiento; Type: TRIGGER; Schema: requerimientos_oc; Owner: -
--

CREATE TRIGGER trg_historial_requerimiento AFTER UPDATE ON requerimientos_oc.requerimientos FOR EACH ROW EXECUTE FUNCTION requerimientos_oc.registrar_historial_requerimiento();


--
-- Name: avances_hallazgo avances_hallazgo_hallazgo_id_fkey; Type: FK CONSTRAINT; Schema: requerimientos_oc; Owner: -
--

ALTER TABLE ONLY requerimientos_oc.avances_hallazgo
    ADD CONSTRAINT avances_hallazgo_hallazgo_id_fkey FOREIGN KEY (hallazgo_id) REFERENCES requerimientos_oc.hallazgos(id) ON DELETE CASCADE;


--
-- Name: hallazgos hallazgos_requerimiento_id_fkey; Type: FK CONSTRAINT; Schema: requerimientos_oc; Owner: -
--

ALTER TABLE ONLY requerimientos_oc.hallazgos
    ADD CONSTRAINT hallazgos_requerimiento_id_fkey FOREIGN KEY (requerimiento_id) REFERENCES requerimientos_oc.requerimientos(id) ON DELETE CASCADE;


--
-- Name: historial_requerimientos historial_requerimientos_requerimiento_id_fkey; Type: FK CONSTRAINT; Schema: requerimientos_oc; Owner: -
--

ALTER TABLE ONLY requerimientos_oc.historial_requerimientos
    ADD CONSTRAINT historial_requerimientos_requerimiento_id_fkey FOREIGN KEY (requerimiento_id) REFERENCES requerimientos_oc.requerimientos(id) ON DELETE CASCADE;


--
-- Name: requerimientos requerimientos_entidad_id_fkey; Type: FK CONSTRAINT; Schema: requerimientos_oc; Owner: -
--

ALTER TABLE ONLY requerimientos_oc.requerimientos
    ADD CONSTRAINT requerimientos_entidad_id_fkey FOREIGN KEY (entidad_id) REFERENCES requerimientos_oc.cat_organismos_control(id);


--
-- Name: solicitudes_insumos solicitudes_insumos_requerimiento_id_fkey; Type: FK CONSTRAINT; Schema: requerimientos_oc; Owner: -
--

ALTER TABLE ONLY requerimientos_oc.solicitudes_insumos
    ADD CONSTRAINT solicitudes_insumos_requerimiento_id_fkey FOREIGN KEY (requerimiento_id) REFERENCES requerimientos_oc.requerimientos(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

