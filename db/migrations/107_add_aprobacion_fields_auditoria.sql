-- ============================================
-- MIGRACIÓN 107: CAMPOS DE APROBACIÓN DE AUDITORÍAS
-- ============================================
-- Fecha: 22 Enero 2026
-- Descripción: Agrega campos para registrar la aprobación de auditorías
-- Autor: Sistema
-- ============================================

-- Agregar campo aprobada (boolean, default false)
ALTER TABLE control_interno.auditoria 
ADD COLUMN IF NOT EXISTS aprobada BOOLEAN NOT NULL DEFAULT false;

-- Agregar campo fecha_aprobacion (timestamp, nullable)
ALTER TABLE control_interno.auditoria 
ADD COLUMN IF NOT EXISTS fecha_aprobacion TIMESTAMP NULL;

-- Agregar campo aprobada_por (varchar, nullable)
ALTER TABLE control_interno.auditoria 
ADD COLUMN IF NOT EXISTS aprobada_por VARCHAR(255) NULL;

-- Agregar campo aprobada_por_id (bigint, nullable, FK a auth.personas)
ALTER TABLE control_interno.auditoria 
ADD COLUMN IF NOT EXISTS aprobada_por_id BIGINT NULL;

-- Crear índice para optimizar consultas por estado de aprobación
CREATE INDEX IF NOT EXISTS idx_auditoria_aprobada 
ON control_interno.auditoria(aprobada);

-- Crear índice para fecha de aprobación
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha_aprobacion 
ON control_interno.auditoria(fecha_aprobacion);

-- ============================================
-- MIGRACIÓN DE DATOS: Marcar auditorías existentes como aprobadas
-- ============================================
-- Las auditorías en estado "Seguimiento" o "Finalizada" se consideran aprobadas
UPDATE control_interno.auditoria 
SET aprobada = true,
    fecha_aprobacion = updated_at, -- Usar la fecha de última actualización como referencia
    aprobada_por = 'Migración Automática'
WHERE estado_kanban IN ('Seguimiento', 'Finalizada')
  AND aprobada = false;

-- ============================================
-- COMENTARIOS EN COLUMNAS
-- ============================================
COMMENT ON COLUMN control_interno.auditoria.aprobada IS 
  'Indica si la auditoría fue aprobada por el Jefe de Control Interno';

COMMENT ON COLUMN control_interno.auditoria.fecha_aprobacion IS 
  'Fecha y hora en que la auditoría fue aprobada';

COMMENT ON COLUMN control_interno.auditoria.aprobada_por IS 
  'Nombre completo del usuario que aprobó la auditoría';

COMMENT ON COLUMN control_interno.auditoria.aprobada_por_id IS 
  'ID del usuario que aprobó la auditoría (referencia a auth.personas)';

-- ============================================
-- RESUMEN DE CAMBIOS
-- ============================================
-- ✅ Campo aprobada agregado (boolean, default false)
-- ✅ Campo fecha_aprobacion agregado (timestamp, nullable)
-- ✅ Campo aprobada_por agregado (varchar, nullable)
-- ✅ Campo aprobada_por_id agregado (bigint, nullable)
-- ✅ Índices creados para optimización
-- ✅ Auditorías en Seguimiento/Finalizada marcadas como aprobadas
-- ✅ Comentarios agregados para documentación

-- ============================================
-- VALIDACIÓN
-- ============================================
-- Para verificar que la migración se aplicó correctamente:
-- SELECT aprobada, COUNT(*) 
-- FROM control_interno.auditoria 
-- GROUP BY aprobada;
