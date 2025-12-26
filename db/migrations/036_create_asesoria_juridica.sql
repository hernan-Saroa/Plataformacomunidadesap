-- =====================================================
-- Submódulo: Asesoría Jurídica y Conceptos (OJ-ASES-001)
-- Gestión de consultas internas y conceptos jurídicos
-- =====================================================

-- Asegurar schema
SET search_path TO legal_management, public;

-- =====================================================
-- TABLA: consultas_juridicas (Solicitudes de asesoría)
-- =====================================================
CREATE TABLE IF NOT EXISTS consultas_juridicas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Numeración consecutiva automática
    numero_radicado VARCHAR(50) UNIQUE NOT NULL,
    
    -- Tipo de solicitud
    tipo_solicitud VARCHAR(30) NOT NULL CHECK (tipo_solicitud IN (
        'CONCEPTO',           -- Duda jurídica
        'REVISION_LEGALIDAD', -- Revisar documento existente
        'VIABILIDAD'          -- Concepto de viabilidad
    )),
    
    -- Área solicitante
    area_solicitante VARCHAR(100) NOT NULL,
    funcionario_solicitante VARCHAR(150) NOT NULL,
    cargo_solicitante VARCHAR(100),
    email_solicitante VARCHAR(150),
    telefono_solicitante VARCHAR(20),
    
    -- Contenido de la consulta
    asunto VARCHAR(300) NOT NULL,
    descripcion TEXT NOT NULL,
    antecedentes TEXT,
    documentos_soporte_urls TEXT[], -- Array de URLs de documentos adjuntos
    
    -- Clasificación temática (para banco de conceptos)
    tema_principal VARCHAR(100),
    palabras_clave TEXT[],
    
    -- Asignación
    abogado_asignado_id UUID REFERENCES abogados(id),
    abogado_asignado_nombre VARCHAR(150),
    fecha_asignacion TIMESTAMP,
    
    -- Estado y workflow
    estado VARCHAR(30) DEFAULT 'RADICADA' CHECK (estado IN (
        'RADICADA',           -- Recién creada
        'EN_ANALISIS',        -- Abogado trabajando
        'SUSPENDIDA',         -- Esperando info adicional
        'EN_REVISION',        -- Enviada a jefe para revisión
        'DEVUELTA',           -- Jefe devolvió con comentarios
        'APROBADA',           -- Concepto aprobado
        'EMITIDA',            -- Notificada al solicitante
        'CERRADA'             -- Finalizada
    )),
    
    -- Control de tiempos (SLA)
    fecha_radicacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_vencimiento TIMESTAMP NOT NULL,
    dias_termino INTEGER DEFAULT 30,
    dias_transcurridos INTEGER DEFAULT 0,
    
    -- Suspensión de términos
    suspendida BOOLEAN DEFAULT FALSE,
    fecha_suspension TIMESTAMP,
    motivo_suspension TEXT,
    
    -- Confidencialidad
    confidencial BOOLEAN DEFAULT FALSE,
    areas_con_acceso TEXT[], -- Áreas que pueden ver si es confidencial
    
    -- Prioridad
    prioridad VARCHAR(20) DEFAULT 'NORMAL' CHECK (prioridad IN ('BAJA', 'NORMAL', 'ALTA', 'URGENTE')),
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(150),
    updated_by VARCHAR(150)
);

-- =====================================================
-- TABLA: conceptos_juridicos (Respuestas/Conceptos)
-- =====================================================
CREATE TABLE IF NOT EXISTS conceptos_juridicos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relación con consulta
    consulta_id UUID NOT NULL REFERENCES consultas_juridicas(id) ON DELETE CASCADE,
    
    -- Numeración única del concepto
    numero_concepto VARCHAR(50) UNIQUE NOT NULL, -- Ej: CONCEPTO-OJ-2025-004
    
    -- Tipo de documento
    tipo_documento VARCHAR(30) DEFAULT 'CONCEPTO' CHECK (tipo_documento IN (
        'CONCEPTO',           -- Concepto jurídico formal
        'MEMORANDO',          -- Memorando interno
        'VIABILIDAD',         -- Concepto de viabilidad
        'REVISION'            -- Revisión de legalidad
    )),
    
    -- Contenido
    titulo VARCHAR(300) NOT NULL,
    resumen TEXT,
    analisis_juridico TEXT NOT NULL,
    normatividad_aplicable TEXT, -- Leyes, decretos citados
    conclusion TEXT NOT NULL,
    recomendaciones TEXT,
    
    -- Documento generado
    documento_pdf_url VARCHAR(500),
    
    -- Workflow
    estado VARCHAR(20) DEFAULT 'BORRADOR' CHECK (estado IN (
        'BORRADOR',           -- En redacción
        'EN_REVISION',        -- Enviado a jefe
        'DEVUELTO',           -- Jefe devolvió
        'APROBADO',           -- Aprobado por jefe
        'EMITIDO'             -- Notificado al solicitante
    )),
    
    -- Redactor y revisor
    abogado_redactor_id UUID REFERENCES abogados(id),
    abogado_redactor_nombre VARCHAR(150),
    
    revisor_id UUID,
    revisor_nombre VARCHAR(150),
    fecha_revision TIMESTAMP,
    comentarios_revision TEXT,
    
    -- Aprobación
    aprobado_por VARCHAR(150),
    fecha_aprobacion TIMESTAMP,
    
    -- Emisión
    fecha_emision TIMESTAMP,
    notificado_a VARCHAR(300),
    
    -- Banco de conceptos (Knowledge Base)
    visible_banco BOOLEAN DEFAULT TRUE,
    etiquetas TEXT[],
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLA: historial_consultas (Bitácora de cambios)
-- =====================================================
CREATE TABLE IF NOT EXISTS historial_consultas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consulta_id UUID NOT NULL REFERENCES consultas_juridicas(id) ON DELETE CASCADE,
    
    accion VARCHAR(100) NOT NULL,
    descripcion TEXT,
    estado_anterior VARCHAR(30),
    estado_nuevo VARCHAR(30),
    
    usuario_nombre VARCHAR(150),
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- SECUENCIA para numeración automática de consultas
-- =====================================================
CREATE SEQUENCE IF NOT EXISTS seq_consulta_radicado START WITH 1;
CREATE SEQUENCE IF NOT EXISTS seq_concepto_numero START WITH 1;

-- =====================================================
-- FUNCIÓN para generar radicado automático
-- =====================================================
CREATE OR REPLACE FUNCTION generar_radicado_consulta()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.numero_radicado IS NULL OR NEW.numero_radicado = '' THEN
        NEW.numero_radicado := 'CONS-OJ-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || 
                               LPAD(nextval('seq_consulta_radicado')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generar_numero_concepto()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.numero_concepto IS NULL OR NEW.numero_concepto = '' THEN
        NEW.numero_concepto := 'CONCEPTO-OJ-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || 
                               LPAD(nextval('seq_concepto_numero')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS trg_generar_radicado ON consultas_juridicas;
CREATE TRIGGER trg_generar_radicado
    BEFORE INSERT ON consultas_juridicas
    FOR EACH ROW
    EXECUTE FUNCTION generar_radicado_consulta();

DROP TRIGGER IF EXISTS trg_generar_numero_concepto ON conceptos_juridicos;
CREATE TRIGGER trg_generar_numero_concepto
    BEFORE INSERT ON conceptos_juridicos
    FOR EACH ROW
    EXECUTE FUNCTION generar_numero_concepto();

-- =====================================================
-- ÍNDICES para búsquedas
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_consultas_estado ON consultas_juridicas(estado);
CREATE INDEX IF NOT EXISTS idx_consultas_abogado ON consultas_juridicas(abogado_asignado_id);
CREATE INDEX IF NOT EXISTS idx_consultas_area ON consultas_juridicas(area_solicitante);
CREATE INDEX IF NOT EXISTS idx_consultas_tema ON consultas_juridicas(tema_principal);
CREATE INDEX IF NOT EXISTS idx_consultas_fecha ON consultas_juridicas(fecha_radicacion);

CREATE INDEX IF NOT EXISTS idx_conceptos_consulta ON conceptos_juridicos(consulta_id);
CREATE INDEX IF NOT EXISTS idx_conceptos_estado ON conceptos_juridicos(estado);
CREATE INDEX IF NOT EXISTS idx_conceptos_banco ON conceptos_juridicos(visible_banco) WHERE visible_banco = TRUE;

-- =====================================================
-- DATOS DE PRUEBA
-- =====================================================
INSERT INTO consultas_juridicas (
    numero_radicado,
    tipo_solicitud,
    area_solicitante,
    funcionario_solicitante,
    cargo_solicitante,
    email_solicitante,
    asunto,
    descripcion,
    tema_principal,
    palabras_clave,
    estado,
    fecha_vencimiento,
    dias_termino,
    prioridad
) VALUES 
(
    'CONS-OJ-2025-0001',
    'CONCEPTO',
    'Subdirección Administrativa',
    'María López Hernández',
    'Subdirectora Administrativa',
    'maria.lopez@esap.gov.co',
    'Consulta sobre aplicación de Ley de Garantías en contratación',
    'Se solicita concepto jurídico sobre la aplicabilidad de la Ley de Garantías para la celebración de un contrato de prestación de servicios profesionales.',
    'Contratación',
    ARRAY['Ley de Garantías', 'Contratación', 'Prestación de Servicios'],
    'RADICADA',
    CURRENT_TIMESTAMP + INTERVAL '30 days',
    30,
    'NORMAL'
),
(
    'CONS-OJ-2025-0002',
    'REVISION_LEGALIDAD',
    'Talento Humano',
    'Carlos Pérez Gómez',
    'Director de Talento Humano',
    'carlos.perez@esap.gov.co',
    'Revisión de Resolución de Nombramiento',
    'Se remite borrador de Resolución de Nombramiento en período de prueba para revisión de legalidad antes de firma.',
    'Administrativo',
    ARRAY['Nombramiento', 'Carrera Administrativa', 'Resolución'],
    'EN_ANALISIS',
    CURRENT_TIMESTAMP + INTERVAL '10 days',
    10,
    'ALTA'
),
(
    'CONS-OJ-2025-0003',
    'VIABILIDAD',
    'Dirección Territorial Cundinamarca',
    'Ana Martínez Ruiz',
    'Directora Territorial',
    'ana.martinez@esap.gov.co',
    'Viabilidad jurídica para convenio interadministrativo',
    'Se consulta sobre la viabilidad jurídica para celebrar convenio interadministrativo con la Gobernación de Cundinamarca.',
    'Contratación',
    ARRAY['Convenio', 'Interadministrativo', 'Territorial'],
    'RADICADA',
    CURRENT_TIMESTAMP + INTERVAL '30 days',
    30,
    'NORMAL'
)
ON CONFLICT (numero_radicado) DO NOTHING;

-- Actualizar secuencia
SELECT setval('seq_consulta_radicado', 4, false);
SELECT setval('seq_concepto_numero', 1, false);

-- =====================================================
-- Verificación
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Migración 036_create_asesoria_juridica.sql ejecutada correctamente';
    RAISE NOTICE '   - Tabla consultas_juridicas creada';
    RAISE NOTICE '   - Tabla conceptos_juridicos creada';
    RAISE NOTICE '   - Tabla historial_consultas creada';
    RAISE NOTICE '   - Triggers de numeración automática creados';
    RAISE NOTICE '   - 3 consultas de prueba insertadas';
END $$;
