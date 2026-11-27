-- EFDS-2417: los entes de control de Planes de Mejoramiento son configurables
-- (Configuraciones SIGL -> Entes de Control). `planes_mejoramiento.origen` guarda el id del
-- ente, y la restricción CHECK heredada de la migración 064 solo admitía 8 valores fijos,
-- impidiendo crear planes con entes agregados por el usuario.
-- Idempotente y ubicada dentro del microservicio legal-management-service.
ALTER TABLE legal_management.planes_mejoramiento
    DROP CONSTRAINT IF EXISTS planes_mejoramiento_origen_check;
