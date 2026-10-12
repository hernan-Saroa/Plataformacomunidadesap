import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { Client } from 'pg';

import { DocenciaService } from '../docencia/docencia.service.js';
import { TerritorialService } from '../acceso/territorial.service.js';
import { ConcertacionService } from './concertacion.service.js';
import type { PermisoPta } from './permisos-pta.service.js';

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
const REVISOR: PermisoPta[] = [{ codigo: 'pta.review.academica.pregrado', alcance: 'global' }];
const APROBADOR: PermisoPta[] = [{ codigo: 'pta.approve.academica.pregrado', alcance: 'global' }];
// Sin alcance en el rol = por persona: decide sobre docentes de SU seccional (migración 038).
const APROBADOR_POR_PERSONA: PermisoPta[] = [{ codigo: 'pta.approve.academica.pregrado', alcance: 'persona' }];
const REVISOR_POR_PERSONA: PermisoPta[] = [{ codigo: 'pta.review.academica.pregrado', alcance: 'persona' }];
const APROBADOR_POSGRADO: PermisoPta[] = [{ codigo: 'pta.approve.academica.posgrado', alcance: 'global' }];

describe('EFDS-2315 :: concertacion de la docencia (agregado real, en transaccion)', () => {
  let client: Client | null = null;
  let hayBase = false;
  const entregas: any[] = [];
  const envAntes = process.env.PROG_CONCERTACION_HABILITADA;

  beforeAll(async () => {
    try { client = new Client(conexion); await client.connect(); hayBase = true; } catch { hayBase = false; }
  });
  afterAll(async () => {
    process.env.PROG_CONCERTACION_HABILITADA = envAntes;
    if (client) await client.end().catch(() => {});
  });

  const servicio = () => {
    const ds: any = { query: (sql: string, p?: any[]) => client!.query(sql, p).then((r) => r.rows) };
    ds.transaction = (cb: (m: any) => Promise<any>) => cb(ds); // ya estamos dentro de BEGIN
    const docencia = new DocenciaService(ds, { calcularImpacto: async () => ({ horasImpacto: 96 }) } as any);
    return new ConcertacionService(ds, docencia, { registrarDecision: async (d: any) => { entregas.push(d); } } as any, new TerritorialService(ds));
  };

  interface Fixture { docente: { idPerson: string; idUser: string; vinculacion: null }; periodo: string; franjas: string[]; revisor: string; aprobador: string }

  const caso = (nombre: string, fn: (f: Fixture) => Promise<void>, encendida = true) =>
    it(nombre, async () => {
      if (!hayBase || !client) { console.warn('  (sin base: omitido)'); return; }
      process.env.PROG_CONCERTACION_HABILITADA = encendida ? 'true' : 'false';
      entregas.length = 0;
      await client.query('BEGIN');
      try {
        const docenteHuila = await client.query(
          `SELECT u.id_user::text AS id_user, u.id_person::text AS id_person FROM auth."user" u
             JOIN academic_work_plan."Docente" d ON d."personaId" = u.id_person AND d."territorialId" = 'DT-009'
            ORDER BY u.id_user LIMIT 1`);
        const otros = await client.query(
          `SELECT u.id_user::text AS id_user, u.id_person::text AS id_person FROM auth."user" u
            WHERE u.id_person IS NOT NULL AND u.id_user::text <> $1 ORDER BY u.id_user LIMIT 2`, [docenteHuila.rows[0].id_user]);
        const usuarios = { rows: [docenteHuila.rows[0], ...otros.rows] };
        const asig = await client.query(
          `SELECT a.id FROM academic_work_plan.asignatura a JOIN academic_work_plan.programa pr ON pr.id = a.id_programa
            WHERE pr.tipo = 'pregrado' ORDER BY a.id LIMIT 1`);
        const p = await client.query(
          `INSERT INTO "${S}".periodo_programacion (codigo,nombre,tipo,fecha_inicio,fecha_fin,estado)
           VALUES ('QA-2315-TX','QA concertacion','periodo_regular','2032-02-01','2032-06-15','activo') RETURNING id_periodo::text`);
        const g = await client.query(
          `INSERT INTO "${S}".grupo (id_asignatura,id_periodo,numero_grupo,estado) VALUES ($1,$2::uuid,981,'PROGRAMADO') RETURNING id_grupo`,
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
    // Un aprobador con alcance filtrado o por persona no decide (fail-closed).
    await expect(svc.aprobar(c.idConcertacion, f.aprobador, APROBADOR_POR_PERSONA, '123456', null)).rejects.toBeInstanceOf(ForbiddenException);

    const final = await svc.aprobar(c.idConcertacion, f.aprobador, APROBADOR, '123456', null);
    expect(final.estado).toBe('APROBADA');
    expect(await estados(f.franjas)).toEqual(['APROBADA', 'APROBADA']);
    expect(final.firmas.map((x: any) => [x.rol, x.modoOtp])).toEqual([['docente', 'simulado'], ['revisor', 'simulado'], ['aprobador', 'simulado']]);
    expect(final.firmas.map((x: any) => x.idUser)).toEqual([f.docente.idUser, f.revisor, f.aprobador]);
    expect(final.firmas[2].contexto).toBe(`prog-docencia:${c.idConcertacion}:${final.huella}:aprobador`);

    expect(entregas).toHaveLength(1);
    expect(entregas[0]).toMatchObject({ idConcertacion: c.idConcertacion, nivel: 'pregrado', horas: 96, huella: final.huella });
    expect(entregas[0].firmas.map((x: any) => x.rol)).toEqual(['docente', 'revisor', 'aprobador']);
    expect(final.notificadaPtaEn).not.toBeNull();
  });

  caso('alcance por persona: decide la seccional del docente (Huila), no otra (Tolima)', async (f) => {
    const svc = servicio();
    const [c] = await svc.enviar(f.docente, f.periodo, '123456', null);
    const seccional = (u: string, id: number) => client!.query(
      `UPDATE auth.personas SET id_seccional = $2 WHERE id_person = (SELECT id_person FROM auth."user" WHERE id_user::text = $1)`, [u, id]);
    await seccional(f.revisor, 16); // Tolima
    await expect(svc.revisar(c.idConcertacion, 'academica', f.revisor, REVISOR_POR_PERSONA, '123456')).rejects.toBeInstanceOf(ForbiddenException);
    expect(await svc.bandeja(REVISOR_POR_PERSONA, f.revisor, f.periodo)).toEqual([]);
    await seccional(f.revisor, 10); // Huila
    expect((await svc.bandeja(REVISOR_POR_PERSONA, f.revisor, f.periodo)).map((x: any) => x.idConcertacion)).toEqual([c.idConcertacion]);
    expect((await svc.revisar(c.idConcertacion, 'academica', f.revisor, REVISOR_POR_PERSONA, '123456')).estado).toBe('REVISADA');
    await seccional(f.aprobador, 10);
    expect((await svc.aprobar(c.idConcertacion, f.aprobador, APROBADOR_POR_PERSONA, '123456', null)).estado).toBe('APROBADA');
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

  caso('apagada por configuracion: toda escritura se rechaza', async (f) => {
    const svc = servicio();
    expect(svc.configuracion().habilitada).toBe(false);
    await expect(svc.enviar(f.docente, f.periodo, '123456', null)).rejects.toThrow(/apagada/);
  }, false);

  it('apagada por defecto: sin la variable, no esta habilitada', () => {
    delete process.env.PROG_CONCERTACION_HABILITADA;
    expect(servicio().configuracion().habilitada).toBe(false);
  });
});
