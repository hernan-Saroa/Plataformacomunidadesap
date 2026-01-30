-- ============================================
-- MIGRACIÓN 1: CREAR TABLA FIRMANTES
-- ============================================
-- Descripción: Tabla de firmantes autorizados para certificados laborales
-- Fecha: 2025-12-11
-- Orden: 1/3

SET search_path TO certification, public;

-- Crear tabla firmantes
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

-- Índice para buscar el firmante principal rápidamente
CREATE INDEX IF NOT EXISTS idx_firmantes_principal
ON firmantes(es_principal)
WHERE es_principal = TRUE;

-- Insertar firmante principal por defecto
INSERT INTO firmantes (
  nombre_completo,
  cargo,
  dependencia,
  activo,
  es_principal,
  firma_digital_url
) VALUES (
  'ALBA LUCÍA MARÍN ZULUAGA',
  'Directora de Talento Humano',
  'Dirección de Talento Humano',
  TRUE,
  TRUE,
  NULL
)
ON CONFLICT DO NOTHING;

-- Comentarios
COMMENT ON TABLE firmantes IS 'Firmantes autorizados para certificados laborales';
COMMENT ON COLUMN firmantes.es_principal IS 'Indica si es el firmante principal por defecto';
COMMENT ON COLUMN firmantes.firma_digital_url IS 'URL de la imagen de la firma digital (grafo)';
