import { Client } from 'pg';

import { PublicacionService } from './publicacion.service.js';

/**
 * NUEVA-5b / EFDS-1941 :: cerrar el periodo.
 *
 * Canario AGREGADO sobre la base real. Afirma los INVARIANTES del cierre:
 *   · no se cierra mientras haya una franja ni APROBADA ni en excepción;
 *   · marcarla como excepción la deja de contar y permite cerrar;
 *   · al cerrar, el periodo queda 'cerrado';
 *   · un periodo cerrado es inmutable: no se vuelve a cerrar.
 */
const conexion = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 55432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'esap_db',
};

const S = 'academic-schedule';

describe('EFDS-1941 :: cerrar el periodo (agregado real)', () => {
  let client: Client | null = null;
  let hayBase = false;
  let idPeriodo = '';
  let idGrupo = '';
  const F: Record<string, string> = {};

  const servicio = () => new PublicacionService({
    query: (sql: string, params?: any[]) => client!.query(sql, params).then((r) => r.rows),
  } as any);

  const insertar = async (etq: string, estado: string) => {
    const r = await client!.query(
      `INSERT INTO "${S}".franja_horaria (id_grupo, dia_semana, hora_inicio, hora_fin, tipo_sesion, aula_codigo, estado)
       VALUES ($1,'DOMINGO','06:00'::time,'07:00'::time,'mediada_tecnologia',NULL,$2) RETURNING id_franja`,
      [idGrupo, estado]);
    F[etq] = r.rows[0].id_franja;
  };

  beforeAll(async () => {
    try {
      client = new Client(conexion);
      await client.connect();
      const cod = `QA-CIE-${Date.now().toString().slice(-7)}`;
      const p = await client.query(
        `INSERT INTO "${S}".periodo_programacion (codigo,nombre,tipo,fecha_inicio,fecha_fin,estado)
         VALUES ($1,'Periodo QA cierre','periodo_regular','2028-02-01','2028-06-15','activo') RETURNING id_periodo`, [cod]);
      idPeriodo = p.rows[0].id_periodo;
      const g = await client.query(
        `INSERT INTO "${S}".grupo (id_asignatura,id_periodo,numero_grupo,estado)
         VALUES (2,$1,906,'PROGRAMADO') RETURNING id_grupo`, [idPeriodo]);
      idGrupo = g.rows[0].id_grupo;
      await insertar('APROB', 'APROBADA');
      await insertar('TOM', 'TOMADA'); // pendiente: ni aprobada ni excepción
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

  siHayBase('no se cierra mientras haya una franja ni aprobada ni en excepcion', async () => {
    const svc = servicio();
    const est = await svc.estado(idPeriodo);
    expect(est.aprobada).toBe(1);
    expect(est.pendientesCierre).toBe(1); // la TOMADA
    await expect(svc.cerrar(idPeriodo)).rejects.toThrow(/no se puede cerrar/i);
  });

  siHayBase('marcar la pendiente como excepcion permite cerrar; el periodo queda cerrado', async () => {
    const svc = servicio();
    const tras = await svc.marcarExcepcion(idPeriodo, F['TOM'], true);
    expect(tras.pendientesCierre).toBe(0);

    await svc.cerrar(idPeriodo);
    const { rows } = await client!.query(
      `SELECT estado FROM "${S}".periodo_programacion WHERE id_periodo=$1`, [idPeriodo]);
    expect(rows[0].estado).toBe('cerrado');
  });

  siHayBase('un periodo cerrado es inmutable: no se vuelve a cerrar', async () => {
    await expect(servicio().cerrar(idPeriodo)).rejects.toThrow(/ya está cerrado/i);
  });
});
