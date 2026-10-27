import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Client } from 'pg';

import { AlcanceService } from './alcance.service.js';
import { EscrituraGuard } from './escritura.guard.js';
import { NivelesRequestService } from './niveles-request.service.js';
import { AsignacionesController } from '../asignaciones/asignaciones.controller.js';
import { GruposController } from '../grupos/grupos.controller.js';
import { HorariosController } from '../horarios/horarios.controller.js';
import { HorariosService } from '../horarios/horarios.service.js';
import { ProgramacionPermissionsService } from '../auth/programacion-permissions.service.js';
import { nivelesAsignables, nivelesProgramables, nivelesVisibles } from '../auth/programacion-permissions.js';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { crearAsignatura } = require('../../test/catalogo-qa.cjs');

/**
 * EFDS-2342 :: el rol de asignación docente, con la segregación por nivel en el servidor.
 *
 * Con los roles REALES de la base (migración 060), no con permisos inventados:
 *   · PROGRAMADOR_DOCENTE_PREGRADO ve y asigna pregrado; no ve ni asigna posgrado;
 *   · asignar NO es programar: no crea ni cambia grupos;
 *   · programar NO es asignar: el programador ya no asigna docentes;
 *   · el panel del docente (situación, tope) no lo ve cualquier token.
 */
const conexion = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 55432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'esap_db',
};
const S = 'academic-schedule';

describe('EFDS-2342 :: rol de asignación docente por nivel (agregado real)', () => {
  let client: Client | null = null;
  let hayBase = false;
  const ids = { periodo: '', grupoPre: '', grupoPos: '', franjaPre: '', franjaPos: '' };

  const ds = () => ({ query: (sql: string, params?: any[]) => client!.query(sql, params).then((r) => r.rows) }) as any;
  const permisosReales = () => new ProgramacionPermissionsService(ds());
  const permisosDe = (rol: string) => permisosReales().resolveForRoles([rol]);
  const reqDe = (rol: string, extra: any = {}) =>
    ({ headers: { 'x-user-roles': rol }, params: {}, query: {}, body: {}, method: 'GET', ...extra }) as any;
  const ctx = (handler: Function, req: any) => ({
    getHandler: () => handler,
    getClass: () => Object,
    switchToHttp: () => ({ getRequest: () => req }),
  }) as unknown as ExecutionContext;
  const guard = () => new EscrituraGuard(new Reflector(), new AlcanceService(ds()), permisosReales());
  const asignar = (AsignacionesController.prototype as any).asignar;
  const retirar = (AsignacionesController.prototype as any).retirar;

  beforeAll(async () => {
    try {
      client = new Client(conexion);
      await client.connect();
      await client.query('BEGIN');
      const pre = (await crearAsignatura(client, { tipo: 'pregrado' })).idAsignatura;
      const pos = (await crearAsignatura(client, { tipo: 'especializacion' })).idAsignatura;
      ids.periodo = (await client.query(
        `INSERT INTO "${S}".periodo_programacion (codigo,nombre,tipo,fecha_inicio,fecha_fin,estado)
         VALUES ($1,'Periodo QA EFDS-2342','periodo_regular','2029-08-01','2029-11-30','activo') RETURNING id_periodo`,
        [`QA-2342-${Date.now().toString().slice(-7)}`])).rows[0].id_periodo;
      const grupo = async (idAsig: string, num: number) => (await client!.query(
        `INSERT INTO "${S}".grupo (id_asignatura,id_periodo,numero_grupo,estado)
         VALUES ($1,$2,$3,'PROGRAMADO') RETURNING id_grupo`, [idAsig, ids.periodo, num])).rows[0].id_grupo;
      const franja = async (idGrupo: string, hora: string) => (await client!.query(
        `INSERT INTO "${S}".franja_horaria (id_grupo, dia_semana, hora_inicio, hora_fin, tipo_sesion, estado)
         VALUES ($1,'DOMINGO',$2::time,($2::time + interval '1 hour'),'mediada_tecnologia','PROGRAMADO')
         RETURNING id_franja`, [idGrupo, hora])).rows[0].id_franja;
      ids.grupoPre = await grupo(pre, 941);
      ids.grupoPos = await grupo(pos, 942);
      ids.franjaPre = await franja(ids.grupoPre, '06:00');
      ids.franjaPos = await franja(ids.grupoPos, '08:00');
      hayBase = true;
    } catch (e) {
      // Solo la FALTA DE BASE se omite; un fixture que falla se grita.
      const conectado = !!(client as any)?._connected;
      if (client) { await client.query('ROLLBACK').catch(() => {}); await client.end().catch(() => {}); }
      client = null; hayBase = false;
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

  caso('los roles de la base resuelven: el asignador asigna y ve su nivel, sin programar', async () => {
    const pre = await permisosDe('PROGRAMADOR_DOCENTE_PREGRADO');
    expect(nivelesAsignables(pre)).toEqual(['pregrado']);
    expect(nivelesVisibles(pre)).toEqual(['pregrado']);
    expect(nivelesProgramables(pre)).toEqual([]);
    const pos = await permisosDe('PROGRAMADOR_DOCENTE_POSGRADO');
    expect(nivelesAsignables(pos)).toEqual(['posgrado']);
    expect(nivelesProgramables(pos)).toEqual([]);
    // Y el programador de siempre programa, pero ya no asigna.
    const prog = await permisosDe('PROGRAMADOR_PREGRADO');
    expect(nivelesProgramables(prog)).toEqual(['pregrado']);
    expect(nivelesAsignables(prog)).toEqual([]);
  });

  caso('el asignador de pregrado asigna y retira en pregrado; en posgrado, 403', async () => {
    const rol = 'PROGRAMADOR_DOCENTE_PREGRADO';
    await expect(guard().canActivate(ctx(asignar, reqDe(rol, { method: 'POST', body: { idGrupo: ids.grupoPre } })))).resolves.toBe(true);
    await expect(guard().canActivate(ctx(retirar, reqDe(rol, { method: 'DELETE', params: { idGrupo: ids.grupoPre } })))).resolves.toBe(true);
    await expect(guard().canActivate(ctx(asignar, reqDe(rol, { method: 'POST', body: { idGrupo: ids.grupoPos } }))))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  caso('asignar no es programar: el asignador no cambia grupos, pero sí los lee', async () => {
    const rol = 'PROGRAMADOR_DOCENTE_PREGRADO';
    const proto = GruposController.prototype as any;
    await expect(guard().canActivate(ctx(proto.actualizar, reqDe(rol, { method: 'PATCH', params: { id: ids.grupoPre } }))))
      .rejects.toThrow(/programación sobre ningún nivel/);
    await expect(guard().canActivate(ctx(proto.obtener, reqDe(rol, { params: { id: ids.grupoPre } })))).resolves.toBe(true);
    await expect(guard().canActivate(ctx(proto.obtener, reqDe(rol, { params: { id: ids.grupoPos } }))))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  caso('programar no es asignar: el programador de pregrado ya no asigna docentes', async () => {
    await expect(guard().canActivate(ctx(asignar, reqDe('PROGRAMADOR_PREGRADO', { method: 'POST', body: { idGrupo: ids.grupoPre } }))))
      .rejects.toThrow(/asignar docentes/);
  });

  caso('Programación General: el asignador de posgrado solo ve posgrado', async () => {
    const ctrl = new HorariosController(
      new HorariosService({ query: ds().query } as any, {} as any), new NivelesRequestService(permisosReales()));
    const vistas = (await ctrl.listar(reqDe('PROGRAMADOR_DOCENTE_POSGRADO'), undefined, ids.periodo)).data.map((f: any) => f.idFranja);
    expect(vistas).toEqual([ids.franjaPos]);
  });

  caso('el panel del docente (situación, tope) no lo ve un DOCENTE: 403', async () => {
    const ctrl = new AsignacionesController({} as any, {} as any, permisosReales());
    await expect(ctrl.consultarDocente(reqDe('DOCENTE'), '1020304053')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(ctrl.acumuladoDocente(reqDe('DOCENTE'), '1020304053')).rejects.toBeInstanceOf(ForbiddenException);
  });
});
