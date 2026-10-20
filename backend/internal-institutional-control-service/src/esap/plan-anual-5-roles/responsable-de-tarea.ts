/**
 * Quién puede hacer el seguimiento de una tarea del Plan Anual (EFDS-2322).
 *
 * Todos los auditores ven las tareas de todos los roles, pero completar, poner la fecha
 * de seguimiento, observar y adjuntar o quitar evidencias de una tarea solo lo hace su
 * responsable. Si la tarea no tiene responsable propio, responden los responsables del
 * rol y de la actividad (lo mismo que muestra la pantalla con la marca "ROL").
 *
 * Los responsables se guardan de varias formas (id de persona, correo o solo el nombre
 * cuando se asignaron a mano), así que se comparan las tres.
 */

export interface ActorTarea {
  idPerson?: string | null;
  userId?: string | null;
  email?: string | null;
  username?: string | null;
  nombre?: string | null;
}

/** Campos que solo cambia quien hace el seguimiento de la tarea. */
export const CAMPOS_SEGUIMIENTO_TAREA = [
  'completada',
  'fechaCompletada',
  'completadaPor',
  'observaciones',
  'adjuntosTarea',
  'fechaLimite',
  'fechaEntrega',
  'evaluada',
  'fechaEvaluacion',
] as const;

export function normalizarNombre(valor: unknown): string {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizarId(valor: unknown): string {
  return String(valor ?? '').trim().toLowerCase();
}

/** `true` si el actor es uno de los responsables (por id, correo o nombre). */
export function actorEsResponsable(responsables: unknown, actor: ActorTarea): boolean {
  const lista = Array.isArray(responsables) ? responsables : [];
  const ids = [actor.idPerson, actor.userId].map(normalizarId).filter(Boolean);
  const correos = [actor.email, actor.username].map(normalizarId).filter((c) => c.includes('@'));
  const nombre = normalizarNombre(actor.nombre);
  return lista.some((r: any) => {
    if (r == null) return false;
    if (typeof r === 'string') {
      const s = r.trim();
      if (!s) return false;
      const sId = normalizarId(s);
      return ids.includes(sId) || correos.includes(sId) || (!!nombre && normalizarNombre(s) === nombre);
    }
    const rIds = [r.id, r.idPerson, r.id_person, r.idTercero, r.id_tercero].map(normalizarId).filter(Boolean);
    if (rIds.some((x) => ids.includes(x))) return true;
    const rCorreos = [r.email, r.correo, r.dir_email].map(normalizarId).filter(Boolean);
    if (rCorreos.some((x) => correos.includes(x))) return true;
    const rNombre = normalizarNombre(r.nombre || r.name || r.nom_largo);
    // Un responsable guardado solo por nombre ({ id: nombre, nombre }) también se compara por nombre
    return !!nombre && (rNombre === nombre || rIds.includes(nombre));
  });
}

function valorComparable(valor: unknown): string {
  if (valor === undefined || valor === null || valor === '') return '';
  if (typeof valor === 'boolean') return valor ? '1' : '';
  if (Array.isArray(valor)) {
    // Evidencias: cuenta lo guardado en el servidor (los adjuntos sin id aún no se han subido)
    return JSON.stringify(valor.map((a: any) => (a && typeof a === 'object' ? a.id || a.url || a.nombre : a)).filter(Boolean).sort());
  }
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}/.test(valor)) return valor.slice(0, 10);
  return String(valor);
}

export interface CambioDeSeguimiento {
  anterior: Record<string, any>;
  nueva: Record<string, any>;
  campos: string[];
}

/** Tareas que ya existían y a las que la nueva lista les cambia algún campo de seguimiento. */
export function tareasConSeguimientoCambiado(anteriores: unknown, nuevas: unknown): CambioDeSeguimiento[] {
  const previas = new Map<string, Record<string, any>>();
  for (const t of Array.isArray(anteriores) ? anteriores : []) {
    if (t && typeof t === 'object' && (t as any).id != null) previas.set(String((t as any).id), t as Record<string, any>);
  }
  const cambios: CambioDeSeguimiento[] = [];
  for (const t of Array.isArray(nuevas) ? nuevas : []) {
    if (!t || typeof t !== 'object' || (t as any).id == null) continue;
    const anterior = previas.get(String((t as any).id));
    if (!anterior) continue;
    const campos = CAMPOS_SEGUIMIENTO_TAREA.filter((c) => valorComparable((t as any)[c]) !== valorComparable(anterior[c]));
    if (campos.length) cambios.push({ anterior, nueva: t as Record<string, any>, campos });
  }
  return cambios;
}

/** Responsables que mandan sobre la tarea: los propios o, si no tiene, los del rol y la actividad. */
export function responsablesQueMandan(
  tarea: Record<string, any>,
  rol?: { responsables?: unknown } | null,
  actividad?: { responsables?: unknown; responsable?: unknown; responsable_id?: unknown } | null,
): unknown[] {
  const propios = Array.isArray(tarea?.responsables) ? tarea.responsables.filter(Boolean) : [];
  if (propios.length) return propios;
  const delRol = Array.isArray(rol?.responsables) ? rol!.responsables : [];
  const deLaActividad = Array.isArray(actividad?.responsables) ? actividad!.responsables : [];
  const principal: unknown[] = [];
  if (actividad?.responsable_id) principal.push({ id: actividad.responsable_id, nombre: actividad.responsable });
  else if (actividad?.responsable) principal.push(actividad.responsable);
  return [...(delRol as unknown[]), ...(deLaActividad as unknown[]), ...principal];
}

export function nombresDeResponsables(responsables: unknown[]): string {
  const nombres = responsables
    .map((r: any) => (typeof r === 'string' ? r : r?.nombre || r?.name || r?.email || ''))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return Array.from(new Set(nombres)).join(', ');
}
