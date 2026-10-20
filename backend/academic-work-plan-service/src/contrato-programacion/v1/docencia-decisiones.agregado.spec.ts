import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { Client } from 'pg';

import { DocentesContratoController } from './docentes-contrato.controller';
import { DocenciaDecisionesController } from './docencia-decisiones.controller';
import { DocenciaDecisionesService, type DecisionDocenciaDto } from './docencia-decisiones.service';

/**
 * EFDS-2315 :: contrato PROG↔PTA — registro de la docencia concertada.
 *
 * Agregado sobre la base real, en una transacción que se revierte. Afirma:
 *   · solo quien puede aprobar Docencia de ese nivel registra la decisión;
 *   · la decisión se valida (estructurada y con las dos firmas);
 *   · registrar dos veces la misma concertación no la duplica (idempotente);
 *   · NO se aplica a ningún PTA (aplicada: false; PtaComponentApproval intacta);
 *   · el controlador de docentes sigue siendo solo GET (RN-09).
 */
const conexion = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 55432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'esap_secure_password_2024',
  database: process.env.DB_NAME || 'esap_db',
};

const decision = (extra: Partial<DecisionDocenciaDto> = {}): DecisionDocenciaDto => ({
  idConcertacion: '00000000-0000-4000-8000-00000000e215',
  documentoDocente: '1020304050',
  periodo: '2050-1',
  nivel: 'pregrado',
  horas: 96,
  huella: 'a'.repeat(64),
  asignaturas: [{
    idGrupo: '00000000-0000-4000-8000-0000000000g1', asignaturaId: '1', codigo: 'ASIG-00001', nombre: 'Constitución Del Territorio',
    programaId: '1', pensum: null, creditos: 3, semestre: 1, modalidad: 'Presencial', fechaInicio: '2050-02-03', fechaFin: '2050-05-30', horas: 96,
  }],
  firmas: [
    { rol: 'docente', idUser: 'u1', firmadoEn: '2050-02-10T10:00:00.000Z', modoOtp: 'simulado' },
    { rol: 'aprobador', idUser: 'u2', firmadoEn: '2050-02-12T10:00:00.000Z', modoOtp: 'simulado' },
  ],
  ...extra,
});

describe('EFDS-2315 :: contrato v1 — docencia concertada (agregado real, en transaccion)', () => {
  let client: Client | null = null;
  let hayBase = false;
  beforeAll(async () => {
    try { client = new Client(conexion); await client.connect(); hayBase = true; } catch { hayBase = false; }
  });
  afterAll(async () => { if (client) await client.end().catch(() => {}); });

  const servicio = (permisos: string[], approvesAll = false) => new DocenciaDecisionesService(
    { query: (sql: string, p?: any[]) => client!.query(sql, p).then((r) => r.rows) } as any,
    { resolveForUser: async () => ({ approvesAll, permissions: new Set(permisos) }) } as any,
  );

  /** Aprobaciones de componentes del PTA; null si la tabla no existe en esta base. */
  const contarAprobaciones = async (): Promise<number | null> => {
    const existe = (await client!.query(`SELECT to_regclass('academic_work_plan."PtaComponentApproval"') IS NOT NULL AS e`)).rows[0].e;
    if (!existe) { console.warn('  (PtaComponentApproval no existe en esta base: se omite esa comparación)'); return null; }
    return (await client!.query(`SELECT COUNT(*)::int AS n FROM academic_work_plan."PtaComponentApproval"`)).rows[0].n;
  };

  const caso = (nombre: string, fn: () => Promise<void>) =>
    it(nombre, async () => {
      if (!hayBase || !client) { console.warn('  (sin base: omitido)'); return; }
      await client.query('BEGIN');
      try { await fn(); } finally { await client.query('ROLLBACK'); }
    });

  caso('registra la decision de quien puede aprobar Docencia de ese nivel, sin aplicarla a ningun PTA', async () => {
    const aprobacionesAntes = await contarAprobaciones();
    const r = await servicio(['pta.approve.academica.pregrado']).registrar('u2', decision());
    // Apagada en el PTA (variable sin definir): solo registra, no aplica.
    expect(r).toEqual({ registrada: true, aplicada: false, estadoAplicacion: null });
    const fila = (await client!.query(
      `SELECT nivel, horas::float AS horas, aplicada_en, jsonb_array_length(firmas) AS firmas
         FROM academic_work_plan.docencia_concertada WHERE id_concertacion = $1`, [decision().idConcertacion])).rows[0];
    expect(fila).toMatchObject({ nivel: 'pregrado', horas: 96, aplicada_en: null, firmas: 2 });
    const aprobacionesDespues = await contarAprobaciones();
    expect(aprobacionesDespues).toBe(aprobacionesAntes);
  });

  caso('registrar dos veces la misma concertacion no la duplica', async () => {
    const svc = servicio([], true);
    await svc.registrar('u2', decision());
    await svc.registrar('u2', decision({ horas: 64 }));
    const filas = (await client!.query(
      `SELECT horas::float AS horas FROM academic_work_plan.docencia_concertada WHERE id_concertacion = $1`,
      [decision().idConcertacion])).rows;
    expect(filas).toEqual([{ horas: 64 }]);
  });

  caso('sin permiso de aprobar Docencia de ese nivel: 403', async () => {
    await expect(servicio(['pta.approve.academica.posgrado']).registrar('u2', decision())).rejects.toBeInstanceOf(ForbiddenException);
    await expect(servicio(['pta.review.academica.pregrado']).registrar('u2', decision())).rejects.toBeInstanceOf(ForbiddenException);
  });

  caso('una decision incompleta se rechaza antes de consultar permisos', async () => {
    const svc = servicio([], true);
    await expect(svc.registrar('u2', decision({ huella: 'x' }))).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.registrar('u2', decision({ firmas: [] }))).rejects.toThrow(/docente y la del aprobador/);
    await expect(svc.registrar('u2', decision({ asignaturas: [] }))).rejects.toBeInstanceOf(BadRequestException);
    const sinFechas = { ...decision().asignaturas[0], fechaInicio: '' };
    await expect(svc.registrar('u2', decision({ asignaturas: [sinFechas] }))).rejects.toThrow(/fechas del ciclo/);
  });

  it('RN-09 sigue intacto: el controlador de docentes solo declara GET y la escritura vive en otro controlador', () => {
    const metodos = (C: any) => Object.getOwnPropertyNames(C.prototype)
      .filter((n) => n !== 'constructor' && Reflect.getMetadata(PATH_METADATA, C.prototype[n]) !== undefined)
      .map((n) => Reflect.getMetadata(METHOD_METADATA, C.prototype[n]));
    expect(metodos(DocentesContratoController).every((m) => m === 0)).toBe(true); // 0 = GET
    // 1 = POST (la decisión); los GET son de lectura: configuración, régimen y docencia aprobada propia.
    expect(metodos(DocenciaDecisionesController).sort()).toEqual([0, 0, 0, 1]);
  });

  // Reporte de Tomás: con la concertación aprobada, el formulario de un PTA NUEVO no mostraba la docencia
  // (se aplica al guardar). El PTA ahora la expone, de solo lectura y SOLO la del usuario autenticado.
  caso('docencia aprobada del usuario: la propia, tal como entrará al PTA; nunca la de otro', async () => {
    const qa = (await client!.query(
      `SELECT u.id_user::text AS id, p.num_identificacion AS documento
         FROM auth."user" u JOIN auth.personas p ON p.id_person = u.id_person WHERE u.username = 'qa.docente'`)).rows[0];
    const otro = (await client!.query(
      `SELECT u.id_user::text AS id FROM auth."user" u WHERE u.username = 'superadmin@esap.edu.co'`)).rows[0];
    expect(qa && otro).toBeTruthy();
    const svc = servicio([], true);
    await svc.registrar('u2', decision({ documentoDocente: qa.documento, periodo: '2050-1' }));

    const propia = await svc.aprobadaDelUsuario(qa.id, '2050-1');
    expect(propia.horas).toBe(96);
    expect(propia.ptaVigente).toBeNull(); // aún no tiene PTA en 2050-1
    expect(propia.asignaturas).toHaveLength(1);
    expect(propia.asignaturas[0]).toMatchObject({
      origen: 'programacion', editable: false, asignatura_codigo: 'ASIG-00001', total_horas: 96,
      id_concertacion: decision().idConcertacion, nivel_concertacion: 'pregrado',
    });

    // Otro usuario no ve la docencia de qa.docente; otro periodo tampoco.
    expect((await svc.aprobadaDelUsuario(otro.id, '2050-1')).asignaturas).toEqual([]);
    expect((await svc.aprobadaDelUsuario(qa.id, '2050-2')).asignaturas).toEqual([]);
    // Sin identidad: vacío. Periodo mal formado: 400.
    expect((await svc.aprobadaDelUsuario(undefined, '2050-1')).asignaturas).toEqual([]);
    await expect(svc.aprobadaDelUsuario(qa.id, '2050')).rejects.toBeInstanceOf(BadRequestException);
  });

  caso('régimen para la pantalla: apagado es el de hoy; pide periodo válido o un PTA que exista', async () => {
    const svc = servicio([]);
    expect(await svc.regimen('2050-1', undefined)).toEqual({ regimen: 'actual' }); // interruptor sin definir
    await expect(svc.regimen('2050', undefined)).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.regimen(undefined, '00000000-0000-4000-8000-0000000000ff')).rejects.toBeInstanceOf(NotFoundException);
  });
});
