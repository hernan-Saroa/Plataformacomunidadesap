-- ============================================================
-- Migración 151: Agregar campos de documento de cierre a auditorías
-- ============================================================
-- 
-- PROPÓSITO:
-- Agregar columnas necesarias para el documento de cierre obligatorio
-- al finalizar auditorías, incluyendo metadatos del archivo.
--
-- ============================================================

-- 1. Verificar y agregar columna documento_cierre si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'documento_cierre'
    ) THEN
        ALTER TABLE control_interno.auditoria 
        ADD COLUMN documento_cierre JSONB NULL;
        
        COMMENT ON COLUMN control_interno.auditoria.documento_cierre IS 
        'Documento de cierre obligatorio (matriz/formato): {nombre, url, tipo, tamano, fechaCarga, cargadoPor}';
    ELSE
        -- Si ya existe pero es TEXT, convertir a JSONB
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'control_interno' 
            AND table_name = 'auditoria' 
            AND column_name = 'documento_cierre'
            AND data_type = 'text'
        ) THEN
            ALTER TABLE control_interno.auditoria 
            ALTER COLUMN documento_cierre TYPE JSONB USING documento_cierre::jsonb;
            
            COMMENT ON COLUMN control_interno.auditoria.documento_cierre IS 
            'Documento de cierre obligatorio (matriz/formato): {nombre, url, tipo, tamano, fechaCarga, cargadoPor}';
        END IF;
    END IF;
END $$;

-- 2. Verificar y agregar columna observaciones_cierre si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'observaciones_cierre'
    ) THEN
        ALTER TABLE control_interno.auditoria 
        ADD COLUMN observaciones_cierre TEXT NULL;
        
        COMMENT ON COLUMN control_interno.auditoria.observaciones_cierre IS 
        'Observaciones o comentarios adicionales sobre el cierre de la auditoría';
    END IF;
END $$;

-- 3. Verificar y agregar columna fecha_finalizacion si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'fecha_finalizacion'
    ) THEN
        ALTER TABLE control_interno.auditoria 
        ADD COLUMN fecha_finalizacion TIMESTAMP NULL;
        
        COMMENT ON COLUMN control_interno.auditoria.fecha_finalizacion IS 
        'Fecha y hora en que se finalizó la auditoría';
    END IF;
END $$;

-- 4. Verificar y agregar columna finalizada_por si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'finalizada_por'
    ) THEN
        ALTER TABLE control_interno.auditoria 
        ADD COLUMN finalizada_por VARCHAR(255) NULL;
        
        COMMENT ON COLUMN control_interno.auditoria.finalizada_por IS 
        'Nombre del usuario que finalizó la auditoría';
    END IF;
END $$;

-- 5. Verificar y agregar columna finalizada_por_id si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'finalizada_por_id'
    ) THEN
        ALTER TABLE control_interno.auditoria 
        ADD COLUMN finalizada_por_id BIGINT NULL;
        
        COMMENT ON COLUMN control_interno.auditoria.finalizada_por_id IS 
        'ID del usuario que finalizó la auditoría (referencia a auth.personas)';
    END IF;
END $$;

-- 6. Verificar y agregar columna fecha_fin_planeacion si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'fecha_fin_planeacion'
    ) THEN
        ALTER TABLE control_interno.auditoria 
        ADD COLUMN fecha_fin_planeacion DATE NULL;
        
        COMMENT ON COLUMN control_interno.auditoria.fecha_fin_planeacion IS 
        'Fecha de fin de la fase de planeación / inicio de ejecución';
    END IF;
END $$;

-- 7. Verificar y agregar columna fecha_fin_ejecucion si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'fecha_fin_ejecucion'
    ) THEN
        ALTER TABLE control_interno.auditoria 
        ADD COLUMN fecha_fin_ejecucion DATE NULL;
        
        COMMENT ON COLUMN control_interno.auditoria.fecha_fin_ejecucion IS 
        'Fecha de fin de la fase de ejecución / inicio de comunicación';
    END IF;
END $$;

-- 8. Crear índice para búsquedas por fecha de finalización
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha_finalizacion 
ON control_interno.auditoria(fecha_finalizacion) 
WHERE fecha_finalizacion IS NOT NULL;

-- 9. Crear índice para búsquedas por usuario finalizador
CREATE INDEX IF NOT EXISTS idx_auditoria_finalizada_por_id 
ON control_interno.auditoria(finalizada_por_id) 
WHERE finalizada_por_id IS NOT NULL;

-- 10. Actualizar vista si existe (solo si la columna documento_cierre existe)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'control_interno' 
        AND table_name = 'auditoria' 
        AND column_name = 'documento_cierre'
    ) THEN
        DROP VIEW IF EXISTS control_interno.v_auditorias_finalizadas;
        
        CREATE VIEW control_interno.v_auditorias_finalizadas AS
        SELECT 
            a.id,
            a.codigo,
            a.nombre,
            a.tipo,
            a.fecha_inicio,
            a.fecha_fin,
            a.fecha_finalizacion,
            a.finalizada_por,
            a.finalizada_por_id,
            (a.documento_cierre->>'nombre')::TEXT AS documento_cierre_nombre,
            (a.documento_cierre->>'url')::TEXT AS documento_cierre_url,
            (a.documento_cierre->>'tipo')::TEXT AS documento_cierre_tipo,
            (a.documento_cierre->>'tamano')::INTEGER AS documento_cierre_tamano,
            a.observaciones_cierre,
            a.progreso,
            a.hallazgos
        FROM control_interno.auditoria a
        WHERE a.estado_kanban = 'Finalizada' 
          AND a.activa = true 
          AND a.archivada = false;
        
        COMMENT ON VIEW control_interno.v_auditorias_finalizadas IS 
        'Vista de auditorías finalizadas con información del documento de cierre';
    END IF;
END $$;

