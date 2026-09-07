-- Unifica salario y prima en el orden institucional: valor numerico y luego valor en letras.
-- Los snapshots historicos siguen cubiertos por la normalizacion del renderizador central.

BEGIN;

UPDATE certification.technical_bonus_templates
SET template_text = regexp_replace(
      template_text,
      '\{valor_letras\}\s*(\(\s*\$?\s*\{valor_numerico\}\s*\))',
      '\1 {valor_letras}',
      'gi'
    ),
    updated_at = NOW()
WHERE template_text ~* '\{valor_letras\}\s*\(\s*\$?\s*\{valor_numerico\}\s*\)';

COMMENT ON COLUMN certification.technical_bonus_templates.template_text IS
  'Template with placeholders rendered in institutional order: numeric amount followed by amount in words';

COMMIT;
