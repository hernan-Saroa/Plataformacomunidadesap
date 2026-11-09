import { Client } from 'pg';

import { AsignacionesService } from '../asignaciones/asignaciones.service.js';
import { DocenciaService } from '../docencia/docencia.service.js';
import { ConcertacionService } from '../concertacion/concertacion.service.js';
import { TerritorialService } from '../acceso/territorial.service.js';
import { PermisosPtaService } from '../concertacion/permisos-pta.service.js';
import { HorarioDocenteService } from './horario-docente.service.js';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { crearAsignatura, crearPeriodo, unico } = require('../../test/catalogo-qa.cjs');

/**
 * Grupo VIRTUAL con horario opcional que define el docente (migración 063). Sobre la base
 * real, en una transacción que se revierte, con datos propios:
 *
 *   · un área QA y una asignatura suya de 64 h (horas_clase), en 2050-1;
 *   · un grupo VIRTUAL sin franjas (ciclo 2050-02-02 a 2050-05-24: 16 semanas);
 *   · un grupo PRESENCIAL sin franjas;
 *   · el docente A (del área) ya dicta otra asignatura el LUNES de 08:00 a 10:00;
 *   · el docente B (del área), sin asignación.
 * El contrato de horas se simula a 64 h por asignatura, factor 1.
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

describe('063 :: grupo virtual, horario que define el docente (agregado real)', () => {
  let client: Client | null = null;
  let hayBase = false;
  const ids: Record<string, string> = {};
  const doc: Record<string, string> = {};
  const envAntes = { h: process.env.PROG_CONCERTACION_HABILITADA, d: process.env.PROG_CONCERTACION_DESDE_PERIODO };

  const dataSource: any = {
    query: (sql: string, params?: any[]) => client!.query(sql, params).then((r) => r.rows),
    transaction: (fn: (m: any) => Promise<any>) => fn(dataSource), // ya estamos dentro de BEGIN
  };
  const contrato: any = { calcularImpacto: async () => ({ horasImpacto: 64, factorVinculacion: 1 }) };
  const docencia = () => new DocenciaService(dataSource, contrato);
  const asignaciones = () => new AsignacionesService(dataSource, contrato, docencia());
  const horario = () => new HorarioDocenteService(dataSource, docencia());
  const concertacion = () => new ConcertacionService(dataSource, docencia(), {
    registrarDecision: async () => ({ estadoAplicacion: 'aplicada' }), ptaHabilitada: async () => true,
  } as any, new TerritorialService(dataSource), new PermisosPtaService(dataSource));

  beforeAll(async () => {
    try {
      client = new Client(conexion);
      await client.connect();
      await client.query('BEGIN');
      const u = unico();
      const q = async (sql: string, p: any[] = []) => (await client!.query(sql, p)).rows;

      const existente = await q(`SELECT id::text AS id FROM ${AW}.periodo_academico WHERE codigo = '2050-1'`);
      ids.periodo = existente[0]?.id ?? (await crearPeriodo(client, { anio: 2050, semestre: 1 })).idPeriodo;
      ids.area = (await q(`INSERT INTO ${AW}.area_formacion (codigo, nombre) VALUES ($1, $2) RETURNING id::text AS id`,
        [`QA-AFV-${u}`.slice(0, 20), `Área virtual QA ${u}`]))[0].id;
      const asig = await crearAsignatura(client, { tipo: 'pregrado', horasClase: 64 });
      const nucleo = (await q(`SELECT nombre FROM ${AW}.nucleo_tematico WHERE id = $1::bigint`, [asig.idNucleo]))[0].nombre;
      await q(`INSERT INTO ${AW}.nucleo_equivalencia (variante, variante_normalizada, tipo, id_area, fuente)
               VALUES ($1::text, ${AW}.normalizar_nucleo($1::text), 'area', $2::bigint, 'manual')`, [nucleo, ids.area]);
      const otra = await crearAsignatura(client, { tipo: 'pregrado', idPrograma: asig.idPrograma, horasClase: 64 });

      const grupo = async (idAsig: string, num: number, modalidad: string) => (await q(
        `INSERT INTO "${S}".grupo (id_asignatura, id_periodo_academico, tipo_oferta, numero_grupo, estado, fecha_inicio, fecha_fin, modalidad)
         VALUES ($1, $2, 'periodo_regular', $3, 'PROGRAMADO', '2050-02-02', '2050-05-24', $4) RETURNING id_grupo::text AS id`,
        [idAsig, ids.periodo, num, modalidad]))[0].id;

      const territorial = (await q(`SELECT "territorialId" FROM ${AW}."Docente" LIMIT 1`))[0]?.territorialId ?? 'QA';
      const persona = async (clave: string, cedula: string) => {
        const id = (await q(
          `INSERT INTO auth.personas (id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero)
           VALUES ($1, $2, 'CC', $3, $3, 'N') RETURNING id_person::text AS id`,
          [Number(cedula), cedula, `Docente virtual QA ${clave} ${u}`]))[0].id;
        await q(`INSERT INTO ${AW}."Docente" ("personaId", "territorialId", "tipoVinculacion", dedicacion, "updatedAt",
                   "horasAsignables", "situacionCategoria")
                 VALUES ($1, $2, 'Cátedra', 'Cátedra', NOW(), 800, 'Servicio activo')`, [id, territorial]);
        await q(`INSERT INTO ${AW}.docente_nucleo (id_persona, id_area, origen, texto_origen) VALUES ($1, $2::bigint, 'rund', 'QA')`,
          [id, ids.area]);
        ids[clave] = id;
        doc[clave] = cedula;
      };
      await persona('A', '9900000601');
      await persona('B', '9900000602');

      ids.virtual = await grupo(asig.idAsignatura, 1, 'virtual');
      ids.presencialVacio = await grupo(asig.idAsignatura, 2, 'presencial');
      // A ya dicta otra asignatura el LUNES de 08:00 a 10:00.
      ids.ocupado = await grupo(otra.idAsignatura, 1, 'presencial');
      await q(`INSERT INTO "${S}".franja_horaria (id_grupo, dia_semana, hora_inicio, hora_fin, tipo_sesion, estado, id_docente)
               VALUES ($1, 'LUNES', '08:00', '10:00', 'presencial', 'TOMADA', $2)`, [ids.ocupado, ids.A]);
      process.env.PROG_CONCERTACION_HABILITADA = 'true';
      process.env.PROG_CONCERTACION_DESDE_PERIODO = '2049-1';
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
    if (envAntes.h === undefined) delete process.env.PROG_CONCERTACION_HABILITADA; else process.env.PROG_CONCERTACION_HABILITADA = envAntes.h;
    if (envAntes.d === undefined) delete process.env.PROG_CONCERTACION_DESDE_PERIODO; else process.env.PROG_CONCERTACION_DESDE_PERIODO = envAntes.d;
    if (client) await client.query('ROLLBACK').catch(() => {});
    if (client) await client.end().catch(() => {});
  });

  const caso = (nombre: string, fn: () => Promise<void>) =>
    it(nombre, async () => {
      if (!hayBase || !client) { console.warn('  (sin base: omitido)'); return; }
      await fn();
    });
  const franjasDe = async (idGrupo: string) => (await client!.query(
    `SELECT dia_semana, to_char(hora_inicio, 'HH24:MI') AS ini, tipo_sesion, aula_codigo, estado, id_docente::text AS id_docente, definida_por
       FROM "${S}".franja_horaria WHERE id_grupo = $1 ORDER BY dia_semana`, [idGrupo])).rows;

  caso('un grupo PRESENCIAL sin franjas no se asigna (no hay nada que dictar)', async () => {
    await expect(asignaciones().asignar({ idGrupo: ids.presencialVacio, documento: doc.A }))
      .rejects.toThrow(/no tiene franjas/);
  });

  caso('el grupo VIRTUAL sin horario tiene candidatos: horario por definir y se reservan las horas del plan', async () => {
    const r = await asignaciones().candidatos(ids.virtual, undefined, null);
    expect(r.horarioPorDefinir).toBe(true);
    expect(r.franjas).toEqual([]);
    const a = r.candidatos.find((c) => c.documento === doc.A)!;
    expect(a).toMatchObject({ asignable: true, cruce: false, horasImpacto: 64 });
    expect(r.sugerido?.razones.join(' ')).toMatch(/reservan 64 h del plan/);
  });

  caso('se asigna sin horario; el tope y el acumulado ya cuentan las 64 h reservadas', async () => {
    const antes = await docencia().total(ids.A, 'Cátedra', null);
    const r = await asignaciones().asignar({ idGrupo: ids.virtual, documento: doc.A });
    expect(r.asignado).toBe(true);
    expect(await docencia().total(ids.A, 'Cátedra', null)).toBeCloseTo(antes + 64, 1);
  });

  caso('el programador no puede enviar a revisión mientras el docente no define el horario', async () => {
    await expect(concertacion().enviar({ idUser: ids.B, niveles: ['pregrado'] }, doc.A, ids.periodo, null))
      .rejects.toThrow(/aún no define el horario de su grupo virtual/);
  });

  caso('«Mi programación» lista el grupo virtual con sus horas requeridas y máximas, editable', async () => {
    const [g] = (await horario().grupos(ids.A)).filter((x) => x.idGrupo === ids.virtual);
    expect(g).toMatchObject({ horasRequeridas: 64, horasMaximas: 83.2, horasProgramadas: 0, franjas: [], editable: true });
  });

  caso('una sesión que se cruza con otra clase del docente se rechaza (regla única de choque)', async () => {
    await expect(horario().crearFranja(ids.A, ids.virtual, { diaSemana: 'LUNES', horaInicio: '09:00', horaFin: '11:00' }, null))
      .rejects.toThrow(/se cruza con otra clase suya el lunes de 08:00 a 10:00/);
    expect(await franjasDe(ids.virtual)).toEqual([]);
  });

  caso('el docente define una sesión: mediada por tecnología, sin aula, TOMADA y suya', async () => {
    await horario().crearFranja(ids.A, ids.virtual, { diaSemana: 'MARTES', horaInicio: '08:00', horaFin: '10:00' }, null);
    expect(await franjasDe(ids.virtual)).toEqual([{
      dia_semana: 'MARTES', ini: '08:00', tipo_sesion: 'mediada_tecnologia', aula_codigo: null,
      estado: 'TOMADA', id_docente: ids.A, definida_por: 'docente',
    }]);
    const [g] = (await horario().grupos(ids.A)).filter((x) => x.idGrupo === ids.virtual);
    expect(g.horasProgramadas).toBe(32); // 2 h × 16 semanas
  });

  caso('si las horas del grupo superan las requeridas × 1,3, la sesión se rechaza', async () => {
    // 32 h + 6 h × 16 semanas = 128 h > 83,2 h.
    await expect(horario().crearFranja(ids.A, ids.virtual, { diaSemana: 'MIERCOLES', horaInicio: '08:00', horaFin: '14:00' }, null))
      .rejects.toThrow(/tendría 128 h programadas y la asignatura requiere 64 h \(máximo 83.2 h\)/);
    expect((await franjasDe(ids.virtual)).length).toBe(1);
  });

  caso('otro docente no define ni quita el horario de un grupo que no es suyo', async () => {
    await expect(horario().crearFranja(ids.B, ids.virtual, { diaSemana: 'JUEVES', horaInicio: '08:00', horaFin: '10:00' }, null))
      .rejects.toThrow(/no está asignado a usted/);
  });

  caso('ya con horario, el envío a revisión deja de bloquearse por el grupo virtual', async () => {
    await expect(concertacion().enviar({ idUser: ids.B, niveles: ['pregrado'] }, doc.A, ids.periodo, null))
      .rejects.not.toThrow(/aún no define el horario/);
  });

  caso('el docente quita la sesión que definió; con la programación en concertación, no', async () => {
    const [f] = (await client!.query(`SELECT id_franja::text AS id FROM "${S}".franja_horaria WHERE id_grupo = $1`, [ids.virtual])).rows;
    await client!.query('SAVEPOINT en_concertacion');
    await client!.query(
      `INSERT INTO "${S}".concertacion_docencia (id_docente, periodo_ref, nivel, estado, horas, franjas, huella)
       VALUES ($1, $2, 'pregrado', 'ENVIADA', 32, $3::jsonb, 'qa')`, [ids.A, `qa-${ids.periodo}`, JSON.stringify([{ idFranja: f.id }])]);
    await expect(horario().eliminarFranja(ids.A, ids.virtual, f.id)).rejects.toThrow(/está en concertación \(ENVIADA\)/);
    await client!.query('ROLLBACK TO SAVEPOINT en_concertacion');
    await expect(horario().eliminarFranja(ids.A, ids.virtual, f.id)).resolves.toEqual({ eliminada: true });
    expect(await franjasDe(ids.virtual)).toEqual([]);
  });
});
