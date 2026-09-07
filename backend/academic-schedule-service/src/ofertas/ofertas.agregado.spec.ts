import { Client } from 'pg';

import { OfertasService } from './ofertas.service.js';

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

  // ---------------------------------------------------------------------------
  // NUEVA-5a :: ciclo de vida del periodo (migración 018)
  // ---------------------------------------------------------------------------

  siHayBase('los 5 periodos quedaron en estado activo tras el backfill', async () => {
    const { rows } = await client!.query(
      `SELECT estado, count(*)::int AS n
         FROM "academic-schedule".periodo_programacion
        GROUP BY estado`,
    );
    const porEstado = Object.fromEntries(rows.map((r) => [r.estado, r.n]));
    expect(porEstado).toEqual({ activo: 5 });
  });

  siHayBase('is_activo no existe: una sola fuente de verdad del ciclo', async () => {
    // Canario anti-regresión del patrón que costó EFDS-1536/1539: dos campos
    // que pueden contradecirse sobre el mismo concepto. Si alguien reintroduce
    // is_activo "por prudencia", esto falla.
    const { rows } = await client!.query(
      `SELECT count(*)::int AS n
         FROM information_schema.columns
        WHERE table_schema = 'academic-schedule'
          AND table_name   = 'periodo_programacion'
          AND column_name  = 'is_activo'`,
    );
    expect(rows[0].n).toBe(0);
  });

  siHayBase('el DTO deriva activo=true en los cinco (contrato intacto)', async () => {
    // Ejercita el servicio REAL —su SQL y su derivación—, no una copia de la
    // regla: el DataSource se sustituye por el cliente pg de esta suite.
    const dataSource = { query: (sql: string) => client!.query(sql).then((r) => r.rows) };
    const servicio = new OfertasService(dataSource as any, null as any);

    const ofertas = await servicio.listar();

    expect(ofertas).toHaveLength(5);
    expect(ofertas.every((o) => o.activo === true)).toBe(true);
    expect(ofertas.map((o) => o.codigo).sort()).toEqual(
      ['2026-1', '2026-2', '2026-INT', '2026-V1', '2026-V2'],
    );
  });
});
