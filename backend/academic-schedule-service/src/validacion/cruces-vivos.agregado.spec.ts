import { Client } from 'pg';

import { ValidacionService } from './validacion.service.js';

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
    const conteo = await servicio().crucesVivos();
    expect(conteo.cruces).toEqual([]);
    expect(conteo.total).toBe(0);
  });

  it('el conteo detecta cruces de aula, docente y grupo, y acota por periodo', async () => {
    if (!hayBase || !client) { console.warn('  (sin base: omitido)'); return; }
    await client.query('BEGIN');
    try {
      const a = await client.query(`SELECT id FROM academic_work_plan.asignatura ORDER BY id LIMIT 1`);
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
});
