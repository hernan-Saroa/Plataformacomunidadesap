import { ForbiddenException } from '@nestjs/common';
import { Client } from 'pg';

import { JefaturaService } from './jefatura.service.js';

/**
 * EFDS-2304 :: la territorial de la jefatura se asigna desde la pantalla
 * GENÉRICA de usuarios (la seccional de la persona) y se traduce con la
 * equivalencia explícita (migración 038). Agregado real, en transacción
 * revertida; requiere la propuesta local de equivalencias cargada.
 */
const conexion = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 55432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'esap_db',
};

describe('EFDS-2304 :: territorial de la jefatura por la seccional de la persona (agregado real)', () => {
  let client: Client | null = null;
  let hayBase = false;
  beforeAll(async () => {
    try {
      client = new Client(conexion); await client.connect();
      const n = (await client.query(`SELECT COUNT(*)::int AS n FROM "academic-schedule".equivalencia_territorial`)).rows[0].n;
      hayBase = n > 0;
      if (!hayBase) console.warn('  (sin equivalencias cargadas: omitido)');
    } catch { hayBase = false; }
  });
  afterAll(async () => { if (client) await client.end().catch(() => {}); });

  it('sin fila propia, la seccional Huila da la territorial DT-009; Quindio (sin mapear) no da ninguna', async () => {
    if (!hayBase || !client) return;
    const svc = new JefaturaService({ query: (sql: string, p?: any[]) => client!.query(sql, p).then((r) => r.rows) } as any);
    await client.query('BEGIN');
    try {
      const u = (await client.query(
        `SELECT u.id_user::text AS id FROM auth."user" u
          WHERE u.id_person IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM "academic-schedule".jefatura_territorial j WHERE j.id_user = u.id_user)
          ORDER BY u.id_user LIMIT 1`)).rows[0].id;
      const seccional = (id: number) => client!.query(
        `UPDATE auth.personas SET id_seccional = $2 WHERE id_person = (SELECT id_person FROM auth."user" WHERE id_user::text = $1)`, [u, id]);

      await seccional(10); // HUI
      expect((await svc.territorialDe(u)).codigo).toBe('DT-009');

      await seccional(13); // QUI: no tiene territorial en el RUND
      await expect(svc.territorialDe(u)).rejects.toBeInstanceOf(ForbiddenException);
    } finally {
      await client.query('ROLLBACK');
    }
  });
});
