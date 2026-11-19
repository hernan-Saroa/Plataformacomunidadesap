import { readFileSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';

/**
 * EFDS-2447 — Retiro de los datos semilla (migración 082) con el SQL REAL, en una
 * transacción que se revierte.
 *
 * Lo que garantiza: si en el ambiente hay un periodo del PTA con el MISMO código que un
 * periodo viejo sembrado (2026-1), la limpieza no lo toca, ni a nada que dependa de él:
 * ninguna fila de ninguna tabla del esquema del PTA cambia, y el periodo viejo que tiene
 * algo ligado al PTA se conserva entero. Lo que no tiene nada del PTA se retira entero.
 */
const conexion = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 55432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'esap_db',
};
const S = '"academic-schedule"';
const MIGRACION = readFileSync(join(__dirname, '../../db/migrations/082_retirar_datos_semilla_sin_tocar_pta.sql'), 'utf8');

describe('EFDS-2447 :: retiro de datos semilla sin tocar el PTA (agregado real)', () => {
  let client: Client | null = null;
  let hayBase = false;

  beforeAll(async () => {
    try { client = new Client(conexion); await client.connect(); hayBase = true; } catch { client = null; hayBase = false; }
  }, 20000);
  afterAll(async () => { await client?.end().catch(() => undefined); });

  const uno = async (c: Client, sql: string, p: unknown[] = []) => (await c.query(sql, p as any[])).rows[0];

  /** Conteo de filas de CADA tabla del esquema del PTA: la limpieza no puede mover ninguno. */
  const fotoPta = async (c: Client) => {
    const tablas = (await c.query(
      `SELECT format('%I.%I', schemaname, tablename) AS t FROM pg_tables WHERE schemaname = 'academic_work_plan' ORDER BY 1`)).rows;
    const foto: Record<string, number> = {};
    for (const { t } of tablas) foto[t] = Number((await uno(c, `SELECT COUNT(*) AS n FROM ${t}`)).n);
    return foto;
  };

  const periodoViejo = async (c: Client, codigo: string) => (await uno(c,
    `INSERT INTO ${S}.periodo_programacion (codigo, nombre, tipo, fecha_inicio, fecha_fin)
     VALUES ($1, $1, 'periodo_regular', '2026-02-01', '2026-06-15')
     ON CONFLICT (codigo) DO UPDATE SET codigo = EXCLUDED.codigo RETURNING id_periodo`, [codigo])).id_periodo as string;

  it('un periodo del PTA con el código 2026-1 y todo lo que depende de él quedan intactos', async () => {
    if (!hayBase || !client) { console.warn('  (sin base: prueba omitida)'); return; }
    const c = client;
    await c.query('BEGIN');
    try {
      const asig = (await uno(c, `SELECT id FROM academic_work_plan.asignatura ORDER BY id LIMIT 1`))?.id;
      const docenteRund = (await uno(c, `SELECT id FROM academic_work_plan."Docente" LIMIT 1`))?.id;
      const persona = (await uno(c, `SELECT id_person FROM auth.personas LIMIT 1`))?.id_person;
      if (!asig || !docenteRund || !persona) throw new Error('Fixture incompleto: la base no tiene asignaturas, docentes o personas.');

      // El periodo REAL del PTA, con el mismo código que el periodo viejo sembrado, y un PTA en él.
      const pta = (await uno(c, `SELECT id::text AS id FROM academic_work_plan.periodo_academico WHERE codigo = '2026-1'`))?.id
        ?? (await uno(c,
          `INSERT INTO academic_work_plan.periodo_academico (codigo, anio, semestre, fecha_inicio, fecha_fin, estado)
           VALUES ('2026-1', 2026, 1, '2026-02-01', '2026-06-15', 'cerrado') RETURNING id::text AS id`)).id;
      await c.query(
        `INSERT INTO academic_work_plan."PlanTrabajoAcademico" ("docenteId", periodo, estado, "createdAt", "updatedAt")
         VALUES ($1, '2026-1', 'BORRADOR', now(), now())`, [docenteRund]);

      // Periodo viejo 2026-1 con un grupo YA reapuntado al periodo del PTA y una concertación
      // cuya decisión de docencia está registrada en el PTA.
      const viejo1 = await periodoViejo(c, '2026-1');
      const gPta = (await uno(c,
        `INSERT INTO ${S}.grupo (id_asignatura, id_periodo, id_periodo_academico, tipo_oferta, numero_grupo, estado)
         VALUES ($1, $2, $3, 'periodo_regular', 9701, 'PROGRAMADO') RETURNING id_grupo`, [asig, viejo1, pta])).id_grupo;
      await c.query(`INSERT INTO ${S}.franja_horaria (id_grupo, dia_semana, hora_inicio, hora_fin) VALUES ($1, 'LUNES', '08:00', '10:00')`, [gPta]);
      const conc1 = (await uno(c,
        `INSERT INTO ${S}.concertacion_docencia (id_docente, periodo_ref, nivel, estado, horas, franjas, huella)
         VALUES ($1, $2, 'pregrado', 'APROBADA', 32, '[]'::jsonb, 'x') RETURNING id_concertacion`, [persona, viejo1])).id_concertacion;
      await c.query(
        `INSERT INTO academic_work_plan.docencia_concertada (id_concertacion, documento_docente, periodo, nivel, horas, huella, asignaturas, firmas)
         VALUES ($1, '0', '2026-1', 'pregrado', 32, repeat('a', 64), '[]', '[]')`, [conc1]);
      // Un grupo DEMO que ya está en un periodo del PTA tampoco se toca.
      const gDemoPta = (await uno(c,
        `INSERT INTO ${S}.grupo (id_asignatura, id_periodo_academico, tipo_oferta, numero_grupo, estado, observaciones)
         VALUES ($1, $2, 'periodo_regular', 9702, 'PROGRAMADO', 'DEMO') RETURNING id_grupo`, [asig, pta])).id_grupo;

      // Periodo viejo 2026-V2 SIN nada del PTA: se retira entero.
      const viejoV2 = await periodoViejo(c, '2026-V2');
      const gViejo = (await uno(c,
        `INSERT INTO ${S}.grupo (id_asignatura, id_periodo, numero_grupo, estado) VALUES ($1, $2, 9703, 'PROGRAMADO') RETURNING id_grupo`,
        [asig, viejoV2])).id_grupo;
      await c.query(`INSERT INTO ${S}.franja_horaria (id_grupo, dia_semana, hora_inicio, hora_fin) VALUES ($1, 'MARTES', '08:00', '10:00')`, [gViejo]);
      await c.query(
        `INSERT INTO ${S}.concertacion_docencia (id_docente, periodo_ref, nivel, estado, horas, franjas, huella)
         VALUES ($1, $2, 'pregrado', 'ENVIADA', 32, '[]'::jsonb, 'y')`, [persona, viejoV2]);
      // Un periodo viejo creado por un usuario (no es semilla): se conserva.
      const deUsuario = await periodoViejo(c, '2091-Z');
      await c.query(`INSERT INTO ${S}.programacion_historica (periodo, asignatura) VALUES ('2026-1', 'Fila de prueba')`);

      const antes = await fotoPta(c);
      await c.query(MIGRACION);
      await c.query(MIGRACION); // idempotente: una segunda pasada no falla ni cambia nada del PTA

      expect(await fotoPta(c)).toEqual(antes);
      const existe = async (sql: string, p: unknown[]) => Number((await uno(c, `SELECT COUNT(*) AS n FROM ${sql}`, p)).n);
      expect(await existe(`academic_work_plan.periodo_academico WHERE id = $1::bigint AND codigo = '2026-1'`, [pta])).toBe(1);
      expect(await existe(`academic_work_plan.docencia_concertada WHERE id_concertacion = $1`, [conc1])).toBe(1);
      // El periodo viejo con algo del PTA se conserva ENTERO.
      expect(await existe(`${S}.periodo_programacion WHERE id_periodo = $1`, [viejo1])).toBe(1);
      expect(await existe(`${S}.grupo WHERE id_grupo = $1`, [gPta])).toBe(1);
      expect(await existe(`${S}.franja_horaria WHERE id_grupo = $1`, [gPta])).toBe(1);
      expect(await existe(`${S}.concertacion_docencia WHERE id_concertacion = $1`, [conc1])).toBe(1);
      expect(await existe(`${S}.grupo WHERE id_grupo = $1`, [gDemoPta])).toBe(1);
      expect(await existe(`${S}.periodo_programacion WHERE id_periodo = $1`, [deUsuario])).toBe(1);
      // El que no tiene nada del PTA se retira entero.
      expect(await existe(`${S}.periodo_programacion WHERE id_periodo = $1`, [viejoV2])).toBe(0);
      expect(await existe(`${S}.grupo WHERE id_grupo = $1`, [gViejo])).toBe(0);
      expect(await existe(`${S}.franja_horaria WHERE id_grupo = $1`, [gViejo])).toBe(0);
      expect(await existe(`${S}.concertacion_docencia WHERE periodo_ref = $1`, [viejoV2])).toBe(0);
      expect(await existe(`${S}.programacion_historica WHERE true`, [])).toBe(0);
    } finally {
      await c.query('ROLLBACK');
    }
  }, 60000);
});
