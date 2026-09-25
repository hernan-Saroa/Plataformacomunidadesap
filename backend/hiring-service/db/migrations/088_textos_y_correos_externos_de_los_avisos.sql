-- ============================================================================
-- 088 · El texto de cada aviso y los correos de fuera de la plataforma
--
-- Dos pedidos de la sesión de revisión del flujo de licitación pública:
--
-- 1. **El texto de los avisos.** Se configuraba a quién llega cada aviso, pero
--    lo que dice estaba escrito en el código. `titulo` y `mensaje` guardan el
--    texto que la Dirección quiera, con variables —{actividad}, {proceso},
--    {quien}…— que se llenan al enviarlo. Nulos: rige el texto de siempre.
--
-- 2. **Avisar a quien no tiene cuenta.** El contratista es externo a la
--    plataforma, y la plataforma no lleva el registro de contratistas —eso lo
--    hace Click—; lo único que se acordó pedir es su correo, en el acto de
--    adjudicación. `al_contratista` manda el aviso a ese correo, y
--    `correos_externos` a las direcciones que se escriban a mano. A ellos les
--    llega solo por correo: no tienen campana.
--
-- Reaplicarla no hace nada nuevo.
-- ============================================================================

ALTER TABLE hiring.avisos
  ADD COLUMN IF NOT EXISTS titulo varchar(120),
  ADD COLUMN IF NOT EXISTS mensaje text,
  ADD COLUMN IF NOT EXISTS correos_externos jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS al_contratista boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN hiring.avisos.titulo IS
  'Título del aviso con variables ({actividad}, {proceso}…). Nulo: el de siempre.';
COMMENT ON COLUMN hiring.avisos.mensaje IS
  'Cuerpo del aviso con variables ({actividad}, {proceso}, {quien}…). Nulo: el de siempre.';
COMMENT ON COLUMN hiring.avisos.correos_externos IS
  'Direcciones de correo de fuera de la plataforma que también reciben el aviso, solo por correo.';
COMMENT ON COLUMN hiring.avisos.al_contratista IS
  'Si el aviso llega también al correo del contratista, tomado del acto de adjudicación vigente.';

ALTER TABLE hiring.actos_adjudicacion
  ADD COLUMN IF NOT EXISTS correo_contratista varchar(200);

COMMENT ON COLUMN hiring.actos_adjudicacion.correo_contratista IS
  'Correo del adjudicatario, para notificarle desde la plataforma. Su registro maestro vive en Click.';
