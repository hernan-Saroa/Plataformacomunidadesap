-- ============================================================================
-- 034 · Las modalidades de las plantillas hablan en códigos
--
-- La siembra de la 006 escribió los alcances de los formatos del SIG con el
-- nombre de la modalidad («Licitación Pública»), pero todo lo demás — el
-- catálogo de documentos exigidos de la 019, los filtros del microfrontend y
-- los guards — habla en códigos (LICITACION_PUBLICA). La propia 019 advierte
-- de esa doble convención como fuente de comparaciones que nunca casan, y el
-- bug ya estaba activo: al configurar una actividad en una modalidad, ningún
-- formato sembrado aparecía porque «Licitación Pública» ≠ LICITACION_PUBLICA.
--
-- Se convierte cada elemento con hiring.modalidades como tabla de mapeo. Lo
-- que no case con ningún nombre se conserva tal cual: puede ser ya un código
-- (segunda pasada) o una errata que conviene ver, no perder en silencio.
-- ============================================================================

UPDATE hiring.plantillas p
SET modalidades = sub.codigos
FROM (
  SELECT p2.id,
         jsonb_agg(COALESCE(m.codigo, e.elem) ORDER BY e.ord) AS codigos
    FROM hiring.plantillas p2
   CROSS JOIN LATERAL jsonb_array_elements_text(p2.modalidades)
         WITH ORDINALITY AS e(elem, ord)
    LEFT JOIN hiring.modalidades m ON m.nombre = e.elem
   GROUP BY p2.id
) sub
WHERE sub.id = p.id
  AND sub.codigos IS DISTINCT FROM p.modalidades;

-- La siembra de la 006 escribió «Decreto 092/2017» donde la modalidad se
-- llama «Decreto 092 de 2017»: el mapeo por nombre no puede casarla. Es una
-- errata conocida y puntual, así que se corrige por su literal exacto.
UPDATE hiring.plantillas
SET modalidades = replace(
      modalidades::text,
      '"Régimen Especial Decreto 092/2017"',
      '"REGIMEN_ESPECIAL_092"'
    )::jsonb
WHERE modalidades::text LIKE '%"Régimen Especial Decreto 092/2017"%';
