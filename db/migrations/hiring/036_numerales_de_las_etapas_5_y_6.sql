-- ============================================================================
-- 036 · Numerales de las etapas 5 y 6: se restituyen los del equipo
--
-- La 030 trajo la matriz oficial completa y la numeró de corrido, y ahí se
-- descubre que no coincide con la numeración con la que se construyeron las
-- etapas 5 y 6:
--
--   numeral   construido (016-025, 035)        matriz oficial (030)
--   5.1       Elaboración de documentos        Elaboración de documentos      =
--   5.2       Publicación del proyecto pliego  Elaboración de cronograma
--   5.3       Observaciones al pliego          Publicación en SECOP II
--   5.4       Limitación a MIPYME              Publicación en página web ESAP
--   5.5       Audiencia de riesgos             Limitación a MiPymes
--   5.6       Adendas del proceso              Recepción de observaciones
--   5.7       Apertura del proceso             Apertura del proceso           =
--   6.1       Recepción de ofertas y cierre    Cierre                         =
--   6.2       Designación del comité           Evaluación de ofertas
--   6.3       Evaluación de las ofertas        Informe de evaluación prelim.
--
-- La matriz reparte en trece numerales lo que el equipo resolvió en siete, y
-- en la etapa 6 no le da numeral propio a la designación del comité —la deja
-- como salida del cierre—, así que de ahí en adelante todo queda corrido.
--
-- Como la 030 escribe con ON CONFLICT DO UPDATE sobre actividades que ya
-- existían, sobrescribió nombres, descripciones y orden, y reemplazó las
-- exclusiones por modalidad. El resultado no era solo cosmético:
--
--   · El riel anunciaba "Evaluación de ofertas" en el numeral que abre el
--     panel del comité: el nombre decía una cosa y la pantalla hacía otra.
--   · La audiencia de riesgos (5.5) heredó las exclusiones de la limitación a
--     MiPymes, que deja fuera a Licitación Pública. Justo la modalidad donde
--     la audiencia de riesgos es obligatoria.
--
-- Los numerales son la llave con la que el código encuentra la actividad
-- (NUMERAL_PUBLICACION, NUMERAL_AUDIENCIA, NUMERAL_COMITE, NUMERAL_EVALUACION
-- y las demás), así que aquí se devuelven a lo construido.
--
-- PENDIENTE, y no es menor: con esto las actividades de la matriz que ocupaban
-- esos numerales se quedan sin uno propio —el cronograma, la publicación en
-- página web, el informe de evaluación preliminar—. Realinear de verdad
-- —correr la numeración, mover el comité a salida del cierre— cambia historias
-- ya cerradas (EFDS-1149 a EFDS-1157), sus constantes y el frontend, así que
-- no se hace aquí: necesita decisión de la Dirección de Contratación y
-- subtarea propia, que a la fecha de esta migración no existe. Mientras tanto
-- las etapas 5 y 6 llevan la numeración del equipo hasta la 5.7 y la 6.3, y la
-- de la matriz de la 5.8 y la 6.4 en adelante.
--
-- El orden pasa a 1..7 y 1..3: la matriz numeró de uno en uno y con los
-- 10/20/30 originales estas actividades se iban al final del riel, detrás de
-- las que la matriz agrega.
-- ============================================================================

-- --------------------------------------------------- nombres y orden ------

INSERT INTO hiring.actividades (numeral, etapa, nombre, descripcion, orden) VALUES
  ('5.1', 5, 'Elaboración de documentos del proceso',
   'A cargo de la Dirección de Contratación: aviso de convocatoria, proyecto de pliegos y anexos, borrador de minuta e invitación pública. En contratación directa, justificación y minuta.',
   1),
  ('5.2', 5, 'Publicación del proyecto de pliego',
   'Se publica el proyecto de pliego en SECOP II y corre el plazo legal de publicidad de la modalidad. El soporte cargado es la evidencia de la publicación.',
   2),
  ('5.3', 5, 'Observaciones al proyecto de pliego',
   'Recepción y respuesta de las observaciones que presentan los interesados durante la publicidad del proyecto de pliego.',
   3),
  ('5.4', 5, 'Limitación a MIPYME',
   'Registro de las manifestaciones de interés de MIPYME y decisión de limitar o no la convocatoria.',
   4),
  ('5.5', 5, 'Audiencia de asignación de riesgos',
   'Audiencia en la que se asignan y tipifican los riesgos del proceso. Su resultado se consolida en la matriz de riesgos, que queda en el expediente junto con el acta.',
   5),
  ('5.6', 5, 'Adendas del proceso',
   'Modificaciones al pliego publicado: adendas a requisitos de fondo y adendas de cronograma. Cada una se emite con su documento firmado y se publica con su evidencia.',
   6),
  ('5.7', 5, 'Apertura del proceso',
   'Documento de respuesta a observaciones, proyecto de pliego, resolución de apertura, pliego definitivo y anexos. Requiere CDP expedido.',
   7),
  ('6.1', 6, 'Recepción de ofertas y cierre del proceso',
   'Registro de las ofertas recibidas dentro del plazo y cierre de la recepción al vencimiento, que publica la lista de oferentes.',
   1),
  ('6.2', 6, 'Designación del comité evaluador',
   'El Ordenador del Gasto designa mediante memorando a quienes evaluarán las ofertas, en las dimensiones jurídica, financiera y técnica.',
   2),
  ('6.3', 6, 'Evaluación de las ofertas',
   'El comité evalúa cada oferta en las dimensiones jurídica, financiera, técnica y económica, con criterios habilitantes y ponderables.',
   3)
ON CONFLICT (numeral) DO UPDATE
  SET etapa = EXCLUDED.etapa,
      nombre = EXCLUDED.nombre,
      descripcion = EXCLUDED.descripcion,
      orden = EXCLUDED.orden;

-- ------------------------------------------------------- las exclusiones ---
-- Se retiran las celdas que la 030 puso sobre estos numerales cuando el
-- numeral significa otra cosa aquí. No se tocan las que sí corresponden a la
-- misma actividad en las dos numeraciones:
--
--   · 5.1 y 5.7 son la misma actividad en ambas, así que la matriz manda:
--     TVEC no elabora los documentos, y la mínima cuantía no expide acto de
--     apertura —se adjudica por comunicación de aceptación de la oferta—.
--     Esa exclusión de la 5.7 es nueva y se conserva.
--   · 6.1 es el cierre en las dos.

DELETE FROM hiring.actividades_excluidas
 WHERE (numeral, modalidad) IN (
   -- La 5.4 del equipo es la limitación a MIPYME, no la publicación en la
   -- página web de la ESAP, que es de donde sale esta celda.
   ('5.4', 'ABREVIADA_TVEC'),
   -- Y la 5.5 es la audiencia de riesgos, no la limitación a MiPymes: dejarle
   -- estas dos la apagaba justo en Licitación Pública, donde es obligatoria.
   ('5.5', 'ABREVIADA_BOLSA_MERCANTIL'),
   ('5.5', 'LICITACION_PUBLICA')
 );

-- Se escriben con DO UPDATE y no con DO NOTHING porque la 030 dejó estas
-- celdas sin motivo, y el panel enseña ese texto para explicarle al gestor por
-- qué la actividad no le aparece. Una exclusión sin motivo es un hueco en la
-- pantalla.
INSERT INTO hiring.actividades_excluidas (numeral, modalidad, motivo)
VALUES
  ('5.1', 'ABREVIADA_TVEC',
   'La compra por Tienda Virtual del Estado Colombiano no elabora los documentos ordinarios del proceso: se adquiere por el catálogo del acuerdo marco'),
  ('5.7', 'MINIMA_CUANTIA',
   'La mínima cuantía no expide acto de apertura: se adjudica mediante comunicación de aceptación de la oferta'),
  ('5.1', 'REGIMEN_ESPECIAL_092',
   'El régimen especial del Decreto 092 de 2017 no elabora los documentos ordinarios del proceso'),
  ('5.2', 'CONTRATACION_DIRECTA',
   'La contratación directa no tiene pliego de condiciones que publicar: se elabora acto de justificación y minuta'),
  ('5.2', 'REGIMEN_ESPECIAL_092',
   'El régimen especial del Decreto 092 de 2017 no elabora los documentos ordinarios del proceso, así que no hay proyecto de pliego que publicar'),
  ('5.3', 'CONTRATACION_DIRECTA',
   'Sin convocatoria ni proyecto de pliego publicado: no hay observaciones que recibir ni participación que limitar'),
  ('5.3', 'REGIMEN_ESPECIAL_092',
   'El régimen especial del Decreto 092 de 2017 no elabora ni publica los documentos ordinarios del proceso'),
  ('5.4', 'CONTRATACION_DIRECTA',
   'Sin convocatoria ni proyecto de pliego publicado: no hay observaciones que recibir ni participación que limitar'),
  ('5.4', 'REGIMEN_ESPECIAL_092',
   'El régimen especial del Decreto 092 de 2017 no elabora ni publica los documentos ordinarios del proceso'),
  ('5.5', 'CONTRATACION_DIRECTA',
   'La contratación directa no adelanta audiencia de asignación de riesgos: no hay convocatoria ni oferentes'),
  ('5.5', 'REGIMEN_ESPECIAL_092',
   'El régimen especial del Decreto 092 de 2017 no adelanta la audiencia ordinaria de riesgos'),
  ('5.6', 'CONTRATACION_DIRECTA',
   'La contratación directa no publica pliego, así que no hay documento público que modificar por adenda'),
  ('5.6', 'REGIMEN_ESPECIAL_092',
   'El régimen especial del Decreto 092 de 2017 no adelanta la publicación ordinaria ni sus adendas'),
  ('5.7', 'CONTRATACION_DIRECTA',
   'La contratación directa no abre convocatoria: se contrata sin proceso de selección'),
  ('5.7', 'REGIMEN_ESPECIAL_092',
   'El régimen especial del Decreto 092 de 2017 no adelanta la apertura ordinaria del proceso'),
  ('6.1', 'CONTRATACION_DIRECTA',
   'La contratación directa se adjudica sin convocatoria, así que no hay ofertas que recibir ni lista que publicar'),
  ('6.1', 'REGIMEN_ESPECIAL_092',
   'El régimen especial del Decreto 092 de 2017 no adelanta la recepción ordinaria de ofertas'),
  ('6.2', 'CONTRATACION_DIRECTA',
   'La contratación directa no evalúa ofertas en competencia, así que no hay comité que designar'),
  ('6.2', 'REGIMEN_ESPECIAL_092',
   'El régimen especial del Decreto 092 de 2017 no adelanta la evaluación ordinaria por comité'),
  ('6.3', 'CONTRATACION_DIRECTA',
   'La contratación directa no evalúa ofertas en competencia'),
  ('6.3', 'REGIMEN_ESPECIAL_092',
   'El régimen especial del Decreto 092 de 2017 no adelanta la evaluación ordinaria de ofertas')
ON CONFLICT (numeral, modalidad) DO UPDATE
  SET motivo = EXCLUDED.motivo;

-- -------------------------------------------------------- las salvedades ---
-- Mismo motivo: la 5.3 de la matriz es la publicación en SECOP II y trae sus
-- matices —"TVEC" y una condición sin documentar—, pero la 5.3 del equipo es
-- la recepción de observaciones. Las de la 5.1 y la 5.7 sí corresponden a la
-- misma actividad y se quedan.

DELETE FROM hiring.actividades_salvedad
 WHERE numeral = '5.3' AND modalidad IN ('ABREVIADA_TVEC', 'ABREVIADA_BOLSA_MERCANTIL');
