-- ============================================================================
-- Migration: Seed del rol de contratación y de los campos del estudio previo
-- HU EFDS-1146 · numeral 3.1
--
-- IMPORTANTE — campos PROVISIONALES:
-- La lista de campos obligatorios del estudio previo no está enumerada en el
-- requerimiento (ESAP-TD-FO-019) ni en la matriz de flujo; el propio HU lo
-- señala y sugiere parametrizarla. Los campos de abajo se derivan de la
-- Ley 80/1993 art. 25 y del Decreto 1082/2015, y deben validarse contra el
-- formato institucional vigente de la Dirección de Contratación.
-- Ajustarlos después es un UPDATE en esta tabla, no un cambio de código.
-- ============================================================================

-- ------------------------------------------------------ rol de contratación ---
DO $$
DECLARE
  v_role_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.role WHERE code = 'GESTOR_CONTRATACION') THEN
    INSERT INTO auth.role (id, code, name, description, category, icon, color, type, is_active, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      'GESTOR_CONTRATACION',
      'Gestor de Contratación',
      'Abogado o profesional de la Dirección de Contratación que adelanta los procesos contractuales',
      'backoffice',
      'FileText',
      '#003DA5',
      'sistema',
      true,
      NOW(),
      NOW()
    );
    RAISE NOTICE 'Rol GESTOR_CONTRATACION creado';
  END IF;

  SELECT id INTO v_role_id FROM auth.role WHERE code = 'GESTOR_CONTRATACION';

  -- El superusuario necesita el rol para poder probar el módulo de punta a punta
  INSERT INTO auth.user_roles (id_user, id_rol, is_active, created_at, updated_at)
  SELECT u.id_user, v_role_id, true, NOW(), NOW()
  FROM auth."user" u
  WHERE u.username = 'superuser@esap.edu.co'
    AND NOT EXISTS (
      SELECT 1 FROM auth.user_roles ur
      WHERE ur.id_user = u.id_user AND ur.id_rol = v_role_id
    );
END $$;

-- ------------------------------------------ campos del estudio previo (3.1) ---
INSERT INTO hiring.campos_formulario
  (numeral, codigo, etiqueta, ayuda, tipo, obligatorio, grupo, orden, opciones)
VALUES
  ('3.1', 'objeto_contratar', 'Objeto a contratar',
   'Descripción precisa de lo que la entidad requiere contratar.',
   'texto_largo', true, 'Identificación', 10, NULL),

  ('3.1', 'area_solicitante', 'Área solicitante',
   NULL, 'texto', true, 'Identificación', 20, NULL),

  ('3.1', 'rubro_presupuestal', 'Rubro presupuestal',
   NULL, 'texto', true, 'Identificación', 30, NULL),

  ('3.1', 'descripcion_necesidad', 'Descripción de la necesidad',
   'Qué necesidad de la entidad se pretende satisfacer.',
   'texto_largo', true, 'Necesidad', 40, NULL),

  ('3.1', 'justificacion', 'Justificación de la necesidad',
   'Debe sustentar la conveniencia y oportunidad conforme al artículo 25 de la Ley 80 de 1993.',
   'texto_largo', true, 'Necesidad', 50, NULL),

  ('3.1', 'especificaciones_tecnicas', 'Especificaciones técnicas',
   NULL, 'texto_largo', true, 'Objeto', 60, NULL),

  ('3.1', 'obligaciones_contratista', 'Obligaciones del contratista',
   NULL, 'texto_largo', true, 'Objeto', 70, NULL),

  ('3.1', 'valor_estimado', 'Valor estimado',
   'Valor en pesos, soportado en el análisis del sector.',
   'moneda', true, 'Valor y forma de pago', 80, NULL),

  ('3.1', 'forma_pago', 'Forma de pago',
   NULL, 'texto_largo', true, 'Valor y forma de pago', 90, NULL),

  ('3.1', 'plazo_ejecucion_dias', 'Plazo de ejecución (días)',
   NULL, 'numero', true, 'Plazo y lugar', 100, NULL),

  ('3.1', 'lugar_ejecucion', 'Lugar de ejecución',
   NULL, 'texto', false, 'Plazo y lugar', 110, NULL),

  -- Criterio 1: "con su referencia normativa"
  ('3.1', 'fundamento_juridico', 'Fundamento jurídico',
   'Marco normativo que sustenta la contratación. Queda registrado en el expediente.',
   'seleccion', true, 'Fundamento jurídico', 120,
   '["Ley 80 de 1993", "Ley 1150 de 2007", "Ley 80 de 1993 y Ley 1150 de 2007", "Decreto 1082 de 2015"]'::jsonb),

  ('3.1', 'detalle_normativo', 'Detalle normativo (artículos)',
   'Artículos o numerales específicos aplicables, si los hay.',
   'texto', false, 'Fundamento jurídico', 130, NULL),

  ('3.1', 'modalidad_propuesta', 'Modalidad propuesta',
   'Modalidad sugerida por el área. Se confirma en la actividad 3.5.',
   'seleccion', true, 'Fundamento jurídico', 140,
   '["Licitación Pública", "Selección Abreviada de Menor Cuantía", "Selección Abreviada por Subasta Inversa", "Enajenación de Bienes por Subasta", "Selección Abreviada por TVEC", "Selección Abreviada por Bolsa Mercantil", "Concurso de Méritos Abierto", "Concurso de Méritos con Precalificación", "Mínima Cuantía", "Régimen Especial Decreto 092/2017", "Contratación Directa"]'::jsonb),

  ('3.1', 'analisis_riesgos', 'Análisis de riesgos',
   'Riesgos previsibles de la contratación y su asignación.',
   'texto_largo', true, 'Riesgos y garantías', 150, NULL),

  ('3.1', 'garantias_exigidas', 'Garantías exigidas',
   NULL, 'seleccion', false, 'Riesgos y garantías', 160,
   '["Cumplimiento", "Calidad del bien o servicio", "Anticipo", "Salarios y prestaciones sociales", "Responsabilidad civil extracontractual"]'::jsonb)

ON CONFLICT (numeral, codigo) DO NOTHING;
