-- Rollback Migración 033: RF-INF-014 Alarmas y Notificaciones Multicanal (Umbral 70% y Emergencias Críticas)

BEGIN;

ALTER TABLE "infrastructure-management".solicitud_mantenimiento
  DROP COLUMN IF EXISTS alerta_70_emitida,
  DROP COLUMN IF EXISTS fecha_alerta_70,
  DROP COLUMN IF EXISTS es_emergencia_critica,
  DROP COLUMN IF EXISTS emergencia_confirmada,
  DROP COLUMN IF EXISTS emergencia_confirmada_por,
  DROP COLUMN IF EXISTS fecha_confirmacion_emergencia,
  DROP COLUMN IF EXISTS notas_confirmacion_emergencia;

COMMIT;
