/* Referencia de las dos consultas anteriores. Solo se usa con PostgreSQL ficticio. */
module.exports = {
  async unicidad(db, documentNumber, correoInstitucional, excludeDocenteId) {
    const conditions = [], params = [];
    if (documentNumber) {
      params.push(documentNumber);
      conditions.push(`UPPER(regexp_replace(BTRIM(p.num_identificacion::text),'\\.','','g'))
        = UPPER(regexp_replace(BTRIM($${params.length}::text),'\\.','','g'))`);
    }
    if (correoInstitucional) { params.push(correoInstitucional.toLowerCase()); conditions.push(`d."correoInstitucional"=$${params.length}`); }
    if (!conditions.length) return [];
    let sql = `SELECT d.id,d.estado,p.num_identificacion AS documento,d."correoInstitucional" AS correo,p.nom_largo AS nombre
      FROM rund."Docente" d JOIN auth.personas p ON p.id_person=d."personaId"
      WHERE d.estado='ACTIVO' AND (${conditions.join(' OR ')})`;
    if (excludeDocenteId) { params.push(excludeDocenteId); sql += ` AND d.id!=$${params.length}`; }
    return (await db.query(sql, params)).rows;
  },
  async nombreFecha(db, nombreCompleto, fechaNacimiento) {
    if (!nombreCompleto || !fechaNacimiento) return [];
    return (await db.query(`SELECT d.id,p.num_identificacion AS documento,d."correoInstitucional" AS correo,
      p.nom_largo AS nombre_completo,p.fec_nacimiento AS fecha_nacimiento
      FROM rund."Docente" d JOIN auth.personas p ON p.id_person=d."personaId" WHERE d.estado='ACTIVO'
        AND UPPER(TRIM(p.nom_largo))=$1 AND p.fec_nacimiento::date=$2::date`,
    [nombreCompleto.toUpperCase().trim(), new Date(fechaNacimiento).toISOString().split('T')[0]])).rows;
  },
};
