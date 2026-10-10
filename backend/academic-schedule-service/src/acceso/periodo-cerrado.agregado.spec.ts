import { ConflictException, ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { Client } from 'pg';

import { AlcanceService } from './alcance.service.js';
import { CLAVE_ESCRITURA, type ReglaEscritura } from './escritura.decorator.js';
import { EscrituraGuard } from './escritura.guard.js';
import { AsignacionesController } from '../asignaciones/asignaciones.controller.js';
import { AulasController } from '../aulas/aulas.controller.js';
import { GruposController } from '../grupos/grupos.controller.js';
import { HorariosController } from '../horarios/horarios.controller.js';
import { JefaturaController } from '../jefatura/jefatura.controller.js';
import { OfertasController } from '../ofertas/ofertas.controller.js';
import { PortalDocenteController } from '../portal-docente/portal-docente.controller.js';
import { PublicacionController } from '../publicacion/publicacion.controller.js';
import { CatalogoController } from '../catalogo/catalogo.controller.js';
import { ValidacionController } from '../validacion/validacion.controller.js';

/**
 * EFDS-2301 :: un periodo cerrado no admite escrituras.
 *
 * Dos canarios:
 *   1. ESTRUCTURAL — toda ruta de escritura de todos los controladores declara
 *      de qué periodo cuelga (o por qué no cuelga de ninguno). Una ruta nueva
 *      que lo olvide rompe esta prueba, no el cierre en producción.
 *   2. AGREGADO sobre la base real — con un periodo cerrado, TODA ruta anclada
 *      a él (grupo, franja, ciclo, asignación, aula del grupo, aprobación,
 *      portal, publicación) se rechaza con 409.
 */
const CONTROLADORES = [
  AsignacionesController, AulasController, GruposController, HorariosController,
  JefaturaController, OfertasController, PortalDocenteController, PublicacionController,
  CatalogoController, ValidacionController,
];

/** RequestMethod de Nest: POST=1, PUT=2, DELETE=3, PATCH=4. */
const ESCRITURA = new Set([1, 2, 3, 4]);

interface RutaEscritura { nombre: string; handler: Function; regla: ReglaEscritura | undefined }

function rutasDeEscritura(): RutaEscritura[] {
  const rutas: RutaEscritura[] = [];
  for (const C of CONTROLADORES) {
    for (const k of Object.getOwnPropertyNames(C.prototype)) {
      const handler = (C.prototype as any)[k];
      if (typeof handler !== 'function' || k === 'constructor') continue;
      const metodo = Reflect.getMetadata(METHOD_METADATA, handler);
      if (metodo === undefined || !ESCRITURA.has(metodo)) continue;
      rutas.push({
        nombre: `${C.name}.${k} (${Reflect.getMetadata(PATH_METADATA, handler)})`,
        handler,
        regla: Reflect.getMetadata(CLAVE_ESCRITURA, handler),
      });
    }
  }
  return rutas;
}

describe('EFDS-2301 :: toda escritura declara su periodo (estructural)', () => {
  it('ninguna ruta de escritura queda sin regla', () => {
    const rutas = rutasDeEscritura();
    expect(rutas.length).toBeGreaterThanOrEqual(22);
    const sinRegla = rutas.filter((r) => !r.regla).map((r) => r.nombre);
    expect(sinRegla).toEqual([]);
  });

  it('las que no cuelgan de un periodo dicen por qué', () => {
    const sinMotivo = rutasDeEscritura()
      .filter((r) => r.regla && !r.regla.anclas && !r.regla.motivo?.trim())
      .map((r) => r.nombre);
    expect(sinMotivo).toEqual([]);
  });

  it('una escritura sin regla se rechaza (fail-closed)', async () => {
    const guard = new EscrituraGuard(new Reflector(), {} as any, {} as any);
    const ctx = contexto(function sinRegla() {}, { method: 'POST', params: {}, body: {} });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(ForbiddenException);
  });
});

function contexto(handler: Function, req: any): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => Object,
    switchToHttp: () => ({ getRequest: () => ({ headers: {}, ...req }) }),
  } as unknown as ExecutionContext;
}

const conexion = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 55432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'esap_db',
};
const S = 'academic-schedule';

describe('EFDS-2301 :: con el periodo cerrado, toda escritura se rechaza (agregado real)', () => {
  let client: Client | null = null;
  let hayBase = false;
  const ids = { periodo: '', grupo: '', franja: '', asignatura: '' };

  beforeAll(async () => {
    try {
      client = new Client(conexion);
      await client.connect();
      const a = await client.query(`SELECT id FROM academic_work_plan.asignatura ORDER BY id LIMIT 1`);
      ids.asignatura = String(a.rows[0].id);
      const cod = `QA-2301-${Date.now().toString().slice(-7)}`;
      const p = await client.query(
        `INSERT INTO "${S}".periodo_programacion (codigo,nombre,tipo,fecha_inicio,fecha_fin,estado)
         VALUES ($1,'Periodo QA EFDS-2301','periodo_regular','2029-02-01','2029-06-15','cerrado') RETURNING id_periodo`, [cod]);
      ids.periodo = p.rows[0].id_periodo;
      const g = await client.query(
        `INSERT INTO "${S}".grupo (id_asignatura,id_periodo,numero_grupo,estado)
         VALUES ($1,$2,923,'PROGRAMADO') RETURNING id_grupo`, [ids.asignatura, ids.periodo]);
      ids.grupo = g.rows[0].id_grupo;
      const f = await client.query(
        `INSERT INTO "${S}".franja_horaria (id_grupo, dia_semana, hora_inicio, hora_fin, tipo_sesion, estado)
         VALUES ($1,'DOMINGO','06:00'::time,'07:00'::time,'mediada_tecnologia','APROBADA') RETURNING id_franja`, [ids.grupo]);
      ids.franja = f.rows[0].id_franja;
      hayBase = true;
    } catch {
      hayBase = false;
    }
  });

  afterAll(async () => {
    if (client && ids.periodo) {
      await client.query(`DELETE FROM "${S}".franja_horaria WHERE id_grupo=$1`, [ids.grupo]).catch(() => {});
      await client.query(`DELETE FROM "${S}".grupo WHERE id_periodo=$1`, [ids.periodo]).catch(() => {});
      await client.query(`DELETE FROM "${S}".periodo_programacion WHERE id_periodo=$1`, [ids.periodo]).catch(() => {});
    }
    if (client) await client.end().catch(() => {});
  });

  /** Arma el request de una ruta poniendo en cada fuente el id del recurso de prueba. */
  const requestPara = (regla: ReglaEscritura) => {
    const req: any = { method: 'POST', params: {}, body: {} };
    for (const [tipo, fuente] of Object.entries(regla.anclas ?? {})) {
      const valor = (ids as any)[tipo];
      if ('param' in fuente!) req.params[fuente.param] = valor;
      else req.body[fuente!.body] = valor;
    }
    return req;
  };

  it('cada ruta anclada a un periodo responde 409 si está cerrado', async () => {
    if (!hayBase || !client) { console.warn('  (sin base: omitido)'); return; }
    const alcance = new AlcanceService({
      query: (sql: string, params?: any[]) => client!.query(sql, params).then((r) => r.rows),
    } as any);
    // Administrador: el nivel no es lo que se prueba aquí, el cierre sí.
    const permisos = { resolveForRoles: async () => new Set(['programacion-academica.all']) };
    const guard = new EscrituraGuard(new Reflector(), alcance, permisos as any);

    const ancladas = rutasDeEscritura().filter((r) => r.regla?.anclas);
    expect(ancladas.length).toBeGreaterThanOrEqual(18);

    const noRechazadas: string[] = [];
    for (const r of ancladas) {
      try {
        await guard.canActivate(contexto(r.handler, requestPara(r.regla!)));
        noRechazadas.push(`${r.nombre}: pasó`);
      } catch (e) {
        if (!(e instanceof ConflictException)) noRechazadas.push(`${r.nombre}: ${(e as Error).message}`);
      }
    }
    expect(noRechazadas).toEqual([]);
  });

  it('el mismo grupo en un periodo abierto sí admite la escritura', async () => {
    if (!hayBase || !client) { console.warn('  (sin base: omitido)'); return; }
    await client.query(`UPDATE "${S}".periodo_programacion SET estado='activo' WHERE id_periodo=$1`, [ids.periodo]);
    try {
      const alcance = new AlcanceService({
        query: (sql: string, params?: any[]) => client!.query(sql, params).then((r) => r.rows),
      } as any);
      const guard = new EscrituraGuard(
        new Reflector(), alcance, { resolveForRoles: async () => new Set(['programacion-academica.all']) } as any);
      const ciclo = rutasDeEscritura().find((r) => r.nombre.startsWith('HorariosController.periodo'))!;
      await expect(guard.canActivate(contexto(ciclo.handler, requestPara(ciclo.regla!)))).resolves.toBe(true);
    } finally {
      await client.query(`UPDATE "${S}".periodo_programacion SET estado='cerrado' WHERE id_periodo=$1`, [ids.periodo]);
    }
  });
});
