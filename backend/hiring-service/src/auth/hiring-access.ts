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
