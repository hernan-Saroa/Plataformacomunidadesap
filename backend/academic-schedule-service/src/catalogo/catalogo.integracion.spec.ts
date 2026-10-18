import { DataSource } from 'typeorm';
import { Client } from 'pg';

import { ProgramaCatalogoEntity } from './entities/programa.readonly.entity.js';
import { AsignaturaCatalogoEntity } from './entities/asignatura.readonly.entity.js';
import { UbicacionSemestralCatalogoEntity } from './entities/ubicacion-semestral.readonly.entity.js';
import { CatalogoService } from './catalogo.service.js';
import { PERMISO_CATALOGO_POR_NIVEL } from '../auth/programacion-permissions.js';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { crearAsignatura, crearPeriodo, crearOferta, retirarPrograma } = require('../../test/catalogo-qa.cjs');

/**
 * Prueba de INTEGRACIÓN contra base real — sin mocks.
 *
 * Existe por una lección concreta: los 6 tests unitarios de EFDS-1368 pasaban en
 * verde mientras la entidad apuntaba a `academic_work_plan."Asignatura"`, una
 * tabla que la migración 326 había eliminado. Mockear el repositorio oculta
 * justamente los errores de mapeo (nombre de tabla, de columna, tipo de dato),
 * que son los que rompen en producción.
 *
 * Se salta sola si no hay base disponible, para no romper CI en entornos sin
 * Postgres. Cuando hay base, valida el mapeo real de las tres entidades.
 *
 * El catálogo que se lee es de la prueba: se SIEMBRA y se retira (códigos `QA-*`). Lee por otra
 * conexión que la del sembrado, así que sí se confirma; no depende de que alguien haya cargado el
 * Excel, y la base local puede estar en cero.
 */
const CONFIG = {
  type: 'postgres' as const,
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'esap_secure_password_2024',
  database: process.env.DB_NAME || 'esap_db',
  entities: [ProgramaCatalogoEntity, AsignaturaCatalogoEntity, UbicacionSemestralCatalogoEntity],
  synchronize: false,
  logging: false,
};

describe('EFDS-1368 :: integración contra base real', () => {
  let ds: DataSource | null = null;
  let service: CatalogoService;
  let disponible = false;
  let pg: Client | null = null;
  const sembrados: Array<{ idPrograma: string; idNucleo: string }> = [];
  let pre: { idPrograma: string; codigoAsignatura: string }; let pos: { idPrograma: string };
  // Tres periodos de plataforma: uno con oferta de pregrado, uno SIN carga, uno con oferta solo de posgrado.
  let conPregrado: string; let sinCarga: string; let conPosgrado: string; let ofertaPre: string;

  beforeAll(async () => {
    try {
      ds = await new DataSource(CONFIG).initialize();
      pg = new Client({
        host: CONFIG.host, port: Number(process.env.DB_PORT || 55432), user: CONFIG.username,
        password: process.env.DB_PASS || process.env.DB_PASSWORD || 'postgres', database: CONFIG.database,
      });
      await pg.connect();
      // Pregrado con dos semestres (horas 48 con 4 créditos: NO son créditos x 16) y un posgrado.
      const a = await crearAsignatura(pg, { tipo: 'pregrado', semestre: 2, horasClase: 48 });
      await crearAsignatura(pg, { tipo: 'pregrado', semestre: 1, horasClase: 48, idPrograma: a.idPrograma, idNucleo: a.idNucleo, codigoPrograma: a.codigoPrograma });
      const b = await crearAsignatura(pg, { tipo: 'maestria', semestre: 1, horasClase: 48 });
      sembrados.push(a, b);
      pre = a; pos = b;
      conPregrado = (await crearPeriodo(pg, { codigo: '2094-1', anio: 2094, semestre: 1 })).idPeriodo;
      sinCarga = (await crearPeriodo(pg, { codigo: '2094-2', anio: 2094, semestre: 2 })).idPeriodo;
      conPosgrado = (await crearPeriodo(pg, { codigo: '2093-1', anio: 2093, semestre: 1 })).idPeriodo;
      ofertaPre = (await crearOferta(pg, { idPrograma: a.idPrograma, idPeriodo: conPregrado, codigoCetap: 'CET-0135' })).idOferta;
      await crearOferta(pg, { idPrograma: b.idPrograma, idPeriodo: conPosgrado, codigoCetap: 'CET-0288' });
      disponible = true;
      service = new CatalogoService(
        ds.getRepository(ProgramaCatalogoEntity),
        ds.getRepository(AsignaturaCatalogoEntity),
        ds.getRepository(UbicacionSemestralCatalogoEntity),
      );
    } catch (e) {
      // Sin base: los casos se marcan como omitidos, no como fallidos. Pero si SÍ hay conexión y lo que
      // falla es el sembrado, se grita: antes se saltaba en silencio y la prueba «pasaba» sin probar nada.
      disponible = false;
      if (pg) {
        for (const f of sembrados) await retirarPrograma(pg, f).catch(() => {});
        await pg.end().catch(() => {});
        pg = null;
        throw e;
      }
    }
  }, 30000);

  afterAll(async () => {
    if (pg) {
      for (const f of sembrados) await retirarPrograma(pg, f).catch(() => {});
      await pg.query(`DELETE FROM academic_work_plan.periodo_academico WHERE codigo IN ('2094-1','2094-2','2093-1')`).catch(() => {});
      await pg.end().catch(() => {});
    }
    if (ds?.isInitialized) await ds.destroy();
  });

  const siHayBase = (nombre: string, fn: () => Promise<void>) =>
    it(nombre, async () => {
      if (!disponible) {
        console.warn('Base no disponible: se omite la prueba de integración.');
        return;
      }
      await fn();
    }, 30000);

  // Este es el caso que habría detectado el defecto de EFDS-1642: si el nombre de
  // la tabla o de una columna no existe, la consulta revienta aquí.
  siHayBase('EFDS-1368 :: las entidades del catálogo mapean contra tablas que existen', async () => {
    const programas = await service.listarProgramas(new Set([
      PERMISO_CATALOGO_POR_NIVEL.pregrado,
      PERMISO_CATALOGO_POR_NIVEL.posgrado,
    ]));
    const propio = programas.find((p) => p.id === pre.idPrograma);
    expect(propio).toBeDefined();
    expect(propio).toHaveProperty('codigo');
    expect(propio).toHaveProperty('nivel');
    expect(programas.some((p) => p.id === pos.idPrograma)).toBe(true);
  });

  siHayBase('EFDS-1368 :: AC-02 :: el filtro por nivel devuelve solo programas de ese nivel', async () => {
    const pregrado = await service.listarProgramas(
      new Set([PERMISO_CATALOGO_POR_NIVEL.pregrado]),
    );
    expect(pregrado.some((p) => p.id === pre.idPrograma)).toBe(true);
    expect(pregrado.every((p) => p.nivel === 'pregrado')).toBe(true);
    expect(pregrado.some((p) => p.tipo === 'maestria')).toBe(false);
    expect(pregrado.some((p) => p.id === pos.idPrograma)).toBe(false);
  });

  siHayBase('EFDS-1368 :: AC-01 :: el catálogo real se agrupa por semestre y en orden', async () => {
    const programa = { id: pre.idPrograma };
    const { semestres } = await service.catalogoPorSemestre(
      new Set([PERMISO_CATALOGO_POR_NIVEL.pregrado]),
      programa.id,
    );

    expect(semestres).toHaveLength(2); // los dos semestres sembrados, aunque se sembró el 2 primero
    const ordenes = semestres.map((s) => s.orden);
    expect(ordenes).toEqual([...ordenes].sort((a, b) => a - b));
    expect(semestres.some((s) => s.asignaturas.length > 0)).toBe(true);
  });

  // Las horas vienen del SNIES y no se derivan: si alguien introduce una fórmula
  // créditos x 16, este caso lo detecta contra los datos reales.
  siHayBase('EFDS-1368 :: las horas se exponen tal como vienen del catálogo', async () => {
    const programa = { id: pre.idPrograma };
    const { semestres } = await service.catalogoPorSemestre(
      new Set([PERMISO_CATALOGO_POR_NIVEL.pregrado]),
      programa.id,
    );
    const conHoras = semestres
      .flatMap((s) => s.asignaturas)
      .filter((a) => a.horasClase !== null && a.horasClase !== undefined);

    expect(conHoras).toHaveLength(2);
    // En pregrado central conviven créditos distintos con las mismas horas de
    // clase, justamente porque NO se calcula como créditos x 16.
    const desviadas = conHoras.filter((a) => a.horasClase !== a.creditos * 16);
    expect(desviadas.length).toBeGreaterThan(0);
  });

  // ─── El catálogo es compartido; lo que depende del PERIODO es su oferta ───────────────────────────
  // Una asignatura aparece en un periodo si su programa tiene al menos una oferta CETAP activa en él.

  const AMBOS = () => new Set([PERMISO_CATALOGO_POR_NIVEL.pregrado, PERMISO_CATALOGO_POR_NIVEL.posgrado]);
  const SOLO_PREGRADO = () => new Set([PERMISO_CATALOGO_POR_NIVEL.pregrado]);
  const SOLO_POSGRADO = () => new Set([PERMISO_CATALOGO_POR_NIVEL.posgrado]);

  siHayBase('periodo :: solo salen los programas con oferta CETAP activa en ese periodo', async () => {
    const en = (await service.listarProgramas(AMBOS(), undefined, conPregrado)).map((p) => p.id);
    expect(en).toContain(pre.idPrograma);
    expect(en).not.toContain(pos.idPrograma); // el posgrado no tiene oferta en ESE periodo
    const otro = (await service.listarProgramas(AMBOS(), undefined, conPosgrado)).map((p) => p.id);
    expect(otro).toContain(pos.idPrograma);
    expect(otro).not.toContain(pre.idPrograma);
  });

  siHayBase('periodo :: un periodo SIN carga no muestra nada', async () => {
    expect(await service.listarProgramas(AMBOS(), undefined, sinCarga)).toEqual([]);
    const { semestres, ofertadoEnPeriodo } = await service.catalogoPorSemestre(SOLO_PREGRADO(), pre.idPrograma, sinCarga);
    expect(semestres).toEqual([]);
    expect(ofertadoEnPeriodo).toBe(false);
  });

  siHayBase('periodo :: con oferta el catálogo del programa sale completo y lo dice', async () => {
    const { semestres, ofertadoEnPeriodo } = await service.catalogoPorSemestre(SOLO_PREGRADO(), pre.idPrograma, conPregrado);
    expect(ofertadoEnPeriodo).toBe(true);
    expect(semestres).toHaveLength(2);
    // Sin periodo: como siempre, y sin el campo nuevo.
    const sin = await service.catalogoPorSemestre(SOLO_PREGRADO(), pre.idPrograma);
    expect(sin.semestres).toHaveLength(2);
    expect('ofertadoEnPeriodo' in sin).toBe(false);
  });

  siHayBase('periodo :: la segregación por nivel se mantiene con el filtro', async () => {
    // Un perfil de pregrado no ve el posgrado aunque ese periodo SOLO tenga oferta de posgrado.
    expect(await service.listarProgramas(SOLO_PREGRADO(), undefined, conPosgrado)).toEqual([]);
    expect((await service.listarProgramas(SOLO_POSGRADO(), undefined, conPosgrado)).map((p) => p.id)).toContain(pos.idPrograma);
    await expect(service.catalogoPorSemestre(SOLO_PREGRADO(), pos.idPrograma, conPosgrado)).rejects.toThrow(/no tiene permiso/i);
  });

  siHayBase('periodo :: buscar por código — ofertado sí; sin oferta en el periodo, se dice por qué; sin periodo, como siempre', async () => {
    const ok: any = await service.buscarPorCodigo(SOLO_PREGRADO(), pre.codigoAsignatura, conPregrado);
    expect(ok.codigo).toBe(pre.codigoAsignatura);
    await expect(service.buscarPorCodigo(SOLO_PREGRADO(), pre.codigoAsignatura, sinCarga))
      .rejects.toThrow(/existe en el catálogo, pero su programa no tiene oferta en este periodo/);
    expect(((await service.buscarPorCodigo(SOLO_PREGRADO(), pre.codigoAsignatura)) as any).codigo).toBe(pre.codigoAsignatura);
  });

  siHayBase('periodo :: una oferta inactiva ya no cuenta', async () => {
    await pg!.query('UPDATE academic_work_plan.oferta_cetap_programa SET activa = FALSE WHERE id = $1::bigint', [ofertaPre]);
    try {
      expect(await service.listarProgramas(AMBOS(), undefined, conPregrado)).toEqual([]);
    } finally {
      await pg!.query('UPDATE academic_work_plan.oferta_cetap_programa SET activa = TRUE WHERE id = $1::bigint', [ofertaPre]);
    }
  });

  siHayBase('periodo :: un periodo inválido se rechaza; uno legado (sin ofertas) no filtra', async () => {
    await expect(service.listarProgramas(AMBOS(), undefined, 'no-es-un-periodo')).rejects.toThrow(/periodo no es válido/);
    const legado = '00000000-0000-4000-8000-000000000000';
    expect((await service.listarProgramas(AMBOS(), undefined, legado)).map((p) => p.id)).toContain(pre.idPrograma);
  });
});
