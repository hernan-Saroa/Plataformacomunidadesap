import { DataSource } from 'typeorm';

const text = (value: unknown) => String(value ?? '').trim();
const humanName = (value: unknown): string | null => {
  const name = text(value).replace(/\s+/g, ' ');
  return name && /^[\p{L}\p{M} .’'-]+$/u.test(name) && !/^[a-f0-9]{24,}$/i.test(name) ? name : null;
};

export function rundActorFallback(actor: unknown): string {
  const key = text(actor);
  if (/^(SISTEMA|SYSTEM)$/i.test(key)) return 'Sistema';
  if (/^AUTOGESTION:/i.test(key)) return 'Docente (autogestión)';
  // Algunos registros antiguos guardaron el nombre completo en vez de una referencia.
  return /\s/.test(key) ? humanName(key) || 'Usuario no disponible' : 'Usuario no disponible';
}

/** Resuelve una sola vez los autores de toda la respuesta, sin modificar sus referencias de auditoría. */
export async function resolveRundActorNames(db: Pick<DataSource, 'query'>, actors: unknown[]): Promise<Map<string, string>> {
  const keys = [...new Set(actors.map(text).filter(Boolean))];
  const names = new Map(keys.map(key => [key, rundActorFallback(key)]));
  const references = keys.filter(key => !/^(SISTEMA|SYSTEM)$/i.test(key));
  if (!references.length) return names;
  try {
    const rows = await db.query(`
      WITH actors AS (SELECT unnest($1::text[]) AS actor_id)
      SELECT a.actor_id,
             COALESCE(identity.nombre, NULLIF(BTRIM(i.borrador_json->>'nombreCompleto'), '')) AS nombre
      FROM actors a
      LEFT JOIN rund."BancoDocentesInvitaciones" i
        ON a.actor_id = 'AUTOGESTION:' || i.id::text
      LEFT JOIN LATERAL (
        SELECT COALESCE(NULLIF(BTRIM(p.nom_largo), ''),
                        NULLIF(BTRIM(CONCAT_WS(' ', NULLIF(BTRIM(p.nom_tercero), ''),
                          NULLIF(BTRIM(p.pri_apellido), ''), NULLIF(BTRIM(p.seg_apellido), ''))), '')) AS nombre
        FROM auth.personas p
        LEFT JOIN auth."user" u ON u.id_person = p.id_person
        WHERE u.id_user::text = a.actor_id OR p.id_person::text = a.actor_id
           OR LOWER(u.username) = LOWER(a.actor_id) OR LOWER(p.dir_email) = LOWER(a.actor_id)
           OR (i.correo_institucional IS NOT NULL AND
               (LOWER(u.username) = LOWER(i.correo_institucional) OR LOWER(p.dir_email) = LOWER(i.correo_institucional)))
        ORDER BY CASE WHEN u.id_user::text = a.actor_id THEN 0
                      WHEN p.id_person::text = a.actor_id THEN 1
                      WHEN LOWER(u.username) = LOWER(a.actor_id) THEN 2 ELSE 3 END, p.id_person
        LIMIT 1
      ) identity ON TRUE`, [references]);
    for (const row of rows || []) {
      const name = humanName(row.nombre);
      if (names.has(row.actor_id) && name) names.set(row.actor_id, name);
    }
  } catch {
    // Una identidad eliminada o un directorio temporalmente no disponible no oculta el historial.
  }
  return names;
}

export function rundActorName(names: Map<string, string>, actor: unknown): string {
  return names.get(text(actor)) || rundActorFallback(actor);
}
