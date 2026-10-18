import { Client } from 'pg';

import { DocenciaService } from '../docencia/docencia.service.js';
import { PortalDocenteService } from './portal-docente.service.js';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { crearAsignatura } = require('../../test/catalogo-qa.cjs');

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
// Dos docentes REALES del RUND (con su registro de docente): tomar ahora valida el tope.
const D1 = '39a6f90f-2daf-496d-9035-b057e4734873';
const D2 = '7192ba96-113f-4def-99e9-d6e940f18ecc';

describe('EFDS-1938 :: portal del docente (agregado real)', () => {
  let client: Client | null = null;
  let hayBase = false;
  // Asignatura propia del fixture (la base local puede no tener catálogo cargado).
  let idAsig = '';
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
      startTransaction: async () => { await client!.query('SAVEPOINT qr'); },
      commitTransaction: async () => { await client!.query('RELEASE SAVEPOINT qr'); },
      rollbackTransaction: async () => { await client!.query('ROLLBACK TO SAVEPOINT qr'); },
      release: async () => {},
      query: (sql: string, params?: any[]) => client!.query(sql, params).then((r) => r.rows),
    }),
  };
  // El contrato PROG↔PTA se simula a 10 h por grupo: lejos del tope (el tope tiene su propio canario).
  const docencia = () => new DocenciaService(dataSource, { calcularImpacto: async () => ({ horasImpacto: 10 }) } as any);
  const servicio = () => new PortalDocenteService(dataSource, null as any, docencia());

  const insertar = async (etiqueta: string, dia: string, ini: string, fin: string, aula: string, grupo = idGrupo) => {
    const r = await client!.query(
      `INSERT INTO "${S}".franja_horaria (id_grupo, dia_semana, hora_inicio, hora_fin, tipo_sesion, aula_codigo, estado)
       VALUES ($1,$2,$3::time,$4::time,'presencial',$5,'PUBLICADA') RETURNING id_franja`,
      [grupo, dia, ini, fin, aula]);
    franjas[etiqueta] = r.rows[0].id_franja;
  };

  beforeAll(async () => {
    try {
      client = new Client(conexion);
      await client.connect();
      // Todo el fixture vive en UNA transacción que se revierte al final: ninguna otra
      // conexión (otras pruebas en paralelo, como el canario de cruces) lo ve.
      await client.query('BEGIN');
      idAsig = (await crearAsignatura(client)).idAsignatura;
      const cod = `QA-POR-${Date.now().toString().slice(-7)}`;
      const p = await client.query(
        `INSERT INTO "${S}".periodo_programacion (codigo, nombre, tipo, fecha_inicio, fecha_fin, estado)
         VALUES ($1,'Periodo QA portal','periodo_regular','2028-02-01','2028-06-15','activo') RETURNING id_periodo`, [cod]);
      idPeriodo = p.rows[0].id_periodo;
      const g = await client.query(
        `INSERT INTO "${S}".grupo (id_asignatura, id_periodo, numero_grupo, estado)
         VALUES (${idAsig}, $1, 902, 'PROGRAMADO') RETURNING id_grupo`, [idPeriodo]);
      idGrupo = g.rows[0].id_grupo;
      // A y B cruzan en tiempo (LUNES), aulas distintas (no es cruce de aula). C no cruza.
      // B va en OTRO grupo: dos sesiones del mismo grupo a la vez son un cruce que la
      // API prohíbe, y el canario de cruces vivos (EFDS-2307) lo vería en paralelo.
      const g2 = await client.query(
        `INSERT INTO "${S}".grupo (id_asignatura, id_periodo, numero_grupo, estado)
         VALUES (${idAsig}, $1, 903, 'PROGRAMADO') RETURNING id_grupo`, [idPeriodo]);
      await insertar('A', 'LUNES', '08:00', '10:00', '201');
      await insertar('B', 'LUNES', '09:00', '11:00', '202', g2.rows[0].id_grupo);
      await insertar('C', 'MARTES', '08:00', '10:00', '201');
      hayBase = true;
    } catch (e) {
        // Solo la FALTA DE BASE se omite. Un fixture que falla (clave foránea, columna) se grita: antes se
        // saltaba en silencio y dejaba la conexión abierta dentro de una transacción abortada.
        const conectado = !!(client as any)?._connected;
        if (client) { await client.query('ROLLBACK').catch(() => {}); await client.end().catch(() => {}); }
        client = null; hayBase = false;
        if (conectado) throw e;
    }
  });

  afterAll(async () => {
    // Se revierte todo lo que creó la prueba (antes: COMMIT y DELETE al final).
    if (client) await client.query('ROLLBACK').catch(() => {});
    if (client) await client.end();
  });

  const siHayBase = (nombre: string, fn: () => Promise<void>) =>
    it(nombre, async () => {
      if (!hayBase || !client) { console.warn('  (sin base: omitido)'); return; }
      await client!.query('SAVEPOINT caso');
      // Un error SQL esperado no deja la transacción inservible para los casos siguientes.
      try { await fn(); await client!.query('RELEASE SAVEPOINT caso'); }
      catch (e) { await client!.query('ROLLBACK TO SAVEPOINT caso').catch(() => {}); throw e; }
    });

  siHayBase('tomar mueve PUBLICADA -> TOMADA y fija el id_docente', async () => {
    const svc = servicio();
    await svc.tomar(D1, franjas['A'], null);
    const { rows } = await client!.query(
      `SELECT estado, id_docente FROM "${S}".franja_horaria WHERE id_franja = $1`, [franjas['A']]);
    expect(rows[0].estado).toBe('TOMADA');
    expect(String(rows[0].id_docente)).toBe(D1);
  });

  siHayBase('cada franja trae su periodo (id y código): el portal lo necesita para enviar a concertación', async () => {
    const svc = servicio();
    const mias = await svc.misFranjas(D1);
    const a = mias.find((f) => f.idFranja === franjas['A'])!;
    expect(a.idPeriodo).toBe(idPeriodo);
    expect(a.periodoCodigo).toMatch(/^QA-POR-/);
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
    await expect(svc.tomar(D2, franjas['A'], null)).rejects.toThrow(/disponible/i);
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
    await svc.tomar(D1, franjas['C'], null);
    // Otro docente no puede soltarla.
    await expect(svc.soltar(D2, franjas['C'])).rejects.toThrow(/usted haya tomado/i);
    // (La guarda de «no soltar lo APROBADO» se ejercita en el canario de D,
    //  donde el estado APROBADA ya existe en el CHECK de la migración.)
  });

  siHayBase('lo que el docente tiene en OTRO periodo (fechas que no se tocan) no bloquea; si las fechas se tocan, sí', async () => {
    // Regla única de choque (`horarios/choque.ts`): día + horas + ciclo. Tres periodos, la misma franja
    // semanal (LUNES 14:00-16:00): 2029-1 y 2029-2 no se tocan entre sí; 2029-3 se cruza con los dos.
    const periodo = async (cod: string, ini: string, fin: string) => (await client!.query(
      `INSERT INTO "${S}".periodo_programacion (codigo, nombre, tipo, fecha_inicio, fecha_fin, estado)
       VALUES ($1,$1,'periodo_regular',$2::date,$3::date,'activo') RETURNING id_periodo`, [cod, ini, fin])).rows[0].id_periodo;
    const franjaEn = async (idPer: string, n: number) => {
      const g = await client!.query(
        `INSERT INTO "${S}".grupo (id_asignatura,id_periodo,numero_grupo,estado)
         VALUES (${idAsig},$1,$2,'PROGRAMADO') RETURNING id_grupo`, [idPer, n]);
      const f = await client!.query(
        `INSERT INTO "${S}".franja_horaria (id_grupo, dia_semana, hora_inicio, hora_fin, tipo_sesion, estado)
         VALUES ($1,'LUNES','14:00'::time,'16:00'::time,'mediada_tecnologia','PUBLICADA') RETURNING id_franja`, [g.rows[0].id_grupo]);
      return f.rows[0].id_franja as string;
    };
    const x = await franjaEn(await periodo('QA-POR-29A', '2029-02-01', '2029-06-15'), 931);
    const y = await franjaEn(await periodo('QA-POR-29B', '2029-07-01', '2029-11-30'), 932);
    const z = await franjaEn(await periodo('QA-POR-29C', '2029-06-01', '2029-07-15'), 933);

    const svc = servicio();
    await svc.tomar(D2, x, null);
    const ids = (await svc.disponibles(D2)).map((f) => f.idFranja);
    expect(ids).toContain(y);        // mismo día y hora, pero en otro periodo sin solape: libre
    expect(ids).not.toContain(z);    // su ciclo se toca con el de X: cruza
    await expect(svc.tomar(D2, z, null)).rejects.toThrow(/se cruza/i);
    await expect(svc.tomar(D2, y, null)).resolves.toEqual({ tomada: true });
  });
});
