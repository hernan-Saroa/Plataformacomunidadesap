import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { Client } from 'pg';

import { AsignacionesService } from '../asignaciones/asignaciones.service.js';
import { DocenciaService } from '../docencia/docencia.service.js';
import { TerritorialService } from '../acceso/territorial.service.js';
import { ConcertacionService } from './concertacion.service.js';
import { PermisosPtaService, type PermisoPta } from './permisos-pta.service.js';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { crearAsignatura, darArea, unico } = require('../../test/catalogo-qa.cjs');

/**
 * EFDS-2315 / EFDS-2374 :: concertación de la docencia en el ORDEN NUEVO
 * (INTEGRACION-claude.md §23): el programador envía → revisión y aprobación
 * internas (firma del aprobador) → el docente acepta (firma) o reporta novedad.
 *
 * Agregado sobre la base real, cada caso en una transacción que se revierte, con
 * personas y cuentas QA PROPIAS (docente, programador, revisor, aprobador y cuentas
 * con seccional). De la base solo se toman catálogos de referencia: CETAP, direcciones
 * territoriales y seccionales. El contrato de horas y la entrega al PTA se simulan.
 */
const conexion = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 55432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'esap_secure_password_2024',
  database: process.env.DB_NAME || 'esap_db',
};
const S = 'academic-schedule';
const REVISOR: PermisoPta[] = [{ codigo: 'pta.review.academica.pregrado' }];
const APROBADOR: PermisoPta[] = [{ codigo: 'pta.approve.academica.pregrado' }];
const APROBADOR_POSGRADO: PermisoPta[] = [{ codigo: 'pta.approve.academica.posgrado' }];
// Docencia de una Dirección Territorial: permisos del componente academica_territorial del PTA.
const REVISOR_TERRITORIAL: PermisoPta[] = [{ codigo: 'pta.review.academica.territorial.pregrado' }];
const APROBADOR_TERRITORIAL: PermisoPta[] = [{ codigo: 'pta.approve.academica.territorial.pregrado' }];
const OTP = '123456';

interface Cuenta { idUser: string; idPerson: string; documento: string }
interface Fixture {
  docente: Cuenta; otroDocente: Cuenta; periodo: string; franjas: string[]; grupo: string;
  ofertas: { sedeCentral: string; neiva: string };
  programador: { idUser: string; niveles: Array<'pregrado' | 'posgrado'> };
  revisor: string; aprobador: string; sedeCentral: string; tolima: string; huila: string;
}

describe('EFDS-2374 :: concertación en el orden nuevo (agregado real, en transacción)', () => {
  let client: Client | null = null;
  let hayBase = false;
  const entregas: any[] = [];
  const envAntes = process.env.PROG_CONCERTACION_HABILITADA;
  const desdeAntes = process.env.PROG_CONCERTACION_DESDE_PERIODO;
  /** Interruptor del PTA simulado: true, false o 'caido'. */
  let ptaEstado: boolean | 'caido' = true;

  beforeAll(async () => {
    try { client = new Client(conexion); await client.connect(); hayBase = true; } catch { hayBase = false; }
  });
  afterAll(async () => {
    if (envAntes === undefined) delete process.env.PROG_CONCERTACION_HABILITADA; else process.env.PROG_CONCERTACION_HABILITADA = envAntes;
    if (desdeAntes === undefined) delete process.env.PROG_CONCERTACION_DESDE_PERIODO; else process.env.PROG_CONCERTACION_DESDE_PERIODO = desdeAntes;
    if (client) await client.end().catch(() => {});
  });

  const ds = (): any => {
    const d: any = { query: (sql: string, p?: any[]) => client!.query(sql, p).then((r) => r.rows) };
    d.transaction = (cb: (m: any) => Promise<any>) => cb(d); // ya estamos dentro de BEGIN
    return d;
  };
  // Plan de 96 h y factor 1: las horas son las de las sesiones reales del ciclo (EFDS-2347).
  // Ciclo del grupo 2049-02-03 a 2049-05-30: 16 lunes + 17 jueves = 33 sesiones × 2 h = 66 h.
  const contrato: any = { calcularImpacto: async () => ({ horasImpacto: 96, factorVinculacion: 1 }) };
  const servicio = () => new ConcertacionService(ds(), new DocenciaService(ds(), contrato), {
    registrarDecision: async (d: any) => { entregas.push(d); return { estadoAplicacion: 'aplicada' }; },
    ptaHabilitada: async () => { if (ptaEstado === 'caido') throw new Error('PTA sin respuesta'); return ptaEstado; },
  } as any, new TerritorialService(ds()), new PermisosPtaService(ds()));
  const asignaciones = () => new AsignacionesService(ds(), contrato, new DocenciaService(ds(), contrato));

  const caso = (nombre: string, fn: (f: Fixture) => Promise<void>, encendida = true) =>
    it(nombre, async () => {
      if (!hayBase || !client) { console.warn('  (sin base: omitido)'); return; }
      process.env.PROG_CONCERTACION_HABILITADA = encendida ? 'true' : 'false';
      process.env.PROG_CONCERTACION_DESDE_PERIODO = '2049-1';
      ptaEstado = true;
      entregas.length = 0;
      await client.query('BEGIN');
      try {
        const q = async (sql: string, p: any[] = []) => (await client!.query(sql, p)).rows;
        const u = unico();
        let n = 0;
        // Personas y cuentas QA propias, en un rango de cédulas que no usa nadie.
        const cuenta = async (seccional: number | null, docente = false): Promise<Cuenta> => {
          const documento = `99000003${String(++n).padStart(2, '0')}`;
          const idPerson = (await q(
            `INSERT INTO auth.personas (id_tercero, num_identificacion, tip_identificacion, nom_largo, nom_tercero, gen_tercero, id_seccional)
             VALUES ($1, $2, 'CC', $3, $3, 'N', $4) RETURNING id_person::text AS id`,
            [Number(documento), documento, `Cuenta QA ${n} ${u}`, seccional]))[0].id;
          const idUser = (await q(
            `INSERT INTO auth."user" (id_user, username, password_hash, id_person) VALUES (gen_random_uuid(), $1, 'x', $2)
             RETURNING id_user::text AS id`, [`qa.concertacion.${n}.${u}`.toLowerCase(), idPerson]))[0].id;
          if (docente) {
            await q(`INSERT INTO academic_work_plan."Docente" ("personaId", "territorialId", "tipoVinculacion", dedicacion, "updatedAt",
                       "horasAsignables", "situacionCategoria")
                     VALUES ($1, 'QA', 'Cátedra', 'Cátedra', NOW(), 800, 'Servicio activo')`, [idPerson]);
          }
          return { idUser, idPerson, documento };
        };
        const docente = await cuenta(null, true);
        const otroDocente = await cuenta(null, true);
        const programador = await cuenta(null);
        const revisor = await cuenta(null);
        const aprobador = await cuenta(null);
        const sedeCentral = await cuenta(900001); // seccional SC
        const tolima = await cuenta(16);
        const huila = await cuenta(10);          // «Seccional Huila», catálogo heredado

        const asig = await crearAsignatura(client, { tipo: 'pregrado' });
        await darArea(client, { idNucleo: asig.idNucleo, idPersonas: [docente.idPerson, otroDocente.idPerson] });
        // Periodo de PLATAFORMA dentro del corte (2049-1 >= 2049-1), solo en esta transacción.
        const periodo = (await q(
          `INSERT INTO academic_work_plan.periodo_academico (codigo, anio, semestre, fecha_inicio, fecha_fin, estado)
           VALUES ('2049-1', 2049, 1, '2049-02-01', '2049-06-15', 'planeacion') RETURNING id::text AS id`))[0].id;
        // Ofertas CETAP del programa: Sede Central (CET-0288, SC) y Neiva (CET-0135, DT-009 Huila).
        const oferta = async (codigoCetap: string) => (await q(
          `INSERT INTO academic_work_plan.oferta_cetap_programa (id_cetap, id_programa, id_periodo_academico, activa)
           SELECT c.id, $2::bigint, $3::bigint, TRUE FROM academic_work_plan.cetap c WHERE c.codigo = $1 RETURNING id::text`,
          [codigoCetap, asig.idPrograma, periodo]))[0].id as string;
        const ofertas = { sedeCentral: await oferta('CET-0288'), neiva: await oferta('CET-0135') };
        const grupo = (await q(
          `INSERT INTO "${S}".grupo (id_asignatura,id_periodo_academico,tipo_oferta,numero_grupo,estado,fecha_inicio,fecha_fin,id_oferta_cetap)
           VALUES ($1,$2::bigint,'periodo_regular',981,'PROGRAMADO','2049-02-03','2049-05-30',$3::bigint) RETURNING id_grupo::text AS id`,
          [asig.idAsignatura, periodo, ofertas.sedeCentral]))[0].id;
        // Lo asignado por el programador: franjas TOMADA con el docente (flujo nuevo, EFDS-2348).
        const franjas: string[] = [];
        for (const dia of ['LUNES', 'JUEVES']) {
          franjas.push((await q(
            `INSERT INTO "${S}".franja_horaria (id_grupo,dia_semana,hora_inicio,hora_fin,tipo_sesion,id_docente,estado)
             VALUES ($1,$2,'06:00','08:00','mediada_tecnologia',$3,'TOMADA') RETURNING id_franja::text AS id`,
            [grupo, dia, docente.idPerson]))[0].id);
        }
        await fn({
          docente, otroDocente, periodo, franjas, grupo, ofertas,
          programador: { idUser: programador.idUser, niveles: ['pregrado'] },
          revisor: revisor.idUser, aprobador: aprobador.idUser,
          sedeCentral: sedeCentral.idUser, tolima: tolima.idUser, huila: huila.idUser,
        });
      } finally {
        await client.query('ROLLBACK');
      }
    });

  const estados = async (ids: string[]) => (await client!.query(
    `SELECT estado FROM "${S}".franja_horaria WHERE id_franja = ANY($1::uuid[]) ORDER BY id_franja`, [ids])).rows.map((r) => r.estado);
  const sorted = (xs: string[]) => [...xs].sort();
  /** Envía y deja la concertación POR_ACEPTAR (revisada y aprobada por dentro). */
  const hastaPorAceptar = async (svc: ConcertacionService, f: Fixture) => {
    const [c] = await svc.enviar(f.programador, f.docente.documento, f.periodo, null);
    await svc.revisar(c.idConcertacion, 'academica', f.revisor, REVISOR, OTP);
    await svc.aprobar(c.idConcertacion, f.aprobador, APROBADOR, OTP);
    return c.idConcertacion as string;
  };

  caso('flujo completo: envía el programador, revisan y aprueba (firma) por dentro, acepta el docente (firma) y va al PTA', async (f) => {
    const svc = servicio();
    const [c] = await svc.enviar(f.programador, f.docente.documento, f.periodo, null);
    expect(c).toMatchObject({ nivel: 'pregrado', estado: 'ENVIADA', horas: 66, documento: f.docente.documento });
    // Lo interno no se le muestra al docente.
    expect(await svc.delDocente(f.docente.idPerson, f.periodo)).toEqual([]);

    // Sin revisión no se aprueba; un revisor de otro nivel tampoco revisa.
    await expect(svc.aprobar(c.idConcertacion, f.aprobador, APROBADOR, OTP)).rejects.toBeInstanceOf(ConflictException);
    await expect(svc.revisar(c.idConcertacion, 'academica', f.revisor, APROBADOR_POSGRADO, OTP)).rejects.toBeInstanceOf(ForbiddenException);
    expect((await svc.revisar(c.idConcertacion, 'academica', f.revisor, REVISOR, OTP)).estado).toBe('REVISADA');

    const aprobada = await svc.aprobar(c.idConcertacion, f.aprobador, APROBADOR, OTP);
    expect(aprobada.estado).toBe('POR_ACEPTAR');
    // Aprobada por dentro: las franjas siguen TOMADA y nada va al PTA todavía.
    expect(await estados(f.franjas)).toEqual(['TOMADA', 'TOMADA']);
    expect(entregas).toHaveLength(0);
    const [mia] = await svc.delDocente(f.docente.idPerson, f.periodo);
    expect(mia).toMatchObject({ idConcertacion: c.idConcertacion, estado: 'POR_ACEPTAR', novedad: null });
    expect(sorted(mia.franjas.map((x: any) => x.idFranja))).toEqual(sorted(f.franjas));

    const final = await svc.aceptar(c.idConcertacion, { idPerson: f.docente.idPerson, idUser: f.docente.idUser }, OTP, null);
    expect(final.estado).toBe('ACEPTADA');
    expect(await estados(f.franjas)).toEqual(['APROBADA', 'APROBADA']);
    expect(final.firmas.map((x: any) => [x.rol, x.idUser])).toEqual(
      [['revisor', f.revisor], ['aprobador', f.aprobador], ['docente', f.docente.idUser]]);
    expect(final.firmas[2].contexto).toBe(`prog-docencia:${c.idConcertacion}:${final.huella}:docente`);

    expect(entregas).toHaveLength(1);
    expect(entregas[0]).toMatchObject({ idConcertacion: c.idConcertacion, nivel: 'pregrado', horas: 66, huella: final.huella });
    expect(entregas[0].firmas.map((x: any) => x.rol)).toEqual(['revisor', 'aprobador', 'docente']);
    expect(entregas[0].asignaturas[0]).toMatchObject({ fechaInicio: '2049-02-03', fechaFin: '2049-05-30', horas: 66 });
    // La territorial sale de la oferta CETAP del grupo: Sede Central → auth.seccionales 900001 (SC).
    expect(entregas[0].asignaturas[0].territorialId).toBe('900001');
    expect(final.aplicacionPta).toBe('aplicada');
  });

  caso('EFDS-2347: dos lunes festivos bajan las horas y eso es lo que llega al PTA', async (f) => {
    // Festivos de la prueba (en la transacción): dos lunes del ciclo del grupo.
    await client!.query(
      `INSERT INTO "${S}".festivo (fecha, nombre, fuente) VALUES ('2049-02-15', 'Festivo QA', 'prueba'), ('2049-03-15', 'Festivo QA', 'prueba')`);
    const svc = servicio();
    const [c] = await svc.enviar(f.programador, f.docente.documento, f.periodo, null);
    // 14 lunes + 17 jueves = 31 sesiones × 2 h.
    expect(c.horas).toBe(62);
    await svc.revisar(c.idConcertacion, 'academica', f.revisor, REVISOR, OTP);
    await svc.aprobar(c.idConcertacion, f.aprobador, APROBADOR, OTP);
    await svc.aceptar(c.idConcertacion, { idPerson: f.docente.idPerson, idUser: f.docente.idUser }, OTP, null);
    expect(entregas[0]).toMatchObject({ horas: 62 });
    expect(entregas[0].asignaturas[0].horas).toBe(62);
  });

  caso('novedad: tipo y justificación obligatorios; vuelve al programador, que reenvía y la novedad queda atendida', async (f) => {
    const svc = servicio();
    const id = await hastaPorAceptar(svc, f);
    const yo = { idPerson: f.docente.idPerson, idUser: f.docente.idUser };
    await expect(svc.reportarNovedad(id, yo, 'vacaciones', 'Estaré fuera del país')).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.reportarNovedad(id, yo, 'movilidad', 'corta')).rejects.toBeInstanceOf(BadRequestException);
    const r = await svc.reportarNovedad(id, yo, 'movilidad', 'Tengo movilidad internacional en marzo');
    expect(r.estado).toBe('NOVEDAD');
    // El docente no cambia nada: las franjas siguen TOMADA y con él.
    expect(await estados(f.franjas)).toEqual(['TOMADA', 'TOMADA']);
    const [mia] = await svc.delDocente(f.docente.idPerson, f.periodo);
    expect(mia.novedad).toMatchObject({ tipo: 'movilidad', justificacion: 'Tengo movilidad internacional en marzo' });
    const [prog] = await svc.delProgramador(['pregrado'], f.periodo);
    expect(prog).toMatchObject({ estado: 'NOVEDAD', novedad: { tipo: 'movilidad' } });

    // El programador reasigna el jueves a otro docente y reenvía: vuelve a revisión, novedad atendida.
    const asignado = await asignaciones().asignar({ idGrupo: f.grupo, documento: f.otroDocente.documento, franjas: [f.franjas[1]] });
    expect(asignado.asignado).toBe(true);
    const [reenviada] = await svc.enviar(f.programador, f.docente.documento, f.periodo, null);
    expect(reenviada).toMatchObject({ idConcertacion: id, estado: 'ENVIADA', novedad: null });
    expect(await svc.delDocente(f.docente.idPerson, f.periodo)).toEqual([]);
    const pendientes = await client!.query(
      `SELECT count(*)::int AS n FROM "${S}".concertacion_novedad WHERE id_concertacion = $1 AND atendida_en IS NULL`, [id]);
    expect(pendientes.rows[0].n).toBe(0);
  });

  caso('solo el docente dueño decide, y solo cuando está por aceptar', async (f) => {
    const svc = servicio();
    const [c] = await svc.enviar(f.programador, f.docente.documento, f.periodo, null);
    const yo = { idPerson: f.docente.idPerson, idUser: f.docente.idUser };
    await expect(svc.aceptar(c.idConcertacion, yo, OTP, null)).rejects.toThrow(/ENVIADA/);
    await svc.revisar(c.idConcertacion, 'academica', f.revisor, REVISOR, OTP);
    await svc.aprobar(c.idConcertacion, f.aprobador, APROBADOR, OTP);
    const otro = { idPerson: f.otroDocente.idPerson, idUser: f.otroDocente.idUser };
    await expect(svc.aceptar(c.idConcertacion, otro, OTP, null)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.reportarNovedad(c.idConcertacion, otro, 'otra', 'No es mía pero lo intento')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.aceptar(c.idConcertacion, yo, '12ab', null)).rejects.toBeInstanceOf(BadRequestException);
  });

  caso('en curso no se reasigna: 409 hasta que la devuelvan; devuelta, el programador cambia y reenvía', async (f) => {
    const svc = servicio();
    const [c] = await svc.enviar(f.programador, f.docente.documento, f.periodo, null);
    await expect(asignaciones().asignar({ idGrupo: f.grupo, documento: f.otroDocente.documento, franjas: [f.franjas[1]] }))
      .rejects.toThrow(/en concertación \(ENVIADA\)/);
    await expect(asignaciones().retirar(f.grupo)).rejects.toThrow(/en concertación/);

    await expect(svc.devolver(c.idConcertacion, f.revisor, REVISOR, '  ')).rejects.toBeInstanceOf(BadRequestException);
    const d = await svc.devolver(c.idConcertacion, f.revisor, REVISOR, 'El jueves debe ir con otro docente');
    expect(d).toMatchObject({ estado: 'DEVUELTA', comentario: 'El jueves debe ir con otro docente' });
    // Vuelve al programador, no al docente: las franjas siguen TOMADA con su docente.
    expect(await estados(f.franjas)).toEqual(['TOMADA', 'TOMADA']);
    expect((await svc.delProgramador(['pregrado'], f.periodo))[0]).toMatchObject({ estado: 'DEVUELTA' });

    expect((await asignaciones().asignar({ idGrupo: f.grupo, documento: f.otroDocente.documento, franjas: [f.franjas[1]] })).asignado).toBe(true);
    const [r] = await svc.enviar(f.programador, f.docente.documento, f.periodo, null);
    expect(r).toMatchObject({ idConcertacion: c.idConcertacion, estado: 'ENVIADA', horas: 32 });
  });

  caso('no se aprueba ni se acepta si la docencia cambió después de enviarla', async (f) => {
    const svc = servicio();
    const [c] = await svc.enviar(f.programador, f.docente.documento, f.periodo, null);
    await svc.revisar(c.idConcertacion, 'academica', f.revisor, REVISOR, OTP);
    await client!.query(`UPDATE "${S}".franja_horaria SET id_docente = NULL, estado = 'PUBLICADA' WHERE id_franja = $1`, [f.franjas[0]]);
    await expect(svc.aprobar(c.idConcertacion, f.aprobador, APROBADOR, OTP)).rejects.toThrow(/cambió/);
    await client!.query(`UPDATE "${S}".franja_horaria SET id_docente = $2, estado = 'TOMADA' WHERE id_franja = $1`, [f.franjas[0], f.docente.idPerson]);
    await svc.aprobar(c.idConcertacion, f.aprobador, APROBADOR, OTP);
    await client!.query(`UPDATE "${S}".franja_horaria SET id_docente = NULL, estado = 'PUBLICADA' WHERE id_franja = $1`, [f.franjas[0]]);
    await expect(svc.aceptar(c.idConcertacion, { idPerson: f.docente.idPerson, idUser: f.docente.idUser }, OTP, null)).rejects.toThrow(/cambió/);
  });

  caso('el programador envía solo los niveles que asigna, y un envío no se repite', async (f) => {
    const svc = servicio();
    await expect(svc.enviar({ idUser: f.programador.idUser, niveles: ['posgrado'] }, f.docente.documento, f.periodo, null))
      .rejects.toThrow(/niveles que usted asigna/);
    await svc.enviar(f.programador, f.docente.documento, f.periodo, null);
    await expect(svc.enviar(f.programador, f.docente.documento, f.periodo, null)).rejects.toThrow(/ya fue enviada/);
  });

  /** Asigna (o quita) la oferta CETAP del grupo (esquema propio). */
  const ofertaDelGrupo = (grupo: string, oferta: string | null) => client!.query(
    `UPDATE "${S}".grupo SET id_oferta_cetap = $2::bigint WHERE id_grupo = $1`, [grupo, oferta]);

  caso('alcance como el PTA: la seccional del revisor contra la territorial de la oferta (Sede Central sí, Tolima no)', async (f) => {
    const svc = servicio();
    const [c] = await svc.enviar(f.programador, f.docente.documento, f.periodo, null);
    await expect(svc.revisar(c.idConcertacion, 'academica', f.tolima, REVISOR, OTP)).rejects.toBeInstanceOf(ForbiddenException);
    expect(await svc.bandeja(REVISOR, f.tolima, f.periodo)).toEqual([]);
    const enBandeja = await svc.bandeja(REVISOR, f.sedeCentral, f.periodo);
    expect(enBandeja.map((x: any) => x.idConcertacion)).toEqual([c.idConcertacion]);
    expect(enBandeja[0].periodoCodigo).toBe('2049-1');
    // En el orden nuevo nadie firma al enviar: la bandeja llega sin firmas.
    expect(enBandeja[0].firmas).toEqual([]);
    expect((await svc.revisar(c.idConcertacion, 'academica', f.sedeCentral, REVISOR, OTP)).estado).toBe('REVISADA');
    // Sin seccional en Personas no hay restricción geográfica (así lo hace hoy el PTA).
    expect((await svc.aprobar(c.idConcertacion, f.aprobador, APROBADOR, OTP)).estado).toBe('POR_ACEPTAR');
  });

  caso('hueco reportado: la oferta de Neiva (DT-009) no cruza con la seccional heredada (Huila)', async (f) => {
    const svc = servicio();
    await ofertaDelGrupo(f.grupo, f.ofertas.neiva); // auth.seccionales 900022 "HUILA"
    const [c] = await svc.enviar(f.programador, f.docente.documento, f.periodo, null);
    // Igual que en el PTA: ni el id ni el nombre normalizado coinciden → no decide.
    await expect(svc.revisar(c.idConcertacion, 'academica', f.huila, REVISOR_TERRITORIAL, OTP)).rejects.toBeInstanceOf(ForbiddenException);
  });

  caso('Docencia de una Dirección Territorial: la deciden los permisos territoriales del PTA', async (f) => {
    const svc = servicio();
    await ofertaDelGrupo(f.grupo, f.ofertas.neiva);
    const [c] = await svc.enviar(f.programador, f.docente.documento, f.periodo, null);
    await expect(svc.revisar(c.idConcertacion, 'academica', f.revisor, REVISOR, OTP)).rejects.toBeInstanceOf(ForbiddenException);
    expect((await svc.revisar(c.idConcertacion, 'academica', f.revisor, REVISOR_TERRITORIAL, OTP)).estado).toBe('REVISADA');
    await expect(svc.aprobar(c.idConcertacion, f.aprobador, APROBADOR, OTP)).rejects.toBeInstanceOf(ForbiddenException);
    expect((await svc.aprobar(c.idConcertacion, f.aprobador, APROBADOR_TERRITORIAL, OTP)).estado).toBe('POR_ACEPTAR');
    await svc.aceptar(c.idConcertacion, { idPerson: f.docente.idPerson, idUser: f.docente.idUser }, OTP, null);
    // La territorial viaja al PTA (900022, HUILA): allí se aplica por par.
    expect(entregas[0].asignaturas[0].territorialId).toBe('900022');
  });

  caso('sin oferta CETAP, con aula de otro CETAP o sin ciclo, no se envía (falla cerrado y dice por qué)', async (f) => {
    const svc = servicio();
    await ofertaDelGrupo(f.grupo, null);
    await expect(svc.enviar(f.programador, f.docente.documento, f.periodo, null)).rejects.toThrow(/sin oferta CETAP/);
    await ofertaDelGrupo(f.grupo, f.ofertas.neiva);
    // El aula 101 es del CETAP de Sede Central (CET-0288); el grupo se dicta en Neiva.
    await client!.query(`UPDATE "${S}".franja_horaria SET tipo_sesion = 'presencial', aula_codigo = '101' WHERE id_franja = $1`, [f.franjas[0]]);
    await expect(svc.enviar(f.programador, f.docente.documento, f.periodo, null)).rejects.toThrow(/aula de otro CETAP/);
    await client!.query(`UPDATE "${S}".grupo SET fecha_inicio = NULL, fecha_fin = NULL WHERE id_grupo = $1`, [f.grupo]);
    await expect(svc.enviar(f.programador, f.docente.documento, f.periodo, null)).rejects.toThrow(/ciclo/);
  });

  caso('interruptor único: con el PTA apagado o caído, aquí no se concierta', async (f) => {
    const svc = servicio();
    ptaEstado = false;
    expect(await svc.configuracion()).toMatchObject({ habilitada: false });
    await expect(svc.enviar(f.programador, f.docente.documento, f.periodo, null)).rejects.toThrow(/apagada/);
    ptaEstado = 'caido';
    (svc as any).ptaCache = null;
    await expect(svc.enviar(f.programador, f.docente.documento, f.periodo, null)).rejects.toThrow(/No se pudo verificar/);
  });

  caso('corte por periodo: un periodo anterior al corte no se concierta (lo aprueba el PTA)', async (f) => {
    process.env.PROG_CONCERTACION_DESDE_PERIODO = '2049-2';
    await expect(servicio().enviar(f.programador, f.docente.documento, f.periodo, null)).rejects.toThrow(/aplica desde el periodo 2049-2/);
  });

  caso('apagada por configuración: toda escritura se rechaza y la asignación sigue como antes', async (f) => {
    const svc = servicio();
    expect((await svc.configuracion()).habilitada).toBe(false);
    await expect(svc.enviar(f.programador, f.docente.documento, f.periodo, null)).rejects.toThrow(/apagada/);
    expect((await asignaciones().asignar({ idGrupo: f.grupo, documento: f.otroDocente.documento, franjas: [f.franjas[1]] })).asignado).toBe(true);
  }, false);

  it('apagada por defecto: sin la variable, no está habilitada', async () => {
    delete process.env.PROG_CONCERTACION_HABILITADA;
    expect((await servicio().configuracion()).habilitada).toBe(false);
  });
});
