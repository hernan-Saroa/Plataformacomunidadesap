-- ============================================
-- MIGRACIÓN: AGREGAR COLUMNAS FALTANTES
-- ============================================
-- Descripción: Agrega las columnas que faltan en certificate_template_config
--              y crea la tabla firmantes si no existe
-- Fecha: 2025-12-12
-- IMPORTANTE: Este script es IDEMPOTENTE - se puede ejecutar múltiples veces
-- ============================================

SET search_path TO certification, public;

-- ============================================
-- PASO 1: Crear tabla firmantes si no existe
-- ============================================
CREATE TABLE IF NOT EXISTS firmantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_completo VARCHAR(255) NOT NULL,
  cargo VARCHAR(150) NOT NULL,
  dependencia VARCHAR(255) NOT NULL,
  activo BOOLEAN DEFAULT TRUE,
  es_principal BOOLEAN DEFAULT FALSE,
  firma_digital_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear índice
CREATE INDEX IF NOT EXISTS idx_firmantes_principal
ON firmantes(es_principal)
WHERE es_principal = TRUE;

-- Insertar firmante principal si no existe
INSERT INTO firmantes (
  nombre_completo,
  cargo,
  dependencia,
  activo,
  es_principal,
  firma_digital_url
)
SELECT
  'ALBA LUCÍA MARÍN ZULUAGA',
  'Directora de Talento Humano',
  'Dirección de Talento Humano',
  TRUE,
  TRUE,
  NULL
WHERE NOT EXISTS (
  SELECT 1 FROM firmantes WHERE es_principal = TRUE
);

-- ============================================
-- PASO 2: Agregar columnas faltantes a certificate_template_config
-- ============================================
DO $$
BEGIN
    -- Agregar typography_font si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'certification'
        AND table_name = 'certificate_template_config'
        AND column_name = 'typography_font'
    ) THEN
        ALTER TABLE certificate_template_config
        ADD COLUMN typography_font VARCHAR(100) DEFAULT 'Times New Roman';
        RAISE NOTICE 'Columna typography_font agregada';
    END IF;

    -- Agregar cargo_title si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'certification'
        AND table_name = 'certificate_template_config'
        AND column_name = 'cargo_title'
    ) THEN
        ALTER TABLE certificate_template_config
        ADD COLUMN cargo_title TEXT;
        RAISE NOTICE 'Columna cargo_title agregada';
    END IF;

    -- Agregar certificate_content_html si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'certification'
        AND table_name = 'certificate_template_config'
        AND column_name = 'certificate_content_html'
    ) THEN
        ALTER TABLE certificate_template_config
        ADD COLUMN certificate_content_html TEXT;
        RAISE NOTICE 'Columna certificate_content_html agregada';
    END IF;

    -- Agregar firmante_id si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'certification'
        AND table_name = 'certificate_template_config'
        AND column_name = 'firmante_id'
    ) THEN
        ALTER TABLE certificate_template_config
        ADD COLUMN firmante_id UUID REFERENCES firmantes(id) ON DELETE SET NULL;
        RAISE NOTICE 'Columna firmante_id agregada';
    END IF;
END $$;

-- ============================================
-- PASO 3: Actualizar datos iniciales si es necesario
-- ============================================
-- Si la tabla certificate_template_config está vacía, insertar configuración inicial
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
  SELECT 1 FROM certificate_template_config WHERE is_active = TRUE
);

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================
SELECT
    '✓ MIGRACIÓN COMPLETADA EXITOSAMENTE' as status,
    COUNT(*) as total_firmantes
FROM firmantes;

SELECT
    '✓ Configuración de plantilla' as tabla,
    COUNT(*) as registros
FROM certificate_template_config;
