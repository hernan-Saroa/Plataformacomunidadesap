import { Client } from 'pg';

import { AulasService } from './aulas.service.js';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { crearAsignatura, crearPeriodo } = require('../../test/catalogo-qa.cjs');

/**
 * EFDS-1374 :: AC-02 :: RN-07 es confidencialidad en el DTO, no en la UI.
 *
 * Canario de COMPORTAMIENTO sobre la base real (transacción que se revierte): la
 * disponibilidad de un aula dice qué franjas están ocupadas —día y hora— y nada más.
 * Ni el grupo, ni la asignatura, ni el docente, ni las fechas del ciclo salen en la
 * respuesta aunque el servidor los use para decidir qué cuenta como ocupado.
 *
 * Antes este canario leía el texto del SELECT; desde que la ocupación se mide con la regla
 * única de choque (`horarios/choque.ts`, que sí lee grupo y ciclo en memoria) la garantía
 * real es lo que viaja en la respuesta, y es eso lo que se afirma.
 *
 * Además fija que «ocupada» se mide EN EL CICLO: el aula de otro periodo, con fechas que no
 * se tocan, no aparece ocupada.
 */
const conexion = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 55432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'esap_db',
};
const S = 'academic-schedule';
const AULA = 'QA1374-AULA';

describe('EFDS-1374 :: RN-07 :: la disponibilidad de aula no revela quién la ocupa (agregado real)', () => {
  let client: Client | null = null;
  let hayBase = false;

  beforeAll(async () => {
    try { client = new Client(conexion); await client.connect(); hayBase = true; }
    catch { client = null; hayBase = false; }
  });
  afterAll(async () => { if (client) await client.end().catch(() => {}); });

  const servicio = () => new AulasService({
    query: (sql: string, params?: any[]) => client!.query(sql, params).then((r) => r.rows),
  } as any);

  const enTransaccion = (nombre: string, fn: (ctx: { asig: any; docente: string }) => Promise<void>) =>
    it(nombre, async () => {
      if (!hayBase || !client) { console.warn('  (sin base: omitido)'); return; }
      await client.query('BEGIN');
      try {
        await client.query(`INSERT INTO "${S}".aula (codigo, nombre, sede_codigo) VALUES ($1, 'Aula QA 1374', 'SC')`, [AULA]);
        const asig = await crearAsignatura(client);
        const doc = await client.query(`SELECT id_person FROM auth.personas ORDER BY id_person LIMIT 1`);
        await fn({ asig, docente: doc.rows[0].id_person });
      } finally {
        await client.query('ROLLBACK');
      }
    });

  /** Grupo de un periodo de plataforma, con una franja del aula QA. */
  const grupoConFranja = async (
    asig: any, idPeriodo: string, numero: number, docente: string | null,
    ciclo: { fi?: string; ff?: string } = {},
  ) => {
    const g = await client!.query(
      `INSERT INTO "${S}".grupo (id_asignatura, id_periodo_academico, tipo_oferta, numero_grupo, estado, fecha_inicio, fecha_fin)
       VALUES ($1::bigint, $2::bigint, 'periodo_regular', $3, 'PROGRAMADO', $4::date, $5::date) RETURNING id_grupo`,
      [asig.idAsignatura, idPeriodo, numero, ciclo.fi ?? null, ciclo.ff ?? null]);
    await client!.query(
      `INSERT INTO "${S}".franja_horaria (id_grupo, dia_semana, hora_inicio, hora_fin, tipo_sesion, aula_codigo, id_docente, estado)
       VALUES ($1, 'DOMINGO', '05:00'::time, '06:00'::time, 'presencial', $2, $3, 'PROGRAMADO')`,
      [g.rows[0].id_grupo, AULA, docente]);
    return g.rows[0].id_grupo as string;
  };

  enTransaccion('la respuesta trae SOLO día y hora: ni grupo, ni asignatura, ni docente, ni fechas', async ({ asig, docente }) => {
    const p = await crearPeriodo(client, { codigo: '2097-1', anio: 2097 });
    const idGrupo = await grupoConFranja(asig, p.idPeriodo, 981, docente, { fi: '2097-02-01', ff: '2097-06-15' });

    const r = await servicio().disponibilidad(AULA);

    expect(r.ocupada).toEqual([{ diaSemana: 'DOMINGO', horaInicio: '05:00', horaFin: '06:00' }]);
    for (const f of r.ocupada) expect(Object.keys(f).sort()).toEqual(['diaSemana', 'horaFin', 'horaInicio']);
    const texto = JSON.stringify(r);
    for (const secreto of [idGrupo, docente, asig.codigoAsignatura, asig.idAsignatura, asig.codigoPrograma, '2097-02-01']) {
      expect(texto).not.toContain(String(secreto));
    }
  });

  enTransaccion('con periodo o grupo, ocupada = ocupada EN ESE CICLO (otro periodo sin solape no cuenta)', async ({ asig, docente }) => {
    const antes = await crearPeriodo(client, { codigo: '2097-1', anio: 2097, semestre: 1, inicio: '2097-02-01', fin: '2097-06-15' });
    const despues = await crearPeriodo(client, { codigo: '2097-2', anio: 2097, semestre: 2, inicio: '2097-07-01', fin: '2097-11-30' });
    const gAntes = await grupoConFranja(asig, antes.idPeriodo, 982, docente);       // ciclo = el del periodo 2097-1
    const gDespues = await grupoConFranja(asig, despues.idPeriodo, 983, null);      // ciclo = el del periodo 2097-2

    // Sin filtro, el aula ve las dos (comportamiento anterior: todo lo que tenga el aula).
    expect((await servicio().disponibilidad(AULA)).ocupada).toHaveLength(2);

    // Mirando un periodo: solo lo que ocupa EL AULA en esas fechas.
    expect((await servicio().disponibilidad(AULA, { periodo: antes.idPeriodo })).ocupada).toHaveLength(1);
    expect((await servicio().disponibilidad(AULA, { periodo: despues.idPeriodo })).ocupada).toHaveLength(1);

    // Mirando un grupo: se mide contra el ciclo de ESE grupo.
    expect((await servicio().disponibilidad(AULA, { grupo: gAntes })).ocupada).toHaveLength(1);
    expect((await servicio().disponibilidad(AULA, { grupo: gDespues })).ocupada).toHaveLength(1);

    // El ciclo propio del grupo manda sobre el del periodo: un grupo de 2097-1 con fechas de 2097-2 ve ocupado el de 2097-2.
    const gTrasladado = await client!.query(
      `INSERT INTO "${S}".grupo (id_asignatura, id_periodo_academico, tipo_oferta, numero_grupo, estado, fecha_inicio, fecha_fin)
       VALUES ($1::bigint, $2::bigint, 'periodo_regular', 984, 'PROGRAMADO', '2097-07-10', '2097-08-30') RETURNING id_grupo`,
      [asig.idAsignatura, antes.idPeriodo]);
    const enSuCiclo = (await servicio().disponibilidad(AULA, { grupo: gTrasladado.rows[0].id_grupo })).ocupada;
    expect(enSuCiclo).toHaveLength(1); // solo la de 2097-2; la de 2097-1 no se toca con sus fechas
  });

  it('un periodo o un grupo que no existen no se aceptan en silencio', async () => {
    if (!hayBase || !client) { console.warn('  (sin base: omitido)'); return; }
    await client.query('BEGIN');
    try {
      await client.query(`INSERT INTO "${S}".aula (codigo, nombre, sede_codigo) VALUES ($1, 'Aula QA 1374', 'SC')`, [AULA]);
      await expect(servicio().disponibilidad(AULA, { periodo: 'no-es-un-periodo' })).rejects.toThrow();
      await expect(servicio().disponibilidad(AULA, { grupo: 'no-es-uuid' })).rejects.toThrow();
      await expect(servicio().disponibilidad(AULA, { grupo: '00000000-0000-4000-8000-000000000000' })).rejects.toThrow(/no existe/);
    } finally {
      await client.query('ROLLBACK');
    }
  });
});
