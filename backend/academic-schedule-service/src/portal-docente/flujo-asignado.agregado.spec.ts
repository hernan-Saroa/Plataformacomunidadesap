import { Client } from 'pg';

import { AsignacionesService } from '../asignaciones/asignaciones.service.js';
import { AcumuladoService } from '../asignaciones/acumulado.service.js';
import { DocenciaService } from '../docencia/docencia.service.js';
import { PortalDocenteService } from './portal-docente.service.js';
import { MENSAJE_TOMA_DESHABILITADA } from './flujo-docente.js';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { crearAsignatura, darArea } = require('../../test/catalogo-qa.cjs');

/**
 * EFDS-2348 :: el docente RECIBE su programación; ya no toma franjas.
 *
 * Con PROG_PORTAL_TOMA_FRANJAS sin encender (el flujo nuevo):
 *   · tomar y soltar se rechazan EN EL SERVIDOR, aunque se llame la API directo;
 *   · no hay franjas «disponibles» que tomar;
 *   · asignar un grupo desde el backoffice deja sus franjas TOMADA con el docente
 *     («con docente, pendiente de concertación») y el portal se las muestra;
 *   · retirar las devuelve a PROGRAMADO sin docente;
 *   · lo APROBADO en la concertación no se reasigna ni se retira desde aquí.
 *
 * Agregado sobre la base real, en UNA transacción que se revierte.
 */
const conexion = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 55432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'esap_db',
};
const S = 'academic-schedule';
const DOCUMENTO = '1020304053'; // qa.docente (Docente del RUND de pruebas)

const tomaAntes = process.env.PROG_PORTAL_TOMA_FRANJAS;
beforeAll(() => { delete process.env.PROG_PORTAL_TOMA_FRANJAS; });
afterAll(() => { if (tomaAntes !== undefined) process.env.PROG_PORTAL_TOMA_FRANJAS = tomaAntes; });

describe('EFDS-2348 :: el docente recibe su programación asignada (agregado real)', () => {
  let client: Client | null = null;
  let hayBase = false;
  const ids = { persona: '', otraPersona: '', grupo: '', franjaProg: '', franjaPub: '', grupoLibre: '', franjaLibre: '' };

  const query = (sql: string, params?: any[]) => client!.query(sql, params).then((r) => r.rows);
  const dataSource: any = {
    query,
    // La asignación del flujo nuevo corre en una transacción: aquí, un SAVEPOINT dentro de la del test.
    transaction: async (fn: (m: any) => Promise<any>) => {
      await client!.query('SAVEPOINT tx');
      try { const r = await fn({ query }); await client!.query('RELEASE SAVEPOINT tx'); return r; }
      catch (e) { await client!.query('ROLLBACK TO SAVEPOINT tx'); throw e; }
    },
  };
  const contrato: any = { calcularImpacto: async () => ({ horasImpacto: 32 }) };
  const docencia = () => new DocenciaService(dataSource, contrato);
  const portal = () => new PortalDocenteService(dataSource, new AcumuladoService(dataSource, docencia()), docencia());
  const backoffice = () => new AsignacionesService(dataSource, contrato, docencia());
  const franjas = async (idGrupo: string) =>
    (await client!.query(
      `SELECT estado, id_docente::text AS id_docente FROM "${S}".franja_horaria WHERE id_grupo = $1 ORDER BY dia_semana`,
      [idGrupo])).rows;

  beforeAll(async () => {
    try {
      client = new Client(conexion);
      await client.connect();
      await client.query('BEGIN');
      const asig = await crearAsignatura(client);
      const idAsig = asig.idAsignatura;
      ids.persona = (await client.query(`SELECT id_person::text AS id FROM auth.personas WHERE num_identificacion = $1`, [DOCUMENTO])).rows[0].id;
      // EFDS-2341: el docente es del área de la asignatura (nadie se asigna fuera de su área).
      await darArea(client, { idNucleo: asig.idNucleo, idPersonas: [ids.persona] });
      ids.otraPersona = (await client.query(`SELECT id_person::text AS id FROM auth.personas WHERE id_person <> $1 LIMIT 1`, [ids.persona])).rows[0].id;
      // El docente de prueba, limpio y asignable: sin otras franjas, catedrático en servicio activo.
      await client.query(`UPDATE "${S}".franja_horaria SET id_docente = NULL, estado = 'PROGRAMADO' WHERE id_docente = $1`, [ids.persona]);
      await client.query(
        `UPDATE academic_work_plan."Docente" SET "tipoVinculacion" = 'Cátedra', "horasAsignables" = 0,
                "situacionCategoria" = 'Servicio Activo',
                "fechaInicioVinculacion" = NULL, "fechaFinVinculacion" = NULL WHERE "personaId" = $1`, [ids.persona]);
      const p = await client.query(
        `INSERT INTO "${S}".periodo_programacion (codigo, nombre, tipo, fecha_inicio, fecha_fin, estado)
         VALUES ($1,'Periodo QA flujo asignado','periodo_regular','2028-02-01','2028-06-15','activo') RETURNING id_periodo`,
        [`QA-ASIG-${Date.now().toString().slice(-7)}`]);
      const grupo = async (numero: number) => (await client!.query(
        `INSERT INTO "${S}".grupo (id_asignatura, id_periodo, numero_grupo, estado, fecha_inicio, fecha_fin)
         VALUES (${idAsig}, $1, $2, 'PROGRAMADO', '2028-02-03', '2028-05-30') RETURNING id_grupo`,
        [p.rows[0].id_periodo, numero])).rows[0].id_grupo;
      const franja = async (idGrupo: string, dia: string, estado: string) => (await client!.query(
        `INSERT INTO "${S}".franja_horaria (id_grupo, dia_semana, hora_inicio, hora_fin, tipo_sesion, estado)
         VALUES ($1,$2,'06:00'::time,'08:00'::time,'mediada_tecnologia',$3) RETURNING id_franja`,
        [idGrupo, dia, estado])).rows[0].id_franja;
      // Un grupo con una franja sin publicar y otra publicada: la asignación toma las dos.
      ids.grupo = await grupo(961);
      ids.franjaProg = await franja(ids.grupo, 'JUEVES', 'PROGRAMADO');
      ids.franjaPub = await franja(ids.grupo, 'VIERNES', 'PUBLICADA');
      // Otro grupo publicado y libre: con el flujo nuevo no se toma.
      ids.grupoLibre = await grupo(962);
      ids.franjaLibre = await franja(ids.grupoLibre, 'SABADO', 'PUBLICADA');
      hayBase = true;
    } catch (e) {
      // Solo la FALTA DE BASE se omite; un fixture que falla se grita y no deja la conexión abierta.
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

  caso('tomar se rechaza en el servidor (409) y la franja no cambia', async () => {
    await expect(portal().tomar(ids.persona, ids.franjaLibre, null)).rejects.toThrow(MENSAJE_TOMA_DESHABILITADA);
    expect(await franjas(ids.grupoLibre)).toEqual([{ estado: 'PUBLICADA', id_docente: null }]);
  });

  caso('no hay franjas disponibles que tomar, aunque haya publicadas libres', async () => {
    expect(await portal().disponibles(ids.persona)).toEqual([]);
  });

  caso('asignar el grupo deja TODAS sus franjas TOMADA con el docente, y el portal se las muestra', async () => {
    const r = await backoffice().asignar({ idGrupo: ids.grupo, documento: DOCUMENTO }, null);
    expect(r.asignado).toBe(true);
    expect(await franjas(ids.grupo)).toEqual([
      { estado: 'TOMADA', id_docente: ids.persona },
      { estado: 'TOMADA', id_docente: ids.persona },
    ]);
    const mias = await portal().misFranjas(ids.persona);
    expect(mias.map((f) => String(f.idFranja)).sort()).toEqual([ids.franjaProg, ids.franjaPub].sort());
  });

  caso('soltar lo asignado se rechaza: no se deshace la decisión de la decanatura desde el portal', async () => {
    await backoffice().asignar({ idGrupo: ids.grupo, documento: DOCUMENTO }, null);
    await expect(portal().soltar(ids.persona, ids.franjaProg)).rejects.toThrow(MENSAJE_TOMA_DESHABILITADA);
    expect((await franjas(ids.grupo)).every((f: any) => f.estado === 'TOMADA')).toBe(true);
  });

  caso('retirar devuelve las franjas a PROGRAMADO sin docente', async () => {
    await backoffice().asignar({ idGrupo: ids.grupo, documento: DOCUMENTO }, null);
    expect(await backoffice().retirar(ids.grupo)).toEqual({ retirado: true });
    expect(await franjas(ids.grupo)).toEqual([
      { estado: 'PROGRAMADO', id_docente: null },
      { estado: 'PROGRAMADO', id_docente: null },
    ]);
    expect(await portal().misFranjas(ids.persona)).toEqual([]);
  });

  caso('lo APROBADO no se retira: 409 y la asignación sigue', async () => {
    await backoffice().asignar({ idGrupo: ids.grupo, documento: DOCUMENTO }, null);
    await client!.query(`UPDATE "${S}".franja_horaria SET estado = 'APROBADA' WHERE id_grupo = $1`, [ids.grupo]);
    await expect(backoffice().retirar(ids.grupo)).rejects.toThrow(/aprobada/i);
    expect(await franjas(ids.grupo)).toEqual([
      { estado: 'APROBADA', id_docente: ids.persona },
      { estado: 'APROBADA', id_docente: ids.persona },
    ]);
  });

  caso('un grupo con docencia APROBADA de otro docente no se reasigna: 409 y nada cambia', async () => {
    await client!.query(
      `UPDATE "${S}".franja_horaria SET estado = 'APROBADA', id_docente = $2 WHERE id_franja = $1`,
      [ids.franjaProg, ids.otraPersona]);
    await expect(backoffice().asignar({ idGrupo: ids.grupo, documento: DOCUMENTO }, null)).rejects.toThrow(/aprobada/i);
    const fs = await franjas(ids.grupo);
    expect(fs).toContainEqual({ estado: 'APROBADA', id_docente: ids.otraPersona });
    expect(fs).toContainEqual({ estado: 'PUBLICADA', id_docente: null });
  });
});
