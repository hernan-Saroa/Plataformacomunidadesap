/**
 * Lógica pura del selector de Responsable del Indicador (Plan de Acción).
 * Vive fuera del componente para poder probarla de forma aislada.
 */

export interface ResponsableOpcion {
  /** Id del usuario tal como lo expone auth-service al navegador (su public_id, UUID). */
  id: string;
  nombreCompleto: string;
  email: string;
  documento: string;
  cargo: string;
  dependencia: string;
  /** Códigos de rol; se usan como respaldo cuando no hay cargo. */
  roles: string[];
}

/** Roles del proceso Gestión Legal que pueden ser responsables de un indicador. */
export const ROLES_PROCESO_LEGAL = [
  'JEFE_GESTION_LEGAL',
  'RESUELVE_GESTION_LEGAL',
  'SECRETARIADO_GESTION_LEGAL',
  'MONITOREO_GESTION_LEGAL',
];

const normalizar = (texto: string | null | undefined): string =>
  (texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

const NOMBRES_ROL: Record<string, string> = {
  JEFE_GESTION_LEGAL: 'Jefe de Gestión Legal',
  RESUELVE_GESTION_LEGAL: 'Resuelve Gestión Legal',
  SECRETARIADO_GESTION_LEGAL: 'Secretariado Gestión Legal',
  MONITOREO_GESTION_LEGAL: 'Monitoreo Gestión Legal',
};

/**
 * Convierte un registro de `/auth/api/v1/users` en opción del selector.
 * Devuelve null si el usuario está inactivo, no tiene id o no pertenece al proceso legal.
 */
export const mapearResponsable = (u: any): ResponsableOpcion | null => {
  const id = u?.user?.id_user ?? u?.id_user ?? null;
  if (!id) return null;
  const activo = u?.user?.is_active ?? u?.is_active ?? true;
  if (activo === false) return null;

  const roles: string[] = (u?.user?.roles ?? u?.roles ?? [])
    .map((r: any) => String(r?.code ?? '').toUpperCase())
    .filter(Boolean);
  if (!roles.some(r => ROLES_PROCESO_LEGAL.includes(r))) return null;

  const nombreCompleto = (u.full_name ?? `${u.first_name ?? ''} ${u.last_name ?? ''}`).trim();
  if (!nombreCompleto) return null;

  return {
    id: String(id),
    nombreCompleto,
    email: u.email ?? '',
    documento: u.identification_number ?? '',
    cargo: u.cargo?.nomCargo ?? '',
    dependencia: u.dependencia?.nomDependencia ?? '',
    roles,
  };
};

export const mapearResponsables = (usuarios: any[]): ResponsableOpcion[] =>
  (Array.isArray(usuarios) ? usuarios : [])
    .map(mapearResponsable)
    .filter((r): r is ResponsableOpcion => r !== null)
    .sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto, 'es'));

/** Cargo; si no existe, el nombre del primer rol legal. */
export const cargoORol = (r: ResponsableOpcion): string =>
  r.cargo || NOMBRES_ROL[r.roles.find(x => NOMBRES_ROL[x]) ?? ''] || '';

/** Segunda línea de la opción: "cargo/rol · dependencia". */
export const detalleOpcion = (r: ResponsableOpcion): string =>
  [cargoORol(r), r.dependencia].filter(Boolean).join(' · ');

/** Búsqueda por nombre, número de documento o correo institucional (sin tildes ni mayúsculas). */
export const filtrarResponsables = (opciones: ResponsableOpcion[], busqueda: string): ResponsableOpcion[] => {
  const q = normalizar(busqueda);
  if (!q) return opciones;
  return opciones.filter(r =>
    normalizar(r.nombreCompleto).includes(q) ||
    normalizar(r.documento).includes(q) ||
    normalizar(r.email).includes(q),
  );
};

export type EstadoResponsable =
  /** Responsable vigente: su id está entre los usuarios activos del proceso. */
  | 'VIGENTE'
  /** Tiene id pero ya no está activo / no pertenece al proceso. */
  | 'INACTIVO'
  /** Solo tiene nombre en texto libre (dato histórico). */
  | 'SIN_REFERENCIA'
  | 'SIN_ASIGNAR';

export const SIN_ASIGNAR = 'Sin Asignar';

/**
 * Estado del responsable de un indicador frente a los usuarios activos del proceso.
 * `activos = null` significa que la lista aún no cargó: no se marca nada para no dar falsos positivos.
 */
export const estadoResponsable = (
  ind: { responsableId?: string | null; responsable?: string | null },
  activos: ResponsableOpcion[] | null,
): EstadoResponsable => {
  if (ind.responsableId) {
    if (activos === null) return 'VIGENTE';
    return activos.some(a => a.id === ind.responsableId) ? 'VIGENTE' : 'INACTIVO';
  }
  const nombre = (ind.responsable ?? '').trim();
  return !nombre || nombre === SIN_ASIGNAR ? 'SIN_ASIGNAR' : 'SIN_REFERENCIA';
};

export const requiereReasignacion = (
  ind: { responsableId?: string | null; responsable?: string | null },
  activos: ResponsableOpcion[] | null,
): boolean => {
  if (activos === null) return false;
  return estadoResponsable(ind, activos) !== 'VIGENTE';
};

/**
 * Responsable precargado al editar: por id; si el indicador solo trae nombre libre,
 * se sugiere el usuario cuyo nombre coincide exactamente (el usuario debe guardar para fijar la referencia).
 */
export const resolverResponsableActual = (
  ind: { responsableId?: string | null; responsable?: string | null },
  activos: ResponsableOpcion[],
): ResponsableOpcion | null => {
  if (ind.responsableId) return activos.find(a => a.id === ind.responsableId) ?? null;
  const nombre = normalizar(ind.responsable);
  if (!nombre || nombre === normalizar(SIN_ASIGNAR)) return null;
  const coincidencias = activos.filter(a => normalizar(a.nombreCompleto) === nombre);
  return coincidencias.length === 1 ? coincidencias[0] : null;
};

export const MENSAJE_SIN_RESPONSABLES = 'No hay usuarios activos del proceso Gestión Legal que coincidan con la búsqueda';
export const MENSAJE_RESPONSABLE_OBLIGATORIO = 'Debe seleccionar un responsable de la lista';
