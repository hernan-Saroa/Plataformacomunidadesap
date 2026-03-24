-- Script para limpiar todos los planes del Plan Anual 5 (Decreto 648)
-- Ejecutar con: docker exec -i superapp-db psql -U postgres -d esap_db -f - < db/migrations/limpiar_planes.sql

BEGIN;

-- 1. Eliminar adjuntos de actividades
DELETE FROM control_interno.adjunto_actividad_plan_anual_5;

-- 2. Eliminar actividades
DELETE FROM control_interno.actividad_plan_anual_5;

-- 3. Eliminar relación roles-plan
DELETE FROM control_interno.plan_anual_5_roles;

-- 4. Eliminar roles
DELETE FROM control_interno.rol_plan_anual_5;

-- 5. Verificar que todo esté limpio
SELECT 'Adjuntos eliminados' as tabla, COUNT(*) as restantes FROM control_interno.adjunto_actividad_plan_anual_5
UNION ALL
SELECT 'Actividades eliminadas', COUNT(*) FROM control_interno.actividad_plan_anual_5
UNION ALL
SELECT 'Relaciones roles-plan eliminadas', COUNT(*) FROM control_interno.plan_anual_5_roles
UNION ALL
SELECT 'Roles eliminados', COUNT(*) FROM control_interno.rol_plan_anual_5;

COMMIT;

SELECT '✅ Planes limpiados exitosamente' as resultado;
