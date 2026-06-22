-- ============================================================================
-- 348: Crear tablas faltantes del flujo RUND
--   - academic_work_plan."BancoDocentesInvitaciones"
--   - academic_work_plan."RundAprobacionLog"
-- ============================================================================
-- Objetivo: estas dos tablas tienen entidades TypeORM
-- (banco-docente-invitacion.entity.ts y rund-aprobacion-log.entity.ts) pero
-- nunca se crearon en la BD. La migración 333 sólo creó RundCampoEstado y
-- RundSoporteCampo. Con TYPEORM_SYNC=false, las consultas a estas tablas
-- revientan con 500 (p.ej. GET /pta/banco-docentes/invitaciones), bloqueando
-- todo el flujo de invitaciones y autogestión del docente.
--
-- Las columnas coinciden EXACTO con las entidades para evitar desalineación.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS academic_work_plan;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. BancoDocentesInvitaciones — invitaciones de autogestión (Canal 3) + OTP
CREATE TABLE IF NOT EXISTS academic_work_plan."BancoDocentesInvitaciones" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  correo_institucional TEXT NOT NULL,
  token_acceso TEXT NOT NULL UNIQUE,
  otp_codigo TEXT,
  otp_expira_en TIMESTAMP,
  intentos_otp INTEGER NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'Enviada',
  fecha_expiracion TIMESTAMP NOT NULL,
  borrador_json JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_banco_invitaciones_correo
  ON academic_work_plan."BancoDocentesInvitaciones" (correo_institucional);

CREATE INDEX IF NOT EXISTS idx_banco_invitaciones_token
  ON academic_work_plan."BancoDocentesInvitaciones" (token_acceso);

-- 2. RundAprobacionLog — log de auditoría inmutable del RUND (BR-056, sólo INSERT)
CREATE TABLE IF NOT EXISTS academic_work_plan."RundAprobacionLog" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  docente_id UUID NOT NULL,
  bloque TEXT,
  accion TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  canal_origen TEXT,
  campo_afectado TEXT,
  dato_previo TEXT,
  dato_nuevo TEXT,
  observacion TEXT,
  soporte_id TEXT,
  ip TEXT,
  metadata JSONB DEFAULT '{}',
  "createdAt" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rund_aprobacion_log_docente
  ON academic_work_plan."RundAprobacionLog" (docente_id);

COMMENT ON TABLE academic_work_plan."BancoDocentesInvitaciones" IS
  'Invitaciones de autogestión RUND (Canal 3): link público + OTP por correo. Estados: Enviada, Abierta, OTP validado, En proceso, Gestionada, Vencida.';

COMMENT ON TABLE academic_work_plan."RundAprobacionLog" IS
  'Log de auditoría inmutable del RUND (BR-056). Sólo INSERT: registra crear/aprobar/devolver/editar/vincular soporte.';
