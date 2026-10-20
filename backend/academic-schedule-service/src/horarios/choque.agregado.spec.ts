import { Client } from 'pg';

import { HorariosService } from './horarios.service.js';
import {
  buscarChoque, chocan, ciclosSeSolapan, encontrarCruces, type FranjaCruceable,
} from './choque.js';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { crearAsignatura, crearPeriodo } = require('../../test/catalogo-qa.cjs');

/**
 * LA regla de choque (`choque.ts`): mismo día + horas solapadas + CICLOS solapados.
 *
 * Reporte de Tomás: programó en un periodo y, al cambiar de periodo, las aulas seguían
 * ocupadas. `crearSesion` buscaba el aula por código y día, sin mirar periodo ni fechas.
 *
 * Parte 1 — la regla pura (sin base).
 * Parte 2 — contra la BASE REAL con DOS periodos, en una transacción que se revierte:
 *   sin solape de fechas no choca; con solape sí; y el ciclo propio del grupo manda sobre el
 *   del periodo (un grupo sin ciclo usa el del periodo).
 */
const f = (dia: string, ini: string, fin: string, cicloInicio: string | null, cicloFin: string | null) =>
  ({ diaSemana: dia, horaInicio: ini, horaFin: fin, cicloInicio, cicloFin });

describe('choque :: la regla pura (día + horas + ciclo)', () => {
  const regular = ['2098-02-01', '2098-06-15'] as const;
  const siguiente = ['2098-07-01', '2098-11-30'] as const;

  it('mismo día, horas solapadas y ciclos solapados: chocan', () => {
    expect(chocan(f('LUNES', '08:00', '10:00', ...regular), f('LUNES', '09:00', '11:00', ...regular))).toBe(true);
  });

  it('mismas horas pero ciclos que no se tocan: NO chocan (periodos distintos)', () => {
    expect(chocan(f('LUNES', '08:00', '10:00', ...regular), f('LUNES', '08:00', '10:00', ...siguiente))).toBe(false);
  });

  it('tocarse en el extremo de las horas no es solapar; en el extremo de las fechas sí', () => {
    expect(chocan(f('LUNES', '08:00', '10:00', ...regular), f('LUNES', '10:00', '12:00', ...regular))).toBe(false);
    expect(chocan(
      f('LUNES', '08:00', '10:00', '2098-02-01', '2098-06-15'),
      f('LUNES', '08:00', '10:00', '2098-06-15', '2098-11-30'),
    )).toBe(true); // el 15 de junio hay clase en los dos ciclos
  });

  it('día distinto: no chocan aunque todo lo demás coincida', () => {
    expect(chocan(f('LUNES', '08:00', '10:00', ...regular), f('MARTES', '08:00', '10:00', ...regular))).toBe(false);
  });

  it('sin fechas conocidas no se puede descartar el choque: se trata como solapado (lado seguro)', () => {
    expect(ciclosSeSolapan({ cicloInicio: null, cicloFin: null }, { cicloInicio: '2098-01-01', cicloFin: '2098-02-01' })).toBe(true);
    expect(chocan(f('LUNES', '08:00', '10:00', null, null), f('LUNES', '09:00', '11:00', ...regular))).toBe(true);
  });

  it('buscarChoque devuelve la primera que choca y respeta `ignorar`', () => {
    const existentes = [
      { ...f('LUNES', '08:00', '10:00', ...siguiente), id: 'otro-periodo' },
      { ...f('LUNES', '09:00', '11:00', ...regular), id: 'mismo-ciclo' },
    ];
    expect(buscarChoque(f('LUNES', '08:30', '09:30', ...regular), existentes)?.id).toBe('mismo-ciclo');
    expect(buscarChoque(f('LUNES', '08:30', '09:30', ...regular), existentes, (x) => x.id === 'mismo-ciclo')).toBeNull();
  });

  it('encontrarCruces: aula, docente y grupo, y no cruza lo virtual por aula', () => {
    const base = { idGrupo: 'g1', aulaCodigo: null, idDocente: null, estado: 'PROGRAMADO', idPeriodo: '1', ...regularCiclo() };
    const franjas: FranjaCruceable[] = [
      { ...base, idFranja: 'a', idGrupo: 'g1', aulaCodigo: 'X', diaSemana: 'LUNES', horaInicio: '08:00', horaFin: '10:00' },
      { ...base, idFranja: 'b', idGrupo: 'g2', aulaCodigo: 'X', diaSemana: 'LUNES', horaInicio: '09:00', horaFin: '11:00' },
      { ...base, idFranja: 'c', idGrupo: 'g3', idDocente: 'D', diaSemana: 'MARTES', horaInicio: '08:00', horaFin: '10:00' },
      { ...base, idFranja: 'd', idGrupo: 'g4', idDocente: 'D', diaSemana: 'MARTES', horaInicio: '09:00', horaFin: '11:00' },
      // virtual: sin aula, mismo grupo que otra a la misma hora
      { ...base, idFranja: 'e', idGrupo: 'g5', diaSemana: 'MIERCOLES', horaInicio: '08:00', horaFin: '10:00' },
      { ...base, idFranja: 'f', idGrupo: 'g5', diaSemana: 'MIERCOLES', horaInicio: '09:00', horaFin: '11:00' },
    ];
    const tipos = encontrarCruces(franjas).map((c) => `${c.tipo}:${c.dia}`).sort();
    expect(tipos).toEqual(['aula:LUNES', 'docente:MARTES', 'grupo:MIERCOLES']);
  });
});

function regularCiclo() { return { cicloInicio: '2098-02-01', cicloFin: '2098-06-15' }; }

// ─── Parte 2: base real, dos periodos ───────────────────────────────────────────────
const conexion = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 55432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'esap_db',
};
const S = 'academic-schedule';

describe('choque :: crear una franja con DOS periodos (agregado real, en transacción)', () => {
  let client: Client | null = null;
  let hayBase = false;

  beforeAll(async () => {
    try { client = new Client(conexion); await client.connect(); hayBase = true; }
    catch { client = null; hayBase = false; }
  });
  afterAll(async () => { if (client) await client.end().catch(() => {}); });

  /** HorariosService real sobre la base: repositorios mínimos respaldados por el cliente pg. */
  const servicio = () => {
    const q = (sql: string, p?: any[]) => client!.query(sql, p).then((r) => r.rows);
    const franjaRepo: any = {
      manager: { query: q },
      query: q,
      find: ({ where }: any) => q(
        `SELECT id_franja AS "idFranja", dia_semana AS "diaSemana", hora_inicio AS "horaInicio", hora_fin AS "horaFin"
           FROM "${S}".franja_horaria WHERE id_grupo = $1`, [where.idGrupo]),
      create: (d: any) => d,
      save: async (d: any) => (await q(
        `INSERT INTO "${S}".franja_horaria (id_grupo, dia_semana, hora_inicio, hora_fin, tipo_sesion, jornada, aula_codigo, estado)
         VALUES ($1,$2,$3::time,$4::time,$5,$6,$7,$8) RETURNING id_franja AS "idFranja"`,
        [d.idGrupo, d.diaSemana, d.horaInicio, d.horaFin, d.tipoSesion, d.jornada, d.aulaCodigo, d.estado]))[0],
    };
    const grupoRepo: any = {
      findOne: async ({ where }: any) => (await q(`SELECT id_grupo AS "idGrupo" FROM "${S}".grupo WHERE id_grupo = $1`, [where.idGrupo]))[0] ?? null,
    };
    return new HorariosService(franjaRepo, grupoRepo);
  };

  const enTransaccion = (nombre: string, fn: () => Promise<void>) =>
    it(nombre, async () => {
      if (!hayBase || !client) { console.warn('  (sin base: omitido)'); return; }
      await client.query('BEGIN');
      try { await fn(); } finally { await client.query('ROLLBACK'); }
    });

  const dto = (idGrupo: string, aula: string | null, ini = '08:00', fin = '10:00') =>
    ({ idGrupo, diaSemana: 'MARTES' as const, horaInicio: ini, horaFin: fin, tipoSesion: 'presencial' as const, aulaCodigo: aula });

  enTransaccion('el aula ocupada en un periodo NO está ocupada en otro de fechas que no se tocan; en el mismo, sí', async () => {
    const asig = await crearAsignatura(client);
    const regular = await crearPeriodo(client, { codigo: '2096-1', anio: 2096, semestre: 1, inicio: '2096-02-01', fin: '2096-06-15' });
    const siguiente = await crearPeriodo(client, { codigo: '2096-2', anio: 2096, semestre: 2, inicio: '2096-07-01', fin: '2096-11-30' });
    await client!.query(`INSERT INTO "${S}".aula (codigo, nombre, sede_codigo) VALUES ('QA-CHOQUE-A','Aula QA choque','SC'), ('QA-CHOQUE-B','Aula QA choque 2','SC')`);

    const grupo = async (idPeriodo: string, n: number, fi: string | null = null, ff: string | null = null) => (await client!.query(
      `INSERT INTO "${S}".grupo (id_asignatura, id_periodo_academico, tipo_oferta, numero_grupo, estado, fecha_inicio, fecha_fin)
       VALUES ($1::bigint, $2::bigint, 'periodo_regular', $3, 'PROGRAMADO', $4::date, $5::date) RETURNING id_grupo`,
      [asig.idAsignatura, idPeriodo, n, fi, ff])).rows[0].id_grupo as string;

    const gRegular = await grupo(regular.idPeriodo, 991);
    const gSiguiente = await grupo(siguiente.idPeriodo, 992);
    const gMismoPeriodo = await grupo(regular.idPeriodo, 993);

    // 1) Se programa en el periodo 2096-1.
    await servicio().crearSesion(dto(gRegular, 'QA-CHOQUE-A'));

    // 2) «Al cambiar de periodo, las aulas siguen ocupadas»: en 2096-2 el aula está libre.
    await expect(servicio().crearSesion(dto(gSiguiente, 'QA-CHOQUE-A'))).resolves.toBeDefined();

    // 3) En el MISMO periodo sí está ocupada (el mismo día y hora).
    await expect(servicio().crearSesion(dto(gMismoPeriodo, 'QA-CHOQUE-A'))).rejects.toThrow(/ya está ocupada/);
    //    …y a otra hora, o en otra aula, no.
    await expect(servicio().crearSesion(dto(gMismoPeriodo, 'QA-CHOQUE-A', '10:00', '12:00'))).resolves.toBeDefined();
    await expect(servicio().crearSesion(dto(gMismoPeriodo, 'QA-CHOQUE-B'))).resolves.toBeDefined();
  });

  enTransaccion('el ciclo propio del grupo manda sobre el de su periodo', async () => {
    const asig = await crearAsignatura(client);
    const regular = await crearPeriodo(client, { codigo: '2096-1', anio: 2096, semestre: 1, inicio: '2096-02-01', fin: '2096-06-15' });
    const siguiente = await crearPeriodo(client, { codigo: '2096-2', anio: 2096, semestre: 2, inicio: '2096-07-01', fin: '2096-11-30' });
    await client!.query(`INSERT INTO "${S}".aula (codigo, nombre, sede_codigo) VALUES ('QA-CHOQUE-A','Aula QA choque','SC')`);
    const grupo = async (idPeriodo: string, n: number, fi: string | null, ff: string | null) => (await client!.query(
      `INSERT INTO "${S}".grupo (id_asignatura, id_periodo_academico, tipo_oferta, numero_grupo, estado, fecha_inicio, fecha_fin)
       VALUES ($1::bigint, $2::bigint, 'periodo_regular', $3, 'PROGRAMADO', $4::date, $5::date) RETURNING id_grupo`,
      [asig.idAsignatura, idPeriodo, n, fi, ff])).rows[0].id_grupo as string;

    await servicio().crearSesion(dto(await grupo(siguiente.idPeriodo, 994, null, null), 'QA-CHOQUE-A')); // ciclo = 2096-2

    // Un grupo de 2096-1, pero con el ciclo de 2096-2: choca con el anterior.
    const trasladado = await grupo(regular.idPeriodo, 995, '2096-07-10', '2096-08-30');
    await expect(servicio().crearSesion(dto(trasladado, 'QA-CHOQUE-A'))).rejects.toThrow(/ya está ocupada/);

    // Un grupo de 2096-2 con ciclo dentro de 2096-1: ya no choca con el primero.
    const adelantado = await grupo(siguiente.idPeriodo, 996, '2096-03-01', '2096-04-30');
    await expect(servicio().crearSesion(dto(adelantado, 'QA-CHOQUE-A'))).resolves.toBeDefined();
  });
});
