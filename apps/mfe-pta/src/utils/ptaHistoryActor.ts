/** Nombre visible del autor; los identificadores se conservan únicamente en los datos. */
export function getPtaHistoryActorName(history: any, pta: any, docenteNombre?: string, docentePersonId?: string): string {
  const actorId = String(history?.actorId || history?.actor_id || '').trim();
  const readable = (value: unknown): string => {
    if (typeof value !== 'string') return '';
    const text = value.trim();
    if (!text || text === actorId || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text)
      || /^\d+$/.test(text) || /^[^\s@]+@[^\s@]+$/.test(text)) return '';
    return text;
  };
  const namedActor = readable(history?.actorNombre) || readable(history?.actor_nombre);
  if (namedActor) return namedActor;
  const role = String(history?.actorRol || history?.actor_rol || '').trim();
  if (['sistema', 'system'].includes(actorId.toLowerCase())) return 'Sistema';
  const ownerIds = [pta?.docente_id, pta?.docenteId, pta?.persona_id, pta?.personaId, pta?.usuario_id, docentePersonId]
    .filter(Boolean).map(String);
  if ((actorId && ownerIds.includes(actorId)) || (!actorId && !history?.actor && role.toLowerCase() === 'docente')) {
    return readable(docenteNombre) || readable(pta?.docente_nombre) || readable(pta?.docenteNombre) || 'Docente';
  }
  // Algunas respuestas legacy incluyen el nombre directamente en `actor`.
  const legacyName = readable(history?.actor);
  if (legacyName && /\s/.test(legacyName)) return legacyName;
  return 'Nombre no disponible';
}

/** Autor y rol del movimiento, sin repetir el rol cuando sustituye al nombre. */
export function getPtaHistoryActorLabel(history: any, pta: any, docenteNombre?: string, docentePersonId?: string): string {
  const name = getPtaHistoryActorName(history, pta, docenteNombre, docentePersonId);
  const rawRole = String(history?.actorRol || history?.actor_rol || '').trim();
  const isIdentifier = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawRole)
    || /^\d+$/.test(rawRole) || /^[^\s@]+@[^\s@]+$/.test(rawRole);
  const roleNames: Record<string, string> = {
    SUPER_ADMIN: 'Administrador del sistema', ADMIN: 'Administrador',
    DOCENTE: 'Docente', REVISOR: 'Revisor', APROBADOR: 'Aprobador', SISTEMA: 'Sistema', SYSTEM: 'Sistema',
  };
  const role = isIdentifier ? '' : rawRole.split(',').map(value => {
    const code = value.trim();
    return roleNames[code.toUpperCase()] || code.replace(/_/g, ' ');
  }).filter(Boolean).join(', ');
  if (name === 'Nombre no disponible') return role || 'Autor no registrado';
  return role && name.toLocaleLowerCase() !== role.toLocaleLowerCase() ? `${name} — ${role}` : name;
}
