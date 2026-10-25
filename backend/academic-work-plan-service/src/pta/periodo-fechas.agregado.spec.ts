// ⚠️ Antes de cargar nada: el servicio corre en UTC−5 (Colombia), que es donde el defecto
// se manifestaba. Con TZ=UTC la prueba pasaba aunque el código estuviera mal.
process.env.TZ = 'America/Bogota';

import { BadRequestException } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';

import { PeriodoAcademicoEntity } from './entities/periodo-academico.entity';
import { PeriodoAcademicoController } from './periodo-academico.controller';
import { fechaCivil } from './fecha-periodo';
import { PtaService } from './pta.service';

/**
 * Las fechas del periodo son fechas civiles: sin hora y sin zona. Con el servicio en
 * UTC−5 se guardaban un día antes («2049-12-14» quedaba «2049-12-13») porque pasaban
 * por `new Date('2049-12-14')` (medianoche UTC = 19:00 del día anterior).
 * Sobre la base real, en una transacción que se revierte.
 */
const CONFIG = {
  type: 'postgres' as const,
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 55432),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'esap_secure_password_2024',
  database: process.env.DB_NAME || 'esap_db',
  entities: [PeriodoAcademicoEntity],
  synchronize: false,
  logging: false,
};

describe('Periodo académico :: fechas civiles, con el servicio en UTC−5', () => {
  it('la prueba corre de verdad en UTC−5 (si no, no prueba nada)', () => {
    expect(new Date('2049-12-14').getDate()).toBe(13);
  });

  it('fechaCivil conserva el día y rechaza lo que no es calendario', () => {
    expect(fechaCivil('2049-12-14', 'x')).toBe('2049-12-14');
    expect(fechaCivil('2049-12-14T00:00:00.000Z', 'x')).toBe('2049-12-14');
    expect(fechaCivil('2048-02-29', 'x')).toBe('2048-02-29');
    for (const malo of ['2049-02-29', '2049-04-31', '2049-13-01', '14/12/2049', '', null, undefined, 20491214]) {
      expect(() => fechaCivil(malo, 'inválida')).toThrow(BadRequestException);
    }
  });

  let ds: DataSource | null = null;
  beforeAll(async () => {
    try { ds = await new DataSource(CONFIG).initialize(); } catch { ds = null; }
  }, 30000);
  afterAll(async () => { if (ds?.isInitialized) await ds.destroy(); });

  const caso = (nombre: string, fn: (qr: QueryRunner, c: PeriodoAcademicoController) => Promise<void>) =>
    it(nombre, async () => {
      if (!ds) { console.warn('  (sin base: omitido)'); return; }
      const qr = ds.createQueryRunner();
      await qr.connect();
      await qr.startTransaction();
      try {
        const pta = Object.create(PtaService.prototype) as PtaService;
        (pta as any).logger = { log: () => {}, warn: () => {} };
        (pta as any).ptaRepo = { manager: qr.manager };
        const c = new PeriodoAcademicoController(
          qr.manager.getRepository(PeriodoAcademicoEntity), pta,
          { resolveForUser: async () => ({ isSuperUser: false, permissions: new Set() }) } as any);
        await fn(qr, c);
      } finally {
        await qr.rollbackTransaction();
        await qr.release();
      }
    }, 30000);

  const guardadas = async (qr: QueryRunner, codigo: string) =>
    (await qr.query(
      `SELECT fecha_inicio::text AS i, fecha_fin::text AS f FROM academic_work_plan.periodo_academico WHERE codigo = $1`, [codigo]))[0];

  caso('crear guarda exactamente las fechas pedidas', async (qr, c) => {
    await c.create({ tipo: 'personalizado', anio: 2049, codigo: '2049-INT', nombre: 'Interperiodo 2049', fechaInicio: '2049-12-14', fechaFin: '2050-01-25' });
    expect(await guardadas(qr, '2049-INT')).toEqual({ i: '2049-12-14', f: '2050-01-25' });
  });

  caso('editar las fechas tampoco las corre un día', async (qr, c) => {
    const p = await c.create({ tipo: 'personalizado', anio: 2049, codigo: '2049-INT', nombre: 'Interperiodo 2049', fechaInicio: '2049-12-14', fechaFin: '2050-01-25' });
    await c.update(p.id, { fechaInicio: '2049-12-16', fechaFin: '2050-01-27' });
    expect(await guardadas(qr, '2049-INT')).toEqual({ i: '2049-12-16', f: '2050-01-27' });
  });

  caso('el cruce de fechas se evalúa sobre el día pedido, no sobre el anterior', async (qr, c) => {
    await c.create({ tipo: 'personalizado', anio: 2049, codigo: '2049-INT', nombre: 'Interperiodo 2049', fechaInicio: '2049-12-14', fechaFin: '2050-01-25' });
    // Empieza justo el día siguiente al fin del anterior: con el defecto se cruzaba por un día.
    const siguiente = await c.create({ tipo: 'personalizado', anio: 2050, codigo: '2050-VAC', nombre: 'Vacacional 2050', fechaInicio: '2050-01-26', fechaFin: '2050-02-10' });
    expect(siguiente).toMatchObject({ codigo: '2050-VAC' });
    expect(await guardadas(qr, '2050-VAC')).toEqual({ i: '2050-01-26', f: '2050-02-10' });
  });
});
