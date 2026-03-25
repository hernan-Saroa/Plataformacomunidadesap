-- ============================================================
-- Migración 160: Verificación OCI y Informe de Cierre (Cierre de Auditoría)
-- ============================================================
--
-- PROPÓSITO:
-- 1. accion_correctiva: campos para verificación OCI (Sección 1 Cierre)
--    - estado_verificacion_oci, evidencia_verificada, observacion_oci,
--      fecha_verificacion_oci, verificada_por_id
-- 2. auditoria: campos para Informe de Cierre (Sección 2)
--    - lecciones_aprendidas, recomendaciones_futuras_auditorias,
--      informe_cierre_aprobado, informe_cierre_aprobado_por,
--      informe_cierre_aprobado_por_id, informe_cierre_aprobado_at
--
-- ============================================================

-- 1. accion_correctiva: estado_verificacion_oci
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'control_interno' AND table_name = 'accion_correctiva' AND column_name = 'estado_verificacion_oci'
    ) THEN
        ALTER TABLE control_interno.accion_correctiva
        ADD COLUMN estado_verificacion_oci VARCHAR(20) DEFAULT 'sin_verificar';
        COMMENT ON COLUMN control_interno.accion_correctiva.estado_verificacion_oci IS 'Verificación OCI: sin_verificar, cumplida, parcial, incumplida';
    END IF;
END $$;

-- 2. accion_correctiva: evidencia_verificada
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'control_interno' AND table_name = 'accion_correctiva' AND column_name = 'evidencia_verificada'
    ) THEN
        ALTER TABLE control_interno.accion_correctiva ADD COLUMN evidencia_verificada TEXT;
        COMMENT ON COLUMN control_interno.accion_correctiva.evidencia_verificada IS 'Descripción de la evidencia revisada por el OCI';
    END IF;
END $$;

-- 3. accion_correctiva: observacion_oci
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'control_interno' AND table_name = 'accion_correctiva' AND column_name = 'observacion_oci'
    ) THEN
        ALTER TABLE control_interno.accion_correctiva ADD COLUMN observacion_oci TEXT;
        COMMENT ON COLUMN control_interno.accion_correctiva.observacion_oci IS 'Observación opcional del OCI';
    END IF;
END $$;

-- 4. accion_correctiva: fecha_verificacion_oci
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'control_interno' AND table_name = 'accion_correctiva' AND column_name = 'fecha_verificacion_oci'
    ) THEN
        ALTER TABLE control_interno.accion_correctiva ADD COLUMN fecha_verificacion_oci TIMESTAMP;
        COMMENT ON COLUMN control_interno.accion_correctiva.fecha_verificacion_oci IS 'Fecha en que se registró la verificación OCI';
    END IF;
END $$;

-- 5. accion_correctiva: verificada_por_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'control_interno' AND table_name = 'accion_correctiva' AND column_name = 'verificada_por_id'
    ) THEN
        ALTER TABLE control_interno.accion_correctiva ADD COLUMN verificada_por_id BIGINT;
        COMMENT ON COLUMN control_interno.accion_correctiva.verificada_por_id IS 'ID del usuario que registró la verificación';
    END IF;
END $$;

-- 6. auditoria: lecciones_aprendidas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'control_interno' AND table_name = 'auditoria' AND column_name = 'lecciones_aprendidas'
    ) THEN
        ALTER TABLE control_interno.auditoria ADD COLUMN lecciones_aprendidas TEXT;
        COMMENT ON COLUMN control_interno.auditoria.lecciones_aprendidas IS 'Lecciones aprendidas (Informe de Cierre - Sección 2)';
    END IF;
END $$;

-- 7. auditoria: recomendaciones_futuras_auditorias
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'control_interno' AND table_name = 'auditoria' AND column_name = 'recomendaciones_futuras_auditorias'
    ) THEN
        ALTER TABLE control_interno.auditoria ADD COLUMN recomendaciones_futuras_auditorias TEXT;
        COMMENT ON COLUMN control_interno.auditoria.recomendaciones_futuras_auditorias IS 'Recomendaciones para futuras auditorías (Informe de Cierre)';
    END IF;
END $$;

-- 8. auditoria: informe_cierre_aprobado
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'control_interno' AND table_name = 'auditoria' AND column_name = 'informe_cierre_aprobado'
    ) THEN
        ALTER TABLE control_interno.auditoria ADD COLUMN informe_cierre_aprobado BOOLEAN DEFAULT FALSE;
        COMMENT ON COLUMN control_interno.auditoria.informe_cierre_aprobado IS 'Si el Jefe OCI aprobó el informe de cierre';
    END IF;
END $$;

-- 9. auditoria: informe_cierre_aprobado_por
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'control_interno' AND table_name = 'auditoria' AND column_name = 'informe_cierre_aprobado_por'
    ) THEN
        ALTER TABLE control_interno.auditoria ADD COLUMN informe_cierre_aprobado_por VARCHAR(255);
        COMMENT ON COLUMN control_interno.auditoria.informe_cierre_aprobado_por IS 'Nombre de quien aprobó el informe de cierre';
    END IF;
END $$;

-- 10. auditoria: informe_cierre_aprobado_por_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'control_interno' AND table_name = 'auditoria' AND column_name = 'informe_cierre_aprobado_por_id'
    ) THEN
        ALTER TABLE control_interno.auditoria ADD COLUMN informe_cierre_aprobado_por_id BIGINT;
        COMMENT ON COLUMN control_interno.auditoria.informe_cierre_aprobado_por_id IS 'ID del usuario que aprobó el informe de cierre';
    END IF;
END $$;

-- 11. auditoria: informe_cierre_aprobado_at
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'control_interno' AND table_name = 'auditoria' AND column_name = 'informe_cierre_aprobado_at'
    ) THEN
        ALTER TABLE control_interno.auditoria ADD COLUMN informe_cierre_aprobado_at TIMESTAMP;
        COMMENT ON COLUMN control_interno.auditoria.informe_cierre_aprobado_at IS 'Fecha de aprobación del informe de cierre';
    END IF;
END $$;
