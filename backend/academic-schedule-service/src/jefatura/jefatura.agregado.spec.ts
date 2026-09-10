import { Client } from 'pg';

import { JefaturaService } from './jefatura.service.js';
import { PortalDocenteService } from '../portal-docente/portal-docente.service.js';

/**
 * EFDS-1939 :: aprobación de la jefatura territorial.
 *
 * Canario AGREGADO sobre datos reales. Usa a `qa.jefatura` (territorial DT-009) y
 * dos docentes reales del RUND —uno en DT-009, otro en DT-010— para afirmar los
 * INVARIANTES del flujo, no conteos globales:
 *   · la jefatura solo ve/decide su territorial;
 *   · aprobar mueve TOMADA → APROBADA;
 *   · devolver exige comentario y deja PUBLICADA conservando el id_docente;
 *   · una devolución pendiente BLOQUEA aprobar el resto de ese docente;
 *   · una franja APROBADA ya no la puede soltar el docente (guarda de C).
 */
const conexion = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 55432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'esap_db',
};

const S = 'academic-schedule';
const JEFA = '6cc8451a-6c7e-4734-b07d-9c500753479d'; // qa.jefatura -> DT-009
const P1 = '39a6f90f-2daf-496d-9035-b057e4734873';    // docente DT-009
const P2 = '7192ba96-113f-4def-99e9-d6e940f18ecc';    // docente DT-010

describe('EFDS-1939 :: aprobacion de jefatura (agregado real)', () => {
  let client: Client | null = null;
  let hayBase = false;
  let idPeriodo = '';
  let idGrupo = '';
  const F: Record<string, string> = {};

  const jefatura = () => new JefaturaService({
    query: (sql: string, params?: any[]) => client!.query(sql, params).then((r) => r.rows),
  } as any);
  const portal = () => new PortalDocenteService({
    query: (sql: string, params?: any[]) => client!.query(sql, params).then((r) => r.rows),
    createQueryRunner: () => ({
      connect: async () => {}, release: async () => {},
      startTransaction: async () => { await client!.query('BEGIN'); },
      commitTransaction: async () => { await client!.query('COMMIT'); },
      rollbackTransaction: async () => { await client!.query('ROLLBACK'); },
      query: (sql: string, params?: any[]) => client!.query(sql, params).then((r) => r.rows),
    }),
  } as any, null as any);

  // Franjas VIRTUALES (sin aula): no aportan cruce de aula, así el canario global
  // de validación no las ve; sábado/domingo para no chocar con datos reales.
  const tomada = async (etq: string, dia: string, ini: string, doc: string) => {
    const r = await client!.query(
      `INSERT INTO "${S}".franja_horaria (id_grupo, dia_semana, hora_inicio, hora_fin, tipo_sesion, aula_codigo, id_docente, estado)
       VALUES ($1,$2,$3::time,$4::time,'mediada_tecnologia',NULL,$5,'TOMADA') RETURNING id_franja`,
      [idGrupo, dia, ini, ini === '06:00' ? '07:00' : '09:00', doc]);
    F[etq] = r.rows[0].id_franja;
  };

  beforeAll(async () => {
    try {
      client = new Client(conexion);
      await client.connect();
      const cod = `QA-JEF-${Date.now().toString().slice(-7)}`;
      const p = await client.query(
        `INSERT INTO "${S}".periodo_programacion (codigo,nombre,tipo,fecha_inicio,fecha_fin,estado)
         VALUES ($1,'Periodo QA jefatura','periodo_regular','2028-02-01','2028-06-15','activo') RETURNING id_periodo`, [cod]);
      idPeriodo = p.rows[0].id_periodo;
      const g = await client.query(
        `INSERT INTO "${S}".grupo (id_asignatura,id_periodo,numero_grupo,estado)
         VALUES (2,$1,904,'PROGRAMADO') RETURNING id_grupo`, [idPeriodo]);
      idGrupo = g.rows[0].id_grupo;
      await tomada('F1', 'SABADO', '06:00', P1);
      await tomada('F2', 'SABADO', '08:00', P1);
      await tomada('F3', 'DOMINGO', '06:00', P1);
      await tomada('FX', 'SABADO', '06:00', P2); // otra territorial
      hayBase = true;
    } catch {
      client = null; hayBase = false;
    }
  });

  afterAll(async () => {
    if (client && idPeriodo) {
      await client.query(`DELETE FROM "${S}".grupo WHERE id_periodo=$1`, [idPeriodo]).catch(() => {});
      await client.query(`DELETE FROM "${S}".periodo_programacion WHERE id_periodo=$1`, [idPeriodo]).catch(() => {});
    }
    if (client) await client.end();
  });

  const siHayBase = (nombre: string, fn: () => Promise<void>) =>
    it(nombre, async () => {
      if (!hayBase || !client) { console.warn('  (sin base: omitido)'); return; }
      await fn();
    });

  siHayBase('la jefatura ve las franjas de SU territorial y no las de otra', async () => {
    const pend = await jefatura().pendientes(JEFA);
    const ids = pend.map((f) => f.idFranja);
    expect(ids).toEqual(expect.arrayContaining([F['F1'], F['F2'], F['F3']]));
    expect(ids).not.toContain(F['FX']); // FX es de DT-010
  });

  siHayBase('no puede decidir sobre una franja de otra territorial', async () => {
    await expect(jefatura().aprobar(JEFA, F['FX'])).rejects.toThrow(/otra territorial/i);
  });

  siHayBase('aprobar mueve TOMADA -> APROBADA', async () => {
    await jefatura().aprobar(JEFA, F['F1']);
    const { rows } = await client!.query(`SELECT estado FROM "${S}".franja_horaria WHERE id_franja=$1`, [F['F1']]);
    expect(rows[0].estado).toBe('APROBADA');
  });

  siHayBase('una franja aprobada ya no la puede soltar el docente (guarda de C)', async () => {
    await expect(portal().soltar(P1, F['F1'])).rejects.toThrow(/aprobada/i);
  });

  siHayBase('devolver exige comentario y deja PUBLICADA conservando el id_docente', async () => {
    await expect(jefatura().devolver(JEFA, F['F2'], '   ')).rejects.toThrow(/comentario/i);
    await jefatura().devolver(JEFA, F['F2'], 'Corrige el horario, cruza con tu franja de la mañana.');
    const { rows } = await client!.query(
      `SELECT estado, id_docente, comentario_jefatura FROM "${S}".franja_horaria WHERE id_franja=$1`, [F['F2']]);
    expect(rows[0].estado).toBe('PUBLICADA');
    expect(String(rows[0].id_docente)).toBe(P1);          // sigue siendo suya para corregir
    expect(rows[0].comentario_jefatura).toMatch(/Corrige/);
  });

  siHayBase('una devolucion pendiente bloquea aprobar el resto de ese docente', async () => {
    // F2 quedó devuelta (PUBLICADA + comentario). Aprobar F3 del mismo docente se bloquea.
    await expect(jefatura().aprobar(JEFA, F['F3'])).rejects.toThrow(/devoluci/i);

    // Al re-tomar F2, se limpia el comentario y se desbloquea el resto.
    await portal().tomar(P1, F['F2']);
    await jefatura().aprobar(JEFA, F['F3']); // ya no lanza
    const { rows } = await client!.query(`SELECT estado FROM "${S}".franja_horaria WHERE id_franja=$1`, [F['F3']]);
    expect(rows[0].estado).toBe('APROBADA');
  });
});
