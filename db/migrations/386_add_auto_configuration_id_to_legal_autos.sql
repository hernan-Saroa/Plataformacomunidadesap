-- Migration 386: Rastrear qué plantilla específica (autos_configuration) generó cada auto
-- Contexto: en Configuración → Plantillas de Autos, el aviso de "procesos en uso" al eliminar
-- una plantilla se calculaba por el campo genérico "tipo" (ej. AUTO_NORMAL), que ahora puede
-- estar compartido por varias plantillas activas. Esto hacía que el listado de procesos fuera
-- idéntico para todas las plantillas del mismo tipo. Se agrega la columna para que los autos
-- creados de ahora en adelante queden atados a la plantilla exacta usada.
--
-- No se agrega FK real: autos_configuration perdió su PRIMARY KEY en la migración 213
-- (autos_configuration_pkey), por lo que Postgres no permite referenciar esa columna.
-- Los autos existentes quedan con NULL (no hay forma de reconstruir ese dato retroactivamente).

ALTER TABLE internal_disciplinary_control.legal_autos
ADD COLUMN IF NOT EXISTS "autoConfigurationId" UUID;

CREATE INDEX IF NOT EXISTS idx_legal_autos_auto_configuration_id
    ON internal_disciplinary_control.legal_autos("autoConfigurationId");
