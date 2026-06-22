-- ============================================================
-- Migration 354: Create RundInvitacionDocente table for OTP
-- ============================================================

CREATE TABLE IF NOT EXISTS academic_work_plan."RundInvitacionDocente" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  correo_institucional VARCHAR(255) NOT NULL,
  documento_identidad VARCHAR(100),
  token_invitacion VARCHAR(255) UNIQUE NOT NULL,
  otp_hash VARCHAR(255),
  estado_invitacion VARCHAR(50) NOT NULL DEFAULT 'Enviada',
  caducidad_token TIMESTAMP NOT NULL,
  intentos_otp INTEGER DEFAULT 0,
  bloqueo_hasta TIMESTAMP,
  fecha_envio TIMESTAMP DEFAULT NOW(),
  fecha_apertura TIMESTAMP,
  ultima_actividad TIMESTAMP,
  docente_id TEXT,
  operador_id VARCHAR(255),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rund_invitacion_correo 
  ON academic_work_plan."RundInvitacionDocente" (correo_institucional);

CREATE INDEX IF NOT EXISTS idx_rund_invitacion_token 
  ON academic_work_plan."RundInvitacionDocente" (token_invitacion);
