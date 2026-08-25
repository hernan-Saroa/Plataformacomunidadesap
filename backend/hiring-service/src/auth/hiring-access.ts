/**
 * Roles del módulo de Contratación (catálogo A4 — Formato usuario-roles-permisos).
 * Este HU (EFDS-1146, estudio previo) solo necesita GESTOR_CONTRATACION;
 * el resto se declara para que las HUs siguientes no reinventen los códigos.
 */
export const ROL_GESTOR_CONTRATACION = 'GESTOR_CONTRATACION';
export const ROL_REVISOR_CONTRATACION = 'REVISOR_CONTRATACION';
export const ROL_DIRECTOR_CONTRATACION = 'DIRECTOR_CONTRATACION';
/** Dirección Financiera: verifica la disponibilidad y expide el CDP. */
export const ROL_ESTRUCTURADOR_FINANCIERO = 'ESTRUCTURADOR_FINANCIERO';
export const ROL_SUPER_ADMIN = 'SUPER_ADMIN';

/** Roles que pueden escribir sobre un proceso en etapa de estudios previos. */
export const ROLES_ESCRITURA_ESTUDIO_PREVIO = [
  ROL_GESTOR_CONTRATACION,
  ROL_SUPER_ADMIN,
];

/** Roles que pueden consultar el expediente sin poder editarlo. */
export const ROLES_LECTURA_CONTRATACION = [
  ...ROLES_ESCRITURA_ESTUDIO_PREVIO,
  ROL_REVISOR_CONTRATACION,
  ROL_DIRECTOR_CONTRATACION,
];

/** Roles que pueden aprobar o devolver un estudio previo (numeral 3.4). */
export const ROLES_REVISION_ESTUDIO_PREVIO = [
  ROL_REVISOR_CONTRATACION,
  ROL_DIRECTOR_CONTRATACION,
  ROL_SUPER_ADMIN,
];

/**
 * Roles que pueden mover los umbrales de cuantía (EFDS-1147).
 *
 * Más estrecho que la revisión: cambiar un umbral no afecta a un proceso sino a
 * todos los que se creen después, así que queda en la Dirección de
 * Contratación. El revisor aprueba procesos, no reescribe la regla.
 */
export const ROLES_ADMIN_UMBRALES = [ROL_DIRECTOR_CONTRATACION, ROL_SUPER_ADMIN];

/**
 * Quién decide sobre el CDP (etapa 4).
 *
 * La solicitud la radica el área solicitante, pero verificar la disponibilidad
 * y expedir el certificado es competencia de la Dirección Financiera: es ella
 * la que compromete el presupuesto de la entidad.
 */
export const ROLES_GESTION_CDP = [ROL_ESTRUCTURADOR_FINANCIERO, ROL_SUPER_ADMIN];

/** Quién puede radicar la solicitud de CDP (actividad 4.1). */
export const ROLES_SOLICITUD_CDP = [
  ROL_GESTOR_CONTRATACION,
  ROL_DIRECTOR_CONTRATACION,
  ROL_SUPER_ADMIN,
];

/**
 * Quién registra la publicación del proyecto de pliego (actividad 5.2).
 *
 * La publicación en SECOP II la hace el gestor del proceso, no la Dirección
 * Financiera: no hay presupuesto de por medio, es un trámite de publicidad.
 */
export const ROLES_PUBLICACION_PLIEGO = [
  ROL_GESTOR_CONTRATACION,
  ROL_DIRECTOR_CONTRATACION,
  ROL_SUPER_ADMIN,
];

/**
 * Quién mueve los plazos de publicidad (EFDS-1387).
 *
 * Mismo criterio que los umbrales y por la misma razón: cambiar un plazo no
 * afecta a un proceso sino a todos los que se publiquen después, así que queda
 * en la Dirección de Contratación. El gestor publica; no reescribe el término.
 *
 * Constante propia y no un alias de ROLES_ADMIN_UMBRALES: hoy coinciden, pero
 * son dos parámetros distintos y nada obliga a que sigan coincidiendo.
 */
export const ROLES_ADMIN_PLAZOS = [ROL_DIRECTOR_CONTRATACION, ROL_SUPER_ADMIN];

/**
 * Quién gestiona las observaciones al pliego y la limitación a MIPYME
 * (actividades 5.3 y 5.4, EFDS-1151).
 *
 * Mismos roles que la publicación porque es el mismo gestor llevando la etapa
 * 5. Constante aparte y no reutilizada: un lector que viera
 * `ROLES_PUBLICACION_PLIEGO` en un endpoint de observaciones tendría que
 * adivinar si es intencional o un copiar y pegar.
 */
export const ROLES_PARTICIPACION = [
  ROL_GESTOR_CONTRATACION,
  ROL_DIRECTOR_CONTRATACION,
  ROL_SUPER_ADMIN,
];

/** Quién ajusta las condiciones de la limitación a MIPYME (EFDS-1393). */
export const ROLES_ADMIN_MIPYME = [ROL_DIRECTOR_CONTRATACION, ROL_SUPER_ADMIN];

/**
 * Quién elabora y carga los documentos del proceso (actividad 5.1, EFDS-1149).
 *
 * La matriz asigna la elaboración a la Dirección de Contratación, así que son
 * los mismos roles que llevan la etapa. El estructurador financiero queda
 * fuera: interviene en el CDP, que condiciona esta actividad en contratación
 * directa, pero no redacta el pliego.
 */
export const ROLES_DOCUMENTOS_PROCESO = [
  ROL_GESTOR_CONTRATACION,
  ROL_DIRECTOR_CONTRATACION,
  ROL_SUPER_ADMIN,
];

/**
 * Quién registra la audiencia de asignación de riesgos (actividad 5.5,
 * EFDS-1153).
 *
 * La audiencia la preside la Dirección de Contratación y su resultado es la
 * matriz de riesgos del proceso. Constante propia y no reutilizada: coincide
 * hoy con quien lleva la etapa, pero es una actuación distinta y nada obliga a
 * que siga coincidiendo.
 */
export const ROLES_AUDIENCIA_RIESGOS = [
  ROL_GESTOR_CONTRATACION,
  ROL_DIRECTOR_CONTRATACION,
  ROL_SUPER_ADMIN,
];

/**
 * Quién emite y publica las adendas del proceso (actividad 5.6, EFDS-1154).
 *
 * Una adenda modifica un pliego ya público y puede mover el plazo del proceso,
 * así que es la misma Dirección de Contratación que lo publicó. Constante
 * propia por el mismo motivo que las anteriores: coincide hoy, pero es otra
 * actuación.
 */
export const ROLES_ADENDAS = [
  ROL_GESTOR_CONTRATACION,
  ROL_DIRECTOR_CONTRATACION,
  ROL_SUPER_ADMIN,
];

/**
 * Quién registra las ofertas recibidas y cierra la recepción (actividad 6.1,
 * EFDS-1155).
 *
 * Primera actividad de la etapa 6 y sigue siendo el gestor del proceso quien la
 * lleva: recibe las ofertas en ventanilla y cierra al vencimiento. La
 * evaluación, que es otra cosa, tendrá sus propios roles cuando llegue.
 */
export const ROLES_OFERTAS = [
  ROL_GESTOR_CONTRATACION,
  ROL_DIRECTOR_CONTRATACION,
  ROL_SUPER_ADMIN,
];

/** Ordenador del Gasto: designa el comité evaluador (actividad 6.2). */
export const ROL_ORDENADOR_GASTO = 'ORDENADOR_GASTO';

/** Las tres dimensiones del comité evaluador (RF-SIS-02). */
export const ROL_EVALUADOR_JURIDICO = 'EVALUADOR_JURIDICO';
export const ROL_EVALUADOR_FINANCIERO = 'EVALUADOR_FINANCIERO';
export const ROL_EVALUADOR_TECNICO = 'EVALUADOR_TECNICO';

/**
 * Quién designa el comité evaluador (actividad 6.2, EFDS-1156).
 *
 * Más estrecho que el resto de la etapa a propósito: la historia dice que la
 * designación es del Ordenador del Gasto, y es él quien responde por a quién
 * nombra. El gestor lleva el proceso, pero no elige a los evaluadores.
 */
export const ROLES_DESIGNAR_COMITE = [ROL_ORDENADOR_GASTO, ROL_SUPER_ADMIN];

/**
 * Quién registra el resultado de la evaluación (actividad 6.3, EFDS-1157).
 *
 * La evaluación se hace por fuera de la plataforma y quien la trae es el mismo
 * comité que la hizo: la matriz de roles le reconoce "consulta y cargue de
 * archivos". El gestor queda fuera a propósito —no evaluó— y el rol solo abre
 * la puerta: **quién puede registrar lo decide la membresía del comité del
 * proceso** (EFDS-1438), no esta lista. Un evaluador designado en otro proceso
 * llega hasta aquí y no escribe nada, que es exactamente lo correcto.
 */
export const ROLES_EVALUACION = [
  ROL_EVALUADOR_JURIDICO,
  ROL_EVALUADOR_FINANCIERO,
  ROL_EVALUADOR_TECNICO,
  ROL_SUPER_ADMIN,
];

/**
 * Quién publica y traslada el informe de evaluación (actividad 6.4, EFDS-1158).
 *
 * El comité evalúa y entrega su resultado (6.3); trasladarlo es un acto de la
 * entidad, no del comité: se publica, se notifica y se abre el término para que
 * los oferentes reclamen. Por eso vuelve al gestor del proceso y los
 * evaluadores quedan fuera —nadie corre el traslado de su propia evaluación—.
 */
export const ROLES_TRASLADO = [
  ROL_GESTOR_CONTRATACION,
  ROL_DIRECTOR_CONTRATACION,
  ROL_SUPER_ADMIN,
];

/**
 * Quién mueve los plazos de traslado (EFDS-1467).
 *
 * Mismo criterio que los umbrales, los plazos de publicidad y los de ofertas:
 * cambiar un término no afecta a un proceso sino a todos los que se trasladen
 * después, así que queda en la Dirección de Contratación.
 */
export const ROLES_ADMIN_PLAZOS_TRASLADO = [ROL_DIRECTOR_CONTRATACION, ROL_SUPER_ADMIN];

/**
 * Quién registra la audiencia de adjudicación y abre el sobre económico
 * (actividades 7.1 y 7.2, EFDS-1159).
 *
 * El trámite lo lleva el gestor del proceso, como el traslado: registrar que la
 * audiencia se celebró y cargar su acta es documentar un hecho, no decidir.
 * Adjudicar sí es decidir, y por eso tiene su propia lista.
 *
 * **Supuesto del equipo, sin confirmar** (EFDS-1489): la historia dice que el
 * Ordenador del Gasto adjudica, pero no dice quién preside ni quién registra la
 * audiencia.
 */
export const ROLES_AUDIENCIA_ADJUDICACION = [
  ROL_GESTOR_CONTRATACION,
  ROL_DIRECTOR_CONTRATACION,
  ROL_SUPER_ADMIN,
];

/**
 * Quién emite el acto de adjudicación (actividad 7.4, EFDS-1159).
 *
 * El Ordenador del Gasto, con la misma separación de la designación del comité
 * (EFDS-1438): el gestor lleva el trámite, pero comprometer a la entidad con un
 * tercero es de quien ordena el gasto. Aquí sí lo dice la historia.
 */
export const ROLES_ADJUDICAR = [ROL_ORDENADOR_GASTO, ROL_SUPER_ADMIN];

/**
 * Quién declara desierto el proceso (EFDS-1160, RF-ADJ-02).
 *
 * El gestor del proceso, porque es lo que dice la historia: "Como Gestor de
 * Contratación quiero declarar desierto el proceso".
 *
 * **Queda una tensión sin resolver** (EFDS-1513): la declaratoria desierta es
 * un acto administrativo motivado, de la misma naturaleza del acto de
 * adjudicación, y aquel lo firma el Ordenador del Gasto. Se implementa como
 * dice la historia y no como el equipo supone que debería ser; si Contratación
 * confirma lo otro, esta lista es lo único que cambia.
 */
export const ROLES_DECLARAR_DESIERTO = [
  ROL_GESTOR_CONTRATACION,
  ROL_DIRECTOR_CONTRATACION,
  ROL_SUPER_ADMIN,
];

/**
 * Quién elabora el contrato y registra la aceptación del proponente
 * (actividad 8.1, EFDS-1161).
 *
 * Es el gestor que lleva el proceso quien redacta la minuta y quien deja
 * constancia de la respuesta del proponente. El Ordenador del Gasto entra
 * después, al firmar (EFDS-1162): una cosa es elaborar el contrato y otra
 * comprometer a la entidad con él.
 */
export const ROLES_CONTRATO = [
  ROL_GESTOR_CONTRATACION,
  ROL_DIRECTOR_CONTRATACION,
  ROL_SUPER_ADMIN,
];

/**
 * Quién registra las firmas que suscriben el contrato (actividad 8.1,
 * EFDS-1162).
 *
 * Se suma el Ordenador del Gasto a los que elaboran: la historia dice que es él
 * quien firma por la entidad, y firmar es comprometerla. La del contratista la
 * registra el gestor con su evidencia, porque el contratista no tiene cuenta en
 * el sistema; por eso quien firma y quien registra se guardan por separado.
 */
export const ROLES_SUSCRIBIR_CONTRATO = [
  ROL_ORDENADOR_GASTO,
  ROL_GESTOR_CONTRATACION,
  ROL_DIRECTOR_CONTRATACION,
  ROL_SUPER_ADMIN,
];

/**
 * Quién carga las pólizas y registra la ARL (actividades 8.4 y 8.5,
 * EFDS-1164).
 *
 * Las constituye el contratista, pero él no tiene cuenta en el sistema: quien
 * las sube es el gestor que lleva el contrato, igual que registra la firma de
 * la otra parte.
 */
export const ROLES_LEGALIZACION = [
  ROL_GESTOR_CONTRATACION,
  ROL_DIRECTOR_CONTRATACION,
  ROL_SUPER_ADMIN,
];

/**
 * Quién aprueba o devuelve una garantía (actividad 8.4).
 *
 * Más estrecho que quien las carga, y a propósito: si el mismo que sube la
 * póliza pudiera aprobarla, la revisión que pide el criterio 1 no sería una
 * revisión. La verificación de las coberturas es de la Dirección de
 * Contratación, que es quien responde por que el contrato quede amparado.
 */
export const ROLES_APROBAR_GARANTIAS = [
  ROL_DIRECTOR_CONTRATACION,
  ROL_REVISOR_CONTRATACION,
  ROL_SUPER_ADMIN,
];

/** Vigila la ejecución del contrato que le asignaron (etapa 9). */
export const ROL_SUPERVISOR_CONTRATO = 'SUPERVISOR_CONTRATO';

/**
 * Quién designa al supervisor del contrato (actividad 8.2, EFDS-1165).
 *
 * Más estrecho que el resto de la etapa y por la misma razón que el comité: la
 * historia dice que la designación es del Ordenador del Gasto, y es él quien
 * responde por a quién encarga la vigilancia de la ejecución.
 */
export const ROLES_DESIGNAR_SUPERVISOR = [ROL_ORDENADOR_GASTO, ROL_SUPER_ADMIN];

/**
 * Quién suscribe el acta de inicio (actividad 9.1, EFDS-1167).
 *
 * La historia es del Supervisor: es él quien convoca la reunión, socializa el
 * alcance y responde por la ejecución que arranca. Se le suman el gestor y el
 * Director de Contratación, que son quienes llevan el expediente y quienes
 * tendrán que registrar el acta cuando el supervisor no la cargue él mismo.
 *
 * Como con el comité evaluador (EFDS-1438), **el rol solo abre la puerta**: el
 * servicio exige que el contrato tenga supervisor vigente designado, así que
 * un supervisor de otro contrato llega hasta aquí y no suscribe nada.
 */
export const ROLES_ACTA_INICIO = [
  ROL_SUPERVISOR_CONTRATO,
  ROL_GESTOR_CONTRATACION,
  ROL_DIRECTOR_CONTRATACION,
  ROL_SUPER_ADMIN,
];

/**
 * Quién consulta la etapa 9.
 *
 * Los de contratación más el supervisor: sin esto, quien vigila la ejecución no
 * podría ni abrir la pantalla del contrato que le asignaron.
 */
export const ROLES_LECTURA_EJECUCION = [
  ...ROLES_LECTURA_CONTRATACION,
  ROL_SUPERVISOR_CONTRATO,
];

/**
 * Quién radica la cuenta de cobro (actividad 9.4, EFDS-1170).
 *
 * El contratista no tiene cuenta en el sistema —igual que en la etapa 8, donde
 * el gestor registra su firma—, así que la radica quien lleva el expediente o
 * quien vigila la ejecución.
 */
export const ROLES_RADICAR_PAGO = [
  ROL_SUPERVISOR_CONTRATO,
  ROL_GESTOR_CONTRATACION,
  ROL_DIRECTOR_CONTRATACION,
  ROL_SUPER_ADMIN,
];

/**
 * Quién avala o devuelve la cuenta (actividad 9.4).
 *
 * El núcleo de la historia: «el supervisor da aval». Más estrecho que quien
 * radica, y a propósito —si quien presenta la cuenta pudiera avalarla, el aval
 * dejaría de ser una revisión, con el mismo criterio de las garantías
 * (EFDS-1164)—.
 *
 * Y el rol solo abre la puerta: el servicio exige que sea el supervisor
 * **vigente de ese contrato**, como en la evaluación (EFDS-1438).
 */
export const ROLES_AVALAR_PAGO = [ROL_SUPERVISOR_CONTRATO, ROL_SUPER_ADMIN];

/**
 * Quién tramita el pago avalado (actividad 9.4).
 *
 * La Dirección Financiera, con el mismo criterio del CDP y del RP: es ella la
 * que mueve el presupuesto de la entidad. El supervisor avala la prestación;
 * no gira el dinero.
 */
export const ROLES_TRAMITAR_PAGO = [ROL_ESTRUCTURADOR_FINANCIERO, ROL_SUPER_ADMIN];

/**
 * Quién elabora el informe final de ejecución (actividad 10.1, EFDS-1171).
 *
 * El supervisor, y por la misma razón que avala los pagos: el informe final es
 * la conclusión de su vigilancia. El gestor lleva el expediente, pero no puede
 * concluir sobre una ejecución que no vigiló.
 *
 * Como en el aval, el rol solo abre la puerta: el servicio exige que sea el
 * supervisor **vigente de ese contrato**.
 */
export const ROLES_INFORME_FINAL = [ROL_SUPERVISOR_CONTRATO, ROL_SUPER_ADMIN];

export interface HiringUser {
  userId?: string;
  username?: string;
  email?: string;
  roles?: unknown;
}

/**
 * Los roles llegan del JWT como strings o como objetos {code, name},
 * según quién emita el token. Se normalizan a códigos en mayúsculas.
 */
export function normalizeRoles(roles: unknown): string[] {
  const list = Array.isArray(roles) ? roles : roles ? [roles] : [];
  return list
    .map((role: any) => (typeof role === 'string' ? role : role?.code ?? role?.name ?? ''))
    .filter(Boolean)
    .map((role: string) => role.toUpperCase().trim());
}

export interface HiringAccess {
  userId: string;
  userName: string;
  userEmail?: string;
  roles: string[];
  puedeEditar: boolean;
}

/** Extrae del request el usuario autenticado en la forma que usan los services. */
export function getHiringAccess(req: any): HiringAccess {
  const user: HiringUser = req?.user ?? {};
  const roles = normalizeRoles(user.roles);

  return {
    userId: user.userId ?? '',
    userName: user.username ?? user.email ?? user.userId ?? 'Sistema',
    userEmail: user.email,
    roles,
    puedeEditar: ROLES_ESCRITURA_ESTUDIO_PREVIO.some((r) => roles.includes(r)),
  };
}
