-- Registro de intenciones RUND en Auth; no crea ni modifica personas/cuentas/roles.
-- Aplicar en la base de Auth antes de utilizar las rutas de operaciones.
BEGIN;
CREATE TABLE IF NOT EXISTS auth.rund_identidad_operacion (
  operacion_id uuid PRIMARY KEY,
  version integer NOT NULL CHECK (version = 1),
  huella_comando varchar(64) NOT NULL CHECK (huella_comando ~ '^[a-f0-9]{64}$'),
  estado text NOT NULL DEFAULT 'REGISTRADA' CHECK (estado IN ('REGISTRADA','CANCELADA')),
  registrada_en timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cancelada_en timestamptz,
  CHECK ((estado = 'REGISTRADA' AND cancelada_en IS NULL) OR (estado = 'CANCELADA' AND cancelada_en IS NOT NULL))
);

CREATE OR REPLACE FUNCTION auth.proteger_rund_identidad_operacion()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'No se puede eliminar un recibo de intención RUND';
  END IF;
  IF NEW.operacion_id IS DISTINCT FROM OLD.operacion_id
    OR NEW.version IS DISTINCT FROM OLD.version
    OR NEW.huella_comando IS DISTINCT FROM OLD.huella_comando
    OR NEW.registrada_en IS DISTINCT FROM OLD.registrada_en
    OR OLD.estado <> 'REGISTRADA' OR NEW.estado <> 'CANCELADA'
    OR NEW.cancelada_en IS NULL THEN
    RAISE EXCEPTION 'Transición de intención RUND inválida';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS proteger_rund_identidad_operacion ON auth.rund_identidad_operacion;
CREATE TRIGGER proteger_rund_identidad_operacion BEFORE UPDATE OR DELETE ON auth.rund_identidad_operacion
FOR EACH ROW EXECUTE FUNCTION auth.proteger_rund_identidad_operacion();
COMMIT;
