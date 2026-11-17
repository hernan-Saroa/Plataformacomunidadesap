import { BadRequestException } from '@nestjs/common';
import { Client } from 'pg';

import { ESTADO_APAGADA, ESTADO_CONFLICTO_MANUAL } from './docencia-programacion';
import {
  CLAVE_INTEROPERABILIDAD, leerInteroperabilidad, registrarFuenteInteroperabilidad, sembrarInteroperabilidad,
} from './interoperabilidad';
import { InteroperabilidadService } from './interoperabilidad.service';

/**
 * EFDS-2435 :: el interruptor de interoperabilidad, con el SQL REAL (agregado, en una transacción
 * que se revierte; la prueba de «dos réplicas» confirma y restaura la fila).
 */
const conexion = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 55432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'esap_secure_password_2024',
  database: process.env.DB_NAME || 'esap_db',
};
const ACTOR = { userId: 'u-1', email: 'admin@esap.edu.co', roles: ['SUPER_ADMIN'] };
const ID_A = '00000000-0000-4000-8000-0000000e2435';
const ID_B = '00000000-0000-4000-8000-0000000e2436';
const ID_C = '00000000-0000-4000-8000-0000000e2437';
const ID_PTA = { a: '00000000-0000-4000-8000-0000000f2435', b: '00000000-0000-4000-8000-0000000f2436', c: '00000000-0000-4000-8000-0000000f2437' };

describe('EFDS-2435 :: interoperabilidad PTA ↔ Programación Académica (agregado real)', () => {
  const envAntes = { ...process.env };
  const fetchAntes = (global as any).fetch;
  let client: Client | null = null;
  let hayBase = false;
  let personas: Array<{ id_person: string; num_identificacion: string }> = [];
  let auditorias: any[] = [];

  beforeAll(async () => {
    try { client = new Client(conexion); await client.connect(); hayBase = true; } catch { hayBase = false; }
    if (hayBase) {
      personas = (await client!.query(
        `SELECT p.id_person::text, p.num_identificacion FROM auth.personas p WHERE p.num_identificacion IS NOT NULL
          ORDER BY p.num_identificacion LIMIT 3`)).rows;
    }
  });
  afterAll(async () => {
    process.env = envAntes; (global as any).fetch = fetchAntes; registrarFuenteInteroperabilidad(null);
    if (client) await client.end().catch(() => {});
  });
  beforeEach(() => {
    auditorias = [];
    (global as any).fetch = jest.fn(async (url: string, init: any) => {
      if (String(url).endsWith('/logs')) auditorias.push(JSON.parse(init.body));
      return { ok: true, json: async () => ({}) } as any;
    });
    process.env.PROG_CONCERTACION_DESDE_PERIODO = '2050-1';
    delete process.env.PROG_CONCERTACION_HABILITADA;
  });

  const ds = (): any => {
    const d: any = { query: (sql: string, p?: any[]) => client!.query(sql, p).then((r) => r.rows) };
    d.transaction = (cb: (m: any) => Promise<any>) => cb(d); // ya estamos dentro de BEGIN
    return d;
  };

  const caso = (nombre: string, fn: () => Promise<void>) =>
    it(nombre, async () => {
      if (!hayBase || !client || personas.length < 3) { console.warn('  (sin base o sin personas: omitido)'); return; }
      await client.query('BEGIN');
      registrarFuenteInteroperabilidad(ds());
      try {
        await client.query(`DELETE FROM academic_work_plan."ConfiguracionSistema" WHERE clave = $1`, [CLAVE_INTEROPERABILIDAD]);
        await fn();
      } finally { registrarFuenteInteroperabilidad(null); await client.query('ROLLBACK'); }
    });

  const servicio = () => new InteroperabilidadService(ds());

  /** Un docente con su decisión pendiente y su PTA (estado y asignaturas a elección). */
  const escenario = async (i: 0 | 1 | 2, idConcertacion: string, idPta: string, estado: string, asignaturas: any[], estadoAplicacion = ESTADO_APAGADA) => {
    const p = personas[i];
    await client!.query(
      `INSERT INTO academic_work_plan."Docente" ("personaId", dedicacion, "territorialId", "tipoVinculacion", "updatedAt")
       VALUES ($1::uuid, 'TIEMPO_COMPLETO', 'DT-009', 'PLANTA', NOW())`, [p.id_person]);
    const idDocente = (await client!.query(
      `SELECT id FROM academic_work_plan."Docente" WHERE "personaId" = $1::uuid ORDER BY "createdAt" DESC LIMIT 1`, [p.id_person])).rows[0].id;
    await client!.query(
      `INSERT INTO academic_work_plan."PlanTrabajoAcademico" (id, "docenteId", periodo, estado, "datosEstructurados", "updatedAt")
       VALUES ($1, $2, '2050-1', $3, $4::jsonb, NOW())`, [idPta, idDocente, estado, JSON.stringify({ asignaturas })]);
    await client!.query(
      `INSERT INTO academic_work_plan.docencia_concertada
         (id_concertacion, documento_docente, periodo, nivel, horas, huella, asignaturas, firmas, registrada_por, estado_aplicacion)
       VALUES ($1, $2, '2050-1', 'pregrado', 96, $3, $4::jsonb, '[]'::jsonb, 'prueba', $5)`,
      [idConcertacion, p.num_identificacion, 'c'.repeat(64), JSON.stringify([{
        idGrupo: 'g', asignaturaId: '1', programaId: '1', codigo: 'ASIG-00001', nombre: 'Constitución', pensum: null,
        creditos: 3, semestre: 1, modalidad: 'Presencial', fechaInicio: '2050-02-03', fechaFin: '2050-05-30', horas: 96 }]), estadoAplicacion]);
  };
  const estadoDe = async (id: string) => (await client!.query(
    `SELECT estado_aplicacion FROM academic_work_plan.docencia_concertada WHERE id_concertacion = $1`, [id])).rows[0].estado_aplicacion;
  const dsDe = async (idPta: string) => (await client!.query(
    `SELECT "datosEstructurados" AS ds FROM academic_work_plan."PlanTrabajoAcademico" WHERE id = $1`, [idPta])).rows[0].ds;

  caso('siembra: sin variable, APAGADO; con variable, la variable solo la primera vez; después manda la base', async () => {
    const q = ds();
    let r = await sembrarInteroperabilidad(q);
    expect(r).toMatchObject({ sembrada: true, config: { habilitada: false, origen: 'base', desdePeriodo: '2050-1' } });
    // Segunda réplica arrancando: no pisa nada, y avisa si la variable difiere.
    process.env.PROG_CONCERTACION_HABILITADA = 'true';
    r = await sembrarInteroperabilidad(q);
    expect(r).toMatchObject({ sembrada: false, difiereDeVariable: true, config: { habilitada: false } });
    expect((await client!.query(`SELECT COUNT(*)::int AS n FROM academic_work_plan."ConfiguracionSistema" WHERE clave = $1`, [CLAVE_INTEROPERABILIDAD])).rows[0].n).toBe(1);
    // Base nueva con la variable en true: se siembra encendido.
    await client!.query(`DELETE FROM academic_work_plan."ConfiguracionSistema" WHERE clave = $1`, [CLAVE_INTEROPERABILIDAD]);
    expect((await sembrarInteroperabilidad(q)).config.habilitada).toBe(true);
  });

  caso('validaciones: motivo corto 400, sin confirmación 400, corte inválido 400; nada se audita ni se cambia', async () => {
    await sembrarInteroperabilidad(ds());
    const s = servicio();
    await expect(s.cambiar({ habilitada: true, motivo: 'corto', confirmacion: true }, ACTOR)).rejects.toBeInstanceOf(BadRequestException);
    await expect(s.cambiar({ habilitada: true, motivo: 'Motivo suficientemente largo', confirmacion: false }, ACTOR)).rejects.toBeInstanceOf(BadRequestException);
    await expect(s.cambiar({ habilitada: true, desdePeriodo: '2050-3', motivo: 'Motivo suficientemente largo', confirmacion: true }, ACTOR)).rejects.toBeInstanceOf(BadRequestException);
    await expect(s.cambiar({ habilitada: 'si' as any, motivo: 'Motivo suficientemente largo', confirmacion: true }, ACTOR)).rejects.toBeInstanceOf(BadRequestException);
    expect((await leerInteroperabilidad(ds())).habilitada).toBe(false);
    expect(auditorias).toHaveLength(0);
  });

  caso('apagado → encendido: aplica lo pendiente, NO pisa docencia manual, NO toca un PTA firmado; conteos y auditoría', async () => {
    await sembrarInteroperabilidad(ds());
    await escenario(0, ID_A, ID_PTA.a, 'BORRADOR', []);                                                 // se aplica
    await escenario(1, ID_B, ID_PTA.b, 'BORRADOR', [{ asignatura_id: '9', asignatura_nombre: 'Manual' }]); // conflicto
    await escenario(2, ID_C, ID_PTA.c, 'EN_FIRME', [{ asignatura_id: '8', asignatura_nombre: 'Firmada' }]); // omitida
    const manualAntes = JSON.stringify(await dsDe(ID_PTA.b));
    const firmadoAntes = JSON.stringify(await dsDe(ID_PTA.c));

    const r = await servicio().cambiar({ habilitada: true, motivo: 'Habilitar para la prueba de Javier', confirmacion: true }, ACTOR);
    expect(r.config).toMatchObject({ habilitada: true, origen: 'base', motivo: 'Habilitar para la prueba de Javier', cambiadoPor: 'u-1' });
    expect(r.resultado).toMatchObject({ aplicadas: 1, conflicto: 1, omitidas: 1 });
    expect(await estadoDe(ID_A)).toBe('aplicada');
    expect(await estadoDe(ID_B)).toBe(ESTADO_CONFLICTO_MANUAL);
    expect(await estadoDe(ID_C)).toBe('pendiente_pta_firmado');
    expect((await dsDe(ID_PTA.a)).asignaturas).toEqual([expect.objectContaining({ origen: 'programacion', total_horas: 96 })]);
    expect(JSON.stringify(await dsDe(ID_PTA.b))).toBe(manualAntes);   // lo manual intacto
    expect(JSON.stringify(await dsDe(ID_PTA.c))).toBe(firmadoAntes);  // el firmado intacto
    // Auditoría con valor anterior y nuevo, usuario y motivo.
    expect(auditorias).toHaveLength(1);
    expect(auditorias[0]).toMatchObject({
      method: 'PUT', module: 'academic-work-plan', entityName: 'ConfiguracionSistema', entityId: CLAVE_INTEROPERABILIDAD,
      userEmail: 'admin@esap.edu.co', previousData: { habilitada: false, desdePeriodo: '2050-1' },
      newData: { habilitada: true, desdePeriodo: '2050-1', motivo: 'Habilitar para la prueba de Javier', usuario: 'u-1' },
    });
    // Reaplicar es idempotente: lo aplicado no se duplica y el conflicto sigue siendo conflicto.
    const otra = await servicio().aplicarPendientes();
    expect(otra).toMatchObject({ aplicadas: 0, conflicto: 1 });
  });

  caso('encendido → apagado: no se borra nada, lo aplicado se conserva, y la decisión nueva queda pendiente', async () => {
    await sembrarInteroperabilidad(ds());
    await escenario(0, ID_A, ID_PTA.a, 'BORRADOR', []);
    await servicio().cambiar({ habilitada: true, motivo: 'Encender para probar el flujo', confirmacion: true }, ACTOR);
    const aplicado = JSON.stringify(await dsDe(ID_PTA.a));
    expect(await estadoDe(ID_A)).toBe('aplicada');

    const impactoAntes = await servicio().impacto();
    expect(impactoAntes.ptasConDocenciaAplicada).toBeGreaterThanOrEqual(1);
    const r = await servicio().cambiar({ habilitada: false, motivo: 'Contingencia: Programación Académica caída', confirmacion: true }, ACTOR);
    expect(r.config.habilitada).toBe(false);
    expect(r.resultado).toBeNull();
    expect(JSON.stringify(await dsDe(ID_PTA.a))).toBe(aplicado);   // nada se borra
    expect(await estadoDe(ID_A)).toBe('aplicada');                  // lo aplicado se conserva
    expect(auditorias[1]).toMatchObject({ previousData: { habilitada: true }, newData: { habilitada: false } });
  });

  it('dos réplicas leyendo a la vez ven el mismo valor (dos conexiones a la misma base)', async () => {
    if (!hayBase) { console.warn('  (sin base: omitido)'); return; }
    const otro = new Client(conexion); await otro.connect();
    const previa = (await client!.query(`SELECT valor FROM academic_work_plan."ConfiguracionSistema" WHERE clave = $1`, [CLAVE_INTEROPERABILIDAD])).rows[0]?.valor ?? null;
    const q = (c: Client) => ({ query: (sql: string, p?: any[]) => c.query(sql, p).then((r) => r.rows) });
    try {
      await client!.query(`DELETE FROM academic_work_plan."ConfiguracionSistema" WHERE clave = $1`, [CLAVE_INTEROPERABILIDAD]);
      // Las dos réplicas arrancan a la vez: una sola fila, sin error.
      await Promise.all([sembrarInteroperabilidad(q(client!)), sembrarInteroperabilidad(q(otro))]);
      expect((await client!.query(`SELECT COUNT(*)::int AS n FROM academic_work_plan."ConfiguracionSistema" WHERE clave = $1`, [CLAVE_INTEROPERABILIDAD])).rows[0].n).toBe(1);
      // Una cambia (confirmado); la otra lo ve en la siguiente lectura.
      await client!.query(`UPDATE academic_work_plan."ConfiguracionSistema" SET valor = '{"habilitada":true,"desdePeriodo":"2050-1"}'::jsonb WHERE clave = $1`, [CLAVE_INTEROPERABILIDAD]);
      expect((await leerInteroperabilidad(q(otro))).habilitada).toBe(true);
      await client!.query(`UPDATE academic_work_plan."ConfiguracionSistema" SET valor = '{"habilitada":false,"desdePeriodo":"2050-1"}'::jsonb WHERE clave = $1`, [CLAVE_INTEROPERABILIDAD]);
      expect((await leerInteroperabilidad(q(otro))).habilitada).toBe(false);
    } finally {
      await client!.query(`DELETE FROM academic_work_plan."ConfiguracionSistema" WHERE clave = $1`, [CLAVE_INTEROPERABILIDAD]);
      if (previa) await client!.query(`INSERT INTO academic_work_plan."ConfiguracionSistema" (clave, valor, "updatedAt") VALUES ($1, $2::jsonb, NOW())`, [CLAVE_INTEROPERABILIDAD, JSON.stringify(previa)]);
      await otro.end();
    }
  });
});
