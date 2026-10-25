import { Client } from 'pg';

import { ValidacionService } from './validacion.service.js';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { crearAsignatura } = require('../../test/catalogo-qa.cjs');

/**
 * EFDS-2307 :: cruces de la programación VIVA.
 *
 * Canario AGREGADO sobre la base real:
 *   1. la programación viva completa tiene 0 cruces — la regla de la API se
 *      cumple. Si este test falla, alguna ruta dejó pasar un cruce;
 *   2. el conteo DETECTA: un cruce de aula, uno de docente y uno intra-grupo
 *      insertados a la fuerza se cuentan. Se hace dentro de una transacción que
 *      se revierte: ninguna otra conexión (ni este mismo canario corriendo en
 *      paralelo) llega a ver el cruce.
 */
const conexion = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 55432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'esap_db',
};
const S = 'academic-schedule';

describe('EFDS-2307 :: cruces de la programacion viva (agregado real)', () => {
  let client: Client | null = null;
  let hayBase = false;

  beforeAll(async () => {
    try {
      client = new Client(conexion);
      await client.connect();
      hayBase = true;
    } catch {
      hayBase = false;
    }
  });
  afterAll(async () => { if (client) await client.end().catch(() => {}); });

  const servicio = () => new ValidacionService({
    query: (sql: string, params?: any[]) => client!.query(sql, params).then((r) => r.rows),
  } as any);

  it('la programacion viva no tiene cruces (canario de la regla)', async () => {
    if (!hayBase || !client) { console.warn('  (sin base: omitido)'); return; }
    // Solo la programación REAL. Otras pruebas de agregado (jefatura, periodo
    // cerrado, publicación) hacen COMMIT de fixtures en periodos 'QA-…' que
    // contienen cruces controlados a propósito; corriendo en paralelo, este
    // canario los veía. Se mide cada periodo real por separado.
    const periodos: Array<{ id: string; codigo: string }> = (await client.query(
      `SELECT id::text AS id, codigo FROM academic_work_plan.periodo_academico
       UNION ALL
       SELECT id_periodo::text, codigo FROM "${S}".periodo_programacion WHERE codigo NOT LIKE 'QA-%'`)).rows;
    // Una base recién borrada (sin periodos) no tiene nada que medir: se avisa, pero el total de abajo se sigue exigiendo.
    if (periodos.length === 0) console.warn('  (sin periodos reales: no hay programación que medir por periodo)');
    const conCruces: string[] = [];
    for (const p of periodos) {
      const conteo = await servicio().crucesVivos(p.id);
      if (conteo.total !== 0) conCruces.push(`${p.codigo}: ${JSON.stringify(conteo.cruces)}`);
    }
    expect(conCruces).toEqual([]);
    // Y en total: ninguna prueba deja ver sus fixtures (corren en transacciones que se
    // revierten); si una vuelve a hacer COMMIT de cruces, esto falla.
    expect((await servicio().crucesVivos()).total).toBe(0);
  });

  it('el conteo detecta cruces de aula, docente y grupo, y acota por periodo', async () => {
    if (!hayBase || !client) { console.warn('  (sin base: omitido)'); return; }
    await client.query('BEGIN');
    try {
      const a = { rows: [{ id: (await crearAsignatura(client)).idAsignatura }] };
      const doc = await client.query(`SELECT id_person FROM auth.personas ORDER BY id_person LIMIT 1`);
      const p = await client.query(
        `INSERT INTO "${S}".periodo_programacion (codigo,nombre,tipo,fecha_inicio,fecha_fin,estado)
         VALUES ('QA-2307-TX','QA cruces vivos','periodo_regular','2030-02-01','2030-06-15','activo') RETURNING id_periodo`);
      const idPeriodo = p.rows[0].id_periodo;
      const grupo = async (n: number) => (await client!.query(
        `INSERT INTO "${S}".grupo (id_asignatura,id_periodo,numero_grupo,estado) VALUES ($1,$2,$3,'PROGRAMADO') RETURNING id_grupo`,
        [a.rows[0].id, idPeriodo, n])).rows[0].id_grupo;
      const g1 = await grupo(951);
      const g2 = await grupo(952);
      const franja = (g: string, ini: string, fin: string, aula: string | null, docente: string | null) => client!.query(
        `INSERT INTO "${S}".franja_horaria (id_grupo,dia_semana,hora_inicio,hora_fin,tipo_sesion,aula_codigo,id_docente,estado)
         VALUES ($1,'DOMINGO',$2::time,$3::time,'presencial',$4,$5,'PROGRAMADO')`, [g, ini, fin, aula, docente]);
      // Aula: mismo salón inventado, grupos distintos, solapadas.
      await franja(g1, '05:00', '06:00', 'QA2307-AULA', null);
      await franja(g2, '05:30', '06:30', 'QA2307-AULA', null);
      // Docente: mismo docente, grupos distintos, solapadas, sin aula (virtual).
      await franja(g1, '20:00', '21:00', null, doc.rows[0].id_person);
      await franja(g2, '20:30', '21:30', null, doc.rows[0].id_person);
      // Grupo: el mismo grupo dos veces a la vez.
      await franja(g1, '22:00', '23:00', null, null);
      await franja(g1, '22:30', '23:30', null, null);
      // Bordes que NO cruzan: contiguas (fin = inicio).
      await franja(g2, '23:30', '23:45', null, null);

      const conteo = await servicio().crucesVivos(idPeriodo);
      expect({ aula: conteo.aula, docente: conteo.docente, grupo: conteo.grupo }).toEqual({ aula: 1, docente: 1, grupo: 1 });
      // Sin revelar el otro grupo: solo el aula como recurso.
      expect(conteo.cruces.find((c) => c.tipo === 'aula')?.recurso).toBe('QA2307-AULA');
      expect(conteo.cruces.find((c) => c.tipo === 'docente')?.recurso).toBeNull();

      // Acotado a otro periodo, estos cruces no aparecen.
      const otro = await servicio().crucesVivos('00000000-0000-0000-0000-000000000000');
      expect(otro.total).toBe(0);
    } finally {
      await client.query('ROLLBACK');
    }
  });

  it('el mismo aula y docente a la misma hora: NO cruzan entre periodos sin solape de fechas; SÍ si se tocan', async () => {
    if (!hayBase || !client) { console.warn('  (sin base: omitido)'); return; }
    await client.query('BEGIN');
    try {
      const asig = await crearAsignatura(client);
      const doc = await client.query(`SELECT id_person FROM auth.personas ORDER BY id_person LIMIT 1`);
      const periodo = async (cod: string, ini: string, fin: string) => (await client!.query(
        `INSERT INTO "${S}".periodo_programacion (codigo,nombre,tipo,fecha_inicio,fecha_fin,estado)
         VALUES ($1,$1,'periodo_regular',$2::date,$3::date,'activo') RETURNING id_periodo`, [cod, ini, fin])).rows[0].id_periodo;
      const grupo = async (idPeriodo: string, n: number, fi: string | null = null, ff: string | null = null) => (await client!.query(
        `INSERT INTO "${S}".grupo (id_asignatura,id_periodo,numero_grupo,estado,fecha_inicio,fecha_fin)
         VALUES ($1::bigint,$2,$3,'PROGRAMADO',$4::date,$5::date) RETURNING id_grupo`,
        [asig.idAsignatura, idPeriodo, n, fi, ff])).rows[0].id_grupo;
      // Mismo salón y mismo docente, DOMINGO 05:00-06:00, en cada grupo.
      const franja = (g: string) => client!.query(
        `INSERT INTO "${S}".franja_horaria (id_grupo,dia_semana,hora_inicio,hora_fin,tipo_sesion,aula_codigo,id_docente,estado)
         VALUES ($1,'DOMINGO','05:00'::time,'06:00'::time,'presencial','QA2307-CICLO',$2,'PROGRAMADO')`, [g, doc.rows[0].id_person]);

      const pA = await periodo('QA-2307-A', '2030-02-01', '2030-06-15');
      const pB = await periodo('QA-2307-B', '2030-07-01', '2030-11-30');   // no se toca con A
      await franja(await grupo(pA, 961));
      await franja(await grupo(pB, 962));
      // Dos periodos distintos, fechas disjuntas: el aula y el docente NO están ocupados entre sí.
      let c = await servicio().crucesVivos();
      expect({ aula: c.aula, docente: c.docente }).toEqual({ aula: 0, docente: 0 });

      // El ciclo del GRUPO manda sobre el del periodo: un grupo de A con las fechas de B sí choca con el de B.
      const gTrasladado = await grupo(pA, 963, '2030-07-10', '2030-08-30');
      await franja(gTrasladado);
      c = await servicio().crucesVivos();
      expect({ aula: c.aula, docente: c.docente }).toEqual({ aula: 1, docente: 1 });

      // Un tercer periodo que SÍ se toca con A y con B: cruza con ambos (más el trasladado, que cae dentro de C).
      const pC = await periodo('QA-2307-C', '2030-06-01', '2030-07-15');
      await franja(await grupo(pC, 964));
      c = await servicio().crucesVivos();
      expect(c.aula).toBeGreaterThanOrEqual(3);
      expect(c.docente).toBe(c.aula);
    } finally {
      await client.query('ROLLBACK');
    }
  });
});
