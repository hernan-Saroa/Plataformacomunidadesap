import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Client } from 'pg';

import { AlcanceService } from './alcance.service.js';
import { EscrituraGuard } from './escritura.guard.js';
import { NivelesRequestService } from './niveles-request.service.js';
import { GruposController } from '../grupos/grupos.controller.js';
import { HorariosController } from '../horarios/horarios.controller.js';
import { HorariosService } from '../horarios/horarios.service.js';
import { PublicacionController } from '../publicacion/publicacion.controller.js';
import { PublicacionService } from '../publicacion/publicacion.service.js';

/**
 * EFDS-2302 (RN-08 en lectura y escritura) y EFDS-2303 (publica el programador).
 *
 * Canario AGREGADO sobre la base real, con un periodo de prueba que tiene un
 * grupo de PREGRADO y otro de POSGRADO, cada uno con una franja PROGRAMADO:
 *   · Programación General, conteos y pendientes devuelven solo el nivel propio;
 *   · leer o escribir un grupo del otro nivel da 403;
 *   · el programador de pregrado publica, y solo publica pregrado;
 *   · sin el permiso de publicar, 403.
 */
const conexion = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 55432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'esap_db',
};
const S = 'academic-schedule';

const PREGRADO = new Set(['programacion-academica.catalogo.pregrado', 'programacion-academica.publicar']);
const POSGRADO = new Set(['programacion-academica.catalogo.posgrado', 'programacion-academica.publicar']);

describe('EFDS-2302 / EFDS-2303 :: cada programador ve y publica solo su nivel (agregado real)', () => {
  let client: Client | null = null;
  let hayBase = false;
  const ids = { periodo: '', grupoPre: '', grupoPos: '', franjaPre: '', franjaPos: '' };

  const ds = () => ({ query: (sql: string, params?: any[]) => client!.query(sql, params).then((r) => r.rows) }) as any;
  const permisosCon = (set: Set<string>) => ({ resolveForRoles: async () => set }) as any;
  const reqCon = (extra: any = {}) => ({ headers: {}, params: {}, query: {}, body: {}, method: 'GET', ...extra }) as any;
  const ctx = (handler: Function, req: any) => ({
    getHandler: () => handler,
    getClass: () => Object,
    switchToHttp: () => ({ getRequest: () => req }),
  }) as unknown as ExecutionContext;

  beforeAll(async () => {
    try {
      client = new Client(conexion);
      await client.connect();
      const pre = await client.query(
        `SELECT a.id FROM academic_work_plan.asignatura a JOIN academic_work_plan.programa pr ON pr.id=a.id_programa
          WHERE pr.tipo='pregrado' ORDER BY a.id LIMIT 1`);
      const pos = await client.query(
        `SELECT a.id FROM academic_work_plan.asignatura a JOIN academic_work_plan.programa pr ON pr.id=a.id_programa
          WHERE pr.tipo IN ('especializacion','maestria','doctorado') ORDER BY a.id LIMIT 1`);
      const p = await client.query(
        `INSERT INTO "${S}".periodo_programacion (codigo,nombre,tipo,fecha_inicio,fecha_fin,estado)
         VALUES ($1,'Periodo QA EFDS-2302','periodo_regular','2029-08-01','2029-11-30','activo') RETURNING id_periodo`,
        [`QA-2302-${Date.now().toString().slice(-7)}`]);
      ids.periodo = p.rows[0].id_periodo;
      const grupo = async (idAsig: string, num: number) => (await client!.query(
        `INSERT INTO "${S}".grupo (id_asignatura,id_periodo,numero_grupo,estado)
         VALUES ($1,$2,$3,'PROGRAMADO') RETURNING id_grupo`, [idAsig, ids.periodo, num])).rows[0].id_grupo;
      const franja = async (idGrupo: string, hora: string) => (await client!.query(
        `INSERT INTO "${S}".franja_horaria (id_grupo, dia_semana, hora_inicio, hora_fin, tipo_sesion, estado)
         VALUES ($1,'DOMINGO',$2::time,($2::time + interval '1 hour'),'mediada_tecnologia','PROGRAMADO')
         RETURNING id_franja`, [idGrupo, hora])).rows[0].id_franja;
      ids.grupoPre = await grupo(pre.rows[0].id, 931);
      ids.grupoPos = await grupo(pos.rows[0].id, 932);
      ids.franjaPre = await franja(ids.grupoPre, '06:00');
      ids.franjaPos = await franja(ids.grupoPos, '08:00');
      hayBase = true;
    } catch {
      hayBase = false;
    }
  });

  afterAll(async () => {
    if (client && ids.periodo) {
      await client.query(`DELETE FROM "${S}".franja_horaria WHERE id_grupo IN ($1,$2)`, [ids.grupoPre, ids.grupoPos]).catch(() => {});
      await client.query(`DELETE FROM "${S}".grupo WHERE id_periodo=$1`, [ids.periodo]).catch(() => {});
      await client.query(`DELETE FROM "${S}".periodo_programacion WHERE id_periodo=$1`, [ids.periodo]).catch(() => {});
    }
    if (client) await client.end().catch(() => {});
  });

  const siHayBase = (nombre: string, fn: () => Promise<void>) =>
    it(nombre, async () => {
      if (!hayBase || !client) { console.warn('  (sin base: omitido)'); return; }
      await fn();
    });

  const horarios = (permisos: Set<string>) => new HorariosController(
    new HorariosService({ query: ds().query } as any, {} as any),
    new NivelesRequestService(permisosCon(permisos)),
  );

  siHayBase('Programación General: posgrado no ve pregrado, ni al revés', async () => {
    const pos = (await horarios(POSGRADO).listar(reqCon(), undefined, ids.periodo)).data.map((f: any) => f.idFranja);
    const pre = (await horarios(PREGRADO).listar(reqCon(), undefined, ids.periodo)).data.map((f: any) => f.idFranja);
    expect(pos).toEqual([ids.franjaPos]);
    expect(pre).toEqual([ids.franjaPre]);
  });

  siHayBase('sin ningún nivel, la lista general responde 403', async () => {
    await expect(horarios(new Set()).listar(reqCon(), undefined, ids.periodo)).rejects.toBeInstanceOf(ForbiddenException);
  });

  siHayBase('conteos y pendientes de cierre: solo el nivel propio', async () => {
    const pub = (permisos: Set<string>) => new PublicacionController(
      new PublicacionService(ds()), permisosCon(permisos), new NivelesRequestService(permisosCon(permisos)));
    const est = (await pub(POSGRADO).estado(reqCon(), ids.periodo)).data;
    expect(est.total).toBe(1);
    const pend = (await pub(POSGRADO).pendientesCierre(reqCon(), ids.periodo)).data.map((f: any) => f.idFranja);
    expect(pend).toEqual([ids.franjaPos]);
  });

  siHayBase('leer o escribir un grupo del otro nivel da 403', async () => {
    const guard = new EscrituraGuard(new Reflector(), new AlcanceService(ds()), permisosCon(POSGRADO));
    const proto = GruposController.prototype as any;
    await expect(guard.canActivate(ctx(proto.obtener, reqCon({ params: { id: ids.grupoPre } }))))
      .rejects.toBeInstanceOf(ForbiddenException);
    await expect(guard.canActivate(ctx(proto.actualizar, reqCon({ method: 'PATCH', params: { id: ids.grupoPre } }))))
      .rejects.toBeInstanceOf(ForbiddenException);
    await expect(guard.canActivate(ctx((HorariosController.prototype as any).listar,
      reqCon({ query: { grupo: ids.grupoPre } })))).rejects.toBeInstanceOf(ForbiddenException);
    // Su propio nivel sí.
    await expect(guard.canActivate(ctx(proto.obtener, reqCon({ params: { id: ids.grupoPos } })))).resolves.toBe(true);
  });

  siHayBase('el programador de pregrado publica, y solo publica pregrado', async () => {
    const ctrl = new PublicacionController(
      new PublicacionService(ds()), permisosCon(PREGRADO), new NivelesRequestService(permisosCon(PREGRADO)));
    await ctrl.publicar(reqCon({ method: 'POST' }), ids.periodo);
    const r = await client!.query(
      `SELECT id_franja, estado FROM "${S}".franja_horaria WHERE id_franja IN ($1,$2)`, [ids.franjaPre, ids.franjaPos]);
    const estado = Object.fromEntries(r.rows.map((x: any) => [x.id_franja, x.estado]));
    expect(estado[ids.franjaPre]).toBe('PUBLICADA');
    expect(estado[ids.franjaPos]).toBe('PROGRAMADO');
  });

  siHayBase('sin el permiso de publicar, 403', async () => {
    const soloCatalogo = new Set(['programacion-academica.catalogo.posgrado']);
    const ctrl = new PublicacionController(
      new PublicacionService(ds()), permisosCon(soloCatalogo), new NivelesRequestService(permisosCon(soloCatalogo)));
    await expect(ctrl.publicar(reqCon({ method: 'POST' }), ids.periodo)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
