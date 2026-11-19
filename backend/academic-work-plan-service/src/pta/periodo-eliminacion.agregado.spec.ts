import { Client } from 'pg';

import { eliminarTodoDelPeriodo, impactoEliminacion } from './periodo-eliminacion';

/**
 * Bug QA 18-nov «no deja eliminar periodos», con el SQL REAL: un periodo de prueba con
 * catálogo, programación y concertación se elimina entero; el periodo en curso y uno con
 * PTA no. Todo en una transacción que se revierte.
 */
const conexion = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 55432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'esap_secure_password_2024',
  database: process.env.DB_NAME || 'esap_db',
};

describe('Eliminar un periodo (agregado real, en transacción)', () => {
  let client: Client | null = null;
  let hayBase = false;

  beforeAll(async () => {
    try { client = new Client(conexion); await client.connect(); hayBase = true; } catch { hayBase = false; }
  }, 20000);
  afterAll(async () => { await client?.end().catch(() => undefined); });

  const enTx = (nombre: string, fn: (c: Client) => Promise<void>) => it(nombre, async () => {
    if (!hayBase || !client) { console.warn('  (sin base: prueba omitida)'); return; }
    await client.query('BEGIN');
    try { await fn(client); } finally { await client.query('ROLLBACK'); }
  }, 30000);

  /** Los servicios usan el EntityManager (query → filas); el cliente pg devuelve { rows }. */
  const q = (c: Client) => ({ query: async (s: string, p?: unknown[]) => (await c.query(s, p as any[])).rows });
  // En curso se crea como EXTRAORDINARIO: el principal en curso es único y la base ya puede tener uno.
  const crearPeriodo = async (c: Client, codigo: string, estado = 'planeacion') => (await c.query(
    `INSERT INTO academic_work_plan.periodo_academico (codigo, anio, semestre, fecha_inicio, fecha_fin, estado, extraordinario, motivo_extraordinario)
     VALUES ($1, 2091, 1, '2091-02-01', '2091-06-01', $2, $3, CASE WHEN $3 THEN 'Prueba de eliminación' END) RETURNING id::text AS id`, [codigo, estado, estado === 'en_curso'])).rows[0].id as string;

  enTx('un periodo de prueba con catálogo, grupo, sesión y concertación se elimina entero', async (c) => {
    const id = await crearPeriodo(c, '2091-1');
    const cetap = (await c.query(`SELECT id FROM academic_work_plan.cetap LIMIT 1`)).rows[0]?.id;
    const prog = (await c.query(`SELECT id FROM academic_work_plan.programa LIMIT 1`)).rows[0]?.id;
    const asig = (await c.query(`SELECT id FROM academic_work_plan.asignatura WHERE id_programa = $1 LIMIT 1`, [prog])).rows[0]?.id;
    if (!cetap || !prog || !asig) { console.warn('  (sin catálogo en esta base: prueba omitida)'); return; }
    await c.query(`INSERT INTO academic_work_plan.oferta_cetap_programa (id_cetap, id_programa, id_periodo_academico) VALUES ($1, $2, $3)`, [cetap, prog, id]);
    await c.query(`INSERT INTO academic_work_plan.periodo_cetap (id_periodo_academico, id_cetap, activo) VALUES ($1, $2, true)`, [id, cetap]);
    const g = (await c.query(
      `INSERT INTO "academic-schedule".grupo (id_asignatura, id_periodo_academico, tipo_oferta, numero_grupo, estado)
       VALUES ($1, $2, 'periodo_regular', 1, 'PROGRAMADO') RETURNING id_grupo`, [asig, id])).rows[0].id_grupo;
    await c.query(`INSERT INTO "academic-schedule".franja_horaria (id_grupo, dia_semana, hora_inicio, hora_fin) VALUES ($1, 'LUNES', '08:00', '10:00')`, [g]);
    const doc = (await c.query(`SELECT id_person FROM auth.personas LIMIT 1`)).rows[0].id_person;
    await c.query(
      `INSERT INTO "academic-schedule".concertacion_docencia (id_docente, periodo_ref, nivel, estado, horas, franjas, huella)
       VALUES ($1, $2, 'pregrado', 'ENVIADA', 32, '[]'::jsonb, 'x')`, [doc, id]);

    const i = await impactoEliminacion(q(c), { id, codigo: '2091-1', estado: 'planeacion' });
    expect(i).toMatchObject({ eliminable: true, ptas: 0, ofertas: 1, cetaps: 1, grupos: 1, sesiones: 1, concertaciones: 1 });

    await eliminarTodoDelPeriodo(q(c), id);
    const quedan = (await c.query(
      `SELECT (SELECT COUNT(*) FROM academic_work_plan.periodo_academico WHERE id = $1::bigint)
            + (SELECT COUNT(*) FROM academic_work_plan.oferta_cetap_programa WHERE id_periodo_academico = $1::bigint)
            + (SELECT COUNT(*) FROM academic_work_plan.periodo_cetap WHERE id_periodo_academico = $1::bigint)
            + (SELECT COUNT(*) FROM "academic-schedule".grupo WHERE id_periodo_academico = $1::bigint)
            + (SELECT COUNT(*) FROM "academic-schedule".franja_horaria WHERE id_grupo = $2::uuid)
            + (SELECT COUNT(*) FROM "academic-schedule".concertacion_docencia WHERE periodo_ref = $1::text) AS n`, [id, g])).rows[0].n;
    expect(Number(quedan)).toBe(0);
  });

  enTx('el periodo EN CURSO no se elimina', async (c) => {
    // Si la base ya tiene un extraordinario en curso, se usa ese (solo puede haber uno).
    const ya = (await c.query(`SELECT id::text AS id, codigo FROM academic_work_plan.periodo_academico WHERE estado = 'en_curso' AND extraordinario LIMIT 1`)).rows[0];
    const id = ya?.id ?? await crearPeriodo(c, '2091-2', 'en_curso');
    const i = await impactoEliminacion(q(c), { id, codigo: ya?.codigo ?? '2091-2', estado: 'en_curso' });
    expect(i.eliminable).toBe(false);
    expect(i.motivo).toMatch(/en curso/);
  });

  enTx('un periodo con PTA de docentes no se elimina', async (c) => {
    const id = await crearPeriodo(c, '2091-1');
    const docente = (await c.query(`SELECT id FROM academic_work_plan."Docente" LIMIT 1`)).rows[0]?.id;
    if (!docente) { console.warn('  (sin docentes en esta base: prueba omitida)'); return; }
    await c.query(`INSERT INTO academic_work_plan."PlanTrabajoAcademico" ("docenteId", periodo, estado, "createdAt", "updatedAt") VALUES ($1, '2091-1', 'BORRADOR', now(), now())`, [docente]);
    const i = await impactoEliminacion(q(c), { id, codigo: '2091-1', estado: 'planeacion' });
    expect(i).toMatchObject({ eliminable: false, ptas: 1 });
    expect(i.motivo).toMatch(/PTA/);
  });
});
