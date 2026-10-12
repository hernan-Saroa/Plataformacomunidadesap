import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { Client } from 'pg';

import { DocenciaService } from '../docencia/docencia.service.js';
import { TerritorialService } from '../acceso/territorial.service.js';
import { ConcertacionService } from './concertacion.service.js';
import { PermisosPtaService, type PermisoPta } from './permisos-pta.service.js';

/**
 * EFDS-2315 :: concertación de la docencia.
 *
 * Canario AGREGADO sobre la base real, cada caso en una transacción que se
 * revierte. El contrato PROG↔PTA (horas) y la entrega al PTA se simulan: aquí se
 * prueba el flujo, los permisos del PTA y el registro de firmas.
 */
const conexion = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 55432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'esap_db',
};
const S = 'academic-schedule';
const REVISOR: PermisoPta[] = [{ codigo: 'pta.review.academica.pregrado' }];
const APROBADOR: PermisoPta[] = [{ codigo: 'pta.approve.academica.pregrado' }];
const APROBADOR_POSGRADO: PermisoPta[] = [{ codigo: 'pta.approve.academica.posgrado' }];

describe('EFDS-2315 :: concertacion de la docencia (agregado real, en transaccion)', () => {
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
    process.env.PROG_CONCERTACION_HABILITADA = envAntes;
    process.env.PROG_CONCERTACION_DESDE_PERIODO = desdeAntes;
    if (client) await client.end().catch(() => {});
  });

  const servicio = () => {
    const ds: any = { query: (sql: string, p?: any[]) => client!.query(sql, p).then((r) => r.rows) };
    ds.transaction = (cb: (m: any) => Promise<any>) => cb(ds); // ya estamos dentro de BEGIN
    const docencia = new DocenciaService(ds, { calcularImpacto: async () => ({ horasImpacto: 96 }) } as any);
    return new ConcertacionService(ds, docencia, {
      registrarDecision: async (d: any) => { entregas.push(d); return { estadoAplicacion: 'aplicada' }; },
      ptaHabilitada: async () => { if (ptaEstado === 'caido') throw new Error('PTA sin respuesta'); return ptaEstado; },
    } as any, new TerritorialService(ds), new PermisosPtaService(ds));
  };

  interface Fixture { docente: { idPerson: string; idUser: string; vinculacion: null }; periodo: string; franjas: string[]; revisor: string; aprobador: string }

  const caso = (nombre: string, fn: (f: Fixture) => Promise<void>, encendida = true) =>
    it(nombre, async () => {
      if (!hayBase || !client) { console.warn('  (sin base: omitido)'); return; }
      process.env.PROG_CONCERTACION_HABILITADA = encendida ? 'true' : 'false';
      process.env.PROG_CONCERTACION_DESDE_PERIODO = '2049-1';
      ptaEstado = true;
      entregas.length = 0;
      await client.query('BEGIN');
      try {
        const docenteHuila = await client.query(
          `SELECT u.id_user::text AS id_user, u.id_person::text AS id_person FROM auth."user" u
             JOIN academic_work_plan."Docente" d ON d."personaId" = u.id_person AND d."territorialId" = 'DT-009'
            ORDER BY u.id_user LIMIT 1`);
        const otros = await client.query(
          `SELECT u.id_user::text AS id_user, u.id_person::text AS id_person FROM auth."user" u
             JOIN auth.personas pe ON pe.id_person = u.id_person AND pe.id_seccional IS NULL AND pe.id_sede IS NULL
            WHERE u.id_user::text <> $1 AND COALESCE(u.is_active, true) ORDER BY u.id_user LIMIT 2`, [docenteHuila.rows[0].id_user]);
        const usuarios = { rows: [docenteHuila.rows[0], ...otros.rows] };
        const asig = await client.query(
          `SELECT a.id FROM academic_work_plan.asignatura a JOIN academic_work_plan.programa pr ON pr.id = a.id_programa
            WHERE pr.tipo = 'pregrado' ORDER BY a.id LIMIT 1`);
        // Periodo de PLATAFORMA dentro del corte (2049-1 >= 2049-1), solo en esta transacción.
        const p = await client.query(
          `INSERT INTO academic_work_plan.periodo_academico (codigo, anio, semestre, fecha_inicio, fecha_fin, estado)
           VALUES ('2049-1', 2049, 1, '2049-02-01', '2049-06-15', 'planeacion') RETURNING id::text AS id_periodo`);
        const g = await client.query(
          `INSERT INTO "${S}".grupo (id_asignatura,id_periodo_academico,tipo_oferta,numero_grupo,estado,fecha_inicio,fecha_fin)
           VALUES ($1,$2::bigint,'periodo_regular',981,'PROGRAMADO','2049-02-03','2049-05-30') RETURNING id_grupo`,
          [asig.rows[0].id, p.rows[0].id_periodo]);
        const docente = usuarios.rows[0];
        const franjas: string[] = [];
        for (const dia of ['LUNES', 'JUEVES']) {
          const f = await client.query(
            `INSERT INTO "${S}".franja_horaria (id_grupo,dia_semana,hora_inicio,hora_fin,tipo_sesion,id_docente,estado)
             VALUES ($1,$2,'06:00','08:00','mediada_tecnologia',$3,'TOMADA') RETURNING id_franja::text`,
            [g.rows[0].id_grupo, dia, docente.id_person]);
          franjas.push(f.rows[0].id_franja);
        }
        await fn({
          docente: { idPerson: docente.id_person, idUser: docente.id_user, vinculacion: null },
          periodo: p.rows[0].id_periodo, franjas,
          revisor: usuarios.rows[1].id_user, aprobador: usuarios.rows[2].id_user,
        });
      } finally {
        await client.query('ROLLBACK');
      }
    });

  const estados = async (ids: string[]) => (await client!.query(
    `SELECT estado FROM "${S}".franja_horaria WHERE id_franja = ANY($1::uuid[]) ORDER BY id_franja`, [ids])).rows.map((r) => r.estado);

  caso('flujo completo: envia y firma el docente, revisa, aprueba y firma el aprobador; se entrega al PTA', async (f) => {
    const svc = servicio();
    const [c] = await svc.enviar(f.docente, f.periodo, '123456', null);
    expect(c).toMatchObject({ nivel: 'pregrado', estado: 'ENVIADA', horas: 96 });

    // Sin revisión no se aprueba.
    await expect(svc.aprobar(c.idConcertacion, f.aprobador, APROBADOR, '123456', null)).rejects.toBeInstanceOf(ConflictException);
    // Un revisor de otro nivel tampoco revisa.
    await expect(svc.revisar(c.idConcertacion, 'academica', f.revisor, APROBADOR_POSGRADO, '123456')).rejects.toBeInstanceOf(ForbiddenException);

    expect((await svc.revisar(c.idConcertacion, 'academica', f.revisor, REVISOR, '123456')).estado).toBe('REVISADA');

    const final = await svc.aprobar(c.idConcertacion, f.aprobador, APROBADOR, '123456', null);
    expect(final.estado).toBe('APROBADA');
    expect(await estados(f.franjas)).toEqual(['APROBADA', 'APROBADA']);
    expect(final.firmas.map((x: any) => [x.rol, x.modoOtp])).toEqual([['docente', 'simulado'], ['revisor', 'simulado'], ['aprobador', 'simulado']]);
    expect(final.firmas.map((x: any) => x.idUser)).toEqual([f.docente.idUser, f.revisor, f.aprobador]);
    expect(final.firmas[2].contexto).toBe(`prog-docencia:${c.idConcertacion}:${final.huella}:aprobador`);

    expect(entregas).toHaveLength(1);
    expect(entregas[0]).toMatchObject({ idConcertacion: c.idConcertacion, nivel: 'pregrado', horas: 96, huella: final.huella });
    // Una asignatura por grupo, con lo que el PTA exige al validar el envío.
    expect(entregas[0].asignaturas).toHaveLength(1);
    expect(entregas[0].asignaturas[0]).toMatchObject({ fechaInicio: '2049-02-03', fechaFin: '2049-05-30', horas: 96 });
    expect(entregas[0].asignaturas[0].asignaturaId).toMatch(/^\d+$/);
    expect(entregas[0].asignaturas[0].programaId).toMatch(/^\d+$/);
    // Sin ubicación del grupo: sin territorial (en el PTA, territorial_id vacío).
    expect(entregas[0].asignaturas[0].territorialId).toBeNull();
    expect(final.aplicacionPta).toBe('aplicada');
    expect(entregas[0].firmas.map((x: any) => x.rol)).toEqual(['docente', 'revisor', 'aprobador']);
    expect(final.notificadaPtaEn).not.toBeNull();
  });

  /** Cuenta real (solo lectura) cuya persona tiene esa seccional de auth. */
  const cuentaDeSeccional = async (idSeccional: number, excepto: string[]) => (await client!.query(
    `SELECT u.id_user::text AS id FROM auth."user" u JOIN auth.personas p ON p.id_person = u.id_person
      WHERE p.id_seccional = $1 AND COALESCE(u.is_active, true) AND u.id_user::text <> ALL($2::text[])
      ORDER BY u.id_user LIMIT 1`, [idSeccional, excepto])).rows[0]?.id as string;
  /** Ubica el grupo de la concertación (franja.sede_codigo, esquema propio). */
  const ubicar = (franjas: string[], codigo: string | null) => client!.query(
    `UPDATE "${S}".franja_horaria SET sede_codigo = $2 WHERE id_franja = ANY($1::uuid[])`, [franjas, codigo]);

  caso('alcance como el PTA: la seccional del aprobador contra la territorial del grupo (Huila sí, Tolima no)', async (f) => {
    const svc = servicio();
    await ubicar(f.franjas, 'HUI'); // código de auth.seccionales 10 (Seccional Huila)
    const [c] = await svc.enviar(f.docente, f.periodo, '123456', null);
    const tolima = await cuentaDeSeccional(16, [f.docente.idUser]);
    const huila = await cuentaDeSeccional(10, [f.docente.idUser]);
    const huila2 = await cuentaDeSeccional(10, [f.docente.idUser, huila]);
    await expect(svc.revisar(c.idConcertacion, 'academica', tolima, REVISOR, '123456')).rejects.toBeInstanceOf(ForbiddenException);
    expect(await svc.bandeja(REVISOR, tolima, f.periodo)).toEqual([]);
    expect((await svc.bandeja(REVISOR, huila, f.periodo)).map((x: any) => x.idConcertacion)).toEqual([c.idConcertacion]);
    expect((await svc.revisar(c.idConcertacion, 'academica', huila, REVISOR, '123456')).estado).toBe('REVISADA');
    expect((await svc.aprobar(c.idConcertacion, huila2, APROBADOR, '123456', null)).estado).toBe('APROBADA');
    // La territorial viaja al PTA como asignaturas[].territorial_id.
    expect(entregas[0].asignaturas[0].territorialId).toBe('10');
  });

  caso('alcance como el PTA: un aprobador CON seccional no decide un grupo sin territorial (no se puede verificar)', async (f) => {
    const svc = servicio();
    const [c] = await svc.enviar(f.docente, f.periodo, '123456', null);
    const huila = await cuentaDeSeccional(10, [f.docente.idUser]);
    await expect(svc.revisar(c.idConcertacion, 'academica', huila, REVISOR, '123456')).rejects.toBeInstanceOf(ForbiddenException);
    // Sin seccional en Personas no hay restricción geográfica (así lo hace hoy el PTA).
    expect((await svc.revisar(c.idConcertacion, 'academica', f.revisor, REVISOR, '123456')).estado).toBe('REVISADA');
  });

  caso('hueco reportado: el código del RUND (DT-009, catálogo de la carga masiva) no cruza con la seccional heredada (Huila)', async (f) => {
    const svc = servicio();
    await ubicar(f.franjas, 'DT-009'); // auth.seccionales 900022 "HUILA"
    const [c] = await svc.enviar(f.docente, f.periodo, '123456', null);
    const huila = await cuentaDeSeccional(10, [f.docente.idUser]); // "Seccional Huila"
    // Igual que en el PTA: ni el id ni el nombre normalizado coinciden → no decide.
    await expect(svc.revisar(c.idConcertacion, 'academica', huila, REVISOR, '123456')).rejects.toBeInstanceOf(ForbiddenException);
  });

  caso('devolver exige comentario, regresa las franjas al docente y bloquea reenviar hasta resolverlas', async (f) => {
    const svc = servicio();
    const [c] = await svc.enviar(f.docente, f.periodo, '123456', null);
    await expect(svc.devolver(c.idConcertacion, f.revisor, REVISOR, '  ')).rejects.toBeInstanceOf(BadRequestException);
    const d = await svc.devolver(c.idConcertacion, f.revisor, REVISOR, 'Falta el jueves en aula física');
    expect(d).toMatchObject({ estado: 'DEVUELTA', comentario: 'Falta el jueves en aula física' });
    expect(await estados(f.franjas)).toEqual(['DEVUELTA', 'DEVUELTA']);
    await expect(svc.enviar(f.docente, f.periodo, '123456', null)).rejects.toThrow(/devuelta/);
    // El docente vuelve a tomarlas y reenvía: la misma concertación vuelve a ENVIADA, sin revisiones.
    await client!.query(`UPDATE "${S}".franja_horaria SET estado = 'TOMADA' WHERE id_franja = ANY($1::uuid[])`, [f.franjas]);
    const [r] = await svc.enviar(f.docente, f.periodo, '123456', null);
    expect(r).toMatchObject({ idConcertacion: c.idConcertacion, estado: 'ENVIADA' });
  });

  caso('no se aprueba si la docencia cambio despues de que el docente la firmo', async (f) => {
    const svc = servicio();
    const [c] = await svc.enviar(f.docente, f.periodo, '123456', null);
    await svc.revisar(c.idConcertacion, 'academica', f.revisor, REVISOR, '123456');
    await client!.query(`UPDATE "${S}".franja_horaria SET id_docente = NULL, estado = 'PUBLICADA' WHERE id_franja = $1`, [f.franjas[0]]);
    await expect(svc.aprobar(c.idConcertacion, f.aprobador, APROBADOR, '123456', null)).rejects.toThrow(/cambió/);
  });

  caso('la firma exige un codigo de 6 digitos y un envio no se repite', async (f) => {
    const svc = servicio();
    await expect(svc.enviar(f.docente, f.periodo, '12ab', null)).rejects.toBeInstanceOf(BadRequestException);
    await svc.enviar(f.docente, f.periodo, '123456', null);
    await expect(svc.enviar(f.docente, f.periodo, '123456', null)).rejects.toThrow(/ya fue enviada/);
  });

  caso('interruptor unico: con el PTA apagado o caido, aqui no se concierta', async (f) => {
    const svc = servicio();
    ptaEstado = false;
    expect((await svc.configuracion())).toMatchObject({ habilitada: false });
    await expect(svc.enviar(f.docente, f.periodo, '123456', null)).rejects.toThrow(/apagada/);
    ptaEstado = 'caido';
    (svc as any).ptaCache = null;
    await expect(svc.enviar(f.docente, f.periodo, '123456', null)).rejects.toThrow(/No se pudo verificar/);
  });

  caso('corte por periodo: un periodo anterior al corte no se concierta (lo aprueba el PTA)', async (f) => {
    process.env.PROG_CONCERTACION_DESDE_PERIODO = '2049-2';
    await expect(servicio().enviar(f.docente, f.periodo, '123456', null)).rejects.toThrow(/aplica desde el periodo 2049-2/);
  });

  caso('sin el ciclo del grupo no se envia: el PTA exige las fechas', async (f) => {
    await client!.query(
      `UPDATE "${S}".grupo SET fecha_inicio = NULL, fecha_fin = NULL
        WHERE id_grupo = (SELECT id_grupo FROM "${S}".franja_horaria WHERE id_franja = $1)`, [f.franjas[0]]);
    await expect(servicio().enviar(f.docente, f.periodo, '123456', null)).rejects.toThrow(/ciclo/);
  });

  caso('apagada por configuracion: toda escritura se rechaza', async (f) => {
    const svc = servicio();
    expect((await svc.configuracion()).habilitada).toBe(false);
    await expect(svc.enviar(f.docente, f.periodo, '123456', null)).rejects.toThrow(/apagada/);
  }, false);

  it('apagada por defecto: sin la variable, no esta habilitada', async () => {
    delete process.env.PROG_CONCERTACION_HABILITADA;
    expect((await servicio().configuracion()).habilitada).toBe(false);
  });
});
