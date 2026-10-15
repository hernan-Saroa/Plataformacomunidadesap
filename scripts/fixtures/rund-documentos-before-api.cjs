// SQL congelado del expediente y la validación de filas anterior a las APIs.
exports.resolver = async (db, identifier) => (await db.query(`SELECT d.id,
  COALESCE(p.num_identificacion,d.id::text) AS document_number FROM rund."Docente" d
  LEFT JOIN auth.personas p ON p.id_person=d."personaId"
  WHERE d.id::text=$1 OR d."personaId"::text=$1 OR p.num_identificacion=$1
  ORDER BY d."updatedAt" DESC NULLS LAST LIMIT 1`, [identifier])).rows[0] || null;
exports.evidence = async (db, id) => (await db.query(`SELECT d.*,p.num_identificacion,p.nom_largo,p.gen_tercero,p.fec_nacimiento
  FROM rund."Docente" d LEFT JOIN auth.personas p ON p.id_person=d."personaId" WHERE d.id::text=$1`, [id])).rows[0] || null;
