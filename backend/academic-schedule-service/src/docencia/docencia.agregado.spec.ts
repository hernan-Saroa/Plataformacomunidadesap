import { Client } from 'pg';

import { DocenciaService } from './docencia.service.js';
import { repartoPorDias, type ReglaReparto } from './reparto.js';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { crearAsignatura } = require('../../test/catalogo-qa.cjs');

/**
 * EFDS-2306 :: el registro único de la docencia es la franja.
 *
 * Canario AGREGADO sobre la base real, dentro de una transacción que se revierte.
 * El contrato PROG↔PTA se simula con un valor fijo (96 h por asignatura): aquí
 * se prueba de dónde sale la docencia y cómo se reparte, no el cálculo de horas,
 * que es del contrato.
 *
 *   · lo tomado en el portal (franja.id_docente) cuenta: antes daba 0 h;
 *   · dos docentes que comparten un grupo se reparten las horas por días;
 *   · la regla de reparto es reemplazable sin tocar el servicio.
 */
const conexion = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 55432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'esap_db',
};
const S = 'academic-schedule';
const HORAS_CONTRATO = 96;

describe('EFDS-2306 :: docencia desde la franja (agregado real, en transaccion)', () => {
  let client: Client | null = null;
  let hayBase = false;
  beforeAll(async () => {
    try { client = new Client(conexion); await client.connect(); hayBase = true; } catch { hayBase = false; }
  });
  afterAll(async () => { if (client) await client.end().catch(() => {}); });

  const llamadasContrato: string[] = [];
  const servicio = (regla?: ReglaReparto) => {
    const svc = new DocenciaService(
      { query: (sql: string, p?: any[]) => client!.query(sql, p).then((r) => r.rows) } as any,
      { calcularImpacto: async (codigo: string) => { llamadasContrato.push(codigo); return { horasImpacto: HORAS_CONTRATO }; } } as any,
    );
    if (regla) (svc as any).reparto = regla;
    return svc;
  };

  const enTransaccion = (nombre: string, fn: (ids: { a: string; b: string; grupo: string }) => Promise<void>) =>
    it(nombre, async () => {
      if (!hayBase || !client) { console.warn('  (sin base: omitido)'); return; }
      await client.query('BEGIN');
      try {
        const docentes = await client.query(`SELECT id_person FROM auth.personas ORDER BY id_person LIMIT 2`);
        const p = await client.query(
          `INSERT INTO "${S}".periodo_programacion (codigo,nombre,tipo,fecha_inicio,fecha_fin,estado)
           VALUES ('QA-2306-TX','QA docencia','periodo_regular','2031-02-01','2031-06-15','activo') RETURNING id_periodo`);
        const asig = await crearAsignatura(client);
        const g = await client.query(
          `INSERT INTO "${S}".grupo (id_asignatura,id_periodo,numero_grupo,estado) VALUES ($2::bigint,$1,971,'PROGRAMADO') RETURNING id_grupo`,
          [p.rows[0].id_periodo, asig.idAsignatura]);
        await fn({ a: docentes.rows[0].id_person, b: docentes.rows[1].id_person, grupo: g.rows[0].id_grupo });
      } finally {
        await client.query('ROLLBACK');
      }
    });

  const franja = (grupo: string, dia: string, ini: string, docente: string | null) => client!.query(
    `INSERT INTO "${S}".franja_horaria (id_grupo,dia_semana,hora_inicio,hora_fin,tipo_sesion,id_docente,estado)
     VALUES ($1,$2,$3::time,($3::time + interval '2 hours'),'mediada_tecnologia',$4,'TOMADA')`, [grupo, dia, ini, docente]);

  enTransaccion('lo tomado en el portal cuenta como docencia (antes daba 0 h)', async ({ a, grupo }) => {
    // Tres días de clase, el docente tomó los tres: el grupo completo es suyo.
    await franja(grupo, 'LUNES', '06:00', a);
    await franja(grupo, 'MIERCOLES', '06:00', a);
    await franja(grupo, 'VIERNES', '06:00', a);
    const sinAsignacion = await client!.query(
      `SELECT COUNT(*)::int AS n FROM "${S}".asignacion_docente WHERE id_grupo = $1`, [grupo]);
    expect(sinAsignacion.rows[0].n).toBe(0); // no hay asignación del backoffice: solo franjas
    const g = (await servicio().porGrupo(a, null, null)).find((x) => x.idGrupo === grupo)!;
    expect(g).toMatchObject({ horasGrupo: HORAS_CONTRATO, fraccion: 1, horas: HORAS_CONTRATO });
  });

  enTransaccion('dos docentes que comparten un grupo se reparten las horas por dias', async ({ a, b, grupo }) => {
    await franja(grupo, 'LUNES', '06:00', a);
    await franja(grupo, 'MIERCOLES', '06:00', a);
    await franja(grupo, 'VIERNES', '06:00', b);
    const ga = (await servicio().porGrupo(a, null, null)).find((x) => x.idGrupo === grupo)!;
    const gb = (await servicio().porGrupo(b, null, null)).find((x) => x.idGrupo === grupo)!;
    expect(ga.horas).toBe(64);   // 2 de 3 días
    expect(gb.horas).toBe(32);   // 1 de 3 días
    expect(ga.horas + gb.horas).toBe(HORAS_CONTRATO); // nadie cuenta horas de más
  });

  enTransaccion('un dia sin docente no se le carga a nadie', async ({ a, grupo }) => {
    await franja(grupo, 'LUNES', '06:00', a);
    await franja(grupo, 'MARTES', '06:00', null); // publicada y aún sin tomar
    const ga = (await servicio().porGrupo(a, null, null)).find((x) => x.idGrupo === grupo)!;
    expect(ga.horas).toBe(48);
  });

  enTransaccion('la regla de reparto es reemplazable sin tocar el servicio', async ({ a, b, grupo }) => {
    await franja(grupo, 'LUNES', '06:00', a);
    await franja(grupo, 'MIERCOLES', '06:00', b);
    const mitadParaCadaUno: ReglaReparto = () => 0.5;
    const ga = (await servicio(mitadParaCadaUno).porGrupo(a, null, null)).find((x) => x.idGrupo === grupo)!;
    expect(ga.horas).toBe(48);
  });

  enTransaccion('excluir el grupo evaluado no lo cuenta dos veces', async ({ a, grupo }) => {
    await franja(grupo, 'LUNES', '06:00', a);
    const total = await servicio().total(a, null, null, grupo);
    const conGrupo = await servicio().total(a, null, null);
    expect(conGrupo - total).toBe(HORAS_CONTRATO);
  });

  it('repartoPorDias: grupo sin franjas no reparte nada', () => {
    expect(repartoPorDias([], 'x')).toBe(0);
  });
});
