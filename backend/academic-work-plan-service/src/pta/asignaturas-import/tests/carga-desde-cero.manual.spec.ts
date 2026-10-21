import { readFileSync } from 'fs';
import { DataSource } from 'typeorm';

import { AsignaturasImportService } from '../asignaturas-import.service';
import { ExcelParserService } from '../parsers/excel-parser.service';

/**
 * EFDS-2314 :: la carga masiva CONFIRMADA entra en un ambiente nuevo.
 *
 * Opt-in (no corre en la suite normal): ejecuta el importador del PTA, tal cual,
 * contra una base DESECHABLE donde ya corrieron las migraciones de Programación
 * Académica (incluida la 041). Es la prueba de que dev, donde la 007 corre antes
 * de la primera carga, no falla por ubicacion_semestral_etiqueta_key.
 *
 *   CARGA_DESDE_CERO_DB=esap_desechable CARGA_EXCEL=<ruta.xlsx> npx jest carga-desde-cero
 *
 * Nunca la apunte a una base compartida: escribe el catálogo.
 */
const DB = process.env.CARGA_DESDE_CERO_DB;
const EXCEL = process.env.CARGA_EXCEL;
const PERIODO = process.env.CARGA_PERIODO || '2050-1';

(DB && EXCEL ? describe : describe.skip)('EFDS-2314 :: carga masiva confirmada desde cero (base desechable)', () => {
  let ds: DataSource;
  beforeAll(async () => {
    if (DB === 'esap_db') throw new Error('Esta prueba escribe el catálogo: use una base desechable.');
    ds = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 55432),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASS || process.env.DB_PASSWORD || 'esap_secure_password_2024',
      database: DB,
    });
    await ds.initialize();
  });
  afterAll(async () => { if (ds?.isInitialized) await ds.destroy(); });

  it('la validación previa y la carga real coinciden, y la carga real entra', async () => {
    const svc = new AsignaturasImportService(ds, new ExcelParserService());
    const buffer = readFileSync(EXCEL!);
    const simulacion: any = await svc.importCatalog(buffer, true, PERIODO);
    const real: any = await svc.importCatalog(buffer, false, PERIODO);
    console.log('simulación:', JSON.stringify(simulacion.carga ?? simulacion.message));
    console.log('real:      ', JSON.stringify(real.carga ?? real.message ?? real.errors));
    expect(simulacion.success).toBe(true);
    expect(real.success).toBe(true);
    expect(real.carga).toEqual(simulacion.carga);
  });
});
