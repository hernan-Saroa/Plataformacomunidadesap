export interface PersonaDocente {
  nombreCompleto: string | null;
  documento: string | null;
}

/**
 * El perfil RUND guarda a la persona del docente en `auth.personas` (`Docente.personaId` = `id_person`).
 * El Macro Docente leía solo la tabla antigua `academic_work_plan."Persona"`, donde ya no existen esos docentes,
 * y mostraba nombre y documento vacíos en todas las filas. Se resuelven aquí en una sola consulta por lote.
 */
export async function cargarPersonasDocentes(
  db: { query: (sql: string, params?: any[]) => Promise<any[]> } | undefined,
  personaIds: string[],
): Promise<Map<string, PersonaDocente>> {
  const found = new Map<string, PersonaDocente>();
  const ids = [...new Set(personaIds.map((id) => String(id ?? '').trim()).filter(Boolean))];
  if (!db || ids.length === 0) return found;
  const rows = await db.query(
    `SELECT p.id_person::text AS id,
            COALESCE(NULLIF(BTRIM(p.nom_largo), ''),
                     NULLIF(BTRIM(CONCAT_WS(' ', NULLIF(BTRIM(p.nom_tercero), ''), NULLIF(BTRIM(p.pri_apellido), ''),
                                            NULLIF(BTRIM(p.seg_apellido), ''))), '')) AS nombre,
            NULLIF(BTRIM(p.num_identificacion::text), '') AS documento
       FROM auth.personas p
      WHERE p.id_person::text = ANY($1::text[])`,
    [ids],
  );
  for (const row of rows) {
    found.set(String(row.id), { nombreCompleto: row.nombre ?? null, documento: row.documento ?? null });
  }
  return found;
}
