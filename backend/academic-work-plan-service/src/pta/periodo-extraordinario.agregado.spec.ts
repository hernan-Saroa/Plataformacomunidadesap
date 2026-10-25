import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';

import { PeriodoAcademicoEntity } from './entities/periodo-academico.entity';
import { PeriodoAcademicoController, PERMISO_ACTIVAR_EXTRAORDINARIO } from './periodo-academico.controller';
import { PtaService } from './pta.service';

/**
 * EFDS-2346 :: periodo personalizado y periodo extraordinario, sobre la base real,
 * en una transacción que se revierte.
 *
 *   · el personalizado (2027-INT, «Interperiodo 2027») es un periodo más;
 *   · activarlo como extraordinario pide permiso propio y motivo; uno a la vez;
 *     no cierra el principal ni termina PTA;
 *   · activar después un nuevo principal (2028-1) cierra el anterior y termina sus
 *     PTA, pero NO toca el extraordinario ni sus PTA;
 *   · la base no admite dos principales ni dos extraordinarios en curso.
 */
const CONFIG = {
  type: 'postgres' as const,
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 55432),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'esap_secure_password_2024',
  database: process.env.DB_NAME || 'esap_db',
  entities: [PeriodoAcademicoEntity],
  synchronize: false,
  logging: false,
};

describe('EFDS-2346 :: periodo personalizado y extraordinario (agregado real, en transacción)', () => {
  let ds: DataSource | null = null;
  let hayBase = false;
  beforeAll(async () => {
    try { ds = await new DataSource(CONFIG).initialize(); hayBase = true; } catch { hayBase = false; }
  }, 30000);
  afterAll(async () => { if (ds?.isInitialized) await ds.destroy(); });

  const controlador = (qr: QueryRunner, permisos: string[] = []) => {
    const pta = Object.create(PtaService.prototype) as PtaService;
    (pta as any).logger = { log: () => {}, warn: () => {} };
    (pta as any).ptaRepo = { manager: qr.manager };
    return new PeriodoAcademicoController(
      qr.manager.getRepository(PeriodoAcademicoEntity),
      pta,
      { resolveForUser: async () => ({ isSuperUser: false, permissions: new Set(permisos) }) } as any,
    );
  };
  const req = { user: { userId: '00000000-0000-4000-8000-000000002346' } };

  const caso = (nombre: string, fn: (qr: QueryRunner) => Promise<void>) =>
    it(nombre, async () => {
      if (!hayBase || !ds) { console.warn('  (sin base: omitido)'); return; }
      const qr = ds.createQueryRunner();
      await qr.connect();
      await qr.startTransaction();
      try {
        // Punto de partida propio: un solo principal en curso (2049-2), sin extraordinario.
        await qr.query(`UPDATE academic_work_plan.periodo_academico SET estado = 'cerrado', extraordinario = FALSE WHERE estado = 'en_curso'`);
        await qr.query(
          `INSERT INTO academic_work_plan.periodo_academico (codigo, anio, semestre, fecha_inicio, fecha_fin, estado)
           VALUES ('2049-2', 2049, 2, '2049-08-01', '2049-12-10', 'en_curso')`);
        await fn(qr);
      } finally {
        await qr.rollbackTransaction();
        await qr.release();
      }
    }, 30000);

  const estados = async (qr: QueryRunner) => Object.fromEntries((await qr.query(
    `SELECT codigo, estado || CASE WHEN extraordinario THEN '+extra' ELSE '' END AS e
       FROM academic_work_plan.periodo_academico WHERE codigo IN ('2049-2', '2049-INT', '2050-1')`)).map((r: any) => [r.codigo, r.e]));

  caso('el personalizado es un periodo más: código y nombre propios, sin semestre', async (qr) => {
    const c = controlador(qr);
    await expect(c.create({ tipo: 'personalizado', anio: 2049, codigo: '2049-INT', fechaInicio: '2049-12-14', fechaFin: '2050-01-25' }))
      .rejects.toThrow(/nombre/);
    await expect(c.create({ tipo: 'personalizado', anio: 2049, codigo: '2049-1', nombre: 'X', fechaInicio: '2049-12-14', fechaFin: '2050-01-25' }))
      .rejects.toThrow(/semestral/);
    const p = await c.create({ tipo: 'personalizado', anio: 2049, codigo: '2049-int', nombre: 'Interperiodo 2049', fechaInicio: '2049-12-14', fechaFin: '2050-01-25' });
    expect(p).toMatchObject({ codigo: '2049-INT', tipo: 'personalizado', semestre: null, nombre: 'Interperiodo 2049', estado: 'planeacion' });
    // Mismas reglas: sus fechas no se cruzan con otro periodo.
    await expect(c.create({ tipo: 'personalizado', anio: 2049, codigo: '2049-VAC', nombre: 'Vacacional', fechaInicio: '2049-12-01', fechaFin: '2049-12-20' }))
      .rejects.toThrow(/se cruzan/);
  });

  caso('activar como extraordinario: permiso propio, motivo, uno a la vez; no cierra el principal ni termina PTA', async (qr) => {
    const inter = await controlador(qr).create({ tipo: 'personalizado', anio: 2049, codigo: '2049-INT', nombre: 'Interperiodo 2049', fechaInicio: '2049-12-14', fechaFin: '2050-01-25' });
    const otro = await controlador(qr).create({ tipo: 'personalizado', anio: 2050, codigo: '2050-VAC', nombre: 'Vacacional 2050', fechaInicio: '2050-07-01', fechaFin: '2050-07-20' });
    // PTA del principal: no debe terminarse por activar el extraordinario.
    const docente = (await qr.query(`SELECT id FROM academic_work_plan."Docente" LIMIT 1`))[0].id;
    const [pta] = await qr.query(
      `INSERT INTO academic_work_plan."PlanTrabajoAcademico" ("docenteId", periodo, estado, "updatedAt") VALUES ($1, '2049-2', 'Borrador', NOW()) RETURNING id`, [docente]);

    await expect(controlador(qr).activarExtraordinario(inter.id, { motivo: 'Cursos intersemestrales' }, req)).rejects.toBeInstanceOf(ForbiddenException);
    const c = controlador(qr, [PERMISO_ACTIVAR_EXTRAORDINARIO]);
    await expect(c.activarExtraordinario(inter.id, { motivo: 'corto' }, req)).rejects.toBeInstanceOf(BadRequestException);
    const r = await c.activarExtraordinario(inter.id, { motivo: 'Cursos intersemestrales de 2049' }, req);
    expect(r).toMatchObject({ estado: 'en_curso', extraordinario: true, motivoExtraordinario: 'Cursos intersemestrales de 2049', extraordinarioPor: req.user.userId });
    expect(await estados(qr)).toMatchObject({ '2049-2': 'en_curso', '2049-INT': 'en_curso+extra' });
    expect((await qr.query(`SELECT estado FROM academic_work_plan."PlanTrabajoAcademico" WHERE id = $1`, [pta.id]))[0].estado).toBe('Borrador');
    // Uno a la vez.
    await expect(c.activarExtraordinario(otro.id, { motivo: 'Otro extraordinario a la vez' }, req)).rejects.toThrow(/Ya hay un periodo extraordinario/);
    // «El activo» es el principal: va primero en la lista aunque el extraordinario sea más reciente.
    const lista = await c.list();
    expect(lista.find((p) => p.estado === 'en_curso')?.codigo).toBe('2049-2');
  });

  caso('activar un nuevo principal cierra el anterior y termina sus PTA, pero no toca el extraordinario ni los suyos', async (qr) => {
    // ⚠️ EFDS-2328, pendiente de decisión de Nicolás: en esta base la regla que termina
    // los PTA al activar FALLA (SolicitudPTA."ptaId" es uuid y el id del PTA, texto), así
    // que hoy activar no termina ningún PTA. Esta prueba NO depende de corregirla: dentro
    // de su transacción (que se revierte) iguala el tipo de la columna, como en una base
    // donde la regla corre, para probar la exclusión del extraordinario (EFDS-2346).
    await qr.query(`ALTER TABLE academic_work_plan."SolicitudPTA" ALTER COLUMN "ptaId" TYPE text USING "ptaId"::text`);
    const c = controlador(qr, [PERMISO_ACTIVAR_EXTRAORDINARIO]);
    const inter = await c.create({ tipo: 'personalizado', anio: 2049, codigo: '2049-INT', nombre: 'Interperiodo 2049', fechaInicio: '2049-12-14', fechaFin: '2050-01-25' });
    await c.activarExtraordinario(inter.id, { motivo: 'Cursos intersemestrales de 2049' }, req);
    const docente = (await qr.query(`SELECT id FROM academic_work_plan."Docente" LIMIT 1`))[0].id;
    const pta = async (periodo: string) => (await qr.query(
      `INSERT INTO academic_work_plan."PlanTrabajoAcademico" ("docenteId", periodo, estado, "updatedAt") VALUES ($1, $2, 'Borrador', NOW()) RETURNING id`,
      [docente, periodo]))[0].id;
    const ptaPrincipal = await pta('2049-2');
    const ptaInter = await pta('2049-INT');

    const nuevo = await c.create({ anio: 2050, semestre: 1, fechaInicio: '2050-02-01', fechaFin: '2050-06-15' });
    await c.update(nuevo.id, { estado: 'en_curso' });
    expect(await estados(qr)).toEqual({ '2049-2': 'cerrado', '2049-INT': 'en_curso+extra', '2050-1': 'en_curso' });
    const estadoPta = async (id: string) => (await qr.query(`SELECT estado FROM academic_work_plan."PlanTrabajoAcademico" WHERE id = $1`, [id]))[0].estado;
    expect(await estadoPta(ptaPrincipal)).toBe('Terminado');
    expect(await estadoPta(ptaInter)).toBe('Borrador');

    // El extraordinario se cierra por la edición normal, sin exigir otro activo; el principal no.
    await expect(c.update(nuevo.id, { estado: 'cerrado' })).rejects.toThrow(/exactamente un periodo activo/);
    await expect(c.update(inter.id, { estado: 'en_curso' })).rejects.toBeInstanceOf(ConflictException);
    expect(await c.update(inter.id, { estado: 'cerrado' })).toMatchObject({ estado: 'cerrado' });
  });

  caso('la base no admite dos principales ni dos extraordinarios en curso', async (qr) => {
    // Cada rechazo esperado va en su savepoint: un error aborta la transacción.
    const rechaza = async (sql: string, patron: RegExp) => {
      await qr.query('SAVEPOINT rechazo');
      await expect(qr.query(sql)).rejects.toThrow(patron);
      await qr.query('ROLLBACK TO SAVEPOINT rechazo');
    };
    await rechaza(
      `INSERT INTO academic_work_plan.periodo_academico (codigo, anio, semestre, fecha_inicio, fecha_fin, estado)
       VALUES ('2050-1', 2050, 1, '2050-02-01', '2050-06-15', 'en_curso')`, /uq_periodo_principal_en_curso/);
    await qr.query(
      `INSERT INTO academic_work_plan.periodo_academico (codigo, anio, semestre, tipo, nombre, fecha_inicio, fecha_fin, estado, extraordinario, motivo_extraordinario)
       VALUES ('2049-INT', 2049, NULL, 'personalizado', 'Inter', '2049-12-14', '2050-01-25', 'en_curso', TRUE, 'Cursos intersemestrales')`);
    await rechaza(
      `INSERT INTO academic_work_plan.periodo_academico (codigo, anio, semestre, tipo, nombre, fecha_inicio, fecha_fin, estado, extraordinario, motivo_extraordinario)
       VALUES ('2050-VAC', 2050, NULL, 'personalizado', 'Vac', '2050-07-01', '2050-07-20', 'en_curso', TRUE, 'Otro a la vez')`,
      /uq_periodo_extraordinario_en_curso/);
    // Un personalizado sin nombre, o un semestral sin semestre, tampoco.
    await rechaza(
      `INSERT INTO academic_work_plan.periodo_academico (codigo, anio, semestre, tipo, fecha_inicio, fecha_fin)
       VALUES ('2050-SIN', 2050, NULL, 'personalizado', '2050-08-01', '2050-08-20')`, /chk_periodo_tipo_semestre/);
  });
});
