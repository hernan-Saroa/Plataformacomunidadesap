import { ForbiddenException } from '@nestjs/common';
import { Client } from 'pg';

import { DocenciaService } from '../docencia/docencia.service.js';
import { NivelesRequestService } from '../acceso/niveles-request.service.js';
import { VistaController } from './vista.controller.js';
import { VistaService } from './vista.service.js';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { crearAsignatura, crearPeriodo, crearOferta } = require('../../test/catalogo-qa.cjs');

/**
 * EFDS-2344 (árbol) y EFDS-2343 (calendario del docente): los contratos de
 * INTEGRACION-claude.md §19, sobre la base real, en una transacción que se revierte.
 *
 * Escenario en un periodo de plataforma propio:
 *   · pregrado: un grupo con oferta CETAP y dos franjas, LUNES con qa.docente y
 *     MIERCOLES sin docente;
 *   · posgrado: un grupo con una franja, MARTES con qa.docente.
 * El contrato de horas se simula a 64 h por asignatura.
 */
const conexion = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 55432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'esap_db',
};
const S = 'academic-schedule';
const DOCUMENTO = '1020304053'; // qa.docente

describe('EFDS-2344 / EFDS-2343 :: árbol de programación y calendario del docente (agregado real)', () => {
  let client: Client | null = null;
  let hayBase = false;
  const ids: Record<string, string> = {};

  const dataSource: any = { query: (sql: string, params?: any[]) => client!.query(sql, params).then((r) => r.rows) };
  const contrato: any = { calcularImpacto: async () => ({ horasImpacto: 64 }) };
  const vista = () => new VistaService(dataSource, new DocenciaService(dataSource, contrato));

  beforeAll(async () => {
    try {
      client = new Client(conexion);
      await client.connect();
      await client.query('BEGIN');
      ids.persona = (await client.query(`SELECT id_person::text AS id FROM auth.personas WHERE num_identificacion = $1`, [DOCUMENTO])).rows[0].id;
      await client.query(`UPDATE "${S}".franja_horaria SET id_docente = NULL WHERE id_docente = $1`, [ids.persona]);
      await client.query(
        `UPDATE academic_work_plan."Docente" SET "tipoVinculacion" = 'Cátedra', "horasAsignables" = 0 WHERE "personaId" = $1`,
        [ids.persona]);
      const periodo = await crearPeriodo(client, { anio: 2096, semestre: 1, estado: 'planeacion' });
      ids.periodo = periodo.idPeriodo;
      ids.codigoPeriodo = periodo.codigo;
      const pre = await crearAsignatura(client, { tipo: 'pregrado', semestre: 2 });
      const pos = await crearAsignatura(client, { tipo: 'especializacion' });
      ids.programaPre = pre.idPrograma;
      ids.codigoPre = pre.codigoAsignatura;
      ids.nucleoPre = pre.idNucleo;
      const oferta = await crearOferta(client, { idPrograma: pre.idPrograma, idPeriodo: ids.periodo });
      ids.oferta = oferta.idOferta;
      const grupo = async (idAsig: string, num: number, idOferta: string | null) => (await client!.query(
        `INSERT INTO "${S}".grupo (id_asignatura, id_periodo_academico, tipo_oferta, numero_grupo, estado, id_oferta_cetap,
                                   fecha_inicio, fecha_fin)
         VALUES ($1, $2, 'periodo_regular', $3, 'PROGRAMADO', $4, '2096-02-02', '2096-05-24') RETURNING id_grupo::text AS id`,
        [idAsig, ids.periodo, num, idOferta])).rows[0].id;
      const franja = async (idGrupo: string, dia: string, docente: string | null, estado: string) => (await client!.query(
        `INSERT INTO "${S}".franja_horaria (id_grupo, dia_semana, hora_inicio, hora_fin, tipo_sesion, estado, id_docente, aula_codigo)
         VALUES ($1, $2, '08:00', '10:00', 'mediada_tecnologia', $3, $4, NULL) RETURNING id_franja::text AS id`,
        [idGrupo, dia, estado, docente])).rows[0].id;
      ids.grupoPre = await grupo(pre.idAsignatura, 1, ids.oferta);
      ids.grupoPos = await grupo(pos.idAsignatura, 1, null);
      ids.franjaLunes = await franja(ids.grupoPre, 'LUNES', ids.persona, 'TOMADA');
      ids.franjaMiercoles = await franja(ids.grupoPre, 'MIERCOLES', null, 'PROGRAMADO');
      ids.franjaMartes = await franja(ids.grupoPos, 'MARTES', ids.persona, 'APROBADA');
      hayBase = true;
    } catch (e) {
      const conectado = !!(client as any)?._connected;
      if (client) { await client.query('ROLLBACK').catch(() => {}); await client.end().catch(() => {}); }
      client = null; hayBase = false;
      if (conectado) throw e;
      console.warn('  (sin base: omitido)', (e as Error).message);
    }
  });
  afterAll(async () => {
    if (client) await client.query('ROLLBACK').catch(() => {});
    if (client) await client.end().catch(() => {});
  });

  const caso = (nombre: string, fn: () => Promise<void>) =>
    it(nombre, async () => {
      if (!hayBase || !client) { console.warn('  (sin base: omitido)'); return; }
      await client.query('SAVEPOINT caso');
      try { await fn(); } finally { await client.query('ROLLBACK TO SAVEPOINT caso').catch(() => {}); }
    });

  caso('árbol de pregrado: programa → asignatura → grupo → franjas, con docente, vinculación, horas y CETAP', async () => {
    const a = await vista().arbol({ periodo: ids.periodo }, ['pregrado'], null);
    expect(a.periodo).toMatchObject({ id: ids.periodo, codigo: ids.codigoPeriodo });
    expect(a.programas.map((p: any) => p.idPrograma)).toEqual([ids.programaPre]);
    const [asig] = a.programas[0].asignaturas;
    expect(asig).toMatchObject({ codigo: ids.codigoPre, semestre: 2, horasClase: 64 });
    expect(asig.area).toMatchObject({ id: ids.nucleoPre });
    const [g] = asig.grupos;
    expect(g).toMatchObject({
      idGrupo: ids.grupoPre, numeroGrupo: 1, estado: 'PROGRAMADO', tipoOferta: 'periodo_regular',
      cicloInicio: '2096-02-02', cicloFin: '2096-05-24',
      estadoFranjas: { PROGRAMADO: 1, PUBLICADA: 0, TOMADA: 1, APROBADA: 0, DEVUELTA: 0 },
    });
    expect(g.oferta).toMatchObject({ idOfertaCetap: ids.oferta, cetap: { codigo: 'CET-0135' } });
    expect(g.franjas.map((f: any) => [f.diaSemana, f.idDocente])).toEqual([['LUNES', ids.persona], ['MIERCOLES', null]]);
    // Un docente en 1 de 2 días: la mitad de las 64 h (regla de reparto vigente).
    expect(g.docentes).toEqual([{
      idDocente: ids.persona, documento: DOCUMENTO, nombre: expect.any(String),
      vinculacion: { tipo: 'catedra', texto: 'Cátedra' }, fraccion: 0.5, horas: 32,
    }]);
    expect(g.horas).toMatchObject({ requeridas: 64, semanas: 16, programadas: 64, excede: false });
    expect(a.resumen).toEqual({ programas: 1, asignaturas: 1, grupos: 1, franjas: 2, franjasSinDocente: 1 });
  });

  caso('RN-08: con los dos niveles salen los dos programas; con uno, solo el suyo', async () => {
    const ambos = await vista().arbol({ periodo: ids.periodo }, ['pregrado', 'posgrado'], null);
    expect(ambos.programas).toHaveLength(2);
    const pos = await vista().arbol({ periodo: ids.periodo }, ['posgrado'], null);
    expect(pos.programas.map((p: any) => p.nivel)).toEqual(['posgrado']);
  });

  caso('soloSinDocente deja solo los grupos con alguna franja sin docente; el periodo se acepta por código', async () => {
    const a = await vista().arbol({ periodo: ids.codigoPeriodo, soloSinDocente: true }, ['pregrado', 'posgrado'], null);
    expect(a.programas.flatMap((p: any) => p.asignaturas.flatMap((x: any) => x.grupos.map((g: any) => g.idGrupo))))
      .toEqual([ids.grupoPre]);
  });

  caso('calendario: todas sus franjas de lunes a domingo; lo del nivel que no se ve sale reservado', async () => {
    const v = vista();
    const docente = await v.docentePor({ documento: DOCUMENTO });
    const c = await v.calendario(docente, ids.periodo, ['pregrado'], null);
    expect(c.docente).toEqual({ idDocente: ids.persona, documento: DOCUMENTO, nombre: expect.any(String),
      vinculacion: { tipo: 'catedra', texto: 'Cátedra' } });
    expect(c.franjas.map((f: any) => [f.diaSemana, f.reservada])).toEqual([['LUNES', false], ['MARTES', true]]);
    expect(c.franjas[0]).toMatchObject({ idGrupo: ids.grupoPre, codigoAsignatura: ids.codigoPre, nivel: 'pregrado', estado: 'TOMADA' });
    expect(c.franjas[1]).toMatchObject({ idGrupo: null, asignatura: null, aulaCodigo: null, horaInicio: '08:00' });
    // 32 h (mitad del grupo de pregrado) + 64 h (todo el de posgrado); el tope de cátedra es 304.
    expect(c.horas).toEqual({ total: 96, tope: 304 });
    // El desglose por grupo solo trae los visibles: el grupo de posgrado no se nombra.
    expect(c.horasPorGrupo).toEqual({ [ids.grupoPre]: 32 });
  });

  caso('calendario del portal (todos los niveles): nada reservado', async () => {
    const v = vista();
    const c = await v.calendario(await v.docentePor({ idDocente: ids.persona }), ids.periodo, 'todos', null);
    expect(c.franjas.every((f: any) => !f.reservada)).toBe(true);
    expect(c.franjas[1]).toMatchObject({ diaSemana: 'MARTES', nivel: 'posgrado', estado: 'APROBADA' });
  });

  caso('buscador: por cédula, y sin texto los que tienen franjas en el periodo, con sus horas', async () => {
    const porCedula = await vista().buscarDocentes(ids.periodo, DOCUMENTO.slice(0, 6), null);
    expect(porCedula.find((d: any) => d.idDocente === ids.persona)).toMatchObject({ franjas: 2, horas: 96 });
    const conFranjas = await vista().buscarDocentes(ids.periodo, undefined, null);
    expect(conFranjas.map((d: any) => d.idDocente)).toEqual([ids.persona]);
  });

  caso('pedir un nivel sin permiso da 403; un documento fuera del banco, 404', async () => {
    const ctrl = new VistaController(vista(), { de: async () => ['pregrado'] } as unknown as NivelesRequestService, {} as any);
    await expect(ctrl.arbol({ headers: {} } as any, ids.periodo, 'posgrado')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(vista().docentePor({ documento: '0000000001' })).rejects.toThrow(/banco de docentes/);
  });
});
