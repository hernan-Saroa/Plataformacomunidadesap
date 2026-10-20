import { ForbiddenException } from '@nestjs/common';
import { Client } from 'pg';

import { JefaturaService } from './jefatura.service.js';

/**
 * EFDS-2304 :: la territorial de la jefatura sale también de la seccional de la
 * persona (pantalla GENÉRICA de usuarios) cuando su código ES el del RUND
 * (`auth.seccionales.cod_seccional = 'DT-009'`, como lo escribe la carga masiva
 * de estructura de auth). Sin tabla mantenida a mano. Agregado real de SOLO
 * LECTURA sobre cuentas reales: no escribe en auth.
 */
const conexion = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 55432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'esap_db',
};

describe('EFDS-2304 :: territorial de la jefatura por el código de la seccional (agregado real)', () => {
  let client: Client | null = null;
  let hayBase = false;
  beforeAll(async () => {
    try { client = new Client(conexion); await client.connect(); hayBase = true; } catch { hayBase = false; }
  });
  afterAll(async () => { if (client) await client.end().catch(() => {}); });

  /** Una cuenta sin fila propia de jefatura cuya persona tiene una seccional de este código. */
  const cuenta = async (codSeccional: string) => (await client!.query(
    `SELECT u.id_user::text AS id FROM auth."user" u
       JOIN auth.personas p ON p.id_person = u.id_person
       JOIN auth.seccionales sc ON sc.id_seccional = p.id_seccional AND sc.cod_seccional = $1
      WHERE NOT EXISTS (SELECT 1 FROM "academic-schedule".jefatura_territorial j WHERE j.id_user = u.id_user)
      ORDER BY u.id_user LIMIT 1`, [codSeccional])).rows[0]?.id as string | undefined;

  it('código del RUND en la seccional: da la territorial; catálogo heredado (HUI): no cruza', async () => {
    if (!hayBase || !client) { console.warn('  (sin base: omitido)'); return; }
    const svc = new JefaturaService({ query: (sql: string, p?: any[]) => client!.query(sql, p).then((r) => r.rows) } as any);
    const conCodigoRund = await cuenta('SC');
    const heredada = await cuenta('HUI');
    // Si la base no tiene estas cuentas, la prueba no prueba nada: que falle.
    expect(conCodigoRund).toBeDefined();
    expect(heredada).toBeDefined();
    expect((await svc.territorialDe(conCodigoRund)).codigo).toBe('SC');
    await expect(svc.territorialDe(heredada)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
