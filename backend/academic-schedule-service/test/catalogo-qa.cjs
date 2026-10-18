// Fixtures de catálogo para las pruebas de agregado de Programación Académica.
//
// Las pruebas NO deben depender de lo que alguien haya cargado en la base local: tras el
// reinicio de la base (programas, asignaturas y ofertas en cero) un `SELECT ... LIMIT 1` sobre
// el catálogo no devuelve nada, y un `id_asignatura = 2` fijo rompe la clave foránea.
//
// Todo se crea DENTRO de la transacción de cada prueba (BEGIN ... ROLLBACK), con códigos únicos
// `QA-*`: nada de lo que se inserta aquí sale de la prueba, y dos pruebas en paralelo no se ven.

let contador = 0;
const unico = () => `${Date.now().toString(36)}${(contador++).toString(36)}`.toUpperCase();

// programa.tipo: pregrado | tecnico_profesional | tecnologico | especializacion | maestria | doctorado
const FACULTAD = { pregrado: 1, especializacion: 2, maestria: 3 };

/**
 * Crea un programa y una asignatura suyos. Devuelve ids como texto.
 * @param {import('pg').Client} client
 * @param {{ tipo?: string, semestre?: number, creditos?: number, horasClase?: number, horasPta?: number,
 *           tipoExcepcion?: string, horasFijas?: number, codigo?: string, idPrograma?: string, idNucleo?: string }} [op]
 */
async function crearAsignatura(client, op = {}) {
  const tipo = op.tipo ?? 'pregrado';
  const u = unico();
  const idFacultad = FACULTAD[tipo] ?? 1;
  // Con `idPrograma` (y `idNucleo`) la asignatura se suma a un programa ya creado.
  const programa = op.idPrograma ? { rows: [{ id: op.idPrograma, codigo: op.codigoPrograma ?? null }] } : await client.query(
    `INSERT INTO academic_work_plan.programa (codigo, nombre, nombre_excel, nombre_corto, id_facultad, tipo, modalidad)
     VALUES ($1, $2, $2, $3, $4, $5, 'presencial') RETURNING id::text AS id, codigo`,
    [`QA-PRO-${u}`, `Programa QA ${u}`, `QA-${u}`.slice(0, 30), idFacultad, tipo]);
  const nucleo = op.idNucleo ? { rows: [{ id: op.idNucleo }] } : await client.query(
    `INSERT INTO academic_work_plan.nucleo_tematico (codigo, nombre) VALUES ($1, $2) RETURNING id::text AS id`,
    [`QA-NT-${u}`, `Núcleo QA ${u}`]);
  const codigoAsignatura = op.codigo ?? `QA-ASIG-${u}`;
  const asignatura = await client.query(
    `INSERT INTO academic_work_plan.asignatura
       (codigo, nombre, creditos, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, horas_clase, horas_pta,
        tipo_excepcion, horas_fijas_pta)
     VALUES ($1, $2, $3, $4, $5::bigint, $6::bigint, $7, $8, $9, $10, $11) RETURNING id::text AS id`,
    [codigoAsignatura, `Asignatura QA ${u}`, op.creditos ?? 4, op.semestre ?? 1,
      programa.rows[0].id, nucleo.rows[0].id, idFacultad, op.horasClase ?? 64, op.horasPta ?? op.horasClase ?? 64,
      op.tipoExcepcion ?? null, op.horasFijas ?? null]);
  return {
    idAsignatura: asignatura.rows[0].id,
    codigoAsignatura,
    idPrograma: programa.rows[0].id,
    codigoPrograma: programa.rows[0].codigo,
    idNucleo: nucleo.rows[0].id,
  };
}

/**
 * Crea un periodo de plataforma (`periodo_academico`).
 * @returns {Promise<{ idPeriodo: string, codigo: string }>}
 */
async function crearPeriodo(client, op = {}) {
  const anio = op.anio ?? 2098;
  const semestre = op.semestre ?? 1;
  const codigo = op.codigo ?? `${anio}-${semestre}`;
  const r = await client.query(
    `INSERT INTO academic_work_plan.periodo_academico (codigo, anio, semestre, fecha_inicio, fecha_fin, estado)
     VALUES ($1, $2, $3, $4::date, $5::date, $6) RETURNING id::text AS id`,
    [codigo, anio, semestre, op.inicio ?? `${anio}-02-01`, op.fin ?? `${anio}-06-15`, op.estado ?? 'planeacion']);
  return { idPeriodo: r.rows[0].id, codigo };
}

/**
 * Crea la oferta CETAP (programa + CETAP + periodo). Una por trío.
 * @returns {Promise<{ idOferta: string, idCetap: string, codigoCetap: string }>}
 */
async function crearOferta(client, { idPrograma, idPeriodo, codigoCetap = 'CET-0135', activa = true }) {
  const cetap = await client.query(`SELECT id::text AS id FROM academic_work_plan.cetap WHERE codigo = $1`, [codigoCetap]);
  if (!cetap.rows.length) throw new Error(`El CETAP ${codigoCetap} no existe en la base de pruebas.`);
  const r = await client.query(
    `INSERT INTO academic_work_plan.oferta_cetap_programa (id_cetap, id_programa, id_periodo_academico, activa)
     VALUES ($1::bigint, $2::bigint, $3::bigint, $4) RETURNING id::text AS id`,
    [cetap.rows[0].id, idPrograma, idPeriodo, activa]);
  return { idOferta: r.rows[0].id, idCetap: cetap.rows[0].id, codigoCetap };
}

/**
 * Atajo: periodo + asignatura + oferta en un CETAP. Para pruebas de grupos y aulas.
 */
async function crearEscenarioDeOferta(client, op = {}) {
  const asig = await crearAsignatura(client, op.asignatura);
  const periodo = await crearPeriodo(client, op.periodo);
  const oferta = await crearOferta(client, { idPrograma: asig.idPrograma, idPeriodo: periodo.idPeriodo, codigoCetap: op.codigoCetap });
  return { ...asig, ...periodo, ...oferta };
}

/**
 * Retira lo que crearon los fixtures de un programa (para pruebas que SÍ confirman, porque leen
 * por otra conexión). Orden por claves foráneas: ofertas, asignaturas, núcleo, programa.
 */
async function retirarPrograma(client, { idPrograma, idNucleo }) {
  await client.query('DELETE FROM academic_work_plan.oferta_cetap_programa WHERE id_programa = $1::bigint', [idPrograma]);
  await client.query('DELETE FROM academic_work_plan.asignatura WHERE id_programa = $1::bigint', [idPrograma]);
  if (idNucleo) await client.query('DELETE FROM academic_work_plan.nucleo_tematico WHERE id = $1::bigint', [idNucleo]);
  await client.query('DELETE FROM academic_work_plan.programa WHERE id = $1::bigint', [idPrograma]);
}

module.exports = { retirarPrograma, crearAsignatura, crearPeriodo, crearOferta, crearEscenarioDeOferta, unico };
