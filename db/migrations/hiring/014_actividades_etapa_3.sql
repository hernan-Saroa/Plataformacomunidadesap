-- ============================================================================
-- 014 · Actividades de la etapa 3 al catálogo
--
-- 010 llevó las actividades de la etapa 4 a base de datos, pero las de la 3
-- seguían escritas a mano en el microfrontend (ACTIVIDADES_ETAPA_3 en
-- DetalleProceso.tsx). Con dos fuentes conviviendo, el riel tendría que saber
-- de cuál leer según la etapa, y corregir el nombre de una actividad de la 3
-- exigiría desplegar el front.
--
-- Se siembran aquí con el mismo texto que ya mostraba la interfaz, para que el
-- cambio no altere lo que el usuario ve.
-- ============================================================================

INSERT INTO hiring.actividades (numeral, etapa, nombre, descripcion, orden) VALUES
  ('3.1', 3, 'Elaboración de estudios previos',
   'Descripción de la necesidad, fundamento jurídico y modalidad propuesta', 10),
  ('3.2', 3, 'Análisis del sector y estudio de mercado',
   'Consulta de proveedores y precios para estimar el valor', 20),
  ('3.3', 3, 'Radicación en la Dirección de Contratación',
   'Genera consecutivo en el aplicativo de gestión documental', 30),
  ('3.4', 3, 'Revisión y reparto',
   'Revisiones, mesas de trabajo y observaciones al estudio previo', 40),
  ('3.5', 3, 'Definir modalidad de contratación',
   'Según cuantía y umbral vigente (Decreto 1082 de 2015)', 50),
  ('3.6', 3, 'Comité de contratación',
   'Revisa, observa o aprueba los documentos del proceso', 60)
ON CONFLICT (numeral) DO NOTHING;

-- La matriz marca NO el comité de contratación en varias modalidades, pero el
-- orden de sus columnas no se lee sin ambigüedad del texto extraído. Se deja
-- sin registrar en vez de adivinarlo: hoy la interfaz tampoco las distinguía.
