import { BadRequestException } from '@nestjs/common';
import { Client } from 'pg';

import { aulasQueNoCoinciden, exigirAulaDeLaOferta, ofertasCetapDe, validarOfertaDelGrupo } from './oferta-cetap.js';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { crearAsignatura, crearOferta, crearEscenarioDeOferta } = require('../../test/catalogo-qa.cjs');

/**
 * EFDS-2315 :: el grupo sabe dónde se dicta (oferta CETAP, migración 040).
 *
 * Agregado sobre la base real, en una transacción que se revierte, con un catálogo
 * y unas ofertas propios de la prueba (no depende de ninguna carga previa).
 */
const conexion = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 55432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'esap_db',
};
const S = 'academic-schedule';

describe('EFDS-2315 :: oferta CETAP del grupo (agregado real, en transacción)', () => {
  let client: Client | null = null;
  let hayBase = false;
  beforeAll(async () => {
    try { client = new Client(conexion); await client.connect(); hayBase = true; } catch { hayBase = false; }
  });
  afterAll(async () => { if (client) await client.end().catch(() => {}); });
  const q = { query: (sql: string, p?: any[]) => client!.query(sql, p).then((r) => r.rows) };

  interface Fx { periodo: string; asignatura: string; grupo: string; ofertaPropia: string; ofertaAjena: string }
  const caso = (nombre: string, fn: (f: Fx) => Promise<void>) =>
    it(nombre, async () => {
      if (!hayBase || !client) { console.warn('  (sin base: omitido)'); return; }
      await client.query('BEGIN');
      try {
        // Escenario propio de la transacción: una asignatura con oferta en Neiva (CET-0135) y otro programa con oferta
        // en el mismo periodo (la «ajena»). Nada depende de lo que haya cargado en la base local.
        const esc = await crearEscenarioDeOferta(client, { periodo: { codigo: '2098-1', anio: 2098 } });
        const otro = await crearAsignatura(client);
        const ajena = await crearOferta(client, { idPrograma: otro.idPrograma, idPeriodo: esc.idPeriodo, codigoCetap: 'CET-0288' });
        const periodo = esc.idPeriodo;
        const asignatura = esc.idAsignatura;
        const propia = esc.idOferta;
        const ajenaId = ajena.idOferta;
        await client.query(`INSERT INTO "${S}".aula (codigo, nombre, sede_codigo, codigo_cetap) VALUES
          ('QA-AULA-PROPIA', 'Aula propia QA', 'DT-009', 'CET-0135'), ('QA-AULA-AJENA', 'Aula ajena QA', 'SC', 'CET-0288')`);
        const grupo = (await client.query(
          `INSERT INTO "${S}".grupo (id_asignatura, id_periodo_academico, tipo_oferta, numero_grupo, estado)
           VALUES ($1, $2::bigint, 'periodo_regular', 977, 'PROGRAMADO') RETURNING id_grupo::text`, [asignatura, periodo])).rows[0].id_grupo;
        await fn({ periodo, asignatura, grupo, ofertaPropia: propia, ofertaAjena: ajenaId });
      } finally { await client.query('ROLLBACK'); }
    });

  caso('el selector lista solo las ofertas del programa de la asignatura en el periodo, con su territorial', async (f) => {
    const ofertas = await ofertasCetapDe(q, f.asignatura, f.periodo);
    expect(ofertas.map((o) => o.idOfertaCetap)).toContain(f.ofertaPropia);
    expect(ofertas.map((o) => o.idOfertaCetap)).not.toContain(f.ofertaAjena);
    // Toda oferta trae su territorial resuelta por código (auth.seccionales.cod_seccional).
    expect(ofertas.every((o) => o.territorial.codigo && o.territorial.idSeccional)).toBe(true);
  });

  caso('la oferta debe ser del programa de la asignatura, del mismo periodo y estar activa', async (f) => {
    const g = { idAsignatura: f.asignatura, idPeriodoAcademico: f.periodo };
    expect((await validarOfertaDelGrupo(q, f.ofertaPropia, g)).idOfertaCetap).toBe(f.ofertaPropia);
    await expect(validarOfertaDelGrupo(q, f.ofertaAjena, g)).rejects.toBeInstanceOf(BadRequestException);
    await expect(validarOfertaDelGrupo(q, 'abc', g)).rejects.toBeInstanceOf(BadRequestException);
    await expect(validarOfertaDelGrupo(q, f.ofertaPropia, { ...g, idPeriodoAcademico: null })).rejects.toThrow(/periodo de plataforma/);
    await client!.query(`UPDATE academic_work_plan.oferta_cetap_programa SET activa = FALSE WHERE id = $1`, [f.ofertaPropia]);
    await expect(validarOfertaDelGrupo(q, f.ofertaPropia, g)).rejects.toBeInstanceOf(BadRequestException);
  });

  caso('presencial: el aula debe ser del CETAP de la oferta (al crear la franja y al asignar la oferta)', async (f) => {
    const oferta = await validarOfertaDelGrupo(q, f.ofertaPropia, { idAsignatura: f.asignatura, idPeriodoAcademico: f.periodo });
    await client!.query(`UPDATE "${S}".grupo SET id_oferta_cetap = $2 WHERE id_grupo = $1`, [f.grupo, f.ofertaPropia]);
    const aulaPropia = (await q.query(`SELECT codigo FROM "${S}".aula WHERE codigo_cetap = $1 AND codigo LIKE 'QA-%' LIMIT 1`, [oferta.cetap.codigo]))[0]?.codigo;
    const aulaAjena = (await q.query(`SELECT codigo FROM "${S}".aula WHERE codigo_cetap IS DISTINCT FROM $1 AND codigo LIKE 'QA-%' LIMIT 1`, [oferta.cetap.codigo]))[0]?.codigo;
    expect(aulaPropia && aulaAjena).toBeTruthy();
    await expect(exigirAulaDeLaOferta(q, f.grupo, aulaPropia, 'presencial')).resolves.toBeUndefined();
    await expect(exigirAulaDeLaOferta(q, f.grupo, aulaAjena, 'presencial')).rejects.toThrow(/se dicta en/);
    // Mediada por tecnología no usa aula física: no se exige.
    await expect(exigirAulaDeLaOferta(q, f.grupo, aulaAjena, 'mediada_tecnologia')).resolves.toBeUndefined();
    // Al asignar la oferta a un grupo con franjas presenciales ya ubicadas.
    await client!.query(
      `INSERT INTO "${S}".franja_horaria (id_grupo, dia_semana, hora_inicio, hora_fin, tipo_sesion, aula_codigo, estado)
       VALUES ($1, 'LUNES', '06:00', '08:00', 'presencial', $2, 'PROGRAMADO')`, [f.grupo, aulaAjena]);
    expect(await aulasQueNoCoinciden(q, f.grupo, oferta.cetap.codigo)).toEqual([aulaAjena]);
  });
});
