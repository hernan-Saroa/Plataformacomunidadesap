-- Complementarias: Programa previo y responsable final independientes.
-- Crea permisos asignables; no concede permisos nuevos a roles existentes.
BEGIN;

INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
SELECT gen_random_uuid(), permiso.code, permiso.name, permiso.description, modulo.id_module, true
FROM auth.module modulo
CROSS JOIN (VALUES
  ('pta.review.complementarias.decanatura', 'Revisar Complementarias - Decanatura',
   'Permite revisar las dos subsecciones de Complementarias dirigidas a Decanatura'),
  ('pta.approve.complementarias.decanatura', 'Aprobar Complementarias - Decanatura',
   'Permite aprobar Complementarias de Decanatura después del programa previo, cuando aplique'),
  ('pta.review.complementarias.territorial', 'Revisar Complementarias - Territorial',
   'Permite revisar las dos subsecciones de Complementarias dirigidas al responsable Territorial'),
  ('pta.approve.complementarias.territorial', 'Aprobar Complementarias - Territorial',
   'Permite aprobar Complementarias del responsable Territorial después del programa previo, cuando aplique')
) AS permiso(code, name, description)
WHERE modulo.code = 'pta'
ON CONFLICT (code) DO NOTHING;

COMMIT;
