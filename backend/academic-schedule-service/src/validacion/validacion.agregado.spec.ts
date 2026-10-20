import { Client } from 'pg';

import { ValidacionService } from './validacion.service.js';

/**
 * 3.9 :: cruces del histórico.
 *
 * El conteo depende ENTERAMENTE de la regla, así que el canario afirma la regla,
 * no un número redondo: ignorar el solape de CICLO infla el resultado, porque el
 * mismo salón a la misma hora en semanas distintas no es un cruce.
 *
 * Las filas del histórico son FIXTURES de cada prueba, dentro de una transacción que se
 * revierte: el histórico real (575 filas) es un respaldo que puede estar fuera de la base
 * local, y la regla no debe depender de que alguien lo haya importado.
 */
const conexion = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 55432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'esap_db',
};
const H = '"academic-schedule".programacion_historica';

interface FilaHistorica {
  periodo?: string; dia?: string; horaInicio?: string; horaFin?: string; aula?: string;
  cedula?: string; docente?: string; asignatura?: string; programa?: string;
  fechaInicio?: string; fechaFin?: string;
}

describe('3.9 :: cruces de la programacion historica (fixtures en transaccion)', () => {
  let client: Client | null = null;
  let hayBase = false;

  beforeAll(async () => {
    try { client = new Client(conexion); await client.connect(); hayBase = true; }
    catch { client = null; hayBase = false; }
  });
  afterAll(async () => { if (client) await client.end(); });

  const servicio = () => new ValidacionService({
    query: (sql: string, params?: any[]) => client!.query(sql, params).then((r) => r.rows),
  } as any);

  const insertar = async (filas: FilaHistorica[]) => {
    for (const [i, f] of filas.entries()) {
      await client!.query(
        `INSERT INTO ${H} (periodo, dia, hora_inicio, hora_fin, aula, cedula_docente, nombre_docente,
                           asignatura, programa, fecha_inicio, fecha_fin)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [f.periodo ?? '2098-1', f.dia ?? 'LUNES', f.horaInicio ?? '08:00', f.horaFin ?? '10:00', f.aula ?? '',
          f.cedula ?? '', f.docente ?? '', f.asignatura ?? `Asignatura ${i}`, f.programa ?? 'Programa QA',
          f.fechaInicio ?? '2098-02-01', f.fechaFin ?? '2098-06-15']);
    }
  };

  const siHayBase = (nombre: string, fn: () => Promise<void>) =>
    it(nombre, async () => {
      if (!hayBase || !client) { console.warn('  (sin base: omitido)'); return; }
      await client.query('BEGIN');
      try { await fn(); } finally { await client.query('ROLLBACK'); }
    });

  siHayBase('el servicio real detecta cruces y los clasifica en aula y docente', async () => {
    await insertar([
      // Aula: mismo salón, mismo día, horas solapadas, mismo ciclo.
      { aula: 'QA-A1', horaInicio: '08:00', horaFin: '10:00' },
      { aula: 'QA-A1', horaInicio: '09:00', horaFin: '11:00' },
      // Docente: la misma cédula a la vez, en salones distintos.
      { dia: 'MARTES', aula: 'QA-B1', cedula: '999', docente: 'Docente QA' },
      { dia: 'MARTES', aula: 'QA-B2', cedula: '999', docente: 'Docente QA' },
    ]);
    const cruces = await servicio().crucesHistoricos('2098-1');
    const resumen = await servicio().resumen('2098-1');

    expect(cruces).toHaveLength(2);
    expect(resumen).toEqual({ aula: 1, docente: 1, total: 2 });
    // Solo dos tipos, sin categorías sorpresa.
    expect([...new Set(cruces.map((c) => c.tipo))].sort()).toEqual(['aula', 'docente']);
    // Todo cruce trae las dos asignaturas implicadas: sin eso no es accionable.
    expect(cruces.every((c) => c.asignaturaA && c.asignaturaB)).toBe(true);
  });

  siHayBase('IGNORAR el ciclo infla el conteo: la regla exige solape de fechas', async () => {
    await insertar([
      { aula: 'QA-A1', horaInicio: '08:00', horaFin: '10:00' },
      { aula: 'QA-A1', horaInicio: '09:00', horaFin: '11:00' },
      // Mismo salón, día y hora, pero en OTRAS semanas: no es un cruce.
      { aula: 'QA-A1', horaInicio: '09:00', horaFin: '11:00', fechaInicio: '2098-07-01', fechaFin: '2098-11-30' },
    ]);
    const cuenta = async (conFecha: boolean) => {
      const filtroFecha = conFecha
        ? "AND (a.fi IS NULL OR b.fi IS NULL OR (a.fi <= b.ff AND b.fi <= a.ff))"
        : '';
      const { rows } = await client!.query(
        `WITH base AS (
           SELECT id, periodo, dia, aula, hora_inicio, hora_fin,
                  NULLIF(fecha_inicio,'')::date AS fi, NULLIF(fecha_fin,'')::date AS ff
             FROM ${H}
            WHERE dia <> '' AND hora_inicio ~ '^[0-9]{2}:[0-9]{2}$' AND hora_fin ~ '^[0-9]{2}:[0-9]{2}$'
         )
         SELECT COUNT(*)::int AS n FROM base a JOIN base b
           ON a.id < b.id AND a.periodo = b.periodo AND a.dia = b.dia
          AND a.aula = b.aula AND a.aula <> ''
          AND a.hora_inicio < b.hora_fin AND b.hora_inicio < a.hora_fin ${filtroFecha}`);
      return rows[0].n as number;
    };

    expect(await cuenta(true)).toBe(1);
    expect(await cuenta(false)).toBe(3);
    // Si alguien quita el solape de fechas, el conteo se dispara: eso delata
    // que se está contando como cruce lo que solo comparte franja semanal.
    // Y el SERVICIO real cuenta el bueno.
    expect((await servicio().crucesHistoricos('2098-1')).filter((c) => c.tipo === 'aula')).toHaveLength(1);
  });

  siHayBase('la programacion VIVA no tiene cruces de aula: el sistema los rechaza', async () => {
    // Es el contador del panel, y es 0 POR DISEÑO. Fuente distinta a la de
    // arriba: franja_horaria, no programacion_historica. Se mide con la regla única
    // (día + horas + ciclo): el mismo salón en periodos de otras fechas no cuenta.
    expect((await servicio().crucesVivos()).aula).toBe(0);
  });

  siHayBase('un espacio VIRTUAL nunca cruza por aula', async () => {
    // El Excel contaba las 40 sesiones de Campus Moodle entre si y producia 40
    // falsos positivos: un campus virtual no tiene ocupacion fisica.
    await insertar([
      { aula: 'Campus Moodle', horaInicio: '08:00', horaFin: '10:00' },
      { aula: 'Campus Moodle', horaInicio: '09:00', horaFin: '11:00' },
      { aula: 'Espacio Virtual', horaInicio: '08:00', horaFin: '10:00' },
      { aula: 'Espacio Virtual', horaInicio: '09:00', horaFin: '11:00' },
    ]);
    const cruces = await servicio().crucesHistoricos('2098-1');
    expect(cruces.filter((c) => c.tipo === 'aula' && /moodle|virtual/i.test(c.recurso))).toHaveLength(0);
    expect(cruces).toHaveLength(0);
  });
});
