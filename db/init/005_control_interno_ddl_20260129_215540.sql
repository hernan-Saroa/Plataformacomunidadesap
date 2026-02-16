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
-- Name: control_interno; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA control_interno;


--
-- Name: SCHEMA control_interno; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA control_interno IS 'Schema unificado para el Sistema de Control Interno Institucional';


--
-- Name: estado_validacion_evidencia; Type: TYPE; Schema: control_interno; Owner: -
--

CREATE TYPE control_interno.estado_validacion_evidencia AS ENUM (
    'pendiente',
    'aceptado',
    'rechazado',
    'con_observaciones'
);


--
-- Name: tipo_documento_evidencia; Type: TYPE; Schema: control_interno; Owner: -
--

CREATE TYPE control_interno.tipo_documento_evidencia AS ENUM (
    'evidencia_hallazgo',
    'evidencia_accion',
    'evidencia_plan',
    'documento_plan',
    'certificado',
    'acta',
    'informe',
    'otro'
);


--
-- Name: tipo_evento_timeline; Type: TYPE; Schema: control_interno; Owner: -
--

CREATE TYPE control_interno.tipo_evento_timeline AS ENUM (
    'CREACION',
    'ACTUALIZACION',
    'APROBACION',
    'COMPLETADA',
    'EVIDENCIA',
    'COMENTARIO',
    'PROGRESO',
    'ESTADO',
    'HALLAZGO_COMPLETADO'
);


--
-- Name: tipo_lista_chequeo_enum; Type: TYPE; Schema: control_interno; Owner: -
--

CREATE TYPE control_interno.tipo_lista_chequeo_enum AS ENUM (
    'planeacion',
    'ejecucion',
    'comunicacion'
);


--
-- Name: actualizar_actividades_auditoria(); Type: FUNCTION; Schema: control_interno; Owner: -
--

CREATE FUNCTION control_interno.actualizar_actividades_auditoria() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_auditoria_id UUID;
    v_fase VARCHAR(50);
    total_actividades INTEGER;
    completadas INTEGER;
    pendientes INTEGER;
BEGIN
    -- Obtener el ID de la auditoría desde NEW
    v_auditoria_id := NEW.auditoria_id;
    
    -- Obtener la fase actual de la auditoría
    SELECT estado_kanban INTO v_fase
    FROM control_interno.auditoria
    WHERE id = v_auditoria_id;
    
    -- Si no hay fase, salir
    IF v_fase IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Contar actividades de la fase actual de la auditoría
    SELECT COUNT(*), COUNT(*) FILTER (WHERE estado = 'completada')
    INTO total_actividades, completadas
    FROM control_interno.actividad_proceso_auditoria
    WHERE auditoria_id = v_auditoria_id
      AND fase = v_fase;
    
    pendientes := total_actividades - completadas;
    
    -- Actualizar auditoría
    UPDATE control_interno.auditoria
    SET actividades_completas = (pendientes = 0),
        actividades_pendientes = pendientes
    WHERE id = v_auditoria_id;
    
    RETURN NEW;
END;
$$;


--
-- Name: FUNCTION actualizar_actividades_auditoria(); Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON FUNCTION control_interno.actualizar_actividades_auditoria() IS 'Actualiza actividades_completas y actividades_pendientes cuando cambia el estado de una actividad';


--
-- Name: actualizar_contadores_documentos_informes(); Type: FUNCTION; Schema: control_interno; Owner: -
--

CREATE FUNCTION control_interno.actualizar_contadores_documentos_informes() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_auditoria_id UUID;
    v_tipo_documento VARCHAR(100);
    v_es_informe BOOLEAN;
    total_docs INTEGER;
    total_inf INTEGER;
BEGIN
    -- Determinar el ID de la auditoría y el tipo de documento
    IF TG_OP = 'DELETE' THEN
        v_auditoria_id := OLD.auditoria_id;
        v_tipo_documento := OLD.tipo_documento;
    ELSE
        v_auditoria_id := NEW.auditoria_id;
        v_tipo_documento := NEW.tipo_documento;
    END IF;

    -- Si no hay auditoría asociada, no hacer nada
    IF v_auditoria_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Determinar si es un informe basado en el tipo de documento
    -- Los informes son: informe_preliminar, informe_final, informe_ejecutivo
    v_es_informe := v_tipo_documento IN ('informe_preliminar', 'informe_final', 'informe_ejecutivo');

    -- Contar documentos totales (excluyendo versiones anteriores, solo contar la versión más reciente)
    SELECT COUNT(DISTINCT COALESCE(d.version_anterior_id, d.id))
    INTO total_docs
    FROM control_interno.documento d
    WHERE d.auditoria_id = v_auditoria_id
      AND d.version_anterior_id IS NULL; -- Solo contar documentos originales, no versiones

    -- Contar informes totales
    SELECT COUNT(DISTINCT COALESCE(d.version_anterior_id, d.id))
    INTO total_inf
    FROM control_interno.documento d
    WHERE d.auditoria_id = v_auditoria_id
      AND d.tipo_documento IN ('informe_preliminar', 'informe_final', 'informe_ejecutivo')
      AND d.version_anterior_id IS NULL; -- Solo contar informes originales, no versiones

    -- Actualizar la auditoría
    UPDATE control_interno.auditoria
    SET 
        total_documentos = COALESCE(total_docs, 0),
        total_informes = COALESCE(total_inf, 0),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_auditoria_id;

    RETURN COALESCE(NEW, OLD);
EXCEPTION
    WHEN OTHERS THEN
        -- En caso de error, registrar y continuar
        RAISE WARNING 'Error al actualizar contadores de documentos/informes para auditoría %: %', v_auditoria_id, SQLERRM;
        RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: FUNCTION actualizar_contadores_documentos_informes(); Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON FUNCTION control_interno.actualizar_contadores_documentos_informes() IS 'Actualiza automáticamente total_documentos y total_informes en la tabla auditoria cuando se crean, actualizan o eliminan documentos';


--
-- Name: calcular_anos_frecuencia(text); Type: FUNCTION; Schema: control_interno; Owner: -
--

CREATE FUNCTION control_interno.calcular_anos_frecuencia(frecuencia text) RETURNS integer
    LANGUAGE plpgsql
    AS $$
BEGIN
    CASE 
        WHEN LOWER(frecuencia) LIKE '%anual%' THEN RETURN 1;
        WHEN LOWER(frecuencia) LIKE '%bienal%' THEN RETURN 2;
        WHEN LOWER(frecuencia) LIKE '%trienal%' THEN RETURN 3;
        WHEN LOWER(frecuencia) LIKE '%cuatrienal%' THEN RETURN 4;
        ELSE
            -- Intentar extraer número del string (ej: "Cada 2 años")
            BEGIN
                RETURN COALESCE(
                    (SELECT (regexp_match(frecuencia, '\d+'))[1]::INTEGER),
                    1  -- Por defecto anual
                );
            END;
    END CASE;
END;
$$;


--
-- Name: FUNCTION calcular_anos_frecuencia(frecuencia text); Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON FUNCTION control_interno.calcular_anos_frecuencia(frecuencia text) IS 'Calcula el número de años según la frecuencia de auditoría';


--
-- Name: calcular_metricas_auditoria(); Type: FUNCTION; Schema: control_interno; Owner: -
--

CREATE FUNCTION control_interno.calcular_metricas_auditoria() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    dias_totales INTEGER;
    dias_transcurridos INTEGER;
BEGIN
    -- Calcular días restantes
    IF NEW.fecha_fin IS NOT NULL THEN
        NEW.dias_restantes := GREATEST(0, NEW.fecha_fin - CURRENT_DATE);
    ELSE
        NEW.dias_restantes := 0;
    END IF;

    -- Calcular porcentaje de tiempo transcurrido
    IF NEW.fecha_inicio IS NOT NULL AND NEW.fecha_fin IS NOT NULL THEN
        dias_totales := NEW.fecha_fin - NEW.fecha_inicio;
        dias_transcurridos := CURRENT_DATE - NEW.fecha_inicio;
        
        IF dias_totales > 0 THEN
            NEW.porcentaje_tiempo := LEAST(100, GREATEST(0, (dias_transcurridos * 100) / dias_totales));
        ELSE
            NEW.porcentaje_tiempo := 0;
        END IF;
    ELSE
        NEW.porcentaje_tiempo := 0;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        NEW.porcentaje_tiempo := 0;
        NEW.dias_restantes := 0;
        RETURN NEW;
END;
$$;


--
-- Name: FUNCTION calcular_metricas_auditoria(); Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON FUNCTION control_interno.calcular_metricas_auditoria() IS 'Calcula automáticamente días_restantes y porcentaje_tiempo basado en fechas de inicio y fin';


--
-- Name: fn_registrar_cambio_estado_auditoria(); Type: FUNCTION; Schema: control_interno; Owner: -
--

CREATE FUNCTION control_interno.fn_registrar_cambio_estado_auditoria() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    estado_anterior_text TEXT;
    estado_nuevo_text TEXT;
BEGIN
    -- Solo registrar si cambió el estado_kanban
    IF (TG_OP = 'UPDATE' AND OLD.estado_kanban IS DISTINCT FROM NEW.estado_kanban) THEN
        -- Manejar NULL: si estado_anterior es NULL, mostrar "Planeación" (estado inicial por defecto)
        estado_anterior_text := COALESCE(OLD.estado_kanban, 'Planeación');
        estado_nuevo_text := COALESCE(NEW.estado_kanban, '');
        
        INSERT INTO control_interno.historial_auditoria (
            auditoria_id,
            tipo_evento,
            fecha,
            hora,
            usuario_id,
            accion,
            descripcion,
            estado_anterior,
            estado_nuevo,
            cambios
        ) VALUES (
            NEW.id,
            'cambio_estado',
            CURRENT_DATE,
            CURRENT_TIME,
            1, -- Usuario sistema (ajustar si tienes campo updated_by en auditoria)
            'Cambio de estado automático',
            format('Estado cambiado de "%s" a "%s"', estado_anterior_text, estado_nuevo_text),
            estado_anterior_text,
            estado_nuevo_text,
            jsonb_build_array(
                jsonb_build_object(
                    'campo', 'estado_kanban',
                    'valorAnterior', estado_anterior_text,
                    'valorNuevo', estado_nuevo_text
                )
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$;


--
-- Name: FUNCTION fn_registrar_cambio_estado_auditoria(); Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON FUNCTION control_interno.fn_registrar_cambio_estado_auditoria() IS 'Función trigger que registra automáticamente los cambios de estado en historial_auditoria. 
Muestra "Planeación" cuando estado_anterior es NULL para reflejar el estado inicial por defecto.';


--
-- Name: fn_registrar_cambio_estado_plan_anual(); Type: FUNCTION; Schema: control_interno; Owner: -
--

CREATE FUNCTION control_interno.fn_registrar_cambio_estado_plan_anual() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Solo registrar si cambió el estado
    IF (TG_OP = 'UPDATE' AND OLD.estado IS DISTINCT FROM NEW.estado) THEN
        INSERT INTO control_interno.historial_plan_anual (
            plan_id,
            tipo_evento,
            fecha,
            hora,
            usuario_id,
            accion,
            descripcion,
            estado_anterior,
            estado_nuevo,
            cambios
        ) VALUES (
            NEW.id,
            'cambio_estado',
            CURRENT_DATE,
            CURRENT_TIME,
            COALESCE(NEW.updated_by, 1), -- Usuario que hizo el cambio (ajustar según tu lógica)
            'Cambio de estado automático',
            format('Estado cambiado de "%s" a "%s"', OLD.estado, NEW.estado),
            OLD.estado,
            NEW.estado,
            jsonb_build_array(
                jsonb_build_object(
                    'campo', 'estado',
                    'valorAnterior', OLD.estado,
                    'valorNuevo', NEW.estado
                )
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$;


--
-- Name: FUNCTION fn_registrar_cambio_estado_plan_anual(); Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON FUNCTION control_interno.fn_registrar_cambio_estado_plan_anual() IS 'Función trigger que registra automáticamente los cambios de estado en historial_plan_anual';


--
-- Name: generar_codigo_evidencia(); Type: FUNCTION; Schema: control_interno; Owner: -
--

CREATE FUNCTION control_interno.generar_codigo_evidencia() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    año_actual INTEGER;
    secuencia INTEGER;
    nuevo_codigo VARCHAR(50);
BEGIN
    año_actual := EXTRACT(YEAR FROM CURRENT_DATE);
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(codigo FROM 'EVD-\d{4}-(\d+)') AS INTEGER)), 0) + 1
    INTO secuencia
    FROM control_interno.evidencia_documento
    WHERE codigo LIKE 'EVD-' || año_actual || '-%';
    
    nuevo_codigo := 'EVD-' || año_actual || '-' || LPAD(secuencia::TEXT, 4, '0');
    NEW.codigo := nuevo_codigo;
    RETURN NEW;
END;
$$;


--
-- Name: registrar_evento_timeline(uuid, control_interno.tipo_evento_timeline, text, uuid, character varying, jsonb); Type: FUNCTION; Schema: control_interno; Owner: -
--

CREATE FUNCTION control_interno.registrar_evento_timeline(p_plan_id uuid, p_tipo control_interno.tipo_evento_timeline, p_descripcion text, p_usuario_id uuid DEFAULT NULL::uuid, p_usuario_nombre character varying DEFAULT NULL::character varying, p_metadata jsonb DEFAULT NULL::jsonb) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_evento_id UUID;
BEGIN
    INSERT INTO control_interno.eventos_timeline (
        plan_mejoramiento_id,
        tipo,
        descripcion,
        usuario_id,
        usuario_nombre,
        metadata
    ) VALUES (
        p_plan_id,
        p_tipo,
        p_descripcion,
        p_usuario_id,
        p_usuario_nombre,
        p_metadata
    ) RETURNING id INTO v_evento_id;
    
    RETURN v_evento_id;
END;
$$;


--
-- Name: FUNCTION registrar_evento_timeline(p_plan_id uuid, p_tipo control_interno.tipo_evento_timeline, p_descripcion text, p_usuario_id uuid, p_usuario_nombre character varying, p_metadata jsonb); Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON FUNCTION control_interno.registrar_evento_timeline(p_plan_id uuid, p_tipo control_interno.tipo_evento_timeline, p_descripcion text, p_usuario_id uuid, p_usuario_nombre character varying, p_metadata jsonb) IS 'Función auxiliar para registrar eventos en el timeline de forma consistente';


--
-- Name: trigger_evento_actualizacion_accion(); Type: FUNCTION; Schema: control_interno; Owner: -
--

CREATE FUNCTION control_interno.trigger_evento_actualizacion_accion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_tipo control_interno.tipo_evento_timeline;
    v_descripcion TEXT;
    v_metadata JSONB;
BEGIN
    -- Determinar el tipo de evento según lo que cambió
    IF OLD.porcentaje_avance IS DISTINCT FROM NEW.porcentaje_avance THEN
        v_tipo := 'PROGRESO'::control_interno.tipo_evento_timeline;
        v_descripcion := 'Progreso actualizado: ' || OLD.porcentaje_avance || '% → ' || NEW.porcentaje_avance || '%';
        v_metadata := jsonb_build_object(
            'accion_id', NEW.id,
            'hallazgo_id', NEW.hallazgo_id,
            'progreso_anterior', OLD.porcentaje_avance,
            'progreso_nuevo', NEW.porcentaje_avance
        );
        
        -- Si llegó a 100%, es una completación
        IF NEW.porcentaje_avance = 100 AND OLD.porcentaje_avance < 100 THEN
            v_tipo := 'COMPLETADA'::control_interno.tipo_evento_timeline;
            v_descripcion := 'Acción completada: ' || SUBSTRING(NEW.descripcion, 1, 100) ||
                           CASE WHEN LENGTH(NEW.descripcion) > 100 THEN '...' ELSE '' END;
        END IF;
        
    ELSIF OLD.estado IS DISTINCT FROM NEW.estado THEN
        v_tipo := 'ESTADO'::control_interno.tipo_evento_timeline;
        v_descripcion := 'Estado de acción actualizado: ' || OLD.estado || ' → ' || NEW.estado;
        v_metadata := jsonb_build_object(
            'accion_id', NEW.id,
            'hallazgo_id', NEW.hallazgo_id,
            'estado_anterior', OLD.estado,
            'estado_nuevo', NEW.estado
        );
        
    ELSE
        v_tipo := 'ACTUALIZACION'::control_interno.tipo_evento_timeline;
        v_descripcion := 'Acción actualizada: ' || SUBSTRING(NEW.descripcion, 1, 100) ||
                       CASE WHEN LENGTH(NEW.descripcion) > 100 THEN '...' ELSE '' END;
        v_metadata := jsonb_build_object(
            'accion_id', NEW.id,
            'hallazgo_id', NEW.hallazgo_id
        );
    END IF;
    
    PERFORM control_interno.registrar_evento_timeline(
        NEW.plan_id,
        v_tipo,
        v_descripcion,
        NULL,  -- responsable_id no existe en accion_correctiva
        NEW.responsable,  -- usar el campo responsable que es varchar
        v_metadata
    );
    
    RETURN NEW;
END;
$$;


--
-- Name: trigger_evento_actualizacion_plan(); Type: FUNCTION; Schema: control_interno; Owner: -
--

CREATE FUNCTION control_interno.trigger_evento_actualizacion_plan() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Solo registrar si cambió el estado
    IF OLD.estado IS DISTINCT FROM NEW.estado THEN
        PERFORM control_interno.registrar_evento_timeline(
            NEW.id,
            CASE 
                WHEN NEW.estado = 'aprobado' THEN 'APROBACION'::control_interno.tipo_evento_timeline
                ELSE 'ESTADO'::control_interno.tipo_evento_timeline
            END,
            CASE 
                WHEN NEW.estado = 'aprobado' THEN 'Plan de mejoramiento aprobado'
                ELSE 'Estado del plan actualizado: ' || OLD.estado || ' → ' || NEW.estado
            END,
            NULL,  -- responsable_id no existe en plan_mejoramiento
            COALESCE(NEW.aprobado_por, NEW.responsable_implementacion),  -- usar aprobado_por si es aprobación, sino responsable_implementacion
            jsonb_build_object(
                'estado_anterior', OLD.estado,
                'estado_nuevo', NEW.estado,
                'fecha_cambio', NOW()
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$;


--
-- Name: trigger_evento_creacion_accion(); Type: FUNCTION; Schema: control_interno; Owner: -
--

CREATE FUNCTION control_interno.trigger_evento_creacion_accion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    PERFORM control_interno.registrar_evento_timeline(
        NEW.plan_id,
        'CREACION'::control_interno.tipo_evento_timeline,
        'Nueva acción creada: ' || SUBSTRING(NEW.descripcion, 1, 100) || 
        CASE WHEN LENGTH(NEW.descripcion) > 100 THEN '...' ELSE '' END,
        NULL,  -- responsable_id no existe en accion_correctiva
        NEW.responsable,  -- usar el campo responsable que es varchar
        jsonb_build_object(
            'accion_id', NEW.id,
            'hallazgo_id', NEW.hallazgo_id,
            'estado', NEW.estado,
            'progreso', NEW.porcentaje_avance
        )
    );
    
    RETURN NEW;
END;
$$;


--
-- Name: trigger_evento_creacion_plan(); Type: FUNCTION; Schema: control_interno; Owner: -
--

CREATE FUNCTION control_interno.trigger_evento_creacion_plan() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    PERFORM control_interno.registrar_evento_timeline(
        NEW.id,
        'CREACION'::control_interno.tipo_evento_timeline,
        'Plan de mejoramiento creado',
        NULL,  -- responsable_id no existe en plan_mejoramiento
        NEW.responsable_implementacion,  -- usar responsable_implementacion
        jsonb_build_object(
            'estado_inicial', NEW.estado,
            'fecha_limite', NEW.fecha_limite,
            'area_responsable', NEW.area_responsable
        )
    );
    
    RETURN NEW;
END;
$$;


--
-- Name: update_ampliacion_plazo_timestamp(); Type: FUNCTION; Schema: control_interno; Owner: -
--

CREATE FUNCTION control_interno.update_ampliacion_plazo_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_lista_chequeo_updated_at(); Type: FUNCTION; Schema: control_interno; Owner: -
--

CREATE FUNCTION control_interno.update_lista_chequeo_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_tipo_auditoria_updated_at(); Type: FUNCTION; Schema: control_interno; Owner: -
--

CREATE FUNCTION control_interno.update_tipo_auditoria_updated_at() RETURNS trigger
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
-- Name: accion_correctiva; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.accion_correctiva (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_id uuid NOT NULL,
    descripcion text NOT NULL,
    tipo character varying(50) DEFAULT 'correctiva'::character varying NOT NULL,
    responsable character varying(255) NOT NULL,
    fecha_inicio date NOT NULL,
    fecha_fin date NOT NULL,
    recursos text,
    indicador character varying(500),
    meta_indicador character varying(500),
    estado character varying(50) DEFAULT 'programada'::character varying NOT NULL,
    porcentaje_avance integer DEFAULT 0,
    observaciones text,
    evidencias jsonb DEFAULT '[]'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    hallazgo_id uuid,
    CONSTRAINT accion_correctiva_estado_check CHECK (((estado)::text = ANY ((ARRAY['programada'::character varying, 'en-progreso'::character varying, 'implementada'::character varying, 'vencida'::character varying, 'completada'::character varying])::text[]))),
    CONSTRAINT accion_correctiva_porcentaje_avance_check CHECK (((porcentaje_avance >= 0) AND (porcentaje_avance <= 100))),
    CONSTRAINT accion_correctiva_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['correctiva'::character varying, 'preventiva'::character varying, 'mejora'::character varying])::text[])))
);


--
-- Name: COLUMN accion_correctiva.hallazgo_id; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.accion_correctiva.hallazgo_id IS 'ID del hallazgo al que está vinculada esta acción correctiva (opcional)';


--
-- Name: accion_mejora; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.accion_mejora (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    numero integer NOT NULL,
    descripcion text NOT NULL,
    tipo character varying(50) NOT NULL,
    responsable character varying(255) NOT NULL,
    fecha_inicio date NOT NULL,
    fecha_fin date NOT NULL,
    estado character varying(50) NOT NULL,
    avance integer NOT NULL,
    evidencias jsonb NOT NULL,
    observaciones text,
    plan_mejoramiento_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT accion_mejora_estado_check CHECK (((estado)::text = ANY ((ARRAY['pendiente'::character varying, 'en_progreso'::character varying, 'completada'::character varying, 'vencida'::character varying])::text[]))),
    CONSTRAINT accion_mejora_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['correctiva'::character varying, 'preventiva'::character varying, 'mejora'::character varying])::text[])))
);


--
-- Name: TABLE accion_mejora; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.accion_mejora IS 'Acciones de mejora dentro de un plan';


--
-- Name: actividad_etapa_auditoria; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.actividad_etapa_auditoria (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    etapa_id uuid NOT NULL,
    nombre character varying(500) NOT NULL,
    descripcion text,
    tipo character varying(100) NOT NULL,
    estado character varying(50) DEFAULT 'pendiente'::character varying NOT NULL,
    responsable character varying(255),
    fecha_limite date,
    completada boolean DEFAULT false,
    fecha_completacion timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT actividad_etapa_auditoria_estado_check CHECK (((estado)::text = ANY ((ARRAY['pendiente'::character varying, 'en-progreso'::character varying, 'completada'::character varying])::text[])))
);


--
-- Name: TABLE actividad_etapa_auditoria; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.actividad_etapa_auditoria IS 'Actividades dentro de cada etapa de auditoría';


--
-- Name: actividad_plan_anual_5; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.actividad_plan_anual_5 (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rol_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    nombre character varying(500) NOT NULL,
    descripcion text,
    responsable character varying(255) NOT NULL,
    fecha_inicio date NOT NULL,
    fecha_fin date NOT NULL,
    estado character varying(50) DEFAULT 'pendiente'::character varying NOT NULL,
    porcentaje_avance integer DEFAULT 0,
    observaciones text,
    prioridad character varying(20) DEFAULT 'Media'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT actividad_plan_anual_5_estado_check CHECK (((estado)::text = ANY ((ARRAY['pendiente'::character varying, 'en-progreso'::character varying, 'completada'::character varying, 'retrasada'::character varying])::text[]))),
    CONSTRAINT actividad_plan_anual_5_porcentaje_avance_check CHECK (((porcentaje_avance >= 0) AND (porcentaje_avance <= 100))),
    CONSTRAINT actividad_plan_anual_5_prioridad_check CHECK (((prioridad)::text = ANY ((ARRAY['Alta'::character varying, 'Media'::character varying, 'Baja'::character varying])::text[])))
);


--
-- Name: TABLE actividad_plan_anual_5; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.actividad_plan_anual_5 IS 'Actividades por rol del plan anual';


--
-- Name: actividad_proceso_auditoria; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.actividad_proceso_auditoria (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    auditoria_id uuid NOT NULL,
    fase character varying(50) NOT NULL,
    nombre character varying(255) NOT NULL,
    descripcion text,
    orden integer NOT NULL,
    estado character varying(50) DEFAULT 'pendiente'::character varying NOT NULL,
    fecha_limite date,
    fecha_completacion timestamp without time zone,
    completada_por_id bigint,
    observaciones text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT actividad_proceso_auditoria_estado_check CHECK (((estado)::text = ANY ((ARRAY['pendiente'::character varying, 'en-progreso'::character varying, 'completada'::character varying])::text[]))),
    CONSTRAINT actividad_proceso_auditoria_fase_check CHECK (((fase)::text = ANY ((ARRAY['Planeación'::character varying, 'Ejecución'::character varying, 'Comunicación'::character varying, 'Seguimiento'::character varying])::text[]))),
    CONSTRAINT actividad_proceso_auditoria_orden_check CHECK (((orden >= 1) AND (orden <= 3)))
);


--
-- Name: TABLE actividad_proceso_auditoria; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.actividad_proceso_auditoria IS 'Actividades del proceso de auditoría. Cada fase tiene hasta 3 actividades requeridas para avanzar.';


--
-- Name: actividad_rol; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.actividad_rol (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rol_id uuid NOT NULL,
    nombre character varying(255) NOT NULL,
    descripcion text,
    orden integer DEFAULT 0,
    activa boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE actividad_rol; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.actividad_rol IS 'Actividades por rol configurable (RF020)';


--
-- Name: ampliacion_plazo; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.ampliacion_plazo (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    auditoria_id uuid NOT NULL,
    fecha_fin_original date NOT NULL,
    fecha_fin_solicitada date NOT NULL,
    fecha_solicitud timestamp without time zone DEFAULT now() NOT NULL,
    fecha_respuesta timestamp without time zone,
    estado character varying(20) DEFAULT 'pendiente'::character varying NOT NULL,
    justificacion text NOT NULL,
    motivo_rechazo text,
    comentarios text,
    solicitado_por character varying(100) NOT NULL,
    aprobado_rechazado_por character varying(100),
    dias_ampliacion integer GENERATED ALWAYS AS ((fecha_fin_solicitada - fecha_fin_original)) STORED,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT ampliacion_plazo_estado_check CHECK (((estado)::text = ANY ((ARRAY['pendiente'::character varying, 'aprobada'::character varying, 'rechazada'::character varying])::text[])))
);


--
-- Name: TABLE ampliacion_plazo; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.ampliacion_plazo IS 'Solicitudes de ampliación de plazo de auditorías';


--
-- Name: COLUMN ampliacion_plazo.estado; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.ampliacion_plazo.estado IS 'Estados: pendiente, aprobada, rechazada';


--
-- Name: COLUMN ampliacion_plazo.dias_ampliacion; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.ampliacion_plazo.dias_ampliacion IS 'Días de ampliación solicitados (calculado automáticamente)';


--
-- Name: aprobacion; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.aprobacion (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codigo character varying(255),
    tipo character varying(100),
    titulo character varying(500),
    descripcion text,
    solicitante character varying(255),
    fecha_solicitud date DEFAULT CURRENT_DATE,
    prioridad character varying(20) DEFAULT 'Media'::character varying NOT NULL,
    estado character varying(50) DEFAULT 'pendiente'::character varying NOT NULL,
    territorial character varying(255),
    sede character varying(255),
    relacionado character varying(255),
    documentos_count integer DEFAULT 0,
    aprobado_por character varying(255),
    fecha_aprobacion timestamp without time zone,
    rechazado_por character varying(255),
    fecha_rechazo timestamp without time zone,
    motivo_rechazo text,
    observaciones text,
    area character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT aprobacion_estado_check CHECK (((estado)::text = ANY ((ARRAY['pendiente'::character varying, 'aprobado'::character varying, 'rechazado'::character varying, 'en-revision'::character varying])::text[]))),
    CONSTRAINT aprobacion_prioridad_check CHECK (((prioridad)::text = ANY ((ARRAY['Alta'::character varying, 'Media'::character varying, 'Baja'::character varying])::text[]))),
    CONSTRAINT aprobacion_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['plan-auditoria'::character varying, 'plan-mejora'::character varying, 'informe'::character varying, 'documento'::character varying])::text[])))
);


--
-- Name: TABLE aprobacion; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.aprobacion IS 'Sistema de aprobaciones centralizado';


--
-- Name: auditor_perfil; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.auditor_perfil (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    persona_id bigint NOT NULL,
    especialidad character varying(255),
    cargo character varying(100),
    nivel_experiencia character varying(50),
    estado_disponibilidad character varying(50) DEFAULT 'Disponible'::character varying,
    fecha_ultima_actividad date,
    observaciones text,
    activo boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT auditor_perfil_estado_disponibilidad_check CHECK (((estado_disponibilidad)::text = ANY ((ARRAY['Disponible'::character varying, 'Parcial'::character varying, 'No disponible'::character varying, 'En licencia'::character varying])::text[]))),
    CONSTRAINT auditor_perfil_nivel_experiencia_check CHECK (((nivel_experiencia)::text = ANY ((ARRAY['Junior'::character varying, 'Intermedio'::character varying, 'Senior'::character varying, 'Líder'::character varying, 'Jefe'::character varying])::text[])))
);


--
-- Name: TABLE auditor_perfil; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.auditor_perfil IS 'Perfil profesional de auditores. Almacena información específica como especialidades y disponibilidad.';


--
-- Name: COLUMN auditor_perfil.especialidad; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.auditor_perfil.especialidad IS 'Especialidad del auditor (ej: Auditoría Financiera, Control Interno, Gestión Administrativa)';


--
-- Name: COLUMN auditor_perfil.estado_disponibilidad; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.auditor_perfil.estado_disponibilidad IS 'Estado de disponibilidad: Disponible, Parcial, No disponible, En licencia';


--
-- Name: auditoria; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.auditoria (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codigo character varying(255) NOT NULL,
    nombre character varying(500) NOT NULL,
    tipo character varying(50) NOT NULL,
    fase character varying(50) DEFAULT 'planeacion'::character varying NOT NULL,
    territorial character varying(255) NOT NULL,
    sede character varying(255) NOT NULL,
    responsable character varying(255) NOT NULL,
    fecha_inicio date NOT NULL,
    fecha_fin date NOT NULL,
    progreso integer DEFAULT 0,
    prioridad character varying(20) DEFAULT 'Media'::character varying NOT NULL,
    hallazgos integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    estado_kanban character varying(50),
    semaforo character varying(20) DEFAULT 'verde'::character varying,
    tipo_kanban character varying(50) DEFAULT 'regular'::character varying,
    prioridad_kanban character varying(20) DEFAULT 'media'::character varying,
    area_objetivo character varying(255),
    permite_cambiar_objetivos boolean DEFAULT true,
    descripcion text,
    alcance text,
    proceso_auditado character varying(500),
    responsable_area_nombre character varying(255),
    responsable_area_cargo character varying(255),
    responsable_area_email character varying(255),
    supervisor_asignado_id bigint,
    fecha_reunion_apertura timestamp without time zone,
    metodologia text,
    periodicidad character varying(20) DEFAULT 'unica'::character varying,
    presupuesto_estimado numeric(15,2),
    vinculada_plan_anual boolean DEFAULT false,
    plan_anual_id uuid,
    plan_anual_ano integer,
    rol_decreto_asociado character varying(255),
    observaciones_adicionales text,
    checklist_completados jsonb,
    archivada boolean DEFAULT false,
    fecha_archivo timestamp without time zone,
    activa boolean DEFAULT true,
    fecha_eliminacion timestamp without time zone,
    riesgo_kanban character varying(20),
    calificacion_riesgo character varying(255),
    ultima_actuacion text,
    dias_restantes integer DEFAULT 0,
    porcentaje_tiempo integer DEFAULT 0,
    total_documentos integer DEFAULT 0,
    total_informes integer DEFAULT 0,
    total_tareas integer DEFAULT 0,
    actividades_completas boolean DEFAULT false,
    actividades_pendientes integer DEFAULT 0,
    auditor_lider_id bigint,
    auditor_asignado_id bigint,
    programa_anual_metadata jsonb,
    aprobada boolean DEFAULT false NOT NULL,
    fecha_aprobacion timestamp without time zone,
    aprobada_por character varying(255),
    aprobada_por_id bigint,
    CONSTRAINT auditoria_actividades_pendientes_check CHECK (((actividades_pendientes >= 0) AND (actividades_pendientes <= 3))),
    CONSTRAINT auditoria_estado_kanban_check CHECK (((estado_kanban)::text = ANY ((ARRAY['Planeación'::character varying, 'Ejecución'::character varying, 'Comunicación'::character varying, 'Seguimiento'::character varying, 'Finalizada'::character varying])::text[]))),
    CONSTRAINT auditoria_fase_check CHECK (((fase)::text = ANY ((ARRAY['planeacion'::character varying, 'en-curso'::character varying, 'revision'::character varying, 'completada'::character varying])::text[]))),
    CONSTRAINT auditoria_hallazgos_check CHECK ((hallazgos >= 0)),
    CONSTRAINT auditoria_periodicidad_check CHECK (((periodicidad)::text = ANY ((ARRAY['unica'::character varying, 'trimestral'::character varying, 'semestral'::character varying, 'anual'::character varying])::text[]))),
    CONSTRAINT auditoria_porcentaje_tiempo_check CHECK (((porcentaje_tiempo >= 0) AND (porcentaje_tiempo <= 100))),
    CONSTRAINT auditoria_prioridad_check CHECK (((prioridad)::text = ANY ((ARRAY['Alta'::character varying, 'Media'::character varying, 'Baja'::character varying])::text[]))),
    CONSTRAINT auditoria_prioridad_kanban_check CHECK (((prioridad_kanban)::text = ANY ((ARRAY['crítica'::character varying, 'alta'::character varying, 'media'::character varying, 'baja'::character varying])::text[]))),
    CONSTRAINT auditoria_progreso_check CHECK (((progreso >= 0) AND (progreso <= 100))),
    CONSTRAINT auditoria_riesgo_kanban_check CHECK (((riesgo_kanban)::text = ANY ((ARRAY['Alto'::character varying, 'Medio'::character varying, 'Bajo'::character varying])::text[]))),
    CONSTRAINT auditoria_semaforo_check CHECK (((semaforo)::text = ANY ((ARRAY['verde'::character varying, 'amarillo'::character varying, 'rojo'::character varying])::text[]))),
    CONSTRAINT auditoria_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['Gestión'::character varying, 'Control Interno'::character varying, 'Académica'::character varying, 'RRHH'::character varying, 'Financiera'::character varying, 'TI'::character varying, 'Cumplimiento'::character varying, 'Operacional'::character varying, 'Regular'::character varying, 'Territorial'::character varying, 'Especial'::character varying])::text[]))),
    CONSTRAINT auditoria_tipo_kanban_check CHECK (((tipo_kanban)::text = ANY ((ARRAY['regular'::character varying, 'territorial'::character varying, 'especial'::character varying])::text[])))
);


--
-- Name: TABLE auditoria; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.auditoria IS 'Auditorías del sistema con gestión Kanban, Lista y Calendario';


--
-- Name: COLUMN auditoria.fase; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.auditoria.fase IS 'Fase actual de la auditoría (planeacion, en-curso, revision, completada)';


--
-- Name: COLUMN auditoria.sede; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.auditoria.sede IS 'Sede donde se realiza la auditoría';


--
-- Name: COLUMN auditoria.responsable; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.auditoria.responsable IS 'Responsable de la auditoría';


--
-- Name: COLUMN auditoria.estado_kanban; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.auditoria.estado_kanban IS 'Estado de la auditoría en el Kanban';


--
-- Name: COLUMN auditoria.descripcion; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.auditoria.descripcion IS 'Descripción detallada de la auditoría';


--
-- Name: COLUMN auditoria.supervisor_asignado_id; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.auditoria.supervisor_asignado_id IS 'ID del supervisor asignado (FK a auth.personas)';


--
-- Name: COLUMN auditoria.checklist_completados; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.auditoria.checklist_completados IS 'Estado de los checkboxes de actividades de auditoría. Formato: {"ep1": true, "ep2": false, ...}';


--
-- Name: COLUMN auditoria.activa; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.auditoria.activa IS 'Indica si la auditoría está activa';


--
-- Name: COLUMN auditoria.calificacion_riesgo; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.auditoria.calificacion_riesgo IS 'Calificación del riesgo de la auditoría (ampliado a 255 caracteres)';


--
-- Name: COLUMN auditoria.auditor_lider_id; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.auditoria.auditor_lider_id IS 'ID del auditor líder (FK a auth.personas)';


--
-- Name: COLUMN auditoria.auditor_asignado_id; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.auditoria.auditor_asignado_id IS 'ID del auditor asignado (FK a auth.personas)';


--
-- Name: COLUMN auditoria.programa_anual_metadata; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.auditoria.programa_anual_metadata IS 'Metadata del programa anual: { "mesInicio": 0-11, "semanaInicio": 1-4, "duraciones": { "planeacion": number, "ejecucion": number, "comunicacion": number } }';


--
-- Name: COLUMN auditoria.aprobada; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.auditoria.aprobada IS 'Indica si la auditoría fue aprobada por el Jefe de Control Interno';


--
-- Name: COLUMN auditoria.fecha_aprobacion; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.auditoria.fecha_aprobacion IS 'Fecha y hora en que la auditoría fue aprobada';


--
-- Name: COLUMN auditoria.aprobada_por; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.auditoria.aprobada_por IS 'Nombre completo del usuario que aprobó la auditoría';


--
-- Name: COLUMN auditoria.aprobada_por_id; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.auditoria.aprobada_por_id IS 'ID del usuario que aprobó la auditoría (referencia a auth.personas)';


--
-- Name: auditoria_especial_info; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.auditoria_especial_info (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    auditoria_id uuid NOT NULL,
    tipo_motivo character varying(100) NOT NULL,
    solicitante character varying(255) NOT NULL,
    justificacion text NOT NULL,
    fecha_solicitud date,
    fecha_aprobacion date,
    aprobado_por_id bigint,
    observaciones text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT auditoria_especial_info_tipo_motivo_check CHECK (((tipo_motivo)::text = ANY ((ARRAY['denuncia'::character varying, 'ente_control'::character varying, 'emergencia'::character varying, 'seguimiento_urgente'::character varying, 'revision_especifica'::character varying, 'solicitud_ente_control'::character varying, 'otro'::character varying])::text[])))
);


--
-- Name: TABLE auditoria_especial_info; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.auditoria_especial_info IS 'Información específica de auditorías especiales (motivo, solicitante, justificación).';


--
-- Name: auditoria_gestion; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.auditoria_gestion (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codigo character varying(255) NOT NULL,
    nombre character varying(500) NOT NULL,
    tipo character varying(100) NOT NULL,
    fase character varying(50) DEFAULT 'planeacion'::character varying NOT NULL,
    territorial character varying(255),
    sede character varying(255),
    responsable character varying(255) NOT NULL,
    fecha_inicio date NOT NULL,
    fecha_fin date NOT NULL,
    progreso integer DEFAULT 0,
    prioridad character varying(20) DEFAULT 'Media'::character varying NOT NULL,
    hallazgos_count integer DEFAULT 0,
    auditoria_programada_id uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT auditoria_gestion_fase_check CHECK (((fase)::text = ANY ((ARRAY['planeacion'::character varying, 'en-curso'::character varying, 'revision'::character varying, 'completada'::character varying])::text[]))),
    CONSTRAINT auditoria_gestion_prioridad_check CHECK (((prioridad)::text = ANY ((ARRAY['Alta'::character varying, 'Media'::character varying, 'Baja'::character varying])::text[]))),
    CONSTRAINT auditoria_gestion_progreso_check CHECK (((progreso >= 0) AND (progreso <= 100)))
);


--
-- Name: TABLE auditoria_gestion; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.auditoria_gestion IS 'Gestión de auditorías con fases y seguimiento';


--
-- Name: auditoria_programada; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.auditoria_programada (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codigo character varying(255) NOT NULL,
    nombre character varying(255) NOT NULL,
    proceso_id uuid NOT NULL,
    proceso_codigo character varying(255) NOT NULL,
    proceso_nombre character varying(255) NOT NULL,
    tipo character varying(50) NOT NULL,
    alcance text NOT NULL,
    proceso_auditar character varying(255) NOT NULL,
    auditor_lider character varying(255) NOT NULL,
    equipo_auditor jsonb NOT NULL,
    fecha_inicio_planeada date NOT NULL,
    fecha_fin_planeada date NOT NULL,
    duracion_dias integer NOT NULL,
    prioridad character varying(20) NOT NULL,
    riesgo_inherente character varying(20) NOT NULL,
    estado character varying(50) NOT NULL,
    es_territorial boolean DEFAULT false,
    territorial character varying(255),
    es_especial boolean DEFAULT false,
    solicitada_por character varying(255),
    motivo_especial text,
    etapas jsonb NOT NULL,
    ampliaciones jsonb,
    fecha_limite_original date NOT NULL,
    fecha_limite_actual date NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT auditoria_programada_estado_check CHECK (((estado)::text = ANY ((ARRAY['planeada'::character varying, 'en_curso'::character varying, 'completada'::character varying, 'cancelada'::character varying])::text[]))),
    CONSTRAINT auditoria_programada_prioridad_check CHECK (((prioridad)::text = ANY ((ARRAY['alta'::character varying, 'media'::character varying, 'baja'::character varying])::text[]))),
    CONSTRAINT auditoria_programada_riesgo_inherente_check CHECK (((riesgo_inherente)::text = ANY ((ARRAY['alto'::character varying, 'medio'::character varying, 'bajo'::character varying])::text[]))),
    CONSTRAINT auditoria_programada_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['gestion'::character varying, 'cumplimiento'::character varying, 'financiera'::character varying, 'tic'::character varying, 'desempeno'::character varying])::text[])))
);


--
-- Name: TABLE auditoria_programada; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.auditoria_programada IS 'Auditorías programadas en el plan anual';


--
-- Name: auditoria_territorial_info; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.auditoria_territorial_info (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    auditoria_id uuid NOT NULL,
    nombre character varying(255) NOT NULL,
    ciudad character varying(255) NOT NULL,
    departamento character varying(255) NOT NULL,
    direccion text,
    contacto_nombre character varying(255),
    contacto_email character varying(255),
    contacto_telefono character varying(20),
    observaciones text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE auditoria_territorial_info; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.auditoria_territorial_info IS 'Información específica de auditorías territoriales (ciudad, departamento, contacto).';


--
-- Name: cache_esap; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.cache_esap (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clave character varying(500) NOT NULL,
    valor jsonb NOT NULL,
    fecha_expiracion timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE cache_esap; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.cache_esap IS 'Cache del sistema ESAP';


--
-- Name: configuracion_esap; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.configuracion_esap (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clave character varying(255) NOT NULL,
    valor text NOT NULL,
    descripcion text,
    tipo character varying(50) DEFAULT 'string'::character varying,
    categoria character varying(255),
    activo boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT configuracion_esap_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['string'::character varying, 'number'::character varying, 'boolean'::character varying, 'json'::character varying])::text[])))
);


--
-- Name: TABLE configuracion_esap; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.configuracion_esap IS 'Configuraciones específicas del sistema ESAP';


--
-- Name: criterio_auditoria; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.criterio_auditoria (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    auditoria_id uuid NOT NULL,
    criterio text NOT NULL,
    orden integer DEFAULT 0,
    activo boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE criterio_auditoria; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.criterio_auditoria IS 'Criterios de auditoría (normas, políticas, estándares aplicables)';


--
-- Name: cronograma_auditoria; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.cronograma_auditoria (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_id uuid NOT NULL,
    codigo character varying(255) NOT NULL,
    nombre character varying(255) NOT NULL,
    proceso character varying(255) NOT NULL,
    nivel_riesgo character varying(20),
    trimestre character varying(10) NOT NULL,
    fecha_inicio date NOT NULL,
    fecha_fin date NOT NULL,
    auditor_responsable character varying(255),
    horas_estimadas integer NOT NULL,
    estado character varying(50) DEFAULT 'planificado'::character varying,
    es_territorial boolean DEFAULT false,
    territorial character varying(255),
    es_especial boolean DEFAULT false,
    equipo jsonb,
    etapas_cronograma jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT cronograma_auditoria_estado_check CHECK (((estado)::text = ANY ((ARRAY['planificado'::character varying, 'en-ejecucion'::character varying, 'completada'::character varying, 'cancelada'::character varying, 'en-revision'::character varying])::text[]))),
    CONSTRAINT cronograma_auditoria_nivel_riesgo_check CHECK (((nivel_riesgo)::text = ANY ((ARRAY['Alto'::character varying, 'Medio'::character varying, 'Bajo'::character varying])::text[])))
);


--
-- Name: TABLE cronograma_auditoria; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.cronograma_auditoria IS 'Cronograma de auditorías del plan anual';


--
-- Name: cronograma_fase_auditoria; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.cronograma_fase_auditoria (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    auditoria_id uuid NOT NULL,
    fase character varying(50) NOT NULL,
    fecha_inicio date NOT NULL,
    fecha_fin date NOT NULL,
    dias_estimados integer NOT NULL,
    observaciones text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT cronograma_fase_auditoria_fase_check CHECK (((fase)::text = ANY ((ARRAY['Planeación'::character varying, 'Ejecución'::character varying, 'Comunicación'::character varying, 'Seguimiento'::character varying])::text[])))
);


--
-- Name: TABLE cronograma_fase_auditoria; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.cronograma_fase_auditoria IS 'Cronograma estimado por fase de la auditoría (duración de cada fase)';


--
-- Name: datos_automaticos_informe; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.datos_automaticos_informe (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entrega_id uuid NOT NULL,
    tipo_dato character varying(100) NOT NULL,
    datos jsonb DEFAULT '{}'::jsonb NOT NULL,
    fecha_generacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    fuente_datos character varying(255),
    version_datos character varying(50) DEFAULT '1.0'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE datos_automaticos_informe; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.datos_automaticos_informe IS 'Datos automáticos poblados desde el sistema (US-022)';


--
-- Name: COLUMN datos_automaticos_informe.datos; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.datos_automaticos_informe.datos IS 'JSON con los datos estructurados según el tipo de dato';


--
-- Name: documento; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.documento (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre character varying(255) NOT NULL,
    descripcion text,
    tipo_documento character varying(100) NOT NULL,
    etapa character varying(50),
    auditoria_id uuid,
    hallazgo_id uuid,
    plan_mejoramiento_id uuid,
    ruta_archivo character varying(500) NOT NULL,
    nombre_archivo character varying(255) NOT NULL,
    tipo_mime character varying(100) NOT NULL,
    tamanio_bytes bigint NOT NULL,
    version integer DEFAULT 1,
    version_anterior_id uuid,
    subido_por character varying(255) NOT NULL,
    hash_archivo character varying(255),
    comprimido boolean DEFAULT false,
    ruta_servidor_g character varying(500),
    sincronizado_servidor_g boolean DEFAULT false,
    fecha_sincronizacion timestamp without time zone,
    tipo_reporte character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT documento_etapa_check CHECK (((etapa)::text = ANY ((ARRAY['planeacion'::character varying, 'ejecucion'::character varying, 'comunicacion'::character varying])::text[]))),
    CONSTRAINT documento_tipo_documento_check CHECK (((tipo_documento)::text = ANY ((ARRAY['oficio_anuncio'::character varying, 'carta_representacion'::character varying, 'carta_compromiso'::character varying, 'programa_individual'::character varying, 'acta_reunion_apertura'::character varying, 'acta_reunion_cierre'::character varying, 'lista_chequeo'::character varying, 'evidencia_hallazgo'::character varying, 'informe_preliminar'::character varying, 'informe_final'::character varying, 'informe_ejecutivo'::character varying, 'evidencia_plan_mejoramiento'::character varying, 'otro'::character varying])::text[]))),
    CONSTRAINT documento_tipo_reporte_check CHECK (((tipo_reporte)::text = ANY ((ARRAY['plan-anual'::character varying, 'informe-auditoria'::character varying, 'plan-mejora'::character varying, 'acta-apertura'::character varying, 'acta-cierre'::character varying, 'matriz-hallazgos'::character varying, 'reporte-ejecutivo'::character varying, 'reporte-territorial'::character varying, 'reporte-gravedad'::character varying, 'reporte-cumplimiento'::character varying, 'otro'::character varying])::text[])))
);


--
-- Name: TABLE documento; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.documento IS 'Gestión documental centralizada (RF013)';


--
-- Name: documento_aprobacion; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.documento_aprobacion (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    aprobacion_id uuid NOT NULL,
    documento_id uuid,
    nombre_archivo character varying(255) NOT NULL,
    ruta_archivo character varying(500),
    tipo_mime character varying(100),
    tamanio_bytes bigint,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: entrega_informe_ley; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.entrega_informe_ley (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    informe_id uuid NOT NULL,
    periodo character varying(50) NOT NULL,
    fecha_vencimiento date NOT NULL,
    fecha_entrega timestamp without time zone,
    estado character varying(50) DEFAULT 'pendiente'::character varying NOT NULL,
    archivo_nombre character varying(255),
    archivo_url character varying(500),
    archivo_tamano bigint,
    elaborado_por character varying(255),
    fecha_elaboracion timestamp without time zone,
    aprobado_por character varying(255),
    fecha_aprobacion timestamp without time zone,
    enviado_por character varying(255),
    observaciones text,
    motivo_rechazo text,
    numero_radicado character varying(255),
    fecha_radicacion timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    estado_workflow character varying(50) DEFAULT 'borrador'::character varying,
    datos_automaticos_poblados boolean DEFAULT false,
    fecha_generacion timestamp without time zone,
    generado_por character varying(255),
    formato_archivo character varying(50),
    plantilla_usada character varying(255),
    version_plantilla character varying(50),
    metadata_generacion jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT entrega_informe_ley_estado_check CHECK (((estado)::text = ANY ((ARRAY['pendiente'::character varying, 'en-proceso'::character varying, 'entregado'::character varying, 'vencido'::character varying, 'rechazado'::character varying])::text[]))),
    CONSTRAINT entrega_informe_ley_estado_workflow_check CHECK (((estado_workflow)::text = ANY ((ARRAY['borrador'::character varying, 'en-revision'::character varying, 'en-aprobacion'::character varying, 'aprobado'::character varying, 'rechazado'::character varying, 'enviado'::character varying])::text[]))),
    CONSTRAINT entrega_informe_ley_formato_archivo_check CHECK (((formato_archivo)::text = ANY ((ARRAY['PDF'::character varying, 'Word'::character varying, 'Excel'::character varying])::text[])))
);


--
-- Name: TABLE entrega_informe_ley; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.entrega_informe_ley IS 'Entregas de informes de ley por periodo';


--
-- Name: COLUMN entrega_informe_ley.estado_workflow; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.entrega_informe_ley.estado_workflow IS 'Estado en el workflow de aprobación';


--
-- Name: COLUMN entrega_informe_ley.datos_automaticos_poblados; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.entrega_informe_ley.datos_automaticos_poblados IS 'Indica si los datos automáticos fueron poblados';


--
-- Name: COLUMN entrega_informe_ley.metadata_generacion; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.entrega_informe_ley.metadata_generacion IS 'Metadatos de la generación: tiempo, tamaño, variables usadas, etc.';


--
-- Name: equipo_auditor; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.equipo_auditor (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    auditoria_id uuid NOT NULL,
    persona_id bigint NOT NULL,
    rol character varying(100) DEFAULT 'Auditor'::character varying,
    activo boolean DEFAULT true,
    fecha_asignacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_retiro timestamp without time zone,
    observaciones text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE equipo_auditor; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.equipo_auditor IS 'Equipo de auditores asignados a una auditoría. Relación N-N entre auditorías y personas.';


--
-- Name: COLUMN equipo_auditor.rol; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.equipo_auditor.rol IS 'Rol del auditor en esta auditoría específica: Auditor, Auditor Senior, Auditor Junior, Inspector, Profesional Especializado, etc.';


--
-- Name: etapa_auditoria; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.etapa_auditoria (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    auditoria_id uuid NOT NULL,
    etapa character varying(50) NOT NULL,
    estado character varying(50) NOT NULL,
    fecha_inicio date NOT NULL,
    fecha_fin date,
    fecha_limite date NOT NULL,
    datos jsonb NOT NULL,
    porcentaje_avance integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT etapa_auditoria_estado_check CHECK (((estado)::text = ANY ((ARRAY['pendiente'::character varying, 'en_progreso'::character varying, 'completada'::character varying])::text[]))),
    CONSTRAINT etapa_auditoria_etapa_check CHECK (((etapa)::text = ANY ((ARRAY['planeacion'::character varying, 'ejecucion'::character varying, 'comunicacion'::character varying])::text[]))),
    CONSTRAINT etapa_auditoria_porcentaje_avance_check CHECK (((porcentaje_avance >= 0) AND (porcentaje_avance <= 100)))
);


--
-- Name: TABLE etapa_auditoria; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.etapa_auditoria IS 'Etapas de ejecución de auditorías';


--
-- Name: etapa_kanban; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.etapa_kanban (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tablero_kanban_id uuid NOT NULL,
    nombre character varying(255) NOT NULL,
    descripcion text,
    orden integer NOT NULL,
    color character varying(7) NOT NULL,
    tiempo_sla integer DEFAULT 0 NOT NULL,
    limite_wip integer,
    visible boolean DEFAULT true NOT NULL,
    notificar_vencimiento boolean DEFAULT false NOT NULL,
    dias_anticipacion_alerta integer DEFAULT 0 NOT NULL,
    estado character varying(20) DEFAULT 'intermedia'::character varying NOT NULL,
    permitir_retroceso boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT etapa_kanban_estado_check CHECK (((estado)::text = ANY ((ARRAY['inicial'::character varying, 'intermedia'::character varying, 'final'::character varying])::text[])))
);


--
-- Name: TABLE etapa_kanban; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.etapa_kanban IS 'Etapas configuradas para cada tablero Kanban';


--
-- Name: COLUMN etapa_kanban.tiempo_sla; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.etapa_kanban.tiempo_sla IS 'Tiempo SLA en días hábiles para esta etapa';


--
-- Name: COLUMN etapa_kanban.limite_wip; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.etapa_kanban.limite_wip IS 'Límite de elementos en progreso (null = sin límite)';


--
-- Name: COLUMN etapa_kanban.estado; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.etapa_kanban.estado IS 'Estado de la etapa: inicial, intermedia o final';


--
-- Name: eventos_timeline; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.eventos_timeline (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_mejoramiento_id uuid NOT NULL,
    tipo control_interno.tipo_evento_timeline NOT NULL,
    descripcion text NOT NULL,
    usuario_id uuid,
    usuario_nombre character varying(255),
    fecha timestamp with time zone DEFAULT now() NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE eventos_timeline; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.eventos_timeline IS 'Registro histórico de todos los eventos importantes relacionados con planes de mejoramiento';


--
-- Name: COLUMN eventos_timeline.plan_mejoramiento_id; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.eventos_timeline.plan_mejoramiento_id IS 'ID del plan de mejoramiento al que pertenece el evento';


--
-- Name: COLUMN eventos_timeline.tipo; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.eventos_timeline.tipo IS 'Tipo de evento registrado (creación, actualización, evidencia, etc.)';


--
-- Name: COLUMN eventos_timeline.descripcion; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.eventos_timeline.descripcion IS 'Descripción legible del evento para mostrar en el timeline';


--
-- Name: COLUMN eventos_timeline.usuario_id; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.eventos_timeline.usuario_id IS 'ID del usuario que generó el evento';


--
-- Name: COLUMN eventos_timeline.usuario_nombre; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.eventos_timeline.usuario_nombre IS 'Nombre del usuario que generó el evento (desnormalizado para histórico)';


--
-- Name: COLUMN eventos_timeline.fecha; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.eventos_timeline.fecha IS 'Fecha y hora en que ocurrió el evento';


--
-- Name: COLUMN eventos_timeline.metadata; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.eventos_timeline.metadata IS 'Información adicional del evento en formato JSON (IDs relacionados, valores anteriores/nuevos, etc.)';


--
-- Name: evidencia_documento; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.evidencia_documento (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codigo character varying(50) NOT NULL,
    nombre character varying(255) NOT NULL,
    descripcion text,
    tipo_documento control_interno.tipo_documento_evidencia NOT NULL,
    hallazgo_id uuid,
    accion_correctiva_id uuid,
    plan_mejoramiento_id uuid,
    auditoria_id uuid,
    ruta_archivo character varying(500) NOT NULL,
    nombre_archivo_original character varying(255) NOT NULL,
    tipo_mime character varying(100) NOT NULL,
    tamanio_bytes bigint NOT NULL,
    hash_archivo character varying(255),
    version integer DEFAULT 1,
    version_anterior_id uuid,
    es_version_actual boolean DEFAULT true,
    estado_validacion control_interno.estado_validacion_evidencia DEFAULT 'pendiente'::control_interno.estado_validacion_evidencia,
    validado_por character varying(255),
    fecha_validacion timestamp without time zone,
    observaciones_validacion text,
    subido_por character varying(255) NOT NULL,
    subido_por_id bigint,
    fecha_subida timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ruta_servidor_g character varying(500),
    sincronizado_servidor_g boolean DEFAULT false,
    fecha_sincronizacion timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_evidencia_vinculacion CHECK (((((((hallazgo_id IS NOT NULL))::integer + ((accion_correctiva_id IS NOT NULL))::integer) + ((plan_mejoramiento_id IS NOT NULL))::integer) + ((auditoria_id IS NOT NULL))::integer) >= 1))
);


--
-- Name: TABLE evidencia_documento; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.evidencia_documento IS 'Sistema independiente de gestión de evidencias y documentos vinculados a Hallazgos, Acciones, Planes y Auditorías';


--
-- Name: COLUMN evidencia_documento.codigo; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.evidencia_documento.codigo IS 'Código único generado automáticamente: EVD-YYYY-NNNN';


--
-- Name: COLUMN evidencia_documento.hash_archivo; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.evidencia_documento.hash_archivo IS 'Hash SHA256 del archivo para verificar integridad';


--
-- Name: COLUMN evidencia_documento.version_anterior_id; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.evidencia_documento.version_anterior_id IS 'Referencia a la versión anterior para mantener historial';


--
-- Name: COLUMN evidencia_documento.estado_validacion; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.evidencia_documento.estado_validacion IS 'Estado de validación por auditor (US-032): pendiente, aceptado, rechazado, con_observaciones';


--
-- Name: hallazgo; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.hallazgo (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codigo character varying(255) NOT NULL,
    categoria character varying(50) NOT NULL,
    estado character varying(255) NOT NULL,
    area character varying(255) NOT NULL,
    auditoria character varying(255) NOT NULL,
    auditoria_id uuid,
    descripcion text NOT NULL,
    criterio_incumplido text NOT NULL,
    normativa_relacionada jsonb NOT NULL,
    evidencias jsonb NOT NULL,
    recomendaciones jsonb NOT NULL,
    fecha_deteccion date NOT NULL,
    fecha_notificacion date,
    responsable character varying(255),
    fecha_limite_correccion date,
    observaciones_controversia text,
    titulo character varying(500),
    gravedad character varying(20),
    fecha_compromiso date,
    progreso_cumplimiento integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT hallazgo_categoria_check CHECK (((categoria)::text = ANY ((ARRAY['critico'::character varying, 'controversia'::character varying, 'borrador'::character varying])::text[]))),
    CONSTRAINT hallazgo_gravedad_check CHECK (((gravedad)::text = ANY ((ARRAY['Crítica'::character varying, 'Alta'::character varying, 'Media'::character varying, 'Baja'::character varying])::text[]))),
    CONSTRAINT hallazgo_progreso_cumplimiento_check CHECK (((progreso_cumplimiento >= 0) AND (progreso_cumplimiento <= 100)))
);


--
-- Name: TABLE hallazgo; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.hallazgo IS 'Hallazgos identificados en las auditorías';


--
-- Name: historial_auditoria; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.historial_auditoria (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    auditoria_id uuid NOT NULL,
    tipo_evento character varying(50) NOT NULL,
    fecha date NOT NULL,
    hora time without time zone NOT NULL,
    usuario_id bigint NOT NULL,
    accion character varying(255) NOT NULL,
    descripcion text,
    observaciones text,
    documento_adjunto character varying(500),
    ip_address character varying(45),
    user_agent text,
    cambios jsonb DEFAULT '[]'::jsonb,
    estado_anterior character varying(50),
    estado_nuevo character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT historial_auditoria_tipo_evento_check CHECK (((tipo_evento)::text = ANY ((ARRAY['creacion'::character varying, 'cambio_estado'::character varying, 'asignacion'::character varying, 'actualizacion'::character varying, 'documento'::character varying, 'hallazgo'::character varying, 'nota'::character varying, 'aprobacion'::character varying, 'finalizacion'::character varying, 'eliminacion'::character varying, 'archivo'::character varying, 'ampliacion_plazo'::character varying])::text[])))
);


--
-- Name: TABLE historial_auditoria; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.historial_auditoria IS 'Historial completo de cambios y eventos de una auditoría. Trazabilidad completa de todas las acciones. El campo cambios almacena un array JSONB con formato: [{"campo": "Progreso", "valorAnterior": "10%", "valorNuevo": "15%"}]';


--
-- Name: COLUMN historial_auditoria.usuario_id; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.historial_auditoria.usuario_id IS 'ID del usuario que realizó la acción (FK a auth.personas.id_tercero)';


--
-- Name: COLUMN historial_auditoria.cambios; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.historial_auditoria.cambios IS 'Array JSONB de cambios realizados. Formato: [{"campo": string, "valorAnterior": string, "valorNuevo": string}]. Ejemplo: [{"campo": "Progreso", "valorAnterior": "10%", "valorNuevo": "15%"}]';


--
-- Name: historial_generacion_informe; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.historial_generacion_informe (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entrega_id uuid NOT NULL,
    accion character varying(100) NOT NULL,
    usuario_id character varying(255),
    usuario_nombre character varying(255),
    observaciones text,
    datos_anteriores jsonb,
    datos_nuevos jsonb,
    ip_origen character varying(50),
    user_agent text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE historial_generacion_informe; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.historial_generacion_informe IS 'Auditoría completa de generación y aprobación de informes';


--
-- Name: historial_plan_anual; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.historial_plan_anual (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_id uuid NOT NULL,
    tipo_evento character varying(50) NOT NULL,
    fecha date NOT NULL,
    hora time without time zone NOT NULL,
    usuario_id bigint NOT NULL,
    accion character varying(255) NOT NULL,
    descripcion text,
    observaciones text,
    ip_address character varying(45),
    user_agent text,
    cambios jsonb DEFAULT '[]'::jsonb,
    estado_anterior character varying(50),
    estado_nuevo character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT historial_plan_anual_tipo_evento_check CHECK (((tipo_evento)::text = ANY ((ARRAY['creacion'::character varying, 'actualizacion'::character varying, 'aprobacion'::character varying, 'actividad_creada'::character varying, 'actividad_actualizada'::character varying, 'actividad_eliminada'::character varying, 'cambio_estado'::character varying])::text[])))
);


--
-- Name: TABLE historial_plan_anual; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.historial_plan_anual IS 'Historial de cambios y auditoría del Plan Anual 5 Roles. Registra todas las operaciones CRUD para trazabilidad y compliance.';


--
-- Name: COLUMN historial_plan_anual.tipo_evento; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.historial_plan_anual.tipo_evento IS 'Tipo de evento: creacion, actualizacion, aprobacion, actividad_creada, actividad_actualizada, actividad_eliminada, cambio_estado';


--
-- Name: COLUMN historial_plan_anual.usuario_id; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.historial_plan_anual.usuario_id IS 'FK a auth.personas(id_tercero) - Usuario que realizó la acción';


--
-- Name: COLUMN historial_plan_anual.ip_address; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.historial_plan_anual.ip_address IS 'Dirección IP del usuario que realizó la acción';


--
-- Name: COLUMN historial_plan_anual.user_agent; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.historial_plan_anual.user_agent IS 'User agent del navegador del usuario';


--
-- Name: COLUMN historial_plan_anual.cambios; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.historial_plan_anual.cambios IS 'Array JSONB con formato [{campo: string, valorAnterior: string, valorNuevo: string}]';


--
-- Name: informe_ley; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.informe_ley (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codigo character varying(255) NOT NULL,
    nombre character varying(255) NOT NULL,
    descripcion text NOT NULL,
    tipo character varying(50),
    periodicidad character varying(50) NOT NULL,
    fecha_vencimiento date,
    estado character varying(50) DEFAULT 'pendiente'::character varying,
    dias_restantes integer,
    alerta character varying(50),
    area character varying(255) NOT NULL,
    responsable character varying(255) NOT NULL,
    normativa text,
    acciones_sugeridas jsonb,
    historial jsonb,
    proximo_recordatorio timestamp without time zone,
    recordatorios_enviados integer DEFAULT 0,
    formato_template character varying(255),
    datos_integrados jsonb,
    codigo_corto character varying(50),
    categoria character varying(100),
    dia_presentacion integer,
    entidad_destino character varying(500),
    area_responsable character varying(255),
    tiene_plantilla boolean DEFAULT false,
    url_plantilla character varying(500),
    requiere_aprobacion boolean DEFAULT true,
    dias_anticipacion_alerta integer DEFAULT 7,
    activo boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT informe_ley_alerta_check CHECK (((alerta)::text = ANY ((ARRAY['verde'::character varying, 'amarillo'::character varying, 'naranja'::character varying, 'rojo'::character varying])::text[]))),
    CONSTRAINT informe_ley_categoria_check CHECK (((categoria)::text = ANY ((ARRAY['financiero'::character varying, 'administrativo'::character varying, 'contractual'::character varying, 'talento-humano'::character varying, 'transparencia'::character varying, 'control'::character varying])::text[]))),
    CONSTRAINT informe_ley_dia_presentacion_check CHECK (((dia_presentacion >= 1) AND (dia_presentacion <= 31))),
    CONSTRAINT informe_ley_estado_check CHECK (((estado)::text = ANY ((ARRAY['pendiente'::character varying, 'en_proceso'::character varying, 'en_revision'::character varying, 'aprobado'::character varying, 'presentado'::character varying, 'vencido'::character varying])::text[]))),
    CONSTRAINT informe_ley_periodicidad_check CHECK (((periodicidad)::text = ANY ((ARRAY['mensual'::character varying, 'trimestral'::character varying, 'semestral'::character varying, 'anual'::character varying])::text[]))),
    CONSTRAINT informe_ley_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['ley'::character varying, 'normativo'::character varying, 'interno'::character varying])::text[])))
);


--
-- Name: TABLE informe_ley; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.informe_ley IS 'Informes normativos requeridos por ley (RF012)';


--
-- Name: integraciones_esap; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.integraciones_esap (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre character varying(255) NOT NULL,
    tipo character varying(100) NOT NULL,
    configuracion jsonb NOT NULL,
    activa boolean DEFAULT true,
    ultima_sincronizacion timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT integraciones_esap_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['api'::character varying, 'webhook'::character varying, 'sftp'::character varying, 'email'::character varying, 'otro'::character varying])::text[])))
);


--
-- Name: TABLE integraciones_esap; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.integraciones_esap IS 'Configuración de integraciones externas';


--
-- Name: item_lista_chequeo; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.item_lista_chequeo (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    numero integer NOT NULL,
    pregunta text NOT NULL,
    criterio text NOT NULL,
    normativa_referencia character varying(255),
    tipo_respuesta character varying(50) NOT NULL,
    obligatorio boolean DEFAULT true,
    peso_calificacion numeric(10,2),
    evidencia_requerida boolean DEFAULT false,
    lista_chequeo_id uuid NOT NULL,
    seccion_id uuid,
    es_critico boolean DEFAULT false,
    respuesta character varying(50),
    observaciones text,
    genera_hallazgo boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT item_lista_chequeo_respuesta_check CHECK (((respuesta)::text = ANY ((ARRAY['cumple'::character varying, 'no-cumple'::character varying, 'no-aplica'::character varying])::text[]))),
    CONSTRAINT item_lista_chequeo_tipo_respuesta_check CHECK (((tipo_respuesta)::text = ANY ((ARRAY['si_no'::character varying, 'cumple_no_cumple'::character varying, 'texto'::character varying, 'numerico'::character varying])::text[])))
);


--
-- Name: TABLE item_lista_chequeo; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.item_lista_chequeo IS 'Items individuales de una lista de chequeo';


--
-- Name: COLUMN item_lista_chequeo.obligatorio; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.item_lista_chequeo.obligatorio IS 'Indica si el item es obligatorio';


--
-- Name: lista_aplicada; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.lista_aplicada (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lista_chequeo_id uuid NOT NULL,
    lista_chequeo_codigo character varying(255) NOT NULL,
    lista_chequeo_nombre character varying(255) NOT NULL,
    auditoria_id character varying(255) NOT NULL,
    fecha_aplicacion date NOT NULL,
    aplicado_por character varying(255) NOT NULL,
    respuestas jsonb NOT NULL,
    resultado jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE lista_aplicada; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.lista_aplicada IS 'Aplicaciones de listas de chequeo en auditorías';


--
-- Name: lista_chequeo; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.lista_chequeo (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codigo character varying(255) NOT NULL,
    nombre character varying(255) NOT NULL,
    descripcion text NOT NULL,
    tipo character varying(50) NOT NULL,
    categoria character varying(255) NOT NULL,
    version character varying(50) NOT NULL,
    estado character varying(50) NOT NULL,
    aplicable_para jsonb NOT NULL,
    created_by character varying(255) NOT NULL,
    items jsonb,
    proceso character varying(255),
    subproceso character varying(255),
    categoria_esap character varying(100),
    normativa_aplicable text,
    objetivo text,
    version_base character varying(50),
    permite_no_aplica boolean DEFAULT true,
    requiere_evidencias boolean DEFAULT true,
    genera_hallazgos_automaticos boolean DEFAULT true,
    auditoria_id uuid,
    nombre_auditoria character varying(500),
    auditor_responsable character varying(255),
    fecha_aplicacion date,
    fecha_diligenciamiento date,
    items_completados integer DEFAULT 0,
    cumplimiento integer DEFAULT 0,
    no_cumplimientos integer DEFAULT 0,
    no_aplica integer DEFAULT 0,
    hallazgos_generados integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT lista_chequeo_categoria_esap_check CHECK (((categoria_esap)::text = ANY ((ARRAY['normativa'::character varying, 'procesos'::character varying, 'controles'::character varying, 'riesgos'::character varying, 'personalizada'::character varying])::text[]))),
    CONSTRAINT lista_chequeo_cumplimiento_check CHECK (((cumplimiento >= 0) AND (cumplimiento <= 100))),
    CONSTRAINT lista_chequeo_estado_check CHECK (((estado)::text = ANY ((ARRAY['activa'::character varying, 'inactiva'::character varying, 'obsoleta'::character varying])::text[]))),
    CONSTRAINT lista_chequeo_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['cumplimiento'::character varying, 'proceso'::character varying, 'sistema'::character varying, 'procedimiento'::character varying])::text[])))
);


--
-- Name: TABLE lista_chequeo; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.lista_chequeo IS 'Listas de chequeo configurables para auditorías';


--
-- Name: COLUMN lista_chequeo.codigo; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.lista_chequeo.codigo IS 'Código único de la lista (ej: LC-ADM-001)';


--
-- Name: COLUMN lista_chequeo.nombre; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.lista_chequeo.nombre IS 'Nombre descriptivo de la lista de chequeo';


--
-- Name: COLUMN lista_chequeo.descripcion; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.lista_chequeo.descripcion IS 'Descripción de la lista de chequeo';


--
-- Name: COLUMN lista_chequeo.tipo; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.lista_chequeo.tipo IS 'Tipo de lista de chequeo: planeacion, ejecucion o comunicacion';


--
-- Name: COLUMN lista_chequeo.categoria; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.lista_chequeo.categoria IS 'Categoría de la lista de chequeo (obligatoria)';


--
-- Name: logs_auditoria_esap; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.logs_auditoria_esap (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid,
    accion character varying(255) NOT NULL,
    entidad character varying(255),
    entidad_id uuid,
    detalles jsonb,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE logs_auditoria_esap; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.logs_auditoria_esap IS 'Logs de auditoría de acciones del sistema';


--
-- Name: normatividad_aplicable; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.normatividad_aplicable (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    auditoria_id uuid NOT NULL,
    normatividad text NOT NULL,
    tipo character varying(100),
    activo boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE normatividad_aplicable; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.normatividad_aplicable IS 'Normatividad aplicable a la auditoría (decretos, leyes, manuales, políticas)';


--
-- Name: nota_auditoria; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.nota_auditoria (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    auditoria_id uuid NOT NULL,
    contenido text NOT NULL,
    categoria character varying(50) NOT NULL,
    autor_id bigint NOT NULL,
    fecha date NOT NULL,
    hora time without time zone NOT NULL,
    importante boolean DEFAULT false,
    editada boolean DEFAULT false,
    fecha_edicion timestamp without time zone,
    editor_id bigint,
    activo boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT nota_auditoria_categoria_check CHECK (((categoria)::text = ANY ((ARRAY['General'::character varying, 'Hallazgo'::character varying, 'Seguimiento'::character varying, 'Evidencia'::character varying, 'Recomendación'::character varying, 'Observación'::character varying])::text[])))
);


--
-- Name: TABLE nota_auditoria; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.nota_auditoria IS 'Notas y observaciones de las auditorías. Similar a un sistema de comentarios con categorización. Las notas marcadas como importantes (importante=true) aparecen destacadas en amarillo.';


--
-- Name: COLUMN nota_auditoria.categoria; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.nota_auditoria.categoria IS 'Categoría de la nota: General, Hallazgo, Seguimiento, Evidencia, Recomendación, Observación';


--
-- Name: COLUMN nota_auditoria.importante; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.nota_auditoria.importante IS 'Si es true, la nota se marca como importante y aparece destacada con fondo amarillo en el frontend';


--
-- Name: notificacion; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.notificacion (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id character varying(255) NOT NULL,
    tipo_notificacion character varying(100) NOT NULL,
    titulo character varying(255) NOT NULL,
    mensaje text NOT NULL,
    estado character varying(50) DEFAULT 'pendiente'::character varying,
    canal character varying(50) DEFAULT 'sistema'::character varying,
    leida boolean DEFAULT false,
    fecha_lectura timestamp without time zone,
    enviada_email boolean DEFAULT false,
    fecha_envio_email timestamp without time zone,
    metadata jsonb,
    accion_url character varying(500),
    prioridad character varying(20) DEFAULT 'normal'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT notificacion_canal_check CHECK (((canal)::text = ANY ((ARRAY['email'::character varying, 'sistema'::character varying, 'ambos'::character varying])::text[]))),
    CONSTRAINT notificacion_estado_check CHECK (((estado)::text = ANY ((ARRAY['pendiente'::character varying, 'enviada'::character varying, 'leida'::character varying, 'archivada'::character varying])::text[]))),
    CONSTRAINT notificacion_prioridad_check CHECK (((prioridad)::text = ANY ((ARRAY['baja'::character varying, 'normal'::character varying, 'alta'::character varying, 'critica'::character varying])::text[]))),
    CONSTRAINT notificacion_tipo_notificacion_check CHECK (((tipo_notificacion)::text = ANY ((ARRAY['anuncio_auditoria'::character varying, 'recordatorio_plazo'::character varying, 'alerta_vencimiento'::character varying, 'hallazgo_identificado'::character varying, 'solicitud_evidencia'::character varying, 'recepcion_documento'::character varying, 'aprobacion_plan'::character varying, 'rechazo_plan'::character varying, 'controversia_hallazgo'::character varying, 'validacion_evidencia'::character varying, 'solicitud_ampliacion_plazo'::character varying, 'ampliacion_plazo_aprobada'::character varying, 'ampliacion_plazo_rechazada'::character varying, 'otro'::character varying])::text[])))
);


--
-- Name: TABLE notificacion; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.notificacion IS 'Sistema de notificaciones (RF014)';


--
-- Name: objetivo_auditoria; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.objetivo_auditoria (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    auditoria_id uuid NOT NULL,
    descripcion text NOT NULL,
    orden integer DEFAULT 0,
    activo boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE objetivo_auditoria; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.objetivo_auditoria IS 'Objetivos específicos de cada auditoría. Cada auditoría puede tener múltiples objetivos.';


--
-- Name: parametro_sistema; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.parametro_sistema (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clave character varying(255) NOT NULL,
    valor text NOT NULL,
    descripcion text,
    tipo character varying(50) DEFAULT 'string'::character varying,
    categoria character varying(255),
    editable boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT parametro_sistema_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['string'::character varying, 'number'::character varying, 'boolean'::character varying, 'json'::character varying])::text[])))
);


--
-- Name: TABLE parametro_sistema; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.parametro_sistema IS 'Parámetros de configuración del sistema (RF020)';


--
-- Name: paso_workflow_informe; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.paso_workflow_informe (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workflow_id uuid NOT NULL,
    numero_paso integer NOT NULL,
    nombre character varying(100) NOT NULL,
    nombre_display character varying(255) NOT NULL,
    descripcion text,
    responsable character varying(255),
    rol_responsable character varying(255),
    estado character varying(50) DEFAULT 'pendiente'::character varying,
    fecha_inicio timestamp without time zone,
    fecha_fin timestamp without time zone,
    observaciones text,
    accion character varying(50),
    es_obligatorio boolean DEFAULT true,
    orden integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT paso_workflow_informe_accion_check CHECK (((accion)::text = ANY ((ARRAY['elaborar'::character varying, 'revisar'::character varying, 'aprobar'::character varying, 'publicar'::character varying])::text[]))),
    CONSTRAINT paso_workflow_informe_estado_check CHECK (((estado)::text = ANY ((ARRAY['pendiente'::character varying, 'en-proceso'::character varying, 'completado'::character varying, 'rechazado'::character varying])::text[])))
);


--
-- Name: TABLE paso_workflow_informe; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.paso_workflow_informe IS 'Pasos individuales del workflow de aprobación';


--
-- Name: plan_anual; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.plan_anual (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "año" integer NOT NULL,
    nombre character varying(255) NOT NULL,
    estado character varying(50) DEFAULT 'borrador'::character varying,
    fecha_creacion date NOT NULL,
    fecha_aprobacion date,
    creado_por character varying(255) NOT NULL,
    version character varying(50) DEFAULT '1.0'::character varying,
    total_actividades integer DEFAULT 0,
    actividades_completadas integer DEFAULT 0,
    porcentaje_cumplimiento integer DEFAULT 0,
    enfoques jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT plan_anual_estado_check CHECK (((estado)::text = ANY ((ARRAY['borrador'::character varying, 'aprobado'::character varying, 'en-ejecucion'::character varying, 'cerrado'::character varying])::text[])))
);


--
-- Name: TABLE plan_anual; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.plan_anual IS 'Planes anuales de auditoría';


--
-- Name: plan_anual_5_roles; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.plan_anual_5_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ano integer NOT NULL,
    fecha_creacion date DEFAULT CURRENT_DATE NOT NULL,
    responsable character varying(255) NOT NULL,
    estado character varying(50) DEFAULT 'borrador'::character varying NOT NULL,
    porcentaje_cumplimiento_general integer DEFAULT 0,
    total_actividades integer DEFAULT 0,
    actividades_completadas integer DEFAULT 0,
    actividades_en_progreso integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT plan_anual_5_roles_estado_check CHECK (((estado)::text = ANY ((ARRAY['borrador'::character varying, 'en-revision'::character varying, 'aprobado'::character varying, 'en-ejecucion'::character varying, 'completado'::character varying])::text[])))
);


--
-- Name: COLUMN plan_anual_5_roles.estado; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.plan_anual_5_roles.estado IS 'Estado del plan anual: borrador, en-revision, aprobado, en-ejecucion, completado';


--
-- Name: plan_individual; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.plan_individual (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codigo character varying(255) NOT NULL,
    auditoria_id uuid NOT NULL,
    auditoria_codigo character varying(255) NOT NULL,
    nombre character varying(255) NOT NULL,
    alcance text NOT NULL,
    objetivo text NOT NULL,
    proceso_auditar character varying(255) NOT NULL,
    riesgos jsonb NOT NULL,
    criterios_auditoria jsonb NOT NULL,
    normativa_aplicable jsonb NOT NULL,
    equipo_auditor jsonb NOT NULL,
    documentos jsonb NOT NULL,
    estado character varying(50) NOT NULL,
    fecha_creacion date NOT NULL,
    fecha_envio date,
    enviado_por character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT plan_individual_estado_check CHECK (((estado)::text = ANY ((ARRAY['borrador'::character varying, 'enviado'::character varying, 'aceptado'::character varying])::text[])))
);


--
-- Name: TABLE plan_individual; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.plan_individual IS 'Planes individuales de auditoría';


--
-- Name: plan_mejoramiento; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.plan_mejoramiento (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codigo character varying(255) NOT NULL,
    hallazgo_id uuid,
    hallazgo_codigo character varying(255),
    auditoria_id uuid,
    titulo character varying(255) NOT NULL,
    descripcion text,
    objetivos jsonb NOT NULL,
    area_responsable character varying(255) NOT NULL,
    responsable_implementacion character varying(255) NOT NULL,
    estado character varying(50) NOT NULL,
    fecha_creacion date,
    fecha_aprobacion date,
    fecha_inicio_ejecucion date,
    fecha_limite date NOT NULL,
    fecha_cierre date,
    recursos jsonb,
    indicadores jsonb,
    avance_global integer DEFAULT 0,
    aprobado_por character varying(255),
    observaciones text,
    observaciones_aprobacion text,
    motivo_rechazo text,
    seguimientos jsonb,
    codigo_auditoria character varying(255),
    porcentaje_efectividad integer DEFAULT 0,
    seguimientos_realizados integer DEFAULT 0,
    seguimientos_totales integer DEFAULT 4,
    proximo_seguimiento date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT plan_mejoramiento_estado_check CHECK (((estado)::text = ANY ((ARRAY['borrador'::character varying, 'revision'::character varying, 'aprobado'::character varying, 'en_ejecucion'::character varying, 'completado'::character varying, 'vencido'::character varying, 'rechazado'::character varying])::text[]))),
    CONSTRAINT plan_mejoramiento_porcentaje_efectividad_check CHECK (((porcentaje_efectividad >= 0) AND (porcentaje_efectividad <= 100)))
);


--
-- Name: TABLE plan_mejoramiento; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.plan_mejoramiento IS 'Planes de mejoramiento derivados de hallazgos';


--
-- Name: plantilla_email; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.plantilla_email (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codigo character varying(255) NOT NULL,
    nombre character varying(255) NOT NULL,
    asunto character varying(500) NOT NULL,
    cuerpo text NOT NULL,
    variables_disponibles jsonb,
    activa boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE plantilla_email; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.plantilla_email IS 'Plantillas de correo electrónico (RF020)';


--
-- Name: plantilla_informe_ley; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.plantilla_informe_ley (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codigo character varying(255) NOT NULL,
    nombre character varying(255) NOT NULL,
    descripcion text,
    tipo_formato character varying(50) NOT NULL,
    ruta_plantilla character varying(500) NOT NULL,
    variables_disponibles jsonb DEFAULT '[]'::jsonb,
    estructura_datos jsonb DEFAULT '{}'::jsonb,
    activa boolean DEFAULT true,
    version character varying(50) DEFAULT '1.0'::character varying,
    creado_por character varying(255),
    actualizado_por character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT plantilla_informe_ley_tipo_formato_check CHECK (((tipo_formato)::text = ANY ((ARRAY['PDF'::character varying, 'Word'::character varying, 'Excel'::character varying, 'HTML'::character varying])::text[])))
);


--
-- Name: TABLE plantilla_informe_ley; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.plantilla_informe_ley IS 'Plantillas para generación automática de informes de ley';


--
-- Name: COLUMN plantilla_informe_ley.variables_disponibles; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.plantilla_informe_ley.variables_disponibles IS 'Variables disponibles en la plantilla. Las marcadas como requeridas deben estar presentes.';


--
-- Name: COLUMN plantilla_informe_ley.estructura_datos; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.plantilla_informe_ley.estructura_datos IS 'Estructura esperada de datos. Campos con "requerido": false son opcionales.';


--
-- Name: plantilla_reporte; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.plantilla_reporte (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codigo character varying(255) NOT NULL,
    nombre character varying(255) NOT NULL,
    tipo character varying(100) NOT NULL,
    descripcion text,
    formato character varying(50) NOT NULL,
    ruta_template character varying(500),
    variables_disponibles jsonb,
    activa boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT plantilla_reporte_formato_check CHECK (((formato)::text = ANY ((ARRAY['PDF'::character varying, 'Excel'::character varying, 'Word'::character varying, 'PowerPoint'::character varying])::text[])))
);


--
-- Name: TABLE plantilla_reporte; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.plantilla_reporte IS 'Plantillas para generación de reportes';


--
-- Name: plantillas_documentos_esap; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.plantillas_documentos_esap (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codigo character varying(255) NOT NULL,
    nombre character varying(255) NOT NULL,
    descripcion text,
    tipo_documento character varying(100) NOT NULL,
    contenido text NOT NULL,
    variables_disponibles jsonb,
    activa boolean DEFAULT true,
    version integer DEFAULT 1,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE plantillas_documentos_esap; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.plantillas_documentos_esap IS 'Plantillas de documentos personalizadas';


--
-- Name: preferencia_notificacion; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.preferencia_notificacion (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id character varying(255) NOT NULL,
    notificaciones_email boolean DEFAULT true,
    notificaciones_sistema boolean DEFAULT true,
    tipos_notificacion jsonb,
    frecuencia_recordatorios character varying(50) DEFAULT '7'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    horario_preferido character varying(50)
);


--
-- Name: TABLE preferencia_notificacion; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.preferencia_notificacion IS 'Preferencias de notificación por usuario (RF014)';


--
-- Name: COLUMN preferencia_notificacion.horario_preferido; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.preferencia_notificacion.horario_preferido IS 'Horario preferido del usuario para recibir notificaciones';


--
-- Name: proceso_auditable; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.proceso_auditable (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codigo character varying(255) NOT NULL,
    nombre character varying(255) NOT NULL,
    descripcion text NOT NULL,
    tipo character varying(50) NOT NULL,
    macroproceso character varying(255) NOT NULL,
    responsable character varying(255) NOT NULL,
    dependencia character varying(255) NOT NULL,
    territorial character varying(255),
    evaluacion_riesgo jsonb NOT NULL,
    frecuencia_auditoria character varying(255) NOT NULL,
    ultima_auditoria date,
    proxima_auditoria date,
    prioridad integer NOT NULL,
    priorizacion_anos integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT proceso_auditable_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['estrategico'::character varying, 'misional'::character varying, 'apoyo'::character varying, 'evaluacion'::character varying])::text[])))
);


--
-- Name: TABLE proceso_auditable; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.proceso_auditable IS 'Procesos auditables del universo de auditorías';


--
-- Name: registro_seguimiento; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.registro_seguimiento (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    accion_id uuid NOT NULL,
    seguimiento_id uuid NOT NULL,
    accion_descripcion text NOT NULL,
    acciones_programadas integer DEFAULT 1,
    acciones_implementadas integer DEFAULT 0,
    puntaje_cumplimiento integer DEFAULT 0,
    controles_implementados character varying(20) NOT NULL,
    hallazgo_se_repite character varying(20) NOT NULL,
    puntaje_efectividad integer DEFAULT 0,
    observaciones text,
    evidencias jsonb DEFAULT '[]'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT registro_seguimiento_controles_implementados_check CHECK (((controles_implementados)::text = ANY ((ARRAY['SI'::character varying, 'NO'::character varying, 'PARCIAL'::character varying])::text[]))),
    CONSTRAINT registro_seguimiento_hallazgo_se_repite_check CHECK (((hallazgo_se_repite)::text = ANY ((ARRAY['SI'::character varying, 'NO'::character varying])::text[]))),
    CONSTRAINT registro_seguimiento_puntaje_cumplimiento_check CHECK (((puntaje_cumplimiento >= 0) AND (puntaje_cumplimiento <= 2))),
    CONSTRAINT registro_seguimiento_puntaje_efectividad_check CHECK (((puntaje_efectividad >= 0) AND (puntaje_efectividad <= 2)))
);


--
-- Name: reunion_apertura; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.reunion_apertura (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    auditoria_id uuid NOT NULL,
    fecha timestamp without time zone NOT NULL,
    modalidad character varying(50) NOT NULL,
    lugar character varying(255),
    enlace_virtual character varying(500),
    agenda jsonb,
    participantes jsonb,
    estado_acta character varying(50) DEFAULT 'pendiente'::character varying,
    acta_ruta character varying(500),
    observaciones text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT reunion_apertura_estado_acta_check CHECK (((estado_acta)::text = ANY ((ARRAY['pendiente'::character varying, 'en_elaboracion'::character varying, 'firmada'::character varying, 'aprobada'::character varying])::text[]))),
    CONSTRAINT reunion_apertura_modalidad_check CHECK (((modalidad)::text = ANY ((ARRAY['presencial'::character varying, 'virtual'::character varying, 'hibrida'::character varying])::text[])))
);


--
-- Name: TABLE reunion_apertura; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.reunion_apertura IS 'Información de la reunión de apertura de la auditoría';


--
-- Name: rol_decreto_648; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.rol_decreto_648 (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codigo character varying(255) NOT NULL,
    nombre character varying(255) NOT NULL,
    descripcion text,
    orden integer DEFAULT 0,
    activo boolean DEFAULT true,
    editable boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE rol_decreto_648; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.rol_decreto_648 IS 'Roles del Decreto 648 configurable (RF020)';


--
-- Name: rol_decreto_648_template; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.rol_decreto_648_template (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rol_numero integer NOT NULL,
    nombre character varying(255) NOT NULL,
    descripcion text NOT NULL,
    color character varying(7) DEFAULT '#3B82F6'::character varying NOT NULL,
    activo boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT rol_decreto_648_template_rol_numero_check CHECK (((rol_numero >= 1) AND (rol_numero <= 5)))
);


--
-- Name: rol_plan_anual; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.rol_plan_anual (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_id uuid NOT NULL,
    tipo character varying(100) NOT NULL,
    nombre character varying(255),
    email character varying(255),
    disponibilidad character varying(50) DEFAULT 'disponible'::character varying,
    horas_totales integer DEFAULT 1800,
    horas_asignadas integer DEFAULT 0,
    auditorias_asignadas integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT rol_plan_anual_disponibilidad_check CHECK (((disponibilidad)::text = ANY ((ARRAY['disponible'::character varying, 'parcial'::character varying, 'no-disponible'::character varying])::text[]))),
    CONSTRAINT rol_plan_anual_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['Auditor Líder'::character varying, 'Auditor'::character varying, 'Prof. Especializado'::character varying, 'Prof. Universitario'::character varying, 'Técnico'::character varying])::text[])))
);


--
-- Name: TABLE rol_plan_anual; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.rol_plan_anual IS 'Roles y disponibilidad de auditores en el plan anual';


--
-- Name: rol_plan_anual_5; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.rol_plan_anual_5 (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_id uuid NOT NULL,
    rol_numero integer NOT NULL,
    nombre character varying(255) NOT NULL,
    descripcion text NOT NULL,
    color character varying(7) DEFAULT '#3B82F6'::character varying NOT NULL,
    porcentaje_cumplimiento integer DEFAULT 0,
    total_actividades integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT rol_plan_anual_5_rol_numero_check CHECK (((rol_numero >= 1) AND (rol_numero <= 5)))
);


--
-- Name: TABLE rol_plan_anual_5; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.rol_plan_anual_5 IS 'Roles del plan anual (5 roles)';


--
-- Name: seccion_lista_chequeo; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.seccion_lista_chequeo (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lista_id uuid NOT NULL,
    orden integer NOT NULL,
    nombre character varying(255) NOT NULL,
    descripcion text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE seccion_lista_chequeo; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.seccion_lista_chequeo IS 'Secciones organizadas de listas de chequeo';


--
-- Name: seguimiento_plan_mejoramiento; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.seguimiento_plan_mejoramiento (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_id uuid NOT NULL,
    numero_seguimiento integer NOT NULL,
    fecha_seguimiento date NOT NULL,
    realizado_por character varying(255) NOT NULL,
    observaciones text,
    cumplimiento integer DEFAULT 0,
    efectividad integer DEFAULT 0,
    acciones_implementadas integer DEFAULT 0,
    acciones_totales integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT seguimiento_plan_mejoramiento_cumplimiento_check CHECK (((cumplimiento >= 0) AND (cumplimiento <= 100))),
    CONSTRAINT seguimiento_plan_mejoramiento_efectividad_check CHECK (((efectividad >= 0) AND (efectividad <= 100)))
);


--
-- Name: TABLE seguimiento_plan_mejoramiento; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.seguimiento_plan_mejoramiento IS 'Seguimientos trimestrales de planes de mejoramiento';


--
-- Name: seguimiento_trimestral; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.seguimiento_trimestral (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_id uuid NOT NULL,
    trimestre integer NOT NULL,
    "año" integer NOT NULL,
    fecha_inicio date NOT NULL,
    fecha_fin date NOT NULL,
    fecha_seguimiento date,
    avance_global integer DEFAULT 0,
    porcentaje_cumplimiento integer DEFAULT 0,
    porcentaje_efectividad integer DEFAULT 0,
    acciones_revisadas integer DEFAULT 0,
    acciones_totales integer DEFAULT 0,
    observaciones_generales text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT seguimiento_trimestral_avance_global_check CHECK (((avance_global >= 0) AND (avance_global <= 100))),
    CONSTRAINT seguimiento_trimestral_porcentaje_cumplimiento_check CHECK (((porcentaje_cumplimiento >= 0) AND (porcentaje_cumplimiento <= 100))),
    CONSTRAINT seguimiento_trimestral_porcentaje_efectividad_check CHECK (((porcentaje_efectividad >= 0) AND (porcentaje_efectividad <= 100))),
    CONSTRAINT seguimiento_trimestral_trimestre_check CHECK (((trimestre >= 1) AND (trimestre <= 4)))
);


--
-- Name: sesiones_esap; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.sesiones_esap (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid NOT NULL,
    token character varying(500) NOT NULL,
    ip_address character varying(45),
    user_agent text,
    fecha_inicio timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion timestamp without time zone NOT NULL,
    activa boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE sesiones_esap; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.sesiones_esap IS 'Sesiones activas de usuarios';


--
-- Name: tablero_kanban; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.tablero_kanban (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre character varying(255) NOT NULL,
    descripcion text,
    tipo character varying(50) NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT tablero_kanban_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['auditorias'::character varying, 'planes_mejoramiento'::character varying])::text[])))
);


--
-- Name: TABLE tablero_kanban; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.tablero_kanban IS 'Configuración de tableros Kanban para auditorías y planes de mejoramiento';


--
-- Name: COLUMN tablero_kanban.tipo; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.tablero_kanban.tipo IS 'Tipo de tablero: auditorias o planes_mejoramiento';


--
-- Name: tipo_auditoria; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.tipo_auditoria (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codigo character varying(255) NOT NULL,
    nombre character varying(255) NOT NULL,
    descripcion text,
    activo boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE tipo_auditoria; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.tipo_auditoria IS 'Tipos de auditoría configurables del sistema (Regular, Territorial, Especial)';


--
-- Name: COLUMN tipo_auditoria.codigo; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.tipo_auditoria.codigo IS 'Código único del tipo (ej: AUD-REG, AUD-TERR)';


--
-- Name: COLUMN tipo_auditoria.nombre; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.tipo_auditoria.nombre IS 'Nombre descriptivo del tipo de auditoría';


--
-- Name: COLUMN tipo_auditoria.descripcion; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON COLUMN control_interno.tipo_auditoria.descripcion IS 'Descripción detallada del tipo de auditoría';


--
-- Name: usuarios_esap; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.usuarios_esap (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codigo character varying(255) NOT NULL,
    nombre_completo character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    cargo character varying(255),
    area character varying(255),
    rol character varying(100),
    activo boolean DEFAULT true,
    ultimo_acceso timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE usuarios_esap; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.usuarios_esap IS 'Usuarios del sistema ESAP';


--
-- Name: v_auditor_disponibilidad; Type: VIEW; Schema: control_interno; Owner: -
--

CREATE VIEW control_interno.v_auditor_disponibilidad AS
 SELECT p.id_tercero AS persona_id,
    p.nom_largo AS nombre,
    p.num_identificacion,
    p.tip_identificacion,
    p.dir_email AS email,
    ap.especialidad,
    ap.cargo,
    ap.nivel_experiencia,
    ap.estado_disponibilidad,
    COALESCE(( SELECT count(DISTINCT a.id) AS count
           FROM control_interno.auditoria a
          WHERE (((a.auditor_lider_id = p.id_tercero) OR (a.auditor_asignado_id = p.id_tercero) OR (EXISTS ( SELECT 1
                   FROM control_interno.equipo_auditor ea
                  WHERE ((ea.auditoria_id = a.id) AND (ea.persona_id = p.id_tercero) AND (ea.activo = true))))) AND ((a.estado_kanban)::text <> ALL (ARRAY[('Finalizada'::character varying)::text, ('Archivada'::character varying)::text])) AND (COALESCE(a.activa, true) = true))), (0)::bigint) AS auditorias_en_curso,
    COALESCE(( SELECT count(DISTINCT a.id) AS count
           FROM control_interno.auditoria a
          WHERE ((a.auditor_lider_id = p.id_tercero) AND ((a.estado_kanban)::text <> ALL (ARRAY[('Finalizada'::character varying)::text, ('Archivada'::character varying)::text])) AND (COALESCE(a.activa, true) = true))), (0)::bigint) AS auditorias_como_lider,
    COALESCE(( SELECT count(DISTINCT a.id) AS count
           FROM control_interno.auditoria a
          WHERE ((a.auditor_asignado_id = p.id_tercero) AND ((a.estado_kanban)::text <> ALL (ARRAY[('Finalizada'::character varying)::text, ('Archivada'::character varying)::text])) AND (COALESCE(a.activa, true) = true))), (0)::bigint) AS auditorias_como_asignado,
    ap.fecha_ultima_actividad,
    ap.observaciones,
    ap.activo,
    ap.created_at,
    ap.updated_at
   FROM (auth.personas p
     LEFT JOIN control_interno.auditor_perfil ap ON ((p.id_tercero = ap.persona_id)))
  WHERE ((ap.activo = true) OR (ap.id IS NULL));


--
-- Name: v_auditorias_kanban_completo; Type: VIEW; Schema: control_interno; Owner: -
--

CREATE VIEW control_interno.v_auditorias_kanban_completo AS
 SELECT a.id,
    a.codigo,
    a.nombre AS titulo,
    a.descripcion,
    a.estado_kanban AS estado,
    COALESCE(a.tipo_kanban, a.tipo) AS tipo,
    a.riesgo_kanban AS riesgo,
    a.semaforo,
    a.territorial,
    a.prioridad_kanban AS prioridad,
    a.area_objetivo,
    a.proceso_auditado,
    a.alcance,
    a.progreso,
    a.hallazgos AS total_hallazgos,
    a.dias_restantes,
    a.porcentaje_tiempo,
    a.ultima_actuacion,
    a.calificacion_riesgo,
    a.total_documentos,
    a.total_informes,
    a.total_tareas,
    a.actividades_completas,
    a.actividades_pendientes,
    a.responsable_area_nombre,
    a.responsable_area_cargo,
    a.responsable_area_email,
    supervisor.id_tercero AS supervisor_asignado_id,
    supervisor.nom_largo AS supervisor_asignado_nombre,
    supervisor.dir_email AS supervisor_asignado_email,
    a.fecha_reunion_apertura,
    ra.modalidad AS reunion_modalidad,
    ra.estado_acta AS reunion_estado_acta,
    lider.id_tercero AS auditor_lider_id,
    lider.nom_largo AS auditor_lider_nombre,
    lider.dir_email AS auditor_lider_email,
    lider_perfil.especialidad AS auditor_lider_especialidad,
    lider_perfil.cargo AS auditor_lider_cargo,
    asignado.id_tercero AS auditor_asignado_id,
    asignado.nom_largo AS auditor_asignado_nombre,
    asignado.dir_email AS auditor_asignado_email,
    asignado_perfil.especialidad AS auditor_asignado_especialidad,
    asignado_perfil.cargo AS auditor_asignado_cargo,
    ti.nombre AS territorial_nombre,
    ti.ciudad AS territorial_ciudad,
    ti.departamento AS territorial_departamento,
    ei.tipo_motivo AS especial_tipo_motivo,
    ei.solicitante AS especial_solicitante,
    ei.justificacion AS especial_justificacion,
    a.fecha_inicio,
    a.fecha_fin,
    a.created_at,
    a.updated_at
   FROM ((((((((control_interno.auditoria a
     LEFT JOIN auth.personas lider ON (((a.auditor_lider_id)::text = (lider.id_tercero)::text)))
     LEFT JOIN control_interno.auditor_perfil lider_perfil ON (((lider.id_tercero = lider_perfil.persona_id) AND (lider_perfil.activo = true))))
     LEFT JOIN auth.personas asignado ON (((a.auditor_asignado_id)::text = (asignado.id_tercero)::text)))
     LEFT JOIN control_interno.auditor_perfil asignado_perfil ON (((asignado.id_tercero = asignado_perfil.persona_id) AND (asignado_perfil.activo = true))))
     LEFT JOIN auth.personas supervisor ON (((a.supervisor_asignado_id)::text = (supervisor.id_tercero)::text)))
     LEFT JOIN control_interno.auditoria_territorial_info ti ON ((a.id = ti.auditoria_id)))
     LEFT JOIN control_interno.auditoria_especial_info ei ON ((a.id = ei.auditoria_id)))
     LEFT JOIN control_interno.reunion_apertura ra ON ((a.id = ra.auditoria_id)));


--
-- Name: VIEW v_auditorias_kanban_completo; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON VIEW control_interno.v_auditorias_kanban_completo IS 'Vista completa de auditorías con toda la información necesaria para el módulo Kanban';


--
-- Name: v_auditorias_por_estado; Type: VIEW; Schema: control_interno; Owner: -
--

CREATE VIEW control_interno.v_auditorias_por_estado AS
 SELECT estado_kanban AS estado,
    count(*) AS total,
    count(*) FILTER (WHERE ((semaforo)::text = 'verde'::text)) AS verdes,
    count(*) FILTER (WHERE ((semaforo)::text = 'amarillo'::text)) AS amarillas,
    count(*) FILTER (WHERE ((semaforo)::text = 'rojo'::text)) AS rojas,
    avg(progreso) AS progreso_promedio,
    sum(hallazgos) AS total_hallazgos
   FROM control_interno.auditoria
  WHERE (estado_kanban IS NOT NULL)
  GROUP BY estado_kanban;


--
-- Name: VIEW v_auditorias_por_estado; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON VIEW control_interno.v_auditorias_por_estado IS 'Vista de contadores de auditorías por estado para el dashboard del Kanban';


--
-- Name: version_lista_chequeo; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.version_lista_chequeo (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lista_id uuid NOT NULL,
    version character varying(50) NOT NULL,
    fecha date NOT NULL,
    usuario character varying(255) NOT NULL,
    cambios text NOT NULL,
    motivo_cambio text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE version_lista_chequeo; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.version_lista_chequeo IS 'Historial de versiones de listas de chequeo';


--
-- Name: workflow_aprobacion_informe; Type: TABLE; Schema: control_interno; Owner: -
--

CREATE TABLE control_interno.workflow_aprobacion_informe (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entrega_id uuid NOT NULL,
    paso_actual integer DEFAULT 1,
    estado_workflow character varying(50) DEFAULT 'en-elaboracion'::character varying,
    completado boolean DEFAULT false,
    fecha_completado timestamp without time zone,
    creado_por character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT workflow_aprobacion_informe_estado_workflow_check CHECK (((estado_workflow)::text = ANY ((ARRAY['en-elaboracion'::character varying, 'en-revision'::character varying, 'en-aprobacion'::character varying, 'aprobado'::character varying, 'rechazado'::character varying, 'completado'::character varying])::text[])))
);


--
-- Name: TABLE workflow_aprobacion_informe; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TABLE control_interno.workflow_aprobacion_informe IS 'Workflow de aprobación para informes de ley (US-033)';


--
-- Name: accion_correctiva accion_correctiva_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.accion_correctiva
    ADD CONSTRAINT accion_correctiva_pkey PRIMARY KEY (id);


--
-- Name: accion_mejora accion_mejora_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.accion_mejora
    ADD CONSTRAINT accion_mejora_pkey PRIMARY KEY (id);


--
-- Name: actividad_etapa_auditoria actividad_etapa_auditoria_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.actividad_etapa_auditoria
    ADD CONSTRAINT actividad_etapa_auditoria_pkey PRIMARY KEY (id);


--
-- Name: actividad_plan_anual_5 actividad_plan_anual_5_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.actividad_plan_anual_5
    ADD CONSTRAINT actividad_plan_anual_5_pkey PRIMARY KEY (id);


--
-- Name: actividad_proceso_auditoria actividad_proceso_auditoria_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.actividad_proceso_auditoria
    ADD CONSTRAINT actividad_proceso_auditoria_pkey PRIMARY KEY (id);


--
-- Name: actividad_rol actividad_rol_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.actividad_rol
    ADD CONSTRAINT actividad_rol_pkey PRIMARY KEY (id);


--
-- Name: ampliacion_plazo ampliacion_plazo_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.ampliacion_plazo
    ADD CONSTRAINT ampliacion_plazo_pkey PRIMARY KEY (id);


--
-- Name: aprobacion aprobacion_codigo_key; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.aprobacion
    ADD CONSTRAINT aprobacion_codigo_key UNIQUE (codigo);


--
-- Name: aprobacion aprobacion_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.aprobacion
    ADD CONSTRAINT aprobacion_pkey PRIMARY KEY (id);


--
-- Name: auditor_perfil auditor_perfil_persona_id_key; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.auditor_perfil
    ADD CONSTRAINT auditor_perfil_persona_id_key UNIQUE (persona_id);


--
-- Name: auditor_perfil auditor_perfil_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.auditor_perfil
    ADD CONSTRAINT auditor_perfil_pkey PRIMARY KEY (id);


--
-- Name: auditoria auditoria_codigo_key; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.auditoria
    ADD CONSTRAINT auditoria_codigo_key UNIQUE (codigo);


--
-- Name: auditoria_especial_info auditoria_especial_info_auditoria_id_key; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.auditoria_especial_info
    ADD CONSTRAINT auditoria_especial_info_auditoria_id_key UNIQUE (auditoria_id);


--
-- Name: auditoria_especial_info auditoria_especial_info_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.auditoria_especial_info
    ADD CONSTRAINT auditoria_especial_info_pkey PRIMARY KEY (id);


--
-- Name: auditoria_gestion auditoria_gestion_codigo_key; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.auditoria_gestion
    ADD CONSTRAINT auditoria_gestion_codigo_key UNIQUE (codigo);


--
-- Name: auditoria_gestion auditoria_gestion_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.auditoria_gestion
    ADD CONSTRAINT auditoria_gestion_pkey PRIMARY KEY (id);


--
-- Name: auditoria auditoria_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.auditoria
    ADD CONSTRAINT auditoria_pkey PRIMARY KEY (id);


--
-- Name: auditoria_programada auditoria_programada_codigo_key; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.auditoria_programada
    ADD CONSTRAINT auditoria_programada_codigo_key UNIQUE (codigo);


--
-- Name: auditoria_programada auditoria_programada_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.auditoria_programada
    ADD CONSTRAINT auditoria_programada_pkey PRIMARY KEY (id);


--
-- Name: auditoria_territorial_info auditoria_territorial_info_auditoria_id_key; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.auditoria_territorial_info
    ADD CONSTRAINT auditoria_territorial_info_auditoria_id_key UNIQUE (auditoria_id);


--
-- Name: auditoria_territorial_info auditoria_territorial_info_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.auditoria_territorial_info
    ADD CONSTRAINT auditoria_territorial_info_pkey PRIMARY KEY (id);


--
-- Name: cache_esap cache_esap_clave_key; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.cache_esap
    ADD CONSTRAINT cache_esap_clave_key UNIQUE (clave);


--
-- Name: cache_esap cache_esap_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.cache_esap
    ADD CONSTRAINT cache_esap_pkey PRIMARY KEY (id);


--
-- Name: configuracion_esap configuracion_esap_clave_key; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.configuracion_esap
    ADD CONSTRAINT configuracion_esap_clave_key UNIQUE (clave);


--
-- Name: configuracion_esap configuracion_esap_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.configuracion_esap
    ADD CONSTRAINT configuracion_esap_pkey PRIMARY KEY (id);


--
-- Name: criterio_auditoria criterio_auditoria_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.criterio_auditoria
    ADD CONSTRAINT criterio_auditoria_pkey PRIMARY KEY (id);


--
-- Name: cronograma_auditoria cronograma_auditoria_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.cronograma_auditoria
    ADD CONSTRAINT cronograma_auditoria_pkey PRIMARY KEY (id);


--
-- Name: cronograma_fase_auditoria cronograma_fase_auditoria_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.cronograma_fase_auditoria
    ADD CONSTRAINT cronograma_fase_auditoria_pkey PRIMARY KEY (id);


--
-- Name: datos_automaticos_informe datos_automaticos_informe_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.datos_automaticos_informe
    ADD CONSTRAINT datos_automaticos_informe_pkey PRIMARY KEY (id);


--
-- Name: documento_aprobacion documento_aprobacion_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.documento_aprobacion
    ADD CONSTRAINT documento_aprobacion_pkey PRIMARY KEY (id);


--
-- Name: documento documento_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.documento
    ADD CONSTRAINT documento_pkey PRIMARY KEY (id);


--
-- Name: entrega_informe_ley entrega_informe_ley_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.entrega_informe_ley
    ADD CONSTRAINT entrega_informe_ley_pkey PRIMARY KEY (id);


--
-- Name: equipo_auditor equipo_auditor_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.equipo_auditor
    ADD CONSTRAINT equipo_auditor_pkey PRIMARY KEY (id);


--
-- Name: etapa_auditoria etapa_auditoria_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.etapa_auditoria
    ADD CONSTRAINT etapa_auditoria_pkey PRIMARY KEY (id);


--
-- Name: etapa_kanban etapa_kanban_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.etapa_kanban
    ADD CONSTRAINT etapa_kanban_pkey PRIMARY KEY (id);


--
-- Name: eventos_timeline eventos_timeline_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.eventos_timeline
    ADD CONSTRAINT eventos_timeline_pkey PRIMARY KEY (id);


--
-- Name: evidencia_documento evidencia_documento_codigo_key; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.evidencia_documento
    ADD CONSTRAINT evidencia_documento_codigo_key UNIQUE (codigo);


--
-- Name: evidencia_documento evidencia_documento_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.evidencia_documento
    ADD CONSTRAINT evidencia_documento_pkey PRIMARY KEY (id);


--
-- Name: hallazgo hallazgo_codigo_key; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.hallazgo
    ADD CONSTRAINT hallazgo_codigo_key UNIQUE (codigo);


--
-- Name: hallazgo hallazgo_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.hallazgo
    ADD CONSTRAINT hallazgo_pkey PRIMARY KEY (id);


--
-- Name: historial_auditoria historial_auditoria_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.historial_auditoria
    ADD CONSTRAINT historial_auditoria_pkey PRIMARY KEY (id);


--
-- Name: historial_generacion_informe historial_generacion_informe_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.historial_generacion_informe
    ADD CONSTRAINT historial_generacion_informe_pkey PRIMARY KEY (id);


--
-- Name: historial_plan_anual historial_plan_anual_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.historial_plan_anual
    ADD CONSTRAINT historial_plan_anual_pkey PRIMARY KEY (id);


--
-- Name: informe_ley informe_ley_codigo_corto_key; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.informe_ley
    ADD CONSTRAINT informe_ley_codigo_corto_key UNIQUE (codigo_corto);


--
-- Name: informe_ley informe_ley_codigo_key; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.informe_ley
    ADD CONSTRAINT informe_ley_codigo_key UNIQUE (codigo);


--
-- Name: informe_ley informe_ley_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.informe_ley
    ADD CONSTRAINT informe_ley_pkey PRIMARY KEY (id);


--
-- Name: integraciones_esap integraciones_esap_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.integraciones_esap
    ADD CONSTRAINT integraciones_esap_pkey PRIMARY KEY (id);


--
-- Name: item_lista_chequeo item_lista_chequeo_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.item_lista_chequeo
    ADD CONSTRAINT item_lista_chequeo_pkey PRIMARY KEY (id);


--
-- Name: lista_aplicada lista_aplicada_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.lista_aplicada
    ADD CONSTRAINT lista_aplicada_pkey PRIMARY KEY (id);


--
-- Name: lista_chequeo lista_chequeo_codigo_key; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.lista_chequeo
    ADD CONSTRAINT lista_chequeo_codigo_key UNIQUE (codigo);


--
-- Name: lista_chequeo lista_chequeo_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.lista_chequeo
    ADD CONSTRAINT lista_chequeo_pkey PRIMARY KEY (id);


--
-- Name: logs_auditoria_esap logs_auditoria_esap_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.logs_auditoria_esap
    ADD CONSTRAINT logs_auditoria_esap_pkey PRIMARY KEY (id);


--
-- Name: normatividad_aplicable normatividad_aplicable_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.normatividad_aplicable
    ADD CONSTRAINT normatividad_aplicable_pkey PRIMARY KEY (id);


--
-- Name: nota_auditoria nota_auditoria_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.nota_auditoria
    ADD CONSTRAINT nota_auditoria_pkey PRIMARY KEY (id);


--
-- Name: notificacion notificacion_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.notificacion
    ADD CONSTRAINT notificacion_pkey PRIMARY KEY (id);


--
-- Name: objetivo_auditoria objetivo_auditoria_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.objetivo_auditoria
    ADD CONSTRAINT objetivo_auditoria_pkey PRIMARY KEY (id);


--
-- Name: parametro_sistema parametro_sistema_clave_key; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.parametro_sistema
    ADD CONSTRAINT parametro_sistema_clave_key UNIQUE (clave);


--
-- Name: parametro_sistema parametro_sistema_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.parametro_sistema
    ADD CONSTRAINT parametro_sistema_pkey PRIMARY KEY (id);


--
-- Name: paso_workflow_informe paso_workflow_informe_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.paso_workflow_informe
    ADD CONSTRAINT paso_workflow_informe_pkey PRIMARY KEY (id);


--
-- Name: plan_anual_5_roles plan_anual_5_roles_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.plan_anual_5_roles
    ADD CONSTRAINT plan_anual_5_roles_pkey PRIMARY KEY (id);


--
-- Name: plan_anual plan_anual_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.plan_anual
    ADD CONSTRAINT plan_anual_pkey PRIMARY KEY (id);


--
-- Name: plan_individual plan_individual_codigo_key; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.plan_individual
    ADD CONSTRAINT plan_individual_codigo_key UNIQUE (codigo);


--
-- Name: plan_individual plan_individual_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.plan_individual
    ADD CONSTRAINT plan_individual_pkey PRIMARY KEY (id);


--
-- Name: plan_mejoramiento plan_mejoramiento_codigo_key; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.plan_mejoramiento
    ADD CONSTRAINT plan_mejoramiento_codigo_key UNIQUE (codigo);


--
-- Name: plan_mejoramiento plan_mejoramiento_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.plan_mejoramiento
    ADD CONSTRAINT plan_mejoramiento_pkey PRIMARY KEY (id);


--
-- Name: plantilla_email plantilla_email_codigo_key; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.plantilla_email
    ADD CONSTRAINT plantilla_email_codigo_key UNIQUE (codigo);


--
-- Name: plantilla_email plantilla_email_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.plantilla_email
    ADD CONSTRAINT plantilla_email_pkey PRIMARY KEY (id);


--
-- Name: plantilla_informe_ley plantilla_informe_ley_codigo_key; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.plantilla_informe_ley
    ADD CONSTRAINT plantilla_informe_ley_codigo_key UNIQUE (codigo);


--
-- Name: plantilla_informe_ley plantilla_informe_ley_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.plantilla_informe_ley
    ADD CONSTRAINT plantilla_informe_ley_pkey PRIMARY KEY (id);


--
-- Name: plantilla_reporte plantilla_reporte_codigo_key; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.plantilla_reporte
    ADD CONSTRAINT plantilla_reporte_codigo_key UNIQUE (codigo);


--
-- Name: plantilla_reporte plantilla_reporte_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.plantilla_reporte
    ADD CONSTRAINT plantilla_reporte_pkey PRIMARY KEY (id);


--
-- Name: plantillas_documentos_esap plantillas_documentos_esap_codigo_key; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.plantillas_documentos_esap
    ADD CONSTRAINT plantillas_documentos_esap_codigo_key UNIQUE (codigo);


--
-- Name: plantillas_documentos_esap plantillas_documentos_esap_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.plantillas_documentos_esap
    ADD CONSTRAINT plantillas_documentos_esap_pkey PRIMARY KEY (id);


--
-- Name: preferencia_notificacion preferencia_notificacion_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.preferencia_notificacion
    ADD CONSTRAINT preferencia_notificacion_pkey PRIMARY KEY (id);


--
-- Name: preferencia_notificacion preferencia_notificacion_usuario_id_key; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.preferencia_notificacion
    ADD CONSTRAINT preferencia_notificacion_usuario_id_key UNIQUE (usuario_id);


--
-- Name: proceso_auditable proceso_auditable_codigo_key; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.proceso_auditable
    ADD CONSTRAINT proceso_auditable_codigo_key UNIQUE (codigo);


--
-- Name: proceso_auditable proceso_auditable_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.proceso_auditable
    ADD CONSTRAINT proceso_auditable_pkey PRIMARY KEY (id);


--
-- Name: registro_seguimiento registro_seguimiento_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.registro_seguimiento
    ADD CONSTRAINT registro_seguimiento_pkey PRIMARY KEY (id);


--
-- Name: reunion_apertura reunion_apertura_auditoria_id_key; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.reunion_apertura
    ADD CONSTRAINT reunion_apertura_auditoria_id_key UNIQUE (auditoria_id);


--
-- Name: reunion_apertura reunion_apertura_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.reunion_apertura
    ADD CONSTRAINT reunion_apertura_pkey PRIMARY KEY (id);


--
-- Name: rol_decreto_648 rol_decreto_648_codigo_key; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.rol_decreto_648
    ADD CONSTRAINT rol_decreto_648_codigo_key UNIQUE (codigo);


--
-- Name: rol_decreto_648 rol_decreto_648_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.rol_decreto_648
    ADD CONSTRAINT rol_decreto_648_pkey PRIMARY KEY (id);


--
-- Name: rol_decreto_648_template rol_decreto_648_template_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.rol_decreto_648_template
    ADD CONSTRAINT rol_decreto_648_template_pkey PRIMARY KEY (id);


--
-- Name: rol_decreto_648_template rol_decreto_648_template_rol_numero_key; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.rol_decreto_648_template
    ADD CONSTRAINT rol_decreto_648_template_rol_numero_key UNIQUE (rol_numero);


--
-- Name: rol_plan_anual_5 rol_plan_anual_5_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.rol_plan_anual_5
    ADD CONSTRAINT rol_plan_anual_5_pkey PRIMARY KEY (id);


--
-- Name: rol_plan_anual_5 rol_plan_anual_5_plan_id_rol_numero_key; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.rol_plan_anual_5
    ADD CONSTRAINT rol_plan_anual_5_plan_id_rol_numero_key UNIQUE (plan_id, rol_numero);


--
-- Name: rol_plan_anual rol_plan_anual_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.rol_plan_anual
    ADD CONSTRAINT rol_plan_anual_pkey PRIMARY KEY (id);


--
-- Name: seccion_lista_chequeo seccion_lista_chequeo_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.seccion_lista_chequeo
    ADD CONSTRAINT seccion_lista_chequeo_pkey PRIMARY KEY (id);


--
-- Name: seguimiento_plan_mejoramiento seguimiento_plan_mejoramiento_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.seguimiento_plan_mejoramiento
    ADD CONSTRAINT seguimiento_plan_mejoramiento_pkey PRIMARY KEY (id);


--
-- Name: seguimiento_plan_mejoramiento seguimiento_plan_mejoramiento_plan_id_numero_seguimiento_key; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.seguimiento_plan_mejoramiento
    ADD CONSTRAINT seguimiento_plan_mejoramiento_plan_id_numero_seguimiento_key UNIQUE (plan_id, numero_seguimiento);


--
-- Name: seguimiento_trimestral seguimiento_trimestral_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.seguimiento_trimestral
    ADD CONSTRAINT seguimiento_trimestral_pkey PRIMARY KEY (id);


--
-- Name: sesiones_esap sesiones_esap_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.sesiones_esap
    ADD CONSTRAINT sesiones_esap_pkey PRIMARY KEY (id);


--
-- Name: sesiones_esap sesiones_esap_token_key; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.sesiones_esap
    ADD CONSTRAINT sesiones_esap_token_key UNIQUE (token);


--
-- Name: tablero_kanban tablero_kanban_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.tablero_kanban
    ADD CONSTRAINT tablero_kanban_pkey PRIMARY KEY (id);


--
-- Name: tipo_auditoria tipo_auditoria_codigo_key; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.tipo_auditoria
    ADD CONSTRAINT tipo_auditoria_codigo_key UNIQUE (codigo);


--
-- Name: tipo_auditoria tipo_auditoria_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.tipo_auditoria
    ADD CONSTRAINT tipo_auditoria_pkey PRIMARY KEY (id);


--
-- Name: plan_anual_5_roles unique_plan_anual_ano; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.plan_anual_5_roles
    ADD CONSTRAINT unique_plan_anual_ano UNIQUE (ano);


--
-- Name: actividad_proceso_auditoria uq_actividad_fase_orden; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.actividad_proceso_auditoria
    ADD CONSTRAINT uq_actividad_fase_orden UNIQUE (auditoria_id, fase, orden);


--
-- Name: cronograma_fase_auditoria uq_cronograma_fase; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.cronograma_fase_auditoria
    ADD CONSTRAINT uq_cronograma_fase UNIQUE (auditoria_id, fase);


--
-- Name: usuarios_esap usuarios_esap_codigo_key; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.usuarios_esap
    ADD CONSTRAINT usuarios_esap_codigo_key UNIQUE (codigo);


--
-- Name: usuarios_esap usuarios_esap_email_key; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.usuarios_esap
    ADD CONSTRAINT usuarios_esap_email_key UNIQUE (email);


--
-- Name: usuarios_esap usuarios_esap_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.usuarios_esap
    ADD CONSTRAINT usuarios_esap_pkey PRIMARY KEY (id);


--
-- Name: version_lista_chequeo version_lista_chequeo_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.version_lista_chequeo
    ADD CONSTRAINT version_lista_chequeo_pkey PRIMARY KEY (id);


--
-- Name: workflow_aprobacion_informe workflow_aprobacion_informe_pkey; Type: CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.workflow_aprobacion_informe
    ADD CONSTRAINT workflow_aprobacion_informe_pkey PRIMARY KEY (id);


--
-- Name: idx_accion_correctiva_estado; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_accion_correctiva_estado ON control_interno.accion_correctiva USING btree (estado);


--
-- Name: idx_accion_correctiva_hallazgo_id; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_accion_correctiva_hallazgo_id ON control_interno.accion_correctiva USING btree (hallazgo_id);


--
-- Name: idx_accion_correctiva_plan; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_accion_correctiva_plan ON control_interno.accion_correctiva USING btree (plan_id);


--
-- Name: idx_accion_mejora_estado; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_accion_mejora_estado ON control_interno.accion_mejora USING btree (estado);


--
-- Name: idx_accion_mejora_plan; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_accion_mejora_plan ON control_interno.accion_mejora USING btree (plan_mejoramiento_id);


--
-- Name: idx_actividad_auditoria; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_actividad_auditoria ON control_interno.actividad_proceso_auditoria USING btree (auditoria_id);


--
-- Name: idx_actividad_estado; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_actividad_estado ON control_interno.actividad_proceso_auditoria USING btree (estado);


--
-- Name: idx_actividad_estado_5; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_actividad_estado_5 ON control_interno.actividad_plan_anual_5 USING btree (estado);


--
-- Name: idx_actividad_etapa; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_actividad_etapa ON control_interno.actividad_etapa_auditoria USING btree (etapa_id);


--
-- Name: idx_actividad_fase; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_actividad_fase ON control_interno.actividad_proceso_auditoria USING btree (fase);


--
-- Name: idx_actividad_plan_5; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_actividad_plan_5 ON control_interno.actividad_plan_anual_5 USING btree (plan_id);


--
-- Name: idx_actividad_rol; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_actividad_rol ON control_interno.actividad_rol USING btree (rol_id);


--
-- Name: idx_actividad_rol_5; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_actividad_rol_5 ON control_interno.actividad_plan_anual_5 USING btree (rol_id);


--
-- Name: idx_ampliacion_auditoria; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_ampliacion_auditoria ON control_interno.ampliacion_plazo USING btree (auditoria_id);


--
-- Name: idx_ampliacion_estado; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_ampliacion_estado ON control_interno.ampliacion_plazo USING btree (estado);


--
-- Name: idx_ampliacion_fecha_solicitud; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_ampliacion_fecha_solicitud ON control_interno.ampliacion_plazo USING btree (fecha_solicitud DESC);


--
-- Name: idx_aprobacion_estado; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_aprobacion_estado ON control_interno.aprobacion USING btree (estado);


--
-- Name: idx_aprobacion_fecha_solicitud; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_aprobacion_fecha_solicitud ON control_interno.aprobacion USING btree (fecha_solicitud DESC);


--
-- Name: idx_aprobacion_prioridad; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_aprobacion_prioridad ON control_interno.aprobacion USING btree (prioridad);


--
-- Name: idx_aprobacion_tipo; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_aprobacion_tipo ON control_interno.aprobacion USING btree (tipo);


--
-- Name: idx_auditor_perfil_activo; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_auditor_perfil_activo ON control_interno.auditor_perfil USING btree (activo) WHERE (activo = true);


--
-- Name: idx_auditor_perfil_disponibilidad; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_auditor_perfil_disponibilidad ON control_interno.auditor_perfil USING btree (estado_disponibilidad);


--
-- Name: idx_auditor_perfil_especialidad; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_auditor_perfil_especialidad ON control_interno.auditor_perfil USING btree (especialidad);


--
-- Name: idx_auditor_perfil_persona; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_auditor_perfil_persona ON control_interno.auditor_perfil USING btree (persona_id);


--
-- Name: idx_auditoria_activa; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_auditoria_activa ON control_interno.auditoria USING btree (activa) WHERE (activa = true);


--
-- Name: idx_auditoria_aprobada; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_auditoria_aprobada ON control_interno.auditoria USING btree (aprobada);


--
-- Name: idx_auditoria_archivada; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_auditoria_archivada ON control_interno.auditoria USING btree (archivada) WHERE (archivada = false);


--
-- Name: idx_auditoria_auditor_asignado; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_auditoria_auditor_asignado ON control_interno.auditoria USING btree (auditor_asignado_id);


--
-- Name: idx_auditoria_auditor_lider; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_auditoria_auditor_lider ON control_interno.auditoria USING btree (auditor_lider_id);


--
-- Name: idx_auditoria_codigo; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_auditoria_codigo ON control_interno.auditoria USING btree (codigo);


--
-- Name: idx_auditoria_especial_info_auditoria; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE UNIQUE INDEX idx_auditoria_especial_info_auditoria ON control_interno.auditoria_especial_info USING btree (auditoria_id);


--
-- Name: idx_auditoria_estado_kanban; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_auditoria_estado_kanban ON control_interno.auditoria USING btree (estado_kanban);


--
-- Name: idx_auditoria_fase; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_auditoria_fase ON control_interno.auditoria USING btree (fase);


--
-- Name: idx_auditoria_fecha_aprobacion; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_auditoria_fecha_aprobacion ON control_interno.auditoria USING btree (fecha_aprobacion);


--
-- Name: idx_auditoria_fecha_reunion; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_auditoria_fecha_reunion ON control_interno.auditoria USING btree (fecha_reunion_apertura);


--
-- Name: idx_auditoria_fechas; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_auditoria_fechas ON control_interno.auditoria USING btree (fecha_inicio, fecha_fin);


--
-- Name: idx_auditoria_gestion_codigo; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_auditoria_gestion_codigo ON control_interno.auditoria_gestion USING btree (codigo);


--
-- Name: idx_auditoria_gestion_fase; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_auditoria_gestion_fase ON control_interno.auditoria_gestion USING btree (fase);


--
-- Name: idx_auditoria_gestion_tipo; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_auditoria_gestion_tipo ON control_interno.auditoria_gestion USING btree (tipo);


--
-- Name: idx_auditoria_plan_anual; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_auditoria_plan_anual ON control_interno.auditoria USING btree (plan_anual_id);


--
-- Name: idx_auditoria_prioridad; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_auditoria_prioridad ON control_interno.auditoria USING btree (prioridad);


--
-- Name: idx_auditoria_prioridad_kanban; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_auditoria_prioridad_kanban ON control_interno.auditoria USING btree (prioridad_kanban);


--
-- Name: idx_auditoria_programada_estado; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_auditoria_programada_estado ON control_interno.auditoria_programada USING btree (estado);


--
-- Name: idx_auditoria_programada_proceso; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_auditoria_programada_proceso ON control_interno.auditoria_programada USING btree (proceso_id);


--
-- Name: idx_auditoria_programada_tipo; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_auditoria_programada_tipo ON control_interno.auditoria_programada USING btree (tipo);


--
-- Name: idx_auditoria_riesgo_kanban; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_auditoria_riesgo_kanban ON control_interno.auditoria USING btree (riesgo_kanban);


--
-- Name: idx_auditoria_semaforo; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_auditoria_semaforo ON control_interno.auditoria USING btree (semaforo);


--
-- Name: idx_auditoria_supervisor; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_auditoria_supervisor ON control_interno.auditoria USING btree (supervisor_asignado_id);


--
-- Name: idx_auditoria_territorial; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_auditoria_territorial ON control_interno.auditoria USING btree (territorial);


--
-- Name: idx_auditoria_territorial_info_auditoria; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE UNIQUE INDEX idx_auditoria_territorial_info_auditoria ON control_interno.auditoria_territorial_info USING btree (auditoria_id);


--
-- Name: idx_auditoria_tipo; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_auditoria_tipo ON control_interno.auditoria USING btree (tipo);


--
-- Name: idx_auditoria_tipo_kanban; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_auditoria_tipo_kanban ON control_interno.auditoria USING btree (tipo_kanban);


--
-- Name: idx_cache_clave; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_cache_clave ON control_interno.cache_esap USING btree (clave);


--
-- Name: idx_cache_expiracion; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_cache_expiracion ON control_interno.cache_esap USING btree (fecha_expiracion);


--
-- Name: idx_config_esap_activo; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_config_esap_activo ON control_interno.configuracion_esap USING btree (activo);


--
-- Name: idx_config_esap_categoria; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_config_esap_categoria ON control_interno.configuracion_esap USING btree (categoria);


--
-- Name: idx_config_esap_clave; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_config_esap_clave ON control_interno.configuracion_esap USING btree (clave);


--
-- Name: idx_criterio_auditoria; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_criterio_auditoria ON control_interno.criterio_auditoria USING btree (auditoria_id);


--
-- Name: idx_criterio_auditoria_activo; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_criterio_auditoria_activo ON control_interno.criterio_auditoria USING btree (activo);


--
-- Name: idx_criterio_auditoria_auditoria_id; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_criterio_auditoria_auditoria_id ON control_interno.criterio_auditoria USING btree (auditoria_id);


--
-- Name: idx_cronograma_auditoria; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_cronograma_auditoria ON control_interno.cronograma_fase_auditoria USING btree (auditoria_id);


--
-- Name: idx_cronograma_estado; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_cronograma_estado ON control_interno.cronograma_auditoria USING btree (estado);


--
-- Name: idx_cronograma_fase; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_cronograma_fase ON control_interno.cronograma_fase_auditoria USING btree (fase);


--
-- Name: idx_cronograma_plan; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_cronograma_plan ON control_interno.cronograma_auditoria USING btree (plan_id);


--
-- Name: idx_cronograma_trimestre; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_cronograma_trimestre ON control_interno.cronograma_auditoria USING btree (trimestre);


--
-- Name: idx_datos_entrega; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_datos_entrega ON control_interno.datos_automaticos_informe USING btree (entrega_id);


--
-- Name: idx_datos_tipo; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_datos_tipo ON control_interno.datos_automaticos_informe USING btree (tipo_dato);


--
-- Name: idx_doc_aprobacion; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_doc_aprobacion ON control_interno.documento_aprobacion USING btree (aprobacion_id);


--
-- Name: idx_documento_auditoria; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_documento_auditoria ON control_interno.documento USING btree (auditoria_id);


--
-- Name: idx_documento_etapa; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_documento_etapa ON control_interno.documento USING btree (etapa);


--
-- Name: idx_documento_tipo; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_documento_tipo ON control_interno.documento USING btree (tipo_documento);


--
-- Name: idx_entrega_estado; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_entrega_estado ON control_interno.entrega_informe_ley USING btree (estado);


--
-- Name: idx_entrega_generacion; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_entrega_generacion ON control_interno.entrega_informe_ley USING btree (fecha_generacion);


--
-- Name: idx_entrega_informe; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_entrega_informe ON control_interno.entrega_informe_ley USING btree (informe_id);


--
-- Name: idx_entrega_vencimiento; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_entrega_vencimiento ON control_interno.entrega_informe_ley USING btree (fecha_vencimiento);


--
-- Name: idx_entrega_workflow; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_entrega_workflow ON control_interno.entrega_informe_ley USING btree (estado_workflow);


--
-- Name: idx_equipo_auditor_activo; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_equipo_auditor_activo ON control_interno.equipo_auditor USING btree (activo);


--
-- Name: idx_equipo_auditor_auditoria; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_equipo_auditor_auditoria ON control_interno.equipo_auditor USING btree (auditoria_id);


--
-- Name: idx_equipo_auditor_persona; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_equipo_auditor_persona ON control_interno.equipo_auditor USING btree (persona_id);


--
-- Name: idx_especial_auditoria; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_especial_auditoria ON control_interno.auditoria_especial_info USING btree (auditoria_id);


--
-- Name: idx_especial_fecha_solicitud; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_especial_fecha_solicitud ON control_interno.auditoria_especial_info USING btree (fecha_solicitud);


--
-- Name: idx_especial_tipo_motivo; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_especial_tipo_motivo ON control_interno.auditoria_especial_info USING btree (tipo_motivo);


--
-- Name: idx_etapa_auditoria_auditoria; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_etapa_auditoria_auditoria ON control_interno.etapa_auditoria USING btree (auditoria_id);


--
-- Name: idx_etapa_auditoria_estado; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_etapa_auditoria_estado ON control_interno.etapa_auditoria USING btree (estado);


--
-- Name: idx_etapa_kanban_deleted_at; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_etapa_kanban_deleted_at ON control_interno.etapa_kanban USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_etapa_kanban_tablero_orden; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_etapa_kanban_tablero_orden ON control_interno.etapa_kanban USING btree (tablero_kanban_id, orden);


--
-- Name: idx_eventos_timeline_fecha; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_eventos_timeline_fecha ON control_interno.eventos_timeline USING btree (fecha DESC);


--
-- Name: idx_eventos_timeline_metadata; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_eventos_timeline_metadata ON control_interno.eventos_timeline USING gin (metadata);


--
-- Name: idx_eventos_timeline_plan_id; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_eventos_timeline_plan_id ON control_interno.eventos_timeline USING btree (plan_mejoramiento_id);


--
-- Name: idx_eventos_timeline_tipo; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_eventos_timeline_tipo ON control_interno.eventos_timeline USING btree (tipo);


--
-- Name: idx_eventos_timeline_usuario; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_eventos_timeline_usuario ON control_interno.eventos_timeline USING btree (usuario_id);


--
-- Name: idx_evidencia_accion; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_evidencia_accion ON control_interno.evidencia_documento USING btree (accion_correctiva_id);


--
-- Name: idx_evidencia_auditoria; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_evidencia_auditoria ON control_interno.evidencia_documento USING btree (auditoria_id);


--
-- Name: idx_evidencia_codigo; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_evidencia_codigo ON control_interno.evidencia_documento USING btree (codigo);


--
-- Name: idx_evidencia_estado_validacion; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_evidencia_estado_validacion ON control_interno.evidencia_documento USING btree (estado_validacion);


--
-- Name: idx_evidencia_fecha_subida; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_evidencia_fecha_subida ON control_interno.evidencia_documento USING btree (fecha_subida);


--
-- Name: idx_evidencia_hallazgo; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_evidencia_hallazgo ON control_interno.evidencia_documento USING btree (hallazgo_id);


--
-- Name: idx_evidencia_plan; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_evidencia_plan ON control_interno.evidencia_documento USING btree (plan_mejoramiento_id);


--
-- Name: idx_evidencia_subido_por; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_evidencia_subido_por ON control_interno.evidencia_documento USING btree (subido_por_id);


--
-- Name: idx_evidencia_tipo; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_evidencia_tipo ON control_interno.evidencia_documento USING btree (tipo_documento);


--
-- Name: idx_hallazgo_auditoria; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_hallazgo_auditoria ON control_interno.hallazgo USING btree (auditoria_id);


--
-- Name: idx_hallazgo_categoria; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_hallazgo_categoria ON control_interno.hallazgo USING btree (categoria);


--
-- Name: idx_hallazgo_estado; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_hallazgo_estado ON control_interno.hallazgo USING btree (estado);


--
-- Name: idx_hallazgo_gravedad; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_hallazgo_gravedad ON control_interno.hallazgo USING btree (gravedad);


--
-- Name: idx_historial_accion; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_historial_accion ON control_interno.historial_generacion_informe USING btree (accion);


--
-- Name: idx_historial_auditoria; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_historial_auditoria ON control_interno.historial_auditoria USING btree (auditoria_id);


--
-- Name: idx_historial_cambios_gin; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_historial_cambios_gin ON control_interno.historial_auditoria USING gin (cambios);


--
-- Name: idx_historial_entrega; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_historial_entrega ON control_interno.historial_generacion_informe USING btree (entrega_id);


--
-- Name: idx_historial_fecha; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_historial_fecha ON control_interno.historial_auditoria USING btree (fecha DESC, hora DESC);


--
-- Name: idx_historial_plan_anual_fecha; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_historial_plan_anual_fecha ON control_interno.historial_plan_anual USING btree (fecha, hora);


--
-- Name: idx_historial_plan_anual_plan; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_historial_plan_anual_plan ON control_interno.historial_plan_anual USING btree (plan_id);


--
-- Name: idx_historial_plan_anual_tipo; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_historial_plan_anual_tipo ON control_interno.historial_plan_anual USING btree (tipo_evento);


--
-- Name: idx_historial_plan_anual_usuario; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_historial_plan_anual_usuario ON control_interno.historial_plan_anual USING btree (usuario_id);


--
-- Name: idx_historial_plan_cambios_gin; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_historial_plan_cambios_gin ON control_interno.historial_plan_anual USING gin (cambios);


--
-- Name: idx_historial_tipo; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_historial_tipo ON control_interno.historial_auditoria USING btree (tipo_evento);


--
-- Name: idx_historial_usuario; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_historial_usuario ON control_interno.historial_auditoria USING btree (usuario_id);


--
-- Name: idx_informe_ley_codigo; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_informe_ley_codigo ON control_interno.informe_ley USING btree (codigo);


--
-- Name: idx_informe_ley_estado; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_informe_ley_estado ON control_interno.informe_ley USING btree (estado);


--
-- Name: idx_informe_ley_vencimiento; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_informe_ley_vencimiento ON control_interno.informe_ley USING btree (fecha_vencimiento);


--
-- Name: idx_integraciones_activa; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_integraciones_activa ON control_interno.integraciones_esap USING btree (activa);


--
-- Name: idx_integraciones_tipo; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_integraciones_tipo ON control_interno.integraciones_esap USING btree (tipo);


--
-- Name: idx_item_lista_chequeo_lista; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_item_lista_chequeo_lista ON control_interno.item_lista_chequeo USING btree (lista_chequeo_id);


--
-- Name: idx_item_seccion; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_item_seccion ON control_interno.item_lista_chequeo USING btree (seccion_id);


--
-- Name: idx_lista_aplicada_auditoria; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_lista_aplicada_auditoria ON control_interno.lista_aplicada USING btree (auditoria_id);


--
-- Name: idx_lista_aplicada_fecha; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_lista_aplicada_fecha ON control_interno.lista_aplicada USING btree (fecha_aplicacion DESC);


--
-- Name: idx_lista_chequeo_codigo; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_lista_chequeo_codigo ON control_interno.lista_chequeo USING btree (codigo);


--
-- Name: idx_lista_chequeo_estado; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_lista_chequeo_estado ON control_interno.lista_chequeo USING btree (estado);


--
-- Name: idx_lista_chequeo_tipo; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_lista_chequeo_tipo ON control_interno.lista_chequeo USING btree (tipo);


--
-- Name: idx_logs_accion; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_logs_accion ON control_interno.logs_auditoria_esap USING btree (accion);


--
-- Name: idx_logs_created; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_logs_created ON control_interno.logs_auditoria_esap USING btree (created_at DESC);


--
-- Name: idx_logs_entidad; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_logs_entidad ON control_interno.logs_auditoria_esap USING btree (entidad);


--
-- Name: idx_logs_usuario; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_logs_usuario ON control_interno.logs_auditoria_esap USING btree (usuario_id);


--
-- Name: idx_normatividad_activo; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_normatividad_activo ON control_interno.normatividad_aplicable USING btree (activo);


--
-- Name: idx_normatividad_auditoria; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_normatividad_auditoria ON control_interno.normatividad_aplicable USING btree (auditoria_id);


--
-- Name: idx_nota_auditoria; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_nota_auditoria ON control_interno.nota_auditoria USING btree (auditoria_id);


--
-- Name: idx_nota_autor; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_nota_autor ON control_interno.nota_auditoria USING btree (autor_id);


--
-- Name: idx_nota_categoria; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_nota_categoria ON control_interno.nota_auditoria USING btree (categoria);


--
-- Name: idx_nota_fecha; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_nota_fecha ON control_interno.nota_auditoria USING btree (fecha DESC);


--
-- Name: idx_nota_fecha_hora; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_nota_fecha_hora ON control_interno.nota_auditoria USING btree (fecha DESC, hora DESC);


--
-- Name: idx_nota_importante; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_nota_importante ON control_interno.nota_auditoria USING btree (importante) WHERE (importante = true);


--
-- Name: idx_notificacion_created; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_notificacion_created ON control_interno.notificacion USING btree (created_at);


--
-- Name: idx_notificacion_estado; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_notificacion_estado ON control_interno.notificacion USING btree (estado);


--
-- Name: idx_notificacion_tipo; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_notificacion_tipo ON control_interno.notificacion USING btree (tipo_notificacion);


--
-- Name: idx_notificacion_usuario; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_notificacion_usuario ON control_interno.notificacion USING btree (usuario_id);


--
-- Name: idx_objetivo_auditoria; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_objetivo_auditoria ON control_interno.objetivo_auditoria USING btree (auditoria_id);


--
-- Name: idx_objetivo_auditoria_activo; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_objetivo_auditoria_activo ON control_interno.objetivo_auditoria USING btree (activo);


--
-- Name: idx_parametro_categoria; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_parametro_categoria ON control_interno.parametro_sistema USING btree (categoria);


--
-- Name: idx_parametro_clave; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_parametro_clave ON control_interno.parametro_sistema USING btree (clave);


--
-- Name: idx_paso_numero; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_paso_numero ON control_interno.paso_workflow_informe USING btree (workflow_id, numero_paso);


--
-- Name: idx_paso_workflow; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_paso_workflow ON control_interno.paso_workflow_informe USING btree (workflow_id);


--
-- Name: idx_plan_anual_5_roles_ano; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_plan_anual_5_roles_ano ON control_interno.plan_anual_5_roles USING btree (ano);


--
-- Name: idx_plan_anual_5_roles_estado; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_plan_anual_5_roles_estado ON control_interno.plan_anual_5_roles USING btree (estado);


--
-- Name: idx_plan_anual_año; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX "idx_plan_anual_año" ON control_interno.plan_anual USING btree ("año");


--
-- Name: idx_plan_anual_estado; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_plan_anual_estado ON control_interno.plan_anual USING btree (estado);


--
-- Name: idx_plan_individual_auditoria; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_plan_individual_auditoria ON control_interno.plan_individual USING btree (auditoria_id);


--
-- Name: idx_plan_individual_estado; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_plan_individual_estado ON control_interno.plan_individual USING btree (estado);


--
-- Name: idx_plan_mejoramiento_estado; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_plan_mejoramiento_estado ON control_interno.plan_mejoramiento USING btree (estado);


--
-- Name: idx_plan_mejoramiento_hallazgo; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_plan_mejoramiento_hallazgo ON control_interno.plan_mejoramiento USING btree (hallazgo_id);


--
-- Name: idx_plantilla_activa; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_plantilla_activa ON control_interno.plantilla_email USING btree (activa);


--
-- Name: idx_plantilla_codigo; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_plantilla_codigo ON control_interno.plantilla_email USING btree (codigo);


--
-- Name: idx_plantilla_tipo; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_plantilla_tipo ON control_interno.plantilla_reporte USING btree (tipo);


--
-- Name: idx_plantillas_activa; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_plantillas_activa ON control_interno.plantillas_documentos_esap USING btree (activa);


--
-- Name: idx_plantillas_codigo; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_plantillas_codigo ON control_interno.plantillas_documentos_esap USING btree (codigo);


--
-- Name: idx_plantillas_tipo; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_plantillas_tipo ON control_interno.plantillas_documentos_esap USING btree (tipo_documento);


--
-- Name: idx_preferencia_usuario; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_preferencia_usuario ON control_interno.preferencia_notificacion USING btree (usuario_id);


--
-- Name: idx_proceso_auditable_codigo; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_proceso_auditable_codigo ON control_interno.proceso_auditable USING btree (codigo);


--
-- Name: idx_proceso_auditable_macroproceso; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_proceso_auditable_macroproceso ON control_interno.proceso_auditable USING btree (macroproceso);


--
-- Name: idx_proceso_auditable_prioridad; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_proceso_auditable_prioridad ON control_interno.proceso_auditable USING btree (prioridad DESC);


--
-- Name: idx_proceso_auditable_tipo; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_proceso_auditable_tipo ON control_interno.proceso_auditable USING btree (tipo);


--
-- Name: idx_registro_seguimiento_accion; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_registro_seguimiento_accion ON control_interno.registro_seguimiento USING btree (accion_id);


--
-- Name: idx_registro_seguimiento_seguimiento; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_registro_seguimiento_seguimiento ON control_interno.registro_seguimiento USING btree (seguimiento_id);


--
-- Name: idx_reunion_auditoria; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_reunion_auditoria ON control_interno.reunion_apertura USING btree (auditoria_id);


--
-- Name: idx_reunion_fecha; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_reunion_fecha ON control_interno.reunion_apertura USING btree (fecha);


--
-- Name: idx_rol_codigo; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_rol_codigo ON control_interno.rol_decreto_648 USING btree (codigo);


--
-- Name: idx_rol_plan; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_rol_plan ON control_interno.rol_plan_anual USING btree (plan_id);


--
-- Name: idx_rol_plan_5_plan; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_rol_plan_5_plan ON control_interno.rol_plan_anual_5 USING btree (plan_id);


--
-- Name: idx_rol_template_numero; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_rol_template_numero ON control_interno.rol_decreto_648_template USING btree (rol_numero);


--
-- Name: idx_rol_tipo; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_rol_tipo ON control_interno.rol_plan_anual USING btree (tipo);


--
-- Name: idx_seccion_lista; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_seccion_lista ON control_interno.seccion_lista_chequeo USING btree (lista_id);


--
-- Name: idx_seguimiento_plan; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_seguimiento_plan ON control_interno.seguimiento_plan_mejoramiento USING btree (plan_id);


--
-- Name: idx_seguimiento_trimestral_plan; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_seguimiento_trimestral_plan ON control_interno.seguimiento_trimestral USING btree (plan_id);


--
-- Name: idx_seguimiento_trimestral_trimestre; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_seguimiento_trimestral_trimestre ON control_interno.seguimiento_trimestral USING btree (trimestre, "año");


--
-- Name: idx_sesiones_activa; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_sesiones_activa ON control_interno.sesiones_esap USING btree (activa);


--
-- Name: idx_sesiones_expiracion; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_sesiones_expiracion ON control_interno.sesiones_esap USING btree (fecha_expiracion);


--
-- Name: idx_sesiones_token; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_sesiones_token ON control_interno.sesiones_esap USING btree (token);


--
-- Name: idx_sesiones_usuario; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_sesiones_usuario ON control_interno.sesiones_esap USING btree (usuario_id);


--
-- Name: idx_tablero_kanban_activo; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_tablero_kanban_activo ON control_interno.tablero_kanban USING btree (activo);


--
-- Name: idx_tablero_kanban_deleted_at; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_tablero_kanban_deleted_at ON control_interno.tablero_kanban USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_tablero_kanban_tipo; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_tablero_kanban_tipo ON control_interno.tablero_kanban USING btree (tipo);


--
-- Name: idx_territorial_auditoria; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_territorial_auditoria ON control_interno.auditoria_territorial_info USING btree (auditoria_id);


--
-- Name: idx_territorial_ciudad; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_territorial_ciudad ON control_interno.auditoria_territorial_info USING btree (ciudad);


--
-- Name: idx_territorial_departamento; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_territorial_departamento ON control_interno.auditoria_territorial_info USING btree (departamento);


--
-- Name: idx_tipo_auditoria_codigo; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_tipo_auditoria_codigo ON control_interno.tipo_auditoria USING btree (codigo);


--
-- Name: idx_usuarios_esap_activo; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_usuarios_esap_activo ON control_interno.usuarios_esap USING btree (activo);


--
-- Name: idx_usuarios_esap_codigo; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_usuarios_esap_codigo ON control_interno.usuarios_esap USING btree (codigo);


--
-- Name: idx_usuarios_esap_email; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_usuarios_esap_email ON control_interno.usuarios_esap USING btree (email);


--
-- Name: idx_version_lista; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_version_lista ON control_interno.version_lista_chequeo USING btree (lista_id);


--
-- Name: idx_workflow_entrega; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_workflow_entrega ON control_interno.workflow_aprobacion_informe USING btree (entrega_id);


--
-- Name: idx_workflow_estado; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE INDEX idx_workflow_estado ON control_interno.workflow_aprobacion_informe USING btree (estado_workflow);


--
-- Name: uq_equipo_auditor_persona_activo; Type: INDEX; Schema: control_interno; Owner: -
--

CREATE UNIQUE INDEX uq_equipo_auditor_persona_activo ON control_interno.equipo_auditor USING btree (auditoria_id, persona_id) WHERE (activo = true);


--
-- Name: accion_correctiva trg_evento_actualizacion_accion; Type: TRIGGER; Schema: control_interno; Owner: -
--

CREATE TRIGGER trg_evento_actualizacion_accion AFTER UPDATE ON control_interno.accion_correctiva FOR EACH ROW WHEN (((old.porcentaje_avance IS DISTINCT FROM new.porcentaje_avance) OR ((old.estado)::text IS DISTINCT FROM (new.estado)::text) OR (old.descripcion IS DISTINCT FROM new.descripcion))) EXECUTE FUNCTION control_interno.trigger_evento_actualizacion_accion();


--
-- Name: plan_mejoramiento trg_evento_actualizacion_plan; Type: TRIGGER; Schema: control_interno; Owner: -
--

CREATE TRIGGER trg_evento_actualizacion_plan AFTER UPDATE ON control_interno.plan_mejoramiento FOR EACH ROW WHEN (((old.estado)::text IS DISTINCT FROM (new.estado)::text)) EXECUTE FUNCTION control_interno.trigger_evento_actualizacion_plan();


--
-- Name: accion_correctiva trg_evento_creacion_accion; Type: TRIGGER; Schema: control_interno; Owner: -
--

CREATE TRIGGER trg_evento_creacion_accion AFTER INSERT ON control_interno.accion_correctiva FOR EACH ROW EXECUTE FUNCTION control_interno.trigger_evento_creacion_accion();


--
-- Name: plan_mejoramiento trg_evento_creacion_plan; Type: TRIGGER; Schema: control_interno; Owner: -
--

CREATE TRIGGER trg_evento_creacion_plan AFTER INSERT ON control_interno.plan_mejoramiento FOR EACH ROW EXECUTE FUNCTION control_interno.trigger_evento_creacion_plan();


--
-- Name: evidencia_documento trg_generar_codigo_evidencia; Type: TRIGGER; Schema: control_interno; Owner: -
--

CREATE TRIGGER trg_generar_codigo_evidencia BEFORE INSERT ON control_interno.evidencia_documento FOR EACH ROW WHEN (((new.codigo IS NULL) OR ((new.codigo)::text = ''::text))) EXECUTE FUNCTION control_interno.generar_codigo_evidencia();


--
-- Name: auditoria trg_registrar_cambio_estado_auditoria; Type: TRIGGER; Schema: control_interno; Owner: -
--

CREATE TRIGGER trg_registrar_cambio_estado_auditoria AFTER UPDATE ON control_interno.auditoria FOR EACH ROW EXECUTE FUNCTION control_interno.fn_registrar_cambio_estado_auditoria();


--
-- Name: plan_anual_5_roles trg_registrar_cambio_estado_plan_anual; Type: TRIGGER; Schema: control_interno; Owner: -
--

CREATE TRIGGER trg_registrar_cambio_estado_plan_anual AFTER UPDATE ON control_interno.plan_anual_5_roles FOR EACH ROW EXECUTE FUNCTION control_interno.fn_registrar_cambio_estado_plan_anual();


--
-- Name: actividad_proceso_auditoria trigger_actualizar_actividades; Type: TRIGGER; Schema: control_interno; Owner: -
--

CREATE TRIGGER trigger_actualizar_actividades AFTER INSERT OR UPDATE OF estado ON control_interno.actividad_proceso_auditoria FOR EACH ROW EXECUTE FUNCTION control_interno.actualizar_actividades_auditoria();


--
-- Name: documento trigger_actualizar_contadores_documentos; Type: TRIGGER; Schema: control_interno; Owner: -
--

CREATE TRIGGER trigger_actualizar_contadores_documentos AFTER INSERT OR DELETE OR UPDATE OF auditoria_id, tipo_documento ON control_interno.documento FOR EACH ROW EXECUTE FUNCTION control_interno.actualizar_contadores_documentos_informes();


--
-- Name: TRIGGER trigger_actualizar_contadores_documentos ON documento; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON TRIGGER trigger_actualizar_contadores_documentos ON control_interno.documento IS 'Trigger que actualiza los contadores de documentos e informes en la auditoría asociada';


--
-- Name: auditoria trigger_calcular_metricas_auditoria; Type: TRIGGER; Schema: control_interno; Owner: -
--

CREATE TRIGGER trigger_calcular_metricas_auditoria BEFORE INSERT OR UPDATE OF fecha_inicio, fecha_fin ON control_interno.auditoria FOR EACH ROW EXECUTE FUNCTION control_interno.calcular_metricas_auditoria();


--
-- Name: ampliacion_plazo trigger_update_ampliacion_plazo_timestamp; Type: TRIGGER; Schema: control_interno; Owner: -
--

CREATE TRIGGER trigger_update_ampliacion_plazo_timestamp BEFORE UPDATE ON control_interno.ampliacion_plazo FOR EACH ROW EXECUTE FUNCTION control_interno.update_ampliacion_plazo_timestamp();


--
-- Name: item_lista_chequeo trigger_update_item_lista_chequeo_updated_at; Type: TRIGGER; Schema: control_interno; Owner: -
--

CREATE TRIGGER trigger_update_item_lista_chequeo_updated_at BEFORE UPDATE ON control_interno.item_lista_chequeo FOR EACH ROW EXECUTE FUNCTION control_interno.update_lista_chequeo_updated_at();


--
-- Name: lista_chequeo trigger_update_lista_chequeo_updated_at; Type: TRIGGER; Schema: control_interno; Owner: -
--

CREATE TRIGGER trigger_update_lista_chequeo_updated_at BEFORE UPDATE ON control_interno.lista_chequeo FOR EACH ROW EXECUTE FUNCTION control_interno.update_lista_chequeo_updated_at();


--
-- Name: tipo_auditoria trigger_update_tipo_auditoria_updated_at; Type: TRIGGER; Schema: control_interno; Owner: -
--

CREATE TRIGGER trigger_update_tipo_auditoria_updated_at BEFORE UPDATE ON control_interno.tipo_auditoria FOR EACH ROW EXECUTE FUNCTION control_interno.update_tipo_auditoria_updated_at();


--
-- Name: auditoria auditoria_auditor_asignado_id_fkey; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.auditoria
    ADD CONSTRAINT auditoria_auditor_asignado_id_fkey FOREIGN KEY (auditor_asignado_id) REFERENCES auth.personas(id_tercero);


--
-- Name: auditoria auditoria_auditor_lider_id_fkey; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.auditoria
    ADD CONSTRAINT auditoria_auditor_lider_id_fkey FOREIGN KEY (auditor_lider_id) REFERENCES auth.personas(id_tercero);


--
-- Name: auditoria auditoria_supervisor_asignado_id_fkey; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.auditoria
    ADD CONSTRAINT auditoria_supervisor_asignado_id_fkey FOREIGN KEY (supervisor_asignado_id) REFERENCES auth.personas(id_tercero);


--
-- Name: etapa_kanban etapa_kanban_tablero_kanban_id_fkey; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.etapa_kanban
    ADD CONSTRAINT etapa_kanban_tablero_kanban_id_fkey FOREIGN KEY (tablero_kanban_id) REFERENCES control_interno.tablero_kanban(id) ON DELETE CASCADE;


--
-- Name: accion_correctiva fk_accion_correctiva_plan; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.accion_correctiva
    ADD CONSTRAINT fk_accion_correctiva_plan FOREIGN KEY (plan_id) REFERENCES control_interno.plan_mejoramiento(id) ON DELETE CASCADE;


--
-- Name: accion_mejora fk_accion_plan_mejoramiento; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.accion_mejora
    ADD CONSTRAINT fk_accion_plan_mejoramiento FOREIGN KEY (plan_mejoramiento_id) REFERENCES control_interno.plan_mejoramiento(id) ON DELETE CASCADE;


--
-- Name: actividad_proceso_auditoria fk_actividad_auditoria; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.actividad_proceso_auditoria
    ADD CONSTRAINT fk_actividad_auditoria FOREIGN KEY (auditoria_id) REFERENCES control_interno.auditoria(id) ON DELETE CASCADE;


--
-- Name: actividad_proceso_auditoria fk_actividad_completada_por; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.actividad_proceso_auditoria
    ADD CONSTRAINT fk_actividad_completada_por FOREIGN KEY (completada_por_id) REFERENCES auth.personas(id_tercero) ON DELETE SET NULL;


--
-- Name: actividad_etapa_auditoria fk_actividad_etapa; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.actividad_etapa_auditoria
    ADD CONSTRAINT fk_actividad_etapa FOREIGN KEY (etapa_id) REFERENCES control_interno.etapa_auditoria(id) ON DELETE CASCADE;


--
-- Name: actividad_rol fk_actividad_rol; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.actividad_rol
    ADD CONSTRAINT fk_actividad_rol FOREIGN KEY (rol_id) REFERENCES control_interno.rol_decreto_648(id) ON DELETE CASCADE;


--
-- Name: actividad_plan_anual_5 fk_actividad_rol_5; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.actividad_plan_anual_5
    ADD CONSTRAINT fk_actividad_rol_5 FOREIGN KEY (rol_id) REFERENCES control_interno.rol_plan_anual_5(id) ON DELETE CASCADE;


--
-- Name: ampliacion_plazo fk_ampliacion_auditoria; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.ampliacion_plazo
    ADD CONSTRAINT fk_ampliacion_auditoria FOREIGN KEY (auditoria_id) REFERENCES control_interno.auditoria(id) ON DELETE CASCADE;


--
-- Name: auditor_perfil fk_auditor_perfil_persona; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.auditor_perfil
    ADD CONSTRAINT fk_auditor_perfil_persona FOREIGN KEY (persona_id) REFERENCES auth.personas(id_tercero) ON DELETE CASCADE;


--
-- Name: auditoria fk_auditoria_auditor_asignado; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.auditoria
    ADD CONSTRAINT fk_auditoria_auditor_asignado FOREIGN KEY (auditor_asignado_id) REFERENCES auth.personas(id_tercero) ON DELETE SET NULL;


--
-- Name: auditoria fk_auditoria_auditor_lider; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.auditoria
    ADD CONSTRAINT fk_auditoria_auditor_lider FOREIGN KEY (auditor_lider_id) REFERENCES auth.personas(id_tercero) ON DELETE SET NULL;


--
-- Name: auditoria_gestion fk_auditoria_gestion_programada; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.auditoria_gestion
    ADD CONSTRAINT fk_auditoria_gestion_programada FOREIGN KEY (auditoria_programada_id) REFERENCES control_interno.auditoria_programada(id) ON DELETE SET NULL;


--
-- Name: auditoria_programada fk_auditoria_proceso; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.auditoria_programada
    ADD CONSTRAINT fk_auditoria_proceso FOREIGN KEY (proceso_id) REFERENCES control_interno.proceso_auditable(id) ON DELETE RESTRICT;


--
-- Name: auditoria fk_auditoria_supervisor_asignado; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.auditoria
    ADD CONSTRAINT fk_auditoria_supervisor_asignado FOREIGN KEY (supervisor_asignado_id) REFERENCES auth.personas(id_tercero) ON DELETE SET NULL;


--
-- Name: criterio_auditoria fk_criterio_auditoria; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.criterio_auditoria
    ADD CONSTRAINT fk_criterio_auditoria FOREIGN KEY (auditoria_id) REFERENCES control_interno.auditoria(id) ON DELETE CASCADE;


--
-- Name: cronograma_fase_auditoria fk_cronograma_auditoria; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.cronograma_fase_auditoria
    ADD CONSTRAINT fk_cronograma_auditoria FOREIGN KEY (auditoria_id) REFERENCES control_interno.auditoria(id) ON DELETE CASCADE;


--
-- Name: cronograma_auditoria fk_cronograma_plan; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.cronograma_auditoria
    ADD CONSTRAINT fk_cronograma_plan FOREIGN KEY (plan_id) REFERENCES control_interno.plan_anual(id) ON DELETE CASCADE;


--
-- Name: datos_automaticos_informe fk_datos_entrega; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.datos_automaticos_informe
    ADD CONSTRAINT fk_datos_entrega FOREIGN KEY (entrega_id) REFERENCES control_interno.entrega_informe_ley(id) ON DELETE CASCADE;


--
-- Name: documento_aprobacion fk_doc_aprobacion; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.documento_aprobacion
    ADD CONSTRAINT fk_doc_aprobacion FOREIGN KEY (aprobacion_id) REFERENCES control_interno.aprobacion(id) ON DELETE CASCADE;


--
-- Name: documento_aprobacion fk_doc_aprobacion_doc; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.documento_aprobacion
    ADD CONSTRAINT fk_doc_aprobacion_doc FOREIGN KEY (documento_id) REFERENCES control_interno.documento(id) ON DELETE SET NULL;


--
-- Name: documento fk_documento_auditoria; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.documento
    ADD CONSTRAINT fk_documento_auditoria FOREIGN KEY (auditoria_id) REFERENCES control_interno.auditoria(id) ON DELETE SET NULL;


--
-- Name: CONSTRAINT fk_documento_auditoria ON documento; Type: COMMENT; Schema: control_interno; Owner: -
--

COMMENT ON CONSTRAINT fk_documento_auditoria ON control_interno.documento IS 'Foreign key que relaciona el documento con la auditoría. Permite NULL para documentos que no están asociados a una auditoría específica.';


--
-- Name: documento fk_documento_version; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.documento
    ADD CONSTRAINT fk_documento_version FOREIGN KEY (version_anterior_id) REFERENCES control_interno.documento(id) ON DELETE SET NULL;


--
-- Name: entrega_informe_ley fk_entrega_informe; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.entrega_informe_ley
    ADD CONSTRAINT fk_entrega_informe FOREIGN KEY (informe_id) REFERENCES control_interno.informe_ley(id) ON DELETE CASCADE;


--
-- Name: equipo_auditor fk_equipo_auditoria; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.equipo_auditor
    ADD CONSTRAINT fk_equipo_auditoria FOREIGN KEY (auditoria_id) REFERENCES control_interno.auditoria(id) ON DELETE CASCADE;


--
-- Name: equipo_auditor fk_equipo_persona; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.equipo_auditor
    ADD CONSTRAINT fk_equipo_persona FOREIGN KEY (persona_id) REFERENCES auth.personas(id_tercero) ON DELETE RESTRICT;


--
-- Name: auditoria_especial_info fk_especial_aprobado_por; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.auditoria_especial_info
    ADD CONSTRAINT fk_especial_aprobado_por FOREIGN KEY (aprobado_por_id) REFERENCES auth.personas(id_tercero) ON DELETE SET NULL;


--
-- Name: auditoria_especial_info fk_especial_auditoria; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.auditoria_especial_info
    ADD CONSTRAINT fk_especial_auditoria FOREIGN KEY (auditoria_id) REFERENCES control_interno.auditoria(id) ON DELETE CASCADE;


--
-- Name: etapa_auditoria fk_etapa_auditoria; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.etapa_auditoria
    ADD CONSTRAINT fk_etapa_auditoria FOREIGN KEY (auditoria_id) REFERENCES control_interno.auditoria_programada(id) ON DELETE CASCADE;


--
-- Name: eventos_timeline fk_evento_plan_mejoramiento; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.eventos_timeline
    ADD CONSTRAINT fk_evento_plan_mejoramiento FOREIGN KEY (plan_mejoramiento_id) REFERENCES control_interno.plan_mejoramiento(id) ON DELETE CASCADE;


--
-- Name: evidencia_documento fk_evidencia_accion; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.evidencia_documento
    ADD CONSTRAINT fk_evidencia_accion FOREIGN KEY (accion_correctiva_id) REFERENCES control_interno.accion_correctiva(id) ON DELETE CASCADE;


--
-- Name: evidencia_documento fk_evidencia_auditoria; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.evidencia_documento
    ADD CONSTRAINT fk_evidencia_auditoria FOREIGN KEY (auditoria_id) REFERENCES control_interno.auditoria(id) ON DELETE SET NULL;


--
-- Name: evidencia_documento fk_evidencia_hallazgo; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.evidencia_documento
    ADD CONSTRAINT fk_evidencia_hallazgo FOREIGN KEY (hallazgo_id) REFERENCES control_interno.hallazgo(id) ON DELETE CASCADE;


--
-- Name: evidencia_documento fk_evidencia_plan; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.evidencia_documento
    ADD CONSTRAINT fk_evidencia_plan FOREIGN KEY (plan_mejoramiento_id) REFERENCES control_interno.plan_mejoramiento(id) ON DELETE CASCADE;


--
-- Name: evidencia_documento fk_evidencia_version; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.evidencia_documento
    ADD CONSTRAINT fk_evidencia_version FOREIGN KEY (version_anterior_id) REFERENCES control_interno.evidencia_documento(id) ON DELETE SET NULL;


--
-- Name: hallazgo fk_hallazgo_auditoria; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.hallazgo
    ADD CONSTRAINT fk_hallazgo_auditoria FOREIGN KEY (auditoria_id) REFERENCES control_interno.auditoria(id) ON DELETE SET NULL;


--
-- Name: historial_auditoria fk_historial_auditoria; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.historial_auditoria
    ADD CONSTRAINT fk_historial_auditoria FOREIGN KEY (auditoria_id) REFERENCES control_interno.auditoria(id) ON DELETE CASCADE;


--
-- Name: historial_auditoria fk_historial_auditoria_usuario; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.historial_auditoria
    ADD CONSTRAINT fk_historial_auditoria_usuario FOREIGN KEY (usuario_id) REFERENCES auth.personas(id_tercero) ON DELETE SET NULL;


--
-- Name: historial_generacion_informe fk_historial_entrega; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.historial_generacion_informe
    ADD CONSTRAINT fk_historial_entrega FOREIGN KEY (entrega_id) REFERENCES control_interno.entrega_informe_ley(id) ON DELETE CASCADE;


--
-- Name: historial_plan_anual fk_historial_plan_anual; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.historial_plan_anual
    ADD CONSTRAINT fk_historial_plan_anual FOREIGN KEY (plan_id) REFERENCES control_interno.plan_anual_5_roles(id) ON DELETE CASCADE;


--
-- Name: historial_plan_anual fk_historial_plan_usuario; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.historial_plan_anual
    ADD CONSTRAINT fk_historial_plan_usuario FOREIGN KEY (usuario_id) REFERENCES auth.personas(id_tercero) ON DELETE RESTRICT;


--
-- Name: item_lista_chequeo fk_item_lista_chequeo; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.item_lista_chequeo
    ADD CONSTRAINT fk_item_lista_chequeo FOREIGN KEY (lista_chequeo_id) REFERENCES control_interno.lista_chequeo(id) ON DELETE CASCADE;


--
-- Name: item_lista_chequeo fk_item_seccion; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.item_lista_chequeo
    ADD CONSTRAINT fk_item_seccion FOREIGN KEY (seccion_id) REFERENCES control_interno.seccion_lista_chequeo(id) ON DELETE SET NULL;


--
-- Name: logs_auditoria_esap fk_log_usuario; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.logs_auditoria_esap
    ADD CONSTRAINT fk_log_usuario FOREIGN KEY (usuario_id) REFERENCES control_interno.usuarios_esap(id) ON DELETE SET NULL;


--
-- Name: normatividad_aplicable fk_normatividad_auditoria; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.normatividad_aplicable
    ADD CONSTRAINT fk_normatividad_auditoria FOREIGN KEY (auditoria_id) REFERENCES control_interno.auditoria(id) ON DELETE CASCADE;


--
-- Name: nota_auditoria fk_nota_auditoria; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.nota_auditoria
    ADD CONSTRAINT fk_nota_auditoria FOREIGN KEY (auditoria_id) REFERENCES control_interno.auditoria(id) ON DELETE CASCADE;


--
-- Name: nota_auditoria fk_nota_autor; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.nota_auditoria
    ADD CONSTRAINT fk_nota_autor FOREIGN KEY (autor_id) REFERENCES auth.personas(id_tercero) ON DELETE RESTRICT;


--
-- Name: nota_auditoria fk_nota_editor; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.nota_auditoria
    ADD CONSTRAINT fk_nota_editor FOREIGN KEY (editor_id) REFERENCES auth.personas(id_tercero) ON DELETE SET NULL;


--
-- Name: objetivo_auditoria fk_objetivo_auditoria; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.objetivo_auditoria
    ADD CONSTRAINT fk_objetivo_auditoria FOREIGN KEY (auditoria_id) REFERENCES control_interno.auditoria(id) ON DELETE CASCADE;


--
-- Name: paso_workflow_informe fk_paso_workflow; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.paso_workflow_informe
    ADD CONSTRAINT fk_paso_workflow FOREIGN KEY (workflow_id) REFERENCES control_interno.workflow_aprobacion_informe(id) ON DELETE CASCADE;


--
-- Name: plan_individual fk_plan_individual_auditoria; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.plan_individual
    ADD CONSTRAINT fk_plan_individual_auditoria FOREIGN KEY (auditoria_id) REFERENCES control_interno.auditoria_programada(id) ON DELETE RESTRICT;


--
-- Name: plan_mejoramiento fk_plan_mejoramiento_auditoria; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.plan_mejoramiento
    ADD CONSTRAINT fk_plan_mejoramiento_auditoria FOREIGN KEY (auditoria_id) REFERENCES control_interno.auditoria(id) ON DELETE SET NULL;


--
-- Name: plan_mejoramiento fk_plan_mejoramiento_hallazgo; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.plan_mejoramiento
    ADD CONSTRAINT fk_plan_mejoramiento_hallazgo FOREIGN KEY (hallazgo_id) REFERENCES control_interno.hallazgo(id) ON DELETE SET NULL;


--
-- Name: registro_seguimiento fk_registro_seguimiento_accion; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.registro_seguimiento
    ADD CONSTRAINT fk_registro_seguimiento_accion FOREIGN KEY (accion_id) REFERENCES control_interno.accion_correctiva(id) ON DELETE CASCADE;


--
-- Name: registro_seguimiento fk_registro_seguimiento_seguimiento; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.registro_seguimiento
    ADD CONSTRAINT fk_registro_seguimiento_seguimiento FOREIGN KEY (seguimiento_id) REFERENCES control_interno.seguimiento_trimestral(id) ON DELETE CASCADE;


--
-- Name: reunion_apertura fk_reunion_auditoria; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.reunion_apertura
    ADD CONSTRAINT fk_reunion_auditoria FOREIGN KEY (auditoria_id) REFERENCES control_interno.auditoria(id) ON DELETE CASCADE;


--
-- Name: rol_plan_anual fk_rol_plan; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.rol_plan_anual
    ADD CONSTRAINT fk_rol_plan FOREIGN KEY (plan_id) REFERENCES control_interno.plan_anual(id) ON DELETE CASCADE;


--
-- Name: seccion_lista_chequeo fk_seccion_lista; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.seccion_lista_chequeo
    ADD CONSTRAINT fk_seccion_lista FOREIGN KEY (lista_id) REFERENCES control_interno.lista_chequeo(id) ON DELETE CASCADE;


--
-- Name: seguimiento_plan_mejoramiento fk_seguimiento_plan; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.seguimiento_plan_mejoramiento
    ADD CONSTRAINT fk_seguimiento_plan FOREIGN KEY (plan_id) REFERENCES control_interno.plan_mejoramiento(id) ON DELETE CASCADE;


--
-- Name: seguimiento_trimestral fk_seguimiento_trimestral_plan; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.seguimiento_trimestral
    ADD CONSTRAINT fk_seguimiento_trimestral_plan FOREIGN KEY (plan_id) REFERENCES control_interno.plan_mejoramiento(id) ON DELETE CASCADE;


--
-- Name: sesiones_esap fk_sesion_usuario; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.sesiones_esap
    ADD CONSTRAINT fk_sesion_usuario FOREIGN KEY (usuario_id) REFERENCES control_interno.usuarios_esap(id) ON DELETE CASCADE;


--
-- Name: auditoria_territorial_info fk_territorial_auditoria; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.auditoria_territorial_info
    ADD CONSTRAINT fk_territorial_auditoria FOREIGN KEY (auditoria_id) REFERENCES control_interno.auditoria(id) ON DELETE CASCADE;


--
-- Name: version_lista_chequeo fk_version_lista; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.version_lista_chequeo
    ADD CONSTRAINT fk_version_lista FOREIGN KEY (lista_id) REFERENCES control_interno.lista_chequeo(id) ON DELETE CASCADE;


--
-- Name: workflow_aprobacion_informe fk_workflow_entrega; Type: FK CONSTRAINT; Schema: control_interno; Owner: -
--

ALTER TABLE ONLY control_interno.workflow_aprobacion_informe
    ADD CONSTRAINT fk_workflow_entrega FOREIGN KEY (entrega_id) REFERENCES control_interno.entrega_informe_ley(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

