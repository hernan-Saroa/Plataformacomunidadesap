-- ============================================================================
-- 117 · El memorando del comité evaluador se carga después
--
-- La revisión de QA de la 6.2 (EFDS-1156): el memorando de designación tarda
-- porque depende de las firmas de la subdirección, y exigirlo para designar
-- frenaba el proceso. Pasa a tratarse como el acta del Comité de Contratación
-- (113): el comité se registra con sus integrantes, el memorando llega cuando
-- esté firmado y, mientras falte, hay una alerta.
--
-- La fecha de designación es la del memorando, así que llega con él.
-- `designado_por_id` es para la alerta: si la 6.2 no tiene un puesto que la
-- haga, el aviso le llega a quien registró el comité.
-- ============================================================================

BEGIN;

ALTER TABLE hiring.comites_evaluadores ALTER COLUMN memorando_documento_id DROP NOT NULL;
ALTER TABLE hiring.comites_evaluadores ALTER COLUMN fecha_designacion DROP NOT NULL;

ALTER TABLE hiring.comites_evaluadores
  ADD COLUMN IF NOT EXISTS designado_por_id varchar(120);

COMMENT ON COLUMN hiring.comites_evaluadores.memorando_documento_id IS
  'El memorando firmado. Nulo mientras no llegue: no frena el proceso, pero genera alerta.';

INSERT INTO hiring.parametros_alerta (clave, valor, minimo, maximo, descripcion)
VALUES ('plazo_memorando_comite', 10, 1, 60,
        'Días calendario que puede tardar el memorando de designación del comité evaluador antes de darse por vencido')
ON CONFLICT (clave) DO NOTHING;

COMMIT;
