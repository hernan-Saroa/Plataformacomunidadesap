-- ============================================================================
-- 103 · El CDP se tramita por fuera y aquí solo se carga
--
-- Hasta aquí el aplicativo llevaba el trámite del CDP completo: el área lo
-- solicitaba (en la 3.1 o en la 4.1, o lo pedía solo el cierre de la etapa 3),
-- la solicitud llegaba a la bandeja de la Dirección Financiera y ella lo
-- verificaba y lo expedía en la 4.2.
--
-- La Financiera ya no va a atender solicitudes desde el aplicativo: el CDP se
-- pide y se expide por fuera, y aquí solo se carga el certificado que ya
-- existe. Desde esta migración:
--
--   · la 4.1 (solicitud de CDP) se desactiva, con sus alcances, como la 090,
--     la 094 y la 096 hicieron con las actividades que dejaron de existir;
--   · la 4.2 pasa a ser el cargue del CDP: número, valor, rubro, fecha y el
--     certificado firmado. La carga el área solicitante, así que el permiso de
--     editarla deja de ser de la Financiera y pasa al Estructurador Técnico;
--   · el área también puede cargarlo antes, desde la 3.1. Si lo hizo, la 4.2
--     se cierra sola al terminar la etapa 3, como ya pasaba desde la 100.
--
-- `cdp_antes_de_radicar` se conserva por modalidad, pero desde aquí lo que
-- exige es el CDP cargado: ya no hay solicitud que baste.
--
-- Los CDP que quedaron solicitados o verificados no se tocan: se completan
-- cargando el certificado en la 4.2.
--
-- Idempotente: correrla otra vez deja lo mismo.
-- ============================================================================

BEGIN;

UPDATE hiring.alcances_permiso
   SET activo = false,
       updated_at = now()
 WHERE numeral = '4.1'
   AND activo;

UPDATE hiring.actividades
   SET activa = false
 WHERE numeral = '4.1';

UPDATE hiring.actividades
   SET nombre = 'Cargue del CDP',
       descripcion = 'El área solicitante carga el CDP que la Dirección Financiera expidió por fuera del '
                  || 'aplicativo: número, valor, rubro, fecha y el certificado firmado. Si ya lo cargó '
                  || 'en el estudio previo, la actividad se cierra sola. Sin CDP no se puede abrir el proceso.'
 WHERE numeral = '4.2';

-- La Financiera deja de editar la 4.2; sigue viendo la etapa 4, como las demás.
UPDATE hiring.alcances_permiso a
   SET activo = false,
       updated_at = now()
  FROM auth.role r
 WHERE r.id = a.rol_id
   AND r.code = 'ESTRUCTURADOR_FINANCIERO'
   AND a.accion = 'editar'
   AND a.numeral = '4.2'
   AND a.activo;

INSERT INTO hiring.alcances_permiso (rol_id, accion, numeral, confirmado, activo, created_by)
SELECT r.id, 'editar', '4.2', false, true, 'migracion-103'
  FROM auth.role r
 WHERE r.code = 'ESTRUCTURADOR_TECNICO'
   AND NOT EXISTS (
     SELECT 1 FROM hiring.alcances_permiso a
      WHERE a.rol_id = r.id AND a.accion = 'editar' AND a.numeral = '4.2' AND a.activo
   );

COMMENT ON COLUMN hiring.cdp.origen IS
  'ETAPA_4: se cargó en la 4.2 (antes de la 103, lo pedía el cierre de la etapa 3 o la 4.1). '
  'SOLICITADO_EN_ETAPA_3: el área lo solicitó desde el estudio previo (solo antes de la 103). '
  'REGISTRADO_EN_ETAPA_3: el área lo cargó desde el estudio previo.';

COMMENT ON TABLE hiring.cdp_antes_de_radicar IS
  'Por modalidad: si el estudio previo exige el CDP cargado antes de enviarse a revisión.';

COMMIT;
