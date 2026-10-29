-- ============================================================================
-- 119 · Versiones del informe definitivo y su enlace en SECOP
--
-- La revisión de QA de la etapa 7 (EFDS-1159):
--
-- * El informe definitivo cambia después de la audiencia —al aplicar las
--   fórmulas a la oferta económica o al llegar observaciones nuevas— y se
--   tiene que poder actualizar, aun publicado, mientras no haya acto de
--   adjudicación. Cada actualización deja su versión con la fecha, el usuario
--   y el motivo: `versiones`, en el orden en que se generaron.
-- * La publicación se hace en SECOP, y lo que la prueba es el enlace más el
--   archivo de evidencia. El enlace se guarda en el informe y no solo en la
--   traza, para poder abrirlo desde la pantalla.
-- ============================================================================

BEGIN;

ALTER TABLE hiring.informes_definitivos
  ADD COLUMN IF NOT EXISTS enlace_publicacion varchar(1000),
  ADD COLUMN IF NOT EXISTS versiones jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN hiring.informes_definitivos.enlace_publicacion IS
  'Enlace de la publicación del informe definitivo en SECOP.';
COMMENT ON COLUMN hiring.informes_definitivos.versiones IS
  'Cada versión generada del informe, con documento, fecha, usuario, motivo y su publicación.';

-- Los que ya existían quedan con su única versión.
UPDATE hiring.informes_definitivos
   SET versiones = jsonb_build_array(jsonb_build_object(
         'numero', 1,
         'documentoId', informe_documento_id,
         'generadoAt', generado_at,
         'generadoPor', generado_por,
         'motivo', NULL,
         'evidenciaDocumentoId', evidencia_documento_id,
         'enlacePublicacion', NULL,
         'publicadoAt', publicado_at,
         'publicadoPor', publicado_por))
 WHERE jsonb_array_length(versiones) = 0;

COMMIT;
