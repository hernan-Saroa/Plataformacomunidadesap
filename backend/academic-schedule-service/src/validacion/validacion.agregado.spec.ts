import { Client } from 'pg';

import { ValidacionService } from './validacion.service.js';

/**
 * 3.9 :: cruces del histórico.
 *
 * El conteo depende ENTERAMENTE de la regla, así que el canario afirma la regla,
 * no un número redondo: ignorar el solape de CICLO infla el resultado, porque el
 * mismo salón a la misma hora en semanas distintas no es un cruce.
 */
const conexion = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 55432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'esap_db',
};

describe('3.9 :: cruces de la programacion historica', () => {
  let client: Client | null = null;
  let hayBase = false;

  beforeAll(async () => {
    try { client = new Client(conexion); await client.connect(); hayBase = true; }
    catch { client = null; hayBase = false; }
  });
  afterAll(async () => { if (client) await client.end(); });

  const siHayBase = (nombre: string, fn: () => Promise<void>) =>
    it(nombre, async () => {
      if (!hayBase || !client) { console.warn('  (sin base: omitido)'); return; }
      await fn();
    });

  siHayBase('el servicio real detecta cruces y los clasifica en aula y docente', async () => {
    const dataSource = { query: (sql: string) => client!.query(sql).then((r) => r.rows) };
    const servicio = new ValidacionService(dataSource as any);

    const cruces = await servicio.crucesHistoricos();
    const resumen = await servicio.resumen();

    expect(cruces.length).toBeGreaterThan(0);
    expect(resumen.total).toBe(resumen.aula + resumen.docente);
    expect(resumen.total).toBe(cruces.length);
    // Solo dos tipos, sin categorías sorpresa.
    expect([...new Set(cruces.map((c) => c.tipo))].sort()).toEqual(['aula', 'docente']);
    // Todo cruce trae las dos asignaturas implicadas: sin eso no es accionable.
    expect(cruces.every((c) => c.asignaturaA && c.asignaturaB)).toBe(true);
  });

  siHayBase('IGNORAR el ciclo infla el conteo: la regla exige solape de fechas', async () => {
    const cuenta = async (conFecha: boolean) => {
      const filtroFecha = conFecha
        ? "AND (a.fi IS NULL OR b.fi IS NULL OR (a.fi <= b.ff AND b.fi <= a.ff))"
        : '';
      const { rows } = await client!.query(
        `WITH base AS (
           SELECT id, periodo, dia, aula, hora_inicio, hora_fin,
                  NULLIF(fecha_inicio,'')::date AS fi, NULLIF(fecha_fin,'')::date AS ff
             FROM "academic-schedule".programacion_historica
            WHERE dia <> '' AND hora_inicio ~ '^[0-9]{2}:[0-9]{2}$' AND hora_fin ~ '^[0-9]{2}:[0-9]{2}$'
         )
         SELECT COUNT(*)::int AS n FROM base a JOIN base b
           ON a.id < b.id AND a.periodo = b.periodo AND a.dia = b.dia
          AND a.aula = b.aula AND a.aula <> ''
          AND a.hora_inicio < b.hora_fin AND b.hora_inicio < a.hora_fin ${filtroFecha}`);
      return rows[0].n as number;
    };

    const conCiclo = await cuenta(true);
    const sinCiclo = await cuenta(false);
    // Si alguien quita el solape de fechas, el conteo se dispara: eso delata
    // que se está contando como cruce lo que solo comparte franja semanal.
    expect(sinCiclo).toBeGreaterThan(conCiclo);
  });

  siHayBase('la programacion VIVA no tiene cruces de aula: el sistema los rechaza', async () => {
    // Es el contador del panel, y es 0 POR DISEÑO. Fuente distinta a la de
    // arriba: franja_horaria, no programacion_historica.
    const { rows } = await client!.query(
      `SELECT COUNT(*)::int AS n
         FROM "academic-schedule".franja_horaria a
         JOIN "academic-schedule".franja_horaria b
           ON a.id_franja < b.id_franja
          AND a.dia_semana = b.dia_semana
          AND a.aula_codigo = b.aula_codigo AND a.aula_codigo IS NOT NULL
          AND a.hora_inicio < b.hora_fin AND b.hora_inicio < a.hora_fin`);
    expect(rows[0].n).toBe(0);
  });
});
