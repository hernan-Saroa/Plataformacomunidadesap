-- ---------------------------------------------------------------------------
-- Migracion 013 · EFDS-1734 RF-INF-005 + EFDS-1731 AC-03 — Flujo remisiones Oficina TI
-- Fecha: 2026-09-18
-- Responsable: Coordinación UMI
-- Objetivo:
--   1. Incorporar al catálogo ESTADO_SOLICITUD el estado REMITIDA_TI (nuevo 13)
--      para aquellas solicitudes cuya remisión a Oficina TI fue confirmada por
--      recepción explícita del gestor (endpoint /aprobar-asignar en área TI).
--   2. Actualizar el COMMENT de la columna estado de solicitud_mantenimiento
--      para listar oficialmente REMITIDA_TI.
--
-- Idempotente: todos los INSERT llevan ON CONFLICT DO NOTHING.
-- ---------------------------------------------------------------------------

BEGIN;

-- Asegurar search_path para las tablas catalogo_item (infrastructure-management)
SET LOCAL search_path TO "infrastructure-management", public;

-- Paso 1: Nuevo estado REMITIDA_TI en catálogo ESTADO_SOLICITUD — grupo EJECUCION TIC
INSERT INTO "infrastructure-management".catalogo_item (catalogo, codigo, nombre, orden, metadata, is_activo)
VALUES (
  'ESTADO_SOLICITUD',
  'REMITIDA_TI',
  'Remitida a Oficina TIC',
  13,
  '{"color": "bg-cyan-100 text-cyan-800 border border-cyan-200", "icon": "monitor-smartphone", "grupo": "EJECUCION_TIC"}'::jsonb,
  TRUE
)
ON CONFLICT (catalogo, codigo) DO NOTHING;

-- Paso 2: Actualizar comentario de la columna estado para incluir REMITIDA_TI
COMMENT ON COLUMN "infrastructure-management".solicitud_mantenimiento.estado
  IS 'Estado formal de la solicitud (EFDS-1728). Válidos: RECIBIDA, EN_ANALISIS, PENDIENTE_COTIZACION, PENDIENTE_APROBACION, EN_VALORACION, EN_PROCESO, EN_EJECUCION, PENDIENTE_RECURSO, COMPLETADA, CERRADA, CERRADA_SIN_ATENCION, RECHAZADA, REMITIDA_TI.';

-- Paso 3: Backfill: todas las solicitudes area_responsable_actual = 'TI' y
-- estado NO terminal (COMPLETADA/CERRADA/RECHAZADA) y NO REMITIDA_TI se
-- normalizan a REMITIDA_TI.
UPDATE "infrastructure-management".solicitud_mantenimiento
   SET estado = 'REMITIDA_TI'
 WHERE area_responsable_actual = 'TI'
   AND estado NOT IN ('COMPLETADA', 'CERRADA', 'CERRADA_SIN_ATENCION', 'RECHAZADA', 'REMITIDA_TI');

COMMIT;
