-- EFDS-2417: los entes de control de Planes de Mejoramiento son configurables
-- (Configuraciones SIGL → Entes de Control). `planes_mejoramiento.origen` guarda el id del
-- ente, y la restricción CHECK de la migración 064 solo admitía 8 valores fijos: un ente
-- creado con "Agregar Ente" no se podía usar en ningún plan nuevo (error 500).
-- Idempotente. La integridad del ente pasa a la configuración: legal-management-service no
-- permite eliminar un ente con planes asociados (solo inactivarlo).
-- Reversión (solo si no existen planes con entes personalizados): volver a crear la
-- restricción con la lista de 064_fix_planes_origen_constraint.sql.
ALTER TABLE legal_management.planes_mejoramiento
    DROP CONSTRAINT IF EXISTS planes_mejoramiento_origen_check;
