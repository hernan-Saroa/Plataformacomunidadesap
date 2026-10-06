/**
 * EFDS-1309 — La migración 453 recalcula en SQL el plazo que calcularPlazo()
 * calcula en TypeScript, desde GREATEST(regreso, pago).
 * Esta prueba ejecuta la migración dentro de una
 * transacción que siempre se revierte y compara ambos cálculos día por día.
 * No deja cambios en la base.
 *
 *   RUN_DB_TESTS=1 npx jest src/modules/legalizacion/__tests__/plazo-migracion-453.db.spec.ts
 */
import { config as cargarEnv } from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';
import { DataSource, QueryRunner } from 'typeorm';
import { calcularPlazo } from '../plazo-legalizacion.util';

cargarEnv();
const describirConBase = process.env.RUN_DB_TESTS === '1' ? describe : describe.skip;

const MIGRACION = readFileSync(
  join(__dirname, '../../../../db/migrations/453_plazo_legalizacion_desde_regreso.sql'),
  'utf8',
);

describirConBase('EFDS-1309 — migración 453: plazo desde GREATEST(regreso, pago) (base real, con ROLLBACK)', () => {
  let ds: DataSource;
  let qr: QueryRunner;
  let festivos: Set<string>;

  beforeAll(async () => {
    ds = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
    });
    await ds.initialize();
    const filas: { f: string }[] = await ds.query(`SELECT to_char(fecha, 'YYYY-MM-DD') AS f FROM auth.festivos_colombia`);
    festivos = new Set(filas.map((x) => x.f));
    qr = ds.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    await qr.query(MIGRACION);
  });

  afterAll(async () => {
    await qr?.rollbackTransaction();
    await qr?.release();
    await ds?.destroy();
  });

  it('SQL y TypeScript coinciden para cada regreso de 2026, con pago antes, el mismo día, después o sin pago', async () => {
    const diferencias: string[] = [];
    // Desfase del pago respecto del regreso, en días; null = sin fecha de pago.
    const desfases = [-10, 0, 3, 20, null];
    for (const [dias, horaCorte] of [[5, '16:30'], [1, '00:00'], [10, '17:00']] as const) {
      const filas: { regreso: string; pago: string | null; base: Date; limite: Date; incompleto: boolean }[] = await qr.query(
        `SELECT to_char(r, 'YYYY-MM-DD') AS regreso, to_char(r::date + d.n, 'YYYY-MM-DD') AS pago,
                p.fecha_base_plazo AS base, p.fecha_limite AS limite, p.calendario_incompleto AS incompleto
           FROM generate_series(DATE '2026-01-01', DATE '2026-12-31', INTERVAL '1 day') r
          CROSS JOIN unnest($3::int[]) AS d(n)
          CROSS JOIN LATERAL pg_temp.plazo_legalizacion(GREATEST(r::date, r::date + d.n), $1, $2) p`,
        [dias, horaCorte, desfases],
      );
      expect(filas).toHaveLength(365 * desfases.length);
      for (const f of filas) {
        const ts = calcularPlazo({ fechaFinComisionYmd: f.regreso, fechaPagoYmd: f.pago, plazoDiasHabiles: dias, horaCorte, festivos });
        if (
          ts.fechaBasePlazo.getTime() !== new Date(f.base).getTime() ||
          ts.fechaLimite.getTime() !== new Date(f.limite).getTime() ||
          ts.calendarioIncompleto !== f.incompleto
        ) {
          diferencias.push(`${f.regreso}+${f.pago}/${dias}: sql=${new Date(f.limite).toISOString()} ts=${ts.fechaLimite.toISOString()}`);
        }
      }
    }
    expect(diferencias).toEqual([]);
  });

  it('deja cada legalización abierta con el plazo que calcularPlazo() le daría; las cerradas no cambian', async () => {
    const filas: {
      regreso: string; pago: string | null; dias: number; hora: string; base: Date; limite: Date; incompleto: boolean; cerrada: boolean;
    }[] = await qr.query(
      `SELECT to_char(s.fecha_fin, 'YYYY-MM-DD') AS regreso, to_char(s.fecha_pago, 'YYYY-MM-DD') AS pago,
              l.plazo_dias_habiles AS dias, l.hora_corte AS hora,
              l.fecha_base_plazo AS base, l.fecha_limite AS limite, l.calendario_incompleto AS incompleto,
              l.cerrada_en IS NOT NULL AS cerrada
         FROM travel_expenses.legalizaciones_comision l
         JOIN travel_expenses.solicitudes_comision s ON s.id = l.solicitud_id`,
    );
    const antes: { id: string; limite: Date }[] = await ds.query(
      `SELECT id, fecha_limite AS limite FROM travel_expenses.legalizaciones_comision WHERE cerrada_en IS NOT NULL`,
    );
    const cerradasDespues: { id: string; limite: Date }[] = await qr.query(
      `SELECT id, fecha_limite AS limite FROM travel_expenses.legalizaciones_comision WHERE cerrada_en IS NOT NULL`,
    );
    expect(cerradasDespues.map((x) => [x.id, new Date(x.limite).getTime()]).sort())
      .toEqual(antes.map((x) => [x.id, new Date(x.limite).getTime()]).sort());

    const malas = filas
      .filter((f) => !f.cerrada)
      .filter((f) => {
        const ts = calcularPlazo({ fechaFinComisionYmd: f.regreso, fechaPagoYmd: f.pago, plazoDiasHabiles: f.dias, horaCorte: f.hora, festivos });
        return ts.fechaLimite.getTime() !== new Date(f.limite).getTime() ||
          ts.fechaBasePlazo.getTime() !== new Date(f.base).getTime() ||
          ts.calendarioIncompleto !== f.incompleto;
      });
    expect(malas).toEqual([]);
  });

  it('es idempotente: aplicarla dos veces no cambia nada más', async () => {
    const [{ n }] = await qr.query(
      `WITH nuevo AS (
         SELECT l.id, p.fecha_limite
           FROM travel_expenses.legalizaciones_comision l
           JOIN travel_expenses.solicitudes_comision s ON s.id = l.solicitud_id
          CROSS JOIN LATERAL pg_temp.plazo_legalizacion(GREATEST(s.fecha_fin::date, s.fecha_pago), l.plazo_dias_habiles, l.hora_corte) p
          WHERE l.cerrada_en IS NULL)
       SELECT COUNT(*)::int AS n FROM nuevo JOIN travel_expenses.legalizaciones_comision l USING (id)
        WHERE l.fecha_limite IS DISTINCT FROM nuevo.fecha_limite`,
    );
    expect(n).toBe(0);
  });
});
