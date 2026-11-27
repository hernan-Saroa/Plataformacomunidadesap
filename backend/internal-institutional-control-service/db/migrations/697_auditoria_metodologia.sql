-- ============================================================
-- Migración 697: la metodología de la auditoría usa su columna
-- ============================================================
-- La tabla ya traía la columna metodologia (esquema inicial y la vieja
-- 036), pero el backend no la usaba: al crear la auditoría la pegaba al
-- final de las observaciones ("Metodología:" + texto) y al editarla
-- (paso 5 del editar o el expediente) la descartaba, así que nunca se
-- podía cambiar ni se volvía a mostrar.
--
-- Se asegura la columna (no existe en bases creadas sin ese esquema) y
-- se pasa a ella la metodología que estaba en las observaciones, dejando
-- en las observaciones solo lo demás.
-- ============================================================

ALTER TABLE control_interno.auditoria
  ADD COLUMN IF NOT EXISTS metodologia text;

COMMENT ON COLUMN control_interno.auditoria.metodologia IS
  'Metodología de la auditoría (enfoque y técnicas); se edita en el paso 5 del editar';

UPDATE control_interno.auditoria
   SET metodologia = substring(observaciones_adicionales FROM E'(?:^|\\n\\n)Metodología:\\n(.*)$'),
       observaciones_adicionales = NULLIF(
         regexp_replace(observaciones_adicionales, E'(^|\\n\\n)Metodología:\\n.*$', ''),
         ''
       )
 WHERE metodologia IS NULL
   AND observaciones_adicionales ~ E'(^|\\n\\n)Metodología:\\n';
