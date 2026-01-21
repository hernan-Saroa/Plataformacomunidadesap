UPDATE auth.permission
SET name = 'Registrar decisión', description = 'Permite registrar decisiones del expediente de juzgamiento disciplinario'
WHERE code = 'gestion-legal.juzgamiento-disciplinario.expediente.decision';

INSERT INTO auth.permission (code, name, description, id_module)
SELECT p.code, p.name, p.description, m.id_module
FROM (VALUES
  -- DEFENSA JUDICIAL
  ('gestion-legal.juzgamiento-disciplinario.expediente.excepcion', 'Crear excepción', 'Permite crear excepciones del expediente de juzgamiento disciplinario', 'gestion-legal'),
  ('gestion-legal.juzgamiento-disciplinario.expediente.decision.notificar', 'Notificar decisión', 'Permite notificar decisiones del expediente de juzgamiento disciplinario', 'gestion-legal')
) AS p(code,name,description,module_code)
JOIN auth.module m ON m.code = p.module_code;