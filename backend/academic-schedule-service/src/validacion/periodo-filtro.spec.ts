import { Client } from 'pg';

import { ValidacionService } from './validacion.service.js';
import { HorariosService } from '../horarios/horarios.service.js';

/**
 * §1.0 :: el periodo como contexto — INVARIANTE del filtrado.
 *
 * Lo que el usuario reportó como incoherencia (27 cruces junto a 8 franjas) no
 * era del dato sino de la pantalla: Validación no estaba filtrada por periodo.
 * Estos canarios afirman el invariante que lo corrige, sobre datos reales:
 *   · un periodo SIN histórico (p. ej. 2026-2) → 0 cruces;
 *   · un periodo CON histórico (2026-1) → los suyos, y solo los suyos;
 *   · las franjas listadas de un periodo pertenecen todas a ese periodo.
 */
const conexion = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 55432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'esap_db',
};
const S = 'academic-schedule';

describe('§1.0 :: filtrado por periodo (agregado real)', () => {
  let client: Client | null = null;
  let hayBase = false;

  beforeAll(async () => {
    try { client = new Client(conexion); await client.connect(); hayBase = true; }
    catch { client = null; hayBase = false; }
  });
  afterAll(async () => { if (client) await client.end(); });

  const siHayBase = (n: string, fn: () => Promise<void>) =>
    it(n, async () => { if (!hayBase || !client) { console.warn('  (sin base: omitido)'); return; } await fn(); });

  const validacion = () => new ValidacionService({
    query: (sql: string, params?: any[]) => client!.query(sql, params).then((r) => r.rows),
  } as any);

  siHayBase('un periodo sin histórico da 0 cruces; 2026-1 da los suyos', async () => {
    const svc = validacion();
    const nuevos = await svc.crucesHistoricos('2027-1'); // no existe en el histórico
    expect(nuevos).toHaveLength(0);

    const del2026 = await svc.crucesHistoricos('2026-1');
    expect(del2026.length).toBeGreaterThan(0);
    // Y TODOS son de 2026-1: el filtro no deja colar otro periodo.
    expect(del2026.every((c) => c.periodo === '2026-1')).toBe(true);
  });

  siHayBase('la programación histórica abarca más de un periodo (por eso hay que filtrar)', async () => {
    // La causa raíz del reporte: el histórico mezcla periodos (2026-1, 2026-V1),
    // así que sin filtrar, Validación mostraba lo de 2026-1 mientras se programaba
    // en otro contexto. Los cruces detectados salen todos de 2026-1 (2026-V1 es
    // virtual y no cruza por aula), pero el DATO sí abarca varios periodos.
    const { rows } = await client!.query(
      `SELECT COUNT(DISTINCT periodo)::int AS n FROM "${S}".programacion_historica`);
    expect(rows[0].n).toBeGreaterThan(1);
  });

  siHayBase('listarTodas(idPeriodo) solo trae franjas de ESE periodo', async () => {
    // Fixture: periodo QA + grupo + 1 franja; y se verifica que el filtro por
    // otro periodo no la incluye, y por el suyo sí.
    const cod = `QA-P10-${Date.now().toString().slice(-6)}`;
    const p = await client!.query(
      `INSERT INTO "${S}".periodo_programacion (codigo,nombre,tipo,fecha_inicio,fecha_fin,estado)
       VALUES ($1,'QA','periodo_regular','2028-02-01','2028-06-15','activo') RETURNING id_periodo`, [cod]);
    const idPeriodo = p.rows[0].id_periodo;
    const g = await client!.query(
      `INSERT INTO "${S}".grupo (id_asignatura,id_periodo,numero_grupo,estado)
       VALUES (2,$1,910,'PROGRAMADO') RETURNING id_grupo`, [idPeriodo]);
    const idGrupo = g.rows[0].id_grupo;
    await client!.query(
      `INSERT INTO "${S}".franja_horaria (id_grupo,dia_semana,hora_inicio,hora_fin,tipo_sesion,estado)
       VALUES ($1,'DOMINGO','06:00'::time,'07:00'::time,'mediada_tecnologia','PROGRAMADO')`, [idGrupo]);
    try {
      const svc = new HorariosService(
        { query: (sql: string, params?: any[]) => client!.query(sql, params).then((r) => r.rows) } as any,
        {} as any,
      );
      const mias = await svc.listarTodas(idPeriodo);
      expect(mias.length).toBe(1);
      expect(mias.every((f) => f.idPeriodo === idPeriodo)).toBe(true);
      expect(mias[0].periodoCodigo).toBe(cod);

      // Otro periodo cualquiera (una de las semillas) no incluye mi franja.
      const otras = await svc.listarTodas('00000000-0000-0000-0000-000000000000');
      expect(otras.some((f) => f.idPeriodo === idPeriodo)).toBe(false);
    } finally {
      await client!.query(`DELETE FROM "${S}".grupo WHERE id_periodo=$1`, [idPeriodo]);
      await client!.query(`DELETE FROM "${S}".periodo_programacion WHERE id_periodo=$1`, [idPeriodo]);
    }
  });
});
