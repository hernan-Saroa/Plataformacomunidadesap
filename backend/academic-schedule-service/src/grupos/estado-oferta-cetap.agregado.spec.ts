import { Client } from 'pg';

import { estadoOfertasCetap } from './oferta-cetap.js';
import { GruposService } from './grupos.service.js';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { crearAsignatura, crearOferta, crearPeriodo } = require('../../test/catalogo-qa.cjs');

/**
 * Por qué el selector de «Oferta CETAP» puede salir vacío: el periodo no tiene la carga del
 * Excel, o la tiene sin el programa de la asignatura. El diagnóstico lo dice en vez de dejar un
 * selector mudo. Sobre la base real, en una transacción que se revierte, con datos propios.
 */
const conexion = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 55432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'esap_db',
};

describe('estado de la oferta CETAP de una asignatura en un periodo (agregado real)', () => {
  let client: Client | null = null;
  let hayBase = false;
  let codigoCetap = '';
  beforeAll(async () => {
    try {
      client = new Client(conexion);
      await client.connect();
      // Un CETAP cualquiera del catálogo: la prueba no depende de cuál sea.
      codigoCetap = (await client.query(`SELECT codigo FROM academic_work_plan.cetap ORDER BY id LIMIT 1`)).rows[0]?.codigo ?? '';
      hayBase = !!codigoCetap;
      if (!hayBase) console.warn('  (sin CETAP en la base: omitido)');
    } catch { hayBase = false; }
  });
  afterAll(async () => { if (client) await client.end().catch(() => {}); });
  const q = { query: (sql: string, p?: any[]) => client!.query(sql, p).then((r) => r.rows) };

  const caso = (nombre: string, fn: () => Promise<void>) =>
    it(nombre, async () => {
      if (!hayBase || !client) { console.warn('  (sin base: omitido)'); return; }
      await client.query('BEGIN');
      try { await fn(); } finally { await client.query('ROLLBACK'); }
    });

  caso('periodo sin ninguna oferta cargada: dice que falta importar el Excel del periodo', async () => {
    const periodo = await crearPeriodo(client, { codigo: '2097-1', anio: 2097 });
    const asig = await crearAsignatura(client);
    const e = await estadoOfertasCetap(q, asig.idAsignatura, periodo.idPeriodo);
    expect(e).toMatchObject({ periodoCodigo: '2097-1', ofertasDelPeriodo: 0, ofertasDelPrograma: 0, sinTerritorial: 0 });
    expect(e.cetapsCatalogo).toBeGreaterThan(0);
    expect(e.motivo).toMatch(/2097-1 no tiene la oferta por CETAP cargada.*importar el Excel del catálogo para este periodo/);
  });

  caso('el periodo tiene ofertas, pero de otro programa: dice que ese programa no se ofrece', async () => {
    const periodo = await crearPeriodo(client, { codigo: '2097-2', anio: 2097, semestre: 2 });
    const asig = await crearAsignatura(client);
    const otro = await crearAsignatura(client);
    await crearOferta(client, { idPrograma: otro.idPrograma, idPeriodo: periodo.idPeriodo, codigoCetap });
    const e = await estadoOfertasCetap(q, asig.idAsignatura, periodo.idPeriodo);
    expect(e).toMatchObject({ ofertasDelPeriodo: 1, ofertasDelPrograma: 0 });
    expect(e.motivo).toMatch(/tiene 1 ofertas cargadas, pero ninguna del programa/);
  });

  caso('con oferta del programa hay qué elegir: el motivo, si lo hay, es solo por territorial sin vincular', async () => {
    const periodo = await crearPeriodo(client, { codigo: '2097-3', anio: 2097, semestre: 1 });
    const asig = await crearAsignatura(client);
    await crearOferta(client, { idPrograma: asig.idPrograma, idPeriodo: periodo.idPeriodo, codigoCetap });
    const e = await estadoOfertasCetap(q, asig.idAsignatura, periodo.idPeriodo);
    expect(e).toMatchObject({ ofertasDelPeriodo: 1, ofertasDelPrograma: 1 });
    if (e.motivo) expect(e.motivo).toMatch(/no tienen territorial vinculada/);
    expect(e.sinTerritorial === 0 ? e.motivo : 'x').toBeNull();
  });

  caso('un periodo legado no tiene ofertas por CETAP: lo dice el servicio', async () => {
    const servicio = new GruposService({ manager: { query: q.query } } as any, {} as any);
    const e = await servicio.estadoOfertasCetap('1', '7f9b7a3e-1c2d-4e5f-8a9b-0c1d2e3f4a5b');
    expect(e.periodoModelo).toBe('legado');
    expect(e.motivo).toMatch(/modelo anterior \(legado\)/);
  });
});
