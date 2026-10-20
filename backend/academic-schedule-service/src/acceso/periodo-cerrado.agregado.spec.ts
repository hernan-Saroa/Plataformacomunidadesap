import { ConflictException, ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { Client } from 'pg';

import { AlcanceService } from './alcance.service.js';
import { CLAVE_ESCRITURA, type ReglaEscritura } from './escritura.decorator.js';
import { EscrituraGuard } from './escritura.guard.js';
import { readdirSync } from 'fs';
import { join } from 'path';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { crearAsignatura } = require('../../test/catalogo-qa.cjs');

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
/**
 * TODOS los controladores del servicio, descubiertos recorriendo src/: una
 * lista escrita a mano dejaba fuera al controlador nuevo (pasó con el de la
 * concertación). Un controlador que nadie registra aquí también se revisa.
 */
function descubrirControladores(): Function[] {
  const encontrados: Function[] = [];
  const recorrer = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const ruta = join(dir, e.name);
      if (e.isDirectory()) recorrer(ruta);
      else if (e.name.endsWith('.controller.ts')) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const mod = require(ruta);
        for (const exp of Object.values(mod)) {
          if (typeof exp === 'function' && Reflect.getMetadata(PATH_METADATA, exp) !== undefined) encontrados.push(exp);
        }
      }
    }
  };
  recorrer(join(__dirname, '..'));
  return encontrados;
}
const CONTROLADORES = descubrirControladores();

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
    expect(CONTROLADORES.map((c) => c.name)).toEqual(expect.arrayContaining(['ConcertacionController', 'PeriodosController', 'JefaturaController']));
    expect(rutas.length).toBeGreaterThanOrEqual(26);
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
  const ids = { periodo: '', grupo: '', franja: '', asignatura: '', concertacion: '' };

  beforeAll(async () => {
    try {
      client = new Client(conexion);
      await client.connect();
      // Todo el fixture vive en UNA transacción que se revierte al final: ninguna otra
      // conexión (otras pruebas en paralelo, como el canario de cruces) lo ve.
      await client.query('BEGIN');
      ids.asignatura = (await crearAsignatura(client)).idAsignatura; // propia de la transacción
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
      // EFDS-2315: una concertación del periodo cerrado, para anclar sus rutas.
      const c = await client.query(
        `INSERT INTO "${S}".concertacion_docencia (id_docente, periodo_ref, nivel, estado, huella)
         VALUES ((SELECT id_person FROM auth.personas ORDER BY id_person LIMIT 1), $1, 'pregrado', 'ENVIADA', repeat('0', 64))
         RETURNING id_concertacion`, [ids.periodo]);
      ids.concertacion = c.rows[0].id_concertacion;
      hayBase = true;
    } catch (e) {
      // Solo la FALTA DE BASE se omite; un fixture que falla se grita (antes la prueba se saltaba en silencio).
      const conectado = !!(client as any)?._connected;
      if (client) { await client.query('ROLLBACK').catch(() => {}); await client.end().catch(() => {}); }
      client = null; hayBase = false;
      if (conectado) throw e;
    }
  });

  // Cada caso en su savepoint: un error SQL esperado no deja la transacción inservible.
  beforeEach(async () => { if (client) await client.query('SAVEPOINT caso').catch(() => {}); });
  afterEach(async () => {
    if (!client) return;
    await client.query('RELEASE SAVEPOINT caso').catch(() => client!.query('ROLLBACK TO SAVEPOINT caso').catch(() => {}));
  });

  afterAll(async () => {
    // Se revierte todo lo que creó la prueba (antes: COMMIT y DELETE al final).
    if (client) await client.query('ROLLBACK').catch(() => {});
    if (client) await client.end().catch(() => {});
  });

  /** Arma el request de una ruta poniendo en cada fuente el id del recurso de prueba. */
  const requestPara = (regla: ReglaEscritura) => {
    const req: any = { method: 'POST', params: {}, body: {} };
    for (const [tipo, fuente] of Object.entries(regla.anclas ?? {})) {
      const valor = (ids as any)[tipo];
      if ('param' in fuente!) req.params[fuente.param] = valor;
      else if ('body' in fuente!) req.body[fuente.body] = valor;
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
