-- =====================================================
-- Módulo: Órganos de Control (OJ-OC-001)
-- Schema: legal_management
-- Gestión de requerimientos de entidades de control
-- =====================================================

SET search_path TO legal_management, public;

-- =====================================================
-- TABLA: organismos_control (Catálogo de entidades)
-- =====================================================
CREATE TABLE IF NOT EXISTS organismos_control (
    id SERIAL PRIMARY KEY,
    sigla VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Datos del catálogo
INSERT INTO organismos_control (sigla, nombre, descripcion) VALUES
('CGR', 'Contraloría General de la República', 'Ente de control fiscal del Estado'),
('PGN', 'Procuraduría General de la Nación', 'Ente de control disciplinario y defensa de derechos'),
('FISCALIA', 'Fiscalía General de la Nación', 'Ente investigador y acusador'),
('DEFENSORIA', 'Defensoría del Pueblo', 'Defensa de los derechos humanos'),
('CONTRALORIA_T', 'Contraloría Territorial', 'Control fiscal territorial'),
('PERSONERIA', 'Personería Municipal/Distrital', 'Ministerio público municipal'),
('CONGRESO', 'Congreso de la República', 'Control político')
ON CONFLICT (sigla) DO NOTHING;

-- =====================================================
-- TABLA: requerimientos_oc (Requerimientos principales)
-- =====================================================
CREATE TABLE IF NOT EXISTS requerimientos_oc (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identificación
    radicado_externo VARCHAR(100) NOT NULL,      -- Radicado del ente (CGR-2025-XXXX)
    radicado_interno VARCHAR(30) UNIQUE NOT NULL, -- Radicado ESAP (REQ-OC-2025-0001)
    
    -- Organismo
    organismo_id INTEGER REFERENCES organismos_control(id),
    
    -- Tipo de requerimiento
    tipo_requerimiento VARCHAR(50) NOT NULL 
        CHECK (tipo_requerimiento IN (
            'SOLICITUD_INFORMACION', 
            'APERTURA_AUDITORIA', 
            'NOTIFICACION_HALLAZGO', 
            'PLAN_MEJORAMIENTO',
            'OTRO'
        )),
    
    -- Contenido
    asunto TEXT NOT NULL,
    descripcion TEXT,
    
    -- Términos y plazos
    fecha_recepcion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    unidad_tiempo VARCHAR(20) DEFAULT 'DIAS_HABILES' 
        CHECK (unidad_tiempo IN ('HORAS', 'DIAS_CALENDARIO', 'DIAS_HABILES')),
    plazo_otorgado INTEGER NOT NULL DEFAULT 15,
    fecha_vencimiento TIMESTAMP NOT NULL,
    
    -- Responsables
    funcionario_responsable VARCHAR(200),
    area_responsable VARCHAR(150),
    abogado_asignado_id UUID REFERENCES abogados(id),
    
    -- Estado
    estado VARCHAR(30) DEFAULT 'RECIBIDO' 
        CHECK (estado IN ('RECIBIDO', 'EN_ANALISIS', 'EN_RESPUESTA', 'ENVIADO', 'CERRADO', 'VENCIDO')),
    prioridad VARCHAR(15) DEFAULT 'NORMAL' 
        CHECK (prioridad IN ('CRITICA', 'ALTA', 'NORMAL', 'BAJA')),
    
    -- Documentos
    archivo_adjunto_url TEXT,
    oficio_respuesta_url TEXT,
    acuse_recibo_url TEXT,
    
    -- Respuesta
    fecha_respuesta TIMESTAMP,
    observaciones TEXT,
    
    -- Auditoría
    created_by VARCHAR(150),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLA: solicitudes_insumos (Motor de delegación)
-- =====================================================
CREATE TABLE IF NOT EXISTS solicitudes_insumos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relación con requerimiento
    requerimiento_id UUID NOT NULL REFERENCES requerimientos_oc(id) ON DELETE CASCADE,
    
    -- Área destino
    area_destino VARCHAR(150) NOT NULL,
    funcionario_destino VARCHAR(200),
    email_destino VARCHAR(150),
    
    -- Solicitud
    descripcion_solicitud TEXT NOT NULL,
    documentos_solicitados TEXT,
    
    -- Plazos
    fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_vencimiento_interna TIMESTAMP NOT NULL,
    fecha_respuesta TIMESTAMP,
    
    -- Estado
    estado VARCHAR(25) DEFAULT 'PENDIENTE' 
        CHECK (estado IN ('PENDIENTE', 'EN_PROCESO', 'ENTREGADO', 'RECHAZADO', 'VENCIDO')),
    
    -- Respuesta del área
    documentos_entregados_url TEXT,
    comentario_respuesta TEXT,
    
    -- Trazabilidad
    solicitado_por VARCHAR(150),
    respondido_por VARCHAR(150),
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLA: hallazgos (Planes de mejoramiento)
-- =====================================================
CREATE TABLE IF NOT EXISTS hallazgos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relación con requerimiento
    requerimiento_id UUID REFERENCES requerimientos_oc(id) ON DELETE SET NULL,
    
    -- Identificación
    codigo_hallazgo VARCHAR(50) UNIQUE NOT NULL,  -- Código del ente
    numero_interno VARCHAR(50),                    -- Numeración ESAP
    
    -- Clasificación
    tipo_hallazgo VARCHAR(30) DEFAULT 'ADMINISTRATIVO' 
        CHECK (tipo_hallazgo IN ('ADMINISTRATIVO', 'FISCAL', 'DISCIPLINARIO', 'PENAL')),
    
    -- Descripción
    titulo VARCHAR(300) NOT NULL,
    descripcion TEXT NOT NULL,
    causa_raiz TEXT,
    efecto TEXT,
    
    -- Responsabilidad
    area_responsable VARCHAR(150),
    funcionario_responsable VARCHAR(200),
    
    -- Plan de Mejoramiento
    accion_correctiva TEXT NOT NULL,
    fecha_compromiso DATE NOT NULL,
    indicador_cumplimiento TEXT,
    meta_indicador VARCHAR(100),
    
    -- Estado
    estado VARCHAR(30) DEFAULT 'ABIERTO' 
        CHECK (estado IN ('ABIERTO', 'EN_CURSO', 'EN_REVISION', 'CERRADO', 'RECHAZADO')),
    porcentaje_avance INTEGER DEFAULT 0 CHECK (porcentaje_avance >= 0 AND porcentaje_avance <= 100),
    
    -- Reportes
    fecha_ultimo_reporte TIMESTAMP,
    fecha_proximo_reporte DATE,
    periodicidad_reporte VARCHAR(20) DEFAULT 'TRIMESTRAL'
        CHECK (periodicidad_reporte IN ('MENSUAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL')),
    
    -- Documentación
    documento_plan_url TEXT,
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(150)
);

-- =====================================================
-- TABLA: avances_hallazgo (Reportes de avance)
-- =====================================================
CREATE TABLE IF NOT EXISTS avances_hallazgo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hallazgo_id UUID NOT NULL REFERENCES hallazgos(id) ON DELETE CASCADE,
    
    -- Contenido
    fecha_reporte TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    porcentaje_avance INTEGER CHECK (porcentaje_avance >= 0 AND porcentaje_avance <= 100),
    descripcion_avance TEXT NOT NULL,
    
    -- Documentación
    documento_adjunto_url TEXT,
    
    -- SIRECI
    reportado_a_sireci BOOLEAN DEFAULT FALSE,
    fecha_reporte_sireci TIMESTAMP,
    
    -- Auditoría
    reportado_por VARCHAR(150),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLA: historial_requerimientos_oc (Bitácora inmutable)
-- =====================================================
CREATE TABLE IF NOT EXISTS historial_requerimientos_oc (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requerimiento_id UUID NOT NULL REFERENCES requerimientos_oc(id) ON DELETE CASCADE,
    
    -- Acción
    accion VARCHAR(50) NOT NULL,  -- CREACION, ASIGNACION, DELEGACION, CAMBIO_ESTADO, RESPUESTA, CIERRE
    descripcion TEXT,
    
    -- Estados
    estado_anterior VARCHAR(30),
    estado_nuevo VARCHAR(30),
    
    -- Usuario
    usuario_nombre VARCHAR(150),
    area_usuario VARCHAR(100),
    
    -- Fecha inmutable
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- ÍNDICES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_req_oc_estado ON requerimientos_oc(estado);
CREATE INDEX IF NOT EXISTS idx_req_oc_organismo ON requerimientos_oc(organismo_id);
CREATE INDEX IF NOT EXISTS idx_req_oc_vencimiento ON requerimientos_oc(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_req_oc_abogado ON requerimientos_oc(abogado_asignado_id);

CREATE INDEX IF NOT EXISTS idx_insumos_req ON solicitudes_insumos(requerimiento_id);
CREATE INDEX IF NOT EXISTS idx_insumos_estado ON solicitudes_insumos(estado);
CREATE INDEX IF NOT EXISTS idx_insumos_area ON solicitudes_insumos(area_destino);

CREATE INDEX IF NOT EXISTS idx_hallazgos_req ON hallazgos(requerimiento_id);
CREATE INDEX IF NOT EXISTS idx_hallazgos_estado ON hallazgos(estado);
CREATE INDEX IF NOT EXISTS idx_hallazgos_fecha ON hallazgos(fecha_compromiso);

CREATE INDEX IF NOT EXISTS idx_historial_oc_req ON historial_requerimientos_oc(requerimiento_id);
CREATE INDEX IF NOT EXISTS idx_historial_oc_fecha ON historial_requerimientos_oc(fecha);

-- =====================================================
-- SECUENCIA: Radicado interno automático
-- =====================================================
CREATE SEQUENCE IF NOT EXISTS seq_radicado_oc START WITH 1;

-- =====================================================
-- TRIGGER: Historial automático
-- =====================================================
CREATE OR REPLACE FUNCTION legal_management.registrar_historial_oc()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO legal_management.historial_requerimientos_oc (requerimiento_id, accion, estado_nuevo, descripcion)
        VALUES (NEW.id, 'CREACION', NEW.estado, 'Requerimiento creado');
    ELSIF TG_OP = 'UPDATE' AND OLD.estado != NEW.estado THEN
        INSERT INTO legal_management.historial_requerimientos_oc (requerimiento_id, accion, estado_anterior, estado_nuevo, descripcion)
        VALUES (NEW.id, 'CAMBIO_ESTADO', OLD.estado, NEW.estado, 'Cambio de estado automático');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_historial_oc ON legal_management.requerimientos_oc;
CREATE TRIGGER trg_historial_oc
    AFTER INSERT OR UPDATE ON legal_management.requerimientos_oc
    FOR EACH ROW
    EXECUTE FUNCTION legal_management.registrar_historial_oc();

-- =====================================================
-- Verificación
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Migración 051_create_organos_control_full.sql ejecutada correctamente';
    RAISE NOTICE '   - Tabla organismos_control creada con catálogo';
    RAISE NOTICE '   - Tabla requerimientos_oc creada';
    RAISE NOTICE '   - Tabla solicitudes_insumos creada';
    RAISE NOTICE '   - Tabla hallazgos creada';
    RAISE NOTICE '   - Tabla avances_hallazgo creada';
    RAISE NOTICE '   - Tabla historial_requerimientos_oc creada';
    RAISE NOTICE '   - Índices y triggers creados';
END $$;
