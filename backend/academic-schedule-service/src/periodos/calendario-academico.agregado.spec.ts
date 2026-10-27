import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Client } from 'pg';

import { CalendarioAcademicoService } from './calendario-academico.service.js';

/**
 * EFDS-2347 :: festivos cargados y recesos por periodo, sobre la base real, en una
 * transacción que se revierte, con un periodo de plataforma propio (2050-1, el de
 * prueba de Claude).
 */
const conexion = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 55432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'esap_secure_password_2024',
  database: process.env.DB_NAME || 'esap_db',
};

describe('EFDS-2347 :: festivos y recesos (agregado real, en transacción)', () => {
  let client: Client | null = null;
  let hayBase = false;
  beforeAll(async () => {
    try { client = new Client(conexion); await client.connect(); hayBase = true; } catch { hayBase = false; }
  });
  afterAll(async () => { if (client) await client.end().catch(() => {}); });

  const servicio = () => new CalendarioAcademicoService({ query: (sql: string, p?: any[]) => client!.query(sql, p).then((r) => r.rows) } as any);
  const caso = (nombre: string, fn: (idPeriodo: string) => Promise<void>) =>
    it(nombre, async () => {
      if (!hayBase || !client) { console.warn('  (sin base: omitido)'); return; }
      await client.query('BEGIN');
      try {
        const existente = (await client.query(`SELECT id::text AS id FROM academic_work_plan.periodo_academico WHERE codigo = '2050-1'`)).rows[0];
        const id = existente?.id ?? (await client.query(
          `INSERT INTO academic_work_plan.periodo_academico (codigo, anio, semestre, fecha_inicio, fecha_fin, estado)
           VALUES ('2050-1', 2050, 1, '2050-02-01', '2050-06-15', 'planeacion') RETURNING id::text AS id`)).rows[0].id;
        await client.query(`UPDATE academic_work_plan.periodo_academico SET fecha_inicio = '2050-02-01', fecha_fin = '2050-06-15' WHERE id = $1::bigint`, [id]);
        await client.query(`DELETE FROM "academic-schedule".periodo_receso WHERE id_periodo_academico = $1::bigint`, [id]);
        await fn(id);
      } finally {
        await client.query('ROLLBACK');
      }
    });

  caso('festivos de 2026 y 2027 cargados (18 cada año); un año sin cargar se reporta', async () => {
    const s = servicio();
    expect(await s.festivos(2026)).toMatchObject({ cargados: true });
    expect((await s.festivos(2026)).festivos).toHaveLength(18);
    expect((await s.festivos(2027)).festivos).toHaveLength(18);
    expect((await s.festivos(2027)).festivos[0]).toEqual({ fecha: '2027-01-01', nombre: 'Año Nuevo' });
    expect(await s.festivos(2031)).toEqual({ anio: 2031, cargados: false, festivos: [] });
  });

  caso('un receso se registra dentro del periodo, con motivo, y se quita', async (id) => {
    const s = servicio();
    await expect(s.crearReceso(id, { fechaInicio: '2050-01-20', fechaFin: '2050-01-25', motivo: 'Fuera' }, null))
      .rejects.toThrow(/dentro del periodo/);
    await expect(s.crearReceso(id, { fechaInicio: '2050-04-10', fechaFin: '2050-04-03', motivo: 'Al revés' }, null))
      .rejects.toBeInstanceOf(BadRequestException);
    await expect(s.crearReceso(id, { fechaInicio: '2050-04-04', fechaFin: '2050-04-10', motivo: ' ' }, null))
      .rejects.toThrow(/motivo/);
    const { idReceso, recesos } = await s.crearReceso(id, { fechaInicio: '2050-04-04', fechaFin: '2050-04-10', motivo: 'Semana de receso' }, 'qa');
    expect(recesos).toEqual([{ idReceso, fechaInicio: '2050-04-04', fechaFin: '2050-04-10', motivo: 'Semana de receso', creadoPor: 'qa' }]);
    expect((await s.quitarReceso(id, idReceso)).recesos).toEqual([]);
    await expect(s.quitarReceso(id, idReceso)).rejects.toBeInstanceOf(NotFoundException);
  });
});
