-- ============================================
-- SCHEMA EXTENDIDO ESAP - Schema Adicional
-- Base de datos: PostgreSQL
-- Schema: esap (nuevo schema separado)
-- ============================================

-- Crear nuevo schema para ESAP
CREATE SCHEMA IF NOT EXISTS esap;

-- ============================================
-- Tabla: configuracion_esap
-- ============================================
CREATE TABLE IF NOT EXISTS esap.configuracion_esap (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clave VARCHAR(255) UNIQUE NOT NULL,
    valor TEXT NOT NULL,
    descripcion TEXT,
    tipo VARCHAR(50) DEFAULT 'string' CHECK (tipo IN ('string', 'number', 'boolean', 'json')),
    categoria VARCHAR(255),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_config_esap_clave ON esap.configuracion_esap(clave);
CREATE INDEX idx_config_esap_categoria ON esap.configuracion_esap(categoria);
CREATE INDEX idx_config_esap_activo ON esap.configuracion_esap(activo);

-- ============================================
-- Tabla: usuarios_esap
-- ============================================
CREATE TABLE IF NOT EXISTS esap.usuarios_esap (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(255) UNIQUE NOT NULL,
    nombre_completo VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    cargo VARCHAR(255),
    area VARCHAR(255),
    rol VARCHAR(100),
    activo BOOLEAN DEFAULT TRUE,
    ultimo_acceso TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_usuarios_esap_codigo ON esap.usuarios_esap(codigo);
CREATE INDEX idx_usuarios_esap_email ON esap.usuarios_esap(email);
CREATE INDEX idx_usuarios_esap_activo ON esap.usuarios_esap(activo);

-- ============================================
-- Tabla: sesiones_esap
-- ============================================
CREATE TABLE IF NOT EXISTS esap.sesiones_esap (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL,
    token VARCHAR(500) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    fecha_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion TIMESTAMP NOT NULL,
    activa BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sesion_usuario FOREIGN KEY (usuario_id) 
        REFERENCES esap.usuarios_esap(id) ON DELETE CASCADE
);

CREATE INDEX idx_sesiones_usuario ON esap.sesiones_esap(usuario_id);
CREATE INDEX idx_sesiones_token ON esap.sesiones_esap(token);
CREATE INDEX idx_sesiones_activa ON esap.sesiones_esap(activa);
CREATE INDEX idx_sesiones_expiracion ON esap.sesiones_esap(fecha_expiracion);

-- ============================================
-- Tabla: logs_auditoria_esap
-- ============================================
CREATE TABLE IF NOT EXISTS esap.logs_auditoria_esap (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID,
    accion VARCHAR(255) NOT NULL,
    entidad VARCHAR(255),
    entidad_id UUID,
    detalles JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_log_usuario FOREIGN KEY (usuario_id) 
        REFERENCES esap.usuarios_esap(id) ON DELETE SET NULL
);

CREATE INDEX idx_logs_usuario ON esap.logs_auditoria_esap(usuario_id);
CREATE INDEX idx_logs_accion ON esap.logs_auditoria_esap(accion);
CREATE INDEX idx_logs_entidad ON esap.logs_auditoria_esap(entidad);
CREATE INDEX idx_logs_created ON esap.logs_auditoria_esap(created_at DESC);

-- ============================================
-- Tabla: cache_esap
-- ============================================
CREATE TABLE IF NOT EXISTS esap.cache_esap (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clave VARCHAR(500) UNIQUE NOT NULL,
    valor JSONB NOT NULL,
    fecha_expiracion TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cache_clave ON esap.cache_esap(clave);
CREATE INDEX idx_cache_expiracion ON esap.cache_esap(fecha_expiracion);

-- ============================================
-- Tabla: plantillas_documentos_esap
-- ============================================
CREATE TABLE IF NOT EXISTS esap.plantillas_documentos_esap (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(255) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    tipo_documento VARCHAR(100) NOT NULL,
    contenido TEXT NOT NULL,
    variables_disponibles JSONB,
    activa BOOLEAN DEFAULT TRUE,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_plantillas_codigo ON esap.plantillas_documentos_esap(codigo);
CREATE INDEX idx_plantillas_tipo ON esap.plantillas_documentos_esap(tipo_documento);
CREATE INDEX idx_plantillas_activa ON esap.plantillas_documentos_esap(activa);

-- ============================================
-- Tabla: integraciones_esap
-- ============================================
CREATE TABLE IF NOT EXISTS esap.integraciones_esap (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) NOT NULL,
    tipo VARCHAR(100) NOT NULL CHECK (tipo IN ('api', 'webhook', 'sftp', 'email', 'otro')),
    configuracion JSONB NOT NULL,
    activa BOOLEAN DEFAULT TRUE,
    ultima_sincronizacion TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_integraciones_tipo ON esap.integraciones_esap(tipo);
CREATE INDEX idx_integraciones_activa ON esap.integraciones_esap(activa);

-- ============================================
-- Datos Iniciales
-- ============================================

-- Configuraciones iniciales ESAP
INSERT INTO esap.configuracion_esap (clave, valor, descripcion, tipo, categoria) VALUES
('esap_version', '1.0.0', 'Versión del sistema ESAP', 'string', 'sistema'),
('esap_nombre_institucion', 'ESAP', 'Nombre de la institución', 'string', 'sistema'),
('esap_logo_url', '/assets/logo-esap.png', 'URL del logo de la institución', 'string', 'sistema'),
('esap_contacto_email', 'contacto@esap.edu.co', 'Email de contacto', 'string', 'sistema'),
('esap_contacto_telefono', '+57 1 1234567', 'Teléfono de contacto', 'string', 'sistema'),
('esap_timezone', 'America/Bogota', 'Zona horaria', 'string', 'sistema'),
('esap_idioma_default', 'es', 'Idioma por defecto', 'string', 'sistema')
ON CONFLICT (clave) DO NOTHING;

-- ============================================
-- Comentarios
-- ============================================
COMMENT ON SCHEMA esap IS 'Schema adicional para funcionalidades específicas de ESAP';
COMMENT ON TABLE esap.configuracion_esap IS 'Configuraciones específicas del sistema ESAP';
COMMENT ON TABLE esap.usuarios_esap IS 'Usuarios del sistema ESAP';
COMMENT ON TABLE esap.sesiones_esap IS 'Sesiones activas de usuarios';
COMMENT ON TABLE esap.logs_auditoria_esap IS 'Logs de auditoría de acciones del sistema';
COMMENT ON TABLE esap.cache_esap IS 'Cache del sistema ESAP';
COMMENT ON TABLE esap.plantillas_documentos_esap IS 'Plantillas de documentos personalizadas';
COMMENT ON TABLE esap.integraciones_esap IS 'Configuración de integraciones externas';

