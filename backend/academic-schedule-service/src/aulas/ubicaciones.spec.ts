import { Client } from 'pg';

import { AulasService } from './aulas.service.js';

/**
 * §3.3 :: territoriales y CETAPs para el formulario de aulas (selectores).
 *
 * Invariante: los CETAPs que alimentan el selector encadenado son SIEMPRE de la
 * territorial pedida —nunca se mezclan—, que es lo que sostiene «CETAP filtrado
 * por la territorial elegida». Y hay 17 territoriales activas.
 */
const conexion = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 55432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'esap_db',
};

describe('§3.3 :: territoriales y CETAPs (agregado real)', () => {
  let client: Client | null = null;
  let hayBase = false;

  beforeAll(async () => {
    try { client = new Client(conexion); await client.connect(); hayBase = true; }
    catch { client = null; hayBase = false; }
  });
  afterAll(async () => { if (client) await client.end(); });

  const svc = () => new AulasService({
    query: (sql: string, params?: any[]) => client!.query(sql, params).then((r) => r.rows),
  } as any);

  const siHayBase = (n: string, fn: () => Promise<void>) =>
    it(n, async () => { if (!hayBase || !client) { console.warn('  (sin base: omitido)'); return; } await fn(); });

  siHayBase('hay 17 territoriales activas', async () => {
    const t = await svc().territoriales();
    expect(t.length).toBe(17);
    expect(t.every((x) => x.codigo && x.nombre)).toBe(true);
  });

  siHayBase('los CETAPs de una territorial son SOLO de esa territorial', async () => {
    const s = svc();
    const terr = await s.territoriales();
    const antioquia = terr.find((t) => t.nombre === 'ANTIOQUIA');
    expect(antioquia).toBeDefined();

    const cetaps = await s.cetaps(antioquia!.id);
    expect(cetaps.length).toBeGreaterThan(0);

    // Verificación directa contra la base: ningún CETAP devuelto pertenece a otra.
    const { rows } = await client!.query(
      `SELECT COUNT(*)::int AS ajenos FROM academic_work_plan.cetap
        WHERE codigo = ANY($1::text[]) AND id_direccion_territorial <> $2`,
      [cetaps.map((c) => c.codigo), antioquia!.id]);
    expect(rows[0].ajenos).toBe(0);
  });

  siHayBase('sin territorial no hay CETAPs (no se escribe a mano)', async () => {
    expect(await svc().cetaps(0)).toEqual([]);
  });
});
