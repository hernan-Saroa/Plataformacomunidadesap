-- Migration: Create wizard draft table for Plan Anual
-- Date: 2026-05-05
-- Description: Persists "Nuevo Plan" wizard draft per user in backend.

CREATE SCHEMA IF NOT EXISTS control_interno;

CREATE TABLE IF NOT EXISTS control_interno.plan_anual_wizard_borrador (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id VARCHAR(255) NOT NULL UNIQUE,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plan_anual_wizard_borrador_usuario_id
    ON control_interno.plan_anual_wizard_borrador (usuario_id);

