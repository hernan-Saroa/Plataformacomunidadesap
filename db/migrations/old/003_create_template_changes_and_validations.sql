-- ============================================
-- MIGRACIÓN 3: HISTORIAL Y VALIDACIONES
-- ============================================
-- Descripción: Tablas de historial de cambios y validaciones de certificados
-- Fecha: 2025-12-11
-- Orden: 3/3
-- IMPORTANTE: Ejecutar DESPUÉS de FINAL_02_create_certificate_template_config.sql

SET search_path TO certification, public;

-- Habilitar extensión para UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================
-- TABLA: template_config_changes
-- ==========================
-- Registra historial de cambios en la configuración de plantilla

CREATE TABLE IF NOT EXISTS template_config_changes (
  id SERIAL PRIMARY KEY,

  -- Referencia a la configuración modificada
  template_config_id INTEGER REFERENCES certificate_template_config(id) ON DELETE CASCADE,

  -- Tipo de cambio realizado
  change_type VARCHAR(50) NOT NULL, -- 'logo', 'firma', 'nombre', 'tipografia', 'contenido', 'titulo_cargo', 'multiple'

  -- Campo específico que cambió
  field_name VARCHAR(100) NOT NULL, -- 'entity_logo_url', 'firma_digital_url', 'typography_font', etc.

  -- Valores antes y después del cambio
  old_value TEXT,
  new_value TEXT,

  -- Información adicional del cambio (JSON)
  metadata JSONB,

  -- Auditoría
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  changed_by VARCHAR(255),

  -- IP o información adicional del usuario
  user_info JSONB
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_template_config_changes_config_id
ON template_config_changes(template_config_id);

CREATE INDEX IF NOT EXISTS idx_template_config_changes_type
ON template_config_changes(change_type);

CREATE INDEX IF NOT EXISTS idx_template_config_changes_date
ON template_config_changes(changed_at DESC);

-- Comentarios
COMMENT ON TABLE template_config_changes IS 'Historial de cambios en la configuración de plantillas de certificados';
COMMENT ON COLUMN template_config_changes.change_type IS 'Tipo de cambio: logo, firma, nombre, tipografia, contenido, titulo_cargo, multiple';
COMMENT ON COLUMN template_config_changes.field_name IS 'Campo específico modificado en la entidad';
COMMENT ON COLUMN template_config_changes.old_value IS 'Valor anterior del campo';
COMMENT ON COLUMN template_config_changes.new_value IS 'Nuevo valor del campo';
COMMENT ON COLUMN template_config_changes.metadata IS 'Información adicional en formato JSON';
COMMENT ON COLUMN template_config_changes.user_info IS 'Información del usuario que realizó el cambio';

-- ==========================
-- TABLA: certificate_validations
-- ==========================
-- Registra validaciones de certificados vía código QR

CREATE TABLE IF NOT EXISTS certificate_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id UUID NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
  validation_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address VARCHAR(50),
  user_agent TEXT,
  location VARCHAR(255),
  result VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_certificate_validations_certificate_id
ON certificate_validations(certificate_id);

CREATE INDEX IF NOT EXISTS idx_certificate_validations_validation_date
ON certificate_validations(validation_date DESC);

-- Comentarios
COMMENT ON TABLE certificate_validations IS 'Historial de validaciones de certificados laborales';
COMMENT ON COLUMN certificate_validations.certificate_id IS 'Referencia al certificado validado';
COMMENT ON COLUMN certificate_validations.result IS 'Resultado de la validación (válido, inválido, expirado, etc.)';
