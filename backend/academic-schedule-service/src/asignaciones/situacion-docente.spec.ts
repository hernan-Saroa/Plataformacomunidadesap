import { Client } from 'pg';

import { resolverSituacion, extraerVigencia, sigueVigente } from './situacion-docente.js';

/**
 * EFDS-1372 :: subtarea 8 :: resolución de situación administrativa.
 *
 * Unitarios de la regla + un CANARIO AGREGADO sobre datos reales: el agregado es
 * lo que destapó los 4 cargos directivos que el fail-closed bloqueaba por error.
 * Verificar el conjunto, no ejemplos sueltos.
 */

const HOY = new Date('2026-09-03T12:00:00');

describe('EFDS-1372 :: resolverSituacion (regla, sobre el campo estructurado)', () => {
  it('AC :: año sabático vigente ⇒ no asignable, con la vigencia extraída del texto', () => {
    const r = resolverSituacion('Año Sabático', 'En Año Sabático hasta 1-10-2026 Resol.2052', HOY);
    expect(r.asignable).toBe(false);
    expect(r.vigenteHasta).toBe('2026-10-01');
    expect(r.motivo).toContain('2026-10-01');
  });

  it('AC :: año sabático YA VENCIDO ⇒ vuelve a ser asignable', () => {
    const r = resolverSituacion('Año Sabático', 'En Año Sabático hasta 1-10-2025', HOY);
    expect(r.asignable).toBe(true);
  });

  it('AC :: comisión (estudios o servicios) ⇒ no asignable', () => {
    expect(resolverSituacion('Comisión de Estudios', null, HOY).asignable).toBe(false);
    expect(resolverSituacion('Comisión de Servicios', null, HOY).asignable).toBe(false);
  });

  it('AC :: cargo directivo ⇒ ASIGNABLE aunque el texto solo traiga el nombre del cargo', () => {
    // La lección de los 4 directivos: decidir por texto los mandaba al fail-closed.
    const r = resolverSituacion('Cargo Directivo', 'Subdirectora Nacional Académica', HOY);
    expect(r.asignable).toBe(true);
  });

  it('AC :: servicio activo y periodo de prueba ⇒ asignables', () => {
    expect(resolverSituacion('Servicio Activo', null, HOY).asignable).toBe(true);
    expect(resolverSituacion('En Periodo de Prueba', null, HOY).asignable).toBe(true);
  });

  it('AC :: categoría vacía o desconocida ⇒ fail-closed (no asignable)', () => {
    expect(resolverSituacion(null, null, HOY).asignable).toBe(false);
    expect(resolverSituacion('Estado Que Nadie Previó', null, HOY).asignable).toBe(false);
  });

  it('extraerVigencia y sigueVigente', () => {
    expect(extraerVigencia('hasta 17/07/2025')).toBe('2025-07-17');
    expect(extraerVigencia('sin fecha')).toBeNull();
    expect(sigueVigente('2026-10-01', HOY)).toBe(true);
    expect(sigueVigente('2025-01-01', HOY)).toBe(false);
    expect(sigueVigente(null, HOY)).toBe(true);
  });
});

/**
 * CANARIO AGREGADO — sobre el RUND real, si hay base disponible.
 *
 * Afirma que el resolver, aplicado a TODA la planta, produce exactamente la
 * partición conocida: 9 no asignables (1 sabático + 5 comisión de estudios +
 * 3 comisión de servicios) y el resto asignable. El conteo por sí solo podría
 * cuadrar por compensación, así que además exige que las categorías del lado NO
 * asignable sean precisamente esas tres.
 */
const conexion = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 55432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'esap_db',
};

describe('EFDS-1372 :: canario agregado sobre el RUND real', () => {
  let client: Client | null = null;
  let hayBase = false;

  beforeAll(async () => {
    try {
      client = new Client(conexion);
      await client.connect();
      hayBase = true;
    } catch {
      client = null;
      hayBase = false;
    }
  });

  afterAll(async () => {
    if (client) await client.end();
  });

  const siHayBase = (nombre: string, fn: () => Promise<void>) =>
    it(nombre, async () => {
      if (!hayBase || !client) {
        console.warn('  (sin base: canario omitido)');
        return;
      }
      await fn();
    });

  siHayBase(
    'sobre la planta completa, exactamente 9 no asignables y son sabático + comisión',
    async () => {
      const { rows } = await client!.query(
        `SELECT "situacionCategoria" AS categoria, "situacionAdministrativa" AS descripcion
           FROM academic_work_plan."Docente"`,
      );
      expect(rows.length).toBeGreaterThan(0);

      const noAsignables = rows
        .map((r) => ({ ...r, res: resolverSituacion(r.categoria, r.descripcion, HOY) }))
        .filter((r) => !r.res.asignable);

      // El total exacto.
      expect(noAsignables).toHaveLength(9);

      // Y cada uno cae del lado correcto: solo sabático y comisión, para que el 9
      // no cuadre por un falso positivo compensando un falso negativo.
      const categorias = new Set(noAsignables.map((r) => r.res.categoria));
      expect([...categorias].sort()).toEqual(['ano_sabatico', 'comision']);

      // Y los cargos directivos NO están entre los bloqueados (la lección de los 4).
      const directivosBloqueados = noAsignables.filter((r) =>
        String(r.categoria).toLowerCase().includes('directivo'),
      );
      expect(directivosBloqueados).toHaveLength(0);
    },
  );
});
