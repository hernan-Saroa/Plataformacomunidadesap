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
  campos_obligatorios JSONB NOT NULL DEFAULT '[]',
  campos_opcionales JSONB NOT NULL DEFAULT '[]',
  campos_ocultos JSONB NOT NULL DEFAULT '[]',
  documentos_obligatorios JSONB NOT NULL DEFAULT '[]',
  documentos_opcionales JSONB NOT NULL DEFAULT '[]',
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMP NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_config_campos_clave ON travel_expenses.config_campos_formulario(clave);
CREATE INDEX IF NOT EXISTS idx_config_campos_grupo_orden ON travel_expenses.config_campos_formulario(grupo, orden);
CREATE INDEX IF NOT EXISTS idx_config_tipo_comisionado_tipo ON travel_expenses.config_tipo_comisionado(tipo_comisionado);
