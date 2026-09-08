-- ============================================================================
-- 008 · Causal o artículo específico que sustenta la contratación
--
-- El criterio 1 del HU exige que el documento quede registrado "con su
-- referencia normativa". El campo fundamento_juridico cubre la norma marco
-- (Ley 80, Ley 1150, Decreto 1082), pero no alcanza para identificar la
-- disposición concreta.
--
-- En Contratación Directa cada causal es un literal distinto del artículo
-- 2.2.1.2.1.4 del Decreto 1082 —prestación de servicios profesionales,
-- urgencia manifiesta, contrato interadministrativo, ausencia de pluralidad
-- de oferentes—, y el Régimen Especial 092/2017 se apoya en sus propios
-- artículos. Un desplegable de cuatro opciones no distingue entre ellas, y sin
-- esa precisión el expediente no permite verificar por qué se eligió esa vía.
--
-- Se pide como texto y no como catálogo: las causales se citan con su redacción
-- normativa y admiten combinaciones que un listado cerrado obligaría a
-- mantener con cada reforma.
-- ============================================================================

INSERT INTO hiring.campos_formulario
  (numeral, codigo, etiqueta, ayuda, tipo, obligatorio, grupo, orden, opciones)
VALUES
  ('3.1', 'causal_normativa', 'Causal o artículo que la sustenta',
   'Disposición concreta que habilita la modalidad elegida. Obligatorio en '
   || 'Contratación Directa y Régimen Especial 092/2017. '
   || 'Ej.: "Artículo 2.2.1.2.1.4.9 del Decreto 1082 de 2015 — prestación de '
   || 'servicios profesionales y de apoyo a la gestión".',
   'texto_largo', false, 'Contratación', 75, NULL)
ON CONFLICT (numeral, codigo) DO NOTHING;

-- La obligatoriedad depende de la modalidad del proceso, y campos_formulario
-- no modela reglas condicionales: obligatorio es un booleano fijo. Marcarlo
-- true bloquearía el envío en las nueve modalidades donde la norma marco basta.
--
-- Queda en false y la validación condicional entra con el motor de reglas
-- (tipo CAMPO_OBLIGATORIO con condición por modalidad), documentado en
-- PLAN_MODULO_CONTRATACION.md. Mientras tanto la ayuda del campo indica
-- cuándo debe diligenciarse.

-- La ayuda del fundamento jurídico aclara su relación con el campo nuevo.
UPDATE hiring.campos_formulario
   SET ayuda = 'Norma marco que sustenta la contratación. La causal concreta '
            || 'se detalla en el campo siguiente.'
 WHERE numeral = '3.1' AND codigo = 'fundamento_juridico';
