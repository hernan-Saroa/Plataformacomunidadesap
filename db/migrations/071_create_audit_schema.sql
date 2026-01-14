-- ============================================
-- Migración: Crear Schema de Auditoría
-- Descripción: Crea el schema audit y la tabla request_logs
--              para registrar todas las peticiones HTTP del sistema
-- Fecha: 2025-01-XX
-- ============================================

-- Crear schema audit
CREATE SCHEMA IF NOT EXISTS audit;

-- Comentario del schema
COMMENT ON SCHEMA audit IS 'Schema para almacenar logs de auditoría de todas las peticiones HTTP del sistema';

-- ============================================
-- Tabla: request_logs (Particionada)
-- Descripción: Almacena todos los logs de peticiones HTTP
-- Particionamiento: Por rango de tiempo (mensual) para mejor rendimiento
-- ============================================

-- Tabla principal particionada
CREATE TABLE IF NOT EXISTS audit.request_logs (
    id UUID DEFAULT gen_random_uuid(),
    
    -- Información de la petición
    method VARCHAR(10) NOT NULL, -- GET, POST, PUT, DELETE, PATCH
    url TEXT NOT NULL,
    path TEXT NOT NULL,
    query_params JSONB,
    module VARCHAR(100), -- Módulo del sistema: auth, certificados, control-interno, etc.
    version VARCHAR(10), -- v1, v2, etc.
    
    -- Información del cliente
    ip_address VARCHAR(45), -- IPv4 o IPv6
    user_agent TEXT,
    origin TEXT,
    referer TEXT,
    
    -- Información del usuario (si está autenticado)
    user_id BIGINT,
    user_email VARCHAR(255),
    user_role VARCHAR(100),
    
    -- Información de la respuesta
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER NOT NULL,
    response_size_bytes INTEGER DEFAULT 0,
    
    -- Body de la petición (opcional, puede ser grande)
    request_body JSONB, -- Solo para peticiones pequeñas
    request_body_size INTEGER DEFAULT 0,
    has_large_body BOOLEAN DEFAULT FALSE,
    
    -- Body de la respuesta (opcional)
    response_body JSONB, -- Solo para respuestas pequeñas
    response_body_size INTEGER DEFAULT 0,
    has_large_response BOOLEAN DEFAULT FALSE,
    
    -- Información de errores
    error_message TEXT,
    error_stack TEXT,
    
    -- Metadatos
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Clave primaria (id único, timestamp usado solo para particionamiento)
    PRIMARY KEY (id, timestamp)
) PARTITION BY RANGE (timestamp);

-- Crear partición para el mes actual
CREATE TABLE IF NOT EXISTS audit.request_logs_current 
PARTITION OF audit.request_logs
FOR VALUES FROM (DATE_TRUNC('month', CURRENT_DATE)) 
TO (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month');

-- Crear partición para el mes siguiente (preventivo)
CREATE TABLE IF NOT EXISTS audit.request_logs_next_month 
PARTITION OF audit.request_logs
FOR VALUES FROM (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month') 
TO (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '2 months');

-- Crear partición para el mes anterior (por si hay datos históricos)
CREATE TABLE IF NOT EXISTS audit.request_logs_prev_month 
PARTITION OF audit.request_logs
FOR VALUES FROM (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month') 
TO (DATE_TRUNC('month', CURRENT_DATE));

-- Función para crear particiones automáticamente (se ejecuta mensualmente)
CREATE OR REPLACE FUNCTION audit.create_monthly_partition()
RETURNS void AS $$
DECLARE
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
BEGIN
    -- Crear partición para el mes actual si no existe
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
    
    -- Crear partición para el próximo mes si no existe
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
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION audit.create_monthly_partition IS 'Crea particiones mensuales para la tabla request_logs automáticamente';

-- Índices para optimizar consultas
-- Los índices en tablas particionadas se crean en la tabla principal y se propagan a las particiones
CREATE INDEX IF NOT EXISTS idx_request_logs_timestamp ON audit.request_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_request_logs_method ON audit.request_logs(method);
CREATE INDEX IF NOT EXISTS idx_request_logs_module ON audit.request_logs(module);
CREATE INDEX IF NOT EXISTS idx_request_logs_user_id ON audit.request_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_request_logs_ip ON audit.request_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_request_logs_status ON audit.request_logs(status_code);
CREATE INDEX IF NOT EXISTS idx_request_logs_timestamp_module ON audit.request_logs(timestamp DESC, module);
CREATE INDEX IF NOT EXISTS idx_request_logs_module_status ON audit.request_logs(module, status_code);

-- Índice GIN para búsquedas en JSONB
CREATE INDEX IF NOT EXISTS idx_request_logs_query_params ON audit.request_logs USING GIN (query_params);
CREATE INDEX IF NOT EXISTS idx_request_logs_request_body ON audit.request_logs USING GIN (request_body);
CREATE INDEX IF NOT EXISTS idx_request_logs_response_body ON audit.request_logs USING GIN (response_body);

-- Comentarios en la tabla y columnas
COMMENT ON TABLE audit.request_logs IS 'Registro de todas las peticiones HTTP del sistema para auditoría. Tabla particionada por mes.';
COMMENT ON COLUMN audit.request_logs.method IS 'Método HTTP: GET, POST, PUT, DELETE, PATCH';
COMMENT ON COLUMN audit.request_logs.url IS 'URL completa de la petición';
COMMENT ON COLUMN audit.request_logs.path IS 'Path de la petición sin query params';
COMMENT ON COLUMN audit.request_logs.module IS 'Módulo del sistema: auth, certificados, control-interno, legal, etc.';
COMMENT ON COLUMN audit.request_logs.version IS 'Versión de la API: v1, v2, etc.';
COMMENT ON COLUMN audit.request_logs.ip_address IS 'Dirección IP del cliente';
COMMENT ON COLUMN audit.request_logs.user_id IS 'ID del usuario autenticado (FK a auth.personas)';
COMMENT ON COLUMN audit.request_logs.status_code IS 'Código de estado HTTP de la respuesta';
COMMENT ON COLUMN audit.request_logs.response_time_ms IS 'Tiempo de respuesta en milisegundos';
COMMENT ON COLUMN audit.request_logs.has_large_body IS 'Indica si el body de la petición es grande (>10KB)';
COMMENT ON COLUMN audit.request_logs.has_large_response IS 'Indica si el body de la respuesta es grande (>10KB)';
COMMENT ON COLUMN audit.request_logs.timestamp IS 'Fecha y hora de la petición (usado para particionamiento)';

-- ============================================
-- Función para limpiar logs antiguos (elimina particiones completas)
-- ============================================
CREATE OR REPLACE FUNCTION audit.cleanup_old_logs(months_to_keep INTEGER DEFAULT 6)
RETURNS INTEGER AS $$
DECLARE
    deleted_partitions INTEGER := 0;
    partition_record RECORD;
    cutoff_date DATE;
BEGIN
    cutoff_date := DATE_TRUNC('month', CURRENT_DATE) - (months_to_keep || ' months')::INTERVAL;
    
    -- Encontrar y eliminar particiones antiguas
    FOR partition_record IN
        SELECT 
            schemaname,
            tablename
        FROM pg_tables
        WHERE schemaname = 'audit'
        AND tablename LIKE 'request_logs_%'
        AND tablename ~ '^request_logs_\d{4}_\d{2}$'
    LOOP
        -- Extraer fecha de la partición desde el nombre
        DECLARE
            partition_date DATE;
            date_str TEXT;
        BEGIN
            date_str := SUBSTRING(partition_record.tablename FROM 'request_logs_(\d{4}_\d{2})');
            IF date_str IS NOT NULL THEN
                partition_date := TO_DATE(date_str, 'YYYY_MM');
                
                -- Si la partición es más antigua que el cutoff, eliminarla
                IF partition_date < cutoff_date THEN
                    EXECUTE format('DROP TABLE IF EXISTS audit.%I', partition_record.tablename);
                    deleted_partitions := deleted_partitions + 1;
                END IF;
            END IF;
        END;
    END LOOP;
    
    RETURN deleted_partitions;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION audit.cleanup_old_logs IS 'Elimina particiones de logs más antiguas que el número de meses especificado (por defecto 6 meses). Retorna el número de particiones eliminadas.';

-- ============================================
-- Vista para estadísticas rápidas (opcional)
-- ============================================
CREATE OR REPLACE VIEW audit.request_logs_stats AS
SELECT 
    DATE_TRUNC('day', timestamp) as date,
    method,
    module,
    status_code,
    COUNT(*) as request_count,
    AVG(response_time_ms) as avg_response_time,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_time_ms) as median_response_time,
    MAX(response_time_ms) as max_response_time,
    MIN(response_time_ms) as min_response_time
FROM audit.request_logs
GROUP BY DATE_TRUNC('day', timestamp), method, module, status_code
ORDER BY date DESC, module, method;

COMMENT ON VIEW audit.request_logs_stats IS 'Vista agregada con estadísticas diarias de peticiones por módulo';

-- ============================================
-- Trigger para crear particiones automáticamente
-- Se ejecuta al insertar datos y verifica si existe la partición
-- ============================================
CREATE OR REPLACE FUNCTION audit.request_logs_partition_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Llamar a la función que crea particiones si es necesario
    PERFORM audit.create_monthly_partition();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger que se ejecuta antes de insertar (solo para verificar particiones)
-- Nota: PostgreSQL maneja automáticamente el routing a particiones,
-- pero este trigger asegura que la partición exista
CREATE TRIGGER trigger_create_partition_before_insert
BEFORE INSERT ON audit.request_logs
FOR EACH STATEMENT
EXECUTE FUNCTION audit.create_monthly_partition();

COMMENT ON TRIGGER trigger_create_partition_before_insert ON audit.request_logs IS 'Asegura que exista la partición necesaria antes de insertar datos';

