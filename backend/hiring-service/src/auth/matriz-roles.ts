/**
 * La matriz rol × permiso del módulo de Contratación (EFDS-1183, RF-SIS-02).
 *
 * El «Formato usuario-roles-permisos» que entregó la ESAP llega en dos hojas
 * que no se tocan entre sí: una rejilla de diez permisos marcada solo para
 * cuatro perfiles genéricos —Radicador, Abogado, Jefe de Oficina y
 * Administrador—, y un catálogo de catorce roles reales sin rejilla. Cruzarlas
 * es lo que hace este archivo.
 *
 * **Qué manda dónde.** Quién otorga cada permiso lo sigue diciendo
 * `ROLES_QUE_OTORGAN` en `permisos.ts`, que es lo que el guard evalúa: ahí cada
 * entrada arrastra la justificación de la historia que la fijó. Aquí no se
 * repite ninguna de esas decisiones —se leen de allá— y se agrega lo único que
 * faltaba: quién es cada rol, de dónde salió su fila y cómo se lee la rejilla
 * completa. Un permiso que se le dé o se le quite a un rol se cambia en un solo
 * sitio y esta matriz lo refleja sola.
 *
 * **La matriz no está confirmada.** La propia historia la deja como supuesto a
 * validar: «matriz definitiva rol × permiso (base en el formato entregado)».
 * Las filas marcadas `MODULO` las fijaron las historias del módulo actividad
 * por actividad y llevan años de discusión encima; las marcadas `FORMATO` salen
 * de leer los atributos del anexo. Ninguna la ha ratificado la Dirección de
 * Contratación todavía.
 */

import {
  PERMISO_ACTA_INICIO_SUSCRIBIR,
  PERMISO_ACTIVIDAD_APROBAR,
  PERMISO_ACTIVIDAD_EDITAR,
  PERMISO_ACTIVIDAD_ENVIAR,
  PERMISO_ALERTA_VER,
  PERMISO_CONFIG_ADMINISTRAR,
  PERMISO_DOCUMENTO_ADJUNTAR,
  PERMISO_DOCUMENTO_ELIMINAR,
  PERMISO_EXPEDIENTE_AUDITAR,
  PERMISO_EXPEDIENTE_VER,
  PERMISO_INCUMPLIMIENTO_DECIDIR,
  PERMISO_INCUMPLIMIENTO_REPORTAR,
  PERMISO_INCUMPLIMIENTO_TRAMITAR,
  PERMISO_INCUMPLIMIENTO_VER,
  PERMISO_MODIFICACION_APROBAR,
  PERMISO_MODIFICACION_SOLICITAR,
  PERMISO_MODIFICACION_VER,
  PERMISO_PROCESO_ARCHIVAR,
  PERMISO_PROCESO_ASIGNAR,
  PERMISO_PROCESO_BORRAR,
  PERMISO_PROCESO_CREAR,
  PERMISO_PROCESO_EDITAR,
  PERMISO_PROCESO_VER,
  PERMISO_PROCESO_VER_TODOS,
  PERMISO_ADJUDICACION_DECIDIR,
  PERMISO_DESIGNACION_ORDENAR,
  PERMISO_EVALUACION_REGISTRAR,
  PERMISO_EXPEDIENTE_ARCHIVAR,
  PERMISO_PRESUPUESTO_GESTIONAR,
  PERMISO_REPORTE_VER,
  PERMISO_SUPERVISION_AVALAR,
  PERMISO_SEGUIMIENTO_CARGAR,
  PERMISO_SEGUIMIENTO_VER,
  PERMISO_SUPERVISION_REASIGNAR,
  ROLES_QUE_OTORGAN,
  permisosDelUsuario,
} from './permisos';
import { normalizeRoles } from './hiring-access';

// --------------------------------------------- los catorce del catálogo --

/**
 * Los códigos de rol del «Formato usuario roles permisos Contratación».
 *
 * Se declaran aquí y no en `hiring-access` porque desde que la autorización
 * pasó a resolverse por permiso, ningún endpoint nombra un rol: el único sitio
 * del módulo que necesita nombrarlos es esta matriz, que es la que los enseña.
 *
 * Los cuatro últimos no los pedía ninguna actividad —el formato los lista, sin
 * más—, y por eso no se habían declarado nunca.
 */
const ROL_ESTRUCTURADOR_TECNICO = 'ESTRUCTURADOR_TECNICO';
const ROL_ESTRUCTURADOR_FINANCIERO = 'ESTRUCTURADOR_FINANCIERO';
const ROL_GESTOR_CONTRATACION = 'GESTOR_CONTRATACION';
const ROL_REVISOR_CONTRATACION = 'REVISOR_CONTRATACION';
const ROL_DIRECTOR_CONTRATACION = 'DIRECTOR_CONTRATACION';
const ROL_EVALUADOR_FINANCIERO = 'EVALUADOR_FINANCIERO';
const ROL_EVALUADOR_TECNICO = 'EVALUADOR_TECNICO';
const ROL_EVALUADOR_JURIDICO = 'EVALUADOR_JURIDICO';
const ROL_ARCHIVO_GESTION_DC = 'ARCHIVO_GESTION_DC';
const ROL_ORDENADOR_GASTO = 'ORDENADOR_GASTO';
const ROL_SUPERVISOR_CONTRATO = 'SUPERVISOR_CONTRATO';
const ROL_APOYO_SUPERVISION = 'APOYO_SUPERVISION';
const ROL_ENTE_DE_CONTROL = 'ENTE_DE_CONTROL';
const ROL_ADMINISTRADOR_CONTRATACION = 'ADMINISTRADOR_CONTRATACION';

/** Transversal a la plataforma, no del catálogo: lo resuelve auth-service. */
const ROL_SUPER_ADMIN = 'SUPER_ADMIN';

// ------------------------------------------------- las diez columnas --

/**
 * Las diez columnas de permiso de la Hoja1 del formato.
 *
 * Se conservan como se escribieron ahí, aunque el módulo haya terminado con
 * veintiocho códigos: son el vocabulario con el que Contratación va a revisar
 * la matriz, y traducirlas a `contratacion.proceso.view-all` obligaría a
 * revisar contra un documento que no es el suyo.
 */
export type ColumnaDelFormato =
  | 'Radicar'
  | 'Editar'
  | 'Adjuntar'
  | 'Visualizar todos los procesos'
  | 'Asignar / Reasignar'
  | 'Aprobar'
  | 'Archivar'
  | 'Borrar'
  | 'Generar informes'
  | 'Configurar';

export interface PermisoDelCatalogo {
  codigo: string;
  /** Cómo se llama en `auth.permission`; la migración 060 siembra el mismo. */
  nombre: string;
  /** Qué habilita, en una línea, para quien revisa la matriz. */
  descripcion: string;
  /** El segmento central del código: agrupa la rejilla por lo que se toca. */
  recurso: string;
  /**
   * La columna de la Hoja1 que este código realiza, si alguna.
   *
   * `null` en los doce que no tienen columna: son de etapas que el formato es
   * anterior a que existieran —la ejecución, las modificaciones, el
   * incumplimiento, las alertas y la auditoría del expediente—. Marcarlos como
   * si salieran del anexo sería atribuirle una decisión que no tomó.
   */
  columna: ColumnaDelFormato | null;
}

/**
 * Los veintiocho permisos del módulo, en el orden en que se leen.
 *
 * Es la lista que faltaba: los códigos ya estaban declarados uno a uno en
 * `permisos.ts`, pero nada los recorría, así que ni la matriz podía dibujar sus
 * columnas ni la siembra sabía cuáles tenía que crear.
 */
export const CATALOGO_PERMISOS: PermisoDelCatalogo[] = [
  {
    codigo: PERMISO_PROCESO_CREAR,
    nombre: 'Radicar proceso',
    descripcion: 'Crear el proceso de contratación y darle su número de radicado',
    recurso: 'proceso',
    columna: 'Radicar',
  },
  {
    codigo: PERMISO_PROCESO_EDITAR,
    nombre: 'Editar proceso',
    descripcion: 'Modificar los datos del proceso mientras está en curso',
    recurso: 'proceso',
    columna: 'Editar',
  },
  {
    codigo: PERMISO_PROCESO_VER,
    nombre: 'Consultar proceso',
    descripcion: 'Abrir los procesos a los que se tiene acceso y seguir su avance',
    recurso: 'proceso',
    columna: null,
  },
  {
    codigo: PERMISO_PROCESO_VER_TODOS,
    nombre: 'Visualizar todos los procesos',
    descripcion: 'Consultar cualquier proceso de la entidad, no solo los propios',
    recurso: 'proceso',
    columna: 'Visualizar todos los procesos',
  },
  {
    codigo: PERMISO_PROCESO_ASIGNAR,
    nombre: 'Asignar o reasignar proceso',
    descripcion: 'Repartir los procesos entre los abogados de la Dirección',
    recurso: 'proceso',
    columna: 'Asignar / Reasignar',
  },
  {
    codigo: PERMISO_PROCESO_ARCHIVAR,
    nombre: 'Archivar proceso',
    descripcion: 'Retirar de la bandeja activa un proceso que ya no se trabaja',
    recurso: 'proceso',
    columna: 'Archivar',
  },
  {
    codigo: PERMISO_PROCESO_BORRAR,
    nombre: 'Borrar proceso',
    descripcion: 'Eliminar un proceso creado por error, antes de que produzca actos',
    recurso: 'proceso',
    columna: 'Borrar',
  },
  {
    codigo: PERMISO_ACTIVIDAD_EDITAR,
    nombre: 'Editar actividad',
    descripcion: 'Diligenciar los formularios de una actividad del proceso',
    recurso: 'actividad',
    columna: 'Editar',
  },
  {
    codigo: PERMISO_ACTIVIDAD_ENVIAR,
    nombre: 'Enviar actividad a revisión',
    descripcion: 'Dar por terminada una actividad y pasarla a quien la aprueba',
    recurso: 'actividad',
    columna: 'Editar',
  },
  {
    codigo: PERMISO_ACTIVIDAD_APROBAR,
    nombre: 'Aprobar o devolver actividad',
    descripcion: 'Dar el visto bueno a una actividad enviada, o devolverla con observaciones',
    recurso: 'actividad',
    columna: 'Aprobar',
  },
  {
    codigo: PERMISO_DOCUMENTO_ADJUNTAR,
    nombre: 'Adjuntar documento',
    descripcion: 'Cargar documentos al expediente del proceso',
    recurso: 'documento',
    columna: 'Adjuntar',
  },
  {
    codigo: PERMISO_DOCUMENTO_ELIMINAR,
    nombre: 'Eliminar documento',
    descripcion: 'Anular un documento cargado por error en el expediente',
    recurso: 'documento',
    columna: 'Borrar',
  },
  {
    codigo: PERMISO_EXPEDIENTE_VER,
    nombre: 'Consultar expediente',
    descripcion: 'Ver el expediente de trabajo del proceso y sus documentos',
    recurso: 'expediente',
    columna: null,
  },
  {
    codigo: PERMISO_EXPEDIENTE_AUDITAR,
    nombre: 'Auditar el expediente',
    descripcion:
      'Consultar el expediente completo con su trazabilidad, para control interno y entes de control',
    recurso: 'expediente',
    columna: null,
  },
  {
    codigo: PERMISO_ACTA_INICIO_SUSCRIBIR,
    nombre: 'Suscribir acta de inicio',
    descripcion: 'Registrar la reunión de inicio y su acta, con lo que el contrato entra en ejecución',
    recurso: 'acta-inicio',
    columna: null,
  },
  {
    codigo: PERMISO_SEGUIMIENTO_CARGAR,
    nombre: 'Cargar seguimiento de ejecución',
    descripcion: 'Adjuntar informes, actas y soportes de la ejecución al expediente del contrato',
    recurso: 'seguimiento',
    columna: null,
  },
  {
    codigo: PERMISO_SEGUIMIENTO_VER,
    nombre: 'Consultar seguimiento de ejecución',
    descripcion: 'Ver el estado del contrato en ejecución, sus responsables y los soportes cargados',
    recurso: 'seguimiento',
    columna: null,
  },
  {
    codigo: PERMISO_SUPERVISION_REASIGNAR,
    nombre: 'Reasignar supervisión',
    descripcion: 'Relevar al supervisor vigente y designar otro durante la ejecución',
    recurso: 'supervision',
    columna: 'Asignar / Reasignar',
  },
  {
    codigo: PERMISO_MODIFICACION_SOLICITAR,
    nombre: 'Solicitar modificación contractual',
    descripcion: 'Pedir una prórroga u otra modificación del contrato, con su justificación',
    recurso: 'modificacion',
    columna: null,
  },
  {
    codigo: PERMISO_MODIFICACION_APROBAR,
    nombre: 'Aprobar modificación contractual',
    descripcion: 'Conceder o negar la modificación pedida, y revocarla',
    recurso: 'modificacion',
    columna: 'Aprobar',
  },
  {
    codigo: PERMISO_MODIFICACION_VER,
    nombre: 'Consultar modificaciones del contrato',
    descripcion: 'Ver qué se le ha modificado al contrato y en qué estado va cada trámite',
    recurso: 'modificacion',
    columna: null,
  },
  {
    codigo: PERMISO_INCUMPLIMIENTO_REPORTAR,
    nombre: 'Reportar presunto incumplimiento',
    descripcion: 'Dejar constancia de un presunto incumplimiento del contratista',
    recurso: 'incumplimiento',
    columna: null,
  },
  {
    codigo: PERMISO_INCUMPLIMIENTO_VER,
    nombre: 'Consultar presuntos incumplimientos',
    descripcion: 'Ver los casos reportados y el trámite que siguieron',
    recurso: 'incumplimiento',
    columna: null,
  },
  {
    codigo: PERMISO_INCUMPLIMIENTO_TRAMITAR,
    nombre: 'Tramitar el proceso sancionatorio',
    descripcion: 'Abrir el trámite, citar audiencias y registrar lo ocurrido en ellas',
    recurso: 'incumplimiento',
    columna: null,
  },
  {
    codigo: PERMISO_INCUMPLIMIENTO_DECIDIR,
    nombre: 'Decidir el proceso sancionatorio',
    descripcion: 'Archivar el caso, declarar el incumplimiento o la caducidad, y revocar lo resuelto',
    recurso: 'incumplimiento',
    columna: 'Aprobar',
  },
  {
    codigo: PERMISO_PRESUPUESTO_GESTIONAR,
    nombre: 'Mover el presupuesto de la entidad',
    descripcion: 'Expedir el CDP y el RP, tramitar los pagos avalados y cerrar financieramente',
    recurso: 'presupuesto',
    columna: null,
  },
  {
    codigo: PERMISO_DESIGNACION_ORDENAR,
    nombre: 'Designar comité y supervisor',
    descripcion: 'Nombrar al comité evaluador del proceso y al supervisor del contrato',
    recurso: 'designacion',
    columna: 'Asignar / Reasignar',
  },
  {
    codigo: PERMISO_ADJUDICACION_DECIDIR,
    nombre: 'Adjudicar el proceso',
    descripcion: 'Emitir el acto de adjudicación, que compromete a la entidad con un tercero',
    recurso: 'adjudicacion',
    columna: 'Aprobar',
  },
  {
    codigo: PERMISO_EVALUACION_REGISTRAR,
    nombre: 'Registrar la evaluación',
    descripcion: 'Consignar el resultado jurídico, técnico o financiero de las ofertas',
    recurso: 'evaluacion',
    columna: null,
  },
  {
    codigo: PERMISO_SUPERVISION_AVALAR,
    nombre: 'Avalar lo ejecutado',
    descripcion: 'Dar el visto bueno a la cuenta de cobro y suscribir el informe final',
    recurso: 'supervision',
    columna: 'Aprobar',
  },
  {
    codigo: PERMISO_EXPEDIENTE_ARCHIVAR,
    nombre: 'Archivar el expediente',
    descripcion: 'Archivar y reabrir el expediente, y registrar la publicación del acta de cierre',
    recurso: 'expediente',
    columna: 'Archivar',
  },
  {
    codigo: PERMISO_ALERTA_VER,
    nombre: 'Consultar alertas de vencimiento',
    descripcion: 'Ver los vencimientos próximos y cumplidos de pólizas, respaldo y liquidación',
    recurso: 'alerta',
    columna: null,
  },
  {
    codigo: PERMISO_REPORTE_VER,
    nombre: 'Generar informes',
    descripcion: 'Consultar informes, estadísticas e indicadores de la gestión contractual',
    recurso: 'reporte',
    columna: 'Generar informes',
  },
  {
    codigo: PERMISO_CONFIG_ADMINISTRAR,
    nombre: 'Configurar el módulo',
    descripcion:
      'Administrar la parametrización: actividades, umbrales, plazos, tipologías y formatos',
    recurso: 'config',
    columna: 'Configurar',
  },
];

// --------------------------------------------- los catorce del anexo --

/** De dónde sale la fila del rol en la matriz. */
export type OrigenDeLaFila =
  /** De los atributos que el formato le reconoce en el anexo. */
  | 'FORMATO'
  /** De las historias del módulo, que la fueron fijando actividad por actividad. */
  | 'MODULO';

/** Si quien ejerce el rol pertenece a la entidad o le es ajeno. */
export type Procedencia = 'INTERNA' | 'EXTERNA';

export interface RolDelCatalogo {
  codigo: string;
  /** Como lo nombra el formato, y como se sembró en `auth.role`. */
  nombre: string;
  descripcion: string;
  /** Quién lo ejerce en la ESAP, según la Hoja2 del formato. */
  quienLoEjerce: string;
  procedencia: Procedencia;
  origen: OrigenDeLaFila;
  /** Lo que el rol hace y la matriz todavía no puede mostrar. */
  nota?: string;
}

/**
 * Por qué varios roles se ven con menos casillas de las que su trabajo supone.
 *
 * Treinta y siete de los cuarenta y cinco controladores del módulo siguen
 * autorizando por nombre de rol y no por permiso: expedir el CDP, designar el
 * comité, adjudicar, avalar un pago o archivar el expediente no tienen código
 * en el catálogo, así que no pueden aparecer como columna. Pasarlos a permiso
 * es la subtarea EFDS-1709 y hasta entonces la matriz enseña lo que hay, sin
 * fingir que cubre todo lo que cada rol puede hacer.
 */
export const AUN_SE_AUTORIZA_POR_ROL =
  'Parte de lo que hace este rol todavía se autoriza por nombre de rol y no por permiso (EFDS-1709), así que no aparece en esta rejilla.';

/**
 * Los catorce roles del catálogo, en el orden de la Hoja2 del formato.
 *
 * Once ya estaban sembrados en `auth.role` porque alguna actividad los pidió;
 * los otros tres —estructurador técnico, apoyo a la supervisión y ente de
 * control— y el administrador del módulo los siembra la migración 060.
 *
 * `SUPER_ADMIN` **no está en la lista**: es transversal a la plataforma, no un
 * rol de Contratación, y sale aparte en `ROLES_TRANSVERSALES`.
 */
export const CATALOGO_ROLES: RolDelCatalogo[] = [
  {
    codigo: ROL_ESTRUCTURADOR_TECNICO,
    nombre: 'Estructurador Técnico',
    descripcion:
      'Estructura técnicamente el proceso: elabora el estudio previo, el anexo técnico, el estudio de mercado y el análisis del sector, y lo pasa a aprobación del jefe de área.',
    quienLoEjerce:
      'Enlaces de contratación de las áreas y jurídicos de las direcciones territoriales',
    procedencia: 'INTERNA',
    origen: 'FORMATO',
  },
  {
    codigo: ROL_ESTRUCTURADOR_FINANCIERO,
    nombre: 'Estructurador Financiero',
    descripcion:
      'Dirección Financiera: revisa el análisis del sector y el estudio de mercado, verifica la disponibilidad y expide el CDP y el RP.',
    quienLoEjerce: 'Roles designados por la Dirección Financiera',
    procedencia: 'INTERNA',
    origen: 'MODULO',
    nota: AUN_SE_AUTORIZA_POR_ROL,
  },
  {
    codigo: ROL_GESTOR_CONTRATACION,
    nombre: 'Gestor de Contratación',
    descripcion:
      'Adelanta el proceso: revisa los documentos y estudios previos, proyecta pliegos, minutas y actos administrativos, publica en SECOP y lleva el expediente.',
    quienLoEjerce: 'Abogados y profesionales de la Dirección de Contratación',
    procedencia: 'INTERNA',
    origen: 'MODULO',
    nota: AUN_SE_AUTORIZA_POR_ROL,
  },
  {
    codigo: ROL_REVISOR_CONTRATACION,
    nombre: 'Revisor de Contratación',
    descripcion:
      'Revisa y aprueba lo que el gestor elabora, y verifica las garantías antes de que amparen el contrato.',
    quienLoEjerce: 'Abogados de la Dirección de Contratación',
    procedencia: 'INTERNA',
    origen: 'MODULO',
  },
  {
    codigo: ROL_DIRECTOR_CONTRATACION,
    nombre: 'Director de Contratación',
    descripcion:
      'Responde por el proceso contractual de la entidad: aprueba, asigna, decide los trámites sancionatorios y administra la parametrización.',
    quienLoEjerce: 'Dirección de Contratación',
    procedencia: 'INTERNA',
    origen: 'MODULO',
    nota: AUN_SE_AUTORIZA_POR_ROL,
  },
  {
    codigo: ROL_EVALUADOR_FINANCIERO,
    nombre: 'Evaluador Financiero',
    descripcion:
      'Miembro del comité evaluador: verifica los indicadores y la capacidad financiera de las ofertas.',
    quienLoEjerce: 'Contratistas designados en el comité evaluador del proceso',
    procedencia: 'INTERNA',
    origen: 'MODULO',
    nota: AUN_SE_AUTORIZA_POR_ROL,
  },
  {
    codigo: ROL_EVALUADOR_TECNICO,
    nombre: 'Evaluador Técnico',
    descripcion:
      'Miembro del comité evaluador: verifica la experiencia y las condiciones técnicas de las ofertas.',
    quienLoEjerce: 'Contratistas designados en el comité evaluador del proceso',
    procedencia: 'INTERNA',
    origen: 'MODULO',
    nota: AUN_SE_AUTORIZA_POR_ROL,
  },
  {
    codigo: ROL_EVALUADOR_JURIDICO,
    nombre: 'Evaluador Jurídico',
    descripcion:
      'Miembro del comité evaluador: verifica los requisitos jurídicos habilitantes de las ofertas.',
    quienLoEjerce: 'Contratistas designados en el comité evaluador del proceso',
    procedencia: 'INTERNA',
    origen: 'MODULO',
    nota: AUN_SE_AUTORIZA_POR_ROL,
  },
  {
    codigo: ROL_ARCHIVO_GESTION_DC,
    nombre: 'Archivo de Gestión DC',
    descripcion:
      'Organiza y custodia los expedientes contractuales en su totalidad: publica el acta de liquidación y archiva el expediente al cierre.',
    quienLoEjerce: 'Personal del archivo de gestión de la Dirección de Contratación',
    procedencia: 'INTERNA',
    origen: 'MODULO',
    nota: AUN_SE_AUTORIZA_POR_ROL,
  },
  {
    codigo: ROL_ORDENADOR_GASTO,
    nombre: 'Ordenador del Gasto',
    descripcion:
      'Compromete a la entidad: designa el comité evaluador y el supervisor, adjudica, firma el contrato y concede las modificaciones.',
    quienLoEjerce: 'Ordenadores del gasto de la entidad',
    procedencia: 'INTERNA',
    origen: 'MODULO',
    nota: AUN_SE_AUTORIZA_POR_ROL,
  },
  {
    codigo: ROL_SUPERVISOR_CONTRATO,
    nombre: 'Supervisor de Contrato',
    descripcion:
      'Vigila y controla la ejecución de los contratos que le fueron asignados desde que lo designan, y solicita las modificaciones que hagan falta.',
    quienLoEjerce: 'Supervisores designados por acto administrativo',
    procedencia: 'INTERNA',
    origen: 'MODULO',
    nota: AUN_SE_AUTORIZA_POR_ROL,
  },
  {
    codigo: ROL_APOYO_SUPERVISION,
    nombre: 'Apoyo a la Supervisión',
    descripcion:
      'Genera informes, estadísticas, certificaciones e indicadores, y hace seguimiento a la supervisión. Su trabajo es enteramente de consulta.',
    quienLoEjerce: 'Personal administrativo y de apoyo de la Dirección de Contratación',
    procedencia: 'INTERNA',
    origen: 'FORMATO',
  },
  {
    codigo: ROL_ENTE_DE_CONTROL,
    nombre: 'Ente u Organismo de Control',
    descripcion:
      'Hace seguimiento y control a la compra pública. Entra por la auditoría del expediente y no por el expediente de trabajo.',
    quienLoEjerce: 'Organismos de control externos y Oficina de Control Interno',
    procedencia: 'EXTERNA',
    origen: 'FORMATO',
  },
  {
    codigo: ROL_ADMINISTRADOR_CONTRATACION,
    nombre: 'Administrador de Contratación',
    descripcion:
      'Administra la parametrización del módulo y consulta sus informes. No interviene en ningún proceso.',
    quienLoEjerce: 'OTIC y administradores funcionales del módulo',
    procedencia: 'INTERNA',
    origen: 'FORMATO',
  },
];

/**
 * Roles de la plataforma que otorgan todo lo del módulo sin estar en su
 * catálogo.
 *
 * `SUPER_ADMIN` aparece en cada entrada de `ROLES_QUE_OTORGAN`, así que no hace
 * falta una regla aparte para que lo pueda todo. Se declara para poder decirlo
 * en la pantalla y para que las pruebas lo cubran sin nombrarlo a mano.
 */
export const ROLES_TRANSVERSALES = [ROL_SUPER_ADMIN];

/**
 * Si la matriz ya la ratificó la Dirección de Contratación.
 *
 * Se deja explícito y en falso, como los umbrales de cuantía y los plazos de
 * publicidad: la historia la pide «a validar» y la pantalla tiene que decirlo
 * en vez de presentarla como definitiva.
 */
export const MATRIZ_CONFIRMADA = false;

// ------------------------------------------------------- el cruce ----

/** Los códigos del catálogo, en su orden, para no recorrer el arreglo. */
const ORDEN_DE_PERMISOS = CATALOGO_PERMISOS.map((p) => p.codigo);

/**
 * Qué puede hacer un rol.
 *
 * Se lee de `ROLES_QUE_OTORGAN` y se ordena como el catálogo, para que dos
 * llamadas devuelvan siempre la misma lista y la rejilla no baile.
 */
export function permisosDelRol(codigo: string): string[] {
  const rol = codigo.toUpperCase().trim();
  return ORDEN_DE_PERMISOS.filter((permiso) =>
    (ROLES_QUE_OTORGAN[permiso] ?? []).includes(rol),
  );
}

/**
 * Qué roles otorgan un permiso, en el orden del catálogo.
 *
 * Devuelve solo los del módulo: `SUPER_ADMIN` los otorga todos y listarlo en
 * las veintiocho filas no informa de nada.
 */
export function rolesQueOtorgan(permiso: string): string[] {
  const otorgan = ROLES_QUE_OTORGAN[permiso] ?? [];
  return CATALOGO_ROLES.map((r) => r.codigo).filter((codigo) => otorgan.includes(codigo));
}

/** El rol del catálogo con ese código, si es uno de los catorce. */
export function rolDelCatalogo(codigo: string): RolDelCatalogo | undefined {
  const buscado = codigo.toUpperCase().trim();
  return CATALOGO_ROLES.find((r) => r.codigo === buscado);
}

/** Si el código es uno de los catorce roles del módulo. */
export function esRolDeContratacion(codigo: string): boolean {
  return rolDelCatalogo(codigo) !== undefined;
}

/** Una fila de la matriz: el rol con lo que la rejilla le marca. */
export interface FilaDeLaMatriz extends RolDelCatalogo {
  permisos: string[];
}

export interface MatrizDeRoles {
  /** Si la Dirección de Contratación ya la ratificó. */
  confirmada: boolean;
  /** Las columnas, en el orden en que se leen. */
  permisos: PermisoDelCatalogo[];
  /** Las filas, en el orden del formato. */
  roles: FilaDeLaMatriz[];
  /** Los que lo otorgan todo sin ser del módulo. */
  transversales: string[];
}

/**
 * La matriz completa, lista para consultarse o dibujarse.
 *
 * Se arma en cada llamada y no se guarda en una constante: son catorce filas
 * por veintiocho columnas, cuesta nada, y una constante congelada al importar
 * el módulo sería un sitio más donde la matriz podría quedar desfasada.
 */
export function matrizDeRoles(): MatrizDeRoles {
  return {
    confirmada: MATRIZ_CONFIRMADA,
    permisos: CATALOGO_PERMISOS,
    roles: CATALOGO_ROLES.map((rol) => ({ ...rol, permisos: permisosDelRol(rol.codigo) })),
    transversales: ROLES_TRANSVERSALES,
  };
}

/** Lo que la pantalla necesita saber de quien la está mirando. */
export interface LoQuePuedeHacer {
  /** Sus roles, normalizados a códigos en mayúsculas. */
  roles: string[];
  /** Los del catálogo del módulo, con su nombre. */
  rolesDeContratacion: RolDelCatalogo[];
  /** Todos sus permisos sobre el módulo. */
  permisos: string[];
}

/**
 * Qué puede hacer quien pregunta.
 *
 * Es lo que le permite al microfrontend esconder lo que el usuario no va a
 * poder hacer, en vez de ofrecérselo y responderle 403 al pulsarlo. Sale de
 * `permisosDelUsuario`, que es la misma función que evalúa el guard: la
 * pantalla no puede prometer algo que el backend luego niegue.
 */
export function loQuePuedeHacer(user: unknown): LoQuePuedeHacer {
  const roles = normalizeRoles((user as any)?.roles ?? (user as any)?.role);
  return {
    roles,
    rolesDeContratacion: roles
      .map((codigo) => rolDelCatalogo(codigo))
      .filter((rol): rol is RolDelCatalogo => rol !== undefined),
    permisos: permisosDelUsuario(user),
  };
}
