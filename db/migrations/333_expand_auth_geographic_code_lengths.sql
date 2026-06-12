-- Migration 333: Allow imported geographic codes longer than legacy 5 chars
-- Schema: auth

ALTER TABLE auth.seccionales
  ALTER COLUMN cod_seccional TYPE VARCHAR(20);

ALTER TABLE auth.sedes
  ALTER COLUMN cod_sede TYPE VARCHAR(20);
