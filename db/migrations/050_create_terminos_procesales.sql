-- ============================================
-- Schema 50: Control de Términos e Informes
-- Tabla centralizada: legal_management.terminos_procesales
-- ============================================

-- Crear tabla terminos_procesales
CREATE TABLE IF NOT EXISTS legal_management.terminos_procesales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Vinculación con el Origen
    origen_modulo VARCHAR(50) NOT NULL CHECK (origen_modulo IN ('DEFENSA', 'JUZGAMIENTO', 'ASESORIA', 'MANUAL')),
    referencia_id UUID NOT NULL, -- ID del proceso/expediente en la tabla original (UUID para compatibilidad)
    numero_radicado VARCHAR(100), -- Para búsqueda rápida visual
    
    -- Datos del Término
    nombre_actuacion VARCHAR(255) NOT NULL, -- Ej: "Contestación Demanda", "Fallo Disciplinario"
    fecha_base TIMESTAMP WITH TIME ZONE NOT NULL, -- Fecha de notificación o inicio del conteo
    dias_termino INT NOT NULL, -- Cantidad de días otorgados
    tipo_dias VARCHAR(20) DEFAULT 'HABILES', -- 'HABILES' o 'CALENDARIO'
    
    -- Fechas Calculadas
    fecha_vencimiento TIMESTAMP WITH TIME ZONE NOT NULL, -- Calculada por el backend al insertar
    fecha_alerta_preventiva TIMESTAMP WITH TIME ZONE, -- (Vencimiento - 5 días)
    fecha_alerta_critica TIMESTAMP WITH TIME ZONE, -- (Vencimiento - 2 días)
    
    -- Gestión
    estado VARCHAR(20) DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'CUMPLIDO', 'VENCIDO', 'SUSPENDIDO')), 
    prioridad VARCHAR(10) DEFAULT 'MEDIA' CHECK (prioridad IN ('ALTA', 'MEDIA', 'BAJA')),
    responsable_id UUID, -- Usuario asignado
    
    -- Auditoría
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE
);

-- Índices para optimizar las vistas de Calendario y Lista
CREATE INDEX IF NOT EXISTS idx_terminos_vencimiento ON legal_management.terminos_procesales(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_terminos_estado ON legal_management.terminos_procesales(estado);
CREATE INDEX IF NOT EXISTS idx_terminos_responsable ON legal_management.terminos_procesales(responsable_id);
CREATE INDEX IF NOT EXISTS idx_terminos_referencia ON legal_management.terminos_procesales(referencia_id);
CREATE INDEX IF NOT EXISTS idx_terminos_origen ON legal_management.terminos_procesales(origen_modulo);

-- Comentarios
COMMENT ON TABLE legal_management.terminos_procesales IS 'Torre de control transversal para vencimientos de términos procesales de todos los módulos';
