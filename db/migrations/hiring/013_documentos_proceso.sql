-- ============================================================================
-- 013 · Elaboración de documentos del proceso
--
-- Segundo criterio de EFDS-1148 (RF-EST-06): en contratación directa el CDP se
-- exige antes de elaborar los demás documentos.
--
-- Es una regla de orden reforzada. En las diez modalidades restantes el CDP se
-- exige para la apertura (5.7); en contratación directa se adelanta hasta la
-- 5.1, que es donde arranca la elaboración documental. La razón práctica: en
-- directa no hay convocatoria ni pliego que publicar, así que la apertura no
-- funciona como control, y sin adelantar la exigencia el área podría redactar
-- la minuta de un contrato que el presupuesto no respalda.
-- ============================================================================

INSERT INTO hiring.actividades (numeral, etapa, nombre, descripcion, orden) VALUES
  ('5.1', 5, 'Elaboración de documentos del proceso',
   'A cargo de la Dirección de Contratación: aviso de convocatoria, proyecto de pliegos y anexos, borrador de minuta e invitación pública. En contratación directa, justificación y minuta.',
   10)
ON CONFLICT (numeral) DO NOTHING;

-- La matriz marca NO esta actividad en régimen especial 092 de 2017. Las demás
-- exclusiones de la etapa 5 se cargarán al trabajar esa etapa, con la matriz a
-- la vista: aquí solo se registra la que el documento fuente deja sin duda.
INSERT INTO hiring.actividades_excluidas (numeral, modalidad, motivo)
VALUES ('5.1', 'REGIMEN_ESPECIAL_092',
        'El régimen especial del Decreto 092 de 2017 no elabora los documentos ordinarios del proceso')
ON CONFLICT DO NOTHING;
