-- ============================================
-- MIGRACIÓN 2: CREAR CONFIGURACIÓN DE PLANTILLA
-- ============================================
-- Descripción: Tabla de configuración de plantilla para certificados laborales
-- Fecha: 2025-12-11
-- Orden: 2/3
-- IMPORTANTE: Ejecutar DESPUÉS de FINAL_01_create_firmantes.sql

SET search_path TO certification, public;

-- Crear tabla de configuración de plantilla
CREATE TABLE IF NOT EXISTS certificate_template_config (
  id SERIAL PRIMARY KEY,

  -- Referencia al firmante principal
  firmante_id UUID REFERENCES firmantes(id) ON DELETE SET NULL,

  -- Logo de la entidad ESAP
  entity_logo_url TEXT,
  entity_logo_filename VARCHAR(255),
  entity_logo_size VARCHAR(50),

  -- Tipografía y contenido
  typography_font VARCHAR(100) DEFAULT 'Times New Roman',
  cargo_title TEXT,
  certificate_content_html TEXT,

  -- Estado y versión
  version VARCHAR(20) DEFAULT '1.0.0',
  status VARCHAR(50) DEFAULT 'draft',

  -- Auditoría
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255),
  updated_by VARCHAR(255),

  -- Solo debe haber una configuración activa
  is_active BOOLEAN DEFAULT TRUE
);

-- Índice para encontrar rápidamente la configuración activa
CREATE INDEX IF NOT EXISTS idx_certificate_template_config_active
ON certificate_template_config(is_active)
WHERE is_active = TRUE;

-- Insertar configuración inicial con contenido actualizado
INSERT INTO certificate_template_config (
  firmante_id,
  entity_logo_url,
  entity_logo_filename,
  entity_logo_size,
  typography_font,
  cargo_title,
  certificate_content_html,
  version,
  status,
  created_by,
  updated_by,
  is_active
)
SELECT
  (SELECT id FROM firmantes WHERE es_principal = true LIMIT 1),
  NULL,
  NULL,
  NULL,
  'Times New Roman',
  'LA DIRECTORA TÉCNICA DE TALENTO HUMANO DE LA
ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA – ESAP',
  '<p>Que <b>[NOMBRE_EMPLEADO]</b> identificado(a) con cédula de ciudadanía No. <b>[DOCUMENTO]</b>, se encuentra vinculado(a) con la Escuela Superior de Administración Pública – ESAP, mediante nombramiento Docente <b>[CARGO]</b> desde el <b>[FECHA_INICIO]</b>, en la categoría <b>[DEPENDENCIA]</b> ubicado en <b>[DATO6]</b>.</p><p>Que <b>[NOMBRE_EMPLEADO]</b> percibe mensualmente una asignación salarial de <b>[SALARIO]</b> <b>[SALARIO_LETRAS]</b> pesos m/cte.</p><p>Se expide en la ciudad de Bogotá D.C., a solicitud del interesado(a) a los <b>[FECHA_EXPEDICION_COMPLETA]</b>.</p>',
  '1.0.0',
  'draft',
  'Sistema',
  'Sistema',
  TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM certificate_template_config LIMIT 1
);

-- Comentarios
COMMENT ON TABLE certificate_template_config IS 'Configuración de plantilla para certificados laborales';
COMMENT ON COLUMN certificate_template_config.is_active IS 'Solo debe haber una configuración activa a la vez';
COMMENT ON COLUMN certificate_template_config.firmante_id IS 'Referencia al firmante principal (tabla firmantes)';
COMMENT ON COLUMN certificate_template_config.entity_logo_url IS 'URL del logo institucional de ESAP';
COMMENT ON COLUMN certificate_template_config.typography_font IS 'Fuente tipográfica aplicada al certificado';
COMMENT ON COLUMN certificate_template_config.cargo_title IS 'Título del cargo que aparece en el encabezado del certificado';
COMMENT ON COLUMN certificate_template_config.certificate_content_html IS 'Contenido HTML del certificado con variables dinámicas';
