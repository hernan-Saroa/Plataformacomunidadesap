-- Migración: Actualizar el valor de la etapa INDAGACION a INDAGACION_PREVIA
-- Fecha: 2025-12-22
-- Descripción: Corrige el valor del enum ProcessStage.INDAGACION_PREVIA de 'INDAGACION' a 'INDAGACION_PREVIA'

-- NOTA: Si el ENUM de PostgreSQL ya está configurado correctamente con 'INDAGACION_PREVIA',
-- este script solo verificará el estado actual sin hacer cambios.

-- Primero, ver todos los valores posibles del ENUM
SELECT unnest(enum_range(NULL::disciplinary_processes_etapaactual_enum)) as etapa_disponible;

-- Verificar cuántos procesos hay en cada etapa
SELECT "etapaActual", COUNT(*) as cantidad
FROM disciplinary_processes
GROUP BY "etapaActual"
ORDER BY cantidad DESC;

-- Mostrar todos los procesos en etapa INDAGACION_PREVIA (si existen)
SELECT id, "radicadoProceso", "etapaActual", "kanbanStage", "updatedAt"
FROM disciplinary_processes
WHERE "etapaActual" = 'INDAGACION_PREVIA'
ORDER BY "updatedAt" DESC
LIMIT 10;
