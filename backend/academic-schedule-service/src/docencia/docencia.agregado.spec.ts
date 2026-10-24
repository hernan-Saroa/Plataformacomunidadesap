import { Client } from 'pg';

import { DocenciaService } from './docencia.service.js';
import { repartoPorDias, type ReglaReparto } from './reparto.js';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { crearAsignatura } = require('../../test/catalogo-qa.cjs');

/**
 * EFDS-2306 + EFDS-2347 :: la docencia sale de la franja y sus horas, de las
 * SESIONES REALES del ciclo (festivos y recesos no cuentan; fines de semana sí).
 *
 * Agregado sobre la base real, en una transacción que se revierte. El ciclo es del
 * 2 de febrero al 31 de mayo de 2026, con festivos cargados (migración 062):
 *   · 17 lunes, de los que 2 son festivos (San José 23-mar, Ascensión 18-may) → 15;
 *   · 17 miércoles, sin festivos → 17;
 *   · 17 viernes, 2 festivos (Viernes Santo 3-abr, 1-may) → 15;
 *   · 17 martes y 17 sábados, sin festivos.
 * Franjas de 2 h. El contrato se simula: 96 h de plan por asignatura y factor 1,
 * así las horas son las de clase.
 */
const conexion = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 55432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'esap_secure_password_2024',
  database: process.env.DB_NAME || 'esap_db',
};
const S = 'academic-schedule';
const PLAN = 96;

describe('EFDS-2306 / EFDS-2347 :: docencia desde la franja, con sesiones reales (agregado real, en transacción)', () => {
  let client: Client | null = null;
  let hayBase = false;
  beforeAll(async () => {
    try { client = new Client(conexion); await client.connect(); hayBase = true; } catch { hayBase = false; }
  });
  afterAll(async () => { if (client) await client.end().catch(() => {}); });

  const servicio = (opciones: { regla?: ReglaReparto; tipoExcepcion?: string; factor?: number } = {}) => {
    const svc = new DocenciaService(
      { query: (sql: string, p?: any[]) => client!.query(sql, p).then((r) => r.rows) } as any,
      { calcularImpacto: async () => ({ horasImpacto: PLAN, factorVinculacion: opciones.factor ?? 1, tipoExcepcion: opciones.tipoExcepcion ?? null }) } as any,
    );
    if (opciones.regla) (svc as any).reparto = opciones.regla;
    return svc;
  };

  interface Ids { a: string; b: string; grupo: string; periodo: string }
  const enTransaccion = (nombre: string, fn: (ids: Ids) => Promise<void>, ciclo = ['2026-02-02', '2026-05-31']) =>
    it(nombre, async () => {
      if (!hayBase || !client) { console.warn('  (sin base: omitido)'); return; }
      await client.query('BEGIN');
      try {
        // Dos personas QA propias (cédulas en un rango que no usa nadie).
        const persona = async (doc: string) => (await client!.query(
          `INSERT INTO auth.personas (id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero)
           VALUES ($1::bigint, $2, 'CC', 'Docente QA 2347', 'Docente QA 2347', 'N') RETURNING id_person::text AS id`,
          [Number(doc), doc])).rows[0].id;
        const p = await client.query(
          `INSERT INTO "${S}".periodo_programacion (codigo,nombre,tipo,fecha_inicio,fecha_fin,estado)
           VALUES ('QA-2347-TX','QA docencia','periodo_regular',$1,$2,'activo') RETURNING id_periodo::text AS id`, ciclo);
        const asig = await crearAsignatura(client);
        const g = await client.query(
          `INSERT INTO "${S}".grupo (id_asignatura,id_periodo,numero_grupo,estado) VALUES ($2::bigint,$1,971,'PROGRAMADO') RETURNING id_grupo::text AS id`,
          [p.rows[0].id, asig.idAsignatura]);
        await fn({ a: await persona('9900000701'), b: await persona('9900000702'), grupo: g.rows[0].id, periodo: p.rows[0].id });
      } finally {
        await client.query('ROLLBACK');
      }
    });

  const franja = (grupo: string, dia: string, docente: string | null) => client!.query(
    `INSERT INTO "${S}".franja_horaria (id_grupo,dia_semana,hora_inicio,hora_fin,tipo_sesion,id_docente,estado)
     VALUES ($1,$2,'06:00','08:00','mediada_tecnologia',$3,'TOMADA')`, [grupo, dia, docente]);
  const delGrupo = async (svc: DocenciaService, docente: string, grupo: string) =>
    (await svc.porGrupo(docente, null, null)).find((x) => x.idGrupo === grupo)!;

  enTransaccion('un lunes con dos festivos lunes tiene menos horas: 15 sesiones de 17, y se dice cuántas no cuentan', async ({ a, grupo }) => {
    await franja(grupo, 'LUNES', a);
    const g = await delGrupo(servicio(), a, grupo);
    expect(g).toMatchObject({ base: 'sesiones', horas: 30, horasGrupo: 30, fraccion: 1, horasPlan: PLAN,
      descontadas: { festivos: 2, recesos: 0 }, avisos: [] });
  });

  enTransaccion('lo tomado en el portal cuenta, con las sesiones de cada día (antes daba 0 h)', async ({ a, grupo }) => {
    await franja(grupo, 'LUNES', a);
    await franja(grupo, 'MIERCOLES', a);
    await franja(grupo, 'VIERNES', a);
    const sinAsignacion = await client!.query(`SELECT COUNT(*)::int AS n FROM "${S}".asignacion_docente WHERE id_grupo = $1`, [grupo]);
    expect(sinAsignacion.rows[0].n).toBe(0); // no hay asignación del backoffice: solo franjas
    // 15 lunes + 17 miércoles + 15 viernes = 47 sesiones × 2 h.
    expect(await delGrupo(servicio(), a, grupo)).toMatchObject({ horas: 94, horasGrupo: 94, fraccion: 1, descontadas: { festivos: 4, recesos: 0 } });
  });

  enTransaccion('dos docentes que comparten un grupo: cada uno, las sesiones de sus franjas; nadie cuenta de más', async ({ a, b, grupo }) => {
    await franja(grupo, 'LUNES', a);
    await franja(grupo, 'MIERCOLES', a);
    await franja(grupo, 'VIERNES', b);
    const ga = await delGrupo(servicio(), a, grupo);
    const gb = await delGrupo(servicio(), b, grupo);
    expect(ga.horas).toBe(64);   // 30 + 34
    expect(gb.horas).toBe(30);
    expect(ga.horas + gb.horas).toBe(ga.horasGrupo);
  });

  enTransaccion('un día sin docente no se le carga a nadie', async ({ a, grupo }) => {
    await franja(grupo, 'LUNES', a);
    await franja(grupo, 'MARTES', null); // aún sin docente
    expect((await delGrupo(servicio(), a, grupo)).horas).toBe(30);
  });

  enTransaccion('los recesos del periodo no cuentan (iguales para todos); un festivo dentro del receso cuenta como festivo', async ({ a, grupo, periodo }) => {
    await franja(grupo, 'LUNES', a);
    await franja(grupo, 'VIERNES', a);
    // Semana Santa: lunes 30-mar a domingo 5-abr. El viernes 3-abr ya es festivo.
    await client!.query(
      `INSERT INTO "${S}".periodo_receso (id_periodo, fecha_inicio, fecha_fin, motivo) VALUES ($1, '2026-03-30', '2026-04-05', 'Semana Santa')`,
      [periodo]);
    expect(await delGrupo(servicio(), a, grupo)).toMatchObject({ horas: 58, descontadas: { festivos: 4, recesos: 1 } });
  });

  enTransaccion('los fines de semana cuentan', async ({ a, grupo }) => {
    await franja(grupo, 'SABADO', a);
    expect((await delGrupo(servicio(), a, grupo)).horas).toBe(34);
  });

  enTransaccion('el factor de vinculación se aplica sobre las horas reales', async ({ a, grupo }) => {
    await franja(grupo, 'LUNES', a);
    expect(await delGrupo(servicio({ factor: 3 }), a, grupo)).toMatchObject({ horas: 90, horasPlan: PLAN });
  });

  enTransaccion('sin festivos cargados para el año del ciclo se avisa', async ({ a, grupo }) => {
    await franja(grupo, 'LUNES', a);
    const g = await delGrupo(servicio(), a, grupo);
    expect(g.avisos.join(' ')).toMatch(/No hay festivos cargados para 2031/);
  }, ['2031-02-03', '2031-05-31']);

  enTransaccion('horas fijas del catálogo: se usan las del plan con la regla de reparto, que es reemplazable', async ({ a, b, grupo }) => {
    await franja(grupo, 'LUNES', a);
    await franja(grupo, 'MIERCOLES', b);
    const g = await delGrupo(servicio({ tipoExcepcion: 'HORAS_FIJAS' }), a, grupo);
    expect(g).toMatchObject({ base: 'plan', horas: 48, horasGrupo: PLAN });
    expect(g.avisos.join(' ')).toMatch(/horas fijas/);
    const mitad: ReglaReparto = () => 0.25;
    expect((await delGrupo(servicio({ tipoExcepcion: 'HORAS_FIJAS', regla: mitad }), a, grupo)).horas).toBe(24);
  });

  enTransaccion('excluir el grupo evaluado no lo cuenta dos veces', async ({ a, grupo }) => {
    await franja(grupo, 'LUNES', a);
    const sin = await servicio().total(a, null, null, grupo);
    const con = await servicio().total(a, null, null);
    expect(con - sin).toBe(30);
  });

  it('repartoPorDias: grupo sin franjas no reparte nada', () => {
    expect(repartoPorDias([], 'x')).toBe(0);
  });
});
