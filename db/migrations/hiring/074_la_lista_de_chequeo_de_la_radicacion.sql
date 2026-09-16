-- ============================================================================
-- 074 · La lista de chequeo de la radicación
--
-- El procedimiento de Adquisición de Bienes y Servicios dice de la radicación
-- a la Dirección de Contratación: «se deben remitir como adjuntos, por correo
-- electrónico o mediante carpeta compartida, los documentos previstos en la
-- **lista de chequeo** que resulten aplicables, según la modalidad de
-- contratación».
--
-- El módulo no pedía ninguno. Enviar el estudio previo exige los metadatos
-- obligatorios y que haya **un** adjunto en la 3.1 —`count(*) > 0`, cualquier
-- PDF sirve—, y con eso el proceso entra a la bandeja de la Dirección. La
-- Dirección recibe entonces un estudio previo y nada más, y el resto del
-- paquete viaja por correo, fuera del expediente.
--
-- La maquinaria para exigirlo ya existía entera y sin usar fuera de la 5.1:
-- `documentos_requeridos` dice qué pide cada actividad y a qué modalidades,
-- `documentos_proceso` registra qué requisito satisface cada archivo, y desde
-- la 063 `documentos.plantilla_id` distingue lo exigido de lo que alguien
-- adjuntó además. De las tres filas sembradas hasta hoy, las tres eran de la
-- 5.1. Esta migración siembra las de la etapa 3.
--
-- ------------------------------------------------------- por qué en la 3.1 --
--
-- La matriz pone la radicación en la 3.3, pero esa actividad dejó de ser el
-- acto del área: desde EFDS-1183 se cumple cuando alguien de la Dirección
-- **toma** el proceso de la bandeja compartida. Exigir ahí el paquete sería
-- pedírselo a quien lo recibe.
--
-- Lo que el área hace —armar el paquete y mandarlo— es el envío de la 3.1, y
-- es además lo que hace aparecer el proceso en la bandeja (`idsEnBandeja`
-- exige la 3.1 en EN_REVISION). Ese es el momento equivalente a la radicación,
-- así que ahí se pide.
--
-- ------------------------------------------------ qué no entra en la lista --
--
--   · **El estudio previo.** Ya se exige: es el adjunto propio de la 3.1 y lo
--     valida `enviar()`. Repetirlo aquí lo pediría dos veces.
--   · **El análisis del sector.** Es la 3.2, con su fecha, su nota y su
--     soporte desde la 051.
--   · **El CDP.** Lo nombra la lista de chequeo del procedimiento, pero en el
--     flujo de la ESAP se solicita *después* de radicar: la solicitud nace al
--     cerrarse la etapa 3 y la Financiera lo expide en la 4.3. Exigirlo para
--     radicar dejaría todo proceso trabado esperando un certificado que no se
--     puede pedir hasta haber radicado.
-- ============================================================================

-- ------------------------------------------- la marca de lo que es supuesto --
/*
 * Mismo par que la 051 puso en `actividades_con_soporte`, y por lo mismo: la
 * lista de chequeo real es un formato del SIG por modalidad que el equipo no
 * tiene delante. Lo que se siembra aquí sale del texto del procedimiento, no
 * del formato, y `confirmado` marca cuáles se pueden dar por buenas para que
 * quien valide con la Dirección de Contratación sepa qué revisar.
 *
 * Las tres filas de la 5.1 sí venían de su historia (EFDS-1149): quedan en
 * true.
 */
ALTER TABLE hiring.documentos_requeridos
  ADD COLUMN IF NOT EXISTS confirmado  boolean NOT NULL DEFAULT false;

ALTER TABLE hiring.documentos_requeridos
  ADD COLUMN IF NOT EXISTS nota_fuente text;

COMMENT ON COLUMN hiring.documentos_requeridos.confirmado IS
  'false mientras el requisito sea lectura del procedimiento por parte del equipo y no cita del formato de lista de chequeo.';
COMMENT ON COLUMN hiring.documentos_requeridos.nota_fuente IS
  'De dónde sale el requisito, para poder contrastarlo cuando llegue el formato oficial.';

UPDATE hiring.documentos_requeridos
   SET confirmado  = true,
       nota_fuente = 'EFDS-1149 (RF-DOC-01, RF-DOC-02).'
 WHERE numeral = '5.1'
   AND nota_fuente IS NULL;

-- --------------------------------------------------- los documentos de la 3.1 --
/*
 * Tres, y ninguno inventado: los dos primeros son lo que el procedimiento
 * nombra sin ambigüedad para radicar, y el tercero es uno de los anexos que
 * cita para los estudios previos.
 *
 * Alcance vacío = todas las modalidades, que es la convención del módulo desde
 * la 019: el memorando y la lista de chequeo se piden en las once, lo que
 * cambia entre modalidades es *qué lista* se diligencia, no si hay que
 * remitirla.
 */
INSERT INTO hiring.documentos_requeridos
  (numeral, codigo, nombre, descripcion, modalidades, obligatorio, orden, confirmado, nota_fuente)
VALUES
  ('3.1', 'MEMORANDO_SOLICITUD',
   'Memorando de solicitud firmado por el jefe del área',
   'Con el que el área interesada remite el proceso a la Dirección de Contratación. Va firmado por el director o jefe de la dependencia solicitante.',
   '[]'::jsonb, true, 10, false,
   'Procedimiento Adquisición de Bienes y Servicios, actividad de radicación a la Dirección de Contratación.'),

  ('3.1', 'LISTA_CHEQUEO',
   'Lista de chequeo de la modalidad, diligenciada',
   'El formato de lista de chequeo que corresponda a la modalidad, con los documentos aplicables marcados. Es lo que permite a la Dirección verificar que el paquete llegó completo.',
   '[]'::jsonb, true, 20, false,
   '«Los documentos previstos en la lista de chequeo que resulten aplicables, según la modalidad de contratación». Anexo del procedimiento: FORMATO LISTA DE CHEQUEO CONTRATOS PROCESO DE SELECCIÓN - PROCESO COMPETITIVO DECRETO 092 DE 2017.'),

  /*
   * No obligatorio, y no por descuido. El certificado se exige en la
   * prestación de servicios profesionales y de apoyo a la gestión, que es una
   * **tipología contractual**, no una modalidad: el proceso la guarda en los
   * metadatos de la 3.1 (`tipologia_contractual`), y este catálogo solo sabe
   * filtrar por modalidad. Marcarlo obligatorio en toda la contratación
   * directa trabaría las que no son de prestación de servicios.
   *
   * Aparece igual en la lista, con su descripción: lo que no se puede es
   * bloquear con él. Cuando el catálogo sepa filtrar por tipología, pasa a
   * true y esta nota sobra.
   */
  ('3.1', 'CERTIFICADO_IDONEIDAD',
   'Certificado de idoneidad y experiencia',
   'Obligatorio en la prestación de servicios profesionales y de apoyo a la gestión. Acredita que el contratista reúne las condiciones para el objeto que se contrata.',
   '["CONTRATACION_DIRECTA"]'::jsonb, false, 30, false,
   'Anexo del procedimiento a la actividad de elaboración de estudios y documentos previos: CERTIFICADO DE IDONEIDAD.')
ON CONFLICT (numeral, codigo) DO NOTHING;

-- ------------------------------------------------- nota para quien venga después
--
-- Los formatos en blanco —la lista de chequeo del Decreto 092, el certificado
-- de idoneidad, la guía de estructuración técnica— no se siembran en
-- `hiring.plantillas`: esa tabla guarda el código del SIG, la versión y la
-- fecha de aprobación, y el equipo no los tiene. Inventar un BS-FO-xxx pondría
-- en el expediente una referencia oficial falsa.
--
-- No hace falta migración para añadirlos: la Dirección los sube desde la
-- biblioteca de formatos con su código real, los asigna a la 3.1 y el panel
-- los ofrece en la fila del documento que corresponda. Es el mismo camino que
-- la 062 dejó abierto para el resto del módulo.
