/**
 * Quién puede hacer el seguimiento de una tarea del Plan Anual (EFDS-2322).
 *
 * Todos ven las tareas de todos los roles, pero completar, cambiar la fecha de
 * seguimiento, observar y subir o quitar evidencias solo lo hace el responsable de la
 * tarea. Si no tiene responsable propio, responden los del rol y de la actividad (lo que
 * la pantalla marca como "ROL"). Es la misma regla que aplica el backend.
 *
 * Los responsables se guardan de varias formas (id de persona, correo o solo el nombre
 * cuando se asignaron a mano), así que se comparan las tres.
 */

export interface ActorTarea {
  idPerson?: string | null;
  id?: string | null;
  email?: string | null;
  username?: string | null;
  nombre?: string | null;
}

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
  const ids = [actor.idPerson, actor.id].map(normalizarId).filter(Boolean);
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
    return !!nombre && (rNombre === nombre || rIds.includes(nombre));
  });
}

/** Responsables que mandan sobre la tarea: los propios o, si no tiene, los del rol y la actividad. */
export function responsablesQueMandan(
  tarea: { responsables?: unknown } | null | undefined,
  rol?: { responsables?: unknown } | null,
  actividad?: { responsables?: unknown; responsable?: unknown; responsablesApoyo?: unknown } | null,
): unknown[] {
  const propios = Array.isArray(tarea?.responsables) ? (tarea!.responsables as unknown[]).filter(Boolean) : [];
  if (propios.length) return propios;
  const delRol = Array.isArray(rol?.responsables) ? (rol!.responsables as unknown[]) : [];
  const deLaActividad = Array.isArray(actividad?.responsables) ? (actividad!.responsables as unknown[]) : [];
  const apoyo = Array.isArray(actividad?.responsablesApoyo) ? (actividad!.responsablesApoyo as unknown[]) : [];
  const principal = actividad?.responsable ? [actividad.responsable] : [];
  return [...delRol, ...deLaActividad, ...apoyo, ...principal];
}

export function nombresDeResponsables(responsables: unknown[]): string {
  const nombres = responsables
    .map((r: any) => (typeof r === 'string' ? r : r?.nombre || r?.name || r?.email || ''))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return Array.from(new Set(nombres)).join(', ');
}

/** Lo que el front sabe del usuario de la sesión (`window.__esap_auth_cache` normalizado). */
export function actorDeSesion(usuario: any): ActorTarea | null {
  if (!usuario) return null;
  return {
    idPerson: usuario.idPerson || usuario.id_person || usuario.person?.id || null,
    id: usuario.id || usuario.id_user || usuario.userId || null,
    email: usuario.email || usuario.person?.email || null,
    username: usuario.username || null,
    nombre: usuario.nombre || usuario.nombre_completo || usuario.fullName || usuario.name || null,
  };
}
