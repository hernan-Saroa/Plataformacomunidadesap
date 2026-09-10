import { Client } from 'pg';

import { PublicacionService } from './publicacion.service.js';

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
      // Fixture: periodo QA + grupo (asignatura 2 existe) bajo ese periodo.
      const cod = `QA-PUB-${Date.now().toString().slice(-7)}`;
      const p = await client.query(
        `INSERT INTO "${S}".periodo_programacion (codigo, nombre, tipo, fecha_inicio, fecha_fin, estado)
         VALUES ($1,'Periodo QA publicacion','periodo_regular','2028-02-01','2028-06-15','activo')
         RETURNING id_periodo`, [cod]);
      idPeriodo = p.rows[0].id_periodo;
      const g = await client.query(
        `INSERT INTO "${S}".grupo (id_asignatura, id_periodo, numero_grupo, estado)
         VALUES (2, $1, 999, 'PROGRAMADO') RETURNING id_grupo`, [idPeriodo]);
      idGrupo = g.rows[0].id_grupo;
      hayBase = true;
    } catch {
      client = null;
      hayBase = false;
    }
  });

  afterAll(async () => {
    if (client && idPeriodo) {
      // El grupo cascada sus franjas (ON DELETE CASCADE); luego el periodo.
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
        if (/FROM "academic-schedule"\.franja_horaria f/.test(sql) && /JOIN "academic-schedule"\.grupo g/.test(sql)) {
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
    const cruces = await servicio.validarCruces('periodo-stub');
    expect(cruces.some((c) => c.tipo === 'aula' && c.recurso === '101')).toBe(true);
    await expect(servicio.publicar('periodo-stub')).rejects.toThrow(/cruce/i);
  });

  it('un docente cruza consigo mismo aunque una sesion sea virtual (sin aula)', async () => {
    const doc = '00000000-0000-0000-0000-0000000000aa';
    // Una presencial y una virtual (sin aula): NO cruzan por aula, SÍ por docente.
    const franjas = [
      { idFranja: 'a', aulaCodigo: '101', idDocente: doc, diaSemana: 'MIERCOLES', horaInicio: '08:00', horaFin: '10:00' },
      { idFranja: 'b', aulaCodigo: null, idDocente: doc, diaSemana: 'MIERCOLES', horaInicio: '09:00', horaFin: '11:00' },
    ];
    const servicio = servicioConFranjas(franjas);
    const cruces = await servicio.validarCruces('periodo-stub');
    expect(cruces.some((c) => c.tipo === 'docente')).toBe(true);
    expect(cruces.some((c) => c.tipo === 'aula')).toBe(false); // la virtual no aporta cruce de aula
  });
});
