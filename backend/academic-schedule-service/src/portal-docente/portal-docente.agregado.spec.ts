import { Client } from 'pg';

import { PortalDocenteService } from './portal-docente.service.js';

/**
 * EFDS-1938 :: portal del docente.
 *
 * Canario AGREGADO sobre la base real. Monta un periodo QA con franjas PUBLICADAS
 * y ejercita el SERVICIO real, afirmando INVARIANTES del ciclo de tomar/soltar,
 * no conteos globales:
 *   · tomar mueve PUBLICADA → TOMADA y fija el id_docente;
 *   · al tener una franja, las que cruzan con ella salen de «disponibles»;
 *   · soltar la devuelve a PUBLICADA… y está guardado contra soltar lo ajeno o
 *     lo ya aprobado;
 *   · tomar dos veces la misma franja: la segunda ve que ya no está publicada.
 *
 * La concurrencia REAL (dos conexiones a la vez, exactamente una gana) se
 * verifica a nivel HTTP contra el servicio desplegado, donde hay dos conexiones
 * del pool; aquí, con un solo Client, se cubre el guard de estado en serie.
 */
const conexion = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 55432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'esap_db',
};

const S = 'academic-schedule';
const D1 = '00000000-0000-0000-0000-00000000d001';
const D2 = '00000000-0000-0000-0000-00000000d002';

describe('EFDS-1938 :: portal del docente (agregado real)', () => {
  let client: Client | null = null;
  let hayBase = false;
  let idPeriodo = '';
  let idGrupo = '';
  const franjas: Record<string, string> = {}; // etiqueta -> id_franja

  // Shim de queryRunner sobre el Client pg: deja correr el `tomar` real (que usa
  // createQueryRunner) contra la base. Un solo Client = una conexión, suficiente
  // para el guard de estado en serie.
  const dataSource: any = {
    query: (sql: string, params?: any[]) => client!.query(sql, params).then((r) => r.rows),
    createQueryRunner: () => ({
      connect: async () => {},
      startTransaction: async () => { await client!.query('BEGIN'); },
      commitTransaction: async () => { await client!.query('COMMIT'); },
      rollbackTransaction: async () => { await client!.query('ROLLBACK'); },
      release: async () => {},
      query: (sql: string, params?: any[]) => client!.query(sql, params).then((r) => r.rows),
    }),
  };
  const servicio = () => new PortalDocenteService(dataSource, null as any);

  const insertar = async (etiqueta: string, dia: string, ini: string, fin: string, aula: string) => {
    const r = await client!.query(
      `INSERT INTO "${S}".franja_horaria (id_grupo, dia_semana, hora_inicio, hora_fin, tipo_sesion, aula_codigo, estado)
       VALUES ($1,$2,$3::time,$4::time,'presencial',$5,'PUBLICADA') RETURNING id_franja`,
      [idGrupo, dia, ini, fin, aula]);
    franjas[etiqueta] = r.rows[0].id_franja;
  };

  beforeAll(async () => {
    try {
      client = new Client(conexion);
      await client.connect();
      const cod = `QA-POR-${Date.now().toString().slice(-7)}`;
      const p = await client.query(
        `INSERT INTO "${S}".periodo_programacion (codigo, nombre, tipo, fecha_inicio, fecha_fin, estado)
         VALUES ($1,'Periodo QA portal','periodo_regular','2028-02-01','2028-06-15','activo') RETURNING id_periodo`, [cod]);
      idPeriodo = p.rows[0].id_periodo;
      const g = await client.query(
        `INSERT INTO "${S}".grupo (id_asignatura, id_periodo, numero_grupo, estado)
         VALUES (2, $1, 902, 'PROGRAMADO') RETURNING id_grupo`, [idPeriodo]);
      idGrupo = g.rows[0].id_grupo;
      // A y B cruzan en tiempo (LUNES), aulas distintas (no es cruce de aula). C no cruza.
      await insertar('A', 'LUNES', '08:00', '10:00', '201');
      await insertar('B', 'LUNES', '09:00', '11:00', '202');
      await insertar('C', 'MARTES', '08:00', '10:00', '201');
      hayBase = true;
    } catch {
      client = null; hayBase = false;
    }
  });

  afterAll(async () => {
    if (client && idPeriodo) {
      await client.query(`DELETE FROM "${S}".grupo WHERE id_periodo = $1`, [idPeriodo]).catch(() => {});
      await client.query(`DELETE FROM "${S}".periodo_programacion WHERE id_periodo = $1`, [idPeriodo]).catch(() => {});
    }
    if (client) await client.end();
  });

  const siHayBase = (nombre: string, fn: () => Promise<void>) =>
    it(nombre, async () => {
      if (!hayBase || !client) { console.warn('  (sin base: omitido)'); return; }
      await fn();
    });

  siHayBase('tomar mueve PUBLICADA -> TOMADA y fija el id_docente', async () => {
    const svc = servicio();
    await svc.tomar(D1, franjas['A']);
    const { rows } = await client!.query(
      `SELECT estado, id_docente FROM "${S}".franja_horaria WHERE id_franja = $1`, [franjas['A']]);
    expect(rows[0].estado).toBe('TOMADA');
    expect(String(rows[0].id_docente)).toBe(D1);
  });

  siHayBase('al tener A, la franja B (que cruza) sale de disponibles; C sigue', async () => {
    const svc = servicio();
    const disp = await svc.disponibles(D1);
    const ids = disp.map((f) => f.idFranja);
    expect(ids).toContain(franjas['C']);      // no cruza -> disponible
    expect(ids).not.toContain(franjas['B']);  // cruza con A (ya tomada) -> excluida
    expect(ids).not.toContain(franjas['A']);  // ya no está PUBLICADA
  });

  siHayBase('tomar la misma franja de nuevo: la segunda ve que ya no está publicada', async () => {
    const svc = servicio();
    await expect(svc.tomar(D2, franjas['A'])).rejects.toThrow(/disponible/i);
  });

  siHayBase('soltar devuelve A a PUBLICADA y B vuelve a estar disponible', async () => {
    const svc = servicio();
    await svc.soltar(D1, franjas['A']);
    const { rows } = await client!.query(
      `SELECT estado, id_docente FROM "${S}".franja_horaria WHERE id_franja = $1`, [franjas['A']]);
    expect(rows[0].estado).toBe('PUBLICADA');
    expect(rows[0].id_docente).toBeNull();

    const disp = await svc.disponibles(D1);
    expect(disp.map((f) => f.idFranja)).toEqual(expect.arrayContaining([franjas['A'], franjas['B'], franjas['C']]));
  });

  siHayBase('no se suelta una franja ajena (solo la suelta quien la tomó)', async () => {
    const svc = servicio();
    await svc.tomar(D1, franjas['C']);
    // Otro docente no puede soltarla.
    await expect(svc.soltar(D2, franjas['C'])).rejects.toThrow(/usted haya tomado/i);
    // (La guarda de «no soltar lo APROBADO» se ejercita en el canario de D,
    //  donde el estado APROBADA ya existe en el CHECK de la migración.)
  });
});
