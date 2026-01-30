-- =====================================================
-- Submódulo: Órganos de Control - Expansión (OJ-OC-001)
-- Hallazgos, Planes de Mejoramiento, Insumos, Historial
-- =====================================================

SET search_path TO requerimientos_oc, public;

-- =====================================================
-- MODIFICAR TABLA EXISTENTE: requerimientos
-- Agregar campos faltantes según especificación
-- =====================================================
ALTER TABLE requerimientos
    ADD COLUMN IF NOT EXISTS unidad_tiempo VARCHAR(20) DEFAULT 'DIAS_HABILES' 
        CHECK (unidad_tiempo IN ('HORAS', 'DIAS_CALENDARIO', 'DIAS_HABILES')),
    ADD COLUMN IF NOT EXISTS dias_plazo_otorgado INTEGER DEFAULT 15,
    ADD COLUMN IF NOT EXISTS referencia_externa VARCHAR(100),
    ADD COLUMN IF NOT EXISTS descripcion TEXT,
    ADD COLUMN IF NOT EXISTS funcionario_responsable VARCHAR(150),
    ADD COLUMN IF NOT EXISTS area_responsable VARCHAR(100),
    ADD COLUMN IF NOT EXISTS fecha_respuesta TIMESTAMP,
    ADD COLUMN IF NOT EXISTS oficio_respuesta_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS acuse_recibo_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS observaciones TEXT,
    ADD COLUMN IF NOT EXISTS created_by VARCHAR(150);

-- =====================================================
-- TABLA: hallazgos (Hallazgos de Auditoría)
-- =====================================================
CREATE TABLE IF NOT EXISTS hallazgos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relación con requerimiento origen
    requerimiento_id UUID REFERENCES requerimientos(id) ON DELETE CASCADE,
    
    -- Identificación del hallazgo
    codigo_hallazgo VARCHAR(50) UNIQUE NOT NULL,  -- Código asignado por la Contraloría
    numero_interno VARCHAR(50),                    -- Numeración interna ESAP
    
    -- Clasificación
    tipo_hallazgo VARCHAR(30) DEFAULT 'ADMINISTRATIVO' 
        CHECK (tipo_hallazgo IN ('ADMINISTRATIVO', 'FISCAL', 'DISCIPLINARIO', 'PENAL')),
    
    -- Descripción
    titulo VARCHAR(300) NOT NULL,
    descripcion TEXT NOT NULL,
    causa_raiz TEXT,
    efecto TEXT,
    
    -- Responsabilidad
    area_responsable VARCHAR(100),
    funcionario_responsable VARCHAR(150),
    
    -- Plan de Mejoramiento
    accion_correctiva TEXT NOT NULL,
    fecha_compromiso DATE NOT NULL,
    indicador_cumplimiento TEXT,
    meta_indicador VARCHAR(100),
    
    -- Estado
    estado VARCHAR(30) DEFAULT 'ABIERTO' 
        CHECK (estado IN ('ABIERTO', 'EN_CURSO', 'EN_REVISION', 'CERRADO', 'RECHAZADO')),
    
    porcentaje_avance INTEGER DEFAULT 0 CHECK (porcentaje_avance >= 0 AND porcentaje_avance <= 100),
    
    -- Fechas de seguimiento
    fecha_ultimo_reporte TIMESTAMP,
    fecha_proximo_reporte DATE,
    periodicidad_reporte VARCHAR(20) DEFAULT 'SEMESTRAL'
        CHECK (periodicidad_reporte IN ('MENSUAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL')),
    
    -- Documentación
    documento_plan_url VARCHAR(500),
    documentos_evidencia_urls TEXT[],
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(150)
);

-- =====================================================
-- TABLA: avances_hallazgo (Reportes de avance)
-- =====================================================
CREATE TABLE IF NOT EXISTS avances_hallazgo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hallazgo_id UUID NOT NULL REFERENCES hallazgos(id) ON DELETE CASCADE,
    
    -- Contenido del reporte
    fecha_reporte TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    porcentaje_avance INTEGER CHECK (porcentaje_avance >= 0 AND porcentaje_avance <= 100),
    descripcion_avance TEXT NOT NULL,
    
    -- Documentación
    documentos_adjuntos_urls TEXT[],
    
    -- Estado del reporte
    reportado_a_sireci BOOLEAN DEFAULT FALSE,
    fecha_reporte_sireci TIMESTAMP,
    
    -- Auditoría
    reportado_por VARCHAR(150),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLA: solicitudes_insumos (Delegación a otras áreas)
-- =====================================================
CREATE TABLE IF NOT EXISTS solicitudes_insumos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relación con requerimiento
    requerimiento_id UUID NOT NULL REFERENCES requerimientos(id) ON DELETE CASCADE,
    
    -- Área destino
    area_destino VARCHAR(100) NOT NULL,
    funcionario_destino VARCHAR(150),
    email_destino VARCHAR(150),
    
    -- Solicitud
    descripcion_solicitud TEXT NOT NULL,
    documentos_solicitados TEXT,
    
    -- Fechas
    fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_vencimiento TIMESTAMP NOT NULL,
    fecha_respuesta TIMESTAMP,
    
    -- Estado
    estado VARCHAR(20) DEFAULT 'PENDIENTE'
        CHECK (estado IN ('PENDIENTE', 'EN_PROCESO', 'ENTREGADO', 'RECHAZADO', 'VENCIDO')),
    
    -- Respuesta
    documentos_entregados_urls TEXT[],
    comentario_respuesta TEXT,
    
    -- Trazabilidad
    solicitado_por VARCHAR(150),
    respondido_por VARCHAR(150),
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLA: historial_requerimientos (Bitácora inmutable)
-- =====================================================
CREATE TABLE IF NOT EXISTS historial_requerimientos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requerimiento_id UUID NOT NULL REFERENCES requerimientos(id) ON DELETE CASCADE,
    
    -- Acción realizada
    accion VARCHAR(50) NOT NULL,  -- CREACION, ASIGNACION, DELEGACION, CAMBIO_ESTADO, RESPUESTA, CIERRE
    descripcion TEXT,
    
    -- Estado anterior y nuevo
    estado_anterior VARCHAR(30),
    estado_nuevo VARCHAR(30),
    
    -- Responsable de la acción
    usuario_nombre VARCHAR(150),
    area_usuario VARCHAR(100),
    
    -- Fecha inmutable
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- ÍNDICES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_hallazgos_requerimiento ON hallazgos(requerimiento_id);
CREATE INDEX IF NOT EXISTS idx_hallazgos_estado ON hallazgos(estado);
CREATE INDEX IF NOT EXISTS idx_hallazgos_fecha_compromiso ON hallazgos(fecha_compromiso);

CREATE INDEX IF NOT EXISTS idx_avances_hallazgo ON avances_hallazgo(hallazgo_id);
CREATE INDEX IF NOT EXISTS idx_avances_fecha ON avances_hallazgo(fecha_reporte);

CREATE INDEX IF NOT EXISTS idx_insumos_requerimiento ON solicitudes_insumos(requerimiento_id);
CREATE INDEX IF NOT EXISTS idx_insumos_estado ON solicitudes_insumos(estado);
CREATE INDEX IF NOT EXISTS idx_insumos_area ON solicitudes_insumos(area_destino);

CREATE INDEX IF NOT EXISTS idx_historial_requerimiento ON historial_requerimientos(requerimiento_id);
CREATE INDEX IF NOT EXISTS idx_historial_fecha ON historial_requerimientos(fecha);

-- =====================================================
-- TRIGGERS: Numeración automática de hallazgos
-- =====================================================
CREATE SEQUENCE IF NOT EXISTS seq_hallazgo_interno START WITH 1;

CREATE OR REPLACE FUNCTION generar_numero_hallazgo()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.numero_interno IS NULL OR NEW.numero_interno = '' THEN
        NEW.numero_interno := 'HAL-ESAP-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || 
                              LPAD(nextval('seq_hallazgo_interno')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generar_numero_hallazgo ON hallazgos;
CREATE TRIGGER trg_generar_numero_hallazgo
    BEFORE INSERT ON hallazgos
    FOR EACH ROW
    EXECUTE FUNCTION generar_numero_hallazgo();

-- =====================================================
-- TRIGGER: Historial automático para requerimientos
-- =====================================================
CREATE OR REPLACE FUNCTION registrar_historial_requerimiento()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.estado != NEW.estado THEN
        INSERT INTO historial_requerimientos (requerimiento_id, accion, descripcion, estado_anterior, estado_nuevo)
        VALUES (NEW.id, 'CAMBIO_ESTADO', 'Cambio de estado automático', OLD.estado, NEW.estado);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_historial_requerimiento ON requerimientos;
CREATE TRIGGER trg_historial_requerimiento
    AFTER UPDATE ON requerimientos
    FOR EACH ROW
    EXECUTE FUNCTION registrar_historial_requerimiento();

-- =====================================================
-- DATOS DE PRUEBA: Hallazgos
-- =====================================================
INSERT INTO hallazgos (
    codigo_hallazgo,
    titulo,
    descripcion,
    tipo_hallazgo,
    area_responsable,
    accion_correctiva,
    fecha_compromiso,
    periodicidad_reporte,
    estado,
    porcentaje_avance
) VALUES 
(
    'CGR-2024-HAL-001',
    'Deficiencia en archivo de contratos',
    'Se evidenció que no se encuentran organizados cronológicamente los expedientes contractuales del año 2023.',
    'ADMINISTRATIVO',
    'Subdirección Administrativa',
    'Implementar sistema de organización documental digital y capacitar al personal en TRD.',
    CURRENT_DATE + INTERVAL '6 months',
    'TRIMESTRAL',
    'EN_CURSO',
    25
),
(
    'CGR-2024-HAL-002',
    'Inconsistencias en registro contable de inventarios',
    'Se detectaron diferencias entre el inventario físico y los registros contables por valor de $15.000.000.',
    'FISCAL',
    'Subdirección Financiera',
    'Realizar conciliación de inventarios y ajustar registros contables según procedimiento.',
    CURRENT_DATE + INTERVAL '3 months',
    'MENSUAL',
    'ABIERTO',
    0
)
ON CONFLICT (codigo_hallazgo) DO NOTHING;

-- =====================================================
-- Verificación
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Migración 038_expand_organos_control.sql ejecutada correctamente';
    RAISE NOTICE '   - Tabla requerimientos expandida con nuevos campos';
    RAISE NOTICE '   - Tabla hallazgos creada';
    RAISE NOTICE '   - Tabla avances_hallazgo creada';
    RAISE NOTICE '   - Tabla solicitudes_insumos creada';
    RAISE NOTICE '   - Tabla historial_requerimientos creada';
    RAISE NOTICE '   - Triggers de numeración y auditoría creados';
END $$;
