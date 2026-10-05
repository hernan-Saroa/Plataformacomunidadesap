/**
 * Qué actividad trabaja cada panel, por numeral.
 *
 * Vivía en `DetalleProceso`, que era el único que montaba los paneles. Desde
 * que la revisión tiene su propia pantalla, dos sitios necesitan saber qué
 * panel corresponde a cada numeral, y la regla tiene que ser una sola.
 */

/** Actividad 3.3: la radicación en la Dirección, que reparte el proceso. */
export const NUMERAL_RADICACION = '3.3';

/**
 * La 3.4 no tiene tarjeta propia (EFDS-1183).
 *
 * La revisión ocurre —y queda en el expediente con su decisión, su motivo y
 * quién la tomó— pero se resuelve leyendo el estudio previo, así que vive en el
 * panel de la 3.1. Una tarjeta aparte pedía entrar a un sitio donde no había
 * nada que hacer, y se quedaba en «pendiente» aunque la revisión ya se hubiera
 * resuelto: el riel contaba una cosa y el expediente otra.
 *
 * No se borra de la matriz: la actividad existe y el área la reconoce. Lo que
 * se retira es la fila del carril.
 */
export const NUMERAL_REVISION = '3.4';

/** Causal de contratación: la 3.5.1 de la matriz, aplanada a 3.6 en la base. */
export const NUMERAL_CAUSAL = '3.6';
/**
 * Comité de contratación, la 3.6 de la matriz.
 *
 * Nombre largo a propósito: `NUMERAL_COMITE` ya es la 6.2, que es el comité
 * **evaluador**. Son dos cuerpos distintos en dos etapas distintas, y confundir
 * uno con otro es fácil justo aquí, donde solo se ven los numerales.
 */
export const NUMERAL_COMITE_CONTRATACION = '3.7';

/** Actividades del ciclo del CDP; se trabajan desde el panel de la etapa 4. */
export const NUMERALES_CDP = ['4.1', '4.2'];

/**
 * Las etapas en las que interviene la Dirección Financiera.
 *
 * Son las cuatro donde se mueve el presupuesto de la entidad y donde la siembra
 * de la 083 le da alcance: el CDP (4), el registro
 * presupuestal (8.3), el trámite del pago avalado (9.4) y el cierre financiero
 * (10.3). La 8 entra aunque casi todo lo suyo sea del gestor —la 8.3 es de la
 * Financiera y esconderla le quitaría el RP—.
 *
 * Se listan por etapa y no por numeral porque el recorte es del recorrido, no
 * del riel: dentro de la etapa se ven todas sus actividades, que es como se
 * entiende en qué punto va el proceso.
 */
export const ETAPAS_DE_LA_FINANCIERA = [4, 8, 9, 10];

/**
 * Actividades cuyo panel monta la lista de documentos dentro de sí (EFDS-2066).
 *
 * La lista es la misma pieza en todas; estas la ponen en su sitio —la 3.1 en
 * su pestaña de documentos, junto al radicado; la 5.1 como el cuerpo de la
 * actividad—, y montarla además aquí la pediría dos veces.
 */
export const NUMERALES_CON_LISTA_PROPIA = ['3.1', '5.1'];

/**
 * Actividades cuyo panel ya tiene su propio ciclo de aprobación.
 *
 * Solo el estudio previo: es la única que además de aprobarse a sí misma
 * escribe en `proceso_actividades.estado`, el mismo sitio donde el trámite
 * genérico guarda el suyo. Montar los dos dejaría al gestor con dos bloques
 * pidiéndole lo mismo sobre un único estado, y a la primera decisión el otro
 * se quedaría diciendo algo falso.
 *
 * Las garantías y las modificaciones no entran aquí aunque también aprueban:
 * lo suyo es cada póliza y cada modificación por separado, no la actividad, y
 * conviven sin pisarse.
 */
export const NUMERALES_CON_APROBACION_PROPIA = ['3.1'];

/**
 * Actividades cuya decisión son botones del propio panel, no el bloque
 * genérico de aprobación.
 *
 * En la 8.4 se aprueba
 * cada póliza, en la 9.4 se avala cada cuenta de cobro y en la 9.5 se decide
 * cada modificación. Solo se decide en la pantalla de revisión: ahí el panel
 * sigue en solo lectura y `LugarDeDecision` enciende sus botones de decidir,
 * y en el trabajo del proceso esos botones se cambian por el camino a la
 * revisión.
 */
export const NUMERALES_CON_DECISION_EN_EL_PANEL = ['8.4', '9.4', '9.5'];

/** Elaboración de los documentos del proceso (EFDS-1149). */
export const NUMERAL_DOCUMENTOS = '5.1';
/** Publicación del proyecto de pliego, primera actividad publicada de la etapa 5. */
export const NUMERAL_PUBLICACION = '5.2';
/** Observaciones al pliego (EFDS-1151), sobre la publicación ya registrada. */
export const NUMERAL_OBSERVACIONES = '5.3';
/** Limitación de la convocatoria a MIPYME (EFDS-1151). */
export const NUMERAL_MIPYME = '5.4';
/** Audiencia de asignación de riesgos (EFDS-1153). */
export const NUMERAL_RIESGOS = '5.5';
/** Adendas al pliego publicado (EFDS-1154). */
export const NUMERAL_ADENDAS = '5.6';
/** Apertura formal del proceso, que cierra la etapa (EFDS-1152). */
export const NUMERAL_APERTURA = '5.7';
/** Recepción de ofertas y cierre, primera actividad de la etapa 6 (EFDS-1155). */
export const NUMERAL_OFERTAS = '6.1';
/** Designación del comité que evaluará las ofertas (EFDS-1156). */
export const NUMERAL_COMITE = '6.2';

/** Evaluación de las ofertas (EFDS-1157). */
export const NUMERAL_EVALUACION = '6.3';

/**
 * Traslado del informe y subsanaciones (EFDS-1158).
 *
 * Tres numerales y un solo panel: para el usuario es un solo trámite —se
 * publica el informe, corre un término, entran escritos y se responden—, y
 * partirlo obligaría a saltar entre pantallas para saber si el plazo sigue
 * abierto.
 */
export const NUMERALES_TRASLADO = ['6.4', '6.5', '6.6'];

/**
 * Adjudicación (EFDS-1159), etapa 7 completa.
 *
 * Cuatro numerales y un solo panel, por lo mismo que el traslado: para el
 * usuario es un solo desenlace —audiencia, sobre económico, informe definitivo
 * y acto— y saber en qué paso va exige verlos juntos.
 */
export const NUMERALES_ADJUDICACION = ['7.1', '7.2', '7.3', '7.4'];

/** Las de la etapa 5 que ya tienen panel; el riel las trata igual. */
export const NUMERALES_ETAPA_5 = [
  NUMERAL_DOCUMENTOS,
  NUMERAL_PUBLICACION,
  NUMERAL_OBSERVACIONES,
  NUMERAL_MIPYME,
  NUMERAL_RIESGOS,
  NUMERAL_ADENDAS,
  NUMERAL_APERTURA,
];

/**
 * Las de la etapa 6 que ya tienen panel.
 *
 * Lista aparte y no añadida a la de la etapa 5: son etapas distintas, y meterlas
 * en la misma constante haría que el nombre dejara de decir la verdad.
 */
export const NUMERALES_ETAPA_6 = [
  NUMERAL_OFERTAS,
  NUMERAL_COMITE,
  NUMERAL_EVALUACION,
  ...NUMERALES_TRASLADO,
];

/** Elaboración del contrato y aceptación del proponente (EFDS-1161). */
export const NUMERAL_CONTRATO = '8.1';

/** Designación del supervisor del contrato (EFDS-1165). */
export const NUMERAL_SUPERVISOR = '8.2';
/** Expedición del registro presupuestal del contrato (EFDS-1163). */
export const NUMERAL_RP = '8.3';
/** Constitución de garantías con sus amparos (EFDS-1164). */
export const NUMERAL_GARANTIAS = '8.4';
/** Registro de la ARL para contratistas persona natural (EFDS-1164). */
export const NUMERAL_ARL = '8.5';

/**
 * Acta de inicio suscrita, actividad 8.7 (migración 089).
 *
 * Compartía panel con la reunión de inicio (9.1) y la casilla «Acta de
 * inicio» abría una pantalla titulada «Reunión de inicio». Se separaron a
 * pedido de la Dirección: aquí se registra el acta firmada, que cierra la
 * legalización, y la reunión la toma de aquí.
 */
export const NUMERAL_ACTA_INICIO_LEGALIZACION = '8.7';

/** Publicación del contrato dentro del plazo legal (EFDS-1166). */
export const NUMERAL_PUBLICACION_CONTRATO = '8.8';

/** Las de la etapa 8 que ya tienen panel. Misma razón que la lista anterior. */
export const NUMERALES_ETAPA_8 = [
  NUMERAL_CONTRATO,
  NUMERAL_SUPERVISOR,
  NUMERAL_RP,
  NUMERAL_GARANTIAS,
  NUMERAL_ARL,
  NUMERAL_ACTA_INICIO_LEGALIZACION,
  NUMERAL_PUBLICACION_CONTRATO,
];

/** Reunión de inicio que da comienzo a la ejecución (EFDS-1167). */
export const NUMERAL_ACTA_INICIO = '9.1';

/** Seguimiento de la ejecución del contrato (EFDS-1168). */
export const NUMERAL_SEGUIMIENTO = '9.2';

/** Tramite de pagos del contrato (EFDS-1170). */
export const NUMERAL_PAGOS = '9.4';
/**
 * Modificaciones contractuales (EFDS-1176).
 *
 * La matriz si le da numeral a este bloque, a diferencia de la declaratoria
 * desierta y del cierre definitivo. Crecera con EFDS-1177 y EFDS-1178, que
 * traen la prorroga, la cesion, el aclaratorio y la suspension al mismo panel.
 */
export const NUMERAL_MODIFICACIONES = '9.5';

/**
 * Reasignación de supervisión (EFDS-1169), actividad 9.3.
 *
 * No tiene panel propio: comparte el de la 8.2, que es donde se reasigna desde
 * que la historia se cerró. Reasignar *es* designar otra vez —el mismo
 * ordenador del gasto, el mismo acto administrativo—, y lo que la matriz
 * separa en dos numerales es cuándo ocurre: la 8.2 antes de arrancar y la 9.3
 * «en cualquier momento durante la ejecución». Mismo criterio que los cuatro
 * numerales del CDP contra un solo `PanelCdp`.
 *
 * Sin esto la actividad salía con candado y «Pendiente de desarrollo», que era
 * falso: lo construido no se podía alcanzar desde la etapa donde ocurre.
 */
export const NUMERAL_REASIGNACION = '9.3';

export const NUMERALES_ETAPA_9 = [
  NUMERAL_ACTA_INICIO,
  NUMERAL_SEGUIMIENTO,
  NUMERAL_REASIGNACION,
  NUMERAL_PAGOS,
  NUMERAL_MODIFICACIONES,
];

/** Los dos numerales que trabajan la supervisión: designarla y reasignarla. */
export const NUMERALES_SUPERVISION = [NUMERAL_SUPERVISOR, NUMERAL_REASIGNACION];

/**
 * Informe final de ejecucion (EFDS-1171), primera actividad de la etapa 10.
 *
 * Lista propia por lo mismo que las anteriores: es otra etapa. Crecera con
 * EFDS-1172 a EFDS-1175.
 */
export const NUMERAL_INFORME_FINAL = '10.1';
/** Acta de liquidacion del contrato (EFDS-1172). */
export const NUMERAL_LIQUIDACION = '10.2';
/** Pago final y liberacion del saldo del RP (EFDS-1173). */
export const NUMERAL_CIERRE_FINANCIERO = '10.3';
/**
 * Publicacion del acta y archivo del expediente (EFDS-1174).
 *
 * La matriz solo le da numeral al archivo; la publicacion no tiene uno propio y
 * RF-LIQ-04 las enuncia juntas, asi que las dos viven en la 10.4.
 */
export const NUMERAL_ARCHIVO_EXPEDIENTE = '10.4';
export const NUMERALES_ETAPA_10 = [
  NUMERAL_INFORME_FINAL,
  NUMERAL_LIQUIDACION,
  NUMERAL_CIERRE_FINANCIERO,
  NUMERAL_ARCHIVO_EXPEDIENTE,
];

/**
 * Las catorce actividades de la matriz que ninguna historia recogió
 * (migraciones 051 y 059).
 *
 * No tienen trámite propio en la plataforma —el sorteo se hace en la Dirección
 * de Contratación, la subasta en SECOP II, la radicación en Active Document—,
 * así que se cumplen dejando constancia. Comparten un solo panel: lo que las
 * distingue no cambia lo que el expediente necesita de ellas.
 *
 * La 3.6, la 3.7 y la 8.6 llegaron después, con la 059: estaban en la misma
 * situación que las once y se habían quedado fuera de la cuenta, saliendo con
 * candado en el riel.
 */
export const ACTIVIDADES_CON_REGISTRO: Record<string, string> = {
  // La 3.2 salió con la migración 090: el análisis del sector y el estudio de
  // mercado se entregan en la lista de chequeo de la 3.1.
  // La 3.3 y la 3.4 salieron de aquí con EFDS-1183. Ninguna de las dos se
  // cumple registrando una fecha y un documento: la 3.3 es recibir el proceso
  // en la Dirección y ponerle responsable, y la 3.4 es la decisión del abogado,
  // que se toma leyendo el estudio previo y por eso vive en su panel.
  // La 3.6 y la 3.7 salieron: la causal es un filtro por modalidad y el comité
  // son tres desenlaces —aprueba, condiciona u observa—. Ninguna de las dos
  // cabe en una fecha y una nota.
  '5.9': 'Manifestación de interés',
  '5.10': 'Sorteo',
  '5.11': 'Publicación de la manifestación de interés',
  '6.7': 'Informe previo a la audiencia de adjudicación',
  '6.8': 'Informe previo al evento de subasta',
  '6.9': 'Apertura del sobre económico previo a la subasta',
  '6.10': 'Evento de subasta',
  '8.6': 'Comunicación de inicio',
};

export const NUMERALES_CON_REGISTRO = Object.keys(ACTIVIDADES_CON_REGISTRO);

/**
 * Si la plataforma tiene panel para trabajar la actividad.
 *
 * La secuencia lo necesita para no trancar el flujo con una actividad que
 * nadie puede terminar: las que aún no se han construido se saltan, igual que
 * las que la modalidad excluye. Cuando estén las sesenta y tres, esto devuelve
 * siempre true y la excepción sobra.
 */
export const TIENEN_PANEL = (numeral: string): boolean =>
  numeral === '3.1' ||
  numeral === NUMERAL_RADICACION ||
  numeral === NUMERAL_CAUSAL ||
  numeral === NUMERAL_COMITE_CONTRATACION ||
  NUMERALES_CDP.includes(numeral) ||
  NUMERALES_ETAPA_5.includes(numeral) ||
  NUMERALES_ETAPA_6.includes(numeral) ||
  NUMERALES_ADJUDICACION.includes(numeral) ||
  NUMERALES_ETAPA_8.includes(numeral) ||
  NUMERALES_ETAPA_9.includes(numeral) ||
  NUMERALES_ETAPA_10.includes(numeral) ||
  NUMERALES_CON_REGISTRO.includes(numeral);
