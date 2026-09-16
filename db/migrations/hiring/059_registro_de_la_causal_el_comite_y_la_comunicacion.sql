-- ============================================================================
-- 059 · Tres actividades más que se cumplen dejando constancia
--
-- La 051 recogió once actividades que ninguna historia 1146-1176 tomó y les dio
-- el registro con soporte. Contó mal por tres: la **3.6 causal de
-- contratación**, la **3.7 comité de contratación** y la **8.6 comunicación de
-- inicio** están en la misma situación y se quedaron fuera.
--
-- Se veía en el riel: sin numeral en ninguna lista del frontend salían con
-- candado y «Pendiente de desarrollo», que era una promesa equivocada. No están
-- pendientes de construir —no hay nada que construir—: se resuelven fuera de la
-- plataforma, como las once anteriores.
--
--   3.6  La causal la elige el abogado leyendo el Decreto 1082/2015 contra el
--        objeto y la cuantía. La matriz la describe como «filtro según la
--        modalidad», y no pide documento: lo que queda es cuál se aplicó y por
--        qué. Por eso no exige soporte.
--   3.7  El comité sesiona en la Dirección de Contratación y decide si el
--        proceso va, si observa o si aprueba. De ahí sale un acta, así que se
--        pide el soporte —pero la matriz no dice «adjuntar», de modo que la
--        exigencia es del equipo y viaja sin confirmar—.
--   8.6  Es un oficio que sale de la entidad avisando que los requisitos
--        anteriores están cumplidos. El soporte es el oficio mismo; mismo caso
--        que los informes de la 6.7 y la 6.8.
--
-- Ninguna de las tres se da por confirmada: `exige_soporte` sale de la matriz
-- solo cuando la matriz lo dice, y en estas tres no lo dice. Si la Dirección de
-- Contratación las ratifica, es un UPDATE y no un despliegue.
--
-- `ON CONFLICT DO NOTHING` como en la 051: reaplicarla no pisa una decisión que
-- alguien ya haya ajustado en la base.
-- ============================================================================

INSERT INTO hiring.actividades_con_soporte (numeral, etapa, exige_soporte, confirmado, nota_fuente)
VALUES
  ('3.6', 3, false, false, 'Filtro según la modalidad: qué causal del Decreto 1082/2015 habilita contratar así.'),
  ('3.7', 3, true,  false, 'Va o no al comité, y si va: observa o aprueba. Lo que queda de la sesión es el acta.'),
  ('8.6', 8, true,  false, 'Comunicación de que ya se encuentran cumplidos los requisitos anteriores.')
ON CONFLICT (numeral) DO NOTHING;
