-- ============================================================================
-- 086 · Los textos del catálogo de actividades, en español correcto
--
-- En la sesión de revisión del flujo de licitación pública se señalaron
-- tildes y redacciones que se ven mal en pantalla. Salen de aquí: el nombre y
-- la descripción de cada actividad se cargaron tal cual venían en la matriz de
-- flujo (030), con las notas que el equipo de Contratación dejó para sí mismo
-- —«campo de si/no, adjunta soporte», «RECORDAR FILTRO…», «revisar proceso
-- otic»— y sin tildes. El riel y el encabezado de cada actividad los muestran
-- tal cual.
--
-- Se corrige solo la forma. El sentido de cada fila es el de la matriz, y
-- donde la descripción era una nota interna se reescribe como lo que la
-- actividad pide.
--
-- La 8.7 deja de llamarse «Acta de inicio (cuando aplique)»: si aplica o no lo
-- dice la matriz SÍ/NO por modalidad (`actividades_excluidas`), y repetirlo en
-- el nombre hacía pensar que había que decidirlo en la pantalla.
--
-- Solo UPDATE por numeral: reaplicarla deja lo mismo.
-- ============================================================================

UPDATE hiring.actividades AS a
   SET nombre = v.nombre,
       descripcion = v.descripcion
  FROM (VALUES
    ('1.2', 'Elaborar justificación de necesidad',
            'Elaboración del estudio previo o del anexo técnico, con cantidades y cronograma.'),
    ('2.1', 'Consolidar Plan Anual de Adquisiciones',
            'Diligenciamiento de la plantilla de SECOP II.'),
    ('2.2', 'Aprobación del PAA',
            'Lo aprueba el comité de contratación.'),
    ('2.3', 'Publicar en SECOP II',
            'Publicación antes del 31 de enero.'),
    ('2.4', 'Actualizar cuando sea necesario',
            'Si la necesidad no está incluida en el PAA, se actualiza el plan antes de continuar.'),
    ('3.1', 'Elaboración de Estudios Previos y demás documentos previos',
            'Descripción de la necesidad, fundamento jurídico y modalidad propuesta. Obligatorio según la Ley 80 de 1993.'),
    ('3.3', 'Radicación en la Dirección de Contratación',
            'Genera un consecutivo en el aplicativo de gestión documental de la Escuela (Active Document).'),
    ('3.4', 'Revisión y reparto en la Dirección de Contratación',
            'Revisiones, mesas de trabajo y observaciones al estudio previo.'),
    ('3.6', 'Causal de contratación',
            'Se elige según la modalidad.'),
    ('3.7', 'Comité de contratación',
            'El comité aprueba el proceso, lo observa o no lo aprueba.'),
    ('4.3', 'Expedición del CDP',
            'Sin CDP no se puede continuar. El CDP certifica los recursos disponibles y queda afectado al proceso.'),
    ('4.4', 'Adjuntar al expediente',
            'Se carga el CDP para consultarlo en las etapas siguientes.'),
    ('5.9', 'Manifestación de interés',
            'Nota de trazabilidad y alerta según la fecha máxima del cronograma para manifestar interés.'),
    ('5.10', 'Sorteo',
            'Se indica si hubo sorteo y se adjunta el soporte.'),
    ('5.11', 'Publicación de la manifestación de interés',
            'Se adjunta el soporte de la publicación.'),
    ('5.13', 'Adendas',
            'Documento vinculante. A partir de la apertura pueden expedirse en cualquier momento.'),
    ('6.4', 'Publicación y traslado del informe de evaluación preliminar',
            'Si no hay ofertas habilitadas, el proceso se declara desierto.'),
    ('6.5', 'Recepción de subsanaciones y observaciones al informe de evaluación preliminar',
            'Se cargan las subsanaciones y observaciones recibidas.'),
    ('6.6', 'Respuestas a las observaciones',
            'Documento de respuesta financiero, técnico y jurídico.'),
    ('6.7', 'Informe previo a la audiencia de adjudicación',
            'Informe de evaluación publicado en SECOP II.'),
    ('6.8', 'Informe previo al evento de subasta',
            'Lo elaboran en la Dirección de Contratación los profesionales a cargo del proceso.'),
    ('6.9', 'Apertura del sobre económico previo a la subasta',
            'Se abren las ofertas económicas de los oferentes habilitados en SECOP II.'),
    ('6.10', 'Evento de subasta',
            'Se adelanta en la plataforma de subasta de SECOP II.'),
    ('7.3', 'Informe de evaluación definitivo',
            'Informe de evaluación que se genera después de la audiencia de adjudicación.'),
    ('7.4', 'Acto de adjudicación',
            'El ordenador del gasto expide la resolución o acto administrativo, que se notifica y publica en SECOP II.'),
    ('8.2', 'Designación de supervisor',
            'Designación formal del supervisor por parte del ordenador del gasto, con aviso al supervisor.'),
    ('8.4', 'Constitución de garantías',
            'Se desglosan los amparos para controlar sus fechas de vencimiento. Se aprueban o rechazan en SECOP II o con el documento de aprobación.'),
    ('8.5', 'ARL',
            'Afiliación que hace la entidad o el propio contratista. Obligatoria para personas naturales.'),
    ('8.6', 'Comunicación de inicio',
            'Comunicación de que ya se cumplieron los requisitos anteriores.'),
    ('8.7', 'Acta de inicio',
            'Acta de inicio suscrita por la entidad y el contratista.'),
    ('8.8', 'Publicación en la página web de la ESAP',
            'Se publica el contrato en la página web de la ESAP y se adjunta el soporte al expediente.'),
    ('9.2', 'Ejecución y supervisión del contrato',
            'El supervisor hace seguimiento a la ejecución del contrato.'),
    ('9.5', 'Modificaciones contractuales',
            'Según los tipos de modificación acordados en la mesa de trabajo del 9 de junio de 2026. Surten el mismo trámite del proceso, en una versión más corta.'),
    ('10.2', 'Liquidación',
            'Acta de liquidación, si el contrato la requiere según su tipología.'),
    ('10.4', 'Archivar expediente contractual',
            'Archivo del expediente completo.')
  ) AS v(numeral, nombre, descripcion)
 WHERE a.numeral = v.numeral;
