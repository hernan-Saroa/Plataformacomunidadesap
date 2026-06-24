CREATE SCHEMA IF NOT EXISTS audit;

COMMENT ON SCHEMA audit IS 'Schema para almacenar logs de auditoría de todas las peticiones HTTP del sistema';

CREATE TABLE IF NOT EXISTS audit.request_logs (
    id UUID DEFAULT gen_random_uuid(),
    
    method VARCHAR(10) NOT NULL,
    url TEXT NOT NULL,
    path TEXT NOT NULL,
    query_params JSONB,
    module VARCHAR(100),
    submodule VARCHAR(100),
    version VARCHAR(10),
    
    ip_address VARCHAR(45),
    user_agent TEXT,
    origin TEXT,
    referer TEXT,
    
    user_id BIGINT,
    user_email VARCHAR(255),
    user_role VARCHAR(100),
    
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER NOT NULL,
    response_size_bytes INTEGER DEFAULT 0,
    
    request_body JSONB,
    request_body_size INTEGER DEFAULT 0,
    has_large_body BOOLEAN DEFAULT FALSE,
    
    response_body JSONB,
    response_body_size INTEGER DEFAULT 0,
    has_large_response BOOLEAN DEFAULT FALSE,
    
    error_message TEXT,
    error_stack TEXT,
    
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id, timestamp)
) PARTITION BY RANGE (timestamp);

CREATE TABLE IF NOT EXISTS audit.request_logs_current 
PARTITION OF audit.request_logs
FOR VALUES FROM (DATE_TRUNC('month', CURRENT_DATE)) 
TO (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month');

CREATE TABLE IF NOT EXISTS audit.request_logs_next_month 
PARTITION OF audit.request_logs
FOR VALUES FROM (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month') 
TO (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '2 months');

CREATE TABLE IF NOT EXISTS audit.request_logs_prev_month 
PARTITION OF audit.request_logs
FOR VALUES FROM (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month') 
TO (DATE_TRUNC('month', CURRENT_DATE));

CREATE OR REPLACE FUNCTION audit.create_monthly_partition()
RETURNS void AS $$
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
$$ LANGUAGE plpgsql;

CREATE INDEX IF NOT EXISTS idx_request_logs_timestamp ON audit.request_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_request_logs_method ON audit.request_logs(method);
CREATE INDEX IF NOT EXISTS idx_request_logs_module ON audit.request_logs(module);
CREATE INDEX IF NOT EXISTS idx_request_logs_submodule ON audit.request_logs(submodule);
CREATE INDEX IF NOT EXISTS idx_request_logs_user_id ON audit.request_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_request_logs_ip ON audit.request_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_request_logs_status ON audit.request_logs(status_code);
CREATE INDEX IF NOT EXISTS idx_request_logs_timestamp_module ON audit.request_logs(timestamp DESC, module);
CREATE INDEX IF NOT EXISTS idx_request_logs_module_status ON audit.request_logs(module, status_code);
CREATE INDEX IF NOT EXISTS idx_request_logs_module_submodule ON audit.request_logs(module, submodule);

CREATE INDEX IF NOT EXISTS idx_request_logs_query_params ON audit.request_logs USING GIN (query_params);
CREATE INDEX IF NOT EXISTS idx_request_logs_request_body ON audit.request_logs USING GIN (request_body);
CREATE INDEX IF NOT EXISTS idx_request_logs_response_body ON audit.request_logs USING GIN (response_body);

COMMENT ON TABLE audit.request_logs IS 'Registro de todas las peticiones HTTP del sistema para auditoría. Tabla particionada por mes.';
COMMENT ON COLUMN audit.request_logs.module IS 'Módulo del sistema: auth, certificados, control-interno, legal, etc.';
COMMENT ON COLUMN audit.request_logs.submodule IS 'Submódulo o recurso específico dentro del módulo: expedientes, juzgamiento, users, roles, etc.';

CREATE OR REPLACE FUNCTION audit.cleanup_old_logs(months_to_keep INTEGER DEFAULT 6)
RETURNS INTEGER AS $$
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
$$ LANGUAGE plpgsql;

CREATE OR REPLACE VIEW audit.request_logs_stats AS
SELECT 
    DATE_TRUNC('day', timestamp) as date,
    method,
    module,
    submodule,
    status_code,
    COUNT(*) as request_count,
    AVG(response_time_ms) as avg_response_time,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_time_ms) as median_response_time,
    MAX(response_time_ms) as max_response_time,
    MIN(response_time_ms) as min_response_time
FROM audit.request_logs
GROUP BY DATE_TRUNC('day', timestamp), method, module, submodule, status_code
ORDER BY date DESC, module, method;

CREATE OR REPLACE FUNCTION audit.request_logs_partition_trigger()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM audit.create_monthly_partition();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_partition_before_insert
BEFORE INSERT ON audit.request_logs
FOR EACH STATEMENT
EXECUTE FUNCTION audit.request_logs_partition_trigger();

