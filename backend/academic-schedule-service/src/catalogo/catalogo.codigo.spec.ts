import { DataSource } from 'typeorm';

import { CatalogoService } from './catalogo.service.js';
import { ProgramaCatalogoEntity } from './entities/programa.readonly.entity.js';
import { AsignaturaCatalogoEntity } from './entities/asignatura.readonly.entity.js';
import { UbicacionSemestralCatalogoEntity } from './entities/ubicacion-semestral.readonly.entity.js';
import { PERMISO_CATALOGO_POR_NIVEL } from '../auth/programacion-permissions.js';

/**
 * EFDS-1369 — Seleccionar asignatura por código único (SNIES).
 *
 * Contra BASE REAL, no mockeada: el AC-01 es un mapeo de columnas y los mocks no
 * ven la frontera. Tres defectos de este módulo se escaparon justamente ahí.
 * Se omite solo si no hay base disponible.
 */
const CONFIG = {
  type: 'postgres' as const,
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'esap_secure_password_2024',
  database: process.env.DB_NAME || 'esap_db',
  entities: [ProgramaCatalogoEntity, AsignaturaCatalogoEntity, UbicacionSemestralCatalogoEntity],
  synchronize: false,
  logging: false,
};

describe('EFDS-1369 :: asignatura por código, contra base real', () => {
  let ds: DataSource | null = null;
  let service: CatalogoService;
  let hayBase = false;

  const PREGRADO = new Set([PERMISO_CATALOGO_POR_NIVEL.pregrado]);
  const POSGRADO = new Set([PERMISO_CATALOGO_POR_NIVEL.posgrado]);

  beforeAll(async () => {
    try {
      ds = await new DataSource(CONFIG).initialize();
      hayBase = true;
      service = new CatalogoService(
        ds.getRepository(ProgramaCatalogoEntity),
        ds.getRepository(AsignaturaCatalogoEntity),
        ds.getRepository(UbicacionSemestralCatalogoEntity),
      );
    } catch {
      hayBase = false;
    }
  }, 30000);

  afterAll(async () => {
    if (ds?.isInitialized) await ds.destroy();
  });

  const siHayBase = (nombre: string, fn: () => Promise<void>) =>
    it(nombre, async () => {
      if (!hayBase) { console.warn('Sin base: prueba omitida.'); return; }
      await fn();
    }, 30000);

  siHayBase('EFDS-1369 :: AC-01 :: el código autocompleta los siete campos maestros', async () => {
    const a: any = await service.buscarPorCodigo(PREGRADO, 'ASIG-00001');

    // Los siete del SNIES
    expect(a.nombre).toBeTruthy();
    expect(typeof a.creditos).toBe('number');
    expect(a.horasClase).not.toBeUndefined();   // horas totales
    expect(a.horasPta).not.toBeUndefined();
    expect(a.programa?.nombre).toBeTruthy();
    expect('pensum' in a).toBe(true);
    expect(a.modalidad).toBeTruthy();
    expect(a.metodologia).toBeTruthy();

    expect(a.codigo).toBe('ASIG-00001');
    expect(a.soloLectura).toBe(true);
  });

  siHayBase('EFDS-1369 :: AC-01 :: código inexistente retorna error controlado', async () => {
    // Teclear mal un código es un caso de uso normal, no una falla: 404 con
    // mensaje, nunca un 500.
    await expect(service.buscarPorCodigo(PREGRADO, 'NO-EXISTE-999'))
      .rejects.toThrow(/no existe una asignatura con el código/i);
  });

  siHayBase('EFDS-1369 :: AC-01 :: un código vacío se rechaza sin consultar la base', async () => {
    await expect(service.buscarPorCodigo(PREGRADO, '   '))
      .rejects.toThrow(/debe indicar el código/i);
  });

  // Las horas vienen del catálogo. Si alguien introduce créditos x 16, este caso
  // lo detecta contra los datos reales de la ESAP.
  siHayBase('EFDS-1369 :: AC-01 :: las horas se exponen tal cual, no como créditos x 16', async () => {
    const tres: any = await service.buscarPorCodigo(PREGRADO, 'ASIG-00001'); // 3 créditos
    const seminario: any = await service.buscarPorCodigo(PREGRADO, 'ASIG-00132'); // excepción

    // Pregrado central: 64 h fijas, independientes de los créditos.
    expect(tres.horasClase).toBe(64);
    expect(tres.horasClase).not.toBe(tres.creditos * 16);

    // Excepción de la Circular 003: 384 h, no 10 x 16.
    expect(seminario.tipoExcepcion).toBe('seminario_enfasis');
    expect(seminario.horasPta).toBe(384);
    expect(seminario.horasPta).not.toBe(seminario.creditos * 16);
  });

  siHayBase('EFDS-1369 :: RN-08 :: un perfil de pregrado no puede leer un código de posgrado', async () => {
    // Conocer el código no alcanza: el nivel se valida contra el programa real.
    await expect(service.buscarPorCodigo(PREGRADO, 'ASIG-00267'))
      .rejects.toThrow(/no tiene permiso/i);

    const deMaestria: any = await service.buscarPorCodigo(POSGRADO, 'ASIG-00267');
    expect(deMaestria.nivel).toBe('posgrado');
  });

  // RN-01 / AC-04: la unicidad ya la garantiza la migración 326
  // (codigo NOT NULL UNIQUE). Se verifica que siga vigente y que los datos la
  // cumplan, en vez de reimplementar la restricción.
  siHayBase('EFDS-1369 :: AC-04 :: insertar código duplicado entre pensum falla', async () => {
    const restriccion = await ds!.query(`
      SELECT COUNT(*)::int AS n
      FROM pg_constraint
      WHERE conrelid = 'academic_work_plan.asignatura'::regclass
        AND contype = 'u'
        AND pg_get_constraintdef(oid) = 'UNIQUE (codigo)'`);
    expect(restriccion[0].n).toBe(1);

    const duplicados = await ds!.query(`
      SELECT COUNT(*)::int AS n FROM (
        SELECT codigo FROM academic_work_plan.asignatura
        GROUP BY codigo HAVING COUNT(*) > 1
      ) d`);
    expect(duplicados[0].n).toBe(0);

    // La unicidad es sobre el CÓDIGO SOLO, no sobre (código, pensum): el mismo
    // código no puede existir en dos pensum apuntando a asignaturas distintas.
    await expect(
      ds!.query(`
        INSERT INTO academic_work_plan.asignatura
          (codigo, nombre, creditos, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad, modalidad)
        SELECT a.codigo, 'Duplicada de prueba', a.creditos, a.id_ubicacion_semestral,
               a.id_programa, a.id_nucleo_tematico, a.id_facultad, a.modalidad
        FROM academic_work_plan.asignatura a WHERE a.codigo = 'ASIG-00001'`),
    ).rejects.toThrow();
  });
});
