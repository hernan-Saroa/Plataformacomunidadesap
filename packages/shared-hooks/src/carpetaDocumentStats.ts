/** Los borradores y las filas del panel de requisitos no son archivos confirmados por su propietario. */
export function carpetaDocumentStats(documents: any[]) {
  const result = { total: 0, validados: 0, pendientes: 0, rechazados: 0, vencidos: 0 };
  const seen = new Set<string>();
  for (const doc of documents) {
    const owner = doc?.servicio_propietario;
    if (!['auth','pta','rund'].includes(owner) || typeof doc.id !== 'string' || !doc.id
      || doc.pendiente_de_guardar || doc.persistido === false || doc.id.startsWith('local-documento:')) continue;
    const identity = `${owner}:${doc.id}`;
    if (seen.has(identity)) continue;
    seen.add(identity); result.total++;
    if (doc.estado === 'validado') result.validados++;
    else if (doc.estado === 'rechazado') result.rechazados++;
    else if (doc.estado === 'vencido') result.vencidos++;
    else result.pendientes++;
  }
  return result;
}
