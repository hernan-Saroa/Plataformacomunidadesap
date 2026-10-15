// Referencia del SELECT previo; solo para el clúster ficticio de integración.
module.exports = async (database, dias) => (await database.query(`
  SELECT sc.*, d."correoInstitucional", p.nom_largo AS nombre_docente
  FROM rund."RundSoporteCampo" sc
  JOIN rund."Docente" d ON d.id=sc.docente_id::text
  JOIN auth.personas p ON p.id_person=d."personaId"
  WHERE sc.fecha_vencimiento IS NOT NULL AND sc.estado != 'Rechazado'
    AND sc.fecha_vencimiento <= (NOW() + $1::interval)
  ORDER BY sc.fecha_vencimiento ASC`, [`${dias} days`])).rows;
