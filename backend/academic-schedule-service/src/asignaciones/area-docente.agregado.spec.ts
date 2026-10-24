import { Client } from 'pg';

import { AsignacionesService } from './asignaciones.service.js';
import { DocenciaService } from '../docencia/docencia.service.js';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { crearAsignatura, crearPeriodo, unico } = require('../../test/catalogo-qa.cjs');

/**
 * EFDS-2341 (HU EFDS-2371): candidatos por área, nadie fuera de su área y un docente
 * por franja. Sobre la base real, en una transacción que se revierte, con datos propios:
 *
 *   · un área QA y una asignatura cuyo núcleo es de esa área (vía nucleo_equivalencia);
 *   · un grupo en 2050-1 con dos franjas, LUNES y MIERCOLES de 08:00 a 10:00;
 *   · docentes QA (Cátedra, «Servicio activo»):
 *       A  núcleo rund del área            — apto, cédula menor
 *       B  núcleo puente del área          — apto (no tiene RUND)
 *       C  núcleo rund de OTRA área        — no aparece; asignarlo se rechaza
 *       D  núcleo rund del área, ocupado el LUNES 08-10 en otro grupo — aparece con cruce
 *       E  rund de otra área + puente del área — el puente NO amplía a quien tiene RUND
 * El contrato de horas se simula a 64 h por asignatura.
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

describe('EFDS-2341 :: candidatos por área y asignación por franja (agregado real)', () => {
  let client: Client | null = null;
  let hayBase = false;
  const ids: Record<string, string> = {};
  const doc: Record<string, string> = {};

  const dataSource: any = {
    query: (sql: string, params?: any[]) => client!.query(sql, params).then((r) => r.rows),
    transaction: (fn: (m: any) => Promise<any>) => fn(dataSource),
  };
  const contrato: any = { calcularImpacto: async () => ({ horasImpacto: 64 }) };
  const servicio = () => new AsignacionesService(dataSource, contrato, new DocenciaService(dataSource, contrato));

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
        [`QA-AF-${u}`.slice(0, 20), `Área QA ${u}`]))[0].id;
      ids.otraArea = (await q(`INSERT INTO ${AW}.area_formacion (codigo, nombre) VALUES ($1, $2) RETURNING id::text AS id`,
        [`QA-AF2-${u}`.slice(0, 20), `Otra Área QA ${u}`]))[0].id;

      const asig = await crearAsignatura(client, { tipo: 'pregrado' });
      const nucleo = (await q(`SELECT nombre FROM ${AW}.nucleo_tematico WHERE id = $1::bigint`, [asig.idNucleo]))[0].nombre;
      await q(`INSERT INTO ${AW}.nucleo_equivalencia (variante, variante_normalizada, tipo, id_area, fuente)
               VALUES ($1::text, ${AW}.normalizar_nucleo($1::text), 'area', $2::bigint, 'manual')`, [nucleo, ids.area]);
      const otra = await crearAsignatura(client, { tipo: 'pregrado', idPrograma: asig.idPrograma });
      const sinArea = await crearAsignatura(client, { tipo: 'pregrado', idPrograma: asig.idPrograma });

      const grupo = async (idAsig: string, num: number) => (await q(
        `INSERT INTO "${S}".grupo (id_asignatura, id_periodo_academico, tipo_oferta, numero_grupo, estado, fecha_inicio, fecha_fin)
         VALUES ($1, $2, 'periodo_regular', $3, 'PROGRAMADO', '2050-02-02', '2050-05-24') RETURNING id_grupo::text AS id`,
        [idAsig, ids.periodo, num]))[0].id;
      const franja = async (idGrupo: string, dia: string, docente: string | null) => (await q(
        `INSERT INTO "${S}".franja_horaria (id_grupo, dia_semana, hora_inicio, hora_fin, tipo_sesion, estado, id_docente)
         VALUES ($1, $2, '08:00', '10:00', 'presencial', 'PROGRAMADO', $3) RETURNING id_franja::text AS id`,
        [idGrupo, dia, docente]))[0].id;

      const territorial = (await q(`SELECT "territorialId" FROM ${AW}."Docente" LIMIT 1`))[0].territorialId;
      const persona = async (clave: string, cedula: string) => {
        const id = (await q(
          `INSERT INTO auth.personas (id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero)
           VALUES ($1, $2, 'CC', $3, $3, 'N') RETURNING id_person::text AS id`,
          [Number(cedula), cedula, `Docente QA ${clave} ${u}`]))[0].id;
        await q(`INSERT INTO ${AW}."Docente" ("personaId", "territorialId", "tipoVinculacion", dedicacion, "updatedAt",
                   "horasAsignables", "situacionCategoria", "perfilAcademico", maestria)
                 VALUES ($1, $2, 'Cátedra', 'Cátedra', NOW(), 800, 'Servicio activo', $3, 'Magíster QA')`,
        [id, territorial, `Perfil QA ${clave}`]);
        ids[clave] = id;
        doc[clave] = cedula;
      };
      // Cédulas propias en un rango que no usa nadie (990000xxxx).
      await persona('A', '9900000101');
      await persona('B', '9900000102');
      await persona('C', '9900000103');
      await persona('D', '9900000104');
      await persona('E', '9900000105');
      const nucleoDe = (clave: string, area: string, origen: string) => q(
        `INSERT INTO ${AW}.docente_nucleo (id_persona, id_area, origen, texto_origen) VALUES ($1, $2::bigint, $3, 'QA')`,
        [ids[clave], area, origen]);
      await nucleoDe('A', ids.area, 'rund');
      await nucleoDe('B', ids.area, 'puente');
      await nucleoDe('C', ids.otraArea, 'rund');
      await nucleoDe('D', ids.area, 'rund');
      await nucleoDe('E', ids.otraArea, 'rund');
      await nucleoDe('E', ids.area, 'puente');

      ids.grupo = await grupo(asig.idAsignatura, 1);
      ids.lunes = await franja(ids.grupo, 'LUNES', null);
      ids.miercoles = await franja(ids.grupo, 'MIERCOLES', null);
      // D ya dicta otra asignatura el LUNES a la misma hora.
      ids.grupoOcupado = await grupo(otra.idAsignatura, 1);
      await franja(ids.grupoOcupado, 'LUNES', ids.D);
      ids.grupoSinArea = await grupo(sinArea.idAsignatura, 1);
      await franja(ids.grupoSinArea, 'MARTES', null);
      hayBase = true;
    } catch (e) {
      const conectado = !!(client as any)?._connected;
      if (client) { await client.query('ROLLBACK').catch(() => {}); await client.end().catch(() => {}); }
      client = null; hayBase = false;
      // Con base y fixture fallido, se grita: una prueba omitida en silencio no prueba nada.
      if (conectado) throw e;
      console.warn('  (sin base: omitido)', (e as Error).message);
    }
  });
  afterAll(async () => {
    if (client) await client.query('ROLLBACK').catch(() => {});
    if (client) await client.end().catch(() => {});
  });

  const caso = (nombre: string, fn: () => Promise<void>) =>
    it(nombre, async () => {
      if (!hayBase || !client) { console.warn('  (sin base: omitido)'); return; }
      await client.query('SAVEPOINT caso');
      try { await fn(); } finally { await client.query('ROLLBACK TO SAVEPOINT caso').catch(() => {}); }
    });
  const docentesDe = async (idGrupo: string) => (await client!.query(
    `SELECT dia_semana, id_docente::text AS id FROM "${S}".franja_horaria WHERE id_grupo = $1 ORDER BY dia_semana`, [idGrupo])).rows;
  const asignacionDe = async (idGrupo: string) => (await client!.query(
    `SELECT id_docente::text AS id FROM "${S}".asignacion_docente WHERE id_grupo = $1`, [idGrupo])).rows;

  caso('solo aparecen docentes del área; el sugerido es el apto con menos horas, desempate por cédula', async () => {
    const r = await servicio().candidatos(ids.grupo, undefined, null);
    expect(r.area?.codigo).toMatch(/^QA-AF-/);
    expect(r.candidatos.map((c) => c.documento)).toEqual([doc.A, doc.B, doc.D]);
    const [a, b, d] = r.candidatos;
    expect(a.motivos).toEqual([]);
    expect(a).toMatchObject({ origenArea: 'rund', asignable: true, cruce: false, horasProgramadas: 0, horasImpacto: 64, perfil: 'Perfil QA A' });
    expect(a.titulos.maestria).toBe('Magíster QA');
    expect(b).toMatchObject({ origenArea: 'puente', asignable: true });
    expect(d).toMatchObject({ asignable: false, cruce: true });
    expect(d.motivos.map((m) => m.regla)).toEqual(['RN-07']);
    expect(r.sugerido?.documento).toBe(doc.A);
    expect(r.sugerido?.razones.join(' ')).toMatch(/desempata por cédula/);
    expect(r.mensaje).toBeNull();
  });

  caso('el puente no amplía el área de quien ya tiene núcleo del RUND, y se apaga con PROG_NUCLEO_PUENTE=false', async () => {
    const con = await servicio().candidatos(ids.grupo, undefined, null);
    expect(con.candidatos.map((c) => c.documento)).not.toContain(doc.E);
    const antes = process.env.PROG_NUCLEO_PUENTE;
    process.env.PROG_NUCLEO_PUENTE = 'false';
    try {
      const sin = await servicio().candidatos(ids.grupo, undefined, null);
      expect(sin.candidatos.map((c) => c.documento)).toEqual([doc.A, doc.D]);
    } finally {
      if (antes === undefined) delete process.env.PROG_NUCLEO_PUENTE; else process.env.PROG_NUCLEO_PUENTE = antes;
    }
  });

  caso('fuera de su área no se asigna: bloqueo duro con el motivo de área primero y nada guardado', async () => {
    const r = await servicio().asignar({ idGrupo: ids.grupo, documento: doc.C });
    expect(r.asignado).toBe(false);
    expect(r.motivos?.[0]).toMatchObject({ regla: 'AREA' });
    expect(r.motivos?.[0].mensaje).toMatch(/no es del área/);
    expect((await docentesDe(ids.grupo)).every((f: any) => f.id === null)).toBe(true);
    expect(await asignacionDe(ids.grupo)).toEqual([]);
  });

  caso('un docente por franja: cada franja a uno distinto; si todas quedan con el mismo, es su asignación completa', async () => {
    const s = servicio();
    expect((await s.asignar({ idGrupo: ids.grupo, documento: doc.A, franjas: [ids.lunes] })).asignado).toBe(true);
    expect((await s.asignar({ idGrupo: ids.grupo, documento: doc.B, franjas: [ids.miercoles] })).asignado).toBe(true);
    expect(await docentesDe(ids.grupo)).toEqual([{ dia_semana: 'LUNES', id: ids.A }, { dia_semana: 'MIERCOLES', id: ids.B }]);
    // Repartido: no hay «docente del grupo».
    expect(await asignacionDe(ids.grupo)).toEqual([]);

    const r = await s.asignar({ idGrupo: ids.grupo, documento: doc.A, franjas: [ids.miercoles] });
    expect(r.asignado).toBe(true);
    expect(r.idAsignacion).toBeTruthy();
    expect(await docentesDe(ids.grupo)).toEqual([{ dia_semana: 'LUNES', id: ids.A }, { dia_semana: 'MIERCOLES', id: ids.A }]);
    expect(await asignacionDe(ids.grupo)).toEqual([{ id: ids.A }]);
  });

  caso('candidatos y horas se calculan para las franjas pedidas: una de dos franjas es la mitad', async () => {
    const r = await servicio().candidatos(ids.grupo, [ids.miercoles], null);
    expect(r.franjas.map((f) => f.diaSemana)).toEqual(['MIERCOLES']);
    // D está ocupado el LUNES, no el MIÉRCOLES: para esta franja es apto.
    const d = r.candidatos.find((c) => c.documento === doc.D)!;
    expect(d).toMatchObject({ asignable: true, cruce: false, horasImpacto: 32 });
  });

  caso('una franja que no es del grupo se rechaza', async () => {
    await expect(servicio().candidatos(ids.grupo, [ids.lunes, '00000000-0000-4000-8000-000000000000'], null))
      .rejects.toThrow(/no es de este grupo/);
  });

  caso('asignatura sin área: no hay candidatos y la respuesta lo dice; asignar se rechaza por área', async () => {
    const r = await servicio().candidatos(ids.grupoSinArea, undefined, null);
    expect(r).toMatchObject({ area: null, candidatos: [], sugerido: null });
    expect(r.mensaje).toMatch(/no tiene área de formación/);
    const a = await servicio().asignar({ idGrupo: ids.grupoSinArea, documento: doc.A });
    expect(a.asignado).toBe(false);
    expect(a.motivos?.[0]).toMatchObject({ regla: 'AREA' });
  });

  /**
   * Canario del catálogo real: una asignatura sin área solo puede deberse a que su núcleo
   * es un comodín de plan («Nuevo Plan de Estudios…») o no tiene núcleo; y todo posgrado
   * tiene área (el programa). Si aparece otra causa, una variante quedó sin equivalencia.
   */
  caso('canario: en el catálogo real, sin área solo por núcleo comodín o vacío; posgrado siempre con área', async () => {
    const r = (await client!.query(
      `SELECT lower(pr.tipo) AS tipo, coalesce(nt.nombre, '') AS nucleo
         FROM ${AW}.asignatura a
         JOIN ${AW}.programa pr ON pr.id = a.id_programa
         LEFT JOIN ${AW}.nucleo_tematico nt ON nt.id = a.id_nucleo_tematico
        WHERE ${AW}.area_de_asignatura(a.id) IS NULL
          AND a.codigo NOT LIKE 'QA-%' AND pr.codigo NOT LIKE 'QA-%'`)).rows;
    expect(r.filter((x: any) => ['especializacion', 'maestria', 'doctorado'].includes(x.tipo))).toEqual([]);
    expect(r.filter((x: any) => x.nucleo && !/^nuevo plan de estudios/i.test(x.nucleo))).toEqual([]);
  });
});
