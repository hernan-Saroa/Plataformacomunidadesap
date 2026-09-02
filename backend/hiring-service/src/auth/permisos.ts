/**
 * Permisos del módulo de Contratación.
 *
 * Los permisos son del código y los roles son datos: el administrador crea,
 * renombra y combina roles desde la plataforma, y decide cuál de ellos otorga
 * cada permiso. Por eso los endpoints nombran `contratacion.acta_inicio.
 * suscribir` y no `ORDENADOR_GASTO` —ese rol puede llamarse de otra forma
 * mañana, o convivir con otro equivalente, y el endpoint tiene que seguir
 * funcionando—.
 *
 * Los códigos siguen el formato `modulo.recurso.accion` del catálogo de
 * `auth.permission`, donde ya viven los quince primeros de contratación.
 */

import { normalizeRoles } from './hiring-access';

// -------------------------------------------------------------- catálogo --

/** Suscribir el acta de inicio y dar comienzo a la ejecución (EFDS-1167). */
export const PERMISO_ACTA_INICIO_SUSCRIBIR = 'contratacion.acta-inicio.suscribir';

/** Reasignar al supervisor durante la ejecución (EFDS-1169). */
export const PERMISO_SUPERVISION_REASIGNAR = 'contratacion.supervision.reasignar';

/** Cargar informes, actas y soportes del seguimiento (EFDS-1168). */
export const PERMISO_SEGUIMIENTO_CARGAR = 'contratacion.seguimiento.cargar';

/** Consultar el seguimiento de la ejecución (EFDS-1168). */
export const PERMISO_SEGUIMIENTO_VER = 'contratacion.seguimiento.ver';

/** Consultar el expediente del proceso; ya existe en auth.permission. */
export const PERMISO_EXPEDIENTE_VER = 'contratacion.expediente.view';

/** Solicitar una modificación contractual — actividad 9.5 (EFDS-1177). */
export const PERMISO_MODIFICACION_SOLICITAR = 'contratacion.modificacion.solicitar';

/**
 * Aprobar o negar la modificación (EFDS-1177).
 *
 * Aparte de solicitarla a propósito: quien pide la prórroga no puede
 * concedérsela a sí mismo. Es la misma separación que ya tienen el estudio
 * previo —`actividad.edit` frente a `actividad.approve`— y el CDP.
 */
export const PERMISO_MODIFICACION_APROBAR = 'contratacion.modificacion.aprobar';

/** Consultar las modificaciones del contrato (EFDS-1177). */
export const PERMISO_MODIFICACION_VER = 'contratacion.modificacion.ver';

/** Reportar el presunto incumplimiento del contrato (EFDS-1180). */
export const PERMISO_INCUMPLIMIENTO_REPORTAR = 'contratacion.incumplimiento.reportar';

/** Consultar los reportes de presunto incumplimiento (EFDS-1180). */
export const PERMISO_INCUMPLIMIENTO_VER = 'contratacion.incumplimiento.ver';

/**
 * Instruir el trámite sancionatorio: abrirlo, citar audiencias, registrar lo
 * que pasó en ellas y notificar las resoluciones (EFDS-1181).
 */
export const PERMISO_INCUMPLIMIENTO_TRAMITAR = 'contratacion.incumplimiento.tramitar';

/**
 * Decidir el caso: archivarlo, declarar el incumplimiento o la caducidad, y
 * revocar lo resuelto (EFDS-1181).
 *
 * Aparte del anterior y no reunido con él: instruir y decidir no son la misma
 * competencia, y juntarlos le daría a quien lleva el trámite la facultad de
 * sancionar.
 */
export const PERMISO_INCUMPLIMIENTO_DECIDIR = 'contratacion.incumplimiento.decidir';

// Los diez del catálogo original (EFDS-1183); ya viven en auth.permission.
export const PERMISO_ACTIVIDAD_EDITAR = 'contratacion.actividad.edit';
export const PERMISO_ACTIVIDAD_ENVIAR = 'contratacion.actividad.send';
export const PERMISO_ACTIVIDAD_APROBAR = 'contratacion.actividad.approve';
export const PERMISO_DOCUMENTO_ADJUNTAR = 'contratacion.documento.upload';
export const PERMISO_DOCUMENTO_ELIMINAR = 'contratacion.documento.delete';
export const PERMISO_PROCESO_CREAR = 'contratacion.proceso.create';
export const PERMISO_PROCESO_EDITAR = 'contratacion.proceso.edit';
export const PERMISO_PROCESO_VER = 'contratacion.proceso.view';
export const PERMISO_PROCESO_VER_TODOS = 'contratacion.proceso.view-all';
export const PERMISO_PROCESO_ASIGNAR = 'contratacion.proceso.assign';
export const PERMISO_PROCESO_ARCHIVAR = 'contratacion.proceso.archive';
export const PERMISO_PROCESO_BORRAR = 'contratacion.proceso.delete';
export const PERMISO_CONFIG_ADMINISTRAR = 'contratacion.config.manage';
export const PERMISO_REPORTE_VER = 'contratacion.reporte.view';

/** Consultar los vencimientos próximos y cumplidos (EFDS-1185). */
export const PERMISO_ALERTA_VER = 'contratacion.alerta.ver';

/**
 * Consultar el expediente completo para auditoría (EFDS-1186).
 *
 * Aparte de `expediente.view`: auditar incluye la trazabilidad y el historial
 * de supervisiones y modificaciones, no solo los documentos.
 */
export const PERMISO_EXPEDIENTE_AUDITAR = 'contratacion.expediente.auditar';

// ------------------------- las competencias que no son del gestor --
//
// Los seis que sustituyeron a las listas `ROLES_*` con composición propia. El
// resto del trámite —publicar el pliego, emitir adendas, liquidar— comparte
// `actividad.edit` porque comparte también quién lo hace: el gestor con su
// expediente. Estos seis existen porque la matriz los encarga a alguien más.

/**
 * Expedir el CDP y el RP, tramitar los pagos avalados y cerrar financieramente
 * el contrato (etapas 4, 9.4 y 10.3).
 *
 * Uno solo para los tres momentos porque es la misma competencia: mover el
 * presupuesto de la entidad, que es de la Dirección Financiera. Ni el gestor
 * que liquidó ni el supervisor que vigiló.
 */
export const PERMISO_PRESUPUESTO_GESTIONAR = 'contratacion.presupuesto.gestionar';

/**
 * Designar el comité evaluador y al supervisor (actividades 6.2 y 8.2).
 *
 * Del Ordenador del Gasto: el gestor lleva el proceso, pero no elige a quién se
 * encarga de evaluar ni de vigilar, y responde por a quién nombra.
 */
export const PERMISO_DESIGNACION_ORDENAR = 'contratacion.designacion.ordenar';

/**
 * Emitir el acto de adjudicación (actividad 7.4).
 *
 * Aparte de la designación aunque hoy lo tenga el mismo rol: adjudicar
 * compromete a la entidad con un tercero, y es la decisión de fondo del
 * proceso.
 */
export const PERMISO_ADJUDICACION_DECIDIR = 'contratacion.adjudicacion.decidir';

/**
 * Registrar el resultado de la evaluación (actividad 6.3).
 *
 * De las tres dimensiones del comité (RF-SIS-02). El gestor queda fuera porque
 * no evaluó, y el permiso solo abre la puerta: quién puede registrar lo decide
 * además la membresía del comité de ese proceso (EFDS-1438).
 */
export const PERMISO_EVALUACION_REGISTRAR = 'contratacion.evaluacion.registrar';

/**
 * Avalar la cuenta de cobro y suscribir el informe final (actividades 9.4 y
 * 10.1).
 *
 * Aparte de `seguimiento.cargar` a propósito: cargar un informe documenta,
 * avalar decide. Si quien radica la cuenta pudiera avalarla, el aval dejaría de
 * ser una revisión —mismo criterio que las garantías (EFDS-1164)—.
 */
export const PERMISO_SUPERVISION_AVALAR = 'contratacion.supervision.avalar';

/**
 * Archivar y reabrir el expediente, y registrar la publicación del acta
 * (actividad 10.4).
 *
 * La custodia es del Archivo de Gestión: reabrir un expediente archivado toca
 * algo que ya se declaró completo ante entes de control.
 */
export const PERMISO_EXPEDIENTE_ARCHIVAR = 'contratacion.expediente.archivar';

// ------------------------------------------------- de dónde salen hoy --

/**
 * El respaldo mientras el token no traiga los permisos.
 *
 * auth-service ya los calcula al iniciar sesión, pero arma el JWT solo con
 * `roles` y los descarta: hoy hiring no puede leerlos aunque quiera. Hasta que
 * el payload los incluya, cada permiso declara qué roles lo tenían en el
 * catálogo A4, y este mapa es el único sitio del módulo donde se nombra un rol.
 *
 * Cuando el token traiga `permissions`, `permisosDelUsuario` los usará y este
 * mapa se podrá borrar sin tocar un solo endpoint. Esa es toda la razón de que
 * exista: que el cambio sea de una función y no de noventa y cinco decoradores.
 */
const ROLES_QUE_OTORGAN: Record<string, string[]> = {
  [PERMISO_ACTA_INICIO_SUSCRIBIR]: [
    'SUPERVISOR_CONTRATO',
    'ORDENADOR_GASTO',
    'GESTOR_CONTRATACION',
    'SUPER_ADMIN',
  ],
  // Más estrecho: reasignar la supervisión es un acto del ordenador, igual que
  // designarla la primera vez.
  [PERMISO_SUPERVISION_REASIGNAR]: ['ORDENADOR_GASTO', 'SUPER_ADMIN'],
  [PERMISO_SEGUIMIENTO_CARGAR]: [
    'SUPERVISOR_CONTRATO',
    'GESTOR_CONTRATACION',
    'SUPER_ADMIN',
  ],
  // La consulta es ancha a propósito: el seguimiento de un contrato lo revisan
  // control interno y la propia Dirección, no solo quien lo carga.
  [PERMISO_SEGUIMIENTO_VER]: [
    'SUPERVISOR_CONTRATO',
    'GESTOR_CONTRATACION',
    'REVISOR_CONTRATACION',
    'DIRECTOR_CONTRATACION',
    'ORDENADOR_GASTO',
    'SUPER_ADMIN',
  ],
  [PERMISO_EXPEDIENTE_VER]: [
    'GESTOR_CONTRATACION',
    'REVISOR_CONTRATACION',
    'DIRECTOR_CONTRATACION',
    'ORDENADOR_GASTO',
    'SUPERVISOR_CONTRATO',
    'SUPER_ADMIN',
  ],
  /**
   * Pedir la prórroga es un trámite contractual, no presupuestal: la lleva
   * quien lleva el expediente. El supervisor no la solicita —constata que hace
   * falta y lo dice por el seguimiento—, y la Dirección Financiera tampoco,
   * porque la prórroga no mueve dinero.
   */
  [PERMISO_MODIFICACION_SOLICITAR]: [
    'GESTOR_CONTRATACION',
    'DIRECTOR_CONTRATACION',
    'SUPER_ADMIN',
  ],
  /**
   * Concederla es del ordenador del gasto y la Dirección: extender el plazo
   * compromete a la entidad frente al contratista, y quien la pidió no puede
   * dársela a sí mismo.
   */
  [PERMISO_MODIFICACION_APROBAR]: [
    'ORDENADOR_GASTO',
    'DIRECTOR_CONTRATACION',
    'SUPER_ADMIN',
  ],
  // Ancha como la del seguimiento, y por lo mismo: lo que le pasó al plazo de
  // un contrato lo revisan control interno y la Dirección.
  [PERMISO_MODIFICACION_VER]: [
    'GESTOR_CONTRATACION',
    'REVISOR_CONTRATACION',
    'DIRECTOR_CONTRATACION',
    'ORDENADOR_GASTO',
    'SUPERVISOR_CONTRATO',
    'SUPER_ADMIN',
  ],
  // La lista más estrecha del bloque: RF-INC-01 encarga el reporte al
  // supervisor, y es coherente con quién constata el hecho. Ni el gestor ni el
  // ordenador vigilan la ejecución día a día, así que no están en condiciones
  // de afirmar que algo se incumplió.
  [PERMISO_INCUMPLIMIENTO_REPORTAR]: ['SUPERVISOR_CONTRATO', 'SUPER_ADMIN'],
  // La consulta es más ancha: el caso lo tramita el área jurídica y lo revisa
  // la Dirección, así que ocultárselo a quien lleva el expediente no protegería
  // nada. La restricción por reserva legal que pide RF-INC-03 es EFDS-1182 y se
  // resuelve allí, sobre este mismo permiso.
  [PERMISO_INCUMPLIMIENTO_VER]: [
    'SUPERVISOR_CONTRATO',
    'GESTOR_CONTRATACION',
    'REVISOR_CONTRATACION',
    'DIRECTOR_CONTRATACION',
    'ORDENADOR_GASTO',
    'SUPER_ADMIN',
  ],
  // El trámite lo lleva el área jurídica, que en la matriz de roles son los
  // «ABOGADOS / PROFESIONALES» de la Dirección de Contratación: los que
  // «proyectan todos los actos administrativos del proceso». Este módulo los
  // viene llamando GESTOR_CONTRATACION desde la etapa 3, así que no se inventa
  // un rol nuevo para nombrarlos otra vez.
  [PERMISO_INCUMPLIMIENTO_TRAMITAR]: [
    'GESTOR_CONTRATACION',
    'DIRECTOR_CONTRATACION',
    'SUPER_ADMIN',
  ],
  // Más estrecho, con el criterio de las garantías (EFDS-1164) y del acto de
  // adjudicación: quien instruye no decide. Declarar el incumplimiento o la
  // caducidad compromete a la entidad frente al contratista —le impone una
  // multa o le termina el contrato—, así que queda en la Dirección y en el
  // Ordenador del Gasto, que es de quien son los actos que obligan.
  [PERMISO_INCUMPLIMIENTO_DECIDIR]: [
    'DIRECTOR_CONTRATACION',
    'ORDENADOR_GASTO',
    'SUPER_ADMIN',
  ],
  // Espejan las listas ROLES_* de hiring-access, que son la lectura vigente
  // del catálogo A4: el guard por permiso no puede dar ni quitar acceso
  // respecto del que ya daban los roles.
  [PERMISO_ACTIVIDAD_EDITAR]: ['GESTOR_CONTRATACION', 'SUPER_ADMIN'],
  [PERMISO_ACTIVIDAD_ENVIAR]: ['GESTOR_CONTRATACION', 'SUPER_ADMIN'],
  [PERMISO_ACTIVIDAD_APROBAR]: [
    'REVISOR_CONTRATACION',
    'DIRECTOR_CONTRATACION',
    'SUPER_ADMIN',
  ],
  [PERMISO_DOCUMENTO_ADJUNTAR]: ['GESTOR_CONTRATACION', 'SUPER_ADMIN'],
  [PERMISO_DOCUMENTO_ELIMINAR]: ['GESTOR_CONTRATACION', 'SUPER_ADMIN'],
  [PERMISO_PROCESO_CREAR]: ['GESTOR_CONTRATACION', 'SUPER_ADMIN'],
  [PERMISO_PROCESO_EDITAR]: ['GESTOR_CONTRATACION', 'SUPER_ADMIN'],
  [PERMISO_PROCESO_VER]: [
    'GESTOR_CONTRATACION',
    'REVISOR_CONTRATACION',
    'DIRECTOR_CONTRATACION',
    'SUPER_ADMIN',
  ],
  [PERMISO_PROCESO_VER_TODOS]: [
    'REVISOR_CONTRATACION',
    'DIRECTOR_CONTRATACION',
    'SUPER_ADMIN',
  ],
  [PERMISO_PROCESO_ASIGNAR]: ['DIRECTOR_CONTRATACION', 'SUPER_ADMIN'],
  [PERMISO_PROCESO_ARCHIVAR]: ['DIRECTOR_CONTRATACION', 'SUPER_ADMIN'],
  [PERMISO_PROCESO_BORRAR]: ['SUPER_ADMIN'],
  [PERMISO_CONFIG_ADMINISTRAR]: ['DIRECTOR_CONTRATACION', 'SUPER_ADMIN'],
  [PERMISO_REPORTE_VER]: ['DIRECTOR_CONTRATACION', 'SUPER_ADMIN'],
  // Ancha: el vencimiento de una póliza le importa a quien la vigila y a quien
  // responde por el contrato.
  [PERMISO_ALERTA_VER]: [
    'GESTOR_CONTRATACION',
    'SUPERVISOR_CONTRATO',
    'REVISOR_CONTRATACION',
    'DIRECTOR_CONTRATACION',
    'ORDENADOR_GASTO',
    'ESTRUCTURADOR_FINANCIERO',
    'SUPER_ADMIN',
  ],
  // Los organismos de control entran aquí y no al expediente de trabajo.
  [PERMISO_EXPEDIENTE_AUDITAR]: [
    'ENTE_DE_CONTROL',
    'DIRECTOR_CONTRATACION',
    'ARCHIVO_GESTION_DC',
    'SUPER_ADMIN',
  ],

  // Las seis competencias que no son del gestor. Espejan lo que la migración
  // 060 sembró en auth.role_permissions, que es la fuente que manda; esto es
  // el respaldo por si la consulta falla.
  [PERMISO_PRESUPUESTO_GESTIONAR]: ['ESTRUCTURADOR_FINANCIERO', 'SUPER_ADMIN'],
  [PERMISO_DESIGNACION_ORDENAR]: ['ORDENADOR_GASTO', 'SUPER_ADMIN'],
  [PERMISO_ADJUDICACION_DECIDIR]: ['ORDENADOR_GASTO', 'SUPER_ADMIN'],
  [PERMISO_EVALUACION_REGISTRAR]: [
    'EVALUADOR_JURIDICO',
    'EVALUADOR_FINANCIERO',
    'EVALUADOR_TECNICO',
    'SUPER_ADMIN',
  ],
  [PERMISO_SUPERVISION_AVALAR]: ['SUPERVISOR_CONTRATO', 'SUPER_ADMIN'],
  [PERMISO_EXPEDIENTE_ARCHIVAR]: [
    'ARCHIVO_GESTION_DC',
    'GESTOR_CONTRATACION',
    'DIRECTOR_CONTRATACION',
    'SUPER_ADMIN',
  ],
};

/**
 * Los permisos que tiene el usuario del token.
 *
 * Prefiere los que venga declarando el propio token y solo cae al mapa de roles
 * cuando no los trae. Así el día que auth-service los incluya, el módulo pasa a
 * usarlos sin cambiar nada más.
 */
export function permisosDelUsuario(user: any): string[] {
  const delToken: unknown = user?.permissions ?? user?.permisos;
  if (Array.isArray(delToken) && delToken.length) {
    return delToken.filter((p): p is string => typeof p === 'string');
  }

  const roles = normalizeRoles(user?.roles ?? user?.role);

  return Object.entries(ROLES_QUE_OTORGAN)
    .filter(([, otorgan]) => otorgan.some((rol) => roles.includes(rol)))
    .map(([permiso]) => permiso);
}

/** Si el usuario puede hacer algo, para decidirlo fuera de un guard. */
export function tienePermiso(user: any, permiso: string): boolean {
  return permisosDelUsuario(user).includes(permiso);
}
