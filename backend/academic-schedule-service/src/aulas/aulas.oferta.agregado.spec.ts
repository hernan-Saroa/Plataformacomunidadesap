import { Client } from 'pg';

import { AulasService } from './aulas.service.js';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { crearAsignatura, crearPeriodo, crearOferta, crearEscenarioDeOferta } = require('../../test/catalogo-qa.cjs');

/**
 * Aula y oferta, relacionadas: el selector de aula solo ofrece opciones válidas.
 *
 * `GET /aulas` trae la territorial y el CETAP de cada aula y se filtra por `cetap`, por `grupo` o por
 * `asignatura`+`periodo`. Con oferta (la del grupo) → las aulas de su CETAP; sin oferta → las aulas de
 * los CETAP con oferta activa del programa en ese periodo, y cada aula trae la oferta que se deduce
 * al elegirla (hay UNA por programa, CETAP y periodo). Las validaciones del servidor se quedan.
 *
 * Agregado sobre la base real, en una transacción que se revierte, con catálogo, ofertas y aulas propios.
 */
const conexion = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 55432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'esap_db',
};
const S = 'academic-schedule';

describe('aulas :: solo las válidas para la oferta (agregado real, en transacción)', () => {
  let client: Client | null = null;
  let hayBase = false;

  beforeAll(async () => {
    try { client = new Client(conexion); await client.connect(); hayBase = true; }
    catch { client = null; hayBase = false; }
  });
  afterAll(async () => { if (client) await client.end().catch(() => {}); });

  const servicio = () => new AulasService({
    query: (sql: string, params?: any[]) => client!.query(sql, params).then((r) => r.rows),
  } as any);

  /** Solo las aulas de esta prueba (la base puede tener las reales de Sede Central en el mismo CETAP). */
  const propias = (aulas: Array<{ codigo: string }>) => aulas.filter((a) => a.codigo.startsWith('QA-AO-')).map((a) => a.codigo).sort();

  interface Esc { idPrograma: string; idAsignatura: string; idPeriodo: string; neiva: string; sedeCentral: string; grupoConOferta: string; grupoSinOferta: string }
  const caso = (nombre: string, fn: (e: Esc) => Promise<void>) =>
    it(nombre, async () => {
      if (!hayBase || !client) { console.warn('  (sin base: omitido)'); return; }
      await client.query('BEGIN');
      try {
        // Un programa con oferta en Neiva (CET-0135) y en Sede Central (CET-0288) en el mismo periodo.
        const esc = await crearEscenarioDeOferta(client, { codigoCetap: 'CET-0135', periodo: { codigo: '2095-1', anio: 2095 } });
        const sc = await crearOferta(client, { idPrograma: esc.idPrograma, idPeriodo: esc.idPeriodo, codigoCetap: 'CET-0288' });
        await client.query(
          `INSERT INTO "${S}".aula (codigo, nombre, sede_codigo, codigo_cetap) VALUES
             ('QA-AO-N1','Neiva 1','DT-009','CET-0135'), ('QA-AO-N2','Neiva 2','DT-009','CET-0135'),
             ('QA-AO-S1','Central 1','SC','CET-0288'),
             ('QA-AO-X1','Otro CETAP sin oferta','DT-001','CET-0002')`);
        const grupo = async (n: number, oferta: string | null) => (await client!.query(
          `INSERT INTO "${S}".grupo (id_asignatura, id_periodo_academico, tipo_oferta, numero_grupo, estado, id_oferta_cetap)
           VALUES ($1::bigint, $2::bigint, 'periodo_regular', $3, 'PROGRAMADO', $4::bigint) RETURNING id_grupo`,
          [esc.idAsignatura, esc.idPeriodo, n, oferta])).rows[0].id_grupo as string;
        await fn({
          idPrograma: esc.idPrograma, idAsignatura: esc.idAsignatura, idPeriodo: esc.idPeriodo,
          neiva: esc.idOferta, sedeCentral: sc.idOferta,
          grupoConOferta: await grupo(971, esc.idOferta), grupoSinOferta: await grupo(972, null),
        });
      } finally { await client.query('ROLLBACK'); }
    });

  caso('trae la territorial y el CETAP de cada aula; sin filtro la lista es la de siempre', async () => {
    const todas = await servicio().listar();
    const n1 = todas.find((a) => a.codigo === 'QA-AO-N1')!;
    expect(n1).toMatchObject({ cetap: { codigo: 'CET-0135' }, territorial: { codigo: 'DT-009' }, idOfertaCetap: null });
    expect(n1.cetap!.nombre).toBeTruthy();
    expect(n1.territorial!.nombre).toBeTruthy();
    expect(propias(todas)).toEqual(['QA-AO-N1', 'QA-AO-N2', 'QA-AO-S1', 'QA-AO-X1']); // ninguna se esconde
    // Campos de siempre, intactos.
    expect(Object.keys(n1)).toEqual(expect.arrayContaining(['codigo', 'nombre', 'sedeCodigo', 'capacidad', 'provisional']));
  });

  caso('filtro por CETAP', async () => {
    expect(propias(await servicio().listar({ cetap: 'CET-0135' }))).toEqual(['QA-AO-N1', 'QA-AO-N2']);
    expect(propias(await servicio().listar({ cetap: 'CET-0002' }))).toEqual(['QA-AO-X1']);
    expect(await servicio().listar({ cetap: 'CET-NO-EXISTE' })).toEqual([]);
  });

  caso('grupo CON oferta: solo las aulas del CETAP de esa oferta, y la oferta viene resuelta', async (e) => {
    const r = await servicio().listar({ grupo: e.grupoConOferta });
    expect(propias(r)).toEqual(['QA-AO-N1', 'QA-AO-N2']);
    expect(r.every((a) => a.cetap?.codigo === 'CET-0135' && a.idOfertaCetap === e.neiva)).toBe(true);
  });

  caso('grupo SIN oferta: las aulas de los CETAP con oferta del programa y periodo; elegir una deduce la oferta', async (e) => {
    const r = await servicio().listar({ grupo: e.grupoSinOferta });
    expect(propias(r)).toEqual(['QA-AO-N1', 'QA-AO-N2', 'QA-AO-S1']); // X1 (CET-0002) no tiene oferta: no se ofrece
    const oferta = (cod: string) => r.find((a) => a.codigo === cod)!.idOfertaCetap;
    expect(oferta('QA-AO-N1')).toBe(e.neiva);
    expect(oferta('QA-AO-N2')).toBe(e.neiva);
    expect(oferta('QA-AO-S1')).toBe(e.sedeCentral);
  });

  caso('sin grupo todavía: asignatura + periodo da lo mismo', async (e) => {
    const r = await servicio().listar({ asignatura: e.idAsignatura, periodo: e.idPeriodo });
    expect(propias(r)).toEqual(['QA-AO-N1', 'QA-AO-N2', 'QA-AO-S1']);
    expect(r.find((a) => a.codigo === 'QA-AO-S1')!.idOfertaCetap).toBe(e.sedeCentral);
  });

  caso('una oferta inactiva ya no cuenta, y un programa sin ofertas en el periodo no tiene aulas válidas', async (e) => {
    await client!.query(`UPDATE academic_work_plan.oferta_cetap_programa SET activa = FALSE WHERE id = $1::bigint`, [e.sedeCentral]);
    expect(propias(await servicio().listar({ grupo: e.grupoSinOferta }))).toEqual(['QA-AO-N1', 'QA-AO-N2']);

    const otroPeriodo = await crearPeriodo(client, { codigo: '2095-2', anio: 2095, semestre: 2 });
    // Un periodo sin carga de ofertas: ninguna aula es válida (y no se inventan).
    expect(await servicio().listar({ asignatura: e.idAsignatura, periodo: otroPeriodo.idPeriodo })).toEqual([]);
    // Otro programa sin oferta alguna.
    const otra = await crearAsignatura(client);
    expect(await servicio().listar({ asignatura: otra.idAsignatura, periodo: e.idPeriodo })).toEqual([]);
  });

  caso('filtros inválidos se rechazan, no se ignoran', async (e) => {
    await expect(servicio().listar({ grupo: 'no-es-uuid' })).rejects.toThrow();
    await expect(servicio().listar({ grupo: '00000000-0000-4000-8000-000000000000' })).rejects.toThrow(/no existe/);
    await expect(servicio().listar({ asignatura: e.idAsignatura })).rejects.toThrow(/grupo.*asignatura.*periodo|periodo/);
    await expect(servicio().listar({ asignatura: 'abc', periodo: e.idPeriodo })).rejects.toThrow();
  });
});
