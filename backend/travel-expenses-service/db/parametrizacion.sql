CREATE TABLE IF NOT EXISTS travel_expenses.config_campos_formulario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clave VARCHAR(100) NOT NULL UNIQUE,
  etiqueta VARCHAR(200) NOT NULL,
  tipo_campo VARCHAR(50) NOT NULL,
  placeholder VARCHAR(200),
  opciones JSONB,
  grupo VARCHAR(50),
  orden INTEGER NOT NULL DEFAULT 0,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMP NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS travel_expenses.config_tipo_comisionado (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_comisionado VARCHAR(50) NOT NULL UNIQUE,
  codigo_formulario VARCHAR(50) NOT NULL,
  campos_obligatorios JSONB NOT NULL DEFAULT '[]',
  campos_opcionales JSONB NOT NULL DEFAULT '[]',
  campos_ocultos JSONB NOT NULL DEFAULT '[]',
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMP NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS travel_expenses.tipos_documento_soporte (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(50) NOT NULL UNIQUE,
  nombre VARCHAR(100) NOT NULL,
  descripcion VARCHAR(255),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMP NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS travel_expenses.config_tipo_comisionado_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_tipo_comisionado_id UUID NOT NULL REFERENCES travel_expenses.config_tipo_comisionado(id) ON DELETE CASCADE,
  tipo_documento_soporte_id UUID NOT NULL REFERENCES travel_expenses.tipos_documento_soporte(id) ON DELETE CASCADE,
  tipo_requisito VARCHAR(20) NOT NULL CHECK (tipo_requisito IN ('OBLIGATORIO', 'OPCIONAL')),
  creado_en TIMESTAMP NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(config_tipo_comisionado_id, tipo_documento_soporte_id)
);

CREATE INDEX IF NOT EXISTS idx_config_campos_clave ON travel_expenses.config_campos_formulario(clave);
CREATE INDEX IF NOT EXISTS idx_config_campos_grupo_orden ON travel_expenses.config_campos_formulario(grupo, orden);
CREATE INDEX IF NOT EXISTS idx_config_tipo_comisionado_tipo ON travel_expenses.config_tipo_comisionado(tipo_comisionado);
CREATE INDEX IF NOT EXISTS idx_config_tipo_comisionado_codigo_formulario ON travel_expenses.config_tipo_comisionado(codigo_formulario);
CREATE INDEX IF NOT EXISTS idx_tipos_documento_soporte_codigo ON travel_expenses.tipos_documento_soporte(codigo);
CREATE INDEX IF NOT EXISTS idx_config_tipo_comisionado_documentos_config ON travel_expenses.config_tipo_comisionado_documentos(config_tipo_comisionado_id);
CREATE INDEX IF NOT EXISTS idx_config_tipo_comisionado_documentos_tipo ON travel_expenses.config_tipo_comisionado_documentos(tipo_documento_soporte_id);
