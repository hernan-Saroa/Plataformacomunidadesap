import { Client } from 'pg';

import { PublicacionService } from './publicacion.service.js';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { crearAsignatura } = require('../../test/catalogo-qa.cjs');

/**
 * NUEVA-1 / EFDS-1937 :: publicación de la programación.
 *
 * Canario AGREGADO sobre la base real: monta un periodo QA con su grupo y unas
 * franjas, ejercita el SERVICIO real (no una copia de la regla) y afirma sobre
 * lo INVARIANTE del ciclo PROGRAMADO → PUBLICADA → TOMADA:
 *   · publicar sin cruces mueve TODO lo PROGRAMADO a PUBLICADA y conserva el total;
 *   · retirar vuelve a PROGRAMADO… salvo que alguien ya haya tomado una franja;
 *   · publicar con un cruce (misma aula/mismo docente, solapados) se rechaza.
 */
const conexion = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 55432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'esap_db',
};

const S = 'academic-schedule';

describe('EFDS-1937 :: publicar la programacion (agregado real)', () => {
  let client: Client | null = null;
  let hayBase = false;
  let idPeriodo = '';
  let idGrupo = '';

  const servicioReal = () => {
    const dataSource = {
      query: (sql: string, params?: any[]) => client!.query(sql, params).then((r) => r.rows),
    };
    return new PublicacionService(dataSource as any);
  };

  const insertarFranja = (dia: string, ini: string, fin: string, aula: string | null, docente: string | null) =>
    client!.query(
      `INSERT INTO "${S}".franja_horaria (id_grupo, dia_semana, hora_inicio, hora_fin, tipo_sesion, aula_codigo, id_docente, estado)
       VALUES ($1,$2,$3,$4,'presencial',$5,$6,'PROGRAMADO')`,
      [idGrupo, dia, ini, fin, aula, docente]);

  beforeAll(async () => {
    try {
      client = new Client(conexion);
      await client.connect();
      // Todo el fixture vive en UNA transacción que se revierte al final: ninguna otra
      // conexión (otras pruebas en paralelo, como el canario de cruces) lo ve.
      await client.query('BEGIN');
      // Fixture: periodo QA + grupo (con una asignatura propia de la transacción) bajo ese periodo.
      const asig = await crearAsignatura(client);
      const cod = `QA-PUB-${Date.now().toString().slice(-7)}`;
      const p = await client.query(
        `INSERT INTO "${S}".periodo_programacion (codigo, nombre, tipo, fecha_inicio, fecha_fin, estado)
         VALUES ($1,'Periodo QA publicacion','periodo_regular','2028-02-01','2028-06-15','activo')
         RETURNING id_periodo`, [cod]);
      idPeriodo = p.rows[0].id_periodo;
      const g = await client.query(
        `INSERT INTO "${S}".grupo (id_asignatura, id_periodo, numero_grupo, estado)
         VALUES ($2::bigint, $1, 999, 'PROGRAMADO') RETURNING id_grupo`, [idPeriodo, asig.idAsignatura]);
      idGrupo = g.rows[0].id_grupo;
      hayBase = true;
    } catch {
      client = null;
      hayBase = false;
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

  siHayBase('publicar sin cruces mueve todo PROGRAMADO a PUBLICADA y conserva el total', async () => {
    // Dos franjas sin cruce: aulas distintas, aunque coincidan en día y hora.
    // DOMINGO 06:00 a propósito: ninguna franja real vive ahí, así que este
    // fixture no colisiona con el canario global de "programación viva sin
    // cruces" ni siquiera bajo ejecución en paralelo.
    await insertarFranja('DOMINGO', '06:00', '07:00', '101', null);
    await insertarFranja('DOMINGO', '06:00', '07:00', '102', null);
    const servicio = servicioReal();

    const antes = await servicio.estado(idPeriodo);
    expect(antes.programado).toBe(2);
    expect(antes.publicada).toBe(0);

    const tras = await servicio.publicar(idPeriodo);
    expect(tras.programado).toBe(0);
    expect(tras.publicada).toBe(2);
    expect(tras.total).toBe(antes.total); // el total se conserva

    // Retirar: sin nadie que haya tomado, vuelve a PROGRAMADO.
    const retirado = await servicio.retirar(idPeriodo);
    expect(retirado.publicada).toBe(0);
    expect(retirado.programado).toBe(2);
  });

  siHayBase('no se retira la publicacion si una franja ya fue tomada', async () => {
    const servicio = servicioReal();
    await servicio.publicar(idPeriodo);
    // Simula que un docente tomó una franja (lo que hará Bloque C).
    await client!.query(
      `UPDATE "${S}".franja_horaria f SET estado='TOMADA', id_docente=gen_random_uuid()
         FROM "${S}".grupo g
        WHERE g.id_grupo=f.id_grupo AND g.id_periodo=$1 AND f.estado='PUBLICADA'
        AND f.id_franja = (SELECT id_franja FROM "${S}".franja_horaria WHERE id_grupo=$2 LIMIT 1)`,
      [idPeriodo, idGrupo]);

    await expect(servicio.retirar(idPeriodo)).rejects.toThrow(/tomad/i);

    // Y la publicación sigue en pie: la guarda no revirtió nada.
    const est = await servicio.estado(idPeriodo);
    expect(est.tomada).toBe(1);
    expect(est.publicada).toBe(1);

    // Limpieza del estado para no arrastrar a otras aserciones.
    await client!.query(
      `UPDATE "${S}".franja_horaria f SET estado='PROGRAMADO', id_docente=NULL
         FROM "${S}".grupo g WHERE g.id_grupo=f.id_grupo AND g.id_periodo=$1`, [idPeriodo]);
  });

  // La DETECCIÓN de cruce es lógica determinista. Se ejercita con un dataSource
  // en memoria en vez de insertar franjas cruzadas en la tabla real: hacerlo
  // dejaría, aunque fuera un instante, un cruce vivo que el canario global de
  // validación (que escanea TODA franja_horaria) vería al correr en paralelo.
  // Mismo servicio, misma regla; solo cambia el origen de las filas.
  const servicioConFranjas = (franjas: any[]) => {
    const dataSource = {
      query: (sql: string) => {
        // Las franjas del periodo se piden por `f.id_grupo IN (<grupos del alcance>)` (EFDS-2302),
        // con el cargador compartido de `horarios/choque.ts` (une grupo y periodos para el ciclo).
        if (/FROM "academic-schedule"\.franja_horaria f[\s\S]*WHERE f\.id_grupo IN/.test(sql) && /SELECT f\.id_franja/.test(sql)) {
          return Promise.resolve(franjas);
        }
        return Promise.resolve([{ '1': 1 }]); // exigirPeriodo, etc.
      },
    };
    return new PublicacionService(dataSource as any);
  };

  it('publicar con un cruce de aula (mismo salon, solapado) se rechaza', async () => {
    const franjas = [
      { idFranja: 'a', aulaCodigo: '101', idDocente: null, diaSemana: 'MARTES', horaInicio: '08:00', horaFin: '10:00' },
      { idFranja: 'b', aulaCodigo: '101', idDocente: null, diaSemana: 'MARTES', horaInicio: '09:00', horaFin: '11:00' },
    ];
    const servicio = servicioConFranjas(franjas);
    const cruces = await servicio.validarCruces('00000000-0000-4000-8000-0000000000a1');
    expect(cruces.some((c) => c.tipo === 'aula' && c.recurso === '101')).toBe(true);
    await expect(servicio.publicar('00000000-0000-4000-8000-0000000000a1')).rejects.toThrow(/cruce/i);
  });

  it('el mismo salon a la misma hora en ciclos que NO se tocan no es cruce; con ciclos que se tocan, sí', async () => {
    const regular = { cicloInicio: '2098-02-01', cicloFin: '2098-06-15' };
    const siguiente = { cicloInicio: '2098-07-01', cicloFin: '2098-11-30' };
    const traslapado = { cicloInicio: '2098-06-01', cicloFin: '2098-07-15' };
    const base = { aulaCodigo: '101', idDocente: null, diaSemana: 'MARTES', horaInicio: '08:00', horaFin: '10:00' };
    const periodo = '00000000-0000-4000-8000-0000000000a1';

    const sinToque = servicioConFranjas([
      { ...base, idFranja: 'a', ...regular }, { ...base, idFranja: 'b', ...siguiente },
    ]);
    expect(await sinToque.validarCruces(periodo)).toEqual([]);

    const conToque = servicioConFranjas([
      { ...base, idFranja: 'a', ...regular }, { ...base, idFranja: 'b', ...traslapado },
    ]);
    expect((await conToque.validarCruces(periodo)).some((c) => c.tipo === 'aula')).toBe(true);
  });

  it('un docente cruza consigo mismo aunque una sesion sea virtual (sin aula)', async () => {
    const doc = '00000000-0000-0000-0000-0000000000aa';
    // Una presencial y una virtual (sin aula): NO cruzan por aula, SÍ por docente.
    const franjas = [
      { idFranja: 'a', aulaCodigo: '101', idDocente: doc, diaSemana: 'MIERCOLES', horaInicio: '08:00', horaFin: '10:00' },
      { idFranja: 'b', aulaCodigo: null, idDocente: doc, diaSemana: 'MIERCOLES', horaInicio: '09:00', horaFin: '11:00' },
    ];
    const servicio = servicioConFranjas(franjas);
    const cruces = await servicio.validarCruces('00000000-0000-4000-8000-0000000000a1');
    expect(cruces.some((c) => c.tipo === 'docente')).toBe(true);
    expect(cruces.some((c) => c.tipo === 'aula')).toBe(false); // la virtual no aporta cruce de aula
  });
});
