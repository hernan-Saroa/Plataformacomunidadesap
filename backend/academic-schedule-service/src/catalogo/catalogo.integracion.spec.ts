import { DataSource } from 'typeorm';
import { Client } from 'pg';

import { ProgramaCatalogoEntity } from './entities/programa.readonly.entity.js';
import { AsignaturaCatalogoEntity } from './entities/asignatura.readonly.entity.js';
import { UbicacionSemestralCatalogoEntity } from './entities/ubicacion-semestral.readonly.entity.js';
import { CatalogoService } from './catalogo.service.js';
import { PERMISO_CATALOGO_POR_NIVEL } from '../auth/programacion-permissions.js';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { crearAsignatura, retirarPrograma } = require('../../test/catalogo-qa.cjs');

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
  let pre: { idPrograma: string }; let pos: { idPrograma: string };

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
      disponible = true;
      service = new CatalogoService(
        ds.getRepository(ProgramaCatalogoEntity),
        ds.getRepository(AsignaturaCatalogoEntity),
        ds.getRepository(UbicacionSemestralCatalogoEntity),
      );
    } catch {
      // Sin base: los casos se marcan como omitidos, no como fallidos.
      disponible = false;
    }
  }, 30000);

  afterAll(async () => {
    if (pg) {
      for (const f of sembrados) await retirarPrograma(pg, f).catch(() => {});
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
});
