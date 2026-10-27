import { ForbiddenException } from '@nestjs/common';
import { Client } from 'pg';

import { JefaturaService } from './jefatura.service.js';

/**
 * EFDS-2304 :: la territorial de la jefatura sale también de la seccional de la
 * persona (pantalla GENÉRICA de usuarios) cuando su código ES el del RUND
 * (`auth.seccionales.cod_seccional = 'DT-009'`, como lo escribe la carga masiva
 * de estructura de auth). Sin tabla mantenida a mano. Agregado real con cuentas
 * QA PROPIAS en una transacción que se revierte (antes tomaba cuentas reales y
 * fallaba cuando la base cambiaba); de la base solo se usa el catálogo de seccionales.
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

  /** Cuenta QA sin fila propia de jefatura, cuya persona tiene la seccional de este código. */
  let n = 0;
  const cuenta = async (codSeccional: string) => {
    const documento = `99000005${String(++n).padStart(2, '0')}`;
    const idPerson = (await client!.query(
      `INSERT INTO auth.personas (id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, id_seccional)
       SELECT $1::bigint, $2, 'CC', 'Jefatura QA', 'Jefatura QA', 'N', sc.id_seccional FROM auth.seccionales sc WHERE sc.cod_seccional = $3
       RETURNING id_person::text AS id`, [Number(documento), documento, codSeccional])).rows[0]?.id;
    // Sin la seccional en el catálogo, la prueba no prueba nada: que falle.
    expect(idPerson).toBeDefined();
    return (await client!.query(
      `INSERT INTO auth."user" (id_user, username, password_hash, id_person) VALUES (gen_random_uuid(), $1, 'x', $2)
       RETURNING id_user::text AS id`, [`qa.jefatura.generica.${n}`, idPerson])).rows[0].id as string;
  };

  it('código del RUND en la seccional: da la territorial; catálogo heredado (HUI): no cruza', async () => {
    if (!hayBase || !client) { console.warn('  (sin base: omitido)'); return; }
    const svc = new JefaturaService({ query: (sql: string, p?: any[]) => client!.query(sql, p).then((r) => r.rows) } as any);
    await client.query('BEGIN');
    try {
      const conCodigoRund = await cuenta('SC');
      const heredada = await cuenta('HUI');
      expect((await svc.territorialDe(conCodigoRund)).codigo).toBe('SC');
      await expect(svc.territorialDe(heredada)).rejects.toBeInstanceOf(ForbiddenException);
    } finally {
      await client.query('ROLLBACK');
    }
  });
});
