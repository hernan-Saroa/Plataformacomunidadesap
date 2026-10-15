// SELECT anterior del contexto OCR. Solo lo usa el clúster ficticio de integración.
module.exports = async (database, docenteId) => (await database.query(`
  SELECT d.*,p.nom_largo,p.num_identificacion,p.tip_identificacion,p.gen_tercero,p.fec_nacimiento
  FROM rund."Docente" d JOIN auth.personas p ON p.id_person::text=d."personaId"::text
  WHERE d.id::text=$1`, [docenteId])).rows[0] || null;
