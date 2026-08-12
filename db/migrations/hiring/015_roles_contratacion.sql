-- ============================================================================
-- 015 · Roles del módulo de Contratación que faltaban
--
-- El código del hiring-service declara cuatro roles desde EFDS-1146, pero en
-- auth.role solo existen dos: GESTOR_CONTRATACION y REVISOR_CONTRATACION (más
-- SUPER_ADMIN, que es transversal).
--
-- Consecuencia práctica: las actividades 4.2 y 4.3 —verificar la disponibilidad
-- y expedir el CDP— son competencia de la Dirección Financiera, y sin el rol
-- sembrado nadie salvo un superadministrador podía ejecutarlas. La pantalla
-- respondía "este paso lo realiza la Dirección Financiera" a todo el mundo.
--
-- Se siembran con la misma forma que GESTOR_CONTRATACION para que el
-- backoffice de roles los liste igual que los demás.
-- ============================================================================

-- `id` es uuid sin valor por defecto en esta tabla, así que se genera aquí.
INSERT INTO auth.role (id, code, name, description, category, type, is_active, color, icon, sistema_destino)
VALUES
  (uuid_generate_v4(),
   'ESTRUCTURADOR_FINANCIERO',
   'Estructurador Financiero',
   'Dirección Financiera: verifica la disponibilidad presupuestal y expide el CDP de los procesos de contratación.',
   'backoffice', 'sistema', true, '#059669', 'Landmark', 'Backoffice'),

  (uuid_generate_v4(),
   'DIRECTOR_CONTRATACION',
   'Director de Contratación',
   'Dirección de Contratación: aprueba estudios previos y administra los umbrales de cuantía por modalidad.',
   'backoffice', 'sistema', true, '#7C3AED', 'Scale', 'Backoffice')
ON CONFLICT (code) DO NOTHING;
