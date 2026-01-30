-- =====================================================
-- MIGRACIÓN 044: Agregar campos de contacto para las partes procesales
-- Fecha: 2025-12-26
-- Descripción: Agrega dirección, teléfono, email y apoderado del demandante
-- =====================================================

-- Agregar campos de contacto para el demandante
ALTER TABLE legal_management.expedientes
ADD COLUMN IF NOT EXISTS demandante_direccion VARCHAR(500),
ADD COLUMN IF NOT EXISTS demandante_telefono VARCHAR(50),
ADD COLUMN IF NOT EXISTS demandante_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS demandante_apoderado VARCHAR(255);

-- Agregar campos de contacto para el demandado (opcional, ESAP tiene datos fijos)
ALTER TABLE legal_management.expedientes
ADD COLUMN IF NOT EXISTS demandado_direccion VARCHAR(500),
ADD COLUMN IF NOT EXISTS demandado_telefono VARCHAR(50),
ADD COLUMN IF NOT EXISTS demandado_email VARCHAR(255);

-- Comentarios para documentar los campos
COMMENT ON COLUMN legal_management.expedientes.demandante_direccion IS 'Dirección de notificaciones del demandante';
COMMENT ON COLUMN legal_management.expedientes.demandante_telefono IS 'Teléfono de contacto del demandante';
COMMENT ON COLUMN legal_management.expedientes.demandante_email IS 'Correo electrónico del demandante';
COMMENT ON COLUMN legal_management.expedientes.demandante_apoderado IS 'Nombre del apoderado del demandante';

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE 'Migración 044: Campos de contacto para partes procesales agregados correctamente.';
END $$;
