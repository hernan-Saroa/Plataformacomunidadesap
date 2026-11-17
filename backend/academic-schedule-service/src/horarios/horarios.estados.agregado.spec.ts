import { Client } from 'pg';

import { HorariosService } from './horarios.service.js';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { crearAsignatura, crearPeriodo, unico } = require('../../test/catalogo-qa.cjs');

/**
 * EFDS-2432 (editar/eliminar una sesión con reglas por estado) y EFDS-2430 (varios días, todo o nada),
 * con el SQL REAL. Sobre la base real, en una transacción que se revierte, con datos propios QA.
 */
const conexion = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 55432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'esap_secure_password_2024',
  database: process.env.DB_NAME || 'esap_db',
};
const S = 'academic-schedule';
const AW = 'academic_work_plan';
const camel = (k: string) => k.replace(/_([a-z])/g, (_m, c) => c.toUpperCase());

describe('EFDS-2432/2430 :: horarios — estados, devolución, lote (agregado real)', () => {
  let client: Client | null = null;
  let hayBase = false;
  const ids: Record<string, string> = {};
  let auditorias: any[] = [];
  const fetchAntes = (global as any).fetch;

  const filas = (sql: string, p?: any[]) => client!.query(sql, p).then((r) => r.rows);
  const aCamel = (r: any) => (r ? Object.fromEntries(Object.entries(r).map(([k, v]) => [camel(k), v])) : r);
  const manager: any = { query: filas, transaction: (cb: (m: any) => Promise<any>) => cb(manager) };
  const franjaRepo: any = {
    manager, query: filas,
    findOne: async ({ where }: any) => aCamel((await filas(`SELECT * FROM "${S}".franja_horaria WHERE id_franja = $1`, [where.idFranja]))[0]),
    find: async ({ where }: any) => (await filas(`SELECT * FROM "${S}".franja_horaria WHERE id_grupo = $1 ORDER BY dia_semana, hora_inicio`, [where.idGrupo])).map(aCamel),
    create: (x: any) => x,
    save: async (x: any) => aCamel((await filas(
      `INSERT INTO "${S}".franja_horaria (id_grupo, dia_semana, hora_inicio, hora_fin, tipo_sesion, jornada, sede_codigo, aula_codigo, estado)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [x.idGrupo, x.diaSemana, x.horaInicio, x.horaFin, x.tipoSesion, x.jornada, x.sedeCodigo, x.aulaCodigo, x.estado]))[0]),
    remove: async (x: any) => filas(`DELETE FROM "${S}".franja_horaria WHERE id_franja = $1`, [x.idFranja]),
  };
  const grupoRepo: any = {
    findOne: async ({ where }: any) => aCamel((await filas(`SELECT * FROM "${S}".grupo WHERE id_grupo = $1`, [where.idGrupo]))[0]),
  };
  const servicio = () => new HorariosService(franjaRepo, grupoRepo);

  beforeAll(async () => {
    try {
      client = new Client(conexion);
      await client.connect();
      await client.query('BEGIN');
      const existente = await filas(`SELECT id::text AS id FROM ${AW}.periodo_academico WHERE codigo = '2050-1'`);
      ids.periodo = existente[0]?.id ?? (await crearPeriodo(client, { anio: 2050, semestre: 1 })).idPeriodo;
      const asig = await crearAsignatura(client, { tipo: 'pregrado', horasClase: 64 });
      ids.grupo = (await filas(
        `INSERT INTO "${S}".grupo (id_asignatura, id_periodo_academico, tipo_oferta, numero_grupo, estado, fecha_inicio, fecha_fin)
         VALUES ($1, $2, 'periodo_regular', 1, 'PROGRAMADO', '2050-02-02', '2050-05-24') RETURNING id_grupo::text AS id`,
        [asig.idAsignatura, ids.periodo]))[0].id;
      const persona = (await filas(`SELECT id_person::text AS id FROM auth.personas LIMIT 1`))[0];
      ids.docente = persona.id;
      hayBase = true;
    } catch (e) {
      const conectado = !!(client as any)?._connected;
      if (client) { await client.query('ROLLBACK').catch(() => {}); await client.end().catch(() => {}); }
      client = null; hayBase = false;
      if (conectado) throw e; // con base y fixture fallido, se grita
      console.warn('  (sin base: omitido)', (e as Error).message);
    }
  });
  afterAll(async () => {
    (global as any).fetch = fetchAntes;
    if (client) await client.query('ROLLBACK').catch(() => {});
    if (client) await client.end().catch(() => {});
  });
  beforeEach(() => {
    auditorias = [];
    (global as any).fetch = jest.fn(async (url: string, init: any) => {
      if (String(url).endsWith('/logs')) auditorias.push(JSON.parse(init.body));
      return { ok: true, json: async () => ({}) } as any;
    });
  });

  const caso = (nombre: string, fn: () => Promise<void>) =>
    it(nombre, async () => {
      if (!hayBase || !client) { console.warn('  (sin base: omitido)'); return; }
      await client.query('SAVEPOINT caso');
      try { await fn(); } finally { await client.query('ROLLBACK TO SAVEPOINT caso').catch(() => {}); }
    });

  const franja = async (dia: string, ini: string, fin: string, estado = 'PROGRAMADO', docente: string | null = null) => (await filas(
    `INSERT INTO "${S}".franja_horaria (id_grupo, dia_semana, hora_inicio, hora_fin, tipo_sesion, estado, id_docente)
     VALUES ($1, $2, $3, $4, 'presencial', $5, $6) RETURNING id_franja::text AS id`, [ids.grupo, dia, ini, fin, estado, docente]))[0].id;
  const leer = async (id: string) => (await filas(`SELECT dia_semana, to_char(hora_inicio,'HH24:MI') AS ini, to_char(hora_fin,'HH24:MI') AS fin, estado, id_docente::text AS doc, aula_codigo FROM "${S}".franja_horaria WHERE id_franja = $1`, [id]))[0];
  const total = async () => Number((await filas(`SELECT COUNT(*)::int AS n FROM "${S}".franja_horaria WHERE id_grupo = $1`, [ids.grupo]))[0].n);
  const concertacion = async (estado: string, franjas: string[]) => (await filas(
    `INSERT INTO "${S}".concertacion_docencia (id_docente, periodo_ref, nivel, estado, horas, franjas, huella)
     VALUES ($1, $2, 'pregrado', $3, 32, $4::jsonb, $5) RETURNING id_concertacion::text AS id`,
    [ids.docente, ids.periodo, estado, JSON.stringify(franjas.map((idFranja) => ({ idFranja }))), 'a'.repeat(64)]))[0].id;
  const estadoConc = async (id: string) => (await filas(`SELECT estado, comentario FROM "${S}".concertacion_docencia WHERE id_concertacion = $1`, [id]))[0];
  const rechazo = async (p: Promise<any>) => p.then(() => null, (e: any) => ({ status: e?.getStatus?.(), ...(e?.getResponse?.() ?? {}), message: e?.response?.message ?? e?.message }));

  // ── EFDS-2432 ───────────────────────────────────────────────────────────────────────────────────

  caso('editar una sesión libre: cambia día, horas y aula; recalcula las horas y audita valor anterior y nuevo', async () => {
    const f = await franja('LUNES', '08:00', '10:00');
    const r = await servicio().actualizarSesion(f, { diaSemana: 'JUEVES' as any, horaInicio: '10:00', horaFin: '12:00' }, { idUser: 'u-1' });
    expect(await leer(f)).toMatchObject({ dia_semana: 'JUEVES', ini: '10:00', fin: '12:00' });
    expect(r.concertacionDevuelta).toBeNull();
    expect(r.horas).toMatchObject({ programadas: expect.any(Number) });
    expect(auditorias).toHaveLength(1);
    expect(auditorias[0]).toMatchObject({
      method: 'PATCH', entityName: 'franja_horaria', entityId: f, action: 'actualizar_sesion',
      previousData: { diaSemana: 'LUNES', horaInicio: '08:00', horaFin: '10:00' },
      newData: { diaSemana: 'JUEVES', horaInicio: '10:00', horaFin: '12:00', usuario: 'u-1' },
    });
  });

  caso('editar valida lo mismo que crear: forma, múltiplos de 5, choque intra-grupo; una sesión no choca consigo misma', async () => {
    const a = await franja('LUNES', '08:00', '10:00');
    await franja('MARTES', '08:00', '10:00');
    const s = servicio();
    expect((await rechazo(s.actualizarSesion(a, { horaFin: '07:00' })))?.status).toBe(400);
    expect((await rechazo(s.actualizarSesion(a, { horaInicio: '08:03' })))?.status).toBe(400);
    expect((await rechazo(s.actualizarSesion(a, { diaSemana: 'MARTES' as any })))?.message).toMatch(/se cruza con otra del mismo grupo/);
    // Cambiar solo el aula a la misma franja no choca con ella misma.
    await expect(s.actualizarSesion(a, { horaFin: '10:00', tipoSesion: 'presencial' })).resolves.toBeDefined();
    expect(await leer(a)).toMatchObject({ dia_semana: 'LUNES', ini: '08:00', fin: '10:00' });
  });

  caso('TOMADA con docente: 409 FRANJA_TOMADA; con confirmarDevolucion se edita y queda sin docente (y el grupo sin «docente único»)', async () => {
    const f = await franja('LUNES', '08:00', '10:00', 'TOMADA', ids.docente);
    await filas(`INSERT INTO "${S}".asignacion_docente (id_grupo, id_docente, updated_at) VALUES ($1, $2, NOW())`, [ids.grupo, ids.docente]);
    const s = servicio();
    const e = await rechazo(s.actualizarSesion(f, { horaFin: '11:00' }));
    expect(e).toMatchObject({ status: 409, code: 'FRANJA_TOMADA' });
    expect(await leer(f)).toMatchObject({ fin: '10:00', doc: ids.docente }); // nada cambió
    await s.actualizarSesion(f, { horaFin: '11:00', confirmarDevolucion: true }, { idUser: null });
    expect(await leer(f)).toMatchObject({ fin: '11:00', doc: null, estado: 'PROGRAMADO' });
    expect(await filas(`SELECT 1 FROM "${S}".asignacion_docente WHERE id_grupo = $1`, [ids.grupo])).toEqual([]);
  });

  caso('en concertación POR_ACEPTAR: 409 EN_CONCERTACION con la concertación; confirmada, se edita y la concertación pasa a DEVUELTA con comentario', async () => {
    const f = await franja('LUNES', '08:00', '10:00', 'TOMADA', ids.docente);
    const c = await concertacion('POR_ACEPTAR', [f]);
    const e = await rechazo(servicio().eliminarSesion(f));
    expect(e).toMatchObject({ status: 409, code: 'EN_CONCERTACION', concertacion: { id: c, estado: 'POR_ACEPTAR' } });
    expect(await total()).toBe(1);
    const r = await servicio().actualizarSesion(f, { horaFin: '11:00', confirmarDevolucion: true });
    expect(r.concertacionDevuelta).toBe(c);
    expect(await estadoConc(c)).toMatchObject({ estado: 'DEVUELTA', comentario: expect.stringMatching(/se modificó una sesión/) });
  });

  caso('ACEPTADA (aplicada al PTA) o franja APROBADA: 409 CONCERTACION_ACEPTADA, y confirmar NO lo fuerza — ni editar ni eliminar', async () => {
    const f = await franja('LUNES', '08:00', '10:00', 'APROBADA', ids.docente);
    const c = await concertacion('ACEPTADA', [f]);
    const s = servicio();
    expect(await rechazo(s.actualizarSesion(f, { horaFin: '11:00', confirmarDevolucion: true }))).toMatchObject({ status: 409, code: 'CONCERTACION_ACEPTADA' });
    expect(await rechazo(s.eliminarSesion(f, { confirmarDevolucion: true }))).toMatchObject({ status: 409, code: 'CONCERTACION_ACEPTADA' });
    expect(await leer(f)).toMatchObject({ fin: '10:00', estado: 'APROBADA' });
    expect((await estadoConc(c)).estado).toBe('ACEPTADA');
    expect(auditorias).toHaveLength(0);
  });

  caso('eliminar una sesión libre la borra, recalcula horas y audita; PUBLICADA sin docente también es libre', async () => {
    const f = await franja('LUNES', '08:00', '10:00', 'PUBLICADA');
    const r = await servicio().eliminarSesion(f, {}, { idUser: 'u-2' });
    expect(r).toMatchObject({ eliminado: true, concertacionDevuelta: null });
    expect(await total()).toBe(0);
    expect(auditorias[0]).toMatchObject({ method: 'DELETE', action: 'eliminar_sesion', previousData: { diaSemana: 'LUNES', horaInicio: '08:00' }, newData: { eliminada: true, usuario: 'u-2' } });
  });

  // ── EFDS-2430 ───────────────────────────────────────────────────────────────────────────────────

  caso('lote/validar: dice qué días chocan y NO escribe nada', async () => {
    await franja('MIERCOLES', '18:00', '20:00');
    const antes = await total();
    const r = await servicio().validarLote({ idGrupo: ids.grupo, dias: ['LUNES', 'MIERCOLES', 'VIERNES'] as any, horaInicio: '18:00', horaFin: '20:00' });
    expect(r.valido).toBe(false);
    expect(r.dias.map((d) => [d.diaSemana, d.ok])).toEqual([['LUNES', true], ['MIERCOLES', false], ['VIERNES', true]]);
    expect(r.dias[1].conflictos[0]).toMatchObject({ tipo: 'INTRA_GRUPO' });
    expect(r.horas).toMatchObject({ programadasDespues: expect.any(Number) });
    expect(await total()).toBe(antes);
  });

  caso('lote: con un día en conflicto, 409 y NO se crea ninguna sesión (todo o nada)', async () => {
    await franja('MIERCOLES', '18:00', '20:00');
    const antes = await total();
    const e = await rechazo(servicio().crearLote({ idGrupo: ids.grupo, dias: ['LUNES', 'MIERCOLES', 'VIERNES'] as any, horaInicio: '18:00', horaFin: '20:00' }));
    expect(e).toMatchObject({ status: 409, code: 'LOTE_CON_CONFLICTOS', valido: false });
    expect(await total()).toBe(antes);
    expect(auditorias).toHaveLength(0);
  });

  caso('lote: sin conflictos crea una sesión por día, con horas del servidor y auditoría', async () => {
    const r = await servicio().crearLote({ idGrupo: ids.grupo, dias: ['LUNES', 'MIERCOLES', 'VIERNES'] as any, horaInicio: '18:00', horaFin: '20:00' }, { idUser: 'u-3' });
    expect(r.creadas).toHaveLength(3);
    expect(await total()).toBe(3);
    expect(r.horas).toMatchObject({ programadas: expect.any(Number) });
    expect(auditorias[0]).toMatchObject({ action: 'crear_sesiones_lote', newData: { dias: ['LUNES', 'MIERCOLES', 'VIERNES'], usuario: 'u-3' } });
  });

  caso('lote: sin días, días inválidos o grupo inexistente → 400/404 y nada se escribe', async () => {
    const s = servicio();
    expect((await rechazo(s.validarLote({ idGrupo: ids.grupo, dias: [] as any, horaInicio: '18:00', horaFin: '20:00' })))?.status).toBe(400);
    expect((await rechazo(s.validarLote({ idGrupo: ids.grupo, dias: ['FERIADO'] as any, horaInicio: '18:00', horaFin: '20:00' })))?.status).toBe(400);
    expect((await rechazo(s.crearLote({ idGrupo: '00000000-0000-4000-8000-000000000009', dias: ['LUNES'] as any, horaInicio: '18:00', horaFin: '20:00' })))?.status).toBe(404);
    expect(await total()).toBe(0);
  });
});
