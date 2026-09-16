import { Client } from 'pg';

/**
 * EFDS-1375 :: AC :: las cinco ofertas académicas.
 *
 * Canario AGREGADO sobre la base: exactamente cinco ofertas, con la partición
 * conocida por tipo — dos periodos regulares, dos de créditos virtuales, un
 * interperiodo. Un conteo suelto podría cuadrar mal; se verifica la composición.
 */
const conexion = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 55432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'esap_db',
};

describe('EFDS-1375 :: las cinco ofertas academicas (agregado real)', () => {
  let client: Client | null = null;
  let hayBase = false;

  beforeAll(async () => {
    try {
      client = new Client(conexion);
      await client.connect();
      hayBase = true;
    } catch {
      client = null;
      hayBase = false;
    }
  });

  afterAll(async () => { if (client) await client.end(); });

  const siHayBase = (nombre: string, fn: () => Promise<void>) =>
    it(nombre, async () => {
      if (!hayBase || !client) { console.warn('  (sin base: omitido)'); return; }
      await fn();
    });

  siHayBase('hay exactamente 2 regulares, 2 virtuales y 1 interperiodo', async () => {
    const { rows } = await client!.query(
      `SELECT tipo, count(*)::int AS n
         FROM "academic-schedule".periodo_programacion
        WHERE tipo IS NOT NULL
        GROUP BY tipo`,
    );
    const porTipo = Object.fromEntries(rows.map((r) => [r.tipo, r.n]));
    expect(porTipo['periodo_regular']).toBe(2);
    expect(porTipo['creditos_virtual']).toBe(2);
    expect(porTipo['interperiodo']).toBe(1);
  });

  siHayBase('el acumulado por oferta suma exactamente el total (invariante de 1375)', async () => {
    // La acumulacion por semestre ENTRE ofertas es Σ(porOferta). Se verifica el
    // invariante sobre datos reales: el total transversal es la suma de las
    // asignaciones agrupadas por periodo, sin importar cuantas ofertas haya.
    const { rows } = await client!.query(
      `SELECT COALESCE(SUM(horas_asignadas),0)::int AS total_directo,
              (SELECT COALESCE(SUM(h),0)::int FROM (
                 SELECT SUM(horas_asignadas) AS h
                   FROM "academic-schedule".asignacion_docente ad
                   JOIN "academic-schedule".grupo g ON g.id_grupo = ad.id_grupo
                  WHERE ad.estado = 'ASIGNADO'
                  GROUP BY g.id_periodo) t) AS total_por_oferta
         FROM "academic-schedule".asignacion_docente WHERE estado='ASIGNADO'`,
    );
    expect(rows[0].total_directo).toBe(rows[0].total_por_oferta);
  });
});
